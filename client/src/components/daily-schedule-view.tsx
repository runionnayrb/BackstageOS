import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatTimeDisplay, parseScheduleSettings, formatAsCalendarDate } from '@/lib/timeUtils';
import { filterEventsBySettings, getTimezoneAbbreviation, calculateEventLayouts } from '@/lib/scheduleUtils';
import { getEventTypeColor, getEventTypeColorFromDatabase, getEventTypeDisplayName, isLightColor, darkenColor } from '@/lib/eventUtils';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, ChevronDown, MapPin, Users, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ScheduleFilter from "@/components/schedule-filter";
import { useToast } from "@/hooks/use-toast";

// Default time range constants (will be overridden by scheduleSettings)
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 24;

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
  endDate?: string;
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
  setCreateEventData,
  viewMode,
  setViewMode,
  editingEvent,
  setEditingEvent
}: DailyScheduleViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  
  // Multi-select state
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const isClearingSelectionRef = useRef(false);
  
  // Drag-to-create state
  const [dragState, setDragState] = useState<{
    isActive: boolean;
    startTime: number;
    currentTime: number;
  } | null>(null);
  
  // Drag-to-move state (for moving existing events)
  const [draggedEvent, setDraggedEvent] = useState<{
    event: ScheduleEvent;
    originalPosition: { startMinutes: number };
    currentPosition: { startMinutes: number };
    offset: { y: number };
    isDragging: boolean;
  } | null>(null);
  const [justDragged, setJustDragged] = useState<number | null>(null);
  const [justResized, setJustResized] = useState<number | null>(null);
  
  // Drag-to-resize state
  const [resizingEvent, setResizingEvent] = useState<{
    event: ScheduleEvent;
    edge: 'start' | 'end';
    originalStartMinutes: number;
    originalEndMinutes: number;
  } | null>(null);
  const resizingEventRef = useRef<{
    event: ScheduleEvent;
    edge: 'start' | 'end';
    originalStartMinutes: number;
    originalEndMinutes: number;
  } | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Bulk delete mutation
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
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'schedule-events'] });
      toast({ 
        title: "Failed to delete events", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Handle bulk delete
  const handleBulkDelete = () => {
    const selectedIds = Array.from(selectedEvents);
    bulkDeleteEventsMutation.mutate(selectedIds);
  };

  // Update event mutation for drag-to-move
  const updateEventMutation = useMutation({
    mutationFn: async ({ eventId, eventData }: { eventId: number; eventData: any }) => {
      const response = await fetch(`/api/schedule-events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      if (!response.ok) throw new Error('Failed to update event');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'schedule-events'] });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'schedule-events'] });
      toast({
        title: "Failed to move event",
        description: error.message,
        variant: "destructive"
      });
    },
  });

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

  // Handle event mousedown for multi-select and drag-to-move (matching weekly view pattern)
  const handleEventMouseDown = (e: React.MouseEvent, eventId: number) => {
    // Handle Shift+click for multi-select
    if (e.shiftKey || isShiftPressed) {
      e.preventDefault();
      e.stopPropagation();
      if (selectedEvents.has(eventId)) {
        const newSelected = new Set(selectedEvents);
        newSelected.delete(eventId);
        setSelectedEvents(newSelected);
      } else {
        const newSelected = new Set(selectedEvents);
        newSelected.add(eventId);
        setSelectedEvents(newSelected);
      }
      return;
    }
    
    // Clear selection on non-Shift click
    if (selectedEvents.size > 0) {
      isClearingSelectionRef.current = true;
      setSelectedEvents(new Set());
      setTimeout(() => {
        isClearingSelectionRef.current = false;
      }, 0);
    }

    // Get the event for drag-to-move
    const event = events.find((ev: ScheduleEvent) => ev.id === eventId);
    if (!event || event.isAllDay) return; // Don't drag all-day events in daily view
    
    // Don't start drag if we just finished dragging
    if (justDragged === eventId) return;

    const startMinutes = timeToMinutes(event.startTime);
    const rect = calendarRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate the event's current position
    const eventTop = minutesToPosition(startMinutes);
    
    // Calculate offset relative to the event's top edge
    const scrollTop = scrollContainerRef.current?.scrollTop || 0;
    const clickY = e.clientY - rect.top + scrollTop;
    
    const draggedEventData = {
      event,
      originalPosition: { startMinutes },
      currentPosition: { startMinutes },
      offset: { y: clickY - eventTop },
      isDragging: false,
    };

    setDraggedEvent(draggedEventData);

    let hasStartedDragging = false;
    let currentDragPosition = { startMinutes: draggedEventData.originalPosition.startMinutes };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!hasStartedDragging) {
        hasStartedDragging = true;
        setDraggedEvent(prev => prev ? { ...prev, isDragging: true } : null);
      }

      if (!calendarRef.current || !scrollContainerRef.current) return;

      const newRect = calendarRef.current.getBoundingClientRect();
      const scrollTop = scrollContainerRef.current.scrollTop;
      
      // Calculate mouse position relative to calendar content with scroll, adjusted for click offset
      const mouseY = moveEvent.clientY - newRect.top + scrollTop;
      
      // Subtract the offset to get the event's new top position
      const eventY = mouseY - draggedEventData.offset.y;

      // Calculate event duration to constrain end position
      let eventEndMinutes = timeToMinutes(event.endTime);
      if (isCrossMidnightEvent(event)) {
        eventEndMinutes += 1440;
      }
      const eventDuration = eventEndMinutes - timeToMinutes(event.startTime);
      
      // Calculate time position from event position, constrained so event doesn't go past schedule end
      const rawStartMinutes = snapToIncrement(positionToMinutes(eventY));
      // Constrain: start must be >= START_MINUTES and end (start + duration) must be <= END_MINUTES
      const maxStartMinutes = END_MINUTES - eventDuration;
      const newStartMinutes = Math.max(START_MINUTES, Math.min(maxStartMinutes, rawStartMinutes));

      // Update local position tracker
      currentDragPosition = { startMinutes: newStartMinutes };

      // Update the dragged event position for visual feedback
      setDraggedEvent(prev => prev ? {
        ...prev,
        currentPosition: currentDragPosition,
      } : null);

      // Optimistically update the cache for instant visual feedback
      // Keep the same date - only use formatTime to normalize the time string
      const newStartTime = formatTime(newStartMinutes) + ':00';
      const newEndMinutes = newStartMinutes + eventDuration;
      const endDateAndTime = calculateEndDateAndTime(event.date, newEndMinutes);

      queryClient.setQueriesData(
        { queryKey: ['/api/projects', projectId, 'schedule-events'] },
        (old: ScheduleEvent[] | undefined) => {
          return old?.map((e: ScheduleEvent) => 
            e.id === event.id ? { 
              ...e, 
              startTime: newStartTime,
              endTime: endDateAndTime.endTime,
              endDate: endDateAndTime.endDate
            } : e
          ) || [];
        }
      );
    };

    const handleMouseUp = () => {
      if (hasStartedDragging && draggedEventData) {
        // Mark this event as just dragged to prevent popover opening
        setJustDragged(event.id);
        setTimeout(() => setJustDragged(null), 200);
        
        // Update event position using the current drag position
        let eventEndMinutes = timeToMinutes(event.endTime);
        if (isCrossMidnightEvent(event)) {
          eventEndMinutes += 1440;
        }
        const duration = eventEndMinutes - timeToMinutes(event.startTime);
        const newEndMinutes = currentDragPosition.startMinutes + duration;
        
        // Keep the event on the same date - only use formatTime to normalize the time
        // The date should NOT change based on time value, only endDate can cross midnight
        const startTime = formatTime(currentDragPosition.startMinutes) + ':00';
        
        // Calculate end date/time - this CAN cross midnight (endDate may be different)
        const endDateAndTime = calculateEndDateAndTime(event.date, newEndMinutes);

        const eventData = {
          date: event.date,
          startTime: startTime,
          endTime: endDateAndTime.endTime,
          endDate: endDateAndTime.endDate,
          fromDrag: true,
        };

        // Use the mutation for backend update
        updateEventMutation.mutate({
          eventId: event.id,
          eventData
        });
      }

      setDraggedEvent(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle event resize (drag top or bottom edge to change duration)
  const handleResizeStart = (e: React.MouseEvent, event: ScheduleEvent, edge: 'start' | 'end') => {
    e.preventDefault();
    e.stopPropagation();

    const originalStartMinutes = timeToMinutes(event.startTime);
    let originalEndMinutes = timeToMinutes(event.endTime);
    // Account for cross-midnight events
    if (isCrossMidnightEvent(event)) {
      originalEndMinutes += 1440;
    }

    const resizingData = {
      event,
      edge,
      originalStartMinutes,
      originalEndMinutes,
    };
    
    setResizingEvent(resizingData);
    resizingEventRef.current = resizingData;

    // Track current values for visual feedback and final update
    let currentStartMinutes = originalStartMinutes;
    let currentEndMinutes = originalEndMinutes;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!calendarRef.current || !scrollContainerRef.current) return;

      const rect = calendarRef.current.getBoundingClientRect();
      const scrollTop = scrollContainerRef.current.scrollTop;
      const y = moveEvent.clientY - rect.top + scrollTop;
      const minutes = snapToIncrement(positionToMinutes(y));

      if (edge === 'start') {
        // Constrain start edge: can't go before schedule start, and must be at least timeIncrement before end
        currentStartMinutes = Math.max(START_MINUTES, Math.min(minutes, currentEndMinutes - timeIncrement));
      } else {
        // Constrain end edge: can't go past schedule end, and must be at least timeIncrement after start
        currentEndMinutes = Math.min(END_MINUTES, Math.max(minutes, currentStartMinutes + timeIncrement));
      }

      const newStartTime = formatTime(currentStartMinutes);
      const newEndTime = formatTime(currentEndMinutes);

      // Update the event optimistically for visual feedback
      const updatedEvent = { ...resizingEventRef.current!.event, startTime: newStartTime, endTime: newEndTime };
      setResizingEvent(prev => prev ? {
        ...prev,
        event: updatedEvent,
      } : null);
      resizingEventRef.current!.event = updatedEvent;
    };

    const handleMouseUp = () => {
      if (resizingEventRef.current) {
        // Mark this event as just resized to prevent popover opening
        setJustResized(event.id);
        setTimeout(() => setJustResized(null), 200);
        
        // Calculate end date/time properly for cross-midnight events
        const endDateAndTime = calculateEndDateAndTime(event.date, currentEndMinutes);
        
        const eventData = {
          startTime: formatTime(currentStartMinutes) + ':00',
          endTime: endDateAndTime.endTime,
          endDate: endDateAndTime.endDate,
        };

        // Optimistically update the cache for instant visual feedback
        queryClient.setQueriesData(
          { queryKey: ['/api/projects', projectId, 'schedule-events'] },
          (old: ScheduleEvent[] | undefined) => {
            return old?.map((e: ScheduleEvent) => 
              e.id === event.id ? { ...e, startTime: eventData.startTime, endTime: eventData.endTime, endDate: eventData.endDate } : e
            ) || [];
          }
        );

        // Use the mutation for backend update
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
  };

  // Time utilities
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatTime = (minutes: number): string => {
    // Normalize minutes to 0-1439 range for valid time strings
    const normalizedMinutes = ((minutes % 1440) + 1440) % 1440;
    const hours = Math.floor(normalizedMinutes / 60);
    const mins = normalizedMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  
  // Helper to calculate if time crosses midnight and get the new end date
  const calculateEndDateAndTime = (baseDate: string, endMinutes: number) => {
    if (endMinutes >= 1440) {
      // Crosses midnight - calculate next day
      const baseDateObj = new Date(baseDate + 'T00:00:00');
      baseDateObj.setDate(baseDateObj.getDate() + 1);
      return {
        endDate: formatAsCalendarDate(baseDateObj),
        endTime: formatTime(endMinutes - 1440) + ':00'
      };
    }
    return {
      endDate: baseDate,
      endTime: formatTime(endMinutes) + ':00'
    };
  };
  
  // Helper to calculate start date and time (handles times past midnight in 28-hour schedule)
  const calculateStartDateAndTime = (baseDate: string, startMinutes: number) => {
    if (startMinutes >= 1440) {
      // Past midnight - calculate next day
      const baseDateObj = new Date(baseDate + 'T00:00:00');
      baseDateObj.setDate(baseDateObj.getDate() + 1);
      return {
        date: formatAsCalendarDate(baseDateObj),
        startTime: formatTime(startMinutes - 1440) + ':00'
      };
    }
    return {
      date: baseDate,
      startTime: formatTime(startMinutes) + ':00'
    };
  };
  
  // Helper to detect if an event crosses midnight
  // Works even when endDate is null (legacy data) by comparing times
  const isCrossMidnightEvent = (event: { date: string; endDate?: string | null; startTime: string; endTime: string }) => {
    // Explicit endDate check
    if (event.endDate && event.endDate !== event.date) {
      return true;
    }
    // Implicit check: if endTime < startTime, it crosses midnight
    const startMins = timeToMinutes(event.startTime);
    const endMins = timeToMinutes(event.endTime);
    return endMins < startMins;
  };

  const minutesToPosition = (minutes: number): number => {
    return Math.max(0, minutes - START_MINUTES);
  };

  // Adjust start minutes for rendering in a 28-hour schedule
  // When schedule extends past midnight (END_HOUR > 24), times before START_HOUR
  // but within the extended range should be positioned as "after midnight" (add 1440)
  const adjustMinutesForExtendedDay = (minutes: number): number => {
    // Only apply adjustment if schedule extends past midnight (END_MINUTES > 1440)
    // and the time is before START_MINUTES (e.g., 1 AM is before 7 AM start)
    // and the time is within the extended portion (e.g., 1 AM is part of 7 AM - 2 AM schedule)
    if (END_MINUTES > 1440 && minutes < START_MINUTES && minutes < (END_MINUTES - 1440)) {
      return minutes + 1440;
    }
    return minutes;
  };

  const positionToMinutes = (position: number): number => {
    return Math.max(START_MINUTES, Math.min(END_MINUTES - 1, Math.round(position + START_MINUTES)));
  };

  const snapToIncrement = (minutes: number): number => {
    return Math.round(minutes / timeIncrement) * timeIncrement;
  };

  // Handle mouse down on empty calendar space to start drag-to-create
  const handleCalendarMouseDown = (e: React.MouseEvent) => {
    if (!calendarRef.current) return;
    
    // Ignore right clicks
    if (e.button !== 0) return;
    
    // Check if clicking on an event (don't start drag-to-create)
    const target = e.target as HTMLElement;
    if (target.closest('[data-event-card]')) return;
    
    const rect = calendarRef.current.getBoundingClientRect();
    // Use scrollContainerRef if available, otherwise use parent element's scroll or 0
    const scrollTop = scrollContainerRef.current?.scrollTop || calendarRef.current.parentElement?.scrollTop || 0;
    const y = e.clientY - rect.top + scrollTop;
    const minutes = snapToIncrement(positionToMinutes(y));
    
    // Track whether drag was cancelled
    let isCancelled = false;
    
    // Start drag creation
    let dragStateLocal = {
      isActive: true,
      startTime: minutes,
      currentTime: minutes,
    };
    
    setDragState(dragStateLocal);
    
    const cleanup = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!calendarRef.current || isCancelled) return;
      
      const rect = calendarRef.current.getBoundingClientRect();
      const scrollTop = scrollContainerRef.current?.scrollTop || calendarRef.current.parentElement?.scrollTop || 0;
      const y = moveEvent.clientY - rect.top + scrollTop;
      const newMinutes = snapToIncrement(positionToMinutes(y));
      
      dragStateLocal = { ...dragStateLocal, currentTime: newMinutes };
      setDragState(dragStateLocal);
    };
    
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape') {
        isCancelled = true;
        setDragState(null);
        cleanup();
      }
    };
    
    const handleMouseUp = () => {
      if (dragStateLocal.isActive && !isCancelled) {
        const startTime = Math.min(dragStateLocal.startTime, dragStateLocal.currentTime);
        const endTime = Math.max(dragStateLocal.startTime, dragStateLocal.currentTime);
        
        // Enforce minimum duration of one time increment
        if (endTime - startTime >= timeIncrement) {
          const date = formatAsCalendarDate(selectedDate);
          setCreateEventData({
            date,
            startTime: formatTime(startTime),
            endTime: formatTime(endTime),
          });
          setCreateEventDialog(true);
        }
      }
      
      setDragState(null);
      cleanup();
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
  };

  // Fetch project settings (matching weekly view query key format)
  const { data: projectSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Extract timezone and time format from settings using utility function
  const scheduleSettings = parseScheduleSettings((projectSettings as any)?.scheduleSettings);
  const { timeFormat = '12', timezone, dayStartHour, dayEndHour } = scheduleSettings;

  // Calculate dynamic time range based on settings (supports 28-hour day for theater)
  const START_HOUR = dayStartHour ?? DEFAULT_START_HOUR;
  const END_HOUR = dayEndHour ?? DEFAULT_END_HOUR;
  const START_MINUTES = START_HOUR * 60;
  const END_MINUTES = END_HOUR * 60;
  const TOTAL_MINUTES = END_MINUTES - START_MINUTES;
  const TOTAL_HOURS = END_HOUR - START_HOUR;

  // Fetch events
  const { data: events = [] } = useQuery<ScheduleEvent[]>({
    queryKey: ['/api/projects', projectId, 'schedule-events'],
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
      {/* Multi-select status bar */}
      {(isShiftPressed || selectedEvents.size > 0) && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
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
      
      {/* Removed individual header - using unified main page header */}
      {/* Main Content Container */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Header Row with Timezone and Day */}
        <div className="flex bg-gray-50 border-b border-gray-200">
          {/* Timezone Header */}
          <div 
            className="flex-shrink-0 border-r border-gray-200"
            style={{ 
              width: '64px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span 
              style={{ 
                lineHeight: '14px',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#6b7280',
              }}
            >
              {getTimezoneAbbreviation(timezone || "America/New_York")}
            </span>
          </div>
          
          {/* Day Header */}
          <div 
            className="flex-1"
            style={{ 
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
        </div>

        {/* All Day Row */}
        {propShowAllDayEvents && (
          <div className="flex border-b border-gray-200">
            {/* All Day Label */}
            <div 
              className="flex-shrink-0 bg-gray-50 border-r border-gray-200 flex items-center justify-center text-xs font-medium text-gray-600"
              style={{ width: '64px', minHeight: '60px' }}
            >
              All Day
            </div>
            {/* All Day Events */}
            <div 
              className="flex-1 bg-gray-50 p-1"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {getEventsForDate(selectedDate)
                .filter(event => event.isAllDay)
                .map((event) => {
                      const eventTypeColor = getEventTypeColorFromDatabase(event.type, eventTypes);
                      return (
                        <Popover 
                          key={event.id}
                          open={openPopoverId === `allday-${event.id}`}
                          onOpenChange={(open) => {
                            // Don't open popover during multi-select mode (unless we're clearing selection)
                            if (open && !isClearingSelectionRef.current && (isShiftPressed || selectedEvents.size > 0)) return;
                            setOpenPopoverId(open ? `allday-${event.id}` : null);
                          }}
                        >
                          <PopoverTrigger asChild>
                            <div
                              data-event-card
                              className={`rounded px-2 py-1 text-sm mb-1 cursor-pointer hover:opacity-90 transition-opacity ${
                                isLightColor(eventTypeColor) ? 'text-gray-900' : 'text-white'
                              } ${selectedEvents.has(event.id) ? 'ring-2 ring-yellow-400' : ''}`}
                              style={{ 
                                backgroundColor: eventTypeColor,
                                border: `1px solid ${darkenColor(eventTypeColor, 25)}`,
                              }}
                              onMouseDown={(e) => handleEventMouseDown(e, event.id)}
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
          </div>
        )}

        {/* Scrollable calendar content - matching weekly view structure */}
        <div 
          className="overflow-y-auto scrollbar-hide flex-1" 
          style={{ 
            maxHeight: '600px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            ref={scrollContainerRef}
            style={{ height: '600px' }}
          >
            <div 
              ref={calendarRef}
              className="relative bg-white"
              style={{ height: `${containerHeight}px`, cursor: 'crosshair' }}
              onMouseDown={handleCalendarMouseDown}
            >
              {/* Time column with consistent right border - inside scroll container */}
              <div 
                className="absolute left-0 top-0 bottom-0 bg-gray-50 border-r border-gray-200 z-20"
                style={{ width: '64px' }}
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

              {/* Time grid background */}
              <div className="absolute pointer-events-none" style={{ left: '64px', right: 0, top: 0, bottom: 0 }}>
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
                // Adjust start minutes for 28-hour schedule (times after midnight render at bottom)
                const rawStartMinutes = timeToMinutes(event.startTime);
                const startMinutes = adjustMinutesForExtendedDay(rawStartMinutes);
                let endMinutes = timeToMinutes(event.endTime);
                
                // Handle cross-midnight events: add 24 hours to endMinutes
                if (isCrossMidnightEvent(event)) {
                  endMinutes += 1440;
                }
                
                const top = minutesToPosition(startMinutes);
                const durationMinutes = endMinutes - startMinutes;
                const height = endMinutes - startMinutes;
                const eventTypeColor = getEventTypeColorFromDatabase(event.type, eventTypes);
                const isShortEvent = durationMinutes <= 15;
                const isVeryShortEvent = durationMinutes <= 10;
                const isCompactEvent = durationMinutes <= 30;
                const isCenterableShortEvent = durationMinutes >= 5 && durationMinutes <= 30;
                const isCenterableMediumEvent = durationMinutes > 30 && durationMinutes <= 60;

                // Get layout for overlapping events
                const layout = eventLayouts.get(event.id);
                const hasOverlap = layout && layout.totalColumns > 1;
                
                // Calculate width and left position based on overlap layout
                // Events are positioned in the area after the 64px time column
                let eventLeft: string;
                let eventWidth: string;
                
                if (hasOverlap && layout) {
                  // Overlapping event: position within its column (relative to event area after time column)
                  const columnWidthPercent = layout.width;
                  const columnLeftPercent = layout.left;
                  eventLeft = `calc(64px + (100% - 64px) * ${columnLeftPercent / 100} + 2px)`;
                  eventWidth = `calc((100% - 64px) * ${columnWidthPercent / 100} - 4px)`;
                } else {
                  // Non-overlapping event: use full width after time column with small margins
                  eventLeft = 'calc(64px + 4px)';
                  eventWidth = 'calc(100% - 64px - 8px)';
                }

                // Check if this event is currently being dragged
                const isCurrentlyDragging = draggedEvent?.event.id === event.id && draggedEvent.isDragging;
                
                // Check if this event is being resized
                const isCurrentlyResizing = resizingEvent?.event.id === event.id;
                
                // Use resized dimensions if this event is being resized
                let displayHeight = height;
                if (isCurrentlyResizing) {
                  const resizeStartMins = timeToMinutes(resizingEvent.event.startTime);
                  let resizeEndMins = timeToMinutes(resizingEvent.event.endTime);
                  // Handle cross-midnight: if end < start, it crosses midnight
                  if (resizeEndMins < resizeStartMins) {
                    resizeEndMins += 1440;
                  }
                  displayHeight = resizeEndMins - resizeStartMins;
                }
                const resizedTop = isCurrentlyResizing ?
                  minutesToPosition(adjustMinutesForExtendedDay(timeToMinutes(resizingEvent.event.startTime))) : top;
                
                // Use dragged position if this event is being dragged (takes priority over resize)
                const displayTop = draggedEvent?.event.id === event.id ? 
                  minutesToPosition(draggedEvent.currentPosition.startMinutes) : resizedTop;

                return (
                  <Popover 
                          key={event.id}
                          open={openPopoverId === `timed-${event.id}`}
                          onOpenChange={(open) => {
                            // Don't open popover during multi-select mode or after drag/resize
                            if (open && (justDragged === event.id || justResized === event.id)) return;
                            if (open && !isClearingSelectionRef.current && (isShiftPressed || selectedEvents.size > 0)) return;
                            setOpenPopoverId(open ? `timed-${event.id}` : null);
                          }}
                        >
                          <PopoverTrigger asChild>
                            <div
                              data-event-card
                              className={`absolute text-sm rounded-md shadow-sm cursor-pointer hover:opacity-90 z-30 ${
                                isLightColor(eventTypeColor) ? 'text-gray-900' : 'text-white'
                              } ${selectedEvents.has(event.id) ? 'ring-2 ring-yellow-400' : ''
                              } ${isCurrentlyDragging ? 'opacity-50 cursor-grabbing' : 'cursor-grab'
                              } ${isCenterableShortEvent && !hasOverlap ? 'flex items-center' : ''
                              } ${isCenterableMediumEvent && !hasOverlap ? 'flex flex-col justify-center' : ''}`}
                              style={{
                                left: eventLeft,
                                width: eventWidth,
                                top: `${displayTop}px`,
                                height: `${Math.max(20, displayHeight)}px`,
                                minHeight: '20px',
                                backgroundColor: eventTypeColor,
                                border: `1px solid ${darkenColor(eventTypeColor, 25)}`,
                                overflow: 'hidden',
                                padding: (isCenterableShortEvent && !hasOverlap) ? '0 8px' : (isVeryShortEvent ? '2px 4px' : ((isCenterableMediumEvent && !hasOverlap) ? '4px 8px' : '4px 6px')),
                              }}
                              onMouseDown={(e) => handleEventMouseDown(e, event.id)}
                              onContextMenu={(e) => e.preventDefault()}
                            >
                              {isCompactEvent ? (
                                <div className={`flex items-center gap-1 ${hasOverlap ? 'flex-col items-start' : 'truncate'}`}>
                                  <span className={`font-medium leading-tight ${hasOverlap ? 'line-clamp-2' : 'truncate'}`} style={{ wordBreak: hasOverlap ? 'break-word' : undefined }}>{event.title}</span>
                                  {!hasOverlap && (
                                    <span className="text-xs opacity-90 flex-shrink-0">{(() => {
                                      // Show updated times during resize
                                      if (isCurrentlyResizing) {
                                        const resizeStartMins = timeToMinutes(resizingEvent.event.startTime);
                                        const resizeEndMins = timeToMinutes(resizingEvent.event.endTime);
                                        return `${formatTimeDisplay(formatTime(resizeStartMins), timeFormat)} - ${formatTimeDisplay(formatTime(resizeEndMins), timeFormat)}`;
                                      }
                                      return `${formatTimeDisplay(formatTime(startMinutes), timeFormat)} - ${formatTimeDisplay(formatTime(endMinutes), timeFormat)}`;
                                    })()}</span>
                                  )}
                                  {hasOverlap && (
                                    <span className="text-xs opacity-90 leading-tight">{(() => {
                                      // Show updated times during resize
                                      if (isCurrentlyResizing) {
                                        const resizeStartMins = timeToMinutes(resizingEvent.event.startTime);
                                        return formatTimeDisplay(formatTime(resizeStartMins), timeFormat);
                                      }
                                      return formatTimeDisplay(formatTime(startMinutes), timeFormat);
                                    })()}</span>
                                  )}
                                </div>
                              ) : (
                                <div className={hasOverlap ? 'overflow-hidden' : ''}>
                                  <div className={`font-medium ${hasOverlap ? 'break-words' : 'truncate'}`}>{event.title}</div>
                                  <div className={`text-xs opacity-90 mt-0.5 ${hasOverlap ? 'break-words' : 'truncate'}`}>
                                    {(() => {
                                      // Show updated times during resize
                                      if (isCurrentlyResizing) {
                                        const resizeStartMins = timeToMinutes(resizingEvent.event.startTime);
                                        const resizeEndMins = timeToMinutes(resizingEvent.event.endTime);
                                        return `${formatTimeDisplay(formatTime(resizeStartMins), timeFormat)} - ${formatTimeDisplay(formatTime(resizeEndMins), timeFormat)}`;
                                      }
                                      return `${formatTimeDisplay(formatTime(startMinutes), timeFormat)} - ${formatTimeDisplay(formatTime(endMinutes), timeFormat)}`;
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

              {/* Drag-to-create preview */}
              {dragState?.isActive && (
                <div
                  className="absolute text-xs text-white rounded bg-gray-500 opacity-60 pointer-events-none z-30"
                  style={{
                    left: 'calc(64px + 4px)',
                    width: 'calc(100% - 64px - 8px)',
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
    </div>
  );
}