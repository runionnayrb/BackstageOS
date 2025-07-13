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
    const eventType = eventTypes.find(et => et.id === event.eventTypeId || et.name === event.type);
    
    if (!eventType) {
      // If event type not found, check by type string directly
      return enabledTypes.includes(event.type);
    }
    
    // Check if event type is enabled (using name for system types, id for custom types)
    const typeIdentifier = eventType.isDefault ? eventType.name : eventType.id;
    return enabledTypes.includes(typeIdentifier);
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