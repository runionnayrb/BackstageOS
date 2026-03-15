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

// ============================================
// Overlap Detection and Layout Calculation
// ============================================

interface EventForLayout {
  id: number;
  startTime: string;
  endTime: string;
  isAllDay?: boolean;
}

interface EventLayout {
  column: number;
  totalColumns: number;
  width: number;
  left: number;
}

// Convert time string "HH:MM" or "HH:MM:SS" to minutes from midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Check if two events overlap in time
function eventsOverlap(eventA: EventForLayout, eventB: EventForLayout): boolean {
  const startA = timeToMinutes(eventA.startTime);
  const endA = timeToMinutes(eventA.endTime);
  const startB = timeToMinutes(eventB.startTime);
  const endB = timeToMinutes(eventB.endTime);
  
  // Events overlap if one starts before the other ends
  return startA < endB && startB < endA;
}

// Find all events that overlap with a given event
function findOverlappingEvents(event: EventForLayout, allEvents: EventForLayout[]): EventForLayout[] {
  return allEvents.filter(other => other.id !== event.id && eventsOverlap(event, other));
}

// Group events into clusters of overlapping events
function groupOverlappingEvents(events: EventForLayout[]): EventForLayout[][] {
  const groups: EventForLayout[][] = [];
  const assigned = new Set<number>();
  
  for (const event of events) {
    if (assigned.has(event.id)) continue;
    
    // Start a new group with this event
    const group: EventForLayout[] = [event];
    assigned.add(event.id);
    
    // Find all events that overlap with any event in this group
    let i = 0;
    while (i < group.length) {
      const current = group[i];
      for (const other of events) {
        if (!assigned.has(other.id) && eventsOverlap(current, other)) {
          group.push(other);
          assigned.add(other.id);
        }
      }
      i++;
    }
    
    groups.push(group);
  }
  
  return groups;
}

// Assign columns to events within a group
// Uses greedy algorithm to ensure overlapping events never share the same column
function assignColumns(group: EventForLayout[]): Map<number, number> {
  // Sort events by start time, then by end time, then by ID for stability
  const timeSorted = [...group].sort((a, b) => {
    const startA = timeToMinutes(a.startTime);
    const startB = timeToMinutes(b.startTime);
    if (startA !== startB) return startA - startB;
    const endA = timeToMinutes(a.endTime);
    const endB = timeToMinutes(b.endTime);
    if (endA !== endB) return endA - endB;
    return a.id - b.id;
  });
  
  const columnAssignments = new Map<number, number>();
  const columnEndTimes: number[] = [];
  
  for (const event of timeSorted) {
    const startTime = timeToMinutes(event.startTime);
    const endTime = timeToMinutes(event.endTime);
    
    // Find the first column where this event can fit (column is free when event starts)
    let assignedColumn = -1;
    for (let col = 0; col < columnEndTimes.length; col++) {
      if (columnEndTimes[col] <= startTime) {
        assignedColumn = col;
        break;
      }
    }
    
    // If no existing column is free, create a new one
    if (assignedColumn === -1) {
      assignedColumn = columnEndTimes.length;
      columnEndTimes.push(0);
    }
    
    // Assign this event to the column and update when the column becomes free
    columnAssignments.set(event.id, assignedColumn);
    columnEndTimes[assignedColumn] = endTime;
  }
  
  return columnAssignments;
}

// Calculate layout for all events, handling overlaps
export function calculateEventLayouts(events: EventForLayout[]): Map<number, EventLayout> {
  const layouts = new Map<number, EventLayout>();
  
  // Filter out all-day events (they don't participate in overlap layout)
  const timedEvents = events.filter(e => !e.isAllDay);
  
  // Group overlapping events
  const groups = groupOverlappingEvents(timedEvents);
  
  for (const group of groups) {
    // Assign columns within this group
    const columnAssignments = assignColumns(group);
    const totalColumns = Math.max(...Array.from(columnAssignments.values())) + 1;
    
    // Calculate width and position for each event
    for (const event of group) {
      const column = columnAssignments.get(event.id) || 0;
      
      // Calculate width as a percentage of the available space
      // Leave a small gap between events for visual clarity
      const gap = 2; // pixels
      const widthPercent = 100 / totalColumns;
      
      layouts.set(event.id, {
        column,
        totalColumns,
        width: widthPercent,
        left: column * widthPercent,
      });
    }
  }
  
  return layouts;
}