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
    
    // Log details for costume_fitting events specifically
    if (event.type === 'costume_fitting' || event.type === 'costume fitting' || event.id === 35 || event.id === 19) {
      console.log('DEBUG: Costume fitting event filtering:', {
        eventId: event.id,
        eventTitle: event.title,
        eventType: event.type,
        eventDate: event.date,
        enabledTypes: enabledTypes,
        foundEventType: eventType,
        availableEventTypes: eventTypes
      });
    }
    
    // Log details for tech_rehearsal event specifically
    if (event.type === 'tech_rehearsal' || event.id === 34) {
      console.log('DEBUG: Tech rehearsal event filtering:', {
        eventId: event.id,
        eventType: event.type,
        eventDate: event.date,
        enabledTypes: enabledTypes,
        foundEventType: eventType,
        availableEventTypes: eventTypes
      });
    }
    
    if (!eventType) {
      // If event type not found, check by type string directly (case-insensitive)
      // Also check normalized form (spaces replaced with underscores)
      const normalizedEventType = event.type.replace(/_/g, ' ');
      const isEnabled = enabledTypes.some(enabledType => 
        enabledType.toLowerCase() === event.type.toLowerCase() ||
        enabledType.toLowerCase() === normalizedEventType.toLowerCase()
      );
      
      if (event.type === 'tech_rehearsal' || event.id === 34) {
        console.log('DEBUG: Tech rehearsal - no event type found, checking by string:', {
          eventType: event.type,
          normalizedEventType,
          enabledTypes,
          isEnabled
        });
      }
      
      return isEnabled;
    }
    
    // Check if event type is enabled (using name for system types, id for custom types)
    const typeIdentifier = eventType.isDefault ? eventType.name : eventType.id;
    const isEnabled = enabledTypes.includes(typeIdentifier);
    
    // If not enabled by exact match, check if the normalized form matches
    if (!isEnabled) {
      const normalizedEventType = event.type.replace(/_/g, ' ');
      const fallbackEnabled = enabledTypes.some(enabledType => 
        enabledType.toLowerCase() === normalizedEventType.toLowerCase()
      );
      
      if (event.type === 'tech_rehearsal' || event.id === 34) {
        console.log('DEBUG: Tech rehearsal - fallback check:', {
          eventType: event.type,
          normalizedEventType,
          enabledTypes,
          fallbackEnabled
        });
      }
      
      return fallbackEnabled;
    }
    
    if (event.type === 'tech_rehearsal' || event.id === 34) {
      console.log('DEBUG: Tech rehearsal - direct enabled check:', {
        eventType: event.type,
        typeIdentifier,
        enabledTypes,
        isEnabled
      });
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