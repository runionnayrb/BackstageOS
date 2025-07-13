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

export function filterEventsBySettings(events: any[], scheduleSettings: any, eventTypes: any[]) {
  const enabledTypes = getEnabledEventTypes(scheduleSettings);
  
  // If no enabled types are configured, show all events (default behavior)
  if (enabledTypes.length === 0) {
    return events;
  }
  
  // Filter events based on enabled types
  return events.filter((event: any) => {
    // Check if the event type is enabled
    const eventType = eventTypes.find(et => 
      et.id === event.eventTypeId || 
      et.name.toLowerCase() === event.type.toLowerCase()
    );
    
    if (!eventType) {
      // If event type not found, check by type string directly (case-insensitive)
      // Also check normalized form (spaces replaced with underscores)
      const normalizedEventType = event.type.replace(/_/g, ' ');
      return enabledTypes.some(enabledType => 
        enabledType.toLowerCase() === event.type.toLowerCase() ||
        enabledType.toLowerCase() === normalizedEventType.toLowerCase()
      );
    }
    
    // Check if event type is enabled (using name for system types, id for custom types)
    const typeIdentifier = eventType.isDefault ? eventType.name : eventType.id;
    const isEnabled = enabledTypes.includes(typeIdentifier);
    
    // If not enabled by exact match, check if the normalized form matches
    if (!isEnabled) {
      const normalizedEventType = event.type.replace(/_/g, ' ');
      return enabledTypes.some(enabledType => 
        enabledType.toLowerCase() === normalizedEventType.toLowerCase()
      );
    }
    
    return isEnabled;
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