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
  
  console.log('🔍 First Rehearsal Debug:', {
    eventsCount: events.length,
    enabledTypes,
    firstRehearsalEvent: events.find(e => e.title === 'First Rehearsal'),
    eventTypes: eventTypes.map(et => ({ id: et.id, name: et.name, isDefault: et.isDefault }))
  });
  
  // If no enabled types are configured, show all events (default behavior)
  if (enabledTypes.length === 0) {
    return events;
  }
  
  // Filter events based on enabled types
  const filteredEvents = events.filter((event: any) => {
    // Check if the event type is enabled
    const eventType = eventTypes.find(et => 
      et.id === event.eventTypeId || 
      et.name.toLowerCase() === event.type.toLowerCase()
    );
    
    if (event.title === 'First Rehearsal') {
      console.log('🎯 First Rehearsal specific debug:', {
        eventId: event.id,
        eventType: event.type,
        eventTypeId: event.eventTypeId,
        matchedEventType: eventType,
        enabledTypes,
        eventTypeCheck: eventType ? (eventType.isDefault ? eventType.name : eventType.id) : 'NO_MATCH'
      });
    }
    
    if (!eventType) {
      // If event type not found, check by type string directly (case-insensitive)
      const result = enabledTypes.some(enabledType => 
        enabledType.toLowerCase() === event.type.toLowerCase()
      );
      if (event.title === 'First Rehearsal') {
        console.log('❌ First Rehearsal not found in eventTypes, fallback result:', result);
      }
      return result;
    }
    
    // Check if event type is enabled (using name for system types, id for custom types)
    const typeIdentifier = eventType.isDefault ? eventType.name : eventType.id;
    const result = enabledTypes.includes(typeIdentifier);
    if (event.title === 'First Rehearsal') {
      console.log('✅ First Rehearsal type found, result:', { typeIdentifier, result });
    }
    return result;
  });
  
  console.log('📊 First Rehearsal filtering results:', {
    originalCount: events.length,
    filteredCount: filteredEvents.length,
    firstRehearsalFiltered: filteredEvents.find(e => e.title === 'First Rehearsal') ? 'INCLUDED' : 'EXCLUDED'
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