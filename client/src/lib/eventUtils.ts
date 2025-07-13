// Define which event types are considered "show events" vs individual events
export const SHOW_EVENT_TYPES = [
  'rehearsal',
  'tech',
  'tech_rehearsal', 
  'preview',
  'performance',
  'dark'
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
    case 'tech': return 'bg-purple-500';
    case 'tech_rehearsal': return 'bg-purple-500';
    case 'preview': return 'bg-orange-500';
    case 'performance': return 'bg-red-500';
    case 'dark': return 'bg-black';
    // Individual events - muted colors
    case 'meeting': return 'bg-green-500';
    case 'costume_fitting': return 'bg-pink-500';
    case 'wig_fitting': return 'bg-yellow-500';
    case 'hmu': return 'bg-indigo-500';
    case 'vocal_coaching': return 'bg-teal-500';
    default: return 'bg-gray-500';
  }
};