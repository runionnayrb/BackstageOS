import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ChevronLeft, ChevronRight, CalendarIcon, Filter, MapPin, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";

// Time constants
const START_MINUTES = 480; // 8:00 AM
const END_MINUTES = 1440; // 12:00 AM (midnight)
const TOTAL_MINUTES = END_MINUTES - START_MINUTES; // 16 hours

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

  // Fetch project settings for timezone and time format
  const { data: projectSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
    enabled: !!projectId,
  });

  const scheduleSettings = projectSettings?.scheduleSettings ? 
    (typeof projectSettings.scheduleSettings === 'string' ? 
      JSON.parse(projectSettings.scheduleSettings) : 
      projectSettings.scheduleSettings) : {};

  const timezone = scheduleSettings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timeFormat = scheduleSettings?.timeFormat || '12';

  // Fetch locations
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/locations`],
    enabled: !!projectId,
  });

  // Fetch location availability
  const { data: allAvailability, isLoading } = useQuery({
    queryKey: [`/api/projects/${projectId}/location-availability`],
    enabled: !!projectId,
  });

  // Create filtered locations based on search and type filters
  const filteredLocations = (locations as EventLocation[] || []).filter((location: EventLocation) => {
    if (selectedLocationTypes.size === 0) return true;
    
    // Use description as primary filter criteria, fallback to name if description is empty
    const filterCriteria = location.description || location.name || '';
    return selectedLocationTypes.has(filterCriteria);
  });

  // Get unique location types for filtering
  const locationTypes = [...new Set((locations as EventLocation[] || []).map((location: EventLocation) => 
    location.description || location.name || ''
  ).filter(Boolean))];

  // Format time based on user preference
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (timeFormat === '24') {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    } else {
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
    }
  };

  // Convert time string to minutes
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Generate time labels
  const timeLabels: any[] = [];
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
    
    updateTimeoutRef.current = setTimeout(() => {
      fetch(`/api/projects/${projectId}/locations/${data.locationId}/availability/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).catch(error => {
        console.error("Background update failed:", error);
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/location-availability`] });
      });
    }, 500);
  }, [projectId, queryClient]);

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    if (newBlock && newBlock.startTime !== newBlock.endTime) {
      createMutation.mutate(newBlock);
    } else if (draggedItem) {
      const updateData = {
        locationId: draggedItem.locationId,
        startTime: draggedItem.startTime,
        endTime: draggedItem.endTime,
        availabilityType: draggedItem.availabilityType,
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
              availabilityType: draggedItem.availabilityType,
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
    }
    
    // Reset all drag states
    setIsDragging(false);
    setDragStart(null);
    setNewBlock(null);
    setDraggedItem(null);
    setDraggedItems([]);
    setResizingItem(null);
    setResizeMode(null);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStart) return;

    const target = e.target as Element;
    const container = target.closest('.relative');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
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
      
      setDraggedItem({
        ...draggedItem,
        startTime: formatTimeFromMinutesLocal(newStartMinutes),
        endTime: formatTimeFromMinutesLocal(newEndMinutes),
      });
    } else if (draggedItems.length > 0) {
      // Moving multiple selected items
      const deltaX = currentX - dragStart.x;
      const deltaMinutes = (deltaX / containerWidth) * TOTAL_MINUTES;
      
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
  }, [isDragging, dragStart, draggedItem, draggedItems, resizingItem, resizeMode, newBlock, snapToIncrement, timeIncrement, formatTimeFromMinutesLocal, timeToMinutes, positionToMinutes, currentDate]);

  // Drag event handlers for creating new blocks
  const handleMouseDown = (e: React.MouseEvent, locationId: number) => {
    if (e.button !== 0) return; // Only left click
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDragging(true);
    setDragStart({ x, y, locationId });
    e.preventDefault();
  };

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
      const allSelectedItems = (allAvailability as LocationAvailability[]).filter((avail: LocationAvailability) => 
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
              {/* Time increment controls */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Increment:</span>
                <Select value={timeIncrement.toString()} onValueChange={(value) => setTimeIncrement(Number(value))}>
                  <SelectTrigger className="w-20 h-8">
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

          {/* Availability Grid */}
          <div className="flex-1 overflow-auto">
            <div className="relative">
              {/* Timeline */}
              <div className="grid grid-cols-[200px_1fr] gap-0 border">
                {/* Header row */}
                <div className="h-12 border-r border-b bg-gray-50 flex items-center justify-center font-medium">
                  Locations
                </div>
                <div 
                  className="border-b bg-gray-50 relative"
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                >
                  <div className="grid h-12" style={{ gridTemplateColumns: `repeat(${timeLabels.length}, 1fr)` }}>
                    {timeLabels.map((time, index) => (
                      <div 
                        key={index} 
                        className="border-r border-gray-200 text-xs flex items-center justify-center p-1 text-center"
                      >
                        {time.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Location rows */}
                {filteredLocations.map((location: EventLocation, locationIndex: number) => {
                  const locationAvailability = getLocationAvailabilityForDate(location.id);
                  
                  return (
                    <div key={location.id} className="contents">
                      {/* Location name */}
                      <div className="h-16 border-r border-b bg-white flex items-center px-3">
                        <div className="text-sm font-medium text-left">
                          {location.name}
                        </div>
                      </div>
                      
                      {/* Timeline for this location */}
                      <div 
                        className="border-b bg-white relative h-16"
                        onMouseDown={(e) => handleMouseDown(e, location.id)}
                      >
                        {/* Time grid */}
                        <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${timeLabels.length}, 1fr)` }}>
                          {timeLabels.map((time, index) => (
                            <div 
                              key={index} 
                              className="border-r border-gray-100 hover:bg-gray-50"
                            />
                          ))}
                        </div>

                        {/* Availability blocks */}
                        {locationAvailability.map((item: LocationAvailability) => {
                          const startMinutes = timeToMinutes(item.startTime);
                          const endMinutes = timeToMinutes(item.endTime);
                          const leftPercent = ((startMinutes - START_MINUTES) / TOTAL_MINUTES) * 100;
                          const widthPercent = ((endMinutes - startMinutes) / TOTAL_MINUTES) * 100;

                          return (
                            <div
                              key={item.id}
                              className={`absolute top-1 bottom-1 rounded cursor-pointer border-2 ${
                                item.availabilityType === 'unavailable' 
                                  ? 'bg-red-200 border-red-400' 
                                  : 'bg-blue-200 border-blue-400'
                              } ${selectedItems.has(item.id) ? 'ring-2 ring-yellow-400' : ''}`}
                              style={{
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                              }}
                              onMouseDown={(e) => handleBlockMouseDown(e, item)}
                            >
                              <div className="px-2 py-1 text-xs text-center">
                                {item.availabilityType === 'unavailable' ? 'Unavailable' : 'Preferred'}
                              </div>
                            </div>
                          );
                        })}

                        {/* New block preview */}
                        {newBlock && newBlock.locationId === location.id && (
                          <div
                            className="absolute top-1 bottom-1 rounded bg-red-200 border-2 border-red-400 opacity-70"
                            style={{
                              left: `${((timeToMinutes(newBlock.startTime) - START_MINUTES) / TOTAL_MINUTES) * 100}%`,
                              width: `${((timeToMinutes(newBlock.endTime) - timeToMinutes(newBlock.startTime)) / TOTAL_MINUTES) * 100}%`,
                            }}
                          >
                            <div className="px-2 py-1 text-xs text-center">
                              Unavailable
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Location Availability</DialogTitle>
              <DialogDescription>
                Update the availability details for this location.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Availability Type</label>
                <Select 
                  value={editingItem.availabilityType} 
                  onValueChange={(value) => setEditingItem({...editingItem, availabilityType: value})}
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
                  onChange={(e) => setEditingItem({...editingItem, notes: e.target.value})}
                  placeholder="Add any notes about this availability..."
                  className="mt-1"
                />
              </div>
              <div className="flex justify-between pt-4">
                <Button
                  variant="destructive"
                  onClick={() => {
                    fetch(`/api/projects/${projectId}/location-availability/${editingItem.id}`, {
                      method: 'DELETE'
                    }).then(() => {
                      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/location-availability`] });
                      setEditingItem(null);
                      toast({ title: "Availability deleted successfully" });
                    }).catch(() => {
                      toast({ title: "Failed to delete availability", variant: "destructive" });
                    });
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
                      const updateData = {
                        locationId: editingItem.locationId,
                        startTime: editingItem.startTime,
                        endTime: editingItem.endTime,
                        availabilityType: editingItem.availabilityType,
                        notes: editingItem.notes,
                        date: currentDate.toISOString().split('T')[0],
                      };
                      
                      fetch(`/api/projects/${projectId}/locations/${editingItem.locationId}/availability/${editingItem.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updateData)
                      }).then(() => {
                        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/location-availability`] });
                        setEditingItem(null);
                        toast({ title: "Availability updated successfully" });
                      }).catch(() => {
                        toast({ title: "Failed to update availability", variant: "destructive" });
                      });
                    }}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}