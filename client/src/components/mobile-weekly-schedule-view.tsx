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

  // Handle scroll to update current week context
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const dayWidth = container.clientWidth / 2; // 2 days visible
    const currentDayIndex = Math.round(scrollLeft / dayWidth);
    
    if (currentDayIndex >= 0 && currentDayIndex < days.length && setCurrentDate) {
      const newCurrentDate = days[currentDayIndex];
      setCurrentDate(newCurrentDate);
    }
  }, [days, setCurrentDate]);

  // Debounced scroll handler
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;
    const debouncedHandleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 150);
    };

    container.addEventListener('scroll', debouncedHandleScroll);
    return () => {
      container.removeEventListener('scroll', debouncedHandleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [handleScroll]);

  // Scroll to current date on mount
  useEffect(() => {
    if (!scrollContainerRef.current || !currentDate) return;
    
    const currentDateIndex = days.findIndex(day => 
      day.toDateString() === currentDate.toDateString()
    );
    
    if (currentDateIndex >= 0) {
      const dayWidth = scrollContainerRef.current.clientWidth / 2;
      const scrollPosition = currentDateIndex * dayWidth;
      scrollContainerRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  }, [days, currentDate]);

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
    <div className="flex h-full bg-gray-50">
      {/* Time Column */}
      <div className="w-16 bg-gray-100 border-r border-gray-200 flex-shrink-0">
        <div className="h-8 bg-gray-200 border-b border-gray-300 flex items-center justify-center text-xs font-medium text-gray-600">
          Time
        </div>
        <div className="relative" style={{ height: `${containerHeight}px` }}>
          {timeLabels.map((timeLabel) => (
            <div
              key={timeLabel.minutes}
              className="absolute left-0 right-0 flex items-center justify-center text-xs text-gray-500"
              style={{ 
                top: `${timeLabel.position}px`,
                height: `${timeIncrement}px`,
                transform: 'translateY(-50%)'
              }}
            >
              {timeLabel.label}
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable Days Container */}
      <div className="flex-1 overflow-hidden">
        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto snap-x snap-mandatory scrollbar-hide h-full"
        >
          <div className="flex h-full">
            {days.map((day, index) => (
              <div 
                key={day.toISOString()}
                className={`flex-shrink-0 w-1/2 snap-start flex flex-col ${index < days.length - 1 ? 'border-r border-gray-200' : ''}`}
              >
                {/* Day Header */}
                <div 
                  className="h-8 bg-gray-200 border-b border-gray-300 flex items-center justify-center text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-300 transition-colors"
                  onClick={() => onDateClick(day)}
                >
                  <div className="flex items-center gap-1">
                    <span>
                      {day.toLocaleDateString('en-US', { 
                        weekday: 'short',
                        month: 'numeric',
                        day: 'numeric'
                      })}
                    </span>
                    {currentDate && day.toDateString() === currentDate.toDateString() && (
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
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
  );
}