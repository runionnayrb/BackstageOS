// Utility functions for schedule filtering and management

export function parseScheduleSettings(scheduleSettings: any) {
  if (typeof scheduleSettings === 'string') {
    try {
      return JSON.parse(scheduleSettings);
    } catch (error) {
      console.warn('Failed to parse schedule settings:', error);
      return {};
    }
  }
  return scheduleSettings || {};
}

export function getEnabledEventTypes(scheduleSettings: any) {
  const parsed = parseScheduleSettings(scheduleSettings);
  return parsed.enabledEventTypes || [];
}

export function filterEventsBySettings(events: any[], scheduleSettings: any, eventTypes: any[], individualTypes: string[] = []) {
  const enabledTypes = getEnabledEventTypes(scheduleSettings);
  const enabledIndividualTypes = individualTypes;
  
  // If no enabled types are configured for either category, show all events (default behavior)
  if (enabledTypes.length === 0 && enabledIndividualTypes.length === 0) {
    return events;
  }
  
  // Filter events based on enabled types
  return events.filter((event: any) => {
    // Always include important date events regardless of filtering
    if (event.type === 'important_date') {
      return true;
    }
    
    // Normalize event type for comparison (handle underscore vs space inconsistencies)
    const normalizedEventType = event.type.replace(/_/g, ' ').toLowerCase();
    
    // Find the event type in the database
    const eventType = eventTypes.find(et => 
      et.id === event.eventTypeId || 
      et.name.toLowerCase() === event.type.toLowerCase() ||
      et.name.toLowerCase() === normalizedEventType
    );
    
    // Determine if this event type is enabled in show schedule
    const typeIdentifier = eventType ? (eventType.isDefault ? eventType.name : eventType.id) : event.type;
    const isEnabledInShowSchedule = enabledTypes.includes(typeIdentifier);
    
    if (isEnabledInShowSchedule) {
      // This is a show event - it's always visible when show schedule is enabled
      return true;
    } else {
      // This is an individual event - check if it's enabled in individual types
      const eventTypeName = eventType ? eventType.name : event.type;
      const normalizedEventTypeName = eventTypeName.replace(/_/g, ' ').toLowerCase();
      
      return enabledIndividualTypes.some(enabledType => {
        const normalizedEnabledType = enabledType.replace(/_/g, ' ').toLowerCase();
        return normalizedEnabledType === eventTypeName.toLowerCase() ||
               normalizedEnabledType === event.type.toLowerCase() ||
               normalizedEnabledType === normalizedEventType ||
               normalizedEnabledType === normalizedEventTypeName;
      });
    }
  });
}

export function shouldShowEventType(eventType: any, scheduleSettings: any) {
  const enabledTypes = getEnabledEventTypes(scheduleSettings);
  
  // If no enabled types are configured, show all event types (default behavior)
  if (enabledTypes.length === 0) {
    return true;
  }
  
  // Check if this event type is enabled
  const typeIdentifier = eventType.isDefault ? eventType.name : eventType.id;
  return enabledTypes.includes(typeIdentifier);
}

export function getTimezoneAbbreviation(timeZone: string): string {
  try {
    const now = new Date();
    const timeZoneAbbr = new Intl.DateTimeFormat('en-US', { 
      timeZone: timeZone, 
      timeZoneName: 'short' 
    }).formatToParts().find(part => part.type === 'timeZoneName')?.value || 'EST';
    return timeZoneAbbr;
  } catch (error) {
    console.warn('Failed to get timezone abbreviation for:', timeZone, error);
    return 'EST';
  }
}

export function formatDateInTimezone(date: Date, timeZone: string): string {
  try {
    return date.toLocaleDateString('en-US', { 
      timeZone: timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.warn('Failed to format date in timezone:', timeZone, error);
    return date.toLocaleDateString('en-US');
  }
}