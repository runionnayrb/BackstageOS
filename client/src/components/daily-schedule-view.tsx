import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatTimeDisplay, parseScheduleSettings } from '@/lib/timeUtils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Constants for time grid (8 AM to midnight = 16 hours)
const START_HOUR = 8;
const END_HOUR = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const START_MINUTES = START_HOUR * 60;
const END_MINUTES = END_HOUR * 60;
const TOTAL_MINUTES = END_MINUTES - START_MINUTES;

interface DailyScheduleViewProps {
  projectId: number;
  selectedDate: Date;
  onDateClick?: (date: Date) => void;
  currentDate?: Date;
  setCurrentDate?: (date: Date) => void;
  selectedContactIds: number[];
  showAllDayEvents: boolean;
  timeIncrement: number;
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

interface ProjectSettings {
  scheduleSettings?: string | {
    timeFormat?: string;
    workStartTime?: string;
    workEndTime?: string;
    timeZone?: string;
    weekStartDay?: string;
  };
}

export default function DailyScheduleView({ 
  projectId, 
  selectedDate, 
  onDateClick, 
  currentDate,
  setCurrentDate,
  selectedContactIds, 
  showAllDayEvents: propShowAllDayEvents, 
  timeIncrement 
}: DailyScheduleViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [internalDate, setInternalDate] = useState<Date>(selectedDate);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  // Use currentDate from parent if available, otherwise use internal state
  const displayDate = currentDate || internalDate;

  // Navigation functions
  const navigateToDate = useCallback((newDate: Date) => {
    if (setCurrentDate) {
      setCurrentDate(newDate);
    } else {
      setInternalDate(newDate);
    }
    if (onDateClick) {
      onDateClick(newDate);
    }
  }, [setCurrentDate, onDateClick]);

  const goToPreviousDay = useCallback(() => {
    const previousDay = new Date(displayDate);
    previousDay.setDate(displayDate.getDate() - 1);
    navigateToDate(previousDay);
  }, [displayDate, navigateToDate]);

  const goToNextDay = useCallback(() => {
    const nextDay = new Date(displayDate);
    nextDay.setDate(displayDate.getDate() + 1);
    navigateToDate(nextDay);
  }, [displayDate, navigateToDate]);

  // Touch event handlers for swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    // Only trigger swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swipe right - go to previous day
        goToPreviousDay();
      } else {
        // Swipe left - go to next day
        goToNextDay();
      }
    }

    setTouchStartX(null);
    setTouchStartY(null);
  }, [touchStartX, touchStartY, goToPreviousDay, goToNextDay]);

  // Time utilities
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const minutesToPosition = (minutes: number): number => {
    return Math.max(0, minutes - START_MINUTES);
  };

  // Fetch project settings
  const { data: projectSettings } = useQuery<ProjectSettings>({
    queryKey: ['/api/projects', projectId, 'settings'],
  });

  // Parse schedule settings with time format preference
  const scheduleSettings = parseScheduleSettings((projectSettings as any)?.scheduleSettings);
  const { timeFormat = '12', timezone } = scheduleSettings;

  // Fetch events
  const { data: events = [] } = useQuery<ScheduleEvent[]>({
    queryKey: ['/api/projects', projectId, 'schedule-events'],
  });

  // Filter events for the selected day
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    let filteredEvents = events.filter((event: ScheduleEvent) => event.date === dateStr);
    
    // Apply contact filter if contacts are selected
    if (selectedContactIds.length > 0) {
      filteredEvents = filteredEvents.filter(event => 
        event.participants.some(participant => 
          selectedContactIds.includes(participant.contactId)
        )
      );
    }
    
    return filteredEvents;
  };

  // Get timezone abbreviation
  const getTimezoneAbbr = () => {
    const userTimeZone = scheduleSettings?.timeZone || "America/New_York";
    const now = new Date();
    const timeZoneAbbr = new Intl.DateTimeFormat('en-US', { 
      timeZone: userTimeZone, 
      timeZoneName: 'short' 
    }).formatToParts().find(part => part.type === 'timeZoneName')?.value || 'EST';
    return timeZoneAbbr;
  };

  // Generate time labels - use same approach as mobile weekly view
  const timeLabels = useMemo(() => {
    const labels = [];
    for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += (timeIncrement || 30)) {
      const timeString = formatTime(minutes);
      const label = formatTimeDisplay(timeString, timeFormat);
      labels.push({
        minutes,
        label,
        position: minutesToPosition(minutes)
      });
    }
    return labels;
  }, [timeFormat, timeIncrement]);

  const containerHeight = TOTAL_MINUTES + 15; // Small padding to show 11:30 PM

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Sticky Header Row */}
      <div className="sticky top-[60px] z-10 flex bg-gray-50">
        {/* Timezone Header */}
        <div 
          className="w-16 bg-gray-100 border-r border-gray-200 flex-shrink-0"
          style={{ 
            height: '20px',
            minHeight: '20px', 
            maxHeight: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
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
            {getTimezoneAbbr()}
          </span>
        </div>
        
        {/* Day Header with Navigation */}
        <div 
          className="flex-1 bg-gray-100 relative"
          style={{ 
            height: '20px',
            minHeight: '20px', 
            maxHeight: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            margin: 0,
            padding: 0,
            boxSizing: 'border-box'
          }}
        >
          {/* Navigation buttons - hidden on small screens, visible on md+ */}
          <Button
            onClick={goToPreviousDay}
            size="sm"
            variant="ghost"
            className="absolute left-1 h-4 w-4 p-0 hidden md:flex"
            style={{ zIndex: 10 }}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          
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
              {displayDate.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}
            </span>
            {displayDate.toDateString() === new Date().toDateString() ? (
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
                  {displayDate.getDate()}
                </span>
              </div>
            ) : (
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
                {displayDate.getDate()}
              </span>
            )}
          </div>

          <Button
            onClick={goToNextDay}
            size="sm"
            variant="ghost"
            className="absolute right-1 h-4 w-4 p-0 hidden md:flex"
            style={{ zIndex: 10 }}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Time Labels - Fixed on left side */}
        <div className="w-16 bg-white border-r border-gray-200 flex-shrink-0">
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

        {/* Day Container */}
        <div className="flex-1 overflow-hidden">
          <div 
            className="h-full"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: 'pan-y', overscrollBehavior: 'none' }}
          >
            <div className="flex flex-col h-full">
              {/* Day Schedule Content */}
              <div 
                className="relative bg-white flex-1"
              >
                <div 
                  className="relative"
                  style={{ height: `${containerHeight}px`, paddingTop: '20px' }}
                >
                  {/* Time grid background */}
                  <div className="absolute inset-0">
                    {timeLabels.map((timeLabel) => (
                      <div
                        key={timeLabel.minutes}
                        className="absolute left-0 right-0 border-t border-gray-100"
                        style={{ top: `${timeLabel.position + 20}px` }}
                      />
                    ))}
                    {/* Midnight line */}
                    <div
                      className="absolute left-0 right-0 border-t border-gray-100"
                      style={{ top: `${TOTAL_MINUTES + 20}px` }}
                    />
                  </div>

                  {/* Events for this day */}
                  {getEventsForDate(displayDate).map((event) => {
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
                          top: `${top + 20}px`,
                          height: `${height}px`,
                        }}
                        onClick={() => onDateClick(selectedDate)}
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
          </div>
        </div>
      </div>
    </div>
  );
}