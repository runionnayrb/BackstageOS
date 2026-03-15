import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Plus, Clock, Users, Calendar, Edit, MapPin } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { formatTimeDisplay, parseScheduleSettings } from "@/lib/timeUtils";
import { isShowEvent, getEventTypeDisplayName, getEventTypeColor, getEventTypeColorFromDatabase, isLightColor } from "@/lib/eventUtils";
import { filterEventsBySettings, getTimezoneAbbreviation } from "@/lib/scheduleUtils";
import LocationSelect from "@/components/location-select";

interface MobileWeeklyScheduleViewProps {
  projectId: number;
  onDateClick: (date: Date) => void;
  currentDate?: Date;
  setCurrentDate?: (date: Date) => void;
  selectedContactIds: number[];
  onFilterChange: (contactIds: number[]) => void;
  selectedEventTypes: string[];
  onEventTypeFilterChange: (eventTypes: string[]) => void;
  selectedIndividualTypes: string[];
  onIndividualTypeFilterChange: (individualTypes: string[]) => void;
  selectedLocations?: string[];
  timeIncrement: 15 | 30 | 60;
  setTimeIncrement: (increment: 15 | 30 | 60) => void;
  showAllDayEvents?: boolean;
  setShowAllDayEvents?: (show: boolean) => void;
  settings?: any;
  createEventDialog: boolean;
  setCreateEventDialog: (open: boolean) => void;
  viewMode: 'monthly' | 'weekly' | 'daily';
  setViewMode: (mode: 'monthly' | 'weekly' | 'daily') => void;
  onEventEdit?: (event: ScheduleEvent) => void;
}

interface ScheduleEvent {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  location?: string;
  notes?: string;
  isAllDay: boolean;
  participants: {
    id: number;
    contactId: number;
    contactFirstName: string;
    contactLastName: string;
    isRequired: boolean;
    status: string;
  }[];
}

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  category: string;
  role?: string;
}

// Default time range constants (will be overridden by scheduleSettings)
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 24;

export default function MobileWeeklyScheduleView({ 
  projectId, 
  onDateClick, 
  currentDate, 
  setCurrentDate, 
  selectedContactIds, 
  onFilterChange,
  selectedEventTypes,
  onEventTypeFilterChange,
  selectedIndividualTypes,
  onIndividualTypeFilterChange,
  selectedLocations = [],
  timeIncrement,
  setTimeIncrement,
  showAllDayEvents: propShowAllDayEvents,
  setShowAllDayEvents,
  settings,
  createEventDialog,
  setCreateEventDialog,
  viewMode,
  setViewMode,
  onEventEdit
}: MobileWeeklyScheduleViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(() => {
    // Start with current date, but align to start of week
    const date = currentDate || new Date();
    const startOfWeek = new Date(date);
    
    // Map week start day string to number (default to Sunday if weekStartDay not available yet)
    const weekStartMap: { [key: string]: number } = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, 
      thursday: 4, friday: 5, saturday: 6
    };
    
    const configuredStartDay = weekStartMap['sunday'] || 0; // Default to Sunday for initial state
    const currentDay = startOfWeek.getDay();
    
    // Calculate days to subtract to get to the configured start day
    let daysToSubtract = currentDay - configuredStartDay;
    if (daysToSubtract < 0) {
      daysToSubtract += 7;
    }
    
    startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
    return startOfWeek;
  });

  // Get show settings for timezone and work hours
  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Parse schedule settings with time format preference
  const scheduleSettings = parseScheduleSettings((showSettings as any)?.scheduleSettings);
  const { timeFormat = '12', timezone, weekStartDay, workStartTime, workEndTime, dayStartHour, dayEndHour } = scheduleSettings;

  // Calculate dynamic time range based on settings (supports 28-hour day for theater)
  const START_HOUR = dayStartHour ?? DEFAULT_START_HOUR;
  const END_HOUR = dayEndHour ?? DEFAULT_END_HOUR;
  const START_MINUTES = START_HOUR * 60;
  const END_MINUTES = END_HOUR * 60;
  const TOTAL_MINUTES = END_MINUTES - START_MINUTES;

  // Fetch schedule events
  const { data: events = [], isLoading } = useQuery<ScheduleEvent[]>({
    queryKey: [`/api/projects/${projectId}/schedule-events`],
  });

  // Fetch contacts for event assignment
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: [`/api/projects/${projectId}/contacts`],
  });

  // Fetch event types for filtering
  const { data: eventTypes = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/event-types`],
    enabled: !!projectId,
  });

  // Filter events based on selected contact IDs and schedule filtering
  const filteredEvents = (() => {
    let eventsToFilter = events;
    
    // Apply event type filtering based on user selections
    // Always include important date events regardless of filtering
    // If no event types are selected at all, show only important dates
    if (selectedEventTypes.length === 0 && selectedIndividualTypes.length === 0) {
      eventsToFilter = eventsToFilter.filter(event => event.type === 'important_date');
    } else {
      eventsToFilter = eventsToFilter.filter(event => {
        // Always include important date events
        if (event.type === 'important_date') {
          return true;
        }
        
        // Normalize event type for comparison
        const normalizedEventType = event.type.replace(/_/g, ' ').toLowerCase();
        
        // Find the event type in the database
        const eventType = eventTypes.find(et => 
          et.id === event.eventTypeId || 
          et.name.toLowerCase() === event.type.toLowerCase() ||
          et.name.toLowerCase() === normalizedEventType
        );
        
        // Check if this event type is selected in Show Schedule
        // Use the event type NAME for comparison since schedule-filter passes names
        const eventTypeName = eventType ? eventType.name : event.type;
        const isSelectedInShowSchedule = selectedEventTypes.some(selectedType => 
          selectedType.toLowerCase() === eventTypeName.toLowerCase() ||
          selectedType.toLowerCase() === event.type.toLowerCase() ||
          selectedType.toLowerCase() === normalizedEventType
        );
        
        if (isSelectedInShowSchedule) {
          return true;
        } else {
          // Check if it's selected in Individual Events
          const normalizedEventTypeName = eventTypeName.replace(/_/g, ' ').toLowerCase();
          
          return selectedIndividualTypes.some(selectedType => {
            const normalizedSelectedType = selectedType.replace(/_/g, ' ').toLowerCase();
            return normalizedSelectedType === eventTypeName.toLowerCase() ||
                   normalizedSelectedType === event.type.toLowerCase() ||
                   normalizedSelectedType === normalizedEventType ||
                   normalizedSelectedType === normalizedEventTypeName;
          });
        }
      });
    }
    
    // Apply contact filtering
    if (selectedContactIds.length > 0) {
      eventsToFilter = eventsToFilter.filter(event => 
        event.participants.some(participant => 
          selectedContactIds.includes(participant.contactId)
        )
      );
    }
    
    // Apply location filtering
    if (selectedLocations.length > 0) {
      eventsToFilter = eventsToFilter.filter(event => {
        if (!event.location) return false;
        const eventLocationLower = event.location.toLowerCase();
        return selectedLocations.some(loc => 
          eventLocationLower === loc.toLowerCase() || 
          eventLocationLower.includes(loc.toLowerCase()) ||
          loc.toLowerCase().includes(eventLocationLower)
        );
      });
    }
    
    return eventsToFilter;
  })();

  // Generate multiple weeks of days for continuous scrolling
  const generateDays = useCallback((centerDate: Date, daysRange: number = 21) => {
    const days = [];
    const start = new Date(centerDate);
    start.setDate(centerDate.getDate() - Math.floor(daysRange / 2));
    
    for (let i = 0; i < daysRange; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  }, []);

  const days = generateDays(currentDate || new Date());

  // Update start date when week start day setting changes
  useEffect(() => {
    if (!weekStartDay) return; // Wait for settings to load
    
    const date = currentDate || new Date();
    const newStartOfWeek = new Date(date);
    
    // Map week start day string to number
    const weekStartMap: { [key: string]: number } = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, 
      thursday: 4, friday: 5, saturday: 6
    };
    
    const configuredStartDay = weekStartMap[weekStartDay] || 0;
    const currentDay = newStartOfWeek.getDay();
    
    // Calculate days to subtract to get to the configured start day
    let daysToSubtract = currentDay - configuredStartDay;
    if (daysToSubtract < 0) {
      daysToSubtract += 7;
    }
    
    newStartOfWeek.setDate(newStartOfWeek.getDate() - daysToSubtract);
    setStartDate(newStartOfWeek);
    setIsInitialized(false); // Reset initialization to allow repositioning
  }, [weekStartDay, currentDate]);

  // ONLY initial positioning - NO programmatic scrolling after initialization
  useEffect(() => {
    if (!scrollContainerRef.current || !currentDate || isInitialized) {
      return; // Skip all programmatic scrolling once initialized
    }
    
    const currentDateIndex = days.findIndex(day => 
      day.toDateString() === currentDate.toDateString()
    );
    
    
    if (currentDateIndex >= 0) {
      const container = scrollContainerRef.current;
      const dayWidth = 200;
      const containerWidth = container.clientWidth;
      
      // Position so the current day is visible on screen
      const scrollPosition = Math.max(0, (currentDateIndex * dayWidth) - (containerWidth / 2) + (dayWidth / 2));
      
      
      // Use instant scroll for initial load only
      container.scrollTo({ left: scrollPosition, behavior: 'instant' });
      setIsInitialized(true);
    }
  }, [days, isInitialized, currentDate]);

  // Time formatting functions
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (timeFormat === '12') {
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
    }
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const formatEventTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    return formatTime(totalMinutes);
  };

  const timeToMinutes = (timeString: string) => {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToPosition = (minutes: number) => {
    return Math.max(0, minutes - START_MINUTES);
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return filteredEvents.filter(event => event.date === dateString);
  };

  // Simple and efficient date tracking - NO currentDate dependency to prevent re-triggering
  const updateCurrentDate = useCallback(() => {
    if (!scrollContainerRef.current || !setCurrentDate) return;
    
    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const dayWidth = 200;
    
    // Find which day is most visible (center-based)
    const centerPosition = scrollLeft + (container.clientWidth / 2);
    const dayIndex = Math.round(centerPosition / dayWidth);
    const clampedIndex = Math.max(0, Math.min(dayIndex, days.length - 1));
    
    if (days[clampedIndex]) {
      setCurrentDate(days[clampedIndex]);
    }
  }, [days, setCurrentDate]);

  // Simple, efficient scroll handling for iOS-style behavior
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      // Wait for momentum scrolling to complete
      scrollTimeout = setTimeout(() => {
        updateCurrentDate();
      }, 150);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(scrollTimeout);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [updateCurrentDate]);

  // ONLY initial positioning - NO programmatic scrolling after initialization
  useEffect(() => {
    if (!scrollContainerRef.current || !currentDate || isInitialized) {
      return; // Skip all programmatic scrolling once initialized
    }
    
    const currentDateIndex = days.findIndex(day => 
      day.toDateString() === currentDate.toDateString()
    );
    
    
    if (currentDateIndex >= 0) {
      const container = scrollContainerRef.current;
      const dayWidth = 200;
      const containerWidth = container.clientWidth;
      
      // Position so the current day is visible on screen
      const scrollPosition = Math.max(0, (currentDateIndex * dayWidth) - (containerWidth / 2) + (dayWidth / 2));
      
      
      // Use instant scroll for initial load only
      container.scrollTo({ left: scrollPosition, behavior: 'instant' });
      setIsInitialized(true);
    }
  }, [days, isInitialized, currentDate]);

  // Generate time labels
  const timeLabels = useMemo(() => {
    const labels = [];
    for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += timeIncrement) {
      labels.push({
        minutes,
        label: formatTime(minutes),
        position: minutesToPosition(minutes)
      });
    }
    return labels;
  }, [timeIncrement, timeFormat]);

  const containerHeight = TOTAL_MINUTES + 15; // Small padding to show 11:30 PM

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Main Content Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Time Labels - Fixed on left side */}
        <div className="w-16 bg-white border-r border-gray-200 flex-shrink-0">
          {/* Timezone Header */}
          <div 
            style={{ 
              height: '24px',
              minHeight: '24px', 
              maxHeight: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              backgroundColor: '#f9fafb',
              margin: 0,
              padding: 0,
              boxSizing: 'border-box'
            }}
          >
            <span 
              style={{ 
                lineHeight: '14px',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#6b7280',
                margin: 0,
                padding: 0
              }}
            >
              {getTimezoneAbbreviation(timezone || "America/New_York")}
            </span>
          </div>

          {/* All Day Label */}
          {propShowAllDayEvents && (
            <div 
              className="bg-gray-50 border-b border-gray-200 flex items-center justify-center text-xs font-medium text-gray-600"
              style={{ minHeight: '40px' }}
            >
              All Day
            </div>
          )}
          <div 
            className="relative flex-1"
          >
            <div 
              className="relative"
              style={{ height: `${containerHeight}px`, paddingTop: '24px' }}
            >
              {timeLabels.map((timeLabel) => (
                <div
                  key={timeLabel.minutes}
                  className="absolute right-2 text-xs text-gray-500"
                  style={{ top: `${timeLabel.position + 24 - 12}px` }}
                >
                  {timeLabel.label}
                </div>
              ))}
              {/* Midnight line */}
              <div
                className="absolute left-0 right-0 border-b border-gray-100"
                style={{ top: `${TOTAL_MINUTES + 24}px` }}
              />
            </div>
          </div>
        </div>

        {/* Scrollable Days Container */}
        <div className="flex-1 overflow-hidden">
          {/* Combined scrollable container for headers and content */}
          <div 
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-hide h-full"
            style={{ 
              scrollBehavior: 'auto',
              overscrollBehavior: 'none',
              WebkitOverflowScrolling: 'auto',
              scrollSnapType: 'none !important',
              scrollSnapAlign: 'none !important',
              touchAction: 'pan-x',
              transform: 'translate3d(0,0,0)', // Force hardware acceleration
              willChange: 'scroll-position'
            }}
          >
            <div 
              className="flex h-full" 
              style={{ 
                width: `${days.length * 200}px`,
                transform: 'translate3d(0,0,0)',
                backfaceVisibility: 'hidden'
              }}
            >
              {days.map((day, index) => (
                <div 
                  key={day.toISOString()}
                  className="flex-shrink-0 flex flex-col border-r border-gray-200"
                  style={{ 
                    width: '200px',
                    minWidth: '200px',
                    maxWidth: '200px',
                    scrollSnapAlign: 'none !important',
                    transform: 'translate3d(0,0,0)'
                  }}
                >
                  {/* Day Header */}
                  <div 
                    style={{ 
                      height: '24px', 
                      minHeight: '24px', 
                      maxHeight: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      backgroundColor: '#f9fafb',
                      cursor: 'pointer',

                      margin: 0,
                      padding: 0,
                      boxSizing: 'border-box'
                    }}
                    onClick={() => onDateClick(day)}
                  >
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: '4px',
                      height: '100%',
                      width: '100%'
                    }}>
                      <span 
                        style={{ 
                          lineHeight: '14px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          color: '#6b7280',
                          margin: 0,
                          padding: 0
                        }}
                      >
                        {day.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}
                      </span>
                      {day.toDateString() === new Date().toDateString() ? (
                        <div 
                          className="bg-red-500 rounded-full"
                          style={{
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <span 
                            style={{ 
                              lineHeight: '12px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              color: '#ffffff',
                              margin: 0,
                              padding: 0
                            }}
                          >
                            {day.getDate()}
                          </span>
                        </div>
                      ) : (
                        <span 
                          style={{ 
                            lineHeight: '14px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#111827',
                            margin: 0,
                            padding: 0
                          }}
                        >
                          {day.getDate()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* All Day Events Section */}
                  {propShowAllDayEvents && (
                    <div className="bg-gray-50 border-b border-gray-200 min-h-[40px] p-1">
                      {getEventsForDate(day)
                        .filter(event => event.isAllDay)
                        .map((event) => {
                          const eventTypeColor = getEventTypeColorFromDatabase(event.type, eventTypes);
                          return (
                            <Popover 
                              key={event.id}
                              open={openPopoverId === `${event.id}-allday`}
                              onOpenChange={(open) => setOpenPopoverId(open ? `${event.id}-allday` : null)}
                            >
                              <PopoverTrigger asChild>
                                <div
                                  className={`rounded px-2 py-1 text-xs mb-1 cursor-pointer hover:opacity-90 transition-opacity ${
                                    isLightColor(eventTypeColor) ? 'text-gray-900' : 'text-white'
                                  }`}
                                  style={{ backgroundColor: eventTypeColor }}
                                >
                                  <div className="font-medium truncate">{event.title}</div>
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-80" align="start">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: eventTypeColor }}></div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => {
                                          setOpenPopoverId(null);
                                          onEventEdit?.(event);
                                        }}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-sm">{event.title}</h4>
                                    <p className="text-xs text-gray-500 mt-1">All Day</p>
                                  </div>
                                  {event.location && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <MapPin className="h-3 w-3" />
                                      <span>{event.location}</span>
                                    </div>
                                  )}
                                  {event.description && (
                                    <div className="text-xs text-gray-600">
                                      <p className="font-medium mb-1">Description:</p>
                                      <p>{event.description}</p>
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          );
                        })}
                    </div>
                  )}

                  {/* Day Schedule Content */}
                  <div 
                    className="relative bg-white flex-1"
                  >
                    <div 
                      className="relative"
                      style={{ height: `${containerHeight}px` }}
                    >
                      {/* Time grid background */}
                      <div className="absolute inset-0">
                        {timeLabels.map((timeLabel) => (
                          <div
                            key={timeLabel.minutes}
                            className="absolute left-0 right-0 border-t border-gray-100"
                            style={{ top: `${timeLabel.position}px` }}
                          />
                        ))}
                        {/* Midnight line */}
                        <div
                          className="absolute left-0 right-0 border-t border-gray-100"
                          style={{ top: `${TOTAL_MINUTES}px` }}
                        />
                      </div>

                      {/* Events for this day - only non-all-day events */}
                      {getEventsForDate(day)
                        .filter(event => !event.isAllDay)
                        .map((event) => {
                          const startMinutes = timeToMinutes(event.startTime);
                          const endMinutes = timeToMinutes(event.endTime);
                          const top = minutesToPosition(startMinutes);
                          const height = Math.max(30, endMinutes - startMinutes); // Minimum 30px height
                          const eventTypeColor = getEventTypeColorFromDatabase(event.type, eventTypes);

                          return (
                            <Popover 
                              key={event.id}
                              open={openPopoverId === `${event.id}-timed`}
                              onOpenChange={(open) => setOpenPopoverId(open ? `${event.id}-timed` : null)}
                            >
                              <PopoverTrigger asChild>
                                <div
                                  className="absolute left-1 right-1 text-white rounded px-2 py-1 text-xs overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                                  style={{
                                    top: `${top}px`,
                                    height: `${height}px`,
                                    backgroundColor: eventTypeColor,
                                  }}
                                >
                                  <div className="font-medium truncate">{event.title}</div>
                                  <div className="text-xs opacity-90">{formatEventTime(event.startTime)} - {formatEventTime(event.endTime)}</div>
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-80" align="start">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: eventTypeColor }}></div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => {
                                          setOpenPopoverId(null);
                                          onEventEdit?.(event);
                                        }}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-sm">{event.title}</h4>
                                    <p className="text-xs text-gray-500 mt-1">{formatEventTime(event.startTime)} - {formatEventTime(event.endTime)}</p>
                                  </div>
                                  {event.location && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <MapPin className="h-3 w-3" />
                                      <span>{event.location}</span>
                                    </div>
                                  )}
                                  {event.description && (
                                    <div className="text-xs text-gray-600">
                                      <p className="font-medium mb-1">Description:</p>
                                      <p>{event.description}</p>
                                    </div>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}