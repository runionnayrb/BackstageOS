import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatTimeFromMinutes, parseScheduleSettings, getTimezoneAbbreviation } from "@/lib/timeUtils";
import { getEventTypeColorFromDatabase } from "@/lib/eventUtils";
import ScheduleFilter from "@/components/schedule-filter";
import { filterEventsBySettings } from "@/lib/scheduleUtils";

interface EventLocation {
  id: number;
  name: string;
  address?: string;
  description?: string;
  capacity?: number;
  notes?: string;
  projectId: number;
}

interface LocationAvailability {
  id: number;
  locationId: number;
  projectId: number;
  date: string;
  startTime: string;
  endTime: string;
  availabilityType: 'unavailable' | 'preferred';
  notes?: string;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  locationName?: string;
}

interface LocationAvailabilityProps {
  projectId: number;
  onBack: () => void;
}

const START_MINUTES = 8 * 60; // 8:00 AM in minutes
const END_MINUTES = 24 * 60; // Midnight in minutes
const TOTAL_MINUTES = END_MINUTES - START_MINUTES; // 16 hours

export default function LocationAvailability({
  projectId,
  onBack,
}: LocationAvailabilityProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeIncrement, setTimeIncrement] = useState(30); // minutes
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; locationId?: number } | null>(null);
  const [newBlock, setNewBlock] = useState<any>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [draggedItems, setDraggedItems] = useState<any[]>([]);
  const [resizingItem, setResizingItem] = useState<any>(null);
  const [resizeMode, setResizeMode] = useState<'top' | 'bottom' | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedItemsRef = useRef<Set<number>>(new Set());
  
  // Event type filtering state
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [selectedIndividualTypes, setSelectedIndividualTypes] = useState<string[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    selectedItemsRef.current = selectedItems;
  }, [selectedItems]);

  // Keyboard event handlers for shift selection and delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        console.log('Shift key pressed - entering multiselect mode');
        setIsShiftPressed(true);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        setSelectedItems(current => {
          console.log('Delete key pressed, selected items:', current.size);
          if (current.size > 0) {
            console.log('Opening bulk delete dialog');
            setShowBulkDeleteDialog(true);
          }
          return current;
        });
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
  }, []);

  // Get show settings for timezone and time format
  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Parse schedule settings with time format preference
  const scheduleSettings = parseScheduleSettings(showSettings?.scheduleSettings);
  const { timeFormat, timezone } = scheduleSettings;

  // Get locations data
  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/event-locations`],
  });

  // Get location availability data
  const { data: allAvailability = [], isLoading: availabilityLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/location-availability`],
  });

  // Get schedule events to show as reservations/conflicts
  const { data: scheduleEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/schedule-events`],
  });

  // Get event types for color matching
  const { data: eventTypes = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/event-types`],
    enabled: !!projectId,
  });

  const isLoading = locationsLoading || availabilityLoading || eventsLoading;

  // Use all locations without the old filter (removed duplicate filter functionality)
  const filteredLocations = locations;

  // Time formatting using show settings preference
  const formatTime = (minutes: number) => {
    return formatTimeFromMinutes(minutes, timeFormat);
  };

  // Convert time string to minutes since start of day
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Convert minutes to percentage position for full width
  const minutesToPosition = (minutes: number) => {
    return Math.max(0, minutes - START_MINUTES);
  };

  // Convert percentage position to minutes
  const percentToMinutes = (percent: number) => {
    return START_MINUTES + (percent / 100) * TOTAL_MINUTES;
  };

  // Convert minutes to percentage for full width positioning
  const minutesToPercent = (minutes: number) => {
    return ((minutes - START_MINUTES) / TOTAL_MINUTES) * 100;
  };

  // Generate time labels based on increment
  const timeLabels = [];
  for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += timeIncrement) {
    timeLabels.push({
      minutes,
      label: formatTime(minutes),
    });
  }

  // Get availability for a specific location on the current date
  const getLocationAvailabilityForDate = (locationId: number) => {
    const dateStr = currentDate.toISOString().split('T')[0];
    return (allAvailability as LocationAvailability[]).filter(
      (item: LocationAvailability) => item.locationId === locationId && item.date === dateStr
    );
  };

  // Get schedule events for a specific location on the current date with filtering
  const getScheduleEventsForLocationAndDate = useCallback((locationId: number) => {
    const dateStr = currentDate.toISOString().split('T')[0];
    const location = locations.find((loc: EventLocation) => loc.id === locationId);
    if (!location) return [];
    
    const eventsForLocation = scheduleEvents.filter((event: any) => {
      // Match by location name and date
      return event.date === dateStr && event.location === location.name;
    });
    
    // If no filters are selected at all, show no events
    if (selectedEventTypes.length === 0 && selectedIndividualTypes.length === 0) {
      return [];
    }
    
    // Use the shared filtering utility with proper format conversion
    // Create a mock schedule settings object to use with the shared utility
    const mockScheduleSettings = {
      enabledEventTypes: selectedEventTypes
    };
    
    return filterEventsBySettings(eventsForLocation, mockScheduleSettings, eventTypes, selectedIndividualTypes);
  }, [currentDate, locations, scheduleEvents, selectedEventTypes, selectedIndividualTypes, eventTypes]);

  // Navigation functions
  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Helper functions for drag operations
  const positionToMinutes = (position: number, containerWidth: number) => {
    const percentage = Math.max(0, Math.min(1, position / containerWidth));
    const minutes = START_MINUTES + (percentage * TOTAL_MINUTES);
    return snapToIncrement(Math.max(START_MINUTES, Math.min(END_MINUTES, minutes)));
  };

  const snapToIncrement = (minutes: number) => {
    return Math.round(minutes / timeIncrement) * timeIncrement;
  };

  const formatTimeFromMinutesLocal = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Helper function to get location ID from Y position
  const getLocationIdFromY = (y: number) => {
    const rowHeight = 64; // h-16 = 64px
    const headerHeight = 40; // h-10 = 40px
    const rowIndex = Math.floor((y - headerHeight) / rowHeight);
    return filteredLocations[rowIndex]?.id;
  };

  // Mutations for CRUD operations
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/projects/${projectId}/locations/${data.locationId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create availability");
      return response.json();
    },
    onMutate: async (data: any) => {
      await queryClient.cancelQueries({ queryKey: [`/api/projects/${projectId}/location-availability`] });
      
      const previousData = queryClient.getQueryData([`/api/projects/${projectId}/location-availability`]);
      
      const tempItem = {
        id: Date.now(),
        locationId: data.locationId,
        projectId: projectId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        availabilityType: data.availabilityType,
        notes: data.notes || '',
        createdBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        locationName: ''
      };
      
      queryClient.setQueryData([`/api/projects/${projectId}/location-availability`], (old: any) => {
        return old ? [...old, tempItem] : [tempItem];
      });
      
      return { previousData, tempId: tempItem.id };
    },
    onSuccess: (newItem, variables, context) => {
      queryClient.setQueryData([`/api/projects/${projectId}/location-availability`], (old: any) => {
        return old?.map((item: any) => 
          item.id === context?.tempId ? newItem : item
        ) || [];
      });
      setNewBlock(null);
      setEditingItem(newItem);
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData([`/api/projects/${projectId}/location-availability`], context.previousData);
      }
      toast({ 
        title: "Failed to create availability", 
        description: error.message,
        variant: "destructive" 
      });
      setNewBlock(null);
    },
  });

  // Silent background update function
  const silentUpdate = useCallback((id: number, data: any) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/locations/${data.locationId}/availability/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Failed to update availability");
      } catch (error) {
        console.error("Silent update failed:", error);
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/location-availability`] });
      }
    }, 500);
  }, [projectId, queryClient]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/projects/${projectId}/locations/${data.locationId}/availability/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update availability");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/location-availability`] });
      setEditingItem(null);
    },
    onError: (error) => {
      toast({ 
        title: "Failed to update availability", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log("Frontend: Attempting to delete availability ID:", id);
      const response = await fetch(`/api/projects/${projectId}/location-availability/${id}`, {
        method: "DELETE",
      });
      console.log("Frontend: Delete response status:", response.status);
      if (!response.ok) throw new Error("Failed to delete availability");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/location-availability`] });
      setEditingItem(null);
    },
    onError: (error) => {
      toast({ 
        title: "Failed to delete availability", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      console.log("Frontend: Attempting bulk delete of IDs:", ids);
      await Promise.all(ids.map(id =>
        fetch(`/api/projects/${projectId}/location-availability/${id}`, {
          method: "DELETE",
        }).then(response => {
          if (!response.ok) throw new Error(`Failed to delete availability ${id}`);
        })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/location-availability`] });
      setSelectedItems(new Set());
      setShowBulkDeleteDialog(false);
      toast({ title: "Selected availability blocks deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to delete availability blocks", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Event handlers
  const handleSaveEdit = () => {
    if (!editingItem) return;
    
    const updateData = {
      locationId: editingItem.locationId,
      startTime: editingItem.startTime,
      endTime: editingItem.endTime,
      type: editingItem.availabilityType,
      notes: editingItem.notes,
      date: editingItem.date,
    };
    
    updateMutation.mutate({ id: editingItem.id, data: updateData });
  };

  const handleDelete = () => {
    if (!editingItem) return;
    deleteMutation.mutate(editingItem.id);
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedItems);
    bulkDeleteMutation.mutate(ids);
  };

  // Mouse event handlers for drag operations
  // Drag event handlers
  const handleMouseDown = (e: React.MouseEvent, locationId: number) => {
    if (e.button !== 0) return; // Only left click
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left; // Position relative to the location row
    const y = e.clientY - rect.top;
    
    const numSegments = timeLabels.length;
    const segmentWidth = rect.width / numSegments;
    const segmentIndex = Math.floor(x / segmentWidth);
    
    console.log('Mouse down debug:', {
      clientX: e.clientX,
      relativeX: x,
      containerWidth: rect.width,
      numSegments,
      segmentWidth,
      segmentIndex,
      convertedMinutes: positionToMinutes(x, rect.width),
      convertedTime: formatTimeFromMinutesLocal(positionToMinutes(x, rect.width))
    });
    
    setIsDragging(true);
    setDragStart({ x, y, locationId });
    e.preventDefault();
  };;





  // Global mouse event handlers for document listeners (proper DOM event types)
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStart) {
      console.log('GlobalMouseMove called but not dragging:', { isDragging, dragStart });
      return;
    }
    
    console.log('GlobalMouseMove active:', { isDragging, dragStart, clientX: e.clientX, clientY: e.clientY });

    // Find the location row that's being dragged over
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const locationRow = element?.closest('.location-row') as HTMLElement;
    if (!locationRow) return;

    const rect = locationRow.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    const containerWidth = rect.width;

    if (draggedItem) {
      // Moving existing item - use relative position from original click
      const deltaX = currentX - dragStart.x;
      const startMinutes = timeToMinutes(draggedItem.originalStartTime);
      const endMinutes = timeToMinutes(draggedItem.originalEndTime);
      const duration = endMinutes - startMinutes;
      
      // Convert delta pixels to delta minutes
      const deltaMinutes = (deltaX / containerWidth) * TOTAL_MINUTES;
      
      // Apply delta movement to original position (not absolute positioning)
      const newStartMinutes = snapToIncrement(Math.max(START_MINUTES, Math.min(END_MINUTES - duration, startMinutes + deltaMinutes)));
      const newEndMinutes = newStartMinutes + duration;
      
      const newLocationId = getLocationIdFromY(currentY);
      
      setDraggedItem({
        ...draggedItem,
        startTime: formatTimeFromMinutesLocal(newStartMinutes),
        endTime: formatTimeFromMinutesLocal(newEndMinutes),
        locationId: newLocationId || draggedItem.locationId,
      });
    } else if (draggedItems.length > 0) {
      // Moving multiple selected items
      const deltaX = currentX - dragStart.x;
      const deltaMinutes = (deltaX / containerWidth) * TOTAL_MINUTES;
      
      const newLocationId = getLocationIdFromY(currentY);
      
      setDraggedItems(draggedItems.map(item => {
        const startMinutes = timeToMinutes(item.originalStartTime);
        const endMinutes = timeToMinutes(item.originalEndTime);
        const duration = endMinutes - startMinutes;
        
        // Apply delta movement to original position
        const newStartMinutes = snapToIncrement(Math.max(START_MINUTES, Math.min(END_MINUTES - duration, startMinutes + deltaMinutes)));
        const newEndMinutes = newStartMinutes + duration;
        
        return {
          ...item,
          startTime: formatTimeFromMinutesLocal(newStartMinutes),
          endTime: formatTimeFromMinutesLocal(newEndMinutes),
          locationId: newLocationId || item.locationId,
        };
      }));
    } else if (resizingItem) {
      // Resizing existing item
      const deltaX = currentX - dragStart.x;
      const startMinutes = timeToMinutes(resizingItem.originalStartTime);
      const endMinutes = timeToMinutes(resizingItem.originalEndTime);
      
      // Convert delta pixels to delta minutes
      const deltaMinutes = (deltaX / containerWidth) * TOTAL_MINUTES;
      
      let newStartMinutes = startMinutes;
      let newEndMinutes = endMinutes;
      
      if (resizeMode === 'top') {
        newStartMinutes = snapToIncrement(Math.max(START_MINUTES, Math.min(endMinutes - timeIncrement, startMinutes + deltaMinutes)));
      } else if (resizeMode === 'bottom') {
        newEndMinutes = snapToIncrement(Math.max(startMinutes + timeIncrement, Math.min(END_MINUTES, endMinutes + deltaMinutes)));
      }
      
      setResizingItem({
        ...resizingItem,
        startTime: formatTimeFromMinutesLocal(newStartMinutes),
        endTime: formatTimeFromMinutesLocal(newEndMinutes),
      });
    } else if (!newBlock) {
      // Creating new block - use actual click position as starting point
      const startX = dragStart.x;
      const endX = currentX;
      const leftX = Math.min(startX, endX);
      const rightX = Math.max(startX, endX);
      
      const startMinutes = snapToIncrement(Math.max(START_MINUTES, positionToMinutes(leftX, containerWidth)));
      const endMinutes = snapToIncrement(Math.max(startMinutes + timeIncrement, Math.min(END_MINUTES, positionToMinutes(rightX, containerWidth))));
      
      setNewBlock({
        locationId: dragStart.locationId,
        startTime: formatTimeFromMinutesLocal(startMinutes),
        endTime: formatTimeFromMinutesLocal(endMinutes),
        type: 'unavailable',
        date: currentDate.toISOString().split('T')[0],
      });
    } else {
      // Updating new block size
      const startX = dragStart.x;
      const endX = currentX;
      const leftX = Math.min(startX, endX);
      const rightX = Math.max(startX, endX);
      
      const startMinutes = snapToIncrement(Math.max(START_MINUTES, positionToMinutes(leftX, containerWidth)));
      const endMinutes = snapToIncrement(Math.max(startMinutes + timeIncrement, Math.min(END_MINUTES, positionToMinutes(rightX, containerWidth))));
      
      setNewBlock({
        ...newBlock,
        startTime: formatTimeFromMinutesLocal(startMinutes),
        endTime: formatTimeFromMinutesLocal(endMinutes),
      });
    }
  }, [isDragging, dragStart, draggedItem, draggedItems, resizingItem, newBlock, timeIncrement, currentDate, resizeMode]);

  const handleGlobalMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    if (newBlock && newBlock.startTime !== newBlock.endTime) {
      createMutation.mutate(newBlock);
    } else if (draggedItem) {
      const updateData = {
        locationId: draggedItem.locationId,
        startTime: draggedItem.startTime,
        endTime: draggedItem.endTime,
        type: draggedItem.type,
        notes: draggedItem.notes,
        date: currentDate.toISOString().split('T')[0],
      };
      
      // Immediately update the query cache for instant visual feedback
      queryClient.setQueryData([`/api/projects/${projectId}/location-availability`], (old: any) => {
        return old?.map((item: any) => 
          item.id === draggedItem.id ? { ...item, ...updateData } : item
        ) || [];
      });
      
      // Run database update silently in background
      silentUpdate(draggedItem.id, updateData);
    } else if (draggedItems.length > 0) {
      // Handle multi-select drag operations
      const updates: any[] = [];
      
      // Update query cache for all dragged items immediately
      queryClient.setQueryData([`/api/projects/${projectId}/location-availability`], (old: any) => {
        return old?.map((item: any) => {
          const draggedItem = draggedItems.find(d => d.id === item.id);
          if (draggedItem) {
            const updateData = {
              locationId: draggedItem.locationId,
              startTime: draggedItem.startTime,
              endTime: draggedItem.endTime,
              type: draggedItem.type,
              notes: draggedItem.notes,
              date: currentDate.toISOString().split('T')[0],
            };
            updates.push({ id: draggedItem.id, data: updateData });
            return { ...item, ...updateData };
          }
          return item;
        }) || [];
      });
      
      // Run database updates silently in background
      updates.forEach(({ id, data }) => {
        silentUpdate(id, data);
      });
    } else if (resizingItem) {
      const updateData = {
        locationId: resizingItem.locationId,
        startTime: resizingItem.startTime,
        endTime: resizingItem.endTime,
        type: resizingItem.type,
        notes: resizingItem.notes,
        date: currentDate.toISOString().split('T')[0],
      };
      
      // Immediately update the query cache for instant visual feedback
      queryClient.setQueryData([`/api/projects/${projectId}/location-availability`], (old: any) => {
        return old?.map((item: any) => 
          item.id === resizingItem.id ? { ...item, ...updateData } : item
        ) || [];
      });
      
      // Run database update silently in background
      silentUpdate(resizingItem.id, updateData);
    }
    
    setIsDragging(false);
    setDragStart(null);
    setNewBlock(null);
    setDraggedItem(null);
    setDraggedItems([]);
    setResizingItem(null);
    setResizeMode(null);
  }, [isDragging, newBlock, draggedItem, draggedItems, resizingItem, currentDate, projectId, queryClient, createMutation, silentUpdate]);

  // Add mouse event listeners
  useEffect(() => {
    if (isDragging) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsDragging(false);
          setDragStart(null);
          setNewBlock(null);
          setDraggedItem(null);
          setDraggedItems([]);
          setResizingItem(null);
          setResizeMode(null);
        }
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isDragging, handleGlobalMouseMove, handleGlobalMouseUp]);

  const handleBlockMouseDown = (e: React.MouseEvent, item: LocationAvailability, mode?: 'move' | 'resize-top' | 'resize-bottom') => {
    e.stopPropagation();
    
    // Handle Shift+click for multi-selection
    if (e.shiftKey && !mode) {
      e.preventDefault();

      if (selectedItems.has(item.id)) {
        const newSelected = new Set(selectedItems);
        newSelected.delete(item.id);

        setSelectedItems(newSelected);
      } else {
        const newSelected = new Set(selectedItems);
        newSelected.add(item.id);

        setSelectedItems(newSelected);
      }
      return;
    }
    
    // Clear selection when starting normal drag operations (but not during Shift+click)
    if (selectedItems.size > 0 && !e.shiftKey) {
      setSelectedItems(new Set());
    }
    
    // For resize handles, start dragging immediately
    if (mode === 'resize-top' || mode === 'resize-bottom') {
      const timelineContainer = e.currentTarget.closest('.relative') as HTMLElement;
      const rect = timelineContainer?.getBoundingClientRect();
      if (!rect) return;
      
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setIsDragging(true);
      setDragStart({ x, y });
      setResizingItem({
        ...item,
        originalStartTime: item.startTime,
        originalEndTime: item.endTime,
      });
      setResizeMode(mode === 'resize-top' ? 'top' : 'bottom');
      e.preventDefault();
      return;
    }
    
    // For move operations, add delay to allow double-click
    const startTime = Date.now();
    const startX = e.clientX;
    const startY = e.clientY;
    
    // Capture the timeline container reference before setting up event listeners
    const timelineContainer = e.currentTarget.closest('.relative') as HTMLElement;
    const rect = timelineContainer?.getBoundingClientRect();
    if (!rect) return;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const timeDiff = Date.now() - startTime;
      const distance = Math.sqrt(
        Math.pow(moveEvent.clientX - startX, 2) + Math.pow(moveEvent.clientY - startY, 2)
      );
      
      // Only start dragging if moved more than 3px or held for more than 150ms
      if (distance > 3 || timeDiff > 150) {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUpTemp);
        
        const x = moveEvent.clientX - rect.left;
        const y = moveEvent.clientY - rect.top;
        
        setIsDragging(true);
        setDragStart({ x, y });
        
        // If item is part of selection, drag all selected items
        if (selectedItems.has(item.id)) {
          const itemsToDrag = (allAvailability as LocationAvailability[]).filter((a: LocationAvailability) => 
            selectedItems.has(a.id)
          ).map(a => ({
            ...a,
            originalStartTime: a.startTime,
            originalEndTime: a.endTime,
          }));
          setDraggedItems(itemsToDrag);
          setDraggedItem(null);
        } else {
          // Single item drag
          setDraggedItem({
            ...item,
            originalStartTime: item.startTime,
            originalEndTime: item.endTime,
          });
          setDraggedItems([]);
        }
      }
    };
    
    const handleMouseUpTemp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUpTemp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUpTemp);
    
    e.preventDefault();
  };

  // Show loading state while data is being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading location availability data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="px-6 py-4">
          <div className="space-y-2">
            <Button onClick={onBack} variant="ghost" size="sm" className="flex items-center gap-2 -ml-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Calendar
            </Button>
            <h1 className="text-3xl font-bold">Location Availability</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        <div className="h-[calc(100vh-6rem)] flex flex-col">

          {/* Navigation and Controls */}
          <div className="flex items-center justify-between gap-4 border-b pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Button onClick={goToPreviousDay} variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button onClick={goToToday} variant="outline" size="sm">
                Today
              </Button>
              <Button onClick={goToNextDay} variant="outline" size="sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="ml-4 flex items-center gap-2">
                <div className="text-sm font-medium">
                  {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={currentDate}
                      onSelect={(date) => {
                        if (date) {
                          setCurrentDate(date);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ScheduleFilter
                projectId={projectId}
                selectedContactIds={[]} // Empty array - we don't need people filtering
                onFilterChange={() => {}} // No-op function for contacts
                selectedEventTypes={selectedEventTypes}
                onEventTypeFilterChange={setSelectedEventTypes}
                selectedIndividualTypes={selectedIndividualTypes}
                onIndividualTypeFilterChange={setSelectedIndividualTypes}
                defaultTab="events" // Start with Events tab for location filtering
                hidePeopleTab={true} // Hide the people tab for location view
              />
              
              {/* Multi-select indicator - positioned before filter */}
              {selectedItems.size > 0 && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                  {selectedItems.size} selected - Press Delete to remove
                </span>
              )}

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {getTimezoneAbbreviation(timezone || "America/New_York")}
                </span>
                <Select value={timeIncrement.toString()} onValueChange={(value) => setTimeIncrement(parseInt(value))}>
                  <SelectTrigger className="w-20 border-0 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15m</SelectItem>
                    <SelectItem value="30">30m</SelectItem>
                    <SelectItem value="60">60m</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Calendar Content */}
          <div 
            className="flex-1 flex overflow-hidden focus:outline-none availability-calendar" 
            tabIndex={0}
          >
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Loading availability...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Location Names Column */}
                <div className="w-48 border-r bg-gray-50">
                  <div className="h-10 border-b bg-gray-100 flex items-center px-3">
                    <span className="font-medium text-sm">Location</span>
                  </div>
                  {filteredLocations.map((location: EventLocation) => (
                    <div key={location.id} className="h-16 border-b flex items-center px-3">
                      <div className="text-sm font-medium truncate">
                        {location.name}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time Header and Grid */}
                <div className="flex-1 overflow-auto">
                  <div 
                    className="relative select-none"
                  >
                    {/* Time Header */}
                    <div className="sticky top-0 bg-white border-b z-10">
                      <div className="relative w-full h-10">
                        {/* Show only hour lines that align with the schedule grid */}
                        {Array.from({ length: 17 }, (_, i) => {
                          const minutes = START_MINUTES + (i * 60); // Every hour from 8 AM
                          const position = ((minutes - START_MINUTES) / TOTAL_MINUTES) * 100;
                          
                          return (
                            <div
                              key={minutes}
                              className="absolute border-r border-gray-200 h-full"
                              style={{
                                left: `${position}%`,
                              }}
                            >
                              <div className="absolute left-1 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                                {formatTime(minutes)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Location Rows */}
                    <div>
                      {filteredLocations.map((location: EventLocation, locationIndex: number) => {
                        const locationAvailability = getLocationAvailabilityForDate(location.id);
                        
                        return (
                          <div 
                            key={location.id} 
                            className="location-row h-16 border-b relative bg-white cursor-crosshair w-full" 
                            onMouseDown={(e) => handleMouseDown(e, location.id)}
                            onContextMenu={(e) => e.preventDefault()}
                          >
                            {/* Time Grid Background with both hour lines and increment lines */}
                            <div className="relative w-full h-full absolute">
                              {/* Hour lines matching header */}
                              {Array.from({ length: 17 }, (_, i) => {
                                const minutes = START_MINUTES + (i * 60); // Every hour from 8 AM, matching header
                                const position = ((minutes - START_MINUTES) / TOTAL_MINUTES) * 100;
                                
                                return (
                                  <div
                                    key={`hour-${minutes}`}
                                    className="absolute border-r border-gray-200 h-full"
                                    style={{
                                      left: `${position}%`,
                                    }}
                                  />
                                );
                              })}
                              {/* Increment lines for precision */}
                              {timeLabels.map((timeLabel) => {
                                const startPercent = ((timeLabel.minutes - START_MINUTES) / TOTAL_MINUTES) * 100;
                                // Don't show increment lines on exact hours to avoid double lines
                                const isHourLine = timeLabel.minutes % 60 === 0;
                                
                                return !isHourLine ? (
                                  <div
                                    key={`increment-${timeLabel.minutes}`}
                                    className="absolute border-r border-gray-100 h-full"
                                    style={{
                                      left: `${startPercent}%`,
                                    }}
                                  />
                                ) : null;
                              })}
                            </div>

                            {/* Schedule Events for this location */}
                            {getScheduleEventsForLocationAndDate(location.id).map((event: any) => {
                              const startMinutes = timeToMinutes(event.startTime);
                              const endMinutes = timeToMinutes(event.endTime);
                              const eventTypeColor = getEventTypeColorFromDatabase(event.type, eventTypes);
                              
                              // Calculate percentage-based positioning for full width
                              const startPercent = ((startMinutes - START_MINUTES) / TOTAL_MINUTES) * 100;
                              const widthPercent = ((endMinutes - startMinutes) / TOTAL_MINUTES) * 100;
                              
                              return (
                                <div
                                  key={`event-${event.id}`}
                                  className="absolute text-xs text-white top-1 bottom-1 rounded transition-all duration-150 z-5"
                                  style={{
                                    left: `${startPercent}%`,
                                    width: `${widthPercent}%`,
                                    minWidth: '20px',
                                    backgroundColor: eventTypeColor,
                                    borderColor: eventTypeColor,
                                    borderWidth: '1px',
                                    filter: 'brightness(0.9)', // Slightly darker border
                                  }}
                                  title={`${event.title} (${event.startTime} - ${event.endTime})`}
                                >
                                  <div className="px-2 py-1 h-full flex flex-col justify-center">
                                    <div className="font-medium truncate text-[10px]">
                                      {event.title}
                                    </div>
                                    <div className="text-[9px] opacity-90 truncate">
                                      {event.startTime} - {event.endTime}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Availability Blocks */}
                            {locationAvailability.map((item: LocationAvailability) => {
                              const startMinutes = timeToMinutes(item.startTime);
                              const endMinutes = timeToMinutes(item.endTime);

                              // Check if this item is being dragged or resized
                              const isBeingDragged = draggedItem?.id === item.id;
                              const isBeingDraggedMulti = draggedItems.some(d => d.id === item.id);
                              const isBeingResized = resizingItem?.id === item.id;
                              const currentItem = isBeingDragged ? draggedItem : 
                                                isBeingDraggedMulti ? draggedItems.find(d => d.id === item.id) :
                                                isBeingResized ? resizingItem : item;

                              const currentStartMinutes = timeToMinutes(currentItem.startTime);
                              const currentEndMinutes = timeToMinutes(currentItem.endTime);
                              
                              // Calculate percentage-based positioning for full width
                              const startPercent = ((currentStartMinutes - START_MINUTES) / TOTAL_MINUTES) * 100;
                              const widthPercent = ((currentEndMinutes - currentStartMinutes) / TOTAL_MINUTES) * 100;
                              
                              const isSelected = selectedItems.has(item.id);
                              const isMultiDragging = draggedItems.some(d => d.id === item.id);
                              
                              return (
                                <div
                                  key={item.id}
                                  className={`absolute text-xs text-white top-2 bottom-2 rounded transition-all duration-150 z-10 
                                    ${item.availabilityType === 'unavailable' ? 'bg-red-500' : 'bg-blue-500'}
                                    ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}
                                    ${isMultiDragging ? 'opacity-80 z-30' : ''}
                                    ${isShiftPressed ? 'cursor-pointer' : ''}`}
                                  style={{
                                    left: `${startPercent}%`,
                                    width: `${widthPercent}%`,
                                    minWidth: '20px',
                                  }}
                                  onMouseDown={(e) => handleBlockMouseDown(e, item)}
                                  onDoubleClick={() => setEditingItem(item)}
                                >
                                  {/* Left resize handle */}
                                  <div
                                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white hover:bg-opacity-30 transition-colors"
                                    onMouseDown={(e) => handleBlockMouseDown(e, item, 'resize-top')}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  
                                  {/* Right resize handle */}
                                  <div
                                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white hover:bg-opacity-30 transition-colors"
                                    onMouseDown={(e) => handleBlockMouseDown(e, item, 'resize-bottom')}
                                    onClick={(e) => e.stopPropagation()}
                                  />

                                  <div className={`px-2 py-1 h-full flex flex-col justify-center ${isShiftPressed ? 'cursor-pointer' : 'cursor-move'}`}>
                                    <div className="font-medium truncate">
                                      {item.availabilityType === 'unavailable' ? 'Unavailable' : 'Preferred'}
                                    </div>
                                    <div className="text-xs opacity-90 truncate">
                                      {formatTime(currentStartMinutes)} - {formatTime(currentEndMinutes)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Preview block while creating */}
                            {newBlock && newBlock.locationId === location.id && (
                              <div
                                className="absolute text-xs text-white top-2 bottom-2 rounded bg-gray-500 opacity-60 z-20"
                                style={{
                                  left: `${((timeToMinutes(newBlock.startTime) - START_MINUTES) / TOTAL_MINUTES) * 100}%`,
                                  width: `${((timeToMinutes(newBlock.endTime) - timeToMinutes(newBlock.startTime)) / TOTAL_MINUTES) * 100}%`,
                                  minWidth: '20px',
                                }}
                              >
                                <div className="px-2 py-1 h-full flex flex-col justify-center">
                                  <div className="font-medium truncate">New</div>
                                  <div className="text-xs opacity-90 truncate">
                                    {formatTime(timeToMinutes(newBlock.startTime))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Edit Dialog */}
          {editingItem && (
            <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Availability</DialogTitle>
                  <DialogDescription>
                    {new Date(editingItem.date + 'T00:00:00').toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <Select
                      value={editingItem.availabilityType}
                      onValueChange={(value) => setEditingItem({ ...editingItem, availabilityType: value })}
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
                      value={editingItem.notes || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                      placeholder="Add notes..."
                    />
                  </div>
                  
                  <div className="flex justify-between">
                    <Button
                      onClick={handleDelete}
                      variant="destructive"
                      size="sm"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                    
                    <div className="space-x-2">
                      <Button onClick={() => setEditingItem(null)} variant="outline">
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveEdit}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Bulk Delete Confirmation Dialog */}
          {showBulkDeleteDialog && (
            <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Selected Availability Blocks</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete {selectedItems.size} selected availability block{selectedItems.size !== 1 ? 's' : ''}? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                
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
                    disabled={bulkDeleteMutation.isPending}
                  >
                    {bulkDeleteMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  );
}