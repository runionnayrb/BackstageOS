import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatTimeDisplay, parseScheduleSettings, formatAsCalendarDate } from '@/lib/timeUtils';
import { filterEventsBySettings, getTimezoneAbbreviation, calculateEventLayouts } from '@/lib/scheduleUtils';
import { getEventTypeColor, getEventTypeColorFromDatabase, getEventTypeDisplayName, isLightColor, darkenColor } from '@/lib/eventUtils';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, ChevronDown, MapPin, Users, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ScheduleFilter from "@/components/schedule-filter";

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
  onFilterChange: (contactIds: number[]) => void;
  selectedEventTypes: string[];
  onEventTypeFilterChange: (eventTypes: string[]) => void;
  selectedIndividualTypes: string[];
  onIndividualTypeFilterChange: (individualTypes: string[]) => void;
  timeIncrement: 15 | 30 | 60;
  setTimeIncrement: (increment: 15 | 30 | 60) => void;
  showAllDayEvents?: boolean;
  setShowAllDayEvents?: (show: boolean) => void;
  createEventDialog: boolean;
  setCreateEventDialog: (open: boolean) => void;
  viewMode: 'monthly' | 'weekly' | 'daily';
  setViewMode: (mode: 'monthly' | 'weekly' | 'daily') => void;
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
  parentEventId?: number | null;
  isProductionLevel?: boolean;
  participants: {
    id: number;
    contactId: number;
    contactFirstName: string;
    contactLastName: string;
    isRequired: boolean;
    status: string;
  }[];
  childEvents?: ScheduleEvent[]; // For events with children
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
  onFilterChange,
  selectedEventTypes,
  onEventTypeFilterChange,
  selectedIndividualTypes,
  onIndividualTypeFilterChange,
  timeIncrement,
  setTimeIncrement,
  showAllDayEvents: propShowAllDayEvents = true, 
  setShowAllDayEvents,
  createEventDialog,
  setCreateEventDialog,
  viewMode,
  setViewMode,
  editingEvent,
  setEditingEvent
}: DailyScheduleViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  // Touch handling for swipe navigation
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartX || !touchStartY) return;

    const touchCurrentX = e.touches[0].clientX;
    const touchCurrentY = e.touches[0].clientY;
    const deltaX = touchStartX - touchCurrentX;
    const deltaY = touchStartY - touchCurrentY;

    // Only handle horizontal swipes (ignore vertical scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX || !touchStartY) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchStartX - touchEndX;
    const deltaY = touchStartY - touchEndY;

    // Only handle horizontal swipes that are more horizontal than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        // Swipe left - go to next day
        const nextDay = new Date(selectedDate);
        nextDay.setDate(selectedDate.getDate() + 1);
        if (setCurrentDate) {
          setCurrentDate(nextDay);
        } else if (onDateClick) {
          onDateClick(nextDay);
        }
      } else {
        // Swipe right - go to previous day
        const prevDay = new Date(selectedDate);
        prevDay.setDate(selectedDate.getDate() - 1);
        if (setCurrentDate) {
          setCurrentDate(prevDay);
        } else if (onDateClick) {
          onDateClick(prevDay);
        }
      }
    }

    setTouchStartX(null);
    setTouchStartY(null);
  };

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

  // Extract timezone and time format from settings using utility function
  const scheduleSettings = parseScheduleSettings(projectSettings?.scheduleSettings);
  const { timeFormat, timezone } = scheduleSettings;

  // Fetch events
  const { data: events = [] } = useQuery<ScheduleEvent[]>({
    queryKey: [`/api/projects/${projectId}/schedule-events`],
  });

  // Fetch event types for filtering
  const { data: eventTypes = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/event-types`],
    enabled: !!projectId,
  });

  // Fetch contacts for participant popover categorization
  const { data: contacts = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/contacts`],
    enabled: !!projectId,
  });

  // Filter events for the selected day
  const getEventsForDate = (date: Date) => {
    const dateStr = formatAsCalendarDate(date);
    let filteredEvents = events.filter((event: ScheduleEvent) => event.date === dateStr);
    
    // Apply event type filtering based on user selections
    // Always include important date events regardless of filtering
    // If no event types are selected at all, show only important dates
    if (selectedEventTypes.length === 0 && selectedIndividualTypes.length === 0) {
      filteredEvents = filteredEvents.filter(event => event.type === 'important_date');
    } else {
      filteredEvents = filteredEvents.filter(event => {
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
        const typeIdentifier = eventType ? (eventType.isDefault ? eventType.name : eventType.id) : event.type;
        const isSelectedInShowSchedule = selectedEventTypes.includes(typeIdentifier);
        
        if (isSelectedInShowSchedule) {
          return true;
        } else {
          // Check if it's selected in Individual Events
          const eventTypeName = eventType ? eventType.name : event.type;
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

  // Generate time labels - only for hours (matching weekly view)
  const timeLabels = useMemo(() => {
    const labels = [];
    for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += 60) {
      const position = minutesToPosition(minutes);
      const hours = Math.floor(minutes / 60);
      const timeString = `${hours.toString().padStart(2, '0')}:00`;
      labels.push({
        minutes,
        label: formatTimeDisplay(timeString, timeFormat as '12' | '24'),
        position
      });
    }
    return labels;
  }, [timeFormat]);

  // Generate increment lines (matching weekly view)
  const incrementLines = useMemo(() => {
    const lines = [];
    for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += timeIncrement) {
      const position = minutesToPosition(minutes);
      lines.push({
        minutes,
        position
      });
    }
    return lines;
  }, [timeIncrement]);

  const containerHeight = TOTAL_MINUTES; // Match weekly view exactly

  // Calculate layouts for overlapping events
  const eventLayouts = useMemo(() => {
    const dayEvents = getEventsForDate(selectedDate).filter(e => !e.isAllDay);
    return calculateEventLayouts(dayEvents);
  }, [events, selectedDate, selectedEventTypes, selectedIndividualTypes, selectedContactIds, eventTypes]);

  // Helper functions for navigation
  const goToPreviousDay = () => {
    const previousDay = new Date(selectedDate);
    previousDay.setDate(selectedDate.getDate() - 1);
    setCurrentDate?.(previousDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(selectedDate.getDate() + 1);
    setCurrentDate?.(nextDay);
  };

  const goToToday = () => {
    setCurrentDate?.(new Date());
  };

  // Format the selected date for display
  const formatDayDisplay = () => {
    return selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Removed individual header - using unified main page header */}
      {/* Main Content Container */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
        {/* Time Labels - Fixed on left side */}
        <div className="w-16 bg-white border-r border-gray-200 flex-shrink-0">
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
              style={{ minHeight: '60px' }}
            >
              All Day
            </div>
          )}
          <div 
            className="relative flex-1"
          >
            <div 
              className="relative"
              style={{ height: `${containerHeight}px` }}
            >
              {timeLabels.map((timeLabel) => (
                <div
                  key={timeLabel.minutes}
                  className="absolute right-2 text-xs text-gray-500"
                  style={{ top: `${timeLabel.position}px` }}
                >
                  {timeLabel.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Day Container */}
        <div 
          className="flex-1 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="h-full">
            <div className="flex flex-col h-full">
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
                  margin: 0,
                  padding: 0,
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span 
                    className="text-sm font-bold text-gray-600" 
                    style={{ 
                      lineHeight: '14px',
                      fontSize: '14px'
                    }}
                  >
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}
                  </span>
                  {selectedDate.toDateString() === new Date().toDateString() ? (
                    <div 
                      className="bg-red-500 rounded-full"
                      style={{
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <span 
                        className="text-xs font-bold text-white"
                        style={{ 
                          lineHeight: '12px',
                          fontSize: '12px'
                        }}
                      >
                        {selectedDate.getDate()}
                      </span>
                    </div>
                  ) : (
                    <span 
                      className="text-sm font-bold text-gray-900" 
                      style={{ 
                        lineHeight: '14px',
                        fontSize: '14px'
                      }}
                    >
                      {selectedDate.getDate()}
                    </span>
                  )}
                </div>
              </div>

              {/* All Day Events Section */}
              {propShowAllDayEvents && (
                <div className="bg-gray-50 border-b border-gray-200 min-h-[60px] p-1">
                  {getEventsForDate(selectedDate)
                    .filter(event => event.isAllDay)
                    .map((event) => {
                      const eventTypeColor = getEventTypeColorFromDatabase(event.type, eventTypes);
                      return (
                        <Popover 
                          key={event.id}
                          open={openPopoverId === `allday-${event.id}`}
                          onOpenChange={(open) => setOpenPopoverId(open ? `allday-${event.id}` : null)}
                        >
                          <PopoverTrigger asChild>
                            <div
                              className={`rounded px-2 py-1 text-sm mb-1 cursor-pointer hover:opacity-90 transition-opacity ${
                                isLightColor(eventTypeColor) ? 'text-gray-900' : 'text-white'
                              }`}
                              style={{ 
                                backgroundColor: eventTypeColor,
                                border: `1px solid ${darkenColor(eventTypeColor, 25)}`,
                              }}
                            >
                              <div className="font-medium truncate">{event.title}</div>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0" align="start">
                            <div className="p-4 space-y-3">
                              {/* Event Header */}
                              <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: eventTypeColor }}
                                  />
                                  <h3 className="font-medium text-sm">{event.title}</h3>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => {
                                    setEditingEvent(event);
                                    setOpenPopoverId(null);
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>

                              {/* Event Details */}
                              <div className="space-y-2">
                                {/* Time */}
                                <div className="flex items-center space-x-2 text-xs text-gray-600">
                                  <Clock className="h-3 w-3" />
                                  <span>All Day</span>
                                </div>

                                {/* Location */}
                                {event.location && (
                                  <div className="flex items-center space-x-2 text-xs text-gray-600">
                                    <MapPin className="h-3 w-3" />
                                    <span>{event.location}</span>
                                  </div>
                                )}

                                {/* Event Type */}
                                <div className="flex items-center space-x-2 text-xs text-gray-600">
                                  <Calendar className="h-3 w-3" />
                                  <span>{getEventTypeDisplayName(event.type)}</span>
                                </div>

                                {/* Participants */}
                                {event.participants && event.participants.length > 0 && (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <div className="flex items-center space-x-2 text-xs text-gray-600 cursor-pointer hover:text-gray-800 transition-colors">
                                        <Users className="h-3 w-3" />
                                        <span>{event.participants.length} {event.participants.length === 1 ? 'Person Called' : 'People Called'}</span>
                                      </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-0" align="start">
                                      <div className="p-4 space-y-3">
                                        <h4 className="font-medium text-sm">People Called</h4>
                                        <div className="space-y-3">
                                          {(() => {
                                            // Group participants by contact category
                                            const participantsByCategory = event.participants.reduce((acc, participant) => {
                                              // Find the contact details from the contacts array for category and role
                                              const contact = contacts.find(c => c.id === participant.contactId);
                                              const category = contact?.category || 'Other';
                                              
                                              if (!acc[category]) {
                                                acc[category] = [];
                                              }
                                              acc[category].push({
                                                ...participant,
                                                contactName: `${participant.contactFirstName} ${participant.contactLastName}`,
                                                contactRole: contact?.role
                                              });
                                              return acc;
                                            }, {} as Record<string, any[]>);

                                            // Sort categories in the same order as the filter
                                            const categoryOrder = ['cast', 'stage_management', 'crew', 'creative_team', 'theater_staff'];
                                            const sortedCategories = Object.keys(participantsByCategory).sort((a, b) => {
                                              const aIndex = categoryOrder.indexOf(a);
                                              const bIndex = categoryOrder.indexOf(b);
                                              if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                                              if (aIndex === -1) return 1;
                                              if (bIndex === -1) return -1;
                                              return aIndex - bIndex;
                                            });

                                            return sortedCategories.map(category => (
                                              <div key={category} className="space-y-1">
                                                <div className="text-xs font-medium text-gray-800 capitalize border-b border-gray-200 pb-1">
                                                  {category.replace('_', ' ')}
                                                </div>
                                                {participantsByCategory[category].map(participant => (
                                                  <div key={participant.id} className="text-xs text-gray-900 ml-1 py-0.5">
                                                    <span className="font-medium">
                                                      {participant.contactName || 'No name'}
                                                    </span>
                                                    {participant.contactRole && (
                                                      <span className="text-gray-600 font-normal"> ({participant.contactRole})</span>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            ));
                                          })()}
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}

                                {/* Description */}
                                {event.description && (
                                  <div className="text-xs text-gray-700 pt-1">
                                    <p>{event.description}</p>
                                  </div>
                                )}

                                {/* Notes */}
                                {event.notes && (
                                  <div className="text-xs text-gray-700 pt-1">
                                    <p className="font-medium">Notes:</p>
                                    <p>{event.notes}</p>
                                  </div>
                                )}
                              </div>
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
                    {incrementLines.map((line) => (
                      <div
                        key={`increment-${line.minutes}`}
                        className="absolute left-0 right-0 border-t border-gray-100"
                        style={{ top: `${line.position}px` }}
                      />
                    ))}
                  </div>

                  {/* Events for this day - only non-all-day events */}
                  {getEventsForDate(selectedDate)
                    .filter(event => !event.isAllDay)
                    .map((event) => {
                      const startMinutes = timeToMinutes(event.startTime);
                      const endMinutes = timeToMinutes(event.endTime);
                      const top = minutesToPosition(startMinutes);
                      const actualHeight = endMinutes - startMinutes;
                      const height = Math.max(20, actualHeight); // Minimum 20px height
                      const eventTypeColor = getEventTypeColorFromDatabase(event.type, eventTypes);
                      const isShortEvent = actualHeight <= 15;
                      const isVeryShortEvent = actualHeight <= 10;

                      // Get layout for overlapping events
                      const layout = eventLayouts.get(event.id);
                      const hasOverlap = layout && layout.totalColumns > 1;
                      
                      // Calculate width and left position based on overlap layout
                      let eventLeft: string;
                      let eventWidth: string;
                      
                      if (hasOverlap && layout) {
                        // Overlapping event: position within its column
                        const columnWidthPercent = layout.width;
                        const columnLeftPercent = layout.left;
                        eventLeft = `calc(${columnLeftPercent}% + 2px)`;
                        eventWidth = `calc(${columnWidthPercent}% - 4px)`;
                      } else {
                        // Non-overlapping event: use full width with small margins
                        eventLeft = '4px';
                        eventWidth = 'calc(100% - 8px)';
                      }

                      return (
                        <Popover 
                          key={event.id}
                          open={openPopoverId === `timed-${event.id}`}
                          onOpenChange={(open) => setOpenPopoverId(open ? `timed-${event.id}` : null)}
                        >
                          <PopoverTrigger asChild>
                            <div
                              className={`absolute rounded text-sm overflow-hidden cursor-pointer hover:opacity-90 transition-all ${
                                isLightColor(eventTypeColor) ? 'text-gray-900' : 'text-white'
                              }`}
                              style={{
                                top: `${top}px`,
                                height: `${height}px`,
                                left: eventLeft,
                                width: eventWidth,
                                backgroundColor: eventTypeColor,
                                border: `1px solid ${darkenColor(eventTypeColor, 25)}`,
                                padding: isVeryShortEvent ? '2px 4px' : '8px',
                              }}
                            >
                              <div className="font-medium truncate">{event.title}</div>
                              {!isShortEvent && (
                                <div className="text-xs opacity-90 truncate">
                                  {formatTimeDisplay(formatTime(startMinutes), timeFormat)} - {formatTimeDisplay(formatTime(endMinutes), timeFormat)}
                                </div>
                              )}
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0" align="start">
                            <div className="p-4 space-y-3">
                              {/* Event Header */}
                              <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: eventTypeColor }}
                                  />
                                  <h3 className="font-medium text-sm">{event.title}</h3>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => {
                                    setEditingEvent(event);
                                    setOpenPopoverId(null);
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </div>

                              {/* Event Details */}
                              <div className="space-y-2">
                                {/* Time */}
                                <div className="flex items-center space-x-2 text-xs text-gray-600">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    {event.isAllDay 
                                      ? 'All Day' 
                                      : `${formatTimeDisplay(formatTime(startMinutes), timeFormat).replace(':00', '')} - ${formatTimeDisplay(formatTime(endMinutes), timeFormat).replace(':00', '')}`
                                    }
                                  </span>
                                </div>

                                {/* Location */}
                                {event.location && (
                                  <div className="flex items-center space-x-2 text-xs text-gray-600">
                                    <MapPin className="h-3 w-3" />
                                    <span>{event.location}</span>
                                  </div>
                                )}

                                {/* Event Type */}
                                <div className="flex items-center space-x-2 text-xs text-gray-600">
                                  <Calendar className="h-3 w-3" />
                                  <span>{getEventTypeDisplayName(event.type)}</span>
                                </div>

                                {/* Participants */}
                                {event.participants && event.participants.length > 0 && (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <div className="flex items-center space-x-2 text-xs text-gray-600 cursor-pointer hover:text-gray-800 transition-colors">
                                        <Users className="h-3 w-3" />
                                        <span>{event.participants.length} {event.participants.length === 1 ? 'Person Called' : 'People Called'}</span>
                                      </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-0" align="start">
                                      <div className="p-4 space-y-3">
                                        <h4 className="font-medium text-sm">People Called</h4>
                                        <div className="space-y-3">
                                          {(() => {
                                            // Group participants by contact category
                                            const participantsByCategory = event.participants.reduce((acc, participant) => {
                                              // Find the contact details from the contacts array for category and role
                                              const contact = contacts.find(c => c.id === participant.contactId);
                                              const category = contact?.category || 'Other';
                                              
                                              if (!acc[category]) {
                                                acc[category] = [];
                                              }
                                              acc[category].push({
                                                ...participant,
                                                contactName: `${participant.contactFirstName} ${participant.contactLastName}`,
                                                contactRole: contact?.role
                                              });
                                              return acc;
                                            }, {} as Record<string, any[]>);

                                            // Sort categories in the same order as the filter
                                            const categoryOrder = ['cast', 'stage_management', 'crew', 'creative_team', 'theater_staff'];
                                            const sortedCategories = Object.keys(participantsByCategory).sort((a, b) => {
                                              const aIndex = categoryOrder.indexOf(a);
                                              const bIndex = categoryOrder.indexOf(b);
                                              if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                                              if (aIndex === -1) return 1;
                                              if (bIndex === -1) return -1;
                                              return aIndex - bIndex;
                                            });

                                            return sortedCategories.map(category => (
                                              <div key={category} className="space-y-1">
                                                <div className="text-xs font-medium text-gray-800 capitalize border-b border-gray-200 pb-1">
                                                  {category.replace('_', ' ')}
                                                </div>
                                                {participantsByCategory[category].map(participant => (
                                                  <div key={participant.id} className="text-xs text-gray-900 ml-1 py-0.5">
                                                    <span className="font-medium">
                                                      {participant.contactName || 'No name'}
                                                    </span>
                                                    {participant.contactRole && (
                                                      <span className="text-gray-600 font-normal"> ({participant.contactRole})</span>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            ));
                                          })()}
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}

                                {/* Description */}
                                {event.description && (
                                  <div className="text-xs text-gray-700 pt-1">
                                    <p>{event.description}</p>
                                  </div>
                                )}

                                {/* Notes */}
                                {event.notes && (
                                  <div className="text-xs text-gray-700 pt-1">
                                    <p className="font-medium">Notes:</p>
                                    <p>{event.notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}