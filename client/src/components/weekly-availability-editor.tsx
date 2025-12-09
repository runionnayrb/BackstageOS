import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatTimeDisplay, formatTimeFromMinutes, parseScheduleSettings, getTimezoneAbbreviation } from "@/lib/timeUtils";
import { getEventTypeColorFromDatabase } from "@/lib/eventUtils";

interface Contact {
  id: number;
  projectId: number;
  firstName: string;
  lastName: string;
}

interface ContactAvailability {
  id: number;
  contactId: number;
  projectId: number;
  date: string;
  startTime: string;
  endTime: string;
  availabilityType: 'unavailable' | 'preferred';
  notes?: string;
}

interface AvailabilityEditorProps {
  contact: Contact;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function WeeklyAvailabilityEditor({ contact, isOpen: externalIsOpen, onOpenChange }: AvailabilityEditorProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = onOpenChange || setInternalIsOpen;
  // Initialize with timezone-aware date once settings are loaded
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [isDragCreating, setIsDragCreating] = useState<{
    isActive: boolean;
    startDay: number;
    startTime: number;
    currentDay: number;
    currentTime: number;
    availabilityType: 'unavailable' | 'preferred';
    canceled?: boolean;
  } | null>(null);
  
  const dragCanceledRef = useRef(false);
  const [draggedItem, setDraggedItem] = useState<{
    item: ContactAvailability;
    originalPosition: { dayIndex: number; startMinutes: number };
    currentPosition: { dayIndex: number; startMinutes: number };
    offset: { x: number; y: number };
    isDragging: boolean;
  } | null>(null);
  const [justDragged, setJustDragged] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState<{ id: number; edge: 'start' | 'end' } | null>(null);
  const [editingItem, setEditingItem] = useState<ContactAvailability & { notes: string; availabilityType: string } | null>(null);
  const [timeIncrement, setTimeIncrement] = useState<15 | 30 | 60>(30);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showAllDayEvents, setShowAllDayEvents] = useState(true);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const calendarRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Get week dates based on configured week start day
  const getWeekDates = (date: Date, startDay: string = "sunday") => {
    const week = [];
    // Create date in local timezone to avoid UTC conversion issues
    const startOfWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const currentDay = startOfWeek.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Map week start day string to number
    const weekStartMap: { [key: string]: number } = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, 
      thursday: 4, friday: 5, saturday: 6
    };
    
    const configuredStartDay = weekStartMap[startDay] || 0;
    
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
  };

  // Fetch availability data
  const { data: availability = [], isLoading } = useQuery({
    queryKey: [`/api/projects/${contact.projectId}/contacts/${contact.id}/availability`],
    enabled: isOpen,
  });

  // Fetch schedule events to show conflicts
  const { data: scheduleEvents = [] } = useQuery({
    queryKey: [`/api/projects/${contact.projectId}/schedule-events`],
    enabled: isOpen,
  });

  // Fetch show settings for working hours
  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${contact.projectId}/settings`],
    enabled: isOpen,
  });

  // Fetch event types for color matching
  const { data: eventTypes = [] } = useQuery({
    queryKey: [`/api/projects/${contact.projectId}/event-types`],
    enabled: isOpen,
  });

  // Parse schedule settings with time format preference
  const scheduleSettings = parseScheduleSettings((showSettings as any)?.scheduleSettings);
  const { timeFormat, timezone: timeZone, weekStartDay, workStartTime, workEndTime } = scheduleSettings;
  
  // Use configurable time range from project settings (must be defined before functions that use them)
  const START_HOUR = scheduleSettings.dayStartHour;
  const END_HOUR = scheduleSettings.dayEndHour;
  const START_MINUTES = START_HOUR * 60;
  const END_MINUTES = END_HOUR * 60;
  const TOTAL_HOURS = END_HOUR - START_HOUR;
  
  // Provide defaults for working hours if not set
  const workingHours = { 
    start: workStartTime || '09:00', 
    end: workEndTime || '17:00' 
  };
  const startHour = parseInt(workingHours.start.split(':')[0]);
  const endHour = parseInt(workingHours.end.split(':')[0]);

  // Calculate week dates and day names based on the configured start day
  const weekDates = getWeekDates(currentWeek, weekStartDay);
  const baseDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekStartMap: { [key: string]: number } = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3, 
    thursday: 4, friday: 5, saturday: 6
  };
  const startDayIndex = weekStartMap[weekStartDay] || 0;
  const dayNames = [...baseDayNames.slice(startDayIndex), ...baseDayNames.slice(0, startDayIndex)];

  // Filter availability for current week
  const weekAvailability = (availability as ContactAvailability[]).filter((item: ContactAvailability) => {
    const itemDate = new Date(item.date);
    return weekDates.some((weekDate: Date) => 
      weekDate.toISOString().split('T')[0] === item.date
    );
  });

  // Filter schedule events for current week and get all day events
  const weekScheduleEvents = (scheduleEvents as any[]).filter((event: any) => {
    const eventDate = new Date(event.date);
    return weekDates.some((weekDate: Date) => 
      weekDate.toISOString().split('T')[0] === event.date
    );
  });

  const allDayEvents = weekScheduleEvents.filter((event: any) => event.isAllDay);
  
  // Calculate initial scroll position to show working hours
  // Show working hours in the center of the 500px viewport
  const viewportHeight = 500; // Calendar container height
  const initialScrollPosition = Math.max(0, (startHour * 60) - (viewportHeight / 2)); // Center working hours in viewport

  // Disabled auto-scroll to prevent bouncing issues
  // useEffect(() => {
  //   if (isOpen && scrollContainerRef.current && showSettings) {
  //     setTimeout(() => {
  //       if (scrollContainerRef.current) {
  //         scrollContainerRef.current.scrollTop = initialScrollPosition;
  //       }
  //     }, 100);
  //   }
  // }, [isOpen, showSettings, initialScrollPosition]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Sending availability data:', data);
      const response = await fetch(`/api/projects/${contact.projectId}/contacts/${contact.id}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      const responseText = await response.text();
      console.log('Response status:', response.status, 'Response text:', responseText);
      
      if (!response.ok) {
        throw new Error(`Failed to create availability: ${response.status} ${responseText}`);
      }
      return JSON.parse(responseText);
    },
    onSuccess: (newAvailability) => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/projects/${contact.projectId}/contacts/${contact.id}/availability`] 
      });
      toast({ title: "Availability added successfully" });
      
      // Auto-open edit dialog for the newly created block
      if (newAvailability && newAvailability.id) {
        setEditingItem({
          ...newAvailability,
          notes: newAvailability.notes || "",
          availabilityType: newAvailability.availabilityType || "unavailable"
        });
      }
    },
    onError: (error) => {
      console.error('Create availability error:', error);
      toast({ 
        title: "Failed to add availability", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/projects/${contact.projectId}/contacts/${contact.id}/availability/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update availability");
      return response.json();
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: [`/api/projects/${contact.projectId}/contacts/${contact.id}/availability`]
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(
        [`/api/projects/${contact.projectId}/contacts/${contact.id}/availability`]
      );

      // Optimistically update to the new value
      queryClient.setQueryData(
        [`/api/projects/${contact.projectId}/contacts/${contact.id}/availability`],
        (oldData: any) => {
          if (!oldData) return oldData;
          return oldData.map((item: any) => 
            item.id === variables.id ? { ...item, ...variables.data } : item
          );
        }
      );

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(
          [`/api/projects/${contact.projectId}/contacts/${contact.id}/availability`],
          context.previousData
        );
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/projects/${contact.projectId}/contacts/${contact.id}/availability/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete availability");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/projects/${contact.projectId}/contacts/${contact.id}/availability`] 
      });
      toast({ title: "Availability deleted successfully" });
    },
  });

  // Time utilities
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number): string => {
    // Use formatTimeFromMinutes which handles extended hours (24+) with +1 suffix
    const isExtendedHour = Math.floor(minutes / 60) >= 24;
    return formatTimeFromMinutes(minutes, timeFormat, isExtendedHour);
  };

  const minutesToPosition = (minutes: number): number => {
    // Offset by START_MINUTES to position relative to configured start hour
    return Math.max(0, minutes - START_MINUTES);
  };

  const minutesToHeight = (durationMinutes: number): number => {
    // For height calculations, we don't need to subtract START_MINUTES
    // Just return the duration directly as pixels (1 minute = 1 pixel)
    return durationMinutes;
  };

  const positionToMinutes = (position: number): number => {
    // Convert pixel position back to minutes, adding START_MINUTES offset
    const minutes = Math.max(START_MINUTES, Math.min(END_MINUTES - 1, Math.round(position + START_MINUTES)));
    // Snap to time increment
    return Math.round(minutes / timeIncrement) * timeIncrement;
  };

  // Timezone-aware date formatting for storage
  const formatDateForStorage = (date: Date): string => {
    // Format date in local timezone to avoid UTC conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get current date in show timezone
  const getCurrentDateInTimezone = (): Date => {
    const now = new Date();
    // Create a date object that represents "today" in the show's timezone
    const timezoneDateString = now.toLocaleDateString('en-CA', { timeZone }); // en-CA gives YYYY-MM-DD format
    return new Date(timezoneDateString + 'T00:00:00');
  };

  // Navigation functions
  const goToPreviousWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() - 7);
    setCurrentWeek(newWeek);
  };

  const goToNextWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + 7);
    setCurrentWeek(newWeek);
  };

  const goToToday = () => {
    // Set to today in the show's timezone
    setCurrentWeek(getCurrentDateInTimezone());
  };

  // Drag to create functionality
  const handleMouseDown = useCallback((e: React.MouseEvent, dayIndex: number) => {
    if (!calendarRef.current) return;

    // Prevent text selection during drag operations
    e.preventDefault();
    
    const rect = calendarRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = positionToMinutes(y);
    
    console.log('Mouse click:', { y, minutes, time: minutesToTime(minutes), dayIndex });

    // Check if clicking on existing item
    const clickedItem = weekAvailability.find(item => {
      const itemDay = weekDates.findIndex((date: Date) => date.toISOString().split('T')[0] === item.date);
      const itemStart = timeToMinutes(item.startTime);
      const itemEnd = timeToMinutes(item.endTime);
      return itemDay === dayIndex && minutes >= itemStart && minutes <= itemEnd;
    });

    if (clickedItem) {
      // Edit existing item
      setEditingItem({
        ...clickedItem,
        notes: clickedItem.notes || '',
        availabilityType: clickedItem.availabilityType
      });
      return;
    }

    // Reset cancellation flag
    dragCanceledRef.current = false;
    
    // Start drag creation
    let dragState = {
      isActive: true,
      startDay: dayIndex,
      startTime: minutes,
      currentDay: dayIndex,
      currentTime: minutes,
      availabilityType: 'unavailable' as const,
      canceled: false
    };

    console.log('Setting isDragCreating state:', dragState);
    setIsDragCreating(dragState);

    const handleMouseMove = (e: MouseEvent) => {
      if (!calendarRef.current) return;

      const rect = calendarRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const newMinutes = positionToMinutes(y);

      dragState = { ...dragState, currentTime: newMinutes };
      setIsDragCreating(dragState);
    };

    const handleMouseUp = () => {
      if (dragState.isActive && !dragCanceledRef.current) {
        const startTime = Math.min(dragState.startTime, dragState.currentTime);
        const endTime = Math.max(dragState.startTime, dragState.currentTime);
        
        console.log('Creating availability:', {
          date: formatDateForStorage(weekDates[dragState.startDay]),
          startTime: minutesToTime(startTime),
          endTime: minutesToTime(endTime),
          duration: endTime - startTime,
          availabilityType: dragState.availabilityType,
          dayIndex: dragState.startDay,
          weekDate: weekDates[dragState.startDay],
          weekDatesDebug: weekDates.map(d => ({ date: d, formatted: formatDateForStorage(d) }))
        });
        
        if (endTime - startTime >= timeIncrement) { // Minimum duration based on increment
          const date = formatDateForStorage(weekDates[dragState.startDay]);
          createMutation.mutate({
            date,
            startTime: minutesToTime(startTime),
            endTime: minutesToTime(endTime),
            availabilityType: dragState.availabilityType,
            notes: ""
          });
        } else {
          console.log('Block too small:', endTime - startTime, 'minutes');
        }
      } else if (dragState.canceled) {
        console.log('Drag was canceled - not creating availability block');
      }
      
      setIsDragCreating(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [weekAvailability, weekDates, createMutation]);

  // Handle dragging existing blocks
  const handleBlockMouseDown = useCallback((e: React.MouseEvent, item: ContactAvailability) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!calendarRef.current || !scrollContainerRef.current) return;
    
    const calendarRect = calendarRef.current.getBoundingClientRect();
    const scrollContainer = scrollContainerRef.current;
    const dayIndex = weekDates.findIndex((date: Date) => date.toISOString().split('T')[0] === item.date);
    const startMinutes = timeToMinutes(item.startTime);
    
    // Calculate drag offset in time units (minutes)
    const scrollTop = scrollContainer.scrollTop;
    const mouseY = e.clientY - calendarRect.top;
    const absoluteMouseTime = mouseY + scrollTop; // Mouse position in calendar time coordinates
    const blockStartTime = startMinutes; // Block start position in minutes
    const offsetY = absoluteMouseTime - blockStartTime; // Offset from block start in time units
    
    console.log('Starting drag:', { 
      item: item.id, 
      dayIndex, 
      startMinutes,
      offsetY,
      clickPosition: e.clientY - calendarRect.top
    });
    
    let currentDragState = {
      item,
      originalPosition: { dayIndex, startMinutes },
      currentPosition: { dayIndex, startMinutes },
      offset: { x: 0, y: offsetY },
      isDragging: true
    };
    
    setDraggedItem(currentDragState);

    const handleMouseMove = (e: MouseEvent) => {
      if (!calendarRef.current || !scrollContainerRef.current) return;
      
      const calendarRect = calendarRef.current.getBoundingClientRect();
      const scrollTop = scrollContainerRef.current.scrollTop;
      
      // Calculate mouse position relative to the visible calendar viewport
      const mouseX = e.clientX - calendarRect.left;
      const mouseY = e.clientY - calendarRect.top;
      
      // Calculate which day column the mouse is over (accounting for 60px time column)
      const dayColumnWidth = calendarRect.width / 7; // Each day column width within the flex-1 area
      const newDayIndex = Math.floor(mouseX / dayColumnWidth);
      const clampedDayIndex = Math.max(0, Math.min(6, newDayIndex));
      
      // If we're just dragging vertically (not horizontally), keep the original day
      const isVerticalDrag = Math.abs(mouseX - (currentDragState.originalPosition.dayIndex * dayColumnWidth + dayColumnWidth / 2)) < dayColumnWidth / 4;
      const finalDayIndex = isVerticalDrag ? currentDragState.originalPosition.dayIndex : clampedDayIndex;
      
      console.log('Day calculation:', {
        mouseX,
        calendarWidth: calendarRect.width,
        dayColumnWidth,
        calculatedDayIndex: newDayIndex,
        clampedDayIndex,
        originalDay: currentDragState.originalPosition.dayIndex,
        isVerticalDrag,
        finalDayIndex,
        originalMouseX: currentDragState.originalPosition.dayIndex * dayColumnWidth + dayColumnWidth / 2
      });
      
      // Calculate new time position using drag offset, not absolute coordinates
      const duration = timeToMinutes(item.endTime) - timeToMinutes(item.startTime);
      const originalStartMinutes = timeToMinutes(item.startTime);
      
      // Calculate new time position correctly
      const absoluteMouseTime = mouseY + scrollTop; // Mouse position in calendar pixels
      const targetTime = absoluteMouseTime - currentDragState.offset.y; // Subtract the click offset
      const rawMinutes = Math.round(targetTime / timeIncrement) * timeIncrement; // Snap to time increment
      
      // Ensure the block stays within valid time bounds
      const newStartMinutes = Math.max(0, Math.min(1439 - duration, rawMinutes));
      
      console.log('Drag move:', {
        mouseY,
        scrollTop,
        absoluteMouseTime,
        targetTime,
        rawMinutes,
        duration,
        maxStart: 1439 - duration,
        newStartMinutes,
        time: minutesToTime(newStartMinutes),
        endTime: minutesToTime(newStartMinutes + duration),
        originalStart: originalStartMinutes,
        isMovingUp: rawMinutes < originalStartMinutes,
        constraintApplied: rawMinutes !== newStartMinutes
      });
      
      currentDragState = {
        ...currentDragState,
        currentPosition: { dayIndex: finalDayIndex, startMinutes: newStartMinutes }
      };
      
      setDraggedItem({ ...currentDragState });
    };

    const handleMouseUp = () => {
      console.log('Ending drag:', currentDragState);
      
      if (currentDragState.isDragging) {
        const { currentPosition, originalPosition, item } = currentDragState;
        
        // Set flag to prevent click event
        setJustDragged(item.id);
        setTimeout(() => setJustDragged(null), 100); // Clear flag after 100ms
        
        // Update if time position or day changed and mutation isn't already pending
        if ((currentPosition.startMinutes !== originalPosition.startMinutes || 
             currentPosition.dayIndex !== originalPosition.dayIndex) &&
            !updateMutation.isPending) {
          
          // Calculate new date based on day index
          const newDate = formatDateForStorage(weekDates[currentPosition.dayIndex]);
          const duration = timeToMinutes(item.endTime) - timeToMinutes(item.startTime);
          const newEndMinutes = currentPosition.startMinutes + duration;
          
          console.log('Updating availability position:', {
            id: item.id,
            oldDate: item.date,
            newDate,
            oldTime: `${item.startTime} - ${item.endTime}`,
            newTime: `${minutesToTime(currentPosition.startMinutes)} - ${minutesToTime(newEndMinutes)}`,
            dayChanged: currentPosition.dayIndex !== originalPosition.dayIndex,
            weekDatesDebug: weekDates.map((d, i) => ({ index: i, date: formatDateForStorage(d) })),
            selectedDayIndex: currentPosition.dayIndex,
            selectedDateObject: weekDates[currentPosition.dayIndex],
            selectedDateFormatted: formatDateForStorage(weekDates[currentPosition.dayIndex]),
            originalDayIndex: originalPosition.dayIndex,
            currentDayIndex: currentPosition.dayIndex
          });
          
          // Update UI immediately for instant feedback
          setDraggedItem(null);
          
          updateMutation.mutate({
            id: item.id,
            data: {
              date: newDate,
              startTime: minutesToTime(currentPosition.startMinutes),
              endTime: minutesToTime(newEndMinutes),
              availabilityType: item.availabilityType,
              notes: item.notes || ""
            }
          } as any);
        } else {
          setDraggedItem(null);
        }
      } else {
        setDraggedItem(null);
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [weekDates, updateMutation]);

  // Handle resizing existing blocks
  const handleResizeMouseDown = useCallback((e: React.MouseEvent, item: ContactAvailability, edge: 'start' | 'end') => {
    e.stopPropagation();
    
    if (!calendarRef.current || !scrollContainerRef.current) return;
    
    const scrollContainer = scrollContainerRef.current;
    const calendarRect = calendarRef.current.getBoundingClientRect();
    
    console.log(`Starting resize on ${edge} edge for item:`, item.id);
    
    const startMinutes = timeToMinutes(item.startTime);
    const endMinutes = timeToMinutes(item.endTime);
    
    // Calculate initial mouse position for relative dragging
    const initialMouseY = e.clientY - calendarRect.top;
    const initialScrollTop = scrollContainer.scrollTop;
    const initialAbsoluteY = initialMouseY + initialScrollTop;
    
    // Store resize state in local variables instead of React state
    let currentPreviewStart = startMinutes;
    let currentPreviewEnd = endMinutes;
    
    setIsResizing({ id: item.id, edge });
    
    const handleMouseMove = (e: MouseEvent) => {
      const currentMouseY = e.clientY - calendarRect.top;
      const currentScrollTop = scrollContainer.scrollTop;
      const currentAbsoluteY = currentMouseY + currentScrollTop;
      
      // Calculate how much the mouse has moved from the initial position
      const deltaY = currentAbsoluteY - initialAbsoluteY;
      const deltaMinutes = Math.round(deltaY / timeIncrement) * timeIncrement; // Snap to increment
      
      if (edge === 'start') {
        // Resizing from top - adjust start time by the delta
        const newStartMinutes = startMinutes + deltaMinutes;
        currentPreviewStart = Math.max(START_MINUTES, Math.min(endMinutes - timeIncrement, newStartMinutes));
        currentPreviewEnd = endMinutes;
      } else {
        // Resizing from bottom - adjust end time by the delta, cap at END_MINUTES
        const newEndMinutes = endMinutes + deltaMinutes;
        currentPreviewStart = startMinutes;
        currentPreviewEnd = Math.max(startMinutes + timeIncrement, Math.min(END_MINUTES - 1, newEndMinutes));
      }
      
      console.log(`Resizing ${edge}:`, {
        mouseY: currentMouseY,
        deltaY,
        deltaMinutes,
        originalStart: minutesToTime(startMinutes),
        originalEnd: minutesToTime(endMinutes),
        newStart: minutesToTime(currentPreviewStart),
        newEnd: minutesToTime(currentPreviewEnd),
        duration: currentPreviewEnd - currentPreviewStart
      });
      
      // Update the visual state immediately
      setIsResizing({ 
        id: item.id, 
        edge,
        previewStartMinutes: currentPreviewStart,
        previewEndMinutes: currentPreviewEnd
      } as any);
    };
    
    const handleMouseUp = () => {
      // Only save if there's actually a change
      const hasChanged = currentPreviewStart !== startMinutes || currentPreviewEnd !== endMinutes;
      
      console.log('Finalizing resize:', {
        id: item.id,
        oldTime: `${item.startTime} - ${item.endTime}`,
        newTime: `${minutesToTime(currentPreviewStart)} - ${minutesToTime(currentPreviewEnd)}`,
        hasChanged,
        edge
      });
      
      if (hasChanged) {
        updateMutation.mutate({
          id: item.id,
          data: {
            date: item.date,
            startTime: minutesToTime(currentPreviewStart),
            endTime: minutesToTime(currentPreviewEnd),
            availabilityType: item.availabilityType,
            notes: item.notes || ""
          }
        } as any);
      }
      
      setIsResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [timeIncrement, updateMutation, isResizing]);

  // Add escape key handler to cancel drag operations - only when dialog is open
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Only handle escape if we have active drag operations
        if (isDragCreating || draggedItem || isResizing) {
          e.preventDefault();
          e.stopPropagation();
          
          console.log('Escape pressed - canceling drag operations:', { isDragCreating, draggedItem, isResizing });
          
          // Cancel any active drag operations
          if (isDragCreating) {
            dragCanceledRef.current = true;
            setIsDragCreating(null);
          }
          if (draggedItem) {
            setDraggedItem(null);
          }
          if (isResizing) {
            setIsResizing(null);
          }
          
          // Remove any active event listeners
          document.removeEventListener('mousemove', () => {});
          document.removeEventListener('mouseup', () => {});
        }
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, isDragCreating, draggedItem, isResizing]);

  // Generate time labels based on configurable time range
  const timeLabels = [];
  
  // Generate labels based on time increment, but only show hour labels
  for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += 60) { // Every hour
    const hour = Math.floor(minutes / 60);
    timeLabels.push({
      hour,
      label: minutesToTime(minutes),
      position: minutes - START_MINUTES // Position relative to 8 AM start
    });
  }

  // Generate grid lines based on time increment starting from 8 AM using show's time format
  const gridLines = [];
  for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += timeIncrement) {
    const min = minutes % 60;
    gridLines.push({
      minutes,
      label: minutesToTime(minutes),
      isHour: min === 0
    });
  }

  const getAvailabilityColor = (type: string) => {
    // Get colors from show settings schedule tab if available
    const availabilitySettings = showSettings?.scheduleSettings ? 
      (typeof showSettings.scheduleSettings === 'string' ? 
        JSON.parse(showSettings.scheduleSettings) : 
        showSettings.scheduleSettings) : {};
    
    const colors = availabilitySettings.availabilityColors || {};
    
    if (type === 'unavailable' && colors.unavailable) {
      return `border-2 hover:opacity-90` + ` ` + `bg-[${colors.unavailable}] border-[${colors.unavailable}]`;
    }
    if (type === 'preferred' && colors.preferred) {
      return `border-2 hover:opacity-90` + ` ` + `bg-[${colors.preferred}] border-[${colors.preferred}]`;
    }
    
    // Fallback to default colors
    switch (type) {
      case 'unavailable': return 'bg-red-500 hover:bg-red-600 border-red-600 border-2';
      case 'preferred': return 'bg-blue-500 hover:bg-blue-600 border-blue-600 border-2';
      default: return 'bg-gray-500 hover:bg-gray-600 border-gray-600 border-2';
    }
  };

  const formatWeekRange = (dates: Date[]) => {
    const start = dates[0];
    const end = dates[6];
    const startFormatted = start.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const endFormatted = end.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    return `${startFormatted} - ${endFormatted}`;
  };

  const handleDialogOpenChange = (open: boolean) => {
    // Prevent dialog from closing if we have active drag operations
    if (!open && (isDragCreating || draggedItem || isResizing)) {
      return; // Don't close the dialog
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      {externalIsOpen === undefined && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Manage Availability
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-7xl max-h-[90vh] w-[95vw] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Weekly Availability - {contact.firstName} {contact.lastName}
          </DialogTitle>
          <DialogDescription>
            Drag on the calendar to create availability blocks. Click existing blocks to edit them.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
          {/* Schedule-style unified header */}
          <div className="flex items-center justify-between mb-4">
            {/* Left side - Week range display */}
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                {formatWeekRange(weekDates)}
              </h1>
            </div>

            {/* Right side - Controls matching schedule view */}
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs px-2 py-1 h-auto">
                    {timeIncrement} Min
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTimeIncrement(15)}>
                    15 Min
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeIncrement(30)}>
                    30 Min
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeIncrement(60)}>
                    60 Min
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                variant={showAllDayEvents ? "default" : "outline"}
                size="sm" 
                className="text-xs px-2 py-1 h-auto"
                onClick={() => setShowAllDayEvents(!showAllDayEvents)}
              >
                <Calendar className="h-3 w-3 mr-1" />
                All Day
              </Button>
              <Button variant="outline" onClick={goToToday} size="sm" className="text-xs px-2 py-1 h-auto">
                Today
              </Button>
              <div className="flex items-center">
                <button onClick={goToPreviousWeek} className="p-1 hover:bg-gray-100 rounded-l transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={goToNextWeek} className="p-1 hover:bg-gray-100 rounded-r transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Secondary controls row */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span>Create as:</span>
                <Select 
                  value={isDragCreating?.availabilityType || 'unavailable'} 
                  onValueChange={(value) => {
                    if (isDragCreating) {
                      setIsDragCreating(prev => prev ? { ...prev, availabilityType: value as any } : null);
                    }
                  }}
                >
                  <SelectTrigger className="w-32 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                    <SelectItem value="preferred">Preferred</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              Times shown in {getTimezoneAbbreviation(timeZone || "America/New_York")}
            </div>
          </div>

          {/* Calendar grid */}
          <div className="flex-1 border rounded-lg overflow-hidden bg-white flex flex-col">
            {/* Day headers */}
            <div className="flex bg-gray-50 border-b">
              <div className="p-3 text-xs font-medium text-gray-500 border-r bg-gray-50" style={{ width: '60px', flexShrink: 0 }}>Time</div>
              <div className="flex-1 flex">
                {weekDates.map((date: Date, index: number) => {
                  const isToday = date.toDateString() === new Date().toDateString();
                  return (
                    <div key={index} className="p-3 text-center border-r last:border-r-0 flex-1">
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
            </div>

            {/* All Day Events section - conditionally visible */}
            {showAllDayEvents && (
            <div className="flex border-b bg-gray-25">
              <div className="p-2 text-xs font-medium text-gray-500 border-r bg-gray-50 flex items-center" style={{ width: '60px', flexShrink: 0 }}>
                All Day
              </div>
              <div className="flex-1 flex">
                {weekDates.map((date: Date, dayIndex: number) => {
                const dayEvents = allDayEvents.filter((event: any) => 
                  event.date === date.toISOString().split('T')[0]
                );
                
                return (
                  <div key={dayIndex} className="p-1 border-r last:border-r-0 min-h-[40px] max-h-[80px] overflow-y-auto flex-1">
                    {dayEvents.map((event: any) => {
                      // Safe color fallback  
                      let eventColor = '#3b82f6'; // Default blue
                      try {
                        // Use event.type field instead of event.eventType
                        if (event.type && eventTypes?.length > 0) {
                          eventColor = getEventTypeColorFromDatabase(event.type, eventTypes);
                        }
                      } catch (error) {
                        console.warn('Error getting event color:', error);
                      }
                      
                      return (
                        <div
                          key={event.id}
                          className="text-xs p-1 mb-1 rounded text-white truncate"
                          style={{ 
                            backgroundColor: eventColor,
                            fontSize: '11px'
                          }}
                          title={`${event.title}${event.location ? ` - ${event.location}` : ''}`}
                        >
                          {event.title}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              </div>
            </div>
            )}

            {/* Calendar body */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 border-t scrollbar-hide"
              style={{ 
                overflowY: 'scroll',
                position: 'relative',
                boxSizing: 'border-box'
              }}
              onScroll={(e) => {
                const scrollTop = e.currentTarget.scrollTop;
                setScrollPosition(scrollTop);
              }}
            >
              <div className="flex" style={{ height: `${TOTAL_HOURS * 60}px`, boxSizing: 'border-box' }}>
                {/* Time column */}
                <div className="border-r bg-gray-50" style={{ width: '60px', flexShrink: 0, boxSizing: 'border-box', position: 'relative', zIndex: 20 }}>
                  <div className="relative h-full">
                    {timeLabels.map(({ hour, label, position }) => (
                      <div
                        key={hour}
                        className={`absolute text-xs text-gray-600 px-2 ${hour === START_HOUR ? 'translate-y-0' : '-translate-y-1/2'}`}
                        style={{ top: `${minutesToPosition(hour * 60)}px` }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calendar body */}
                <div className="flex-1 relative select-none" ref={calendarRef} style={{ boxSizing: 'border-box' }}>
                  {/* Working hours background highlight */}
                  <div
                    className="absolute w-full bg-blue-50 opacity-30"
                    style={{
                      top: `${minutesToPosition(startHour * 60)}px`,
                      height: `${minutesToPosition((endHour - startHour) * 60)}px`
                    }}
                  />

                  {/* Grid lines based on time increment */}
                  {gridLines.map(({ minutes, isHour }) => (
                    <div
                      key={minutes}
                      className={`absolute w-full border-t ${isHour ? 'border-gray-300' : 'border-gray-100'}`}
                      style={{ top: `${minutesToPosition(minutes)}px` }}
                    />
                  ))}

                  {/* Day columns background */}
                  {weekDates.map((_: Date, dayIndex: number) => (
                    <div
                      key={dayIndex}
                      className={`absolute h-full cursor-crosshair ${dayIndex !== 6 ? 'border-r' : ''}`}
                      style={{ 
                        left: `${(dayIndex / 7) * 100}%`,
                        width: `${100 / 7}%`,
                        top: 0,
                        bottom: 0,
                        borderColor: '#e5e7eb'
                      }}
                      onMouseDown={(e) => handleMouseDown(e, dayIndex)}
                    />
                  ))}

                  {/* Existing availability blocks */}
                  {weekAvailability.map((item: ContactAvailability) => {
                    const dayIndex = weekDates.findIndex((date: Date) => 
                      date.toISOString().split('T')[0] === item.date
                    );
                    if (dayIndex === -1) return null;

                    const startMinutes = timeToMinutes(item.startTime);
                    const endMinutes = timeToMinutes(item.endTime);
                    const duration = endMinutes - startMinutes;
                    
                    // Check if this item is being dragged or resized
                    const isBeingDragged = draggedItem?.item.id === item.id;
                    const isBeingResized = isResizing?.id === item.id;
                    
                    // Use current position if being dragged or resized, otherwise original position
                    let displayDayIndex = dayIndex;
                    let displayStartMinutes = startMinutes;
                    let displayEndMinutes = endMinutes;
                    
                    if (isBeingDragged) {
                      displayDayIndex = draggedItem.currentPosition.dayIndex;
                      displayStartMinutes = draggedItem.currentPosition.startMinutes;
                      displayEndMinutes = displayStartMinutes + duration;
                    } else if (isBeingResized && (isResizing as any).previewStartMinutes !== undefined) {
                      displayStartMinutes = (isResizing as any).previewStartMinutes;
                      displayEndMinutes = (isResizing as any).previewEndMinutes;
                    }
                    
                    return (
                      <div
                        key={item.id}
                        className={`absolute rounded cursor-move border-2 transition-opacity ${getAvailabilityColor(item.availabilityType)} ${isBeingDragged ? 'opacity-80 shadow-lg z-50' : 'hover:opacity-90'}`}
                        style={{
                          left: `${(displayDayIndex / 7) * 100 + 0.5}%`,
                          width: `${100 / 7 - 1}%`,
                          top: `${minutesToPosition(displayStartMinutes)}px`,
                          height: `${minutesToHeight(displayEndMinutes - displayStartMinutes)}px`,
                          transform: isBeingDragged || isBeingResized ? 'scale(1.02)' : 'none'
                        }}
                        onMouseDown={(e) => {
                          console.log('Block mousedown triggered for item:', item.id);
                          
                          // Clear any existing timeout
                          if (clickTimeoutRef.current) {
                            clearTimeout(clickTimeoutRef.current);
                            clickTimeoutRef.current = null;
                          }
                          
                          // Delay drag start to allow double-click detection
                          clickTimeoutRef.current = setTimeout(() => {
                            handleBlockMouseDown(e, item);
                          }, 200); // 200ms delay
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          console.log('Block double-clicked, item:', item.id);
                          
                          // Cancel the delayed drag start
                          if (clickTimeoutRef.current) {
                            clearTimeout(clickTimeoutRef.current);
                            clickTimeoutRef.current = null;
                          }
                          
                          setEditingItem({
                            ...item,
                            notes: item.notes || '',
                            availabilityType: item.availabilityType
                          });
                        }}
                      >
                        {/* Top resize handle */}
                        <div
                          className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white hover:bg-opacity-20 transition-colors"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            if (clickTimeoutRef.current) {
                              clearTimeout(clickTimeoutRef.current);
                              clickTimeoutRef.current = null;
                            }
                            
                            console.log('Starting resize from top for item:', item.id);
                            handleResizeMouseDown(e, item, 'start');
                          }}
                        />
                        
                        {/* Bottom resize handle */}
                        <div
                          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-white hover:bg-opacity-20 transition-colors"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            if (clickTimeoutRef.current) {
                              clearTimeout(clickTimeoutRef.current);
                              clickTimeoutRef.current = null;
                            }
                            
                            console.log('Starting resize from bottom for item:', item.id);
                            handleResizeMouseDown(e, item, 'end');
                          }}
                        />

                        <div className="p-1 text-white text-xs">
                          <div className="font-medium">
                            {formatTimeFromMinutes(displayStartMinutes, timeFormat)} - {formatTimeFromMinutes(displayEndMinutes, timeFormat)}
                          </div>
                          <div className="capitalize opacity-90">
                            {item.availabilityType}
                          </div>
                          {item.notes && (
                            <div className="opacity-75 truncate">{item.notes}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Schedule Events (showing as conflicts) */}
                  {(scheduleEvents as any[]).map((event: any) => {
                    // Find which participants match this contact
                    const isParticipant = event.participants?.some((p: any) => p.contactId === contact.id);
                    if (!isParticipant) return null;

                    // Find the day index for this event
                    const eventDayIndex = weekDates.findIndex((date: Date) => 
                      date.toISOString().split('T')[0] === event.date
                    );
                    if (eventDayIndex === -1) return null;

                    const startMinutes = timeToMinutes(event.startTime);
                    const endMinutes = timeToMinutes(event.endTime);

                    return (
                      <div
                        key={`event-${event.id}`}
                        className="absolute rounded border-2 text-white text-xs pointer-events-none z-30"
                        style={{
                          left: `${(eventDayIndex / 7) * 100 + 0.5}%`,
                          width: `${100 / 7 - 1}%`,
                          top: `${minutesToPosition(startMinutes)}px`,
                          height: `${minutesToHeight(endMinutes - startMinutes)}px`,
                          backgroundColor: getEventTypeColorFromDatabase(event.type, eventTypes),
                          borderColor: getEventTypeColorFromDatabase(event.type, eventTypes)
                        }}
                        title={`Scheduled: ${event.title} (${formatTimeDisplay(event.startTime.slice(0, 5), timeFormat)} - ${formatTimeDisplay(event.endTime.slice(0, 5), timeFormat)})`}
                      >
                        <div className="p-1">
                          <div className="font-medium truncate">{event.title}</div>
                          <div className="opacity-90 truncate">
                            {formatTimeDisplay(event.startTime.slice(0, 5), timeFormat)} - {formatTimeDisplay(event.endTime.slice(0, 5), timeFormat)}
                          </div>
                          <div className="opacity-75 text-xs truncate">{event.type}</div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Drag creation preview */}
                  {isDragCreating?.isActive && (
                    <div
                      className={`absolute rounded border-2 border-dashed opacity-60 ${getAvailabilityColor(isDragCreating.availabilityType)}`}
                      style={{
                        left: `${(isDragCreating.startDay / 7) * 100 + 0.5}%`,
                        width: `${100 / 7 - 1}%`,
                        top: `${minutesToPosition(Math.min(isDragCreating.startTime, isDragCreating.currentTime))}px`,
                        height: `${minutesToHeight(Math.abs(isDragCreating.currentTime - isDragCreating.startTime))}px`
                      }}
                    >
                      <div className="p-1 text-white text-xs">
                        <div className="font-medium">
                          {formatTimeFromMinutes(Math.min(isDragCreating.startTime, isDragCreating.currentTime), timeFormat)} - 
                          {formatTimeFromMinutes(Math.max(isDragCreating.startTime, isDragCreating.currentTime), timeFormat)}
                        </div>
                        <div className="capitalize">{isDragCreating.availabilityType}</div>
                      </div>
                    </div>
                  )}

                  {/* Dragged item preview */}
                  {draggedItem && (
                    <div
                      className={`absolute rounded border-2 border-blue-500 border-dashed opacity-70 ${getAvailabilityColor(draggedItem.item.availabilityType)}`}
                      style={{
                        left: `${(draggedItem.currentPosition.dayIndex / 7) * 100 + 0.5}%`,
                        width: `${100 / 7 - 1}%`,
                        top: `${minutesToPosition(draggedItem.currentPosition.startMinutes)}px`,
                        height: `${minutesToPosition(timeToMinutes(draggedItem.item.endTime) - timeToMinutes(draggedItem.item.startTime))}px`,
                        zIndex: 1000
                      }}
                    >
                      <div className="p-1 text-white text-xs">
                        <div className="font-medium">
                          {formatTimeFromMinutes(draggedItem.currentPosition.startMinutes, timeFormat)} - 
                          {formatTimeFromMinutes(draggedItem.currentPosition.startMinutes + (timeToMinutes(draggedItem.item.endTime) - timeToMinutes(draggedItem.item.startTime)), timeFormat)}
                        </div>
                        <div className="capitalize">{draggedItem.item.availabilityType}</div>
                      </div>
                    </div>
                  )}
                </div>  {/* Close Day columns */}
              </div>  {/* Close Height container */}
            </div>  {/* Close Calendar body */}
          </div>  {/* Close Calendar grid */}

          {/* Legend */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Unavailable</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Preferred</span>
              </div>
              <div className="text-xs text-gray-500 ml-4">
                Empty time slots = Available for scheduling
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Drag to create • Double-click to edit • Drag edges to resize • Minimum {timeIncrement} minutes
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Edit dialog */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Availability</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select 
                  value={editingItem.availabilityType} 
                  onValueChange={(value) => setEditingItem(prev => prev ? { ...prev, availabilityType: value as 'unavailable' | 'preferred' } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                    <SelectItem value="preferred">Preferred</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={editingItem.notes}
                  onChange={(e) => setEditingItem(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  rows={3}
                />
              </div>
              <div className="flex justify-between">
                <Button
                  variant="destructive"
                  onClick={() => {
                    deleteMutation.mutate(editingItem.id);
                    setEditingItem(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setEditingItem(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      updateMutation.mutate({
                        id: editingItem.id,
                        data: {
                          availabilityType: editingItem.availabilityType,
                          notes: editingItem.notes
                        }
                      });
                      setEditingItem(null);
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}