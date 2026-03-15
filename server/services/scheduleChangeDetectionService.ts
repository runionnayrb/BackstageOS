export interface ScheduleChangeDetection {
  generateChangesSummary(projectId: number, weekStart?: string): Promise<string>;
  generateStructuredChanges(projectId: number, weekStart?: string): Promise<StructuredChanges>;
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

  private parseScheduleSettings(settings: any) {
    if (!settings) return {};
    
    // Handle both string and object formats
    const scheduleSettings = typeof settings === 'string' 
      ? JSON.parse(settings) 
      : settings;
      
    return {
      timeFormat: scheduleSettings.timeFormat || '12',
      timezone: scheduleSettings.timeZone || scheduleSettings.timezone || 'America/New_York',
      weekStartDay: scheduleSettings.weekStartDay || 'sunday',
      workStartTime: scheduleSettings.workStartTime || '09:00',
      workEndTime: scheduleSettings.workEndTime || '18:00',
      allowConflicts: scheduleSettings.allowConflicts || false,
    };
  }

  private formatTimeDisplay(timeString: string, timeFormat: '12' | '24' = '12'): string {
    if (!timeString || typeof timeString !== 'string') return '';
    
    const timeParts = timeString.split(':');
    if (timeParts.length < 2) return timeString; // Return original if not in expected format
    
    const [hours, minutes] = timeParts.map(Number);
    
    if (timeFormat === '24') {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    // 12-hour format
    if (hours === 0) {
      return `12:${minutes.toString().padStart(2, '0')} AM`;
    } else if (hours < 12) {
      return `${hours}:${minutes.toString().padStart(2, '0')} AM`;
    } else if (hours === 12) {
      return `12:${minutes.toString().padStart(2, '0')} PM`;
    } else {
      return `${hours - 12}:${minutes.toString().padStart(2, '0')} PM`;
    }
  }

  private formatDateInTimezone(date: Date, timeZone: string, weekStartDay: string = 'sunday'): string {
    try {
      return date.toLocaleDateString('en-US', { 
        timeZone: timeZone,
        weekday: 'long',
        year: 'numeric',
        month: 'long', 
        day: 'numeric' 
      });
    } catch (error) {
      console.warn('Failed to format date in timezone:', timeZone, error);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long', 
        day: 'numeric' 
      });
    }
  }

  private getCurrentWeekRange(timeZone: string, weekStartDay: string = 'sunday'): { startDate: string; endDate: string } {
    const today = new Date();
    
    // Get start of week based on week start preference
    const startOfWeekOffset = weekStartDay === 'monday' ? 1 : 0;
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToSubtract = (dayOfWeek - startOfWeekOffset + 7) % 7;
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - daysToSubtract);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    // Format dates as YYYY-MM-DD strings for comparison
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    return {
      startDate: formatDate(startOfWeek),
      endDate: formatDate(endOfWeek)
    };
  }

  private isEventInCurrentWeek(eventDate: string, currentWeekRange: { startDate: string; endDate: string }): boolean {
    return eventDate >= currentWeekRange.startDate && eventDate <= currentWeekRange.endDate;
  }

  private getWeekRangeFromStart(weekStart: string): { startDate: string; endDate: string } {
    // Parse weekStart as local date to avoid timezone issues (format: YYYY-MM-DD)
    const [year, month, day] = weekStart.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, month - 1, day));
    const endDate = new Date(Date.UTC(year, month - 1, day + 6));
    
    const formatDate = (date: Date) => {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    
    return {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate)
    };
  }

  async generateChangesSummary(projectId: number): Promise<string> {
    try {
      // Get current schedule events and schedule settings
      const currentEvents = await this.storage.getScheduleEventsByProjectId(projectId);
      const scheduleSettings = await this.storage.getShowSettingsByProjectId(projectId);
      
      // Parse schedule settings to get week preferences
      const { timeFormat, timezone, weekStartDay } = this.parseScheduleSettings(scheduleSettings?.scheduleSettings);
      
      // Get current week range
      const currentWeekRange = this.getCurrentWeekRange(timezone, weekStartDay);
      
      // Filter current events to only include current week
      const currentWeekEvents = currentEvents.filter(event => 
        this.isEventInCurrentWeek(event.date, currentWeekRange)
      );
      
      // Get the last published version
      const lastVersion = await this.storage.getLastPublishedScheduleVersion(projectId);
      
      if (!lastVersion) {
        // No previous version - this is the first publication
        if (currentWeekEvents.length === 0) {
          return "Initial schedule created (no events scheduled for this week).";
        }
        return `Initial schedule created with ${currentWeekEvents.length} event${currentWeekEvents.length === 1 ? '' : 's'} for this week.`;
      }

      // Filter last version events to only include current week
      const lastVersionEvents = (lastVersion.scheduleData?.events || []).filter(event => 
        this.isEventInCurrentWeek(event.date, currentWeekRange)
      );
      
      // Compare current week events with last version week events
      const changes = this.detectChanges(lastVersionEvents, currentWeekEvents, scheduleSettings);
      
      if (changes.length === 0) {
        return "No changes to the schedule for this week.";
      }

      return this.formatChangesSummary(changes, scheduleSettings);
    } catch (error) {
      console.error('Error generating changes summary:', error);
      return "Changes detected (unable to generate detailed summary).";
    }
  }

  async generateStructuredChanges(projectId: number, weekStart?: string): Promise<StructuredChanges> {
    try {
      // Get current schedule events and schedule settings
      const currentEvents = await this.storage.getScheduleEventsByProjectId(projectId);
      const scheduleSettings = await this.storage.getShowSettingsByProjectId(projectId);
      
      // Parse schedule settings to get week preferences
      const { timeFormat, timezone, weekStartDay } = this.parseScheduleSettings(scheduleSettings?.scheduleSettings);
      
      // Get week range - use provided weekStart if available, otherwise calculate current week
      const currentWeekRange = weekStart 
        ? this.getWeekRangeFromStart(weekStart)
        : this.getCurrentWeekRange(timezone, weekStartDay);
      
      console.log(`📊 Change detection for week: ${currentWeekRange.startDate} to ${currentWeekRange.endDate}`);
      
      // Filter current events to only include current week
      const currentWeekEvents = currentEvents.filter(event => 
        this.isEventInCurrentWeek(event.date, currentWeekRange)
      );
      
      // Get the last published version to compare against
      const lastVersion = await this.storage.getLastPublishedScheduleVersion(projectId);
      
      if (!lastVersion) {
        // No previous version - this is the first publication, show all as additions
        const changes = this.detectChanges([], currentWeekEvents, scheduleSettings);
        const addedEvents = this.formatChangesByDay(changes.filter(c => c.type === 'added'), scheduleSettings, true);
        
        return {
          addedEvents,
          changedEvents: '',
          removedEvents: '',
          fullSummary: currentWeekEvents.length > 0 
            ? this.formatChangesSummary(changes, scheduleSettings, true)
            : "Initial schedule created (no events scheduled for this week)."
        };
      }

      // Filter last version events to only include current week
      const lastVersionEvents = (lastVersion.scheduleData?.events || []).filter(event => 
        this.isEventInCurrentWeek(event.date, currentWeekRange)
      );
      
      // Compare current week events with last version week events
      const changes = this.detectChanges(lastVersionEvents, currentWeekEvents, scheduleSettings);
      
      const addedEvents = this.formatChangesByDay(changes.filter(c => c.type === 'added'), scheduleSettings, true);
      const changedEvents = this.formatChangesByDay(changes.filter(c => c.type === 'modified'), scheduleSettings, true);
      const removedEvents = this.formatChangesByDay(changes.filter(c => c.type === 'removed'), scheduleSettings, true);
      
      const fullSummary = changes.length === 0 
        ? "No changes to the schedule for this week." 
        : this.formatChangesSummary(changes, scheduleSettings, true);
      
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

  private detectChanges(oldEvents: any[], newEvents: any[], scheduleSettings: any): ScheduleChange[] {
    const { timeFormat } = this.parseScheduleSettings(scheduleSettings?.scheduleSettings);
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
          eventDate: newEvent.date,
          details: this.formatEventTime(newEvent, timeFormat)
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
          eventDate: oldEvent.date,
          details: this.formatEventTime(oldEvent, timeFormat)
        });
      }
    }
    
    // Detect modified events
    for (const newEvent of newEvents) {
      const oldEvent = oldEventMap.get(newEvent.id);
      if (oldEvent) {
        const modifications = this.detectEventModifications(oldEvent, newEvent, timeFormat);
        if (modifications.length > 0) {
          changes.push({
            type: 'modified',
            eventTitle: newEvent.title,
            date: this.formatEventDate(newEvent),
            eventDate: newEvent.date,
            details: modifications.join(', '),
            originalData: oldEvent,
            newData: newEvent
          });
        }
      }
    }
    
    return changes;
  }
  
  private detectEventModifications(oldEvent: any, newEvent: any, timeFormat: string): string[] {
    const modifications: string[] = [];
    
    // For changes, we want to show the new time and indicate what changed
    let changeDescription = this.formatEventTime(newEvent, timeFormat);
    let hasChanges = false;
    
    // Check if time changed (most common change)
    if (oldEvent.startTime !== newEvent.startTime || oldEvent.endTime !== newEvent.endTime) {
      const oldTime = this.formatEventTime(oldEvent);
      changeDescription += ` (was ${oldTime})`;
      hasChanges = true;
    }
    // Check date change 
    else if (oldEvent.date !== newEvent.date) {
      const oldDate = this.formatDate(oldEvent.date);
      changeDescription += ` (moved from ${oldDate})`;
      hasChanges = true;
    }
    // Check location change
    else if (oldEvent.location !== newEvent.location) {
      const oldLoc = oldEvent.location || 'TBD';
      changeDescription += ` (location changed from ${oldLoc})`;
      hasChanges = true;
    }
    // Check title change
    else if (oldEvent.title !== newEvent.title) {
      changeDescription += ` (renamed from "${oldEvent.title}")`;
      hasChanges = true;
    }
    // Check type change
    else if (oldEvent.type !== newEvent.type) {
      changeDescription += ` (type changed from ${oldEvent.type})`;
      hasChanges = true;
    }
    
    // Only add to modifications if something actually changed
    if (hasChanges) {
      modifications.push(changeDescription);
    }
    return modifications;
  }
  
  private formatChangesSummary(changes: ScheduleChange[], scheduleSettings: any, boldDates: boolean = false): string {
    const { timeFormat, timezone, weekStartDay } = this.parseScheduleSettings(scheduleSettings?.scheduleSettings);
    const dailyChanges = this.groupChangesByDay(changes);
    const summaryLines: string[] = [];
    
    // Get all dates from changes and create a date range
    const allDates = new Set<string>();
    changes.forEach(change => {
      if (change.eventDate) {
        allDates.add(change.eventDate);
      }
    });
    
    // If no changes, show current week
    if (allDates.size === 0) {
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        allDates.add(dateStr);
      }
    }
    
    // Sort dates
    const sortedDates = Array.from(allDates).sort();
    
    // Format each day
    for (const dateStr of sortedDates) {
      const date = new Date(dateStr);
      const dayName = this.formatDateInTimezone(date, timezone, weekStartDay);
      
      // Bold the date if requested (for HTML emails)
      const formattedDate = boldDates ? `<strong>${dayName}</strong>` : dayName;
      summaryLines.push(formattedDate);
      
      const dayChanges = dailyChanges[dateStr] || [];
      if (dayChanges.length === 0) {
        summaryLines.push('- No changes');
      } else {
        // Group by type for this day
        const grouped = this.groupChangesByType(dayChanges);
        
        // Add events for this day
        for (const change of grouped.added) {
          summaryLines.push(`- ADD: ${change.eventTitle} - ${change.details}`);
        }
        
        // Modified events for this day
        for (const change of grouped.modified) {
          summaryLines.push(`- CHANGE: ${change.eventTitle} - ${change.details}`);
        }
        
        // Removed events for this day
        for (const change of grouped.removed) {
          summaryLines.push(`- REMOVE: ${change.eventTitle} - Cancelled`);
        }
      }
      
      summaryLines.push(''); // Empty line between days
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
  
  private groupChangesByDay(changes: ScheduleChange[]): { [date: string]: ScheduleChange[] } {
    const dailyChanges: { [date: string]: ScheduleChange[] } = {};
    
    changes.forEach(change => {
      const dateKey = change.eventDate || 'unknown';
      if (!dailyChanges[dateKey]) {
        dailyChanges[dateKey] = [];
      }
      dailyChanges[dateKey].push(change);
    });
    
    return dailyChanges;
  }

  private formatChangesByDay(changes: ScheduleChange[], scheduleSettings: any, boldDates: boolean = false): string {
    if (changes.length === 0) {
      return '';
    }

    const { timeFormat, timezone, weekStartDay } = this.parseScheduleSettings(scheduleSettings?.scheduleSettings);
    const dailyChanges = this.groupChangesByDay(changes);
    const summaryLines: string[] = [];
    
    // Sort dates
    const sortedDates = Object.keys(dailyChanges).sort();
    
    // Format each day
    for (const dateStr of sortedDates) {
      const date = new Date(dateStr);
      const dayName = this.formatDateInTimezone(date, timezone, weekStartDay);
      
      // Bold the date if requested (for HTML emails)
      const formattedDate = boldDates ? `<strong>${dayName}</strong>` : dayName;
      summaryLines.push(formattedDate);
      
      const dayChanges = dailyChanges[dateStr] || [];
      for (const change of dayChanges) {
        if (change.type === 'added') {
          summaryLines.push(`- ADD: ${change.eventTitle} - ${change.details}`);
        } else if (change.type === 'modified') {
          summaryLines.push(`- CHANGE: ${change.eventTitle} - ${change.details}`);
        } else if (change.type === 'removed') {
          summaryLines.push(`- REMOVE: ${change.eventTitle} - Cancelled`);
        }
      }
      
      summaryLines.push(''); // Empty line between days
    }
    
    return summaryLines.join('\n').trim();
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
  
  private formatEventTime(event: any, timeFormat: string = '12'): string {
    if (event.isAllDay) {
      return 'All Day';
    }
    
    const startTime = this.formatTime(event.startTime, timeFormat);
    const endTime = this.formatTime(event.endTime, timeFormat);
    return `${startTime} - ${endTime}`;
  }
  
  private formatTime(timeStr: string, timeFormat: string = '12'): string {
    if (!timeStr) return '';
    
    const [hours, minutes] = timeStr.split(':');
    const hour24 = parseInt(hours, 10);
    const min = minutes.padStart(2, '0');
    
    if (timeFormat === '24') {
      return `${hours.padStart(2, '0')}:${min}`;
    } else {
      // 12-hour format
      const period = hour24 >= 12 ? 'PM' : 'AM';
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      return `${hour12}:${min} ${period}`;
    }
  }
}