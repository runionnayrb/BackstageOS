// Define which event types are considered "show events" vs individual events
export const SHOW_EVENT_TYPES = [
  'rehearsal',
  'tech',
  'tech_rehearsal', 
  'preview',
  'performance',
  'dark',
  'breaks'
] as const;

export const INDIVIDUAL_EVENT_TYPES = [
  'meeting',
  'costume_fitting',
  'wig_fitting',
  'hmu',
  'vocal_coaching'
] as const;

export const ALL_EVENT_TYPES = [
  ...SHOW_EVENT_TYPES,
  ...INDIVIDUAL_EVENT_TYPES
] as const;

export type EventType = typeof ALL_EVENT_TYPES[number];

// Check if an event type is a show-wide event
export const isShowEvent = (eventType: string): boolean => {
  return SHOW_EVENT_TYPES.includes(eventType as any);
};

// Get display names for event types - uses database event types if provided
export const getEventTypeDisplayName = (eventType: string, eventTypes?: any[], eventTypeId?: number): string => {
  // If eventTypes array is provided, look up the actual name from the database
  if (eventTypes && eventTypes.length > 0) {
    // If eventTypeId is provided, use it for direct lookup first
    if (eventTypeId) {
      const matchedEventType = eventTypes.find(et => et.id === eventTypeId);
      if (matchedEventType?.name) {
        return matchedEventType.name;
      }
    }
    
    // Try direct match by name/type
    let matchedEventType = eventTypes.find(et => 
      et.id === eventType || 
      et.name === eventType ||
      et.name.toLowerCase() === eventType.toLowerCase()
    );
    
    // If no direct match, try format conversions (underscore to space, hyphen to space, etc.)
    if (!matchedEventType) {
      matchedEventType = eventTypes.find(et => 
        et.name.toLowerCase().replace(/[\s-]+/g, '_') === eventType.toLowerCase() ||
        et.name.toLowerCase().replace(/[\s_]+/g, '-') === eventType.toLowerCase() ||
        et.name.toLowerCase() === eventType.toLowerCase().replace(/[_-]/g, ' ')
      );
    }
    
    if (matchedEventType?.name) {
      return matchedEventType.name;
    }
  }
  
  // Fallback to hardcoded names for standard event types
  switch (eventType) {
    case 'rehearsal': return 'Rehearsal';
    case 'tech': return 'Tech Rehearsal';
    case 'tech_rehearsal': return 'Tech Rehearsal';
    case 'preview': return 'Preview';
    case 'performance': return 'Performance';
    case 'dark': return 'DARK';
    case 'breaks': return 'Breaks';
    case 'meeting': return 'Meeting';
    case 'costume_fitting': return 'Costume Fitting';
    case 'wig_fitting': return 'Wig Fitting';
    case 'hmu': return 'Hair and Make-Up (HMU)';
    case 'vocal_coaching': return 'Vocal Coaching';
    default: return eventType;
  }
};

// Get event type color for calendar display
export const getEventTypeColor = (eventType: string): string => {
  switch (eventType) {
    // Show events - brighter colors
    case 'rehearsal': return 'bg-blue-500';
    case 'tech': return 'bg-orange-500';
    case 'tech_rehearsal': return 'bg-orange-500';
    case 'preview': return 'bg-yellow-500';
    case 'performance': return 'bg-green-500';
    case 'dark': return 'bg-black';
    // Individual events - muted colors
    case 'meeting': return 'bg-purple-500';
    case 'costume_fitting': return 'bg-pink-500';
    case 'wig_fitting': return 'bg-yellow-500';
    case 'hmu': return 'bg-indigo-500';
    case 'vocal_coaching': return 'bg-teal-500';
    default: return 'bg-gray-500';
  }
};

// Enhanced color matching function for database event types with format conversion
export const getEventTypeColorFromDatabase = (eventType: string, eventTypes: any[], eventTypeId?: number): string => {
  // If eventTypeId is provided, use it for direct lookup first
  if (eventTypeId) {
    const matchedEventType = eventTypes.find(et => et.id === eventTypeId);
    if (matchedEventType?.color) {
      return matchedEventType.color;
    }
  }
  
  // First try direct match by name/type
  let matchedEventType = eventTypes.find(et => 
    et.id === eventType || 
    et.name === eventType ||
    et.name.toLowerCase() === eventType.toLowerCase()
  );
  
  // If no direct match, try format conversions
  if (!matchedEventType) {
    matchedEventType = eventTypes.find(et => 
      et.name.toLowerCase().replace(/\s+/g, '_') === eventType.toLowerCase() ||
      et.name.toLowerCase() === eventType.toLowerCase().replace(/_/g, ' ')
    );
  }
  
  // Return the database color if found, otherwise fallback to default hex colors
  if (matchedEventType?.color) {
    return matchedEventType.color;
  }
  
  // Fallback to hardcoded hex colors if no database match
  return getEventTypeHexColor(eventType);
};

// Get hex color equivalents for event types
export const getEventTypeHexColor = (eventType: string): string => {
  switch (eventType) {
    // Show events - brighter colors
    case 'rehearsal': return '#3B82F6'; // blue-500
    case 'tech': return '#F97316'; // orange-500
    case 'tech_rehearsal': return '#F97316'; // orange-500
    case 'preview': return '#EAB308'; // yellow-500
    case 'performance': return '#22C55E'; // green-500
    case 'dark': return '#000000'; // black
    case 'breaks': return '#6B7280'; // gray-500
    // Individual events - muted colors
    case 'meeting': return '#8B5CF6'; // purple-500
    case 'costume_fitting': return '#EC4899'; // pink-500
    case 'wig_fitting': return '#EAB308'; // yellow-500
    case 'hmu': return '#6366F1'; // indigo-500
    case 'vocal_coaching': return '#14B8A6'; // teal-500
    default: return '#6B7280'; // gray-500
  }
};

// Get event type border color for left border (darker shade of background color)
export const getEventTypeBorderColor = (eventType: string): string => {
  switch (eventType) {
    // Show events - darker border colors
    case 'rehearsal': return 'border-blue-700';
    case 'tech': return 'border-orange-700';
    case 'tech_rehearsal': return 'border-orange-700';
    case 'preview': return 'border-yellow-700';
    case 'performance': return 'border-green-700';
    case 'dark': return 'border-gray-800';
    // Individual events - darker border colors
    case 'meeting': return 'border-purple-700';
    case 'costume_fitting': return 'border-pink-700';
    case 'wig_fitting': return 'border-yellow-700';
    case 'hmu': return 'border-indigo-700';
    case 'vocal_coaching': return 'border-teal-700';
    default: return 'border-gray-700';
  }
};

// Calculate relative luminance of a color (for contrast calculations)
// Uses the WCAG 2.0 formula for relative luminance
const getLuminance = (hexColor: string): number => {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  // Apply gamma correction
  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  // Calculate luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
};

// Determine if a color is "light" (needs dark text) or "dark" (needs light text)
export const isLightColor = (hexColor: string): boolean => {
  if (!hexColor || !hexColor.startsWith('#')) {
    return false; // Default to dark text assumption for invalid colors
  }
  const luminance = getLuminance(hexColor);
  // Threshold of 0.5 - colors above this are considered "light"
  return luminance > 0.5;
};

// Get text color for a given background color
// Returns 'text-gray-900' for light backgrounds, 'text-white' for dark backgrounds
export const getTextColorForBackground = (hexColor: string): string => {
  return isLightColor(hexColor) ? 'text-gray-900' : 'text-white';
};

// Darken a hex color by a percentage (for border colors)
export const darkenColor = (hexColor: string, percent: number = 20): string => {
  if (!hexColor || !hexColor.startsWith('#')) {
    return hexColor;
  }
  
  const hex = hexColor.replace('#', '');
  const r = Math.max(0, Math.round(parseInt(hex.substring(0, 2), 16) * (1 - percent / 100)));
  const g = Math.max(0, Math.round(parseInt(hex.substring(2, 4), 16) * (1 - percent / 100)));
  const b = Math.max(0, Math.round(parseInt(hex.substring(4, 6), 16) * (1 - percent / 100)));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// Performance numbering types that should be counted
export const PERFORMANCE_EVENT_TYPES = ['performance', 'preview'] as const;

// Check if an event type should be counted as a performance
export const isPerformanceType = (eventType: string, eventTypes?: any[], eventTypeId?: number): boolean => {
  // Check database event types first if provided
  if (eventTypes && eventTypes.length > 0 && eventTypeId) {
    const matchedEventType = eventTypes.find(et => et.id === eventTypeId);
    if (matchedEventType) {
      // Check if the database event type's category or name indicates it's a performance
      const name = matchedEventType.name?.toLowerCase() || '';
      const category = matchedEventType.category?.toLowerCase() || '';
      return name.includes('performance') || name.includes('show') || 
             name.includes('preview') || category === 'performance';
    }
  }
  
  // Fall back to checking the type string
  const normalizedType = eventType.toLowerCase().replace(/[\s-]/g, '_');
  return PERFORMANCE_EVENT_TYPES.includes(normalizedType as any) ||
         normalizedType.includes('performance') ||
         normalizedType.includes('show') ||
         normalizedType.includes('preview');
};

// Event interface for performance numbering calculations
interface PerformanceEvent {
  id: number;
  date: string;
  endDate?: string | null;
  startTime: string;
  type: string;
  eventTypeId?: number | null;
  status?: string;
}

// Calculate performance numbers for all events
// Returns a Map of eventId -> performance number (or null if not a performance type)
export function calculatePerformanceNumbers(
  events: PerformanceEvent[],
  config: { firstPerformanceEventId: number | null; startingNumber: number },
  eventTypes?: any[]
): Map<number, number | null> {
  const result = new Map<number, number | null>();
  
  // Filter to only performance-type events that aren't cancelled
  const performanceEvents = events.filter(event => {
    const isCancelled = event.status === 'cancelled';
    const isPerformance = isPerformanceType(event.type, eventTypes, event.eventTypeId ?? undefined);
    return isPerformance && !isCancelled;
  });
  
  // Sort by date, then by startTime for same-day events
  performanceEvents.sort((a, b) => {
    const dateA = a.date;
    const dateB = b.date;
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    return a.startTime.localeCompare(b.startTime);
  });
  
  // Find the starting index
  let startIndex = 0;
  if (config.firstPerformanceEventId) {
    const firstIndex = performanceEvents.findIndex(e => e.id === config.firstPerformanceEventId);
    if (firstIndex !== -1) {
      startIndex = firstIndex;
    }
  }
  
  // Assign numbers starting from the first performance
  let currentNumber = config.startingNumber;
  for (let i = startIndex; i < performanceEvents.length; i++) {
    result.set(performanceEvents[i].id, currentNumber);
    currentNumber++;
  }
  
  // Mark all other events (non-performances, cancelled, or before first) as null
  for (const event of events) {
    if (!result.has(event.id)) {
      result.set(event.id, null);
    }
  }
  
  return result;
}

// Get the performance number for a single event
export function getPerformanceNumber(
  eventId: number,
  events: PerformanceEvent[],
  config: { firstPerformanceEventId: number | null; startingNumber: number },
  eventTypes?: any[]
): number | null {
  const numbers = calculatePerformanceNumbers(events, config, eventTypes);
  return numbers.get(eventId) ?? null;
}