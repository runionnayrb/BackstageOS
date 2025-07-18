import { storage } from '../storage';
import { ScheduleVersion, ScheduleEvent, InsertScheduleVersionComparison } from '@shared/schema';

export interface ScheduleComparison {
  added: ScheduleEvent[];
  modified: Array<{
    original: ScheduleEvent;
    updated: ScheduleEvent;
    changes: string[];
  }>;
  removed: ScheduleEvent[];
  summary: {
    totalChanges: number;
    eventsAdded: number;
    eventsModified: number;
    eventsRemoved: number;
  };
}

export class ScheduleComparisonService {
  
  // Compare two schedule versions and return detailed changes
  async compareScheduleVersions(
    fromVersion: ScheduleVersion,
    toVersion: ScheduleVersion
  ): Promise<ScheduleComparison> {
    const fromEvents = JSON.parse(fromVersion.scheduleSnapshot) as ScheduleEvent[];
    const toEvents = JSON.parse(toVersion.scheduleSnapshot) as ScheduleEvent[];

    const comparison = this.generateComparison(fromEvents, toEvents);

    // Store the comparison for future reference
    await storage.createScheduleVersionComparison({
      projectId: fromVersion.projectId,
      fromVersionId: fromVersion.id,
      toVersionId: toVersion.id,
      comparisonData: comparison,
      createdBy: toVersion.createdBy
    });

    return comparison;
  }

  // Generate detailed comparison between two event arrays
  private generateComparison(fromEvents: ScheduleEvent[], toEvents: ScheduleEvent[]): ScheduleComparison {
    const added: ScheduleEvent[] = [];
    const modified: Array<{ original: ScheduleEvent; updated: ScheduleEvent; changes: string[] }> = [];
    const removed: ScheduleEvent[] = [];

    // Create maps for efficient lookup
    const fromEventsMap = new Map(fromEvents.map(event => [event.id, event]));
    const toEventsMap = new Map(toEvents.map(event => [event.id, event]));

    // Find added events (exist in 'to' but not in 'from')
    for (const toEvent of toEvents) {
      if (!fromEventsMap.has(toEvent.id)) {
        added.push(toEvent);
      }
    }

    // Find removed events (exist in 'from' but not in 'to')
    for (const fromEvent of fromEvents) {
      if (!toEventsMap.has(fromEvent.id)) {
        removed.push(fromEvent);
      }
    }

    // Find modified events (exist in both but with changes)
    for (const fromEvent of fromEvents) {
      const toEvent = toEventsMap.get(fromEvent.id);
      if (toEvent) {
        const changes = this.detectEventChanges(fromEvent, toEvent);
        if (changes.length > 0) {
          modified.push({
            original: fromEvent,
            updated: toEvent,
            changes
          });
        }
      }
    }

    return {
      added,
      modified,
      removed,
      summary: {
        totalChanges: added.length + modified.length + removed.length,
        eventsAdded: added.length,
        eventsModified: modified.length,
        eventsRemoved: removed.length
      }
    };
  }

  // Detect specific changes between two events
  private detectEventChanges(original: ScheduleEvent, updated: ScheduleEvent): string[] {
    const changes: string[] = [];

    // Title changes
    if (original.title !== updated.title) {
      changes.push(`Title changed from "${original.title}" to "${updated.title}"`);
    }

    // Time changes
    if (original.startTime !== updated.startTime) {
      changes.push(`Start time changed from ${this.formatDateTime(original.startTime)} to ${this.formatDateTime(updated.startTime)}`);
    }

    if (original.endTime !== updated.endTime) {
      changes.push(`End time changed from ${this.formatDateTime(original.endTime)} to ${this.formatDateTime(updated.endTime)}`);
    }

    // Location changes
    if (original.location !== updated.location) {
      const fromLocation = original.location || 'No location';
      const toLocation = updated.location || 'No location';
      changes.push(`Location changed from "${fromLocation}" to "${toLocation}"`);
    }

    // Event type changes
    if (original.eventType !== updated.eventType) {
      const fromType = original.eventType || 'No type';
      const toType = updated.eventType || 'No type';
      changes.push(`Event type changed from "${fromType}" to "${toType}"`);
    }

    // All day status changes
    if (original.isAllDay !== updated.isAllDay) {
      changes.push(`Changed ${original.isAllDay ? 'from' : 'to'} all-day event`);
    }

    // Description changes
    if (original.description !== updated.description) {
      changes.push('Description updated');
    }

    // Notes changes
    if (original.notes !== updated.notes) {
      changes.push('Notes updated');
    }

    // Participant changes (if participant data is available)
    const originalParticipants = this.getParticipantIds(original);
    const updatedParticipants = this.getParticipantIds(updated);
    
    if (!this.arraysEqual(originalParticipants, updatedParticipants)) {
      const added = updatedParticipants.filter(id => !originalParticipants.includes(id));
      const removed = originalParticipants.filter(id => !updatedParticipants.includes(id));
      
      if (added.length > 0) {
        changes.push(`Added ${added.length} participant${added.length > 1 ? 's' : ''}`);
      }
      if (removed.length > 0) {
        changes.push(`Removed ${removed.length} participant${removed.length > 1 ? 's' : ''}`);
      }
    }

    return changes;
  }

  // Get participant IDs from event (if available)
  private getParticipantIds(event: ScheduleEvent): number[] {
    // This would need to be implemented based on how participants are stored
    // For now, return empty array as placeholder
    return [];
  }

  // Check if two arrays are equal
  private arraysEqual(a: number[], b: number[]): boolean {
    return a.length === b.length && a.sort().every((val, i) => val === b.sort()[i]);
  }

  // Format date/time for display
  private formatDateTime(dateTime: string): string {
    const date = new Date(dateTime);
    return date.toLocaleString();
  }

  // Get cached comparison if it exists
  async getCachedComparison(fromVersionId: number, toVersionId: number): Promise<ScheduleComparison | null> {
    const cached = await storage.getScheduleVersionComparison(fromVersionId, toVersionId);
    return cached ? cached.comparisonData : null;
  }

  // Generate summary statistics for a project's schedule changes
  async getProjectScheduleChangeStats(projectId: number): Promise<{
    totalComparisons: number;
    totalChanges: number;
    mostActiveVersion: ScheduleVersion | null;
    changesTrend: Array<{ version: string; changes: number; date: string }>;
  }> {
    const comparisons = await storage.getScheduleVersionComparisonsByProjectId(projectId);
    const versions = await storage.getScheduleVersionsByProjectId(projectId);

    const totalChanges = comparisons.reduce((sum, comp) => 
      sum + (comp.comparisonData?.summary.totalChanges || 0), 0
    );

    // Find most active version (version that had the most changes when published)
    let mostActiveVersion: ScheduleVersion | null = null;
    let maxChanges = 0;

    for (const comparison of comparisons) {
      const changes = comparison.comparisonData?.summary.totalChanges || 0;
      if (changes > maxChanges) {
        maxChanges = changes;
        const version = versions.find(v => v.id === comparison.toVersionId);
        if (version) {
          mostActiveVersion = version;
        }
      }
    }

    // Build changes trend
    const changesTrend = comparisons
      .map(comp => ({
        version: `v${comp.toVersionId}`,
        changes: comp.comparisonData?.summary.totalChanges || 0,
        date: comp.createdAt.toISOString().split('T')[0]
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      totalComparisons: comparisons.length,
      totalChanges,
      mostActiveVersion,
      changesTrend
    };
  }

  // Generate text summary of changes for email notifications
  generateChangeSummary(comparison: ScheduleComparison): string {
    const { summary, added, modified, removed } = comparison;
    
    if (summary.totalChanges === 0) {
      return "No changes were made to the schedule.";
    }

    let text = `Schedule updated with ${summary.totalChanges} change${summary.totalChanges > 1 ? 's' : ''}:\n\n`;

    if (added.length > 0) {
      text += `📅 ${added.length} new event${added.length > 1 ? 's' : ''} added:\n`;
      added.forEach(event => {
        text += `  • ${event.title} (${this.formatDateTime(event.startTime)})\n`;
      });
      text += '\n';
    }

    if (modified.length > 0) {
      text += `✏️ ${modified.length} event${modified.length > 1 ? 's' : ''} modified:\n`;
      modified.forEach(({ updated, changes }) => {
        text += `  • ${updated.title}: ${changes.join(', ')}\n`;
      });
      text += '\n';
    }

    if (removed.length > 0) {
      text += `🗑️ ${removed.length} event${removed.length > 1 ? 's' : ''} removed:\n`;
      removed.forEach(event => {
        text += `  • ${event.title} (${this.formatDateTime(event.startTime)})\n`;
      });
    }

    return text.trim();
  }
}

export const scheduleComparisonService = new ScheduleComparisonService();