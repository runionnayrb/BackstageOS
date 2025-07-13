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
  
  // Define individual event types for classification
  const INDIVIDUAL_EVENT_TYPES = [
    'meeting',
    'costume_fitting',
    'wig_fitting',
    'hmu',
    'vocal_coaching'
  ];
  
  // Filter events based on enabled types
  return events.filter((event: any) => {
    // Normalize event type for comparison (handle both 'costume_fitting' and 'costume fitting')
    const normalizedEventType = event.type.replace(/_/g, ' ');
    const eventTypeKey = event.type.replace(/ /g, '_');
    
    // Check if this is an individual event type
    const isIndividualEvent = INDIVIDUAL_EVENT_TYPES.includes(eventTypeKey) || 
                             INDIVIDUAL_EVENT_TYPES.some(type => type.replace(/_/g, ' ').toLowerCase() === normalizedEventType.toLowerCase());
    
    if (isIndividualEvent) {
      // For individual events, check if they're enabled in the individual types
      return enabledIndividualTypes.some(enabledType => 
        enabledType.toLowerCase() === event.type.toLowerCase() ||
        enabledType.toLowerCase() === normalizedEventType.toLowerCase() ||
        enabledType.toLowerCase() === eventTypeKey.toLowerCase()
      );
    } else {
      // For show events, check if they're enabled in the show event types
      // First try to find the event type in the database
      const eventType = eventTypes.find(et => 
        et.id === event.eventTypeId || 
        et.name.toLowerCase() === event.type.toLowerCase()
      );
      
      if (eventType) {
        // Check if event type is enabled (using name for system types, id for custom types)
        const typeIdentifier = eventType.isDefault ? eventType.name : eventType.id;
        return enabledTypes.includes(typeIdentifier);
      } else {
        // If event type not found in database, check by type string directly (case-insensitive)
        return enabledTypes.some(enabledType => 
          enabledType.toLowerCase() === event.type.toLowerCase() ||
          enabledType.toLowerCase() === normalizedEventType.toLowerCase()
        );
      }
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