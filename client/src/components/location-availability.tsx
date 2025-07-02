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
import { formatTimeFromMinutes } from "@/lib/timeUtils";

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
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [selectedLocationTypes, setSelectedLocationTypes] = useState<Set<string>>(new Set());
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedItemsRef = useRef<Set<number>>(new Set());

  // Keep ref in sync with state
  useEffect(() => {
    selectedItemsRef.current = selectedItems;
  }, [selectedItems]);

  // Keyboard event handlers for shift selection and delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        setSelectedItems(current => {
          if (current.size > 0) {
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

  const scheduleSettings = showSettings?.scheduleSettings ? 
    (typeof showSettings.scheduleSettings === 'string' ? 
      JSON.parse(showSettings.scheduleSettings) : 
      showSettings.scheduleSettings) : {};

  const timezone = scheduleSettings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timeFormat = scheduleSettings?.timeFormat || '12';

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

  const isLoading = locationsLoading || availabilityLoading || eventsLoading;

  // Filter locations if needed
  const filteredLocations = locations.filter((location: EventLocation) => {
    if (!hasActiveFilters || selectedLocationTypes.size === 0) return true;
    // Add location type filtering logic here if needed
    return true;
  });

  // Get unique location types for filtering
  const locationTypes = [...new Set(locations.map((location: EventLocation) => location.description).filter(Boolean))];

  const toggleLocationType = (type: string) => {
    const newTypes = new Set(selectedLocationTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setSelectedLocationTypes(newTypes);
  };

  const applyFilters = () => {
    setHasActiveFilters(selectedLocationTypes.size > 0);
    setShowFilterPopover(false);
  };

  const clearFilters = () => {
    setSelectedLocationTypes(new Set());
    setHasActiveFilters(false);
    setShowFilterPopover(false);
  };

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
  const handleMouseDown = (e: React.MouseEvent, locationId: number) => {
    if (e.shiftKey) return;
    if (e.button !== 0) return; // Only left click
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left; // Position relative to the location row
    const y = e.clientY - rect.top;
    
    setDragStart({ x, y, locationId });
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStart) return;

    // Find the location row that's being dragged over
    const locationRow = document.elementFromPoint(e.clientX, e.clientY)?.closest('.location-row');
    if (!locationRow) return;

    const rect = locationRow.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const containerWidth = rect.width;

    if (draggedItem || draggedItems.length > 0) {
      // Moving existing item(s)
      const deltaX = currentX - dragStart.x;
      const deltaMinutes = (deltaX / containerWidth) * TOTAL_MINUTES;
      const snappedDelta = snapToIncrement(deltaMinutes);

      if (draggedItems.length > 0) {
        // Multi-item drag
        const updatedItems = draggedItems.map(item => {
          const originalStartMinutes = timeToMinutes(item.originalStartTime);
          const originalEndMinutes = timeToMinutes(item.originalEndTime);
          const newStartMinutes = Math.max(START_MINUTES, Math.min(END_MINUTES - (originalEndMinutes - originalStartMinutes), originalStartMinutes + snappedDelta));
          const newEndMinutes = newStartMinutes + (originalEndMinutes - originalStartMinutes);
          
          return {
            ...item,
            startTime: formatTimeFromMinutesLocal(newStartMinutes),
            endTime: formatTimeFromMinutesLocal(newEndMinutes),
          };
        });
        setDraggedItems(updatedItems);
      } else if (draggedItem) {
        // Single item drag
        const originalStartMinutes = timeToMinutes(draggedItem.originalStartTime);
        const originalEndMinutes = timeToMinutes(draggedItem.originalEndTime);
        const newStartMinutes = Math.max(START_MINUTES, Math.min(END_MINUTES - (originalEndMinutes - originalStartMinutes), originalStartMinutes + snappedDelta));
        const newEndMinutes = newStartMinutes + (originalEndMinutes - originalStartMinutes);
        
        setDraggedItem({
          ...draggedItem,
          startTime: formatTimeFromMinutesLocal(newStartMinutes),
          endTime: formatTimeFromMinutesLocal(newEndMinutes),
        });
      }
    } else if (newBlock) {
      // Creating new block
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
        availabilityType: 'unavailable',
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
  }, [isDragging, dragStart, draggedItem, draggedItems, newBlock, timeIncrement, currentDate]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    if (draggedItems.length > 0) {
      // Update all dragged items optimistically
      queryClient.setQueryData([`/api/projects/${projectId}/location-availability`], (old: any) => {
        return old?.map((item: any) => {
          const updatedItem = draggedItems.find(d => d.id === item.id);
          return updatedItem || item;
        }) || [];
      });
      
      // Silent background updates
      draggedItems.forEach(item => {
        silentUpdate(item.id, {
          locationId: item.locationId,
          startTime: item.startTime,
          endTime: item.endTime,
          type: item.availabilityType,
          notes: item.notes,
          date: item.date,
        });
      });
      
      setDraggedItems([]);
    } else if (draggedItem) {
      // Update single item optimistically
      queryClient.setQueryData([`/api/projects/${projectId}/location-availability`], (old: any) => {
        return old?.map((item: any) => 
          item.id === draggedItem.id ? draggedItem : item
        ) || [];
      });
      
      // Silent background update
      silentUpdate(draggedItem.id, {
        locationId: draggedItem.locationId,
        startTime: draggedItem.startTime,
        endTime: draggedItem.endTime,
        type: draggedItem.availabilityType,
        notes: draggedItem.notes,
        date: draggedItem.date,
      });
      
      setDraggedItem(null);
    } else if (newBlock) {
      // Create the item directly without optimistic update to avoid ID conflicts
      createMutation.mutate(newBlock);
    }
    
    setDragStart(null);
  }, [isDragging, draggedItem, draggedItems, newBlock, projectId, queryClient, silentUpdate, createMutation, currentDate]);

  // Add mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleBlockMouseDown = (e: React.MouseEvent, item: LocationAvailability, mode?: 'move' | 'resize-top' | 'resize-bottom') => {
    e.stopPropagation();
    
    // Clear selection when starting normal drag operations (but not during Shift+click)
    if (selectedItems.size > 0 && !e.shiftKey) {
      setSelectedItems(new Set());
    }

    // Double-click to edit
    if (e.detail === 2) {
      setEditingItem(item);
      return;
    }

    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;
    
    const startX = e.clientX - rect.left;
    
    setDragStart({ x: startX, y: e.clientY });
    setIsDragging(true);

    // Check if this item is selected (for multi-drag)
    if (selectedItems.has(item.id) && selectedItems.size > 1) {
      // Multi-item drag - prepare all selected items
      const allSelectedItems = allAvailability.filter((avail: LocationAvailability) => 
        selectedItems.has(avail.id)
      ).map(avail => ({
        ...avail,
        originalStartTime: avail.startTime,
        originalEndTime: avail.endTime,
      }));
      setDraggedItems(allSelectedItems);
    } else {
      // Single item drag
      setDraggedItem({
        ...item,
        originalStartTime: item.startTime,
        originalEndTime: item.endTime,
      });
      setDraggedItems([]);
    }
    
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
        <div className="px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button onClick={onBack} variant="ghost" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Calendar
              </Button>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                <h1 className="text-xl font-semibold">Location Availability</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        <div className="h-[calc(100vh-6rem)] flex flex-col">
          <div className="mb-4">
            <p className="text-gray-600">
              Compare location availability for the selected day. Times are shown across the top, locations on the left.
            </p>
          </div>

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
              {/* Multi-select indicator - positioned before filter */}
              {selectedItems.size > 0 && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                  {selectedItems.size} selected - Press Delete to remove
                </span>
              )}
              
              {/* Filter Button - moved to left of timezone */}
              <Popover open={showFilterPopover} onOpenChange={setShowFilterPopover}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`h-8 w-8 p-0 ${hasActiveFilters ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-4">
                    <div className="font-medium text-sm">Filter by Location Type</div>
                    
                    {locationTypes.length > 0 ? (
                      <div className="space-y-2">
                        {locationTypes.map((type) => (
                          <div key={type} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`type-${type}`}
                              checked={selectedLocationTypes.has(type)}
                              onChange={() => toggleLocationType(type)}
                              className="rounded border-gray-300"
                            />
                            <label htmlFor={`type-${type}`} className="text-sm capitalize">
                              {type}
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">No location types available</div>
                    )}
                    
                    <div className="flex gap-2 pt-2 border-t">
                      <Button 
                        size="sm" 
                        onClick={applyFilters}
                        className="flex-1"
                      >
                        Apply
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={clearFilters}
                        className="flex-1"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {timezone}
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
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
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
                                  onClick={(e) => {
                                    if (e.shiftKey) {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      
                                      const newSelected = new Set(selectedItemsRef.current);
                                      if (newSelected.has(item.id)) {
                                        newSelected.delete(item.id);
                                      } else {
                                        newSelected.add(item.id);
                                      }
                                      setSelectedItems(newSelected);
                                    }
                                  }}
                                  onDoubleClick={() => setEditingItem(item)}
                                >
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