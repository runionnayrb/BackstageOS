import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, Users, Trash2, ArrowLeft, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ProjectAvailability {
  id: number;
  contactId: number;
  projectId: number;
  date: string;
  startTime: string;
  endTime: string;
  availabilityType: 'unavailable' | 'preferred';
  notes?: string;
  contactFirstName: string;
  contactLastName: string;
}

interface AvailabilityComparisonProps {
  projectId: number;
  onBack: () => void;
}

const START_MINUTES = 8 * 60; // 8:00 AM in minutes
const END_MINUTES = 24 * 60; // Midnight in minutes
const TOTAL_MINUTES = END_MINUTES - START_MINUTES; // 16 hours

export default function AvailabilityComparison({
  projectId,
  onBack,
}: AvailabilityComparisonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeIncrement, setTimeIncrement] = useState(30); // minutes
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; contactId?: number } | null>(null);
  const [newBlock, setNewBlock] = useState<any>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [resizingItem, setResizingItem] = useState<any>(null);
  const [resizeMode, setResizeMode] = useState<'top' | 'bottom' | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
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
  }, []); // Remove dependency to avoid stale closure

  // Get show settings for timezone
  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Get timezone from settings
  const scheduleSettings = (showSettings as any)?.scheduleSettings || {};
  const timezone = scheduleSettings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Fetch all project availability
  const { data: allAvailability = [], isLoading } = useQuery<ProjectAvailability[]>({
    queryKey: [`/api/projects/${projectId}/availability`],
  });

  // Get unique contacts
  const contacts = Array.from(
    new Map(
      (allAvailability as ProjectAvailability[]).map((item: ProjectAvailability) => [
        item.contactId,
        {
          id: item.contactId,
          firstName: item.contactFirstName,
          lastName: item.contactLastName,
        }
      ])
    ).values()
  ).sort((a: any, b: any) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));

  // Time formatting
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
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

  // Generate time labels for the current day
  const generateTimeLabels = () => {
    const labels = [];
    for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += timeIncrement) {
      labels.push({
        minutes,
        label: formatTime(minutes),
        position: minutes - START_MINUTES,
      });
    }
    return labels;
  };

  const timeLabels = generateTimeLabels();

  // Get availability for a specific contact and the current date
  const getContactAvailabilityForDate = (contactId: number) => {
    const dateStr = currentDate.toISOString().split('T')[0];
    return (allAvailability as ProjectAvailability[]).filter(
      (item: ProjectAvailability) => item.contactId === contactId && item.date === dateStr
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
    // Each time segment gets equal width in the flex layout
    const numSegments = timeLabels.length;
    const segmentWidth = containerWidth / numSegments;
    const segmentIndex = Math.floor(position / segmentWidth);
    
    // Convert segment index to minutes
    const minutes = START_MINUTES + (segmentIndex * timeIncrement);
    return Math.max(START_MINUTES, Math.min(END_MINUTES, minutes));
  };

  const snapToIncrement = (minutes: number) => {
    return Math.round(minutes / timeIncrement) * timeIncrement;
  };

  const formatTimeFromMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getContactIdFromY = (y: number) => {
    const contactIndex = Math.floor((y - 48) / 64); // 48px header + 64px per row
    return contacts[contactIndex]?.id || null;
  };



  // Mutations for CRUD operations
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/projects/${projectId}/contacts/${data.contactId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create availability");
      return response.json();
    },
    onSuccess: (newItem) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/availability`] });
      setNewBlock(null);
      // Open edit dialog for the newly created item
      setEditingItem(newItem);
    },
    onError: (error) => {
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
      // Silent API call without affecting UI
      fetch(`/api/projects/${projectId}/contacts/${data.contactId}/availability/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).catch(error => {
        console.error("Background update failed:", error);
        // Revert optimistic update on error
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/availability`] });
      });
    }, 500); // Longer delay for background operations
  }, [projectId, queryClient]);

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    if (newBlock && newBlock.startTime !== newBlock.endTime) {
      createMutation.mutate(newBlock);
    } else if (draggedItem) {
      const updateData = {
        contactId: draggedItem.contactId,
        startTime: draggedItem.startTime,
        endTime: draggedItem.endTime,
        availabilityType: draggedItem.availabilityType,
        notes: draggedItem.notes,
        date: currentDate.toISOString().split('T')[0],
      };
      
      // Immediately update the query cache for instant visual feedback
      queryClient.setQueryData([`/api/projects/${projectId}/availability`], (old: any) => {
        return old?.map((item: any) => 
          item.id === draggedItem.id ? { ...item, ...updateData } : item
        ) || [];
      });
      
      // Run database update silently in background
      silentUpdate(draggedItem.id, updateData);
    } else if (resizingItem) {
      const updateData = {
        contactId: resizingItem.contactId,
        startTime: resizingItem.startTime,
        endTime: resizingItem.endTime,
        availabilityType: resizingItem.availabilityType,
        notes: resizingItem.notes,
        date: currentDate.toISOString().split('T')[0],
      };
      
      // Immediately update the query cache for instant visual feedback
      queryClient.setQueryData([`/api/projects/${projectId}/availability`], (old: any) => {
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
    setResizingItem(null);
    setResizeMode(null);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const item = (allAvailability as ProjectAvailability[]).find((a: ProjectAvailability) => a.id === id);
      if (!item) throw new Error("Item not found");
      
      const response = await fetch(`/api/projects/${projectId}/contacts/${item.contactId}/availability/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete availability");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/availability`] });
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

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const items = (allAvailability as ProjectAvailability[]).filter((a: ProjectAvailability) => ids.includes(a.id));
      
      await Promise.all(items.map(item => 
        fetch(`/api/projects/${projectId}/contacts/${item.contactId}/availability/${item.id}`, {
          method: 'DELETE'
        }).then(response => {
          if (!response.ok) throw new Error(`Failed to delete availability ${item.id}`);
        })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/availability`] });
      setSelectedItems(new Set());
      setShowBulkDeleteDialog(false);
      toast({ title: `${selectedItems.size} availability blocks deleted successfully` });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to delete availability blocks", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleBulkDelete = () => {
    const selectedIds = Array.from(selectedItems);
    bulkDeleteMutation.mutate(selectedIds);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    
    const updateData = {
      contactId: editingItem.contactId,
      startTime: editingItem.startTime,
      endTime: editingItem.endTime,
      availabilityType: editingItem.availabilityType,
      notes: editingItem.notes,
      date: currentDate.toISOString().split('T')[0],
    };
    
    // Immediately update the query cache for instant visual feedback
    queryClient.setQueryData([`/api/projects/${projectId}/availability`], (old: any) => {
      return old?.map((item: any) => 
        item.id === editingItem.id ? { ...item, ...updateData } : item
      ) || [];
    });
    
    // Run database update silently in background
    silentUpdate(editingItem.id, updateData);
    
    setEditingItem(null);
  };

  const handleDelete = () => {
    if (!editingItem) return;
    deleteMutation.mutate(editingItem.id);
  };

  // Drag event handlers
  const handleMouseDown = (e: React.MouseEvent, contactId: number) => {
    if (e.button !== 0) return; // Only left click
    
    // Get the timeline container (parent div that contains the time grid)
    const timelineContainer = e.currentTarget.parentElement;
    const timelineRect = timelineContainer?.getBoundingClientRect();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left; // Position relative to the contact row
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
      convertedTime: formatTimeFromMinutes(positionToMinutes(x, rect.width))
    });
    
    setIsDragging(true);
    setDragStart({ x, y, contactId });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    const containerWidth = rect.width;

    if (draggedItem) {
      // Moving existing item - use relative position from original click
      const deltaX = currentX - dragStart.x;
      const startMinutes = timeToMinutes(draggedItem.originalStartTime);
      const endMinutes = timeToMinutes(draggedItem.originalEndTime);
      const duration = endMinutes - startMinutes;
      
      // Apply delta movement to original position (not absolute positioning)
      const newStartMinutes = snapToIncrement(Math.max(START_MINUTES, Math.min(END_MINUTES - duration, startMinutes + deltaX)));
      const newEndMinutes = newStartMinutes + duration;
      
      const newContactId = getContactIdFromY(currentY);
      
      setDraggedItem({
        ...draggedItem,
        startTime: formatTimeFromMinutes(newStartMinutes),
        endTime: formatTimeFromMinutes(newEndMinutes),
        contactId: newContactId || draggedItem.contactId,
      });
    } else if (resizingItem) {
      // Resizing existing item
      const deltaX = currentX - dragStart.x;
      const startMinutes = timeToMinutes(resizingItem.originalStartTime);
      const endMinutes = timeToMinutes(resizingItem.originalEndTime);
      
      let newStartMinutes = startMinutes;
      let newEndMinutes = endMinutes;
      
      if (resizeMode === 'top') {
        newStartMinutes = snapToIncrement(Math.max(START_MINUTES, Math.min(endMinutes - timeIncrement, startMinutes + deltaX)));
      } else if (resizeMode === 'bottom') {
        newEndMinutes = snapToIncrement(Math.max(startMinutes + timeIncrement, Math.min(END_MINUTES, endMinutes + deltaX)));
      }
      
      setResizingItem({
        ...resizingItem,
        startTime: formatTimeFromMinutes(newStartMinutes),
        endTime: formatTimeFromMinutes(newEndMinutes),
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
        contactId: dragStart.contactId,
        startTime: formatTimeFromMinutes(startMinutes),
        endTime: formatTimeFromMinutes(endMinutes),
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
        startTime: formatTimeFromMinutes(startMinutes),
        endTime: formatTimeFromMinutes(endMinutes),
      });
    }
  };



  const handleBlockMouseDown = (e: React.MouseEvent, item: ProjectAvailability, mode?: 'move' | 'resize-top' | 'resize-bottom') => {
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
        setDraggedItem({
          ...item,
          originalStartTime: item.startTime,
          originalEndTime: item.endTime,
        });
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
                <Users className="h-5 w-5" />
                <h1 className="text-xl font-semibold">Team Availability</h1>
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
              Compare team availability for the selected day. Times are shown across the top, team members on the left.
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
                      <Calendar className="h-4 w-4" />
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {timezone}
                </span>
                <Select value={timeIncrement.toString()} onValueChange={(value) => setTimeIncrement(parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15m</SelectItem>
                    <SelectItem value="30">30m</SelectItem>
                    <SelectItem value="60">60m</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Multi-select indicators */}
              {(isShiftPressed || selectedItems.size > 0) && (
                <div className="flex items-center gap-2 text-sm">
                  {isShiftPressed && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      Multi-select mode
                    </span>
                  )}
                  {selectedItems.size > 0 && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                      {selectedItems.size} selected - Press Delete to remove
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Calendar Content */}
          <div 
            className="flex-1 flex overflow-hidden focus:outline-none" 
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
                {/* Contact Names Column */}
                <div className="w-48 border-r bg-gray-50">
                  <div className="h-12 border-b bg-gray-100 flex items-center px-3">
                    <span className="font-medium text-sm">Name</span>
                  </div>
                  {contacts.map((contact: any) => (
                    <div key={contact.id} className="h-16 border-b flex items-center px-3">
                      <div className="text-sm font-medium truncate">
                        {contact.firstName} {contact.lastName}
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
                      <div className="flex w-full">
                        {timeLabels.map((timeLabel) => (
                          <div
                            key={timeLabel.minutes}
                            className="border-r text-center py-2 text-xs text-gray-500 flex-1"
                          >
                            {timeIncrement >= 60 || timeLabel.minutes % 60 === 0 ? timeLabel.label : ''}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Contact Rows */}
                    <div>
                      {contacts.map((contact: any, contactIndex: number) => {
                        const contactAvailability = getContactAvailabilityForDate(contact.id);
                        
                        return (
                          <div 
                            key={contact.id} 
                            className="h-16 border-b relative bg-white cursor-crosshair w-full" 
                            onMouseDown={(e) => handleMouseDown(e, contact.id)}
                          >
                            {/* Time Grid Background */}
                            <div className="flex w-full h-full absolute">
                              {timeLabels.map((timeLabel) => (
                                <div
                                  key={timeLabel.minutes}
                                  className="border-r border-gray-100 h-full flex-1"
                                />
                              ))}
                            </div>

                            {/* Availability Blocks */}
                            {contactAvailability.map((item: ProjectAvailability) => {
                              const startMinutes = timeToMinutes(item.startTime);
                              const endMinutes = timeToMinutes(item.endTime);

                              // Check if this item is being dragged or resized
                              const isBeingDragged = draggedItem?.id === item.id;
                              const isBeingResized = resizingItem?.id === item.id;
                              const currentItem = isBeingDragged ? draggedItem : isBeingResized ? resizingItem : item;

                              const currentStartMinutes = timeToMinutes(currentItem.startTime);
                              const currentEndMinutes = timeToMinutes(currentItem.endTime);
                              
                              // Calculate percentage-based positioning for full width
                              const startPercent = ((currentStartMinutes - START_MINUTES) / TOTAL_MINUTES) * 100;
                              const widthPercent = ((currentEndMinutes - currentStartMinutes) / TOTAL_MINUTES) * 100;

                              return (
                                <div
                                  key={item.id}
                                  className={`absolute text-xs text-white top-2 bottom-2 rounded group ${
                                    currentItem.availabilityType === 'unavailable'
                                      ? 'bg-red-500 hover:bg-red-600'
                                      : 'bg-blue-500 hover:bg-blue-600'
                                  } ${(isBeingDragged || isBeingResized) ? 'opacity-80 z-20' : 'z-10'} ${
                                    selectedItems.has(item.id) ? 'ring-2 ring-yellow-400 ring-opacity-80' : ''
                                  } ${isShiftPressed ? 'cursor-pointer' : ''}`}
                                  style={{
                                    left: `${startPercent}%`,
                                    width: `${widthPercent}%`,
                                    minWidth: '20px',
                                  }}
                                  onMouseDown={(e) => handleBlockMouseDown(e, item, 'move')}
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
                                  title={`${currentItem.availabilityType === 'unavailable' ? 'Unavailable' : 'Preferred'}: ${formatTime(currentStartMinutes)} - ${formatTime(currentEndMinutes)}${currentItem.notes ? `\n${currentItem.notes}` : ''}`}
                                >
                                  {/* Left resize handle */}
                                  <div
                                    className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize bg-white opacity-0 group-hover:opacity-50"
                                    onMouseDown={(e) => handleBlockMouseDown(e, item, 'resize-top')}
                                  />
                                  
                                  {/* Content */}
                                  <div className={`px-2 py-1 h-full flex flex-col justify-center ${isShiftPressed ? 'cursor-pointer' : 'cursor-move'}`}>
                                    <div className="font-medium truncate">
                                      {currentItem.availabilityType === 'unavailable' ? 'Out' : 'Pref'}
                                    </div>
                                    <div className="text-xs opacity-90 truncate">
                                      {formatTime(currentStartMinutes)}
                                    </div>
                                  </div>

                                  {/* Right resize handle */}
                                  <div
                                    className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize bg-white opacity-0 group-hover:opacity-50"
                                    onMouseDown={(e) => handleBlockMouseDown(e, item, 'resize-bottom')}
                                  />
                                </div>
                              );
                            })}

                            {/* New block preview */}
                            {newBlock && newBlock.contactId === contact.id && (
                              <div
                                className="absolute text-xs text-white top-2 bottom-2 rounded bg-gray-500 opacity-60 z-20"
                                style={{
                                  left: `${minutesToPosition(timeToMinutes(newBlock.startTime))}px`,
                                  width: `${timeToMinutes(newBlock.endTime) - timeToMinutes(newBlock.startTime)}px`,
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
                    {editingItem.contactFirstName} {editingItem.contactLastName} - {editingItem.date}
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
                      value={editingItem.notes || ""}
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