import { useState, useRef, useCallback, useEffect } from "react";
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
import { formatTimeDisplay, formatTimeFromMinutes, parseScheduleSettings } from "@/lib/timeUtils";
import { isShowEvent, getEventTypeDisplayName, getEventTypeColor, ALL_EVENT_TYPES } from "@/lib/eventUtils";
import LocationSelect from "@/components/location-select";

interface WeeklyScheduleViewProps {
  projectId: number;
  onDateClick: (date: Date) => void;
  currentDate?: Date;
  setCurrentDate?: (date: Date) => void;
  selectedContactIds: number[];
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

const START_HOUR = 8; // 8 AM
const END_HOUR = 24; // Midnight
const START_MINUTES = START_HOUR * 60;
const END_MINUTES = END_HOUR * 60;
const TOTAL_MINUTES = END_MINUTES - START_MINUTES;

// Event type colors - consistent single color for all events
const getEventColor = (type: string) => {
  return 'bg-blue-500'; // Single consistent color for all events
};

export default function WeeklyScheduleView({ projectId, onDateClick, selectedContactIds }: WeeklyScheduleViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [timeIncrement, setTimeIncrement] = useState<15 | 30 | 60>(30);
  const [isDragCreating, setIsDragCreating] = useState<{
    isActive: boolean;
    startDay: number;
    startTime: number;
    currentDay: number;
    currentTime: number;
  } | null>(null);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [createEventDialog, setCreateEventDialog] = useState<{
    isOpen: boolean;
    date?: string;
    startTime?: string;
    endTime?: string;
  }>({ isOpen: false });
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showAllDayEvents, setShowAllDayEvents] = useState(true);
  const [dragState, setDragState] = useState<{
    isActive: boolean;
    startDay: number;
    startTime: number;
    currentDay: number;
    currentTime: number;
  } | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<{
    event: ScheduleEvent;
    originalPosition: { dayIndex: number; startMinutes: number };
    currentPosition: { dayIndex: number; startMinutes: number };
    offset: { x: number; y: number };
    isDragging: boolean;
  } | null>(null);
  const [resizingEvent, setResizingEvent] = useState<{
    event: ScheduleEvent;
    edge: 'start' | 'end';
    originalStartMinutes: number;
    originalEndMinutes: number;
  } | null>(null);
  const [justDragged, setJustDragged] = useState<number | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Get show settings for timezone and work hours
  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Parse schedule settings with time format preference
  const scheduleSettings = parseScheduleSettings((showSettings as any)?.scheduleSettings);
  const { timeFormat, timezone, weekStartDay, workStartTime, workEndTime } = scheduleSettings;

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
    ? events.filter(event => isShowEvent(event.type)) // Show only show-wide events when no filter is applied (show schedule)
    : events.filter(event => 
        event.participants.some(participant => 
          selectedContactIds.includes(participant.contactId)
        )
      );

  // Calculate week dates based on settings
  const getWeekDates = useCallback((weekStart: Date) => {
    const startDayOffset = weekStartDay === 'monday' ? 1 : 0;
    const currentDay = weekStart.getDay();
    const startDate = new Date(weekStart);
    const diff = (currentDay - startDayOffset + 7) % 7;
    startDate.setDate(startDate.getDate() - diff);
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [weekStartDay]);

  const weekDates = getWeekDates(currentWeek);

  // Navigation functions
  const goToPreviousWeek = () => {
    const prevWeek = new Date(currentWeek);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setCurrentWeek(prevWeek);
  };

  const goToNextWeek = () => {
    const nextWeek = new Date(currentWeek);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeek(nextWeek);
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  // Time formatting functions
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const timeToMinutes = (timeString: string) => {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToPosition = (minutes: number) => {
    const relativeMinutes = Math.max(0, Math.min(minutes - START_MINUTES, TOTAL_MINUTES));
    return (relativeMinutes / TOTAL_MINUTES) * 960; // 960px = 16 hours
  };

  const positionToMinutes = (position: number) => {
    const relativeMinutes = (position / 960) * TOTAL_MINUTES;
    return Math.min(START_MINUTES + relativeMinutes, END_MINUTES - 1);
  };

  const snapToIncrement = (minutes: number) => {
    return Math.round(minutes / timeIncrement) * timeIncrement;
  };

  // Format week range display
  const formatWeekRange = (dates: Date[]) => {
    const start = dates[0];
    const end = dates[6];
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    const startDay = start.getDate();
    const endDay = end.getDate();
    const year = end.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}, ${year}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }
  };

  // Mutations for event operations
  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await fetch(`/api/projects/${projectId}/schedule-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });
      if (!response.ok) throw new Error("Failed to create event");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule-events`] });
      setCreateEventDialog({ isOpen: false });
      toast({ title: "Event created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to create event", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ eventId, eventData }: { eventId: number; eventData: any }) => {
      const response = await fetch(`/api/schedule-events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });
      if (!response.ok) throw new Error("Failed to update event");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule-events`] });
      setEditingEvent(null);
      toast({ title: "Event updated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to update event", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const response = await fetch(`/api/schedule-events/${eventId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete event");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule-events`] });
      setEditingEvent(null);
      toast({ title: "Event deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to delete event", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const bulkDeleteEventsMutation = useMutation({
    mutationFn: async (eventIds: number[]) => {
      await Promise.all(eventIds.map(id =>
        fetch(`/api/schedule-events/${id}`, {
          method: "DELETE",
        }).then(response => {
          if (!response.ok) throw new Error(`Failed to delete event ${id}`);
        })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule-events`] });
      setSelectedEvents(new Set());
      setShowBulkDeleteDialog(false);
      toast({ title: "Selected events deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to delete events", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Auto-scroll to work hours on mount
  useEffect(() => {
    const workStartMinutes = timeToMinutes(workStartTime);
    const scrollTop = minutesToPosition(workStartMinutes) - 100; // 100px offset
    setScrollPosition(Math.max(0, scrollTop));
  }, [workStartTime]);

  // Handle keyboard events for multi-select and bulk delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEvents.size > 0) {
        e.preventDefault();
        setShowBulkDeleteDialog(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedEvents]);

  // Handle bulk delete
  const handleBulkDelete = () => {
    const selectedIds = Array.from(selectedEvents);
    bulkDeleteEventsMutation.mutate(selectedIds);
  };



  // Helper function for drag-to-create
  const formatTimeFromMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Mouse handlers for drag-to-create (matching weekly availability pattern)
  const handleMouseDown = useCallback((e: React.MouseEvent, dayIndex: number) => {
    if (!calendarRef.current) return;

    const rect = calendarRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top; // Don't add scroll - calendarRef moves with scroll
    const minutes = snapToIncrement(positionToMinutes(y));
    
    console.log('Mouse click:', { y, minutes, time: formatTimeFromMinutes(minutes, timeFormat), dayIndex });

    // Check if clicking on existing event
    const clickedEvent = filteredEvents.find(event => {
      const eventDay = weekDates.findIndex((date: Date) => date.toISOString().split('T')[0] === event.date);
      const eventStart = timeToMinutes(event.startTime);
      const eventEnd = timeToMinutes(event.endTime);
      return eventDay === dayIndex && minutes >= eventStart && minutes <= eventEnd && !event.isAllDay;
    });

    if (clickedEvent) {
      // Edit existing event
      setEditingEvent(clickedEvent);
      return;
    }

    // Start drag creation
    let dragState = {
      isActive: true,
      startDay: dayIndex,
      startTime: minutes,
      currentDay: dayIndex,
      currentTime: minutes,
    };

    setDragState(dragState);

    const handleMouseMove = (e: MouseEvent) => {
      if (!calendarRef.current) return;

      const rect = calendarRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const newMinutes = snapToIncrement(positionToMinutes(y));

      dragState = { ...dragState, currentTime: newMinutes };
      setDragState(dragState);
    };

    const handleMouseUp = () => {
      if (dragState.isActive) {
        const startTime = Math.min(dragState.startTime, dragState.currentTime);
        const endTime = Math.max(dragState.startTime, dragState.currentTime);
        
        console.log('Creating event:', {
          date: weekDates[dragState.startDay].toISOString().split('T')[0],
          startTime: formatTimeFromMinutes(startTime, timeFormat),
          endTime: formatTimeFromMinutes(endTime, timeFormat),
          duration: endTime - startTime,
          dayIndex: dragState.startDay,
        });
        
        if (endTime - startTime >= timeIncrement) {
          const date = weekDates[dragState.startDay].toISOString().split('T')[0];
          setCreateEventDialog({
            isOpen: true,
            date,
            startTime: formatTimeFromMinutes(startTime, timeFormat),
            endTime: formatTimeFromMinutes(endTime, timeFormat),
          });
        } else {
          console.log('Block too small:', endTime - startTime, 'minutes');
        }
      }
      
      setDragState(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [filteredEvents, weekDates, timeIncrement, timeFormat]);

  // Handle dragging existing events and multi-select
  const handleEventMouseDown = useCallback((e: React.MouseEvent, event: ScheduleEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Handle Shift+click for multi-selection
    if (e.shiftKey) {
      if (selectedEvents.has(event.id)) {
        const newSelected = new Set(selectedEvents);
        newSelected.delete(event.id);
        setSelectedEvents(newSelected);
      } else {
        const newSelected = new Set(selectedEvents);
        newSelected.add(event.id);
        setSelectedEvents(newSelected);
      }
      return;
    }
    
    if (!calendarRef.current || !scrollContainerRef.current) return;
    
    const calendarRect = calendarRef.current.getBoundingClientRect();
    const scrollContainer = scrollContainerRef.current;
    const eventDate = event.date;
    const dayIndex = weekDates.findIndex((date: Date) => date.toISOString().split('T')[0] === eventDate);
    const startMinutes = timeToMinutes(event.startTime);
    
    // Calculate drag offset in time units (minutes)
    const scrollTop = scrollContainer.scrollTop;
    const mouseY = e.clientY - calendarRect.top;
    const absoluteMouseTime = mouseY + scrollTop;
    const offsetY = absoluteMouseTime - startMinutes;
    
    let currentDragState = {
      event,
      originalPosition: { dayIndex, startMinutes },
      currentPosition: { dayIndex, startMinutes },
      offset: { x: 0, y: offsetY },
      isDragging: true
    };
    
    setDraggedEvent(currentDragState);
    setJustDragged(event.id);
    
    // Clear the flag after a short delay
    setTimeout(() => setJustDragged(null), 200);
  }, [weekDates, timeToMinutes, selectedEvents]);

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, event: ScheduleEvent, edge: 'start' | 'end') => {
    e.preventDefault();
    e.stopPropagation();
    
    const startMinutes = timeToMinutes(event.startTime);
    const endMinutes = timeToMinutes(event.endTime);
    
    setResizingEvent({
      event,
      edge,
      originalStartMinutes: startMinutes,
      originalEndMinutes: endMinutes,
    });
  }, [timeToMinutes]);





  return (
    <>
      <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold w-80 text-center">{formatWeekRange(weekDates)}</h3>
          <Button variant="outline" size="sm" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={timeIncrement.toString()} onValueChange={(value) => setTimeIncrement(parseInt(value) as 15 | 30 | 60)}>
            <SelectTrigger className="w-24 border-0 shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 min</SelectItem>
              <SelectItem value="30">30 min</SelectItem>
              <SelectItem value="60">60 min</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant={showAllDayEvents ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAllDayEvents(!showAllDayEvents)}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            All Day
          </Button>
          
          <Button 
            onClick={() => setCreateEventDialog({ isOpen: true })}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        </div>
      </div>

      {/* Multi-select status and controls */}
      {(isShiftPressed || selectedEvents.size > 0) && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-4">
            {isShiftPressed && (
              <div className="text-sm text-blue-700 font-medium">
                Multi-select mode - Click events to select/deselect
              </div>
            )}
            {selectedEvents.size > 0 && (
              <div className="text-sm text-blue-700">
                {selectedEvents.size} selected - Press Delete to remove
              </div>
            )}
          </div>
          {selectedEvents.size > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedEvents(new Set())}
            >
              Clear Selection
            </Button>
          )}
        </div>
      )}

      {/* Calendar grid */}
      <div className="border rounded-lg bg-white overflow-hidden">
        {/* Header with day names */}
        <div className="flex border-b bg-gray-50">
          <div className="p-3 text-sm font-medium text-gray-600 border-r" style={{ width: '80px' }}>Time</div>
          <div className="flex-1 grid grid-cols-7">
            {weekDates.map((date, index) => (
              <div 
                key={index} 
                className="p-3 text-center border-r last:border-r-0 cursor-pointer hover:bg-gray-100"
                onClick={() => onDateClick(date)}
              >
                <div className="text-sm font-medium text-gray-900">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-lg font-semibold text-gray-700">
                  {date.getDate()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All-day events section - conditionally rendered */}
        {showAllDayEvents && (
          <div className="flex border-b bg-gray-25">
            <div className="p-2 text-xs font-medium text-gray-600 border-r bg-gray-50" style={{ width: '80px' }}>All Day</div>
            <div className="flex-1 grid grid-cols-7">
              {weekDates.map((date, dayIndex) => {
                const dateStr = date.toISOString().split('T')[0];
                const allDayEvents = filteredEvents?.filter(event => 
                  event.date === dateStr && event.isAllDay
                ) || [];
                
                return (
                  <div key={dayIndex} className="p-1 border-r last:border-r-0 min-h-[40px]">
                    {allDayEvents.map(event => (
                      <div
                        key={event.id}
                        className={`
                          text-xs p-1 mb-1 rounded text-white cursor-pointer
                          ${getEventColor(event.type)}
                        `}
                        onClick={() => setEditingEvent(event)}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Time grid */}
        <div 
          ref={scrollContainerRef}
          className="relative overflow-y-auto"
          style={{ height: '600px' }}
          onScroll={(e) => setScrollPosition(e.currentTarget.scrollTop)}
        >
          <div 
            ref={calendarRef}
            className="relative bg-white" 
            style={{ height: '960px' }}
          >
            {/* Hour labels and major grid lines */}
            {Array.from({ length: 17 }, (_, i) => {
              const hour = START_HOUR + i;
              const position = (i / 16) * 960;
              const timeString = `${hour.toString().padStart(2, '0')}:00`;
              const formattedTime = formatTimeDisplay(timeString, timeFormat);
              return (
                <div
                  key={`hour-${hour}`}
                  className="absolute left-0 right-0 border-b border-gray-200"
                  style={{ top: `${position}px` }}
                >
                  <div className="absolute left-0 p-2 text-xs text-gray-500 bg-white border-r time-label" style={{ width: '80px' }}>
                    {formattedTime}
                  </div>
                </div>
              );
            })}

            {/* Time increment grid lines */}
            {(() => {
              const timeLabels = [];
              for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += timeIncrement) {
                timeLabels.push({
                  minutes,
                  position: (minutes - START_MINUTES) / TOTAL_MINUTES * 960,
                });
              }
              
              return timeLabels.map((timeLabel) => (
                <div
                  key={timeLabel.minutes}
                  className="absolute left-0 right-0 border-b border-gray-300 z-10 pointer-events-none"
                  style={{ top: `${timeLabel.position}px` }}
                />
              ));
            })()}



            {/* Bottom border for grid completion */}
            <div
              className="absolute left-0 right-0 border-b border-gray-200"
              style={{ top: '960px' }}
            />

            {/* Day columns */}
            {weekDates.map((date, dayIndex) => {
              // Calculate column width: (container width - 80px time column) / 7 days
              // Use calc() to ensure exact alignment with header
              const leftPosition = `calc(80px + (100% - 80px) * ${dayIndex} / 7)`;
              const columnWidth = `calc((100% - 80px) / 7)`;
              
              return (
                <div
                  key={dayIndex}
                  className="absolute border-r border-gray-200 bg-white cursor-crosshair"
                  style={{
                    left: leftPosition,
                    width: columnWidth,
                    height: '960px',
                  }}
                  onMouseDown={(e) => handleMouseDown(e, dayIndex)}
              >
                {/* Events for this day - only timed events, not all-day */}
                {filteredEvents
                  .filter(event => event.date === date.toISOString().split('T')[0] && !event.isAllDay)
                  .map((event) => {

                    const startMinutes = timeToMinutes(event.startTime);
                    const endMinutes = timeToMinutes(event.endTime);
                    const startPos = minutesToPosition(startMinutes);
                    const duration = endMinutes - startMinutes;
                    const height = (duration / TOTAL_MINUTES) * 960;

                    const eventTypeColors = {
                      rehearsal: 'bg-blue-100 border-blue-300 text-blue-800',
                      performance: 'bg-blue-100 border-blue-300 text-blue-800',
                      tech: 'bg-blue-100 border-blue-300 text-blue-800',
                      meeting: 'bg-blue-100 border-blue-300 text-blue-800',
                      other: 'bg-blue-100 border-blue-300 text-blue-800',
                    };

                    // Check if this event is being dragged or resized
                    const isDragging = draggedEvent?.event.id === event.id;
                    const isResizing = resizingEvent?.event.id === event.id;
                    const isJustDragged = justDragged === event.id;
                    
                    // Calculate position for dragged events
                    let displayPosition = { top: startPos, height: Math.max(height, 30) };
                    if (isDragging && draggedEvent) {
                      const dragStartPos = minutesToPosition(draggedEvent.currentPosition.startMinutes);
                      displayPosition = { top: dragStartPos, height: Math.max(height, 30) };
                    } else if (isResizing && resizingEvent) {
                      const resizeStartPos = minutesToPosition(resizingEvent.originalStartMinutes);
                      const resizeHeight = (resizingEvent.originalEndMinutes - resizingEvent.originalStartMinutes) / TOTAL_MINUTES * 960;
                      displayPosition = { top: resizeStartPos, height: Math.max(resizeHeight, 30) };
                    }

                    return (
                      <div
                        key={event.id}
                        data-event-id={event.id}
                        className={`absolute left-1 right-1 border rounded cursor-pointer hover:opacity-80 transition-opacity ${
                          eventTypeColors[event.type as keyof typeof eventTypeColors] || eventTypeColors.other
                        } ${isDragging ? 'opacity-75 z-50' : ''} ${isResizing ? 'z-50' : ''} ${
                          selectedEvents.has(event.id) ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''
                        } ${isShiftPressed ? 'cursor-pointer' : 'cursor-move'}`}
                        style={{
                          top: `${displayPosition.top}px`,
                          height: `${displayPosition.height}px`,
                        }}
                        onMouseDown={(e) => handleEventMouseDown(e, event)}
                        onClick={(e) => {
                          if (!isJustDragged) {
                            setEditingEvent(event);
                          }
                        }}
                      >
                        {/* Resize handle - top */}
                        <div
                          className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-black hover:bg-opacity-20 transition-colors"
                          onMouseDown={(e) => handleResizeStart(e, event, 'start')}
                          style={{ height: '4px', marginTop: '-2px' }}
                        />
                        
                        {/* Event content */}
                        <div className="px-2 py-1 h-full overflow-hidden">
                          <div className="text-xs font-medium truncate">
                            {event.title}
                          </div>
                          <div className="text-xs opacity-75 truncate">
                            {event.startTime} - {event.endTime}
                          </div>
                          {event.participants.length > 0 && (
                            <div className="text-xs opacity-75 flex items-center gap-1 mt-1">
                              <Users className="h-3 w-3" />
                              {event.participants.length}
                            </div>
                          )}
                        </div>
                        
                        {/* Resize handle - bottom */}
                        <div
                          className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-black hover:bg-opacity-20 transition-colors"
                          onMouseDown={(e) => handleResizeStart(e, event, 'end')}
                          style={{ height: '4px', marginBottom: '-2px' }}
                        />
                      </div>
                    );
                  })}
              </div>
            );
          })}

            {/* Drag preview overlay for new events */}
            {dragState?.isActive && (
              <div
                className="absolute bg-blue-200 border-2 border-blue-400 rounded opacity-60 pointer-events-none"
                style={{
                  left: `${64 + (dragState.startDay * ((100 - 4) / 7))}%`,
                  width: `${(100 - 4) / 7}%`,
                  top: `${minutesToPosition(Math.min(dragState.startTime, dragState.currentTime))}px`,
                  height: `${Math.abs(minutesToPosition(dragState.currentTime) - minutesToPosition(dragState.startTime))}px`,
                }}
              >
                <div className="p-1 text-xs text-blue-800 font-medium">
                  New Event
                </div>
              </div>
            )}

            {/* Drag preview overlay for moved events */}
            {draggedEvent?.isDragging && (
              <div
                className="absolute bg-yellow-200 border-2 border-yellow-400 rounded opacity-60 pointer-events-none"
                style={{
                  left: `${64 + (draggedEvent.currentPosition.dayIndex * ((100 - 4) / 7))}%`,
                  width: `${(100 - 4) / 7}%`,
                  top: `${minutesToPosition(draggedEvent.currentPosition.startMinutes)}px`,
                  height: `${(timeToMinutes(draggedEvent.event.endTime) - timeToMinutes(draggedEvent.event.startTime)) / TOTAL_MINUTES * 960}px`,
                }}
              >
                <div className="p-1 text-xs text-yellow-800 font-medium">
                  {draggedEvent.event.title}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Create Event Dialog */}
    <Dialog open={createEventDialog.isOpen} onOpenChange={(open) => setCreateEventDialog({ isOpen: open })}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>
        <CreateEventForm
          projectId={projectId}
          contacts={contacts}
          onSubmit={(eventData) => createEventMutation.mutate(eventData)}
          onCancel={() => setCreateEventDialog({ isOpen: false })}
          initialData={createEventDialog}
        />
      </DialogContent>
    </Dialog>

      {/* Edit Event Dialog */}
      {editingEvent && (
        <Dialog open={true} onOpenChange={() => setEditingEvent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
            </DialogHeader>
            <EditEventForm
              event={editingEvent}
              contacts={contacts}
              onSubmit={(eventData) => updateEventMutation.mutate({ eventId: editingEvent.id, eventData })}
              onDelete={() => deleteEventMutation.mutate(editingEvent.id)}
              onCancel={() => setEditingEvent(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {showBulkDeleteDialog && (
        <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Selected Events</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete {selectedEvents.size} selected event{selectedEvents.size !== 1 ? 's' : ''}? This action cannot be undone.
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowBulkDeleteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={bulkDeleteEventsMutation.isPending}
              >
                {bulkDeleteEventsMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// Create Event Form Component
function CreateEventForm({ 
  projectId, 
  contacts, 
  onSubmit, 
  onCancel, 
  initialData 
}: { 
  projectId: number;
  contacts: Contact[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    startTime: initialData?.startTime || '10:00',
    endTime: initialData?.endTime || '12:00',
    type: 'rehearsal',
    location: '',
    notes: '',
    isAllDay: false,
    participants: [] as number[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Clean up the form data before submission
    const cleanedData = {
      ...formData,
      location: formData.location?.trim() || undefined,
      description: formData.description?.trim() || undefined,
      notes: formData.notes?.trim() || undefined,
      participants: formData.participants,
    };
    onSubmit(cleanedData);
  };

  const toggleParticipant = (contactId: number) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.includes(contactId)
        ? prev.participants.filter(id => id !== contactId)
        : [...prev.participants, contactId]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Event Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="type">Event Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rehearsal">Rehearsal</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="tech">Tech</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
            disabled={formData.isAllDay}
            required={!formData.isAllDay}
          />
        </div>
        
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
            disabled={formData.isAllDay}
            required={!formData.isAllDay}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isAllDay"
          checked={formData.isAllDay}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAllDay: !!checked }))}
        />
        <Label htmlFor="isAllDay">All Day Event</Label>
      </div>

      <LocationSelect
        projectId={projectId}
        value={formData.location}
        onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
        eventDate={formData.date}
        startTime={formData.startTime}
        endTime={formData.endTime}
      />

      {/* Contact Assignment */}
      <div>
        <Label>Assign Contacts</Label>
        <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-2">
          {contacts.map((contact) => (
            <div key={contact.id} className="flex items-center space-x-2">
              <Checkbox
                id={`contact-${contact.id}`}
                checked={formData.participants.includes(contact.id)}
                onCheckedChange={() => toggleParticipant(contact.id)}
              />
              <Label htmlFor={`contact-${contact.id}`} className="text-sm">
                {contact.firstName} {contact.lastName} - {contact.role || contact.category}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Create Event
        </Button>
      </div>
    </form>
  );
}

// Edit Event Form Component
function EditEventForm({ 
  event, 
  contacts, 
  onSubmit, 
  onDelete, 
  onCancel 
}: { 
  event: ScheduleEvent;
  contacts: Contact[];
  onSubmit: (data: any) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    title: event.title,
    description: event.description || '',
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    type: event.type,
    location: event.location || '',
    notes: event.notes || '',
    isAllDay: event.isAllDay,
    participants: event.participants.map(p => p.contactId),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Clean up the form data before submission
    const cleanedData = {
      ...formData,
      location: formData.location?.trim() || undefined,
      description: formData.description?.trim() || undefined,
      notes: formData.notes?.trim() || undefined,
      participants: formData.participants,
    };
    onSubmit(cleanedData);
  };

  const toggleParticipant = (contactId: number) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.includes(contactId)
        ? prev.participants.filter(id => id !== contactId)
        : [...prev.participants, contactId]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Event Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="type">Event Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rehearsal">Rehearsal</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="tech">Tech</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
            disabled={formData.isAllDay}
            required={!formData.isAllDay}
          />
        </div>
        
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
            disabled={formData.isAllDay}
            required={!formData.isAllDay}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isAllDay"
          checked={formData.isAllDay}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAllDay: !!checked }))}
        />
        <Label htmlFor="isAllDay">All Day Event</Label>
      </div>

      <LocationSelect
        projectId={event.projectId}
        value={formData.location}
        onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
        eventDate={formData.date}
        startTime={formData.startTime}
        endTime={formData.endTime}
      />

      {/* Contact Assignment */}
      <div>
        <Label>Assign Contacts</Label>
        <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-2">
          {contacts.map((contact) => (
            <div key={contact.id} className="flex items-center space-x-2">
              <Checkbox
                id={`contact-${contact.id}`}
                checked={formData.participants.includes(contact.id)}
                onCheckedChange={() => toggleParticipant(contact.id)}
              />
              <Label htmlFor={`contact-${contact.id}`} className="text-sm">
                {contact.firstName} {contact.lastName} - {contact.role || contact.category}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
        />
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="destructive" onClick={onDelete}>
          Delete Event
        </Button>
        <div className="space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Update Event
          </Button>
        </div>
      </div>
    </form>
  );
}