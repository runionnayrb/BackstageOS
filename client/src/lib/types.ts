export interface ErrorNotification {
  id: number;
  type: 'critical' | 'resolved' | 'warning' | 'info';
  title: string;
  message: string;
  actionUrl?: string;
  status: 'active' | 'dismissed' | 'expired';
  userId?: number;
  createdAt: Date;
  expiresAt?: Date;
}

export interface ErrorCluster {
  id: number;
  errorSignature: string;
  errorCount: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  affectedUsers: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved';
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemStatus {
  overallStatus: 'operational' | 'degraded' | 'major_outage';
  components: {
    name: string;
    status: 'operational' | 'degraded' | 'outage';
    lastChecked: Date;
  }[];
  activeIncidents: {
    id: number;
    title: string;
    status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
    severity: 'low' | 'medium' | 'high' | 'critical';
    createdAt: Date;
    updatedAt: Date;
  }[];
}