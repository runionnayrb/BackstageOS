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

// Get display names for event types
export const getEventTypeDisplayName = (eventType: string): string => {
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
    case 'breaks': return '#A855F7'; // purple-500
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