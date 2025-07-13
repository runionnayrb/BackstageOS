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
  
  console.log('🔍 Schedule Filtering Debug:', {
    eventsCount: events.length,
    enabledTypes,
    scheduleSettings,
    eventTypesCount: eventTypes.length,
    sampleEvent: events[0],
    sampleEventType: eventTypes[0]
  });
  
  // If no enabled types are configured, show all events (default behavior)
  if (enabledTypes.length === 0) {
    console.log('⚠️ No enabled types configured, showing all events');
    return events;
  }
  
  // Filter events based on enabled types
  const filteredEvents = events.filter((event: any) => {
    // Check if the event type is enabled
    const eventType = eventTypes.find(et => et.id === event.eventTypeId || et.name === event.type);
    
    console.log('🔍 Event filtering:', {
      eventId: event.id,
      eventTitle: event.title,
      eventType: event.type,
      eventTypeId: event.eventTypeId,
      matchedEventType: eventType,
      enabledTypes
    });
    
    if (!eventType) {
      // If event type not found, check by type string directly
      const result = enabledTypes.includes(event.type);
      console.log('❌ Event type not found in eventTypes, checking by type string:', result);
      return result;
    }
    
    // Check if event type is enabled (using name for system types, id for custom types)
    const typeIdentifier = eventType.isDefault ? eventType.name : eventType.id;
    const result = enabledTypes.includes(typeIdentifier);
    console.log('✅ Event type found, checking identifier:', { typeIdentifier, result });
    return result;
  });
  
  console.log('📊 Filtering results:', {
    originalCount: events.length,
    filteredCount: filteredEvents.length,
    hiddenCount: events.length - filteredEvents.length
  });
  
  return filteredEvents;
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