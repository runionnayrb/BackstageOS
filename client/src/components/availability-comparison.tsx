import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Users, Trash2, ArrowLeft, Calendar, Filter, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatTimeDisplay, formatTimeFromMinutes, parseScheduleSettings, getTimezoneAbbreviation } from "@/lib/timeUtils";

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
  const [draggedItems, setDraggedItems] = useState<any[]>([]);
  const [resizingItem, setResizingItem] = useState<any>(null);
  const [resizeMode, setResizeMode] = useState<'top' | 'bottom' | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedItemsRef = useRef<Set<number>>(new Set());
  
  // Schedule Filter State (duplicate from schedule filter)
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showScheduleEnabled, setShowScheduleEnabled] = useState(true);
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
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

  // Get show settings for timezone and time format
  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Parse schedule settings with time format preference
  const scheduleSettings = parseScheduleSettings((showSettings as any)?.scheduleSettings);
  const { timeFormat, timezone } = scheduleSettings;

  // Fetch all project contacts
  const { data: allContacts = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/contacts`],
  });

  // Fetch all project availability
  const { data: allAvailability = [], isLoading } = useQuery<ProjectAvailability[]>({
    queryKey: [`/api/projects/${projectId}/availability`],
  });

  // Fetch schedule events to show conflicts
  const { data: scheduleEvents = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/schedule-events`],
  });

  // Additional queries for schedule filter system
  const { data: eventTypes = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/event-types`],
  });

  // Filter contacts based on selected contact IDs
  const getFilteredContacts = () => {
    let filteredContacts = allContacts as any[];
    
    // Apply contact filtering if specific contacts are selected
    if (selectedContactIds.length > 0) {
      filteredContacts = filteredContacts.filter(contact => 
        selectedContactIds.includes(contact.id)
      );
    }
    
    // Sort alphabetically
    return filteredContacts.sort((a: any, b: any) => 
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    );
  };

  const contacts = getFilteredContacts();

  // Schedule Filter Logic (duplicated from schedule-filter.tsx)
  const enabledEventTypes = showSettings?.scheduleSettings?.enabledEventTypes || [];
  const allEventTypes = eventTypes;

  // Initialize Show Schedule state when settings load
  useEffect(() => {
    if (enabledEventTypes.length > 0 && showScheduleEnabled) {
      setSelectedEventTypes(enabledEventTypes);
    }
  }, [enabledEventTypes, showScheduleEnabled]);

  // Group contacts by contact group for better organization
  const contactsByCategory = (allContacts as any[]).reduce((acc, contact) => {
    const groupName = contact.contactGroup?.name || 'Unassigned';
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(contact);
    return acc;
  }, {} as Record<string, any[]>);

  const handleContactToggle = (contactId: number) => {
    const newSelection = selectedContactIds.includes(contactId)
      ? selectedContactIds.filter(id => id !== contactId)
      : [...selectedContactIds, contactId];
    
    setSelectedContactIds(newSelection);
  };

  const handleSelectAll = () => {
    const allContactIds = (allContacts as any[]).map(contact => contact.id);
    setSelectedContactIds(allContactIds);
  };

  const handleClearAll = () => {
    setSelectedContactIds([]);
  };

  const handleSelectCategoryAll = (category: string) => {
    const categoryContactIds = contactsByCategory[category]?.map(contact => contact.id) || [];
    const otherContactIds = selectedContactIds.filter(id => 
      !contactsByCategory[category]?.some(contact => contact.id === id)
    );
    setSelectedContactIds([...otherContactIds, ...categoryContactIds]);
  };

  const handleSelectCategoryNone = (category: string) => {
    const categoryContactIds = contactsByCategory[category]?.map(contact => contact.id) || [];
    const remainingContactIds = selectedContactIds.filter(id => 
      !categoryContactIds.includes(id)
    );
    setSelectedContactIds(remainingContactIds);
  };

  // Event type filtering functions
  const handleEventTypeToggle = (eventTypeIdentifier: string | number) => {
    const currentSelection = selectedEventTypes || [];
    const newSelection = currentSelection.includes(eventTypeIdentifier)
      ? currentSelection.filter(id => id !== eventTypeIdentifier)
      : [...currentSelection, eventTypeIdentifier];
    
    setSelectedEventTypes(newSelection);
  };

  const handleSelectAllEventTypes = () => {
    const allEventTypeIdentifiers = allEventTypes
      .filter((eventType: any) => enabledEventTypes.includes(eventType.isDefault ? eventType.name : eventType.id))
      .map((eventType: any) => eventType.isDefault ? eventType.name : eventType.id);
    setSelectedEventTypes(allEventTypeIdentifiers);
  };

  const handleClearAllEventTypes = () => {
    setSelectedEventTypes([]);
  };

  // Individual event type filtering functions
  const handleIndividualTypeToggle = (eventTypeName: string) => {
    const currentSelection = selectedIndividualTypes || [];
    const newSelection = currentSelection.includes(eventTypeName)
      ? currentSelection.filter(name => name !== eventTypeName)
      : [...currentSelection, eventTypeName];
    
    setSelectedIndividualTypes(newSelection);
  };

  const handleSelectAllIndividualTypes = () => {
    const individualEventTypes = allEventTypes
      .filter((eventType: any) => !enabledEventTypes.includes(eventType.isDefault ? eventType.name : eventType.id))
      .map((eventType: any) => eventType.name);
    setSelectedIndividualTypes(individualEventTypes);
  };

  const handleClearAllIndividualTypes = () => {
    setSelectedIndividualTypes([]);
  };

  const handleShowScheduleToggle = () => {
    setShowScheduleEnabled(!showScheduleEnabled);
    if (!showScheduleEnabled) {
      setSelectedEventTypes(enabledEventTypes);
    } else {
      setSelectedEventTypes([]);
    }
  };

  // Sort categories with Cast first, then alphabetically
  const sortedCategories = Object.keys(contactsByCategory).sort((a, b) => {
    if (a === 'Cast' && b !== 'Cast') return -1;
    if (a !== 'Cast' && b === 'Cast') return 1;
    return a.localeCompare(b);
  });
  


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

  // Get schedule events for a specific contact and the current date
  const getContactScheduleEventsForDate = (contactId: number) => {
    const dateStr = currentDate.toISOString().split('T')[0];
    return (scheduleEvents as any[]).filter((event: any) => {
      if (event.date !== dateStr) return false;
      // Check participants array for contactId
      const isParticipant = event.participants?.some((p: any) => 
        (p.contactId === contactId) || (p.id === contactId)
      );
      if (isParticipant) return true;
      
      // Also check if assigned to specific departments that the contact belongs to
      // or if the contact is the primary person for the event
      return false;
    });
  };

  // Apply schedule filtering to events (duplicated logic from schedule-filter.tsx)
  const applyFiltersToEvents = (events: any[]) => {
    if (!events || events.length === 0) return [];
    

    
    // If no filtering is active, show all events
    if (!showScheduleEnabled || (selectedEventTypes.length === 0 && selectedIndividualTypes.length === 0)) {

      return events;
    }
    
    // Filter based on selected event types
    const filteredEvents = events.filter((event: any) => {
      // Check if event type is in Show Schedule types
      const eventType = eventTypes.find(et => 
        et.id === event.eventTypeId || 
        et.name.toLowerCase() === event.type.toLowerCase() ||
        et.name.toLowerCase().replace(/\s+/g, '_') === event.type.toLowerCase() ||
        et.name.toLowerCase() === event.type.toLowerCase().replace(/_/g, ' ')
      );
      
      const typeIdentifier = eventType ? (eventType.isDefault ? eventType.name : eventType.id) : event.type;
      const eventTypeName = eventType ? eventType.name : event.type;
      

      
      // Check if enabled in Show Schedule
      if (selectedEventTypes.includes(typeIdentifier)) {
        return true;
      }
      
      // Check if enabled in Individual Events
      return selectedIndividualTypes.includes(eventTypeName);
    });
    

    return filteredEvents;
  };

  // Get filtered events for a specific contact (applies schedule filtering)
  const getFilteredScheduleEvents = (contactId: number) => {
    const contactEvents = getContactScheduleEventsForDate(contactId);
    return applyFiltersToEvents(contactEvents);
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
    // Calculate the exact position as a percentage of the container width
    const percentage = Math.max(0, Math.min(1, position / containerWidth));
    
    // Convert percentage to minutes across the total time range
    const minutes = START_MINUTES + (percentage * TOTAL_MINUTES);
    
    // Snap to the time increment
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
    onMutate: async (data: any) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [`/api/projects/${projectId}/availability`] });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData([`/api/projects/${projectId}/availability`]);
      
      // Create temporary item with expected structure
      const tempItem = {
        id: Date.now(), // Temporary ID
        contactId: data.contactId,
        projectId: projectId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        availabilityType: data.availabilityType,
        notes: data.notes || '',
        createdBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        contactFirstName: '',
        contactLastName: ''
      };
      
      // Optimistically update to the new value
      queryClient.setQueryData([`/api/projects/${projectId}/availability`], (old: any) => {
        return old ? [...old, tempItem] : [tempItem];
      });
      
      // Return a context object with the snapshotted value
      return { previousData, tempId: tempItem.id };
    },
    onSuccess: (newItem, variables, context) => {
      // Replace the temporary item with the real one from the server
      queryClient.setQueryData([`/api/projects/${projectId}/availability`], (old: any) => {
        return old?.map((item: any) => 
          item.id === context?.tempId ? newItem : item
        ) || [];
      });
      setNewBlock(null);
      // Open edit dialog for the newly created item
      setEditingItem(newItem);
    },
    onError: (error, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData([`/api/projects/${projectId}/availability`], context.previousData);
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
    } else if (draggedItems.length > 0) {
      // Handle multi-select drag operations
      const updates: any[] = [];
      
      // Update query cache for all dragged items immediately
      queryClient.setQueryData([`/api/projects/${projectId}/availability`], (old: any) => {
        return old?.map((item: any) => {
          const draggedItem = draggedItems.find(d => d.id === item.id);
          if (draggedItem) {
            const updateData = {
              contactId: draggedItem.contactId,
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
    setDraggedItems([]);
    setResizingItem(null);
    setResizeMode(null);
  };

  // Add global mouse event listeners for drag operations
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => {
        handleMouseUp();
      };

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

      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isDragging, newBlock, draggedItem, draggedItems, resizingItem, currentDate, projectId, queryClient, createMutation, silentUpdate]);

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
      convertedTime: formatTimeFromMinutesLocal(positionToMinutes(x, rect.width))
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
      
      // Convert delta pixels to delta minutes
      const deltaMinutes = (deltaX / containerWidth) * TOTAL_MINUTES;
      
      // Apply delta movement to original position (not absolute positioning)
      const newStartMinutes = snapToIncrement(Math.max(START_MINUTES, Math.min(END_MINUTES - duration, startMinutes + deltaMinutes)));
      const newEndMinutes = newStartMinutes + duration;
      
      const newContactId = getContactIdFromY(currentY);
      
      setDraggedItem({
        ...draggedItem,
        startTime: formatTimeFromMinutesLocal(newStartMinutes),
        endTime: formatTimeFromMinutesLocal(newEndMinutes),
        contactId: newContactId || draggedItem.contactId,
      });
    } else if (draggedItems.length > 0) {
      // Moving multiple selected items
      const deltaX = currentX - dragStart.x;
      const deltaMinutes = (deltaX / containerWidth) * TOTAL_MINUTES;
      
      const newContactId = getContactIdFromY(currentY);
      
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
          contactId: newContactId || item.contactId,
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
        contactId: dragStart.contactId,
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
        
        // If item is part of selection, drag all selected items
        if (selectedItems.has(item.id)) {
          const itemsToDrag = (allAvailability as ProjectAvailability[]).filter((a: ProjectAvailability) => 
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
          <p className="mt-2 text-gray-600">Loading availability data...</p>
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
            <h1 className="text-3xl font-bold">Team Availability</h1>
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
                <Popover 
                  open={openPopoverId === 'calendar'} 
                  onOpenChange={(open) => setOpenPopoverId(open ? 'calendar' : null)}
                >
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
                          setOpenPopoverId(null); // Close popover when date is selected
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
              
              {/* Schedule Filter Button (duplicate from schedule filter) */}
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 w-8 p-0 bg-transparent hover:bg-transparent border-none ${
                      (selectedIndividualTypes && selectedIndividualTypes.length > 0) 
                        ? 'text-blue-600 hover:text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-0" align="end">
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Schedule Filters
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsFilterOpen(false)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Tabs defaultValue="people" className="w-full">
                    <div className="flex gap-2 mx-4 mb-4">
                      <TabsList className="grid grid-cols-2 h-9 flex-1">
                        <TabsTrigger value="people" className="h-8 text-sm">
                          People
                        </TabsTrigger>
                        <TabsTrigger value="events" className="h-8 text-sm">
                          Event Types
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="people" className="m-0">
                      <div className="px-4 py-3 border-b bg-gray-50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">FULL COMPANY</span>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleSelectAll}
                              className="text-xs px-2 py-1 h-5"
                            >
                              All
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleClearAll}
                              className="text-xs px-2 py-1 h-5"
                            >
                              None
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="max-h-96 overflow-y-auto">
                        {(allContacts as any[]).length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No team members found</p>
                            <p className="text-sm">Add contacts to filter by assignments</p>
                          </div>
                        ) : (
                          <div className="p-2">
                            {sortedCategories.map((category) => (
                              <div key={category} className="mb-4">
                                <div className="flex items-center justify-between px-2 py-1 text-sm font-medium text-gray-600 border-b">
                                  <span>{category.replace(/_/g, ' ').toUpperCase()}</span>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSelectCategoryAll(category)}
                                      className="text-xs px-2 py-1 h-5"
                                    >
                                      All
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSelectCategoryNone(category)}
                                      className="text-xs px-2 py-1 h-5"
                                    >
                                      None
                                    </Button>
                                  </div>
                                </div>
                                <div className="space-y-1 mt-2">
                                  {contactsByCategory[category].map((contact: any) => (
                                    <div
                                      key={contact.id}
                                      className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                                      onClick={() => handleContactToggle(contact.id)}
                                    >
                                      <Checkbox
                                        checked={selectedContactIds.includes(contact.id)}
                                        onChange={() => handleContactToggle(contact.id)}
                                        className="pointer-events-none"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                          {contact.firstName} {contact.lastName}
                                        </p>
                                        {contact.role && (
                                          <p className="text-xs text-gray-500 truncate">
                                            {contact.role}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="p-3 border-t bg-gray-50">
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>
                            {selectedContactIds.length === 0 
                              ? "Showing show schedule (production events only)"
                              : `Filtering by ${selectedContactIds.length} ${selectedContactIds.length === 1 ? 'person' : 'people'}`
                            }
                          </span>
                          {selectedContactIds.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleClearAll}
                              className="h-6 px-2 text-xs"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="events" className="m-0">
                      <div className="max-h-96 overflow-y-auto">
                        {/* Show Schedule Section */}
                        <div className="p-4 border-b bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-sm font-medium text-gray-700">Show Schedule</h5>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSelectAllEventTypes}
                                className="h-6 px-2 text-xs"
                                disabled={allEventTypes.filter((eventType: any) => enabledEventTypes.includes(eventType.isDefault ? eventType.name : eventType.id)).length === 0}
                              >
                                All
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClearAllEventTypes}
                                className="h-6 px-2 text-xs"
                              >
                                None
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {allEventTypes
                              .filter((eventType: any) => enabledEventTypes.includes(eventType.isDefault ? eventType.name : eventType.id))
                              .map((eventType: any) => (
                                <div
                                  key={eventType.id}
                                  className="flex items-center space-x-3 p-2 rounded bg-white cursor-pointer hover:bg-gray-50"
                                  onClick={() => handleEventTypeToggle(eventType.isDefault ? eventType.name : eventType.id)}
                                >
                                  <Checkbox
                                    checked={selectedEventTypes?.includes(eventType.isDefault ? eventType.name : eventType.id) || false}
                                    onChange={() => handleEventTypeToggle(eventType.isDefault ? eventType.name : eventType.id)}
                                    className="pointer-events-none"
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      {eventType.name}
                                    </p>
                                    {eventType.description && (
                                      <p className="text-xs text-gray-500 truncate">
                                        {eventType.description}
                                      </p>
                                    )}
                                  </div>
                                  <div 
                                    className="w-3 h-3 rounded-full border"
                                    style={{ backgroundColor: eventType.color }}
                                  />
                                </div>
                              ))}
                            {allEventTypes.filter((eventType: any) => enabledEventTypes.includes(eventType.isDefault ? eventType.name : eventType.id)).length === 0 && (
                              <div className="p-3 text-center text-gray-500 text-sm">
                                No event types enabled in Show Schedule
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Individual Events Section */}
                        <div className="p-4 border-b bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-sm font-medium text-gray-700">Individual Events</h5>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSelectAllIndividualTypes}
                                className="h-6 px-2 text-xs"
                                disabled={allEventTypes.filter((eventType: any) => !enabledEventTypes.includes(eventType.isDefault ? eventType.name : eventType.id)).length === 0}
                              >
                                All
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClearAllIndividualTypes}
                                className="h-6 px-2 text-xs"
                              >
                                None
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {allEventTypes
                              .filter((eventType: any) => !enabledEventTypes.includes(eventType.isDefault ? eventType.name : eventType.id))
                              .map((eventType: any) => (
                                <div
                                  key={eventType.id}
                                  className="flex items-center space-x-3 p-2 rounded bg-white cursor-pointer hover:bg-gray-50"
                                  onClick={() => handleIndividualTypeToggle(eventType.name)}
                                >
                                  <Checkbox
                                    checked={selectedIndividualTypes?.includes(eventType.name) || false}
                                    onChange={() => handleIndividualTypeToggle(eventType.name)}
                                    className="pointer-events-none"
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      {eventType.name}
                                    </p>
                                    {eventType.description && (
                                      <p className="text-xs text-gray-500 truncate">
                                        {eventType.description}
                                      </p>
                                    )}
                                  </div>
                                  <div 
                                    className="w-3 h-3 rounded-full border"
                                    style={{ backgroundColor: eventType.color }}
                                  />
                                </div>
                              ))}
                            {allEventTypes.filter((eventType: any) => !enabledEventTypes.includes(eventType.isDefault ? eventType.name : eventType.id)).length === 0 && (
                              <div className="p-3 text-center text-gray-500 text-sm">
                                All event types are enabled in Show Schedule
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-3 border-t bg-gray-50">
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>
                            {((selectedEventTypes?.length || 0) + (selectedIndividualTypes?.length || 0)) === 0 
                              ? "Showing all event types"
                              : `Filtering by ${(selectedEventTypes?.length || 0) + (selectedIndividualTypes?.length || 0)} ${((selectedEventTypes?.length || 0) + (selectedIndividualTypes?.length || 0)) === 1 ? 'type' : 'types'}`
                            }
                          </span>
                          {((selectedEventTypes?.length || 0) + (selectedIndividualTypes?.length || 0)) > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                handleClearAllEventTypes();
                                handleClearAllIndividualTypes();
                              }}
                              className="h-6 px-2 text-xs"
                            >
                              Clear All
                            </Button>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </PopoverContent>
              </Popover>



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
                {/* Synchronized Contact Names and Schedule Area */}
                <div className="flex-1 overflow-auto">
                  <div className="flex">
                    {/* Contact Names Column - Fixed width within scrollable container */}
                    <div className="w-48 border-r bg-gray-50 flex-shrink-0">
                      <div className="h-10 border-b bg-gray-100 flex items-center px-3 sticky top-0 z-20">
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
                    <div className="flex-1 min-w-0">
                      <div 
                        className="relative select-none"
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape' && (isDragging || newBlock)) {
                            setIsDragging(false);
                            setDragStart(null);
                            setNewBlock(null);
                            setDraggedItem(null);
                            setDraggedItems([]);
                            setResizingItem(null);
                            setResizeMode(null);
                          }
                        }}
                        tabIndex={-1}
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

                    {/* Contact Rows */}
                    <div>
                      {contacts.map((contact: any, contactIndex: number) => {
                        const contactAvailability = getContactAvailabilityForDate(contact.id);
                        
                        return (
                          <div 
                            key={contact.id} 
                            className="h-16 border-b relative bg-white cursor-crosshair w-full" 
                            onMouseDown={(e) => handleMouseDown(e, contact.id)}
                            onContextMenu={(e) => e.preventDefault()}
                          >
                            {/* Time Grid Background with incremental lines */}
                            <div className="relative w-full h-full absolute">
                              {timeLabels.map((timeLabel) => {
                                const startPercent = ((timeLabel.minutes - START_MINUTES) / TOTAL_MINUTES) * 100;
                                const widthPercent = (timeIncrement / TOTAL_MINUTES) * 100;
                                
                                return (
                                  <div
                                    key={timeLabel.minutes}
                                    className="absolute border-r border-gray-100 h-full"
                                    style={{
                                      left: `${startPercent}%`,
                                      width: `${widthPercent}%`,
                                    }}
                                  />
                                );
                              })}
                            </div>

                            {/* Availability Blocks */}
                            {contactAvailability.map((item: ProjectAvailability) => {
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

                              return (
                                <div
                                  key={item.id}
                                  className={`absolute text-xs text-white top-2 bottom-2 rounded group ${
                                    currentItem.availabilityType === 'unavailable'
                                      ? 'bg-red-500 hover:bg-red-600'
                                      : 'bg-blue-500 hover:bg-blue-600'
                                  } ${(isBeingDragged || isBeingDraggedMulti || isBeingResized) ? 'opacity-80 z-20' : 'z-10'} ${
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
                                  onDoubleClick={() => {
                                    setEditingItem(item);
                                    setOpenPopoverId(null); // Close any open popovers
                                  }}
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

                            {/* Schedule Events */}
                            {getFilteredScheduleEvents(contact.id).map((event: any) => {
                              const startMinutes = timeToMinutes(event.startTime);
                              const endMinutes = timeToMinutes(event.endTime);
                              const startPercent = ((startMinutes - START_MINUTES) / TOTAL_MINUTES) * 100;
                              const widthPercent = ((endMinutes - startMinutes) / TOTAL_MINUTES) * 100;

                              return (
                                <div
                                  key={`event-${event.id}`}
                                  className="absolute top-2 bottom-2 rounded text-[10px] px-1.5 py-0.5 text-white bg-green-600 border border-green-700 shadow-sm z-10 opacity-90 flex flex-col justify-center overflow-hidden"
                                  style={{
                                    left: `${startPercent}%`,
                                    width: `${Math.max(2, widthPercent)}%`,
                                  }}
                                  title={`Scheduled: ${event.title}\n${formatTime(startMinutes)} - ${formatTime(endMinutes)}`}
                                >
                                  <div className="font-bold truncate leading-tight">{event.title}</div>
                                  <div className="opacity-90 truncate leading-tight">
                                    {formatTime(startMinutes)}
                                  </div>
                                </div>
                              );
                            })}

                            {/* New block preview */}
                            {newBlock && newBlock.contactId === contact.id && (
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