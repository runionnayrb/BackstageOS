export interface ScheduleChangeDetection {
  generateChangesSummary(projectId: number): Promise<string>;
  generateStructuredChanges(projectId: number): Promise<StructuredChanges>;
}

export interface StructuredChanges {
  addedEvents: string;
  changedEvents: string;
  removedEvents: string;
  fullSummary: string;
}

export interface ScheduleChange {
  type: 'added' | 'removed' | 'modified' | 'moved';
  eventTitle: string;
  details: string;
  date: string;
  originalData?: any;
  newData?: any;
}

export class ScheduleChangeDetectionService implements ScheduleChangeDetection {
  constructor(private storage: any) {}

  async generateChangesSummary(projectId: number): Promise<string> {
    try {
      // Get current schedule events
      const currentEvents = await this.storage.getScheduleEvents(projectId);
      
      // Get the last published version
      const lastVersion = await this.storage.getLastPublishedScheduleVersion(projectId);
      
      if (!lastVersion) {
        // No previous version - this is the first publication
        if (currentEvents.length === 0) {
          return "Initial schedule created (no events scheduled).";
        }
        return `Initial schedule created with ${currentEvents.length} event${currentEvents.length === 1 ? '' : 's'}.`;
      }

      // Compare current events with last version
      const lastVersionEvents = lastVersion.scheduleData?.events || [];
      const changes = this.detectChanges(lastVersionEvents, currentEvents);
      
      if (changes.length === 0) {
        return "No changes to the schedule.";
      }

      return this.formatChangesSummary(changes);
    } catch (error) {
      console.error('Error generating changes summary:', error);
      return "Changes detected (unable to generate detailed summary).";
    }
  }

  async generateStructuredChanges(projectId: number): Promise<StructuredChanges> {
    try {
      // Get current schedule events
      const currentEvents = await this.storage.getScheduleEvents(projectId);
      
      // Get the last published version
      const lastVersion = await this.storage.getLastPublishedScheduleVersion(projectId);
      
      if (!lastVersion) {
        // No previous version - this is the first publication
        const addedEvents = currentEvents.map(event => 
          `ADD: ${event.title} - ${this.formatEventTime(event)}`
        ).join('\n');
        
        return {
          addedEvents: addedEvents || '',
          changedEvents: '',
          removedEvents: '',
          fullSummary: addedEvents ? `Initial schedule created with ${currentEvents.length} event${currentEvents.length === 1 ? '' : 's'}.` : "Initial schedule created (no events scheduled)."
        };
      }

      // Compare current events with last version
      const lastVersionEvents = lastVersion.scheduleData?.events || [];
      const changes = this.detectChanges(lastVersionEvents, currentEvents);
      const grouped = this.groupChangesByType(changes);
      
      const addedEvents = grouped.added.map(c => `ADD: ${c.eventTitle} - ${c.details}`).join('\n');
      const changedEvents = grouped.modified.map(c => `CHANGE: ${c.eventTitle} - ${c.details}`).join('\n');
      const removedEvents = grouped.removed.map(c => `REMOVE: ${c.eventTitle} - Cancelled`).join('\n');
      
      const fullSummary = changes.length === 0 ? "No changes to the schedule." : this.formatChangesSummary(changes);
      
      return {
        addedEvents,
        changedEvents,
        removedEvents,
        fullSummary
      };
    } catch (error) {
      console.error('Error generating structured changes:', error);
      return {
        addedEvents: '',
        changedEvents: '',
        removedEvents: '',
        fullSummary: "Changes detected (unable to generate detailed summary)."
      };
    }
  }

  private detectChanges(oldEvents: any[], newEvents: any[]): ScheduleChange[] {
    const changes: ScheduleChange[] = [];
    
    // Create maps for easier comparison
    const oldEventMap = new Map(oldEvents.map(e => [e.id, e]));
    const newEventMap = new Map(newEvents.map(e => [e.id, e]));
    
    // Detect added events
    for (const newEvent of newEvents) {
      if (!oldEventMap.has(newEvent.id)) {
        changes.push({
          type: 'added',
          eventTitle: newEvent.title,
          date: this.formatEventDate(newEvent),
          details: this.formatEventTime(newEvent)
        });
      }
    }
    
    // Detect removed events
    for (const oldEvent of oldEvents) {
      if (!newEventMap.has(oldEvent.id)) {
        changes.push({
          type: 'removed',
          eventTitle: oldEvent.title,
          date: this.formatEventDate(oldEvent),
          details: this.formatEventTime(oldEvent)
        });
      }
    }
    
    // Detect modified events
    for (const newEvent of newEvents) {
      const oldEvent = oldEventMap.get(newEvent.id);
      if (oldEvent) {
        const modifications = this.detectEventModifications(oldEvent, newEvent);
        if (modifications.length > 0) {
          changes.push({
            type: 'modified',
            eventTitle: newEvent.title,
            date: this.formatEventDate(newEvent),
            details: modifications.join(', '),
            originalData: oldEvent,
            newData: newEvent
          });
        }
      }
    }
    
    return changes;
  }
  
  private detectEventModifications(oldEvent: any, newEvent: any): string[] {
    const modifications: string[] = [];
    
    // For changes, we want to show the new time and indicate what changed
    let changeDescription = this.formatEventTime(newEvent);
    
    // Check if time changed (most common change)
    if (oldEvent.startTime !== newEvent.startTime || oldEvent.endTime !== newEvent.endTime) {
      const oldTime = this.formatEventTime(oldEvent);
      changeDescription += ` (was ${oldTime})`;
    }
    // Check date change 
    else if (oldEvent.date !== newEvent.date) {
      const oldDate = this.formatDate(oldEvent.date);
      const newDate = this.formatDate(newEvent.date);
      changeDescription += ` (moved from ${oldDate})`;
    }
    // Check location change
    else if (oldEvent.location !== newEvent.location) {
      const oldLoc = oldEvent.location || 'TBD';
      changeDescription += ` (location changed from ${oldLoc})`;
    }
    // Check title change
    else if (oldEvent.title !== newEvent.title) {
      changeDescription += ` (renamed from "${oldEvent.title}")`;
    }
    // Check type change
    else if (oldEvent.type !== newEvent.type) {
      changeDescription += ` (type changed from ${oldEvent.type})`;
    }
    
    modifications.push(changeDescription);
    return modifications;
  }
  
  private formatChangesSummary(changes: ScheduleChange[]): string {
    const grouped = this.groupChangesByType(changes);
    const summaryLines: string[] = [];
    
    // Add events
    for (const change of grouped.added) {
      summaryLines.push(`ADD: ${change.eventTitle} - ${change.details}`);
    }
    
    // Modified events
    for (const change of grouped.modified) {
      summaryLines.push(`CHANGE: ${change.eventTitle} - ${change.details}`);
    }
    
    // Removed events
    for (const change of grouped.removed) {
      summaryLines.push(`REMOVE: ${change.eventTitle} - Cancelled`);
    }
    
    return summaryLines.join('\n');
  }
  
  private groupChangesByType(changes: ScheduleChange[]) {
    return {
      added: changes.filter(c => c.type === 'added'),
      removed: changes.filter(c => c.type === 'removed'),
      modified: changes.filter(c => c.type === 'modified'),
      moved: changes.filter(c => c.type === 'moved')
    };
  }
  
  private formatEventDate(event: any): string {
    const date = new Date(event.date);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  private formatEventTime(event: any): string {
    if (event.isAllDay) {
      return 'All Day';
    }
    
    const startTime = this.formatTime(event.startTime);
    const endTime = this.formatTime(event.endTime);
    return `${startTime} - ${endTime}`;
  }
  
  private formatTime(timeStr: string): string {
    if (!timeStr) return '';
    
    // Return 24-hour format with just HH:MM
    const [hours, minutes] = timeStr.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }
}