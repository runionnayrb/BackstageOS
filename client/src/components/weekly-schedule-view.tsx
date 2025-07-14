import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Plus, Clock, Users, Calendar, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { formatTimeDisplay, parseScheduleSettings } from "@/lib/timeUtils";
import { isShowEvent, getEventTypeDisplayName, getEventTypeColor, getEventTypeBorderColor, getEventTypeColorFromDatabase } from "@/lib/eventUtils";
import { filterEventsBySettings, getTimezoneAbbreviation } from "@/lib/scheduleUtils";
import LocationSelect from "@/components/location-select";
import EventTypeSelect from "@/components/event-type-select";
import EventForm from "@/components/event-form";

interface WeeklyScheduleViewProps {
  projectId: number;
  onDateClick: (date: Date) => void;
  currentDate?: Date;
  setCurrentDate?: (date: Date) => void;
  selectedContactIds: number[];
  selectedEventTypes: string[];
  selectedIndividualTypes: string[];
  timeIncrement: 15 | 30 | 60;
  showAllDayEvents?: boolean;
  createEventDialog: boolean;
  setCreateEventDialog: (open: boolean) => void;
  setCreateEventData: (data: { date?: string; startTime?: string; endTime?: string }) => void;
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

// Event type colors - use the proper color system from eventUtils
const getEventColor = (type: string) => {
  return getEventTypeColor(type);
};

export default function WeeklyScheduleView({ 
  projectId, 
  onDateClick, 
  currentDate, 
  setCurrentDate, 
  selectedContactIds, 
  selectedEventTypes,
  selectedIndividualTypes,
  timeIncrement, 
  showAllDayEvents: propShowAllDayEvents, 
  createEventDialog, 
  setCreateEventDialog,
  setCreateEventData
}: WeeklyScheduleViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState<Date>(currentDate || new Date());
  const [isDragCreating, setIsDragCreating] = useState<{
    isActive: boolean;
    startDay: number;
    startTime: number;
    currentDay: number;
    currentTime: number;
  } | null>(null);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showAllDayEvents, setShowAllDayEvents] = useState(propShowAllDayEvents ?? true);
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

  // Parse schedule settings with time format preference - ensure timeFormat has fallback
  const scheduleSettings = parseScheduleSettings((showSettings as any)?.scheduleSettings);
  const { timeFormat = '12', timezone, weekStartDay, workStartTime, workEndTime } = scheduleSettings;

  // Fetch schedule events
  const { data: events = [], isLoading } = useQuery<ScheduleEvent[]>({
    queryKey: [`/api/projects/${projectId}/schedule-events`],
  });

  // Debug logging to track events changes
  useEffect(() => {
    console.log('Events array changed:', events.length, 'events');
    console.log('Event #25 current data:', events.find(e => e.id === 25));
  }, [events]);

  // Sync currentWeek with external currentDate prop
  useEffect(() => {
    if (currentDate) {
      setCurrentWeek(currentDate);
    }
  }, [currentDate]);



  // Fetch contacts for event assignment
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: [`/api/projects/${projectId}/contacts`],
  });

  // Fetch event types for the project
  const { data: eventTypes = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/event-types`],
    enabled: !!projectId,
  });

  // Filter events based on selected contact IDs and schedule filtering
  const filteredEvents = (() => {
    let eventsToFilter = events;
    
    // Apply event type filtering based on user selections
    // If no event types are selected at all, show no events
    if (selectedEventTypes.length === 0 && selectedIndividualTypes.length === 0) {
      eventsToFilter = [];
    } else {
      eventsToFilter = eventsToFilter.filter(event => {
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
    
    // Apply contact filtering
    if (selectedContactIds.length === 0) {
      // When no contacts are selected, show all events that passed the event type filtering
      return eventsToFilter;
    } else {
      return eventsToFilter.filter(event => 
        event.participants.some(participant => 
          selectedContactIds.includes(participant.contactId)
        )
      );
    }
  })();



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
    if (setCurrentDate) {
      setCurrentDate(prevWeek);
    }
  };

  const goToNextWeek = () => {
    const nextWeek = new Date(currentWeek);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeek(nextWeek);
    if (setCurrentDate) {
      setCurrentDate(nextWeek);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentWeek(today);
    if (setCurrentDate) {
      setCurrentDate(today);
    }
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
    
    const startFormatted = start.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    const endFormatted = end.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    return `${startFormatted} - ${endFormatted}`;
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
          setCreateEventData({
            date,
            startTime: formatTimeFromMinutes(startTime),
            endTime: formatTimeFromMinutes(endTime),
          });
          setCreateEventDialog(true);
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

      // Calculate the event's current position on screen
      const eventLeft = 80 + ((rect.width - 80) * dayIndex / 7);
      const eventTop = minutesToPosition(startMinutes);
      
      // Calculate offset relative to the event's top-left corner
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top + (scrollContainerRef.current?.scrollTop || 0);
      
      const draggedEvent = {
        event,
        originalPosition: { dayIndex, startMinutes },
        currentPosition: { dayIndex, startMinutes },
        offset: { 
          x: clickX - eventLeft, 
          y: clickY - eventTop 
        },
        isDragging: false,
      };

      setDraggedEvent(draggedEvent);

      let hasStartedDragging = false;
      let currentDragPosition = { dayIndex: draggedEvent.originalPosition.dayIndex, startMinutes: draggedEvent.originalPosition.startMinutes };
      const moveThreshold = 3; // pixels

      const handleMouseMove = (e: MouseEvent) => {
        if (!hasStartedDragging) {
          // Calculate current mouse position
          const currentX = e.clientX - rect!.left;
          const currentY = e.clientY - rect!.top;
          
          // Calculate original click position
          const originalEventLeft = 80 + ((rect!.width - 80) * draggedEvent.originalPosition.dayIndex / 7);
          const originalEventTop = minutesToPosition(draggedEvent.originalPosition.startMinutes);
          const originalClickX = originalEventLeft + draggedEvent.offset.x;
          const originalClickY = originalEventTop + draggedEvent.offset.y - (scrollContainerRef.current?.scrollTop || 0);
          
          const distance = Math.sqrt(
            Math.pow(currentX - originalClickX, 2) +
            Math.pow(currentY - originalClickY, 2)
          );
          
          if (distance < moveThreshold) return;
          hasStartedDragging = true;
          setDraggedEvent(prev => prev ? { ...prev, isDragging: true } : null);
        }

        if (!calendarRef.current || !scrollContainerRef.current) return;

        const newRect = calendarRef.current.getBoundingClientRect();
        const scrollTop = scrollContainerRef.current.scrollTop;
        
        // Calculate mouse position relative to calendar content with scroll, adjusted for click offset
        const mouseX = e.clientX - newRect.left;
        const mouseY = e.clientY - newRect.top + scrollTop;
        
        // Subtract the offset to get the event's new top-left position
        const eventX = mouseX - draggedEvent.offset.x;
        const eventY = mouseY - draggedEvent.offset.y;

        // Calculate day index from event position
        const newDayIndex = Math.floor((eventX - 80) / ((newRect.width - 80) / 7));
        const constrainedDayIndex = Math.max(0, Math.min(6, newDayIndex));
        
        // Calculate time position from event position
        const newStartMinutes = snapToIncrement(positionToMinutes(eventY));

        // Update local position tracker
        currentDragPosition = { dayIndex: constrainedDayIndex, startMinutes: newStartMinutes };

        console.log('Drag move:', {
          mouseX,
          mouseY,
          eventX,
          eventY,
          offset: draggedEvent.offset,
          scrollTop,
          newDayIndex: constrainedDayIndex,
          newStartMinutes,
          time: formatTime(newStartMinutes)
        });

        setDraggedEvent(prev => prev ? {
          ...prev,
          currentPosition: currentDragPosition,
        } : null);
      };

      const handleMouseUp = () => {
        console.log('Mouse up triggered, hasStartedDragging:', hasStartedDragging, 'currentDragPosition:', currentDragPosition);
        if (hasStartedDragging && draggedEvent) {
          // Update event position using the current drag position
          const newDate = weekDates[currentDragPosition.dayIndex].toISOString().split('T')[0];
          // Format time with seconds for database storage
          const startTime = formatTime(currentDragPosition.startMinutes) + ':00';
          const duration = timeToMinutes(event.endTime) - timeToMinutes(event.startTime);
          const endTime = formatTime(currentDragPosition.startMinutes + duration) + ':00';

          const eventData = {
            date: newDate,
            startTime,
            endTime,
            fromDrag: true, // Flag to indicate this is a drag operation
          };

          // Cancel any outgoing refetches to prevent conflicts
          queryClient.cancelQueries({ 
            queryKey: [`/api/projects/${projectId}/schedule-events`] 
          });

          // Use the mutation for proper error handling and cache management
          updateEventMutation.mutate({
            eventId: event.id,
            eventData
          });

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

      const newStartTime = formatTime(newStartMinutes);
      const newEndTime = formatTime(newEndMinutes);

      // Update the event optimistically
      setResizingEvent(prev => prev ? {
        ...prev,
        event: { ...prev.event, startTime: newStartTime, endTime: newEndTime },
      } : null);
    };

    const handleMouseUp = () => {
      if (resizingEvent) {
        const eventData = {
          startTime: resizingEvent.event.startTime + ':00',
          endTime: resizingEvent.event.endTime + ':00',
        };

        // Use the mutation for proper error handling and cache management
        updateEventMutation.mutate({
          eventId: event.id,
          eventData
        });
      }

      setResizingEvent(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [timeIncrement, updateEventMutation, resizingEvent]);

  // Generate time labels using memoization to prevent scoping issues
  const timeLabels = useMemo(() => {
    const labels = [];
    
    for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += 60) {
      const position = minutesToPosition(minutes);
      const hours = Math.floor(minutes / 60);
      const timeString = `${hours.toString().padStart(2, '0')}:00`;
      labels.push(
        <div
          key={minutes}
          className="absolute left-0 w-20 text-left pl-2 text-sm text-gray-600"
          style={{ top: `${position}px` }}
        >
          {formatTimeDisplay(timeString, timeFormat as '12' | '24')}
        </div>
      );
    }
    
    return labels;
  }, [timeFormat]);

  // Generate increment lines
  const incrementLines = [];

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
      <div>
        {/* Navigation and controls row - Desktop only */}
        <div className="relative hidden md:flex justify-between mb-4">
          {/* Week navigation - fixed arrow positions */}
          <div className="flex items-center">
            <button onClick={goToPreviousWeek} className="p-2 hover:bg-gray-100 rounded transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <div className="text-lg font-medium w-[400px] text-center">
              {formatWeekRange(weekDates)}
            </div>
            
            <button onClick={goToNextWeek} className="p-2 hover:bg-gray-100 rounded transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* All Day and Today buttons - right aligned */}
          <div className="flex items-center space-x-2">
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
              className="absolute left-0 top-0 bottom-0 bg-gray-100 border-r border-gray-200 p-3 text-sm font-medium text-gray-600 flex items-center justify-center"
              style={{ width: '80px' }}
            >
              {getTimezoneAbbreviation(timezone || "America/New_York")}
            </div>
            {weekDates.map((date, dayIndex) => {
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div 
                  key={dayIndex} 
                  className={`absolute top-0 bottom-0 p-3 text-sm font-medium text-center border-l border-gray-200 cursor-pointer transition-colors ${
                    isToday 
                      ? 'bg-blue-500 text-white hover:bg-blue-600' 
                      : 'hover:bg-blue-50'
                  }`}
                  style={{
                    left: `calc(80px + (100% - 80px) * ${dayIndex} / 7)`,
                    width: `calc((100% - 80px) / 7)`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
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
                  let dayIndex = weekDates.findIndex((date: Date) => date.toISOString().split('T')[0] === eventDate);
                  
                  if (dayIndex === -1) return null;

                  const startMinutes = timeToMinutes(event.startTime);
                  const endMinutes = timeToMinutes(event.endTime);
                  const top = minutesToPosition(startMinutes);
                  const height = endMinutes - startMinutes;

                  // Get event type color from database with enhanced matching
                  const eventTypeColor = getEventTypeColorFromDatabase(event.type, eventTypes);


                  // Use dragged position if this event is being dragged, otherwise use the event's actual data
                  const displayDayIndex = draggedEvent?.event.id === event.id ? 
                    draggedEvent.currentPosition.dayIndex : dayIndex;
                  const displayTop = draggedEvent?.event.id === event.id ? 
                    minutesToPosition(draggedEvent.currentPosition.startMinutes) : 
                    minutesToPosition(timeToMinutes(event.startTime));

                  // Use resized dimensions if this event is being resized
                  const displayHeight = resizingEvent?.event.id === event.id ?
                    timeToMinutes(resizingEvent.event.endTime) - timeToMinutes(resizingEvent.event.startTime) : height;
                  const resizedTop = resizingEvent?.event.id === event.id ?
                    minutesToPosition(timeToMinutes(resizingEvent.event.startTime)) : displayTop;

                  return (
                    <div
                      key={event.id}
                      className={`absolute text-white text-sm p-2 rounded-md shadow-sm border-l-4 cursor-pointer hover:opacity-90 z-30 ${
                        selectedEvents.has(event.id) ? 'ring-2 ring-yellow-400' : ''
                      } ${draggedEvent?.event.id === event.id && draggedEvent.isDragging ? 'opacity-50' : ''}`}
                      style={{
                        left: `calc(80px + (100% - 80px) * ${displayDayIndex} / 7 + 2px)`,
                        width: `calc((100% - 80px) / 7 - 4px)`,
                        top: `${resizedTop}px`,
                        height: `${Math.max(20, displayHeight)}px`,
                        minHeight: '20px',
                        backgroundColor: eventTypeColor,
                        borderLeftColor: eventTypeColor,
                      }}
                      onMouseDown={(e) => handleEventMouseDown(e, event)}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="text-xs opacity-90">
                        {(() => {
                          // Use dragged position times if this event is being dragged
                          if (draggedEvent?.event.id === event.id && draggedEvent.isDragging) {
                            const dragStartMinutes = draggedEvent.currentPosition.startMinutes;
                            const duration = endMinutes - startMinutes;
                            const dragEndMinutes = dragStartMinutes + duration;
                            return `${formatTimeDisplay(formatTime(dragStartMinutes), timeFormat as '12' | '24')} - ${formatTimeDisplay(formatTime(dragEndMinutes), timeFormat as '12' | '24')}`;
                          }
                          // Use normal times for non-dragged events
                          return `${formatTimeDisplay(formatTime(startMinutes), timeFormat as '12' | '24')} - ${formatTimeDisplay(formatTime(endMinutes), timeFormat as '12' | '24')}`;
                        })()}
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

      {/* Create Event Modal - Hidden in weekly view as parent handles it */}

      {/* Edit Event Dialog - Full Screen Sheet */}
      {editingEvent && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setEditingEvent(null)}
            style={{ touchAction: 'none' }}
          />
          
          {/* Full Screen Sheet */}
          <div 
            className="fixed left-0 right-0 z-50 bg-white flex flex-col"
            style={{ 
              top: '60px', // Just below the BackstageOS header
              bottom: '80px', // Above mobile navigation (typically 64-80px)
              height: 'auto',
              maxHeight: 'calc(100vh - 140px)' // Header + mobile nav space
            }}
            onTouchMove={(e) => {
              // Prevent background scrolling when touching the sheet
              e.stopPropagation();
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <Button 
                variant="ghost" 
                onClick={() => setEditingEvent(null)}
                className="text-gray-500 hover:text-gray-700 p-1 h-auto"
              >
                <X className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold text-black">
                Edit Event
              </h1>
              <div className="w-9" /> {/* Spacer for center alignment */}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
              <EventForm
                projectId={projectId}
                contacts={contacts}
                eventTypes={eventTypes}
                initialDate={editingEvent.date}
                onSubmit={(data) => updateEventMutation.mutate({ eventId: editingEvent.id, eventData: data })}
                onCancel={() => setEditingEvent(null)}
                showButtons={false}
                initialValues={{
                  title: editingEvent.title,
                  description: editingEvent.description || '',
                  type: editingEvent.type,
                  startDate: editingEvent.date,
                  endDate: editingEvent.date,
                  startTime: editingEvent.startTime,
                  endTime: editingEvent.endTime,
                  location: editingEvent.location || '',
                  notes: editingEvent.notes || '',
                  isAllDay: editingEvent.isAllDay,
                  participantIds: editingEvent.participants.map(p => p.contactId),
                }}
              />
            </div>
            
            {/* Sticky Footer with Buttons */}
            <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0 mt-auto">
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingEvent(null)}
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  form="event-form"
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2"
                  disabled={updateEventMutation.isPending}
                >
                  {updateEventMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </>
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
  eventTypes,
  onSubmit, 
  onCancel, 
  defaultValues 
}: {
  projectId: number;
  contacts: Contact[];
  eventTypes: any[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  defaultValues: any;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: eventTypes.length > 0 ? eventTypes[0].name.toLowerCase().replace(/\s+/g, '_') : 'rehearsal',
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
      participants: formData.participants, // Just send the participant IDs
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
          <EventTypeSelect
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
            projectId={projectId}
            eventTypes={eventTypes}
          />
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
          onValueChange={(location) => setFormData({ ...formData, location })}
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
  eventTypes,
  projectId,
  onSubmit, 
  onCancel
}: {
  event: ScheduleEvent;
  contacts: Contact[];
  eventTypes: any[];
  projectId: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
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
      projectId,
      participants: formData.participants, // Just send the participant IDs
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <Label htmlFor="type">Type</Label>
          <EventTypeSelect
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
            projectId={projectId}
            eventTypes={eventTypes}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            className="w-full"
          />
        </div>
        <div className="min-w-0">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            disabled={formData.isAllDay}
            required={!formData.isAllDay}
            className="w-full"
          />
        </div>
        <div className="min-w-0">
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            disabled={formData.isAllDay}
            required={!formData.isAllDay}
            className="w-full"
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
          onValueChange={(location) => setFormData({ ...formData, location })}
          projectId={event.projectId}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
        <Button type="submit">Save Changes</Button>
      </div>
    </form>
  );
}