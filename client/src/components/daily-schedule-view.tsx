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
import LocationSelect from "@/components/location-select";

const START_HOUR = 8;
const END_HOUR = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const START_MINUTES = START_HOUR * 60;
const END_MINUTES = END_HOUR * 60;
const TOTAL_MINUTES = END_MINUTES - START_MINUTES;

interface DailyScheduleViewProps {
  projectId: number;
  selectedDate: Date;
  onBackToWeekly: () => void;
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

export default function DailyScheduleView({ projectId, selectedDate, onBackToWeekly, selectedContactIds }: DailyScheduleViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState<Date>(selectedDate);
  const [timeIncrement, setTimeIncrement] = useState<15 | 30 | 60>(30);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [createEventDialog, setCreateEventDialog] = useState<{
    isOpen: boolean;
    startTime?: string;
    endTime?: string;
  }>({ isOpen: false });
  const [isDragCreating, setIsDragCreating] = useState<{
    isActive: boolean;
    startTime: number;
    currentTime: number;
  } | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<{
    event: ScheduleEvent;
    originalPosition: { startMinutes: number };
    currentPosition: { startMinutes: number };
    offset: { y: number };
    isDragging: boolean;
  } | null>(null);
  const [resizingEvent, setResizingEvent] = useState<{
    event: ScheduleEvent;
    edge: 'start' | 'end';
    originalStartMinutes: number;
    originalEndMinutes: number;
  } | null>(null);
  const [justDragged, setJustDragged] = useState<number | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showAllDayEvents, setShowAllDayEvents] = useState(true);

  // Get show settings
  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Parse schedule settings with time format preference
  const scheduleSettings = parseScheduleSettings((showSettings as any)?.scheduleSettings);
  const { timeFormat, timezone, workStartTime, workEndTime } = scheduleSettings;

  // Fetch schedule events for the current date
  const { data: allEvents = [], isLoading } = useQuery<ScheduleEvent[]>({
    queryKey: [`/api/projects/${projectId}/schedule-events`],
  });

  // Filter events for the current date
  const currentDateEvents = allEvents.filter(event => 
    event.date === currentDate.toISOString().split('T')[0]
  );

  // Apply contact filter
  const dayEvents = selectedContactIds.length === 0
    ? currentDateEvents // Show all events when no filter is applied (master schedule)
    : currentDateEvents.filter(event =>
        event.participants.some(participant =>
          selectedContactIds.includes(participant.contactId)
        )
      );

  // Fetch contacts
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: [`/api/projects/${projectId}/contacts`],
  });

  // Navigation functions
  const goToPreviousDay = () => {
    const prevDay = new Date(currentDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setCurrentDate(prevDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setCurrentDate(nextDay);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Time formatting functions
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const timeToMinutes = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToPosition = (minutes: number) => {
    const relativeMinutes = Math.max(0, Math.min(minutes - START_MINUTES, TOTAL_MINUTES));
    return (relativeMinutes / TOTAL_MINUTES) * 1080; // 1080px = 16 hours
  };

  const positionToMinutes = (position: number) => {
    const relativeMinutes = (position / 1080) * TOTAL_MINUTES;
    return Math.min(START_MINUTES + relativeMinutes, END_MINUTES - 1);
  };

  const snapToIncrement = (minutes: number) => {
    return Math.round(minutes / timeIncrement) * timeIncrement;
  };

  // Format date display
  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Mutations
  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await fetch(`/api/projects/${projectId}/schedule-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...eventData,
          date: currentDate.toISOString().split('T')[0],
        }),
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

  // Drag to create events
  const handleMouseDown = (e: React.MouseEvent) => {
    // Allow drag creation on empty grid space (but not on events)
    const target = e.target as HTMLElement;
    const isOnEvent = target.closest('[data-event-id]');
    const isOnTimeLabel = target.closest('.time-label') || target.classList.contains('time-label');
    
    if (!isOnEvent && !isOnTimeLabel && calendarRef.current && scrollContainerRef.current) {
      const rect = calendarRef.current.getBoundingClientRect();
      const scrollTop = scrollContainerRef.current.scrollTop;
      const y = e.clientY - rect.top + scrollTop; // Account for scroll position
      const minutes = positionToMinutes(y);
      const snappedMinutes = snapToIncrement(minutes);
      
      setIsDragCreating({
        isActive: true,
        startTime: snappedMinutes,
        currentTime: snappedMinutes,
      });
      
      e.preventDefault();
    }
  };

  // Handle dragging existing events
  const handleEventMouseDown = useCallback((e: React.MouseEvent, event: ScheduleEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!calendarRef.current || !scrollContainerRef.current) return;
    
    const calendarRect = calendarRef.current.getBoundingClientRect();
    const scrollContainer = scrollContainerRef.current;
    const startMinutes = timeToMinutes(event.startTime);
    
    // Calculate drag offset in time units (minutes)
    const scrollTop = scrollContainer.scrollTop;
    const mouseY = e.clientY - calendarRect.top;
    const absoluteMouseTime = mouseY + scrollTop;
    const offsetY = absoluteMouseTime - minutesToPosition(startMinutes);
    
    let currentDragState = {
      event,
      originalPosition: { startMinutes },
      currentPosition: { startMinutes },
      offset: { y: offsetY },
      isDragging: true
    };
    
    setDraggedEvent(currentDragState);
    setJustDragged(event.id);
    
    // Clear the flag after a short delay
    setTimeout(() => setJustDragged(null), 200);
  }, [timeToMinutes]);

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

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!calendarRef.current || !scrollContainerRef.current) return;
    
    const rect = calendarRef.current.getBoundingClientRect();
    const scrollTop = scrollContainerRef.current.scrollTop;
    const y = e.clientY - rect.top + scrollTop; // Account for scroll position
    
    // Handle drag-to-create
    if (isDragCreating) {
      const minutes = positionToMinutes(y);
      const snappedMinutes = snapToIncrement(minutes);
      
      setIsDragCreating(prev => prev ? {
        ...prev,
        currentTime: Math.max(snappedMinutes, prev.startTime + timeIncrement)
      } : null);
    }
    
    // Handle event dragging
    if (draggedEvent?.isDragging) {
      const scrollTop = scrollContainerRef.current?.scrollTop || 0;
      const absoluteMouseTime = y + scrollTop;
      const newTimePosition = absoluteMouseTime - draggedEvent.offset.y;
      const newTimeMinutes = positionToMinutes(newTimePosition);
      const snappedTime = snapToIncrement(Math.max(START_MINUTES, Math.min(newTimeMinutes, END_MINUTES - 30)));
      
      setDraggedEvent(prev => prev ? {
        ...prev,
        currentPosition: { startMinutes: snappedTime }
      } : null);
    }
    
    // Handle event resizing
    if (resizingEvent) {
      const minutes = snapToIncrement(positionToMinutes(y));
      
      if (resizingEvent.edge === 'start') {
        const newStartTime = Math.max(START_MINUTES, Math.min(minutes, resizingEvent.originalEndMinutes - timeIncrement));
        setResizingEvent(prev => prev ? {
          ...prev,
          originalStartMinutes: newStartTime
        } : null);
      } else {
        const newEndTime = Math.min(END_MINUTES, Math.max(minutes, resizingEvent.originalStartMinutes + timeIncrement));
        setResizingEvent(prev => prev ? {
          ...prev,
          originalEndMinutes: newEndTime
        } : null);
      }
    }
  }, [isDragCreating, draggedEvent?.isDragging, resizingEvent, timeIncrement]);

  const handleMouseUp = useCallback(() => {
    // Handle drag-to-create completion
    if (isDragCreating) {
      const startTime = formatTime(isDragCreating.startTime);
      const endTime = formatTime(isDragCreating.currentTime);
      
      setCreateEventDialog({
        isOpen: true,
        startTime,
        endTime,
      });
      
      setIsDragCreating(null);
    }
    
    // Handle event drag completion
    if (draggedEvent?.isDragging) {
      const { event, currentPosition } = draggedEvent;
      const duration = timeToMinutes(event.endTime) - timeToMinutes(event.startTime);
      const newStartTime = formatTime(currentPosition.startMinutes);
      const newEndTime = formatTime(currentPosition.startMinutes + duration);
      
      const eventData = {
        startTime: newStartTime,
        endTime: newEndTime,
      };
      
      // Use optimistic update approach like availability system
      queryClient.setQueryData([`/api/projects/${projectId}/schedule-events`], (old: ScheduleEvent[]) => {
        return old?.map((e: ScheduleEvent) => 
          e.id === event.id ? { ...e, ...eventData } : e
        ) || [];
      });
      
      // Update in background
      updateEventMutation.mutate({ 
        eventId: event.id, 
        eventData
      });
      
      setDraggedEvent(null);
    }
    
    // Handle resize completion
    if (resizingEvent) {
      const { event, originalStartMinutes, originalEndMinutes } = resizingEvent;
      const newStartTime = formatTime(originalStartMinutes);
      const newEndTime = formatTime(originalEndMinutes);
      
      const eventData = {
        startTime: newStartTime,
        endTime: newEndTime,
      };
      
      // Use optimistic update
      queryClient.setQueryData([`/api/projects/${projectId}/schedule-events`], (old: ScheduleEvent[]) => {
        return old?.map((e: ScheduleEvent) => 
          e.id === event.id ? { ...e, ...eventData } : e
        ) || [];
      });
      
      // Update in background
      updateEventMutation.mutate({ 
        eventId: event.id, 
        eventData
      });
      
      setResizingEvent(null);
    }
  }, [isDragCreating, draggedEvent, resizingEvent, queryClient, projectId, updateEventMutation]);

  // Auto-scroll to work hours
  useEffect(() => {
    const workStartMinutes = timeToMinutes(workStartTime);
    const scrollTop = minutesToPosition(workStartMinutes) - 100;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = Math.max(0, scrollTop);
    }
  }, [workStartTime, currentDate]);

  useEffect(() => {
    if (isDragCreating || draggedEvent?.isDragging || resizingEvent) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragCreating, draggedEvent?.isDragging, resizingEvent, handleMouseMove, handleMouseUp]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold w-80 text-center">
            {formatDateDisplay(currentDate)}
          </h3>
          <Button variant="outline" size="sm" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              variant={showAllDayEvents ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAllDayEvents(!showAllDayEvents)}
            >
              All Day
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Label htmlFor="time-increment" className="text-sm">Time Increment:</Label>
            <Select value={timeIncrement.toString()} onValueChange={(value) => setTimeIncrement(Number(value) as 15 | 30 | 60)}>
              <SelectTrigger className="w-20" id="time-increment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15m</SelectItem>
                <SelectItem value="30">30m</SelectItem>
                <SelectItem value="60">60m</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={onBackToWeekly} variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-1" />
            Weekly View
          </Button>
        </div>
      </div>

      {/* All-Day Events */}
      {showAllDayEvents && (
        <div className="border rounded-lg bg-white p-4">
          <h4 className="font-medium mb-2">All Day Events</h4>
          <div className="space-y-2">
            {dayEvents
              .filter(event => event.isAllDay)
              .map((event) => {
                const eventTypeColors = {
                  rehearsal: 'bg-blue-100 border-blue-300 text-blue-800',
                  performance: 'bg-red-100 border-red-300 text-red-800',
                  tech: 'bg-orange-100 border-orange-300 text-orange-800',
                  meeting: 'bg-green-100 border-green-300 text-green-800',
                  other: 'bg-gray-100 border-gray-300 text-gray-800',
                };

                return (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer hover:opacity-80 transition-opacity ${
                      eventTypeColors[event.type as keyof typeof eventTypeColors] || eventTypeColors.other
                    }`}
                    onClick={() => setEditingEvent(event)}
                  >
                    <div className="font-medium">{event.title}</div>
                    {event.location && (
                      <div className="text-sm opacity-75">📍 {event.location}</div>
                    )}
                    {event.participants.length > 0 && (
                      <div className="text-sm opacity-75 flex items-center gap-1 mt-1">
                        <Users className="h-3 w-3" />
                        {event.participants.length} assigned
                      </div>
                    )}
                  </div>
                );
              })}
            {dayEvents.filter(event => event.isAllDay).length === 0 && (
              <p className="text-gray-500 text-sm">No all-day events</p>
            )}
          </div>
        </div>
      )}

      {/* Time-based calendar */}
      <div className="border rounded-lg bg-white overflow-hidden">
        <div 
          ref={scrollContainerRef}
          className="relative overflow-y-auto cursor-crosshair"
          style={{ height: '600px' }}
        >
          <div 
            ref={calendarRef}
            className="relative" 
            style={{ height: '1080px' }}
            onMouseDown={handleMouseDown}
          >
            {/* Hour labels and major grid lines */}
            {Array.from({ length: 17 }, (_, i) => {
              const hour = START_HOUR + i;
              const position = (i / 16) * 1080;
              const timeString = `${hour.toString().padStart(2, '0')}:00`;
              const formattedTime = formatTimeDisplay(timeString, timeFormat);
              return (
                <div
                  key={`hour-${hour}`}
                  className="absolute left-0 right-0 border-b border-gray-200"
                  style={{ top: `${position}px` }}
                >
                  <div className="absolute left-0 w-20 p-2 text-sm text-gray-500 bg-white border-r time-label">
                    {formattedTime}
                  </div>
                </div>
              );
            })}

            {/* Time increment grid lines */}
            {Array.from({ length: Math.floor(TOTAL_MINUTES / timeIncrement) }, (_, i) => {
              const minutes = i * timeIncrement;
              const position = (minutes / TOTAL_MINUTES) * 1080;
              const isHour = minutes % 60 === 0;
              
              if (isHour) return null; // Skip hour lines as they're already drawn above
              
              return (
                <div
                  key={`increment-${i}`}
                  className="absolute left-20 right-0 border-b border-gray-100"
                  style={{ top: `${position}px` }}
                />
              );
            })}

            {/* Working hours highlight */}
            <div
              className="absolute left-20 right-0 bg-blue-50 bg-opacity-50 pointer-events-none"
              style={{
                top: `${minutesToPosition(timeToMinutes(workStartTime))}px`,
                height: `${minutesToPosition(timeToMinutes(workEndTime)) - minutesToPosition(timeToMinutes(workStartTime))}px`,
              }}
            />

            {/* Drag preview */}
            {isDragCreating && (
              <div
                className="absolute left-20 right-4 bg-blue-200 border-2 border-blue-400 rounded opacity-50 pointer-events-none"
                style={{
                  top: `${minutesToPosition(isDragCreating.startTime)}px`,
                  height: `${minutesToPosition(isDragCreating.currentTime) - minutesToPosition(isDragCreating.startTime)}px`,
                }}
              />
            )}

            {/* Time-based events */}
            <div className="absolute left-20 right-0 top-0 bottom-0">
              {dayEvents
                .filter(event => !event.isAllDay)
                .map((event) => {
                  const startMinutes = timeToMinutes(event.startTime);
                  const endMinutes = timeToMinutes(event.endTime);
                  const startPos = minutesToPosition(startMinutes);
                  const duration = endMinutes - startMinutes;
                  const height = (duration / TOTAL_MINUTES) * 1080;

                  const eventTypeColors = {
                    rehearsal: 'bg-blue-100 border-blue-300 text-blue-800',
                    performance: 'bg-red-100 border-red-300 text-red-800',
                    tech: 'bg-orange-100 border-orange-300 text-orange-800',
                    meeting: 'bg-green-100 border-green-300 text-green-800',
                    other: 'bg-gray-100 border-gray-300 text-gray-800',
                  };

                  // Check if this event is being dragged or resized
                  const isDragging = draggedEvent?.event.id === event.id;
                  const isResizing = resizingEvent?.event.id === event.id;
                  const isJustDragged = justDragged === event.id;
                  
                  // Calculate position for dragged or resized events
                  let displayPosition = { top: startPos, height: Math.max(height, 40) };
                  if (isDragging && draggedEvent) {
                    const dragStartPos = minutesToPosition(draggedEvent.currentPosition.startMinutes);
                    displayPosition = { top: dragStartPos, height: Math.max(height, 40) };
                  } else if (isResizing && resizingEvent) {
                    const resizeStartPos = minutesToPosition(resizingEvent.originalStartMinutes);
                    const resizeHeight = (resizingEvent.originalEndMinutes - resizingEvent.originalStartMinutes) / TOTAL_MINUTES * 1080;
                    displayPosition = { top: resizeStartPos, height: Math.max(resizeHeight, 40) };
                  }

                  return (
                    <div
                      key={event.id}
                      data-event-id={event.id}
                      className={`absolute left-2 right-2 border-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity shadow-sm ${
                        eventTypeColors[event.type as keyof typeof eventTypeColors] || eventTypeColors.other
                      } ${isDragging ? 'opacity-75 z-50' : ''} ${isResizing ? 'z-50' : ''}`}
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
                      <div className="px-3 py-2 h-full overflow-hidden">
                        <div className="font-medium truncate">
                          {event.title}
                        </div>
                        <div className="text-sm opacity-75 truncate">
                          {event.startTime} - {event.endTime}
                        </div>
                        {event.location && (
                          <div className="text-sm opacity-75 truncate">
                            📍 {event.location}
                          </div>
                        )}
                        {event.participants.length > 0 && (
                          <div className="text-sm opacity-75 flex items-center gap-1 mt-1">
                            <Users className="h-3 w-3" />
                            {event.participants.length} assigned
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
            initialData={{
              date: currentDate.toISOString().split('T')[0],
              startTime: createEventDialog.startTime,
              endTime: createEventDialog.endTime,
            }}
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
              projectId={projectId}
              contacts={contacts}
              onSubmit={(eventData) => updateEventMutation.mutate({ eventId: editingEvent.id, eventData })}
              onDelete={() => deleteEventMutation.mutate(editingEvent.id)}
              onCancel={() => setEditingEvent(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CreateEventForm({ 
  projectId, 
  contacts, 
  onSubmit, 
  onCancel, 
  initialData 
}: {
  projectId: number;
  contacts: Contact[];
  onSubmit: (eventData: any) => void;
  onCancel: () => void;
  initialData?: {
    date?: string;
    startTime?: string;
    endTime?: string;
  };
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: initialData?.date || '',
    startTime: initialData?.startTime || '',
    endTime: initialData?.endTime || '',
    type: 'rehearsal',
    location: '',
    notes: '',
    isAllDay: false,
    participants: [] as number[],
  });

  const toggleParticipant = (contactId: number) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.includes(contactId)
        ? prev.participants.filter(id => id !== contactId)
        : [...prev.participants, contactId]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
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
          <Label htmlFor="description">Description</Label>
          <Textarea
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
            onCheckedChange={(checked) => setFormData(prev => ({ 
              ...prev, 
              isAllDay: checked as boolean,
              startTime: checked ? '' : formData.startTime,
              endTime: checked ? '' : formData.endTime
            }))}
          />
          <Label htmlFor="isAllDay">All Day Event</Label>
        </div>

        <div>
          <Label htmlFor="type">Event Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
            <SelectTrigger id="type">
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

        <div>
          <Label htmlFor="location">Location</Label>
          <LocationSelect
            projectId={projectId}
            value={formData.location}
            onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          />
        </div>

        <div>
          <Label>Participants</Label>
          <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-2">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`participant-${contact.id}`}
                  checked={formData.participants.includes(contact.id)}
                  onCheckedChange={() => toggleParticipant(contact.id)}
                />
                <Label htmlFor={`participant-${contact.id}`} className="flex-1">
                  {contact.firstName} {contact.lastName}
                  {contact.role && (
                    <span className="text-sm text-gray-500 ml-2">({contact.role})</span>
                  )}
                </Label>
              </div>
            ))}
          </div>
        </div>
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

function EditEventForm({ 
  event, 
  projectId, 
  contacts, 
  onSubmit, 
  onDelete, 
  onCancel 
}: {
  event: ScheduleEvent;
  projectId: number;
  contacts: Contact[];
  onSubmit: (eventData: any) => void;
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

  const toggleParticipant = (contactId: number) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.includes(contactId)
        ? prev.participants.filter(id => id !== contactId)
        : [...prev.participants, contactId]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
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
          <Label htmlFor="description">Description</Label>
          <Textarea
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
            onCheckedChange={(checked) => setFormData(prev => ({ 
              ...prev, 
              isAllDay: checked as boolean,
              startTime: checked ? '' : formData.startTime,
              endTime: checked ? '' : formData.endTime
            }))}
          />
          <Label htmlFor="isAllDay">All Day Event</Label>
        </div>

        <div>
          <Label htmlFor="type">Event Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
            <SelectTrigger id="type">
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

        <div>
          <Label htmlFor="location">Location</Label>
          <LocationSelect
            projectId={projectId}
            value={formData.location}
            onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          />
        </div>

        <div>
          <Label>Participants</Label>
          <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-2">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`participant-${contact.id}`}
                  checked={formData.participants.includes(contact.id)}
                  onCheckedChange={() => toggleParticipant(contact.id)}
                />
                <Label htmlFor={`participant-${contact.id}`} className="flex-1">
                  {contact.firstName} {contact.lastName}
                  {contact.role && (
                    <span className="text-sm text-gray-500 ml-2">({contact.role})</span>
                  )}
                </Label>
              </div>
            ))}
          </div>
        </div>
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