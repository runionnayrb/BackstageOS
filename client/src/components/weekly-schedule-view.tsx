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
import { formatTimeDisplay, parseScheduleSettings } from "@/lib/timeUtils";
import { isShowEvent, getEventTypeDisplayName, getEventTypeColor, ALL_EVENT_TYPES } from "@/lib/eventUtils";
import LocationSelect from "@/components/location-select";

interface WeeklyScheduleViewProps {
  projectId: number;
  onDateClick: (date: Date) => void;
  currentDate?: Date;
  setCurrentDate?: (date: Date) => void;
  selectedContactIds: number[];
  timeIncrement: 15 | 30 | 60;
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

// Event type colors - consistent single color for all events
const getEventColor = (type: string) => {
  return 'bg-blue-500'; // Single consistent color for all events
};

export default function WeeklyScheduleView({ projectId, onDateClick, selectedContactIds, timeIncrement }: WeeklyScheduleViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
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
    ? events.filter(event => isShowEvent(event.type) || !event.type) // Show show-wide events and events without type when no filter is applied
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
    // Match weekly availability editor: 1:1 pixel-to-minute ratio
    return Math.max(0, minutes - START_MINUTES);
  };

  const positionToMinutes = (position: number) => {
    // Match weekly availability editor: 1:1 pixel-to-minute ratio
    const minutes = Math.max(START_MINUTES, Math.min(END_MINUTES - 1, Math.round(position + START_MINUTES)));
    return minutes;
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
      console.log('Updating event:', eventId, eventData);
      const response = await fetch(`/api/schedule-events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Update failed:', response.status, errorText);
        throw new Error(`Failed to update event: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Update success:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Update mutation succeeded:', data);
      
      // Clear any drag state immediately
      setDraggedEvent(null);
      setJustDragged(null);
      
      // Force immediate cache update with the returned data
      queryClient.setQueryData([`/api/projects/${projectId}/schedule-events`], (old: ScheduleEvent[]) => {
        return old?.map((e: ScheduleEvent) => 
          e.id === data.id ? data : e
        ) || [];
      });
      
      // Also refetch to ensure consistency
      queryClient.refetchQueries({ queryKey: [`/api/projects/${projectId}/schedule-events`] });
      
      setEditingEvent(null);
      // Only show toast for manual edits, not drag operations
      if (data.fromDrag !== true) {
        toast({ title: "Event updated successfully" });
      }
    },
    onError: (error) => {
      console.error('Update mutation failed:', error);
      // Revert optimistic update by forcing a fresh query
      queryClient.refetchQueries({ queryKey: [`/api/projects/${projectId}/schedule-events`] });
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
    if (!calendarRef.current || !scrollContainerRef.current) return;

    // Use same coordinate system as weekly availability editor
    const rect = calendarRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = snapToIncrement(positionToMinutes(y));
    
    console.log('Mouse click:', { 
      y, 
      minutes, 
      time: formatTimeFromMinutes(minutes), 
      dayIndex,
      clickedDate: weekDates[dayIndex]?.toISOString().split('T')[0],
      weekDatesDebug: weekDates.map((d, i) => ({ index: i, date: d.toISOString().split('T')[0] }))
    });

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
      if (!calendarRef.current || !scrollContainerRef.current) return;

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
          startTime: formatTimeFromMinutes(startTime),
          endTime: formatTimeFromMinutes(endTime),
          duration: endTime - startTime,
          dayIndex: dragState.startDay,
        });
        
        if (endTime - startTime >= timeIncrement) {
          const date = weekDates[dragState.startDay].toISOString().split('T')[0];
          setCreateEventDialog({
            isOpen: true,
            date,
            startTime: formatTimeFromMinutes(startTime),
            endTime: formatTimeFromMinutes(endTime),
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

    // Skip if event was just dragged (prevent immediate edit after drag)
    if (justDragged === event.id) {
      setJustDragged(null);
      return;
    }

    // Clear any existing selections when not in multi-select mode
    setSelectedEvents(new Set());

    // Double click to edit
    const doubleClickHandler = () => {
      setEditingEvent(event);
    };

    // Set up double click detection
    const clickTimeout = setTimeout(() => {
      // Single click - start dragging
      const eventDate = event.date;
      const dayIndex = weekDates.findIndex((date: Date) => date.toISOString().split('T')[0] === eventDate);
      
      if (dayIndex === -1) return;

      const startMinutes = timeToMinutes(event.startTime);
      const rect = calendarRef.current?.getBoundingClientRect();
      if (!rect) return;

      const draggedEvent = {
        event,
        originalPosition: { dayIndex, startMinutes },
        currentPosition: { dayIndex, startMinutes },
        offset: { x: e.clientX - rect.left, y: e.clientY - rect.top },
        isDragging: false,
      };

      setDraggedEvent(draggedEvent);

      let hasStartedDragging = false;
      const moveThreshold = 3; // pixels

      const handleMouseMove = (e: MouseEvent) => {
        if (!hasStartedDragging) {
          const distance = Math.sqrt(
            Math.pow(e.clientX - (rect!.left + draggedEvent.offset.x), 2) +
            Math.pow(e.clientY - (rect!.top + draggedEvent.offset.y), 2)
          );
          
          if (distance < moveThreshold) return;
          hasStartedDragging = true;
          setDraggedEvent(prev => prev ? { ...prev, isDragging: true } : null);
        }

        if (!calendarRef.current) return;

        const newRect = calendarRef.current.getBoundingClientRect();
        const relativeX = e.clientX - newRect.left;
        const relativeY = e.clientY - newRect.top;

        const newDayIndex = Math.floor((relativeX - 80) / ((newRect.width - 80) / 7));
        const constrainedDayIndex = Math.max(0, Math.min(6, newDayIndex));
        
        const newStartMinutes = snapToIncrement(positionToMinutes(relativeY - draggedEvent.offset.y));

        setDraggedEvent(prev => prev ? {
          ...prev,
          currentPosition: { dayIndex: constrainedDayIndex, startMinutes: newStartMinutes },
        } : null);
      };

      const handleMouseUp = () => {
        console.log('Mouse up triggered, hasStartedDragging:', hasStartedDragging, 'draggedEvent:', draggedEvent);
        if (hasStartedDragging && draggedEvent) {
          // Update event position
          const newDate = weekDates[draggedEvent.currentPosition.dayIndex].toISOString().split('T')[0];
          // Format time with seconds for database storage
          const startTime = formatTimeFromMinutes(draggedEvent.currentPosition.startMinutes) + ':00';
          const duration = timeToMinutes(event.endTime) - timeToMinutes(event.startTime);
          const endTime = formatTimeFromMinutes(draggedEvent.currentPosition.startMinutes + duration) + ':00';

          const eventData = {
            date: newDate,
            startTime,
            endTime,
            fromDrag: true, // Flag to indicate this is a drag operation
          };

          // Immediately update the query cache for instant visual feedback
          queryClient.setQueryData([`/api/projects/${projectId}/schedule-events`], (old: any) => {
            console.log('Updating cache for event', event.id, 'with data:', eventData);
            const updated = old?.map((e: ScheduleEvent) => 
              e.id === event.id ? { ...e, ...eventData } : e
            ) || [];
            console.log('Updated cache data:', updated.find((e: any) => e.id === event.id));
            return updated;
          });

          // Run database update silently in background
          setTimeout(async () => {
            try {
              const response = await fetch(`/api/schedule-events/${event.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData),
              });
              
              if (!response.ok) {
                // If silent update fails, revert the cache
                queryClient.refetchQueries({ queryKey: [`/api/projects/${projectId}/schedule-events`] });
                toast({ 
                  title: "Failed to update event", 
                  variant: "destructive" 
                });
              }
            } catch (error) {
              console.error('Silent update failed:', error);
              // Revert cache on error
              queryClient.refetchQueries({ queryKey: [`/api/projects/${projectId}/schedule-events`] });
              toast({ 
                title: "Failed to update event", 
                variant: "destructive" 
              });
            }
          }, 100);

          setJustDragged(event.id);
        }

        setDraggedEvent(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }, 200);

    // Handle double click
    const handleDoubleClick = () => {
      clearTimeout(clickTimeout);
      doubleClickHandler();
    };

    e.currentTarget.addEventListener('dblclick', handleDoubleClick, { once: true });
  }, [weekDates, filteredEvents, timeIncrement, updateEventMutation, justDragged, selectedEvents]);

  // Handle event resize
  const handleResizeStart = useCallback((e: React.MouseEvent, event: ScheduleEvent, edge: 'start' | 'end') => {
    e.preventDefault();
    e.stopPropagation();

    const originalStartMinutes = timeToMinutes(event.startTime);
    const originalEndMinutes = timeToMinutes(event.endTime);

    setResizingEvent({
      event,
      edge,
      originalStartMinutes,
      originalEndMinutes,
    });

    const handleMouseMove = (e: MouseEvent) => {
      if (!calendarRef.current) return;

      const rect = calendarRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const minutes = snapToIncrement(positionToMinutes(y));

      let newStartMinutes = originalStartMinutes;
      let newEndMinutes = originalEndMinutes;

      if (edge === 'start') {
        newStartMinutes = Math.min(minutes, originalEndMinutes - timeIncrement);
      } else {
        newEndMinutes = Math.max(minutes, originalStartMinutes + timeIncrement);
      }

      const newStartTime = formatTimeFromMinutes(newStartMinutes);
      const newEndTime = formatTimeFromMinutes(newEndMinutes);

      // Update the event optimistically
      setResizingEvent(prev => prev ? {
        ...prev,
        event: { ...prev.event, startTime: newStartTime, endTime: newEndTime },
      } : null);
    };

    const handleMouseUp = () => {
      if (resizingEvent) {
        const eventData = {
          startTime: resizingEvent.event.startTime,
          endTime: resizingEvent.event.endTime,
        };

        // Update UI immediately for instant visual feedback
        queryClient.setQueryData([`/api/projects/${projectId}/schedule-events`], (old: ScheduleEvent[]) => {
          return old?.map((e: ScheduleEvent) => 
            e.id === event.id ? { ...e, startTime: resizingEvent.event.startTime, endTime: resizingEvent.event.endTime } : e
          ) || [];
        });

        // Update in background
        updateEventMutation.mutate({
          eventId: event.id,
          eventData,
        });
      }

      setResizingEvent(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [timeIncrement, updateEventMutation, resizingEvent]);

  // Generate time labels and increment lines
  const timeLabels = [];
  const incrementLines = [];
  
  for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += 60) {
    const position = minutesToPosition(minutes);
    const hours = Math.floor(minutes / 60);
    const timeString = `${hours.toString().padStart(2, '0')}:00`;
    timeLabels.push(
      <div
        key={minutes}
        className="absolute left-0 w-20 text-left pl-2 text-sm text-gray-600"
        style={{ top: `${position}px` }}
      >
        {formatTimeDisplay(timeString, timeFormat as '12' | '24')}
      </div>
    );
  }

  // Add increment lines based on time increment setting
  for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += timeIncrement) {
    const position = minutesToPosition(minutes);
    const isHourLine = minutes % 60 === 0;
    
    incrementLines.push(
      <div
        key={`increment-${minutes}`}
        className={`absolute left-0 right-0 border-b ${
          isHourLine ? 'border-gray-300' : 'border-gray-200'
        } z-10`}
        style={{ top: `${position}px` }}
      />
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Navigation and controls row */}
        <div className="relative flex justify-center mb-4">
          {/* Week navigation - truly centered */}
          <div className="flex items-center space-x-4">
            <button onClick={goToPreviousWeek} className="p-2 hover:bg-gray-100 rounded transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="text-lg font-medium min-w-[200px] text-center">
              {formatWeekRange(weekDates)}
            </div>
            
            <button onClick={goToNextWeek} className="p-2 hover:bg-gray-100 rounded transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* All Day and Today buttons - absolutely positioned right */}
          <div className="absolute right-0 top-0 flex items-center space-x-2">
            <Button
              variant={showAllDayEvents ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAllDayEvents(!showAllDayEvents)}
              className="text-xs px-2 py-1 h-auto"
            >
              All Day
            </Button>
            <Button variant="outline" onClick={goToToday} size="sm" className="text-xs px-2 py-1 h-auto">
              Today
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
                variant="destructive"
                size="sm"
                onClick={() => setShowBulkDeleteDialog(true)}
              >
                Delete Selected
              </Button>
            )}
          </div>
        )}



        {/* Main Schedule Grid */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Header row */}
          <div className="relative bg-gray-50 border-b border-gray-200" style={{ height: '60px' }}>
            <div 
              className="absolute left-0 top-0 bottom-0 bg-gray-100 border-r border-gray-200 p-3 text-sm font-medium text-gray-600 flex items-center justify-start"
              style={{ width: '80px' }}
            >
              Time
            </div>
            {weekDates.map((date, dayIndex) => {
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div 
                  key={dayIndex} 
                  className={`absolute top-0 bottom-0 p-3 text-sm font-medium text-center border-l border-gray-200 cursor-pointer transition-colors flex flex-col justify-center ${
                    isToday 
                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                      : 'hover:bg-blue-50'
                  }`}
                  style={{
                    left: `calc(80px + (100% - 80px) * ${dayIndex} / 7)`,
                    width: `calc((100% - 80px) / 7)`,
                  }}
                  onClick={() => onDateClick(date)}
                >
                  <div>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className="text-lg">{date.getDate()}</div>
                </div>
              );
            })}
          </div>

          {/* All Day Events Section - directly below headers */}
          {showAllDayEvents && (
            <div className="relative min-h-[60px] bg-gray-50 border-b border-gray-200">
              <div 
                className="absolute left-0 top-0 bottom-0 bg-gray-100 border-r border-gray-200 p-2 text-sm font-medium text-gray-600 flex items-center justify-start"
                style={{ width: '80px' }}
              >
                All Day
              </div>
              {weekDates.map((date, dayIndex) => {
                const dayEvents = filteredEvents.filter(event => 
                  event.date === date.toISOString().split('T')[0] && event.isAllDay
                );
                return (
                  <div 
                    key={dayIndex} 
                    className="absolute top-0 bottom-0 p-2 border-l border-gray-200 space-y-1"
                    style={{
                      left: `calc(80px + (100% - 80px) * ${dayIndex} / 7)`,
                      width: `calc((100% - 80px) / 7)`,
                    }}
                  >
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        className={`${getEventColor(event.type)} text-white text-xs p-1 rounded cursor-pointer hover:opacity-80 ${
                          selectedEvents.has(event.id) ? 'ring-2 ring-yellow-400' : ''
                        }`}
                        onClick={(e) => handleEventMouseDown(e, event)}
                        onMouseDown={(e) => handleEventMouseDown(e, event)}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Scrollable calendar content */}
          <div 
            ref={scrollContainerRef}
            className="overflow-y-auto"
            style={{ 
              height: '600px',
              scrollTop: scrollPosition,
            }}
          >
            <div 
              ref={calendarRef}
              className="relative bg-white"
              style={{ height: `${TOTAL_MINUTES}px` }}
            >
              {/* Time column with consistent right border */}
              <div 
                className="absolute left-0 top-0 bottom-0 bg-gray-50 border-r border-gray-200 z-20"
                style={{ width: '80px' }}
              >
                {/* Time labels */}
                {timeLabels}
              </div>

              {/* Day columns */}
              {Array.from({ length: 7 }, (_, dayIndex) => (
                <div
                  key={dayIndex}
                  className="absolute top-0 bottom-0 border-l border-gray-100 hover:bg-blue-50/30 cursor-crosshair"
                  style={{
                    left: `calc(80px + (100% - 80px) * ${dayIndex} / 7)`,
                    width: `calc((100% - 80px) / 7)`,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, dayIndex)}
                />
              ))}

              {/* Time increment grid lines */}
              {incrementLines}

              {/* Events */}
              {filteredEvents
                .filter(event => !event.isAllDay)
                .map(event => {
                  const eventDate = event.date;
                  const dayIndex = weekDates.findIndex((date: Date) => date.toISOString().split('T')[0] === eventDate);
                  
                  if (dayIndex === -1) return null;

                  const startMinutes = timeToMinutes(event.startTime);
                  const endMinutes = timeToMinutes(event.endTime);
                  const top = minutesToPosition(startMinutes);
                  const height = endMinutes - startMinutes;



                  // Use dragged position if this event is being dragged
                  const displayDayIndex = draggedEvent?.event.id === event.id ? 
                    draggedEvent.currentPosition.dayIndex : dayIndex;
                  const displayTop = draggedEvent?.event.id === event.id ? 
                    minutesToPosition(draggedEvent.currentPosition.startMinutes) : top;

                  // Use resized dimensions if this event is being resized
                  const displayHeight = resizingEvent?.event.id === event.id ?
                    timeToMinutes(resizingEvent.event.endTime) - timeToMinutes(resizingEvent.event.startTime) : height;
                  const resizedTop = resizingEvent?.event.id === event.id ?
                    minutesToPosition(timeToMinutes(resizingEvent.event.startTime)) : displayTop;

                  return (
                    <div
                      key={event.id}
                      className={`absolute ${getEventColor(event.type)} text-white text-sm p-2 rounded-md shadow-sm border-l-4 border-blue-700 cursor-pointer hover:opacity-90 z-30 ${
                        selectedEvents.has(event.id) ? 'ring-2 ring-yellow-400' : ''
                      } ${draggedEvent?.event.id === event.id && draggedEvent.isDragging ? 'opacity-50' : ''}`}
                      style={{
                        left: `calc(80px + (100% - 80px) * ${displayDayIndex} / 7 + 2px)`,
                        width: `calc((100% - 80px) / 7 - 4px)`,
                        top: `${resizedTop}px`,
                        height: `${Math.max(20, displayHeight)}px`,
                        minHeight: '20px',
                      }}
                      onMouseDown={(e) => handleEventMouseDown(e, event)}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="text-xs opacity-90">
                        {formatTimeDisplay(formatTime(startMinutes), timeFormat as '12' | '24')} - {formatTimeDisplay(formatTime(endMinutes), timeFormat as '12' | '24')}
                      </div>
                      
                      {/* Resize handles */}
                      <div
                        className="absolute left-0 right-0 top-0 h-1 cursor-n-resize hover:bg-blue-300 opacity-0 hover:opacity-100"
                        onMouseDown={(e) => handleResizeStart(e, event, 'start')}
                      />
                      <div
                        className="absolute left-0 right-0 bottom-0 h-1 cursor-s-resize hover:bg-blue-300 opacity-0 hover:opacity-100"
                        onMouseDown={(e) => handleResizeStart(e, event, 'end')}
                      />
                    </div>
                  );
                })}

              {/* Drag preview overlay for new events - FIXED POSITIONING */}
              {dragState?.isActive && (
                <div
                  className="absolute bg-blue-200 border-2 border-blue-400 rounded opacity-60 pointer-events-none z-30"
                  style={{
                    left: `calc(80px + (100% - 80px) * ${dragState.startDay} / 7 + 2px)`,
                    width: `calc((100% - 80px) / 7 - 4px)`,
                    top: `${minutesToPosition(Math.min(dragState.startTime, dragState.currentTime))}px`,
                    height: `${Math.abs(minutesToPosition(dragState.currentTime) - minutesToPosition(dragState.startTime))}px`,
                  }}
                />
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
            onSubmit={createEventMutation.mutate}
            onCancel={() => setCreateEventDialog({ isOpen: false })}
            defaultValues={createEventDialog}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      {editingEvent && (
        <Dialog open={!!editingEvent} onOpenChange={() => setEditingEvent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
            </DialogHeader>
            <EditEventForm 
              event={editingEvent}
              contacts={contacts}
              onSubmit={(data) => updateEventMutation.mutate({ eventId: editingEvent.id, eventData: data })}
              onDelete={() => deleteEventMutation.mutate(editingEvent.id)}
              onCancel={() => setEditingEvent(null)}
              isDeleting={deleteEventMutation.isPending}
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
            <div className="space-y-4">
              <p>
                Are you sure you want to delete {selectedEvents.size} selected event{selectedEvents.size !== 1 ? 's' : ''}? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>
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
  defaultValues 
}: {
  projectId: number;
  contacts: Contact[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  defaultValues: any;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'rehearsal',
    date: defaultValues.date || '',
    startTime: defaultValues.startTime || '',
    endTime: defaultValues.endTime || '',
    location: '',
    notes: '',
    isAllDay: false,
    participants: [] as number[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      projectId,
      participants: formData.participants.map(contactId => ({
        contactId,
        isRequired: true,
        status: 'pending',
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Event Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="type">Event Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_EVENT_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {getEventTypeDisplayName(type.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
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
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            disabled={formData.isAllDay}
            required={!formData.isAllDay}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isAllDay"
          checked={formData.isAllDay}
          onCheckedChange={(checked) => setFormData({ ...formData, isAllDay: !!checked })}
        />
        <Label htmlFor="isAllDay">All Day Event</Label>
      </div>

      <div>
        <Label>Location</Label>
        <LocationSelect
          value={formData.location}
          onChange={(location) => setFormData({ ...formData, location })}
          projectId={projectId}
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>

      <div>
        <Label>Participants</Label>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {contacts.map(contact => (
            <div key={contact.id} className="flex items-center space-x-2">
              <Checkbox
                id={`contact-${contact.id}`}
                checked={formData.participants.includes(contact.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFormData({
                      ...formData,
                      participants: [...formData.participants, contact.id],
                    });
                  } else {
                    setFormData({
                      ...formData,
                      participants: formData.participants.filter(id => id !== contact.id),
                    });
                  }
                }}
              />
              <Label htmlFor={`contact-${contact.id}`} className="text-sm">
                {contact.firstName} {contact.lastName} ({contact.role || contact.category})
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Event</Button>
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
  onCancel, 
  isDeleting 
}: {
  event: ScheduleEvent;
  contacts: Contact[];
  onSubmit: (data: any) => void;
  onDelete: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  const [formData, setFormData] = useState({
    title: event.title,
    description: event.description || '',
    type: event.type,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location || '',
    notes: event.notes || '',
    isAllDay: event.isAllDay,
    participants: event.participants.map(p => p.contactId),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      participants: formData.participants.map(contactId => ({
        contactId,
        isRequired: true,
        status: 'pending',
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Event Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="type">Event Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_EVENT_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {getEventTypeDisplayName(type.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
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
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            disabled={formData.isAllDay}
            required={!formData.isAllDay}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isAllDay"
          checked={formData.isAllDay}
          onCheckedChange={(checked) => setFormData({ ...formData, isAllDay: !!checked })}
        />
        <Label htmlFor="isAllDay">All Day Event</Label>
      </div>

      <div>
        <Label>Location</Label>
        <LocationSelect
          value={formData.location}
          onChange={(location) => setFormData({ ...formData, location })}
          projectId={event.projectId}
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>

      <div>
        <Label>Participants</Label>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {contacts.map(contact => (
            <div key={contact.id} className="flex items-center space-x-2">
              <Checkbox
                id={`contact-${contact.id}`}
                checked={formData.participants.includes(contact.id)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFormData({
                      ...formData,
                      participants: [...formData.participants, contact.id],
                    });
                  } else {
                    setFormData({
                      ...formData,
                      participants: formData.participants.filter(id => id !== contact.id),
                    });
                  }
                }}
              />
              <Label htmlFor={`contact-${contact.id}`} className="text-sm">
                {contact.firstName} {contact.lastName} ({contact.role || contact.category})
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <Button 
          type="button" 
          variant="destructive" 
          onClick={onDelete}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete Event"}
        </Button>
        <div className="space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Update Event</Button>
        </div>
      </div>
    </form>
  );
}