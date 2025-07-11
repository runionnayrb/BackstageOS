import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Plus, Clock, Users, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { formatTimeDisplay, parseScheduleSettings } from "@/lib/timeUtils";
import { isShowEvent, getEventTypeDisplayName, getEventTypeColor, ALL_EVENT_TYPES } from "@/lib/eventUtils";
import LocationSelect from "@/components/location-select";

interface MobileWeeklyScheduleViewProps {
  projectId: number;
  onDateClick: (date: Date) => void;
  currentDate?: Date;
  setCurrentDate?: (date: Date) => void;
  selectedContactIds: number[];
  timeIncrement: 15 | 30 | 60;
  showAllDayEvents?: boolean;
  settings?: any;
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

// Constants for time range (8 AM to midnight)
const START_HOUR = 8;
const END_HOUR = 24;
const START_MINUTES = START_HOUR * 60;
const END_MINUTES = END_HOUR * 60;
const TOTAL_MINUTES = END_MINUTES - START_MINUTES;

export default function MobileWeeklyScheduleView({ 
  projectId, 
  onDateClick, 
  currentDate, 
  setCurrentDate, 
  selectedContactIds, 
  timeIncrement, 
  showAllDayEvents: propShowAllDayEvents 
}: MobileWeeklyScheduleViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [startDate, setStartDate] = useState<Date>(() => {
    // Start with current date, but align to start of week
    const date = currentDate || new Date();
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Start on Sunday
    return startOfWeek;
  });

  // Get show settings for timezone and work hours
  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Parse schedule settings with time format preference
  const scheduleSettings = parseScheduleSettings((showSettings as any)?.scheduleSettings);
  const { timeFormat = '12', timezone, weekStartDay, workStartTime, workEndTime } = scheduleSettings;

  // Fetch schedule events
  const { data: events = [], isLoading } = useQuery<ScheduleEvent[]>({
    queryKey: [`/api/projects/${projectId}/schedule-events`],
  });

  // Fetch contacts for event assignment
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: [`/api/projects/${projectId}/contacts`],
  });

  // Filter events based on selected contact IDs
  const filteredEvents = selectedContactIds.length === 0 
    ? events.filter(event => isShowEvent(event.type) || !event.type)
    : events.filter(event => 
        event.participants.some(participant => 
          selectedContactIds.includes(participant.contactId)
        )
      );

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

  // Sync with external currentDate prop
  useEffect(() => {
    if (currentDate) {
      setStartDate(currentDate);
    }
  }, [currentDate]);

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

  // Handle date tracking without interfering with scroll physics
  const handleDateTracking = useCallback(() => {
    if (!scrollContainerRef.current || !isInitialized || !setCurrentDate) return;
    
    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    
    // Calculate which day is most visible for context tracking only
    const dayWidth = 200; // Fixed day width
    const centerScrollPosition = scrollLeft + containerWidth / 2;
    const centerDayIndex = Math.floor(centerScrollPosition / dayWidth);
    
    const clampedIndex = Math.max(0, Math.min(centerDayIndex, days.length - 1));
    
    if (days[clampedIndex]) {
      const newCurrentDate = days[clampedIndex];
      if (newCurrentDate.toDateString() !== currentDate?.toDateString()) {
        setCurrentDate(newCurrentDate);
      }
    }
  }, [days, setCurrentDate, isInitialized, currentDate]);

  // Add date tracking with long delay to avoid scroll interference
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let trackingTimeout: NodeJS.Timeout;
    
    const handleDateUpdate = () => {
      clearTimeout(trackingTimeout);
      // Very long delay to ensure scroll has completely finished
      trackingTimeout = setTimeout(handleDateTracking, 1000);
    };

    // Only track on scroll end, never during scroll
    container.addEventListener('scrollend', handleDateTracking, { passive: true });
    container.addEventListener('scroll', handleDateUpdate, { passive: true });
    
    return () => {
      container.removeEventListener('scrollend', handleDateTracking);
      container.removeEventListener('scroll', handleDateUpdate);
      clearTimeout(trackingTimeout);
    };
  }, [handleDateTracking]);

  // Scroll to current date on mount only (not when currentDate changes from scroll)
  useEffect(() => {
    if (!scrollContainerRef.current || !currentDate || isInitialized) return;
    
    const currentDateIndex = days.findIndex(day => 
      day.toDateString() === currentDate.toDateString()
    );
    
    if (currentDateIndex >= 0) {
      const container = scrollContainerRef.current;
      const dayWidth = 200;
      const containerWidth = container.clientWidth;
      
      // Position so the current day is visible on screen
      const scrollPosition = Math.max(0, (currentDateIndex * dayWidth) - (containerWidth / 2) + (dayWidth / 2));
      
      container.scrollTo({ left: scrollPosition, behavior: 'instant' });
      setIsInitialized(true);
    }
  }, [days, currentDate, isInitialized]);

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
              height: '20px',
              minHeight: '20px', 
              maxHeight: '20px',
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
              {(() => {
                const userTimeZone = timezone || "America/New_York";
                const now = new Date();
                const timeZoneAbbr = new Intl.DateTimeFormat('en-US', { 
                  timeZone: userTimeZone, 
                  timeZoneName: 'short' 
                }).formatToParts().find(part => part.type === 'timeZoneName')?.value || 'EST';
                return timeZoneAbbr;
              })()}
            </span>
          </div>
          <div 
            className="relative flex-1"
          >
            <div 
              className="relative"
              style={{ height: `${containerHeight}px`, paddingTop: '20px' }}
            >
              {timeLabels.map((timeLabel) => (
                <div
                  key={timeLabel.minutes}
                  className="absolute right-2 text-xs text-gray-500"
                  style={{ top: `${timeLabel.position + 20 - 12}px` }}
                >
                  {timeLabel.label}
                </div>
              ))}
              {/* Midnight line */}
              <div
                className="absolute left-0 right-0 border-b border-gray-100"
                style={{ top: `${TOTAL_MINUTES + 20}px` }}
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
              scrollSnapType: 'none',
              scrollSnapAlign: 'none',
              touchAction: 'pan-x' // Only allow horizontal pan, prevent any other touch behaviors
            }}
          >
            <div className="flex h-full" style={{ width: `${days.length * 200}px` }}>
              {days.map((day, index) => (
                <div 
                  key={day.toISOString()}
                  className="flex-shrink-0 flex flex-col border-r border-gray-200"
                  style={{ 
                    width: '200px',
                    minWidth: '200px',
                    maxWidth: '200px'
                  }}
                >
                  {/* Day Header */}
                  <div 
                    style={{ 
                      height: '20px', 
                      minHeight: '20px', 
                      maxHeight: '20px',
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

                      {/* Events for this day */}
                      {getEventsForDate(day).map((event) => {
                        if (event.isAllDay && !propShowAllDayEvents) return null;

                        const startMinutes = timeToMinutes(event.startTime);
                        const endMinutes = timeToMinutes(event.endTime);
                        const top = minutesToPosition(startMinutes);
                        const height = Math.max(30, endMinutes - startMinutes); // Minimum 30px height

                        return (
                          <div
                            key={event.id}
                            className="absolute left-1 right-1 bg-blue-500 text-white rounded px-2 py-1 text-xs overflow-hidden cursor-pointer hover:bg-blue-600 transition-colors"
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                            }}
                            onClick={() => onDateClick(day)}
                          >
                            <div className="font-medium truncate">{event.title}</div>
                            {height > 40 && (
                              <div className="text-xs opacity-90 truncate">
                                {formatTime(startMinutes)} - {formatTime(endMinutes)}
                              </div>
                            )}
                          </div>
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