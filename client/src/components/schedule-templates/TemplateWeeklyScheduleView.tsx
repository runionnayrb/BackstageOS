import { useState, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock, MapPin, Edit, Trash2 } from "lucide-react";
import { formatTimeDisplay, parseScheduleSettings } from "@/lib/timeUtils";
import { getEventTypeColorFromDatabase, isLightColor, darkenColor } from "@/lib/eventUtils";
import { calculateEventLayouts } from "@/lib/scheduleUtils";
import TemplateEventForm from "./TemplateEventForm";

interface ScheduleTemplateEvent {
  id: number;
  templateId: number;
  dayOfWeek: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  type: string;
  eventTypeId: number | null;
  location: string | null;
  notes: string | null;
  isAllDay: boolean;
  isProductionLevel: boolean;
  participants?: Array<{
    id: number;
    contactId: number;
    contact: {
      id: number;
      firstName: string;
      lastName: string;
    };
  }>;
}

interface EventType {
  id: number;
  name: string;
  color: string;
  isDefault?: boolean;
}

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  category: string;
  role?: string;
  contactGroup?: {
    id: number;
    name: string;
  };
}

interface TemplateWeeklyScheduleViewProps {
  templateId: number;
  projectId: number;
  weekStartDay: number;
  timeIncrement?: 15 | 30 | 60;
  timeFormat?: '12' | '24';
}

// Default time range constants (will be overridden by scheduleSettings)
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 24;

const DEFAULT_DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function TemplateWeeklyScheduleView({ 
  templateId, 
  projectId, 
  weekStartDay,
  timeIncrement = 30,
  timeFormat = '12'
}: TemplateWeeklyScheduleViewProps) {
  const calendarRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [dragState, setDragState] = useState<{
    isActive: boolean;
    startDay: number;
    startTime: number;
    currentDay: number;
    currentTime: number;
  } | null>(null);
  
  const [draggedEvent, setDraggedEvent] = useState<{
    event: ScheduleTemplateEvent;
    originalPosition: { dayIndex: number; startMinutes: number };
    currentPosition: { dayIndex: number; startMinutes: number };
    isDragging: boolean;
  } | null>(null);
  
  const [resizingEvent, setResizingEvent] = useState<{
    event: ScheduleTemplateEvent;
    edge: 'start' | 'end';
    originalStartMinutes: number;
    originalEndMinutes: number;
  } | null>(null);
  
  const resizingEventRef = useRef<typeof resizingEvent>(null);
  const [openPopoverId, setOpenPopoverId] = useState<number | null>(null);
  const openPopoverIdRef = useRef<number | null>(null);
  
  const updateOpenPopoverId = useCallback((newId: number | null) => {
    openPopoverIdRef.current = newId;
    setOpenPopoverId(newId);
  }, []);
  const [justDragged, setJustDragged] = useState<number | null>(null);
  const [editingEvent, setEditingEvent] = useState<ScheduleTemplateEvent | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [newEventDefaults, setNewEventDefaults] = useState<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  } | null>(null);

  const eventsQueryKey = `/api/schedule-templates/${templateId}/events`;
  
  const { data: events = [], isLoading } = useQuery<ScheduleTemplateEvent[]>({
    queryKey: [eventsQueryKey],
  });

  const { data: eventTypes = [] } = useQuery<EventType[]>({
    queryKey: [`/api/projects/${projectId}/event-types`],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: [`/api/projects/${projectId}/contacts`],
  });

  // Fetch project settings for time range configuration
  const { data: projectSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Parse schedule settings for time range
  const scheduleSettings = parseScheduleSettings((projectSettings as any)?.scheduleSettings);
  const { dayStartHour, dayEndHour } = scheduleSettings;

  // Calculate dynamic time range based on settings (supports 28-hour day for theater)
  const START_HOUR = dayStartHour ?? DEFAULT_START_HOUR;
  const END_HOUR = dayEndHour ?? DEFAULT_END_HOUR;
  const START_MINUTES = START_HOUR * 60;
  const END_MINUTES = END_HOUR * 60;
  const TOTAL_MINUTES = END_MINUTES - START_MINUTES;

  const orderedDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayIndex = (weekStartDay + i) % 7;
      days.push({
        index: dayIndex,
        name: DEFAULT_DAY_ORDER[dayIndex],
        shortName: DEFAULT_DAY_ORDER[dayIndex].slice(0, 2),
      });
    }
    return days;
  }, [weekStartDay]);

  const createEventMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", `/api/schedule-templates/${templateId}/events`, data),
    onMutate: async (eventData: any) => {
      await queryClient.cancelQueries({ queryKey: [eventsQueryKey] });
      const previousEvents = queryClient.getQueryData<ScheduleTemplateEvent[]>([eventsQueryKey]);
      
      const optimisticEvent: ScheduleTemplateEvent = {
        id: Date.now(),
        templateId,
        title: eventData.title || 'New Event',
        description: eventData.description || null,
        dayOfWeek: eventData.dayOfWeek,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        type: eventData.type || 'other',
        eventTypeId: eventData.eventTypeId || null,
        location: eventData.location || null,
        notes: eventData.notes || null,
        isAllDay: eventData.isAllDay || false,
        participants: eventData.participantIds?.map((id: number) => {
          const contact = contacts.find(c => c.id === id);
          if (!contact) return null;
          return {
            id: Date.now() + id,
            contactId: id,
            contact: { id: contact.id, firstName: contact.firstName, lastName: contact.lastName }
          };
        }).filter(Boolean) || []
      };
      
      queryClient.setQueryData<ScheduleTemplateEvent[]>([eventsQueryKey], (old) => 
        old ? [...old, optimisticEvent] : [optimisticEvent]
      );
      
      return { previousEvents, optimisticEvent };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [eventsQueryKey], refetchType: 'all' });
      setIsCreatingEvent(false);
      setNewEventDefaults(null);
    },
    onError: (_error, _eventData, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData([eventsQueryKey], context.previousEvents);
      }
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & any) =>
      apiRequest("PATCH", `/api/schedule-template-events/${id}`, data),
    onMutate: async ({ id, ...eventData }) => {
      await queryClient.cancelQueries({ queryKey: [eventsQueryKey] });
      const previousEvents = queryClient.getQueryData<ScheduleTemplateEvent[]>([eventsQueryKey]);
      
      queryClient.setQueryData<ScheduleTemplateEvent[]>([eventsQueryKey], (old) =>
        old?.map(event => 
          event.id === id ? { ...event, ...eventData } : event
        ) || []
      );
      
      return { previousEvents };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [eventsQueryKey], refetchType: 'all' });
      setEditingEvent(null);
    },
    onError: (_error, _variables, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData([eventsQueryKey], context.previousEvents);
      }
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/schedule-template-events/${id}`),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: [eventsQueryKey] });
      const previousEvents = queryClient.getQueryData<ScheduleTemplateEvent[]>([eventsQueryKey]);
      
      queryClient.setQueryData<ScheduleTemplateEvent[]>([eventsQueryKey], (old) =>
        old?.filter(event => event.id !== id) || []
      );
      
      return { previousEvents };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [eventsQueryKey], refetchType: 'all' });
      setEditingEvent(null);
    },
    onError: (_error, _id, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData([eventsQueryKey], context.previousEvents);
      }
    },
  });

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
    return Math.max(0, minutes - START_MINUTES);
  };

  const positionToMinutes = (position: number) => {
    const minutes = Math.max(START_MINUTES, Math.min(END_MINUTES - 1, Math.round(position + START_MINUTES)));
    return minutes;
  };

  const snapToIncrement = (minutes: number) => {
    return Math.round(minutes / timeIncrement) * timeIncrement;
  };

  const getEventColor = (event: ScheduleTemplateEvent) => {
    if (event.eventTypeId && eventTypes.length > 0) {
      const type = eventTypes.find(t => t.id === event.eventTypeId);
      if (type) return type.color;
    }
    return getEventTypeColorFromDatabase(event.type, eventTypes);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, dayIndex: number) => {
    if (e.button !== 0) return;
    e.preventDefault();
    
    const rect = calendarRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const y = e.clientY - rect.top;
    const startMinutes = snapToIncrement(positionToMinutes(y));
    const actualDayIndex = orderedDays[dayIndex].index;
    
    setDragState({
      isActive: true,
      startDay: dayIndex,
      startTime: startMinutes,
      currentDay: dayIndex,
      currentTime: startMinutes + timeIncrement,
    });
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!calendarRef.current) return;
      const rect = calendarRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const currentMinutes = snapToIncrement(positionToMinutes(y));
      
      setDragState(prev => prev ? {
        ...prev,
        currentTime: Math.max(currentMinutes, prev.startTime + timeIncrement),
      } : null);
    };
    
    const handleMouseUp = () => {
      setDragState(prev => {
        if (prev) {
          const startTime = Math.min(prev.startTime, prev.currentTime);
          const endTime = Math.max(prev.startTime, prev.currentTime);
          
          if (endTime - startTime >= timeIncrement) {
            setNewEventDefaults({
              dayOfWeek: actualDayIndex,
              startTime: formatTime(startTime),
              endTime: formatTime(endTime),
            });
            setIsCreatingEvent(true);
          }
        }
        return null;
      });
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [orderedDays, timeIncrement]);

  const handleEventMouseDown = useCallback((e: React.MouseEvent, event: ScheduleTemplateEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    let hasStartedDragging = false;
    
    const startMinutes = timeToMinutes(event.startTime);
    const dayIndex = orderedDays.findIndex(d => d.index === event.dayOfWeek);
    const duration = timeToMinutes(event.endTime) - timeToMinutes(event.startTime);
    
    const rect = calendarRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const eventLeft = 64 + ((rect.width - 64) * dayIndex / 7);
    const eventTop = minutesToPosition(startMinutes);
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top + (scrollContainerRef.current?.scrollTop || 0);
    
    const initialDragState = {
      event,
      originalPosition: { dayIndex, startMinutes },
      currentPosition: { dayIndex, startMinutes },
      offset: { x: clickX - eventLeft, y: clickY - eventTop },
      isDragging: false,
    };
    
    setDraggedEvent(initialDragState);
    
    let currentDragPosition = { dayIndex, startMinutes };
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      if (!hasStartedDragging && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        hasStartedDragging = true;
        updateOpenPopoverId(null);
        setDraggedEvent(prev => prev ? { ...prev, isDragging: true } : null);
      }
      
      if (hasStartedDragging && calendarRef.current) {
        const newRect = calendarRef.current.getBoundingClientRect();
        const scrollTop = scrollContainerRef.current?.scrollTop || 0;
        
        const mouseX = e.clientX - newRect.left;
        const mouseY = e.clientY - newRect.top + scrollTop;
        
        const eventX = mouseX - initialDragState.offset.x;
        const eventY = mouseY - initialDragState.offset.y;
        
        const newDayIndex = Math.round((eventX - 64) / ((newRect.width - 64) / 7));
        const constrainedDayIndex = Math.max(0, Math.min(6, newDayIndex));
        const newStartMinutes = snapToIncrement(positionToMinutes(eventY));
        
        currentDragPosition = { dayIndex: constrainedDayIndex, startMinutes: newStartMinutes };
        
        queryClient.setQueryData<ScheduleTemplateEvent[]>([eventsQueryKey], (old) =>
          old?.map(evt => 
            evt.id === event.id ? {
              ...evt,
              dayOfWeek: orderedDays[constrainedDayIndex].index,
              startTime: formatTime(newStartMinutes),
              endTime: formatTime(newStartMinutes + duration),
            } : evt
          ) || []
        );
        
        setDraggedEvent(prev => prev ? {
          ...prev,
          currentPosition: currentDragPosition,
          isDragging: true,
        } : null);
      }
    };
    
    const handleMouseUp = () => {
      if (hasStartedDragging) {
        const newDayOfWeek = orderedDays[currentDragPosition.dayIndex].index;
        const newStartTime = formatTime(currentDragPosition.startMinutes);
        const newEndTime = formatTime(currentDragPosition.startMinutes + duration);
        
        updateEventMutation.mutate({
          id: event.id,
          dayOfWeek: newDayOfWeek,
          startTime: newStartTime,
          endTime: newEndTime,
        });
        
        setJustDragged(event.id);
        setTimeout(() => setJustDragged(null), 200);
        setDraggedEvent(null);
      } else {
        setDraggedEvent(null);
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [orderedDays, timeIncrement, updateEventMutation, eventsQueryKey]);

  const handleResizeStart = useCallback((e: React.MouseEvent, event: ScheduleTemplateEvent, edge: 'start' | 'end') => {
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
    
    let currentStartTime = event.startTime;
    let currentEndTime = event.endTime;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!calendarRef.current) return;
      
      const rect = calendarRef.current.getBoundingClientRect();
      const scrollTop = scrollContainerRef.current?.scrollTop || 0;
      const y = e.clientY - rect.top + scrollTop;
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
      currentStartTime = newStartTime;
      currentEndTime = newEndTime;
      
      queryClient.setQueryData<ScheduleTemplateEvent[]>([eventsQueryKey], (old) =>
        old?.map(evt => 
          evt.id === event.id ? {
            ...evt,
            startTime: newStartTime,
            endTime: newEndTime,
          } : evt
        ) || []
      );
      
      const updatedEvent = { ...resizingEventRef.current!.event, startTime: newStartTime, endTime: newEndTime };
      setResizingEvent(prev => prev ? { ...prev, event: updatedEvent } : null);
      resizingEventRef.current!.event = updatedEvent;
    };
    
    const handleMouseUp = () => {
      updateEventMutation.mutate({
        id: event.id,
        startTime: currentStartTime,
        endTime: currentEndTime,
      });
      
      setResizingEvent(null);
      resizingEventRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [timeIncrement, updateEventMutation, eventsQueryKey]);

  const openEditDialog = (event: ScheduleTemplateEvent) => {
    setEditingEvent(event);
    updateOpenPopoverId(null);
  };

  const handleCreateEvent = (data: any) => {
    createEventMutation.mutate(data);
    setIsCreatingEvent(false);
    setNewEventDefaults(null);
  };

  const handleUpdateEvent = (data: any) => {
    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, ...data });
    }
  };

  const timeLabels = useMemo(() => {
    const labels = [];
    for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += 60) {
      const position = minutesToPosition(minutes);
      const timeString = `${Math.floor(minutes / 60).toString().padStart(2, '0')}:00`;
      labels.push(
        <div
          key={minutes}
          className="absolute right-2 text-xs text-gray-500"
          style={{ top: `${position}px` }}
        >
          {formatTimeDisplay(timeString, timeFormat)}
        </div>
      );
    }
    return labels;
  }, [timeFormat]);

  const incrementLines = useMemo(() => {
    const lines = [];
    for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += timeIncrement) {
      const position = minutesToPosition(minutes);
      lines.push(
        <div
          key={`increment-${minutes}`}
          className="absolute left-0 right-0 border-t border-gray-100"
          style={{ top: `${position}px` }}
        />
      );
    }
    return lines;
  }, [timeIncrement]);

  const eventLayoutsByDay = useMemo(() => {
    const layoutsByDay: Map<number, Map<number, { column: number; totalColumns: number; width: number; left: number }>> = new Map();
    
    orderedDays.forEach((day) => {
      const dayEvents = events
        .filter(event => event.dayOfWeek === day.index && !event.isAllDay)
        .map(event => ({
          id: event.id,
          startTime: event.startTime,
          endTime: event.endTime,
          isAllDay: event.isAllDay
        }));
      
      const layouts = calculateEventLayouts(dayEvents);
      layoutsByDay.set(day.index, layouts);
    });
    
    return layoutsByDay;
  }, [events, orderedDays]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="border border-gray-200 rounded-lg overflow-hidden h-full flex flex-col">
        {/* Header row */}
        <div className="relative bg-gray-50 border-b border-gray-200 flex-shrink-0" style={{ height: '24px' }}>
          <div 
            style={{ 
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '64px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f9fafb',
              borderRight: '1px solid #e5e7eb',
            }}
          >
            <span className="text-xs font-bold text-gray-500">TIME</span>
          </div>
          {orderedDays.map((day, dayIndex) => (
            <div 
              key={day.index}
              className="border-l border-gray-200"
              style={{
                position: 'absolute',
                left: `calc(64px + (100% - 64px) * ${dayIndex} / 7)`,
                width: `calc((100% - 64px) / 7)`,
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f9fafb',
              }}
            >
              <span className="text-sm font-bold text-gray-600 sm:hidden">{day.shortName}</span>
              <span className="text-sm font-bold text-gray-600 hidden sm:inline">{day.name}</span>
            </div>
          ))}
        </div>

        {/* All Day Events Section */}
        <div className="relative min-h-[40px] bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div 
            className="absolute left-0 top-0 bottom-0 bg-gray-50 border-r border-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 select-none"
            style={{ width: '64px' }}
          >
            All Day
          </div>
          {orderedDays.map((day, dayIndex) => {
            const dayEvents = events.filter(event => event.dayOfWeek === day.index && event.isAllDay);
            return (
              <div 
                key={day.index}
                className="absolute top-0 bottom-0 p-1 space-y-1 border-l border-gray-200"
                style={{
                  left: `calc(64px + (100% - 64px) * ${dayIndex} / 7)`,
                  width: `calc((100% - 64px) / 7)`,
                }}
              >
                {dayEvents.map(event => (
                  <Popover 
                    key={event.id}
                    open={openPopoverId === event.id}
                    onOpenChange={(open) => {
                      if (open && justDragged === event.id) return;
                      updateOpenPopoverId(open ? event.id : null);
                    }}
                  >
                    <PopoverTrigger asChild>
                      <div
                        className="text-white text-xs p-1 rounded cursor-pointer hover:opacity-80 select-none truncate"
                        style={{ backgroundColor: getEventColor(event) }}
                      >
                        {event.title}
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="start">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{event.title}</h4>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEditDialog(event)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Clock className="h-3 w-3" />
                          <span>All Day</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <MapPin className="h-3 w-3" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                ))}
              </div>
            );
          })}
        </div>

        {/* Scrollable calendar content */}
        <div 
          ref={scrollContainerRef}
          className="overflow-y-auto scrollbar-hide flex-1 min-h-0" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div 
            ref={calendarRef}
            className="relative bg-white"
            style={{ height: `${TOTAL_MINUTES}px` }}
          >
            {/* Time column */}
            <div 
              className="absolute left-0 top-0 bottom-0 bg-gray-50 border-r border-gray-200 z-20"
              style={{ width: '64px' }}
            >
              {timeLabels}
            </div>

            {/* Day columns */}
            {orderedDays.map((day, dayIndex) => (
              <div
                key={day.index}
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
            {events
              .filter(event => !event.isAllDay)
              .map(event => {
                const dayIndex = orderedDays.findIndex(d => d.index === event.dayOfWeek);
                if (dayIndex === -1) return null;

                const startMinutes = timeToMinutes(event.startTime);
                const endMinutes = timeToMinutes(event.endTime);
                const height = endMinutes - startMinutes;
                const eventColor = getEventColor(event);

                const displayDayIndex = draggedEvent?.event.id === event.id ? 
                  draggedEvent.currentPosition.dayIndex : dayIndex;
                const displayTop = draggedEvent?.event.id === event.id ? 
                  minutesToPosition(draggedEvent.currentPosition.startMinutes) : 
                  minutesToPosition(startMinutes);

                const displayHeight = resizingEvent?.event.id === event.id ?
                  timeToMinutes(resizingEvent.event.endTime) - timeToMinutes(resizingEvent.event.startTime) : height;
                const resizedTop = resizingEvent?.event.id === event.id ?
                  minutesToPosition(timeToMinutes(resizingEvent.event.startTime)) : displayTop;

                const durationMinutes = endMinutes - startMinutes;
                const isShortEvent = durationMinutes <= 15;
                const isUnderOneHour = durationMinutes < 60;
                const isCenterableShortEvent = durationMinutes >= 5 && durationMinutes <= 30;

                const dayLayouts = eventLayoutsByDay.get(event.dayOfWeek);
                const layout = dayLayouts?.get(event.id);
                
                let eventWidthPercent = 100;
                let eventLeftPercent = 0;
                
                if (layout) {
                  eventWidthPercent = layout.width;
                  eventLeftPercent = layout.left;
                }

                return (
                  <Popover 
                    key={event.id}
                    open={openPopoverId === event.id}
                    onOpenChange={(open) => {
                      if (open && justDragged === event.id) return;
                      updateOpenPopoverId(open ? event.id : null);
                    }}
                  >
                    <PopoverTrigger asChild>
                      <div
                        className={`absolute text-sm rounded-md shadow-sm cursor-pointer hover:opacity-90 z-30 transition-all ${
                          isLightColor(eventColor) ? 'text-gray-900' : 'text-white'
                        } ${draggedEvent?.event.id === event.id && draggedEvent.isDragging ? 'opacity-50' : ''
                        } ${isCenterableShortEvent ? 'flex items-center' : ''}`}
                        style={{
                          left: `calc(64px + (100% - 64px) * ${displayDayIndex} / 7 + ((100% - 64px) / 7) * ${eventLeftPercent / 100} + 2px)`,
                          width: `calc(((100% - 64px) / 7) * ${eventWidthPercent / 100} - 4px)`,
                          top: `${resizedTop}px`,
                          height: `${Math.max(20, displayHeight)}px`,
                          minHeight: '20px',
                          backgroundColor: eventColor,
                          border: `1px solid ${darkenColor(eventColor, 25)}`,
                          overflow: 'hidden',
                          padding: isCenterableShortEvent ? '0 8px' : (isShortEvent ? '2px 4px' : '8px'),
                        }}
                        onMouseDown={(e) => handleEventMouseDown(e, event)}
                        onContextMenu={(e) => e.preventDefault()}
                      >
                        {isUnderOneHour ? (
                          <div className="flex items-center gap-1 truncate">
                            <span className="font-medium">{event.title}</span>
                            <span className="text-xs opacity-90">{formatTimeDisplay(event.startTime.slice(0, 5), timeFormat)} - {formatTimeDisplay(event.endTime.slice(0, 5), timeFormat)}</span>
                          </div>
                        ) : (
                          <>
                            <div className="font-medium truncate">{event.title}</div>
                            <div className="text-xs opacity-90 truncate">
                              {formatTimeDisplay(event.startTime.slice(0, 5), timeFormat)} - {formatTimeDisplay(event.endTime.slice(0, 5), timeFormat)}
                            </div>
                          </>
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
                    <PopoverContent className="w-64 p-3" align="start">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: eventColor }} />
                            <h4 className="font-medium text-sm">{event.title}</h4>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEditDialog(event)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeDisplay(event.startTime.slice(0, 5), timeFormat)} - {formatTimeDisplay(event.endTime.slice(0, 5), timeFormat)}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <MapPin className="h-3 w-3" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {event.description && (
                          <p className="text-xs text-gray-700">{event.description}</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}

            {/* Drag preview for new events */}
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
                    {formatTimeDisplay(formatTime(Math.min(dragState.startTime, dragState.currentTime)), timeFormat)} - {formatTimeDisplay(formatTime(Math.max(dragState.startTime, dragState.currentTime)), timeFormat)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Event Dialog */}
      <Dialog open={isCreatingEvent} onOpenChange={(open) => {
        if (!open) {
          setIsCreatingEvent(false);
          setNewEventDefaults(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-6">
            <TemplateEventForm
              projectId={projectId}
              eventTypes={eventTypes}
              contacts={contacts}
              onSubmit={handleCreateEvent}
              onCancel={() => {
                setIsCreatingEvent(false);
                setNewEventDefaults(null);
              }}
              showButtons={false}
              initialValues={newEventDefaults ? {
                dayOfWeek: newEventDefaults.dayOfWeek,
                startTime: newEventDefaults.startTime,
                endTime: newEventDefaults.endTime,
              } : undefined}
            />
          </div>
          <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0 mt-auto">
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreatingEvent(false);
                  setNewEventDefaults(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                form="template-event-form"
                disabled={createEventMutation.isPending}
                data-testid="button-create-template-event"
              >
                {createEventMutation.isPending ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-6">
            {editingEvent && (
              <TemplateEventForm
                projectId={projectId}
                eventTypes={eventTypes}
                contacts={contacts}
                onSubmit={handleUpdateEvent}
                onCancel={() => setEditingEvent(null)}
                showButtons={false}
                initialValues={{
                  title: editingEvent.title,
                  description: editingEvent.description || '',
                  type: editingEvent.type,
                  dayOfWeek: editingEvent.dayOfWeek,
                  startTime: editingEvent.startTime,
                  endTime: editingEvent.endTime,
                  location: editingEvent.location || '',
                  notes: editingEvent.notes || '',
                  isAllDay: editingEvent.isAllDay,
                  isProductionLevel: editingEvent.isProductionLevel ?? false,
                  participantIds: editingEvent.participants?.map(p => p.contactId) || [],
                }}
              />
            )}
          </div>
          <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0 mt-auto">
            <div className="flex justify-between items-center">
              <Button 
                variant="destructive" 
                onClick={() => {
                  if (editingEvent && confirm('Are you sure you want to delete this event?')) {
                    deleteEventMutation.mutate(editingEvent.id);
                  }
                }}
                disabled={deleteEventMutation.isPending}
                data-testid="button-delete-template-event"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleteEventMutation.isPending ? "Deleting..." : "Delete Event"}
              </Button>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setEditingEvent(null)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  form="template-event-form"
                  disabled={updateEventMutation.isPending}
                  data-testid="button-save-template-event"
                >
                  {updateEventMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
