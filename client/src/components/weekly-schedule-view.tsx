import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Plus, Clock, Users, Calendar, X, ChevronDown, MapPin, FileText, User, Edit } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { formatTimeDisplay, parseScheduleSettings, formatAsCalendarDate } from "@/lib/timeUtils";
import { isShowEvent, getEventTypeDisplayName, getEventTypeColor, getEventTypeBorderColor, getEventTypeColorFromDatabase, isLightColor, darkenColor } from "@/lib/eventUtils";
import { filterEventsBySettings, getTimezoneAbbreviation, calculateEventLayouts } from "@/lib/scheduleUtils";
import LocationSelect from "@/components/location-select";
import EventTypeSelect from "@/components/event-type-select";
import EventForm from "@/components/event-form";
import ScheduleFilter from "@/components/schedule-filter";

interface WeeklyScheduleViewProps {
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
  timeIncrement: 15 | 30 | 60;
  setTimeIncrement: (increment: 15 | 30 | 60) => void;
  showAllDayEvents?: boolean;
  setShowAllDayEvents?: (show: boolean) => void;
  createEventDialog: boolean;
  setCreateEventDialog: (open: boolean) => void;
  setCreateEventData: (data: { date?: string; startTime?: string; endTime?: string }) => void;
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
  onFilterChange,
  selectedEventTypes,
  onEventTypeFilterChange,
  selectedIndividualTypes,
  onIndividualTypeFilterChange,
  timeIncrement, 
  setTimeIncrement,
  showAllDayEvents, 
  setShowAllDayEvents,
  createEventDialog, 
  setCreateEventDialog,
  setCreateEventData,
  viewMode,
  setViewMode
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
  const [openPopoverId, setOpenPopoverId] = useState<number | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
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
  
  // Use a ref to track resizing state for proper closure handling
  const resizingEventRef = useRef<{
    event: ScheduleEvent;
    edge: 'start' | 'end';
    originalStartMinutes: number;
    originalEndMinutes: number;
  } | null>(null);
  const [justDragged, setJustDragged] = useState<number | null>(null);
  const [justResized, setJustResized] = useState<number | null>(null);
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
  const { timeFormat = '12', timezone, weekStartDay, workStartTime, workEndTime, dayStartHour, dayEndHour } = scheduleSettings;

  // Calculate dynamic time range based on settings (supports 28-hour day for theater)
  const START_HOUR = dayStartHour ?? DEFAULT_START_HOUR;
  const END_HOUR = dayEndHour ?? DEFAULT_END_HOUR;
  const START_MINUTES = START_HOUR * 60;
  const END_MINUTES = END_HOUR * 60;
  const TOTAL_MINUTES = END_MINUTES - START_MINUTES;

  // Calculate week dates based on settings (needed for date range filtering)
  const getWeekDates = useCallback((weekStart: Date) => {
    const week = [];
    // Create date in local timezone to avoid UTC conversion issues
    const startOfWeek = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
    const currentDay = startOfWeek.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Map week start day string to number
    const weekStartMap: { [key: string]: number } = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, 
      thursday: 4, friday: 5, saturday: 6
    };
    
    const configuredStartDay = weekStartMap[weekStartDay] || 0;
    
    // Calculate days to subtract to get to the configured start day
    let daysToSubtract = currentDay - configuredStartDay;
    if (daysToSubtract < 0) {
      daysToSubtract += 7;
    }
    
    startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
    
    for (let i = 0; i < 7; i++) {
      const weekDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i);
      week.push(weekDate);
    }
    return week;
  }, [weekStartDay]);

  const weekDates = getWeekDates(currentWeek);
  
  // Calculate date range for optimized API queries
  const startDate = formatAsCalendarDate(weekDates[0]);
  const endDate = formatAsCalendarDate(weekDates[6]);

  // Fetch schedule events (only for current week for better performance)
  const { data: events = [], isLoading } = useQuery<ScheduleEvent[]>({
    queryKey: ['/api/projects', projectId, 'schedule-events', { startDate, endDate }],
    select: (data) => {
      console.log('📅 Weekly view - All events:', data?.map(e => ({
        id: e.id,
        title: e.title,
        date: e.date,
        isAllDay: e.isAllDay,
        isProductionLevel: e.isProductionLevel
      })));
      return data;
    }
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
    // Always include important date events regardless of filtering
    // If no event types are selected at all, show ALL events (not just important dates)
    if (selectedEventTypes.length === 0 && selectedIndividualTypes.length === 0) {
      // Show all events when no filters are selected
      console.log('📅 No filters selected - showing all events');
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

  // Calculate layouts for overlapping events for each day
  const eventLayoutsByDay = useMemo(() => {
    const layoutsByDay: Map<number, Map<number, { column: number; totalColumns: number; width: number; left: number }>> = new Map();
    
    weekDates.forEach((date, dayIndex) => {
      const dateStr = formatAsCalendarDate(date);
      const dayEvents = filteredEvents.filter(event => 
        event.date === dateStr && !event.isAllDay
      );
      
      if (dayEvents.length > 0) {
        const layouts = calculateEventLayouts(dayEvents);
        layoutsByDay.set(dayIndex, layouts);
      }
    });
    
    return layoutsByDay;
  }, [filteredEvents, weekDates]);

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
      
      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.message || "Failed to create event") as any;
        error.status = response.status;
        error.conflicts = errorData.conflicts;
        throw error;
      }
      
      return response.json();
    },
    onMutate: async (eventData: any) => {
      await queryClient.cancelQueries({ queryKey: ['/api/projects', projectId, 'schedule-events'] });
      
      const optimisticEvent = {
        ...eventData,
        id: Date.now(),
        projectId: parseInt(projectId),
        participants: eventData.participantIds?.map((id: number) => ({
          contactId: id,
          contact: contacts.find(c => c.id === id)
        })) || []
      };
      
      queryClient.setQueriesData(
        { queryKey: ['/api/projects', projectId, 'schedule-events'] },
        (old: any) => {
          return old ? [...old, optimisticEvent] : [optimisticEvent];
        }
      );
      
      return { optimisticEvent };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'schedule-events'] });
      setCreateEventDialog({ isOpen: false });
      toast({ title: "Event created successfully" });
    },
    onError: (error: any, eventData, context) => {
      if (context?.optimisticEvent) {
        queryClient.setQueriesData(
          { queryKey: ['/api/projects', projectId, 'schedule-events'] },
          (old: any) => {
            return old?.filter((e: any) => e.id !== context.optimisticEvent.id) || [];
          }
        );
      }
      
      if (error.status === 409 && error.conflicts) {
        const conflictMessages = error.conflicts.map((conflict: any) => {
          if (conflict.conflictType === 'unavailable') {
            return `${conflict.contactName} is unavailable during ${conflict.conflictTime}`;
          } else if (conflict.conflictType === 'schedule_overlap') {
            return `${conflict.contactName} is unavailable during ${conflict.conflictTime}`;
          } else if (conflict.conflictType === 'location_unavailable') {
            return `${conflict.locationName} is unavailable during ${conflict.conflictTime}`;
          }
          return conflict.conflictDetails;
        });
        
        toast({
          title: "Scheduling Conflict",
          description: conflictMessages.join('\n'),
          variant: "destructive",
        });
      } else {
        toast({ 
          title: "Failed to create event", 
          description: error.message,
          variant: "destructive" 
        });
      }
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ eventId, eventData }: { eventId: number; eventData: any }) => {
      console.log('🚀 Starting update mutation for event:', eventId);
      console.log('📝 Event data being sent:', JSON.stringify(eventData, null, 2));
      
      const response = await fetch(`/api/schedule-events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });
      
      const responseText = await response.text();
      console.log('📨 Response status:', response.status);
      console.log('📨 Response text:', responseText);
      
      if (!response.ok) {
        console.error('❌ Update failed:', response.status, responseText);
        
        // Try to parse the error response for conflict information
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { message: responseText };
        }
        
        const error = new Error(errorData.message || "Failed to update event") as any;
        error.status = response.status;
        error.conflicts = errorData.conflicts;
        throw error;
      }
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ Failed to parse response:', e);
        throw new Error('Invalid response from server');
      }
      
      console.log('✅ Update success, returned data:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Update mutation succeeded:', data);
      
      // Invalidate queries to ensure all views update
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'schedule-events'] });
      
      setEditingEvent(null);
    },
    onError: (error: any) => {
      console.error('Update mutation failed:', error);
      // Revert optimistic update by forcing a fresh query
      queryClient.refetchQueries({ queryKey: ['/api/projects', projectId, 'schedule-events'] });
      
      // Handle conflict errors with user-friendly toast messages
      if (error.status === 409 && error.conflicts) {
        const conflictMessages = error.conflicts.map((conflict: any) => {
          if (conflict.conflictType === 'unavailable') {
            return `${conflict.contactName} is unavailable during ${conflict.conflictTime}`;
          } else if (conflict.conflictType === 'schedule_overlap') {
            return `${conflict.contactName} is unavailable during ${conflict.conflictTime}`;
          } else if (conflict.conflictType === 'location_unavailable') {
            return `${conflict.locationName} is unavailable during ${conflict.conflictTime}`;
          }
          return conflict.conflictDetails;
        });
        
        toast({
          title: "Scheduling Conflict",
          description: conflictMessages.join('\n'),
          variant: "destructive",
        });
      } else {
        toast({ 
          title: "Failed to update event", 
          description: error.message,
          variant: "destructive" 
        });
      }
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
    onMutate: async (eventId: number) => {
      await queryClient.cancelQueries({ queryKey: ['/api/projects', projectId, 'schedule-events'] });
      
      queryClient.setQueriesData(
        { queryKey: ['/api/projects', projectId, 'schedule-events'] },
        (old: any) => {
          return old?.filter((e: any) => e.id !== eventId) || [];
        }
      );
      
      return { eventId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'schedule-events'] });
      setEditingEvent(null);
      toast({ title: "Event deleted successfully" });
    },
    onError: (error, eventId, context) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'schedule-events'] });
      
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
    onMutate: async (eventIds: number[]) => {
      await queryClient.cancelQueries({ queryKey: ['/api/projects', projectId, 'schedule-events'] });
      
      queryClient.setQueriesData(
        { queryKey: ['/api/projects', projectId, 'schedule-events'] },
        (old: any) => {
          return old?.filter((e: any) => !eventIds.includes(e.id)) || [];
        }
      );
      
      return { eventIds };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'schedule-events'] });
      setSelectedEvents(new Set());
      setShowBulkDeleteDialog(false);
      toast({ title: "Selected events deleted successfully" });
    },
    onError: (error, eventIds, context) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'schedule-events'] });
      
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
    const isInputFocused = () => {
      const activeElement = document.activeElement;
      if (!activeElement) return false;
      const tagName = activeElement.tagName.toLowerCase();
      return tagName === 'input' || tagName === 'textarea' || 
             activeElement.getAttribute('contenteditable') === 'true';
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keyboard shortcuts when typing in input fields
      if (isInputFocused()) return;

      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEvents.size > 0) {
        e.preventDefault();
        setShowBulkDeleteDialog(true);
      }
      
      // Escape key to exit multi-select mode and deselect all
      if (e.key === 'Escape' && selectedEvents.size > 0) {
        e.preventDefault();
        setSelectedEvents(new Set());
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
    
    // Ignore right clicks
    if (e.button !== 0) return;

    // Use same coordinate system as weekly availability editor
    // Add scroll offset to get the actual position within the full calendar content
    const rect = calendarRef.current.getBoundingClientRect();
    const scrollTop = scrollContainerRef.current.scrollTop || 0;
    const y = e.clientY - rect.top + scrollTop;
    const minutes = snapToIncrement(positionToMinutes(y));
    
    console.log('Mouse click:', { 
      y, 
      minutes, 
      time: formatTimeFromMinutes(minutes), 
      dayIndex,
      clickedDate: formatAsCalendarDate(weekDates[dayIndex]),
      weekDatesDebug: weekDates.map((d, i) => ({ index: i, date: formatAsCalendarDate(d) }))
    });

    // Check if clicking on existing event
    // Use < for end time to avoid matching when clicking at the exact boundary between events
    const clickedEvent = filteredEvents.find(event => {
      const eventDay = weekDates.findIndex((date: Date) => formatAsCalendarDate(date) === event.date);
      const eventStart = timeToMinutes(event.startTime);
      const eventEnd = timeToMinutes(event.endTime);
      return eventDay === dayIndex && minutes >= eventStart && minutes < eventEnd && !event.isAllDay;
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
      const scrollTop = scrollContainerRef.current.scrollTop || 0;
      const y = e.clientY - rect.top + scrollTop;
      const newMinutes = snapToIncrement(positionToMinutes(y));

      dragState = { ...dragState, currentTime: newMinutes };
      setDragState(dragState);
    };

    const handleMouseUp = () => {
      if (dragState.isActive) {
        const startTime = Math.min(dragState.startTime, dragState.currentTime);
        const endTime = Math.max(dragState.startTime, dragState.currentTime);
        
        console.log('Creating event:', {
          date: formatAsCalendarDate(weekDates[dragState.startDay]),
          startTime: formatTimeFromMinutes(startTime),
          endTime: formatTimeFromMinutes(endTime),
          duration: endTime - startTime,
          dayIndex: dragState.startDay,
        });
        
        if (endTime - startTime >= timeIncrement) {
          const date = formatAsCalendarDate(weekDates[dragState.startDay]);
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
      document.removeEventListener('keydown', handleKeyDown);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDragState(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('keydown', handleKeyDown);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
  }, [filteredEvents, weekDates, timeIncrement, timeFormat, setCreateEventData, setCreateEventDialog]);

  // Handle dragging existing events and multi-select
  const handleEventMouseDown = useCallback((e: React.MouseEvent, event: ScheduleEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Ignore right clicks
    if (e.button !== 0) return;
    
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



    // Clear any existing selections when not in multi-select mode
    setSelectedEvents(new Set());



    // Set up drag immediately
    const eventDate = event.date;
    const dayIndex = weekDates.findIndex((date: Date) => formatAsCalendarDate(date) === eventDate);
    
    if (dayIndex === -1) return;

    const startMinutes = timeToMinutes(event.startTime);
    const rect = calendarRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate the event's current position on screen
    const eventLeft = 64 + ((rect.width - 64) * dayIndex / 7);
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

    console.log('🎯 Drag initialized:', {
      eventId: event.id,
      dayIndex,
      startMinutes,
      offset: draggedEvent.offset,
      eventLeft,
      eventTop,
      clickX,
      clickY
    });

    setDraggedEvent(draggedEvent);

    let hasStartedDragging = false;
    let currentDragPosition = { dayIndex: draggedEvent.originalPosition.dayIndex, startMinutes: draggedEvent.originalPosition.startMinutes };
    const moveThreshold = 1; // pixels - reduced threshold for better responsiveness

    const handleMouseMove = (e: MouseEvent) => {
        if (!hasStartedDragging) {
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

        // Calculate day index from event position using round for symmetric left/right movement
        const newDayIndex = Math.round((eventX - 64) / ((newRect.width - 64) / 7));
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

        // Update the dragged event position for visual feedback
        setDraggedEvent(prev => prev ? {
          ...prev,
          currentPosition: currentDragPosition,
        } : null);

        // Optimistically update the event in the cache for instant visual feedback while dragging
        const newDate = formatAsCalendarDate(weekDates[currentDragPosition.dayIndex]);
        
        // For all-day events, only update the date, keep times as-is
        let startTime, endTime;
        if (event.isAllDay) {
          startTime = event.startTime;
          endTime = event.endTime;
        } else {
          startTime = formatTime(currentDragPosition.startMinutes) + ':00';
          const duration = timeToMinutes(event.endTime) - timeToMinutes(event.startTime);
          endTime = formatTime(currentDragPosition.startMinutes + duration) + ':00';
        }

        queryClient.setQueriesData(
          { queryKey: ['/api/projects', projectId, 'schedule-events'] },
          (old: ScheduleEvent[] | undefined) => {
            const updated = old?.map((e: ScheduleEvent) => 
              e.id === event.id ? { 
                ...e, 
                date: newDate,
                startTime,
                endTime
              } : e
            ) || [];
            return updated;
          }
        );
      };

      const handleMouseUp = () => {
        console.log('Mouse up triggered, hasStartedDragging:', hasStartedDragging, 'currentDragPosition:', currentDragPosition);
        console.log('draggedEvent:', draggedEvent);
        
        if (hasStartedDragging && draggedEvent) {
          // Mark this event as just dragged to prevent popover opening
          setJustDragged(event.id);
          setTimeout(() => setJustDragged(null), 200);
          
          // Update event position using the current drag position
          const newDate = formatAsCalendarDate(weekDates[currentDragPosition.dayIndex]);
          
          // For all-day events, keep original times and only update the date
          let startTime, endTime;
          if (event.isAllDay) {
            startTime = event.startTime;
            endTime = event.endTime;
          } else {
            // Format time with seconds for database storage
            startTime = formatTime(currentDragPosition.startMinutes) + ':00';
            const duration = timeToMinutes(event.endTime) - timeToMinutes(event.startTime);
            endTime = formatTime(currentDragPosition.startMinutes + duration) + ':00';
          }

          const eventData = {
            date: newDate,
            startTime,
            endTime,
            fromDrag: true, // Flag to indicate this is a drag operation
          };

          console.log('🎯 About to save drag update:', {
            eventId: event.id,
            originalDate: event.date,
            originalStartTime: event.startTime,
            originalEndTime: event.endTime,
            newDate,
            newStartTime: startTime,
            newEndTime: endTime,
            eventData
          });

          // Cache is already updated during drag, no need to update again
          console.log('💾 Cache already updated during drag for event', event.id);

          // Use the mutation for backend update
          console.log('🚀 Calling updateEventMutation.mutate()');
          updateEventMutation.mutate({
            eventId: event.id,
            eventData
          });
          console.log('✅ Mutation called');


        } else {
          console.log('❌ Drag cancelled - hasStartedDragging:', hasStartedDragging, 'draggedEvent:', !!draggedEvent);
        }

        setDraggedEvent(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);


  }, [weekDates, filteredEvents, timeIncrement, updateEventMutation, justDragged, selectedEvents]);

  // Handle event resize
  const handleResizeStart = useCallback((e: React.MouseEvent, event: ScheduleEvent, edge: 'start' | 'end') => {
    console.log('🎯 Resize started:', { eventId: event.id, edge, startTime: event.startTime, endTime: event.endTime });
    e.preventDefault();
    e.stopPropagation();

    const originalStartMinutes = timeToMinutes(event.startTime);
    const originalEndMinutes = timeToMinutes(event.endTime);

    const resizingData = {
      event,
      edge,
      originalStartMinutes,
      originalEndMinutes,
    };
    
    setResizingEvent(resizingData);
    resizingEventRef.current = resizingData;

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
      const updatedEvent = { ...resizingEventRef.current!.event, startTime: newStartTime, endTime: newEndTime };
      setResizingEvent(prev => prev ? {
        ...prev,
        event: updatedEvent,
      } : null);
      resizingEventRef.current!.event = updatedEvent;
    };

    const handleMouseUp = () => {
      console.log('🎯 Resize mouse up, resizingEventRef.current:', resizingEventRef.current);
      if (resizingEventRef.current) {
        // Mark this event as just resized to prevent popover opening
        setJustResized(event.id);
        setTimeout(() => setJustResized(null), 200);
        
        const eventData = {
          startTime: resizingEventRef.current.event.startTime + ':00',
          endTime: resizingEventRef.current.event.endTime + ':00',
        };

        // Optimistically update the cache immediately for instant visual feedback
        queryClient.setQueriesData(
          { queryKey: ['/api/projects', projectId, 'schedule-events'] },
          (old: ScheduleEvent[] | undefined) => {
            return old?.map((e: ScheduleEvent) => 
              e.id === event.id ? { ...e, startTime: eventData.startTime, endTime: eventData.endTime } : e
            ) || [];
          }
        );

        console.log('🚀 Calling resize mutation with data:', {
          eventId: event.id,
          eventData
        });

        // Use the mutation for proper error handling and cache management
        updateEventMutation.mutate({
          eventId: event.id,
          eventData
        });
      }

      setResizingEvent(null);
      resizingEventRef.current = null;
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
          className="absolute right-2 text-xs text-gray-500"
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
        className="absolute left-0 right-0 border-t border-gray-100"
        style={{ top: `${position}px` }}
      />
    );
  }

  return (
    <>
      <div>
        {/* Removed individual header - using unified main page header */}

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
          {/* Header row - fixed, no scroll */}
          <div className="relative bg-gray-50 border-b border-gray-200" style={{ height: '24px' }}>
            <div 
              style={{ 
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '64px',
                height: '24px',
                minHeight: '24px', 
                maxHeight: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                backgroundColor: '#f9fafb',
                borderRight: '1px solid #e5e7eb',
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
            {weekDates.map((date, dayIndex) => {
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div 
                  key={dayIndex} 
                  className="cursor-pointer transition-colors hover:bg-blue-50 border-l border-gray-200"
                  style={{
                    position: 'absolute',
                    left: `calc(64px + (100% - 64px) * ${dayIndex} / 7)`,
                    width: `calc((100% - 64px) / 7)`,
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
                  }}
                  onClick={() => onDateClick(date)}
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
                      {date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}
                    </span>
                    {isToday ? (
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
                          {date.getDate()}
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
                        {date.getDate()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* All Day Events Section - fixed, no scroll */}
          {showAllDayEvents && (
            <div className="relative min-h-[60px] bg-gray-50 border-b border-gray-200">
              <div 
                className="absolute left-0 top-0 bottom-0 bg-gray-50 border-r border-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 select-none"
                style={{ width: '64px', minHeight: '60px' }}
              >
                All Day
              </div>
              {weekDates.map((date, dayIndex) => {
                const dayEvents = filteredEvents.filter(event => 
                  event.date === formatAsCalendarDate(date) && event.isAllDay
                );
                return (
                  <div 
                    key={dayIndex} 
                    className="absolute top-0 bottom-0 p-2 space-y-1 border-l border-gray-200"
                    style={{
                      left: `calc(64px + (100% - 64px) * ${dayIndex} / 7)`,
                      width: `calc((100% - 64px) / 7)`,
                    }}
                  >
                    {dayEvents.map(event => {
                      const handleAllDayMouseDown = (e: React.MouseEvent) => {
                        if (e.button !== 0) return; // Ignore right clicks
                        
                        // Prevent text selection when holding down
                        e.preventDefault();
                        
                        // Handle Shift+click for multi-selection
                        if (e.shiftKey) {
                          e.stopPropagation();
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
                        
                        // Immediately initiate drag (same as regular events)
                        setOpenPopoverId(null); // Close any open popover
                        handleEventMouseDown(e, event);
                      };
                      
                      const handleAllDayMouseUp = () => {
                        // Don't open popover if currently dragging or just finished dragging
                        const isCurrentlyDragging = draggedEvent?.event.id === event.id;
                        const wasJustDragged = justDragged === event.id;
                        
                        // Don't open popover during multi-select mode
                        if (isShiftPressed || selectedEvents.size > 0) return;
                        
                        if (!isCurrentlyDragging && !wasJustDragged) {
                          // Normal click - toggle popover
                          setOpenPopoverId(openPopoverId === event.id ? null : event.id);
                        }
                      };
                      
                      return (
                        <Popover 
                          key={event.id} 
                          open={openPopoverId === event.id} 
                          onOpenChange={(open) => {
                            // Don't open popover if event was just dragged or resized
                            if (open && (justDragged === event.id || justResized === event.id)) return;
                            // Don't open popover during multi-select mode
                            if (open && (isShiftPressed || selectedEvents.size > 0)) return;
                            setOpenPopoverId(open ? event.id : null);
                          }}
                        >
                          <PopoverTrigger asChild>
                            <div
                              className={`${getEventColor(event.type)} text-white text-xs p-1 rounded cursor-pointer hover:opacity-80 select-none ${
                                selectedEvents.has(event.id) ? 'ring-2 ring-yellow-400' : ''
                              }`}
                              onMouseDown={handleAllDayMouseDown}
                              onMouseUp={handleAllDayMouseUp}
                            >
                              {event.title}
                            </div>
                          </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="start">
                          <div className="p-4 space-y-3">
                            {/* Event Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: getEventTypeColorFromDatabase(event.type, eventTypes) }}
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
                                <span>{getEventTypeDisplayName(event.type, eventTypes, event.eventTypeId)}</span>
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
                                  <PopoverContent className="w-72 p-0 max-h-80 overflow-y-auto" align="start">
                                    <div className="p-4 space-y-3">
                                      <h4 className="font-medium text-sm">People Called</h4>
                                      <div className="space-y-3">
                                        {(() => {
                                          // Group participants by contact group name
                                          const participantsByGroup = event.participants.reduce((acc, participant) => {
                                            // Find the contact details from the contacts array for group and role
                                            const contact = contacts.find(c => c.id === participant.contactId);
                                            const groupName = contact?.contactGroup?.name || 'Unassigned';
                                            
                                            if (!acc[groupName]) {
                                              acc[groupName] = [];
                                            }
                                            acc[groupName].push({
                                              ...participant,
                                              contactName: `${participant.contactFirstName || contact?.firstName || ''} ${participant.contactLastName || contact?.lastName || ''}`.trim() || 'Unknown',
                                              contactRole: contact?.role
                                            });
                                            return acc;
                                          }, {} as Record<string, any[]>);

                                          // Sort groups alphabetically, with Unassigned at the end
                                          const sortedGroups = Object.keys(participantsByGroup).sort((a, b) => {
                                            if (a === 'Unassigned') return 1;
                                            if (b === 'Unassigned') return -1;
                                            return a.localeCompare(b);
                                          });

                                          return sortedGroups.map(groupName => (
                                            <div key={groupName} className="space-y-1">
                                              <div className="text-xs font-medium text-gray-800 border-b border-gray-200 pb-1">
                                                {groupName}
                                              </div>
                                              {participantsByGroup[groupName].map(participant => (
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
                );
              })}
            </div>
          )}

          {/* Scrollable calendar content */}
          <div 
            className="overflow-y-auto scrollbar-hide" 
            style={{ 
              maxHeight: '600px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            <div 
              ref={scrollContainerRef}
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
                style={{ width: '64px' }}
              >
                {/* Time labels */}
                {timeLabels}
              </div>

              {/* Day columns */}
              {Array.from({ length: 7 }, (_, dayIndex) => (
                <div
                  key={dayIndex}
                  className="absolute top-0 bottom-0 hover:bg-blue-50/30 cursor-crosshair border-l border-gray-200"
                  style={{
                    left: `calc(64px + (100% - 64px) * ${dayIndex} / 7)`,
                    width: `calc((100% - 64px) / 7)`,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, dayIndex)}
                  onContextMenu={(e) => e.preventDefault()}
                />
              ))}

              {/* Time increment grid lines */}
              {incrementLines}

              {/* Events */}
              {filteredEvents
                .filter(event => !event.isAllDay)
                .map(event => {
                  const eventDate = event.date;
                  let dayIndex = weekDates.findIndex((date: Date) => formatAsCalendarDate(date) === eventDate);
                  
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

                  // Calculate duration in minutes
                  const durationMinutes = endMinutes - startMinutes;
                  const isShortEvent = durationMinutes <= 15;
                  const isVeryShortEvent = durationMinutes <= 10;
                  const isCompactEvent = durationMinutes <= 30; // Time on same line as title
                  const isCenterableShortEvent = durationMinutes >= 5 && durationMinutes <= 30;
                  const isCenterableMediumEvent = durationMinutes > 30 && durationMinutes <= 60; // Stacked layout but centered

                  // Get layout for overlapping events
                  const dayLayouts = eventLayoutsByDay.get(dayIndex);
                  const eventLayout = dayLayouts?.get(event.id);
                  const hasOverlap = eventLayout && eventLayout.totalColumns > 1;
                  
                  // Calculate width and left position based on overlap layout
                  const dayColumnWidth = `calc((100% - 64px) / 7)`;
                  const baseLeft = `calc(64px + (100% - 64px) * ${displayDayIndex} / 7)`;
                  
                  let eventLeft: string;
                  let eventWidth: string;
                  
                  if (hasOverlap && eventLayout) {
                    // Overlapping event: position within its column
                    const columnWidthPercent = eventLayout.width;
                    const columnLeftPercent = eventLayout.left;
                    eventLeft = `calc(${baseLeft} + ${dayColumnWidth} * ${columnLeftPercent / 100} + 1px)`;
                    eventWidth = `calc(${dayColumnWidth} * ${columnWidthPercent / 100} - 2px)`;
                  } else {
                    // Non-overlapping event: use full width
                    eventLeft = `calc(${baseLeft} + 2px)`;
                    eventWidth = `calc(${dayColumnWidth} - 4px)`;
                  }

                  return (
                    <Popover 
                      key={event.id} 
                      open={openPopoverId === event.id} 
                      onOpenChange={(open) => {
                        // Don't open popover if this event was just dragged or resized
                        if (open && (justDragged === event.id || justResized === event.id)) return;
                        // Don't open popover during multi-select mode
                        if (open && (isShiftPressed || selectedEvents.size > 0)) return;
                        setOpenPopoverId(open ? event.id : null);
                      }}
                    >
                      <PopoverTrigger asChild>
                        <div
                          className={`absolute text-sm rounded-md shadow-sm cursor-pointer hover:opacity-90 z-30 ${
                            isLightColor(eventTypeColor) ? 'text-gray-900' : 'text-white'
                          } ${selectedEvents.has(event.id) ? 'ring-2 ring-yellow-400' : ''
                          } ${draggedEvent?.event.id === event.id && draggedEvent.isDragging ? 'opacity-50' : ''
                          } ${isCenterableShortEvent && !hasOverlap ? 'flex items-center' : ''
                          } ${isCenterableMediumEvent && !hasOverlap ? 'flex flex-col justify-center' : ''}`}
                          style={{
                            left: eventLeft,
                            width: eventWidth,
                            top: `${resizedTop}px`,
                            height: `${Math.max(20, displayHeight)}px`,
                            minHeight: '20px',
                            backgroundColor: eventTypeColor,
                            border: `1px solid ${darkenColor(eventTypeColor, 25)}`,
                            overflow: 'hidden',
                            padding: (isCenterableShortEvent && !hasOverlap) ? '0 8px' : (isVeryShortEvent ? '2px 4px' : ((isCenterableMediumEvent && !hasOverlap) ? '4px 8px' : '4px 6px')),
                          }}
                          onMouseDown={(e) => handleEventMouseDown(e, event)}
                          onContextMenu={(e) => e.preventDefault()}
                        >
                          {isCompactEvent ? (
                            <div className={`flex items-center gap-1 ${hasOverlap ? 'flex-col items-start' : 'truncate'}`}>
                              <span className={`font-medium leading-tight ${hasOverlap ? 'line-clamp-2' : 'truncate'}`} style={{ wordBreak: hasOverlap ? 'break-word' : undefined }}>{event.title}</span>
                              {!hasOverlap && (
                                <span className="text-xs opacity-90 flex-shrink-0">{(() => {
                                  if (draggedEvent?.event.id === event.id && draggedEvent.isDragging) {
                                    const dragStartMinutes = draggedEvent.currentPosition.startMinutes;
                                    const duration = endMinutes - startMinutes;
                                    const dragEndMinutes = dragStartMinutes + duration;
                                    return `${formatTimeDisplay(formatTime(dragStartMinutes), timeFormat as '12' | '24')} - ${formatTimeDisplay(formatTime(dragEndMinutes), timeFormat as '12' | '24')}`;
                                  }
                                  return `${formatTimeDisplay(formatTime(startMinutes), timeFormat as '12' | '24')} - ${formatTimeDisplay(formatTime(endMinutes), timeFormat as '12' | '24')}`;
                                })()}</span>
                              )}
                              {hasOverlap && (
                                <span className="text-xs opacity-90 leading-tight">{(() => {
                                  if (draggedEvent?.event.id === event.id && draggedEvent.isDragging) {
                                    const dragStartMinutes = draggedEvent.currentPosition.startMinutes;
                                    return formatTimeDisplay(formatTime(dragStartMinutes), timeFormat as '12' | '24');
                                  }
                                  return formatTimeDisplay(formatTime(startMinutes), timeFormat as '12' | '24');
                                })()}</span>
                              )}
                            </div>
                          ) : (
                            <div className={hasOverlap ? 'overflow-hidden' : ''}>
                              <div className={`font-medium ${hasOverlap ? 'break-words' : 'truncate'}`}>{event.title}</div>
                              <div className={`text-xs opacity-90 mt-0.5 ${hasOverlap ? 'break-words' : 'truncate'}`}>
                                {(() => {
                                  if (draggedEvent?.event.id === event.id && draggedEvent.isDragging) {
                                    const dragStartMinutes = draggedEvent.currentPosition.startMinutes;
                                    const duration = endMinutes - startMinutes;
                                    const dragEndMinutes = dragStartMinutes + duration;
                                    return `${formatTimeDisplay(formatTime(dragStartMinutes), timeFormat as '12' | '24')} - ${formatTimeDisplay(formatTime(dragEndMinutes), timeFormat as '12' | '24')}`;
                                  }
                                  return `${formatTimeDisplay(formatTime(startMinutes), timeFormat as '12' | '24')} - ${formatTimeDisplay(formatTime(endMinutes), timeFormat as '12' | '24')}`;
                                })()}
                              </div>
                            </div>
                          )}
                          
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
                                  : `${formatTimeDisplay(formatTime(startMinutes), timeFormat as '12' | '24').replace(':00', '')} - ${formatTimeDisplay(formatTime(endMinutes), timeFormat as '12' | '24').replace(':00', '')}`
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
                              <span>{getEventTypeDisplayName(event.type, eventTypes, event.eventTypeId)}</span>
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
                                <PopoverContent className="w-72 p-0 max-h-80 overflow-y-auto" align="start">
                                  <div className="p-4 space-y-3">
                                    <h4 className="font-medium text-sm">People Called</h4>
                                    <div className="space-y-3">
                                      {(() => {
                                        // Group participants by contact group name
                                        const participantsByGroup = event.participants.reduce((acc, participant) => {
                                          // Find the contact details from the contacts array for group and role
                                          const contact = contacts.find(c => c.id === participant.contactId);
                                          const groupName = contact?.contactGroup?.name || 'Unassigned';
                                          
                                          if (!acc[groupName]) {
                                            acc[groupName] = [];
                                          }
                                          acc[groupName].push({
                                            ...participant,
                                            contactName: `${participant.contactFirstName || contact?.firstName || ''} ${participant.contactLastName || contact?.lastName || ''}`.trim() || 'Unknown',
                                            contactRole: contact?.role
                                          });
                                          return acc;
                                        }, {} as Record<string, any[]>);

                                        // Sort groups alphabetically, with Unassigned at the end
                                        const sortedGroups = Object.keys(participantsByGroup).sort((a, b) => {
                                          if (a === 'Unassigned') return 1;
                                          if (b === 'Unassigned') return -1;
                                          return a.localeCompare(b);
                                        });

                                        return sortedGroups.map(groupName => (
                                          <div key={groupName} className="space-y-1">
                                            <div className="text-xs font-medium text-gray-800 border-b border-gray-200 pb-1">
                                              {groupName}
                                            </div>
                                            {participantsByGroup[groupName].map(participant => (
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

              {/* Drag preview overlay for new events - FIXED POSITIONING */}
              {dragState?.isActive && (
                <div
                  className="absolute text-xs text-white rounded bg-gray-500 opacity-60 pointer-events-none z-30"
                  style={{
                    left: `calc(64px + (100% - 64px) * ${dragState.startDay} / 7 + 2px)`,
                    width: `calc((100% - 64px) / 7 - 4px)`,
                    top: `${minutesToPosition(Math.min(dragState.startTime, dragState.currentTime))}px`,
                    height: `${Math.abs(minutesToPosition(dragState.currentTime) - minutesToPosition(dragState.startTime))}px`,
                    minHeight: '20px',
                  }}
                >
                  <div className="px-2 py-1 h-full flex flex-col justify-start">
                    <div className="font-medium truncate">New Event</div>
                    <div className="text-xs opacity-90 truncate">
                      {formatTimeDisplay(formatTime(Math.min(dragState.startTime, dragState.currentTime)), timeFormat as '12' | '24')} - {formatTimeDisplay(formatTime(Math.max(dragState.startTime, dragState.currentTime)), timeFormat as '12' | '24')}
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Event Modal - Hidden in weekly view as parent handles it */}

      {/* Edit Event Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-6">
            {editingEvent && (
              <EventForm
                projectId={projectId}
                contacts={contacts}
                eventTypes={eventTypes}
                initialDate={editingEvent.date}
                onSubmit={(data) => updateEventMutation.mutate({ eventId: editingEvent.id, eventData: data })}
                onCancel={() => setEditingEvent(null)}
                timeFormat={showSettings?.scheduleSettings?.timeFormat || '12'}
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
                  isProductionLevel: editingEvent.isProductionLevel,
                  participantIds: editingEvent.participants.map(p => p.contactId),
                }}
              />
            )}
          </div>
          
          <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0 mt-auto">
            <div className="flex justify-between items-center">
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => {
                  if (editingEvent && confirm('Are you sure you want to delete this event?')) {
                    deleteEventMutation.mutate(editingEvent.id);
                    setEditingEvent(null);
                  }
                }}
                disabled={deleteEventMutation.isPending}
                data-testid="button-delete-event"
              >
                {deleteEventMutation.isPending ? "Deleting..." : "Delete Event"}
              </Button>
              <div className="flex space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingEvent(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  form="event-form"
                  disabled={updateEventMutation.isPending}
                  data-testid="button-save-event"
                >
                  {updateEventMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                {contact.firstName} {contact.lastName} ({contact.role || contact.contactGroup?.name || 'Unassigned'})
              </Label>
            </div>
          ))}
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
                {contact.firstName} {contact.lastName} ({contact.role || contact.contactGroup?.name || 'Unassigned'})
              </Label>
            </div>
          ))}
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

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Changes</Button>
      </div>
    </form>
  );
}