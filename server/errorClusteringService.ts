import { DatabaseStorage } from './storage';
import { ErrorLog, ErrorCluster, InsertErrorCluster } from '@shared/schema';

export class ErrorClusteringService {
  private storage: DatabaseStorage;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
  }

  // Analyze new error logs and create/update clusters
  async processErrorForClustering(errorLog: ErrorLog): Promise<void> {
    const signature = this.generateErrorSignature(errorLog);
    
    // Find existing cluster with same signature
    const existingCluster = await this.storage.getErrorClusterBySignature(signature);
    
    if (existingCluster) {
      // Update existing cluster
      await this.storage.updateErrorCluster(existingCluster.id, {
        occurrenceCount: existingCluster.occurrenceCount + 1,
        lastOccurrence: new Date(),
        priority: this.calculateSeverity(existingCluster.occurrenceCount + 1),
        updatedAt: new Date()
      });
    } else {
      // Create new cluster
      const newCluster: InsertErrorCluster = {
        signature: signature,
        occurrenceCount: 1,
        firstOccurrence: new Date(),
        lastOccurrence: new Date(),
        affectedUsers: 1,
        errorType: errorLog.errorType,
        featureContext: errorLog.featureContext,
        businessImpact: errorLog.businessImpact,
        priority: 'low',
        status: 'open'
      };
      
      await this.storage.createErrorCluster(newCluster);
    }

    // Check if this error pattern needs immediate attention
    await this.checkForCriticalPatterns(signature);
  }

  // Generate a unique signature for error clustering
  private generateErrorSignature(errorLog: ErrorLog): string {
    const components = [
      errorLog.errorType,
      errorLog.page,
      this.extractErrorPattern(errorLog.message),
      errorLog.featureContext
    ].filter(Boolean);
    
    return components.join('::');
  }

  // Extract the core error pattern, removing variable parts
  private extractErrorPattern(message: string): string {
    // Remove specific IDs, timestamps, and variable data
    return message
      .replace(/\d+/g, 'N') // Replace numbers with N
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID') // Replace UUIDs
      .replace(/\b\w+@\w+\.\w+\b/g, 'EMAIL') // Replace emails
      .replace(/https?:\/\/[^\s]+/g, 'URL') // Replace URLs
      .substring(0, 200); // Limit length
  }

  // Calculate severity based on frequency and impact
  private calculateSeverity(errorCount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (errorCount >= 50) return 'critical';
    if (errorCount >= 20) return 'high';
    if (errorCount >= 5) return 'medium';
    return 'low';
  }

  // Check for patterns that need immediate attention
  private async checkForCriticalPatterns(signature: string): Promise<void> {
    const cluster = await this.storage.getErrorClusterBySignature(signature);
    if (!cluster) return;

    const shouldCreateNotification = 
      cluster.priority === 'critical' || 
      (cluster.occurrenceCount >= 10 && cluster.priority === 'high') ||
      signature.includes('authentication') ||
      signature.includes('payment') ||
      signature.includes('data_loss');

    if (shouldCreateNotification) {
      await this.createCriticalErrorNotification(cluster);
    }
  }

  // Create notification for critical error patterns
  private async createCriticalErrorNotification(cluster: ErrorCluster): Promise<void> {
    const notification = {
      notificationType: 'critical',
      message: `Error "${cluster.signature}" has occurred ${cluster.occurrenceCount} times. Immediate attention required.`,
      clusterId: cluster.id,
      isRead: false,
      createdAt: new Date()
    };

    await this.storage.createErrorNotification(notification);
  }

  // Get error trends for analytics
  async getErrorTrends(timeRange: '24h' | '7d' | '30d' = '24h'): Promise<any> {
    const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const clusters = await this.storage.getErrorClustersAfterDate(startDate);
    
    return {
      totalErrors: clusters.reduce((sum: number, cluster: any) => sum + cluster.occurrenceCount, 0),
      totalClusters: clusters.length,
      criticalClusters: clusters.filter((c: any) => c.priority === 'critical').length,
      resolvedClusters: clusters.filter((c: any) => c.status === 'resolved').length,
      trends: this.calculateTrends(clusters)
    };
  }

  // Calculate error trends over time
  private calculateTrends(clusters: ErrorCluster[]): any {
    const hourlyData = new Map<string, number>();
    
    clusters.forEach(cluster => {
      const hour = new Date(cluster.lastOccurrence).toISOString().slice(0, 13);
      hourlyData.set(hour, (hourlyData.get(hour) || 0) + cluster.occurrenceCount);
    });

    return Array.from(hourlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, count]) => ({ hour, count }));
  }

  // Auto-resolve old clusters
  async autoResolveOldClusters(): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oldClusters = await this.storage.getErrorClustersBeforeDate(sevenDaysAgo);
    
    for (const cluster of oldClusters) {
      if (cluster.status === 'open' && cluster.priority !== 'critical') {
        await this.storage.updateErrorCluster(cluster.id, {
          status: 'resolved',
          resolutionNotes: 'Auto-resolved: No recent occurrences',
          updatedAt: new Date()
        });
      }
    }
  }
}