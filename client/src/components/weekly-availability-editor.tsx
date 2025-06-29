import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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
}

export function WeeklyAvailabilityEditor({ contact }: AvailabilityEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [isDragCreating, setIsDragCreating] = useState<{
    isActive: boolean;
    startDay: number;
    startTime: number;
    currentDay: number;
    currentTime: number;
    availabilityType: 'unavailable' | 'preferred';
  } | null>(null);
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

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const calendarRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Get week dates based on configured week start day
  const getWeekDates = (date: Date, startDay: string = "sunday") => {
    const week = [];
    const startOfWeek = new Date(date);
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
      const weekDate = new Date(startOfWeek);
      weekDate.setDate(startOfWeek.getDate() + i);
      week.push(weekDate);
    }
    return week;
  };

  // Fetch availability data
  const { data: availability = [], isLoading } = useQuery({
    queryKey: [`/api/projects/${contact.projectId}/contacts/${contact.id}/availability`],
    enabled: isOpen,
  });

  // Fetch show settings for working hours
  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${contact.projectId}/settings`],
    enabled: isOpen,
  });

  // Extract schedule settings from show settings
  const scheduleSettings = (showSettings as any)?.scheduleSettings ? 
    JSON.parse((showSettings as any).scheduleSettings) : 
    { workingHours: { start: "09:00", end: "18:00" }, timeFormat: "24h", weekStartDay: "sunday" }; // Default fallback

  const workingHours = scheduleSettings.workingHours;
  const timeFormat = scheduleSettings.timeFormat || "24h"; // Default to 24-hour format
  const weekStartDay = scheduleSettings.weekStartDay || "sunday"; // Default to Sunday
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
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/projects/${contact.projectId}/contacts/${contact.id}/availability`] 
      });
      toast({ title: "Availability added successfully" });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/projects/${contact.projectId}/contacts/${contact.id}/availability`] 
      });
      toast({ title: "Availability updated successfully" });
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
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (timeFormat === "12h") {
      const period = hours >= 12 ? "PM" : "AM";
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
    } else {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
  };

  const minutesToPosition = (minutes: number): number => {
    // Calendar height is 1440px for full 24 hours (1 pixel per minute)
    return minutes;
  };

  const positionToMinutes = (position: number): number => {
    // Convert pixel position back to minutes (1:1 ratio)
    const minutes = Math.max(0, Math.min(1440, Math.round(position)));
    // Snap to time increment
    return Math.round(minutes / timeIncrement) * timeIncrement;
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
    setCurrentWeek(new Date());
  };

  // Drag to create functionality
  const handleMouseDown = useCallback((e: React.MouseEvent, dayIndex: number) => {
    if (!calendarRef.current) return;

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

    // Start drag creation
    let dragState = {
      isActive: true,
      startDay: dayIndex,
      startTime: minutes,
      currentDay: dayIndex,
      currentTime: minutes,
      availabilityType: 'unavailable' as const
    };

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
      if (dragState.isActive) {
        const startTime = Math.min(dragState.startTime, dragState.currentTime);
        const endTime = Math.max(dragState.startTime, dragState.currentTime);
        
        console.log('Creating availability:', {
          date: weekDates[dragState.startDay].toISOString().split('T')[0],
          startTime: minutesToTime(startTime),
          endTime: minutesToTime(endTime),
          duration: endTime - startTime,
          availabilityType: dragState.availabilityType,
          dayIndex: dragState.startDay
        });
        
        if (endTime - startTime >= timeIncrement) { // Minimum duration based on increment
          const date = weekDates[dragState.startDay].toISOString().split('T')[0];
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
    
    // Calculate offset from mouse to top-left of block (accounting for scroll)
    const dayColumnWidth = calendarRect.width / 8; // Time column + 7 day columns
    const timeColumnWidth = dayColumnWidth;
    const blockLeft = timeColumnWidth + (dayIndex * dayColumnWidth);
    const blockTop = minutesToPosition(startMinutes) - scrollContainer.scrollTop;
    const offsetX = e.clientX - calendarRect.left - blockLeft;
    const offsetY = e.clientY - calendarRect.top - blockTop;
    
    console.log('Starting drag:', { item: item.id, dayIndex, startMinutes });
    
    let currentDragState = {
      item,
      originalPosition: { dayIndex, startMinutes },
      currentPosition: { dayIndex, startMinutes },
      offset: { x: offsetX, y: offsetY },
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
      
      // Calculate actual position within the 1440px calendar content
      const contentY = mouseY + scrollTop;
      
      // Calculate new day (accounting for time column + 7 day columns)
      const dayColumnWidth = calendarRect.width / 8;
      const timeColumnWidth = dayColumnWidth;
      const relativeX = mouseX - timeColumnWidth;
      const newDayIndex = Math.max(0, Math.min(6, Math.floor(relativeX / dayColumnWidth)));
      
      // Calculate new time position - allow free movement, maintain duration
      const duration = timeToMinutes(item.endTime) - timeToMinutes(item.startTime);
      const rawMinutes = Math.round(contentY);
      
      // Allow free movement while preventing overflow past midnight
      const maxStartTime = 1440 - duration; // Ensure end time doesn't exceed midnight
      const newStartMinutes = Math.max(0, Math.min(maxStartTime, rawMinutes));
      
      console.log('Drag move:', {
        mouseY,
        scrollTop,
        contentY,
        rawMinutes,
        duration,
        maxStart: 1440 - duration,
        newStartMinutes,
        time: minutesToTime(newStartMinutes),
        endTime: minutesToTime(newStartMinutes + duration)
      });
      
      currentDragState = {
        ...currentDragState,
        currentPosition: { dayIndex: newDayIndex, startMinutes: newStartMinutes }
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
        
        // Only update if position changed
        if (currentPosition.dayIndex !== originalPosition.dayIndex || 
            currentPosition.startMinutes !== originalPosition.startMinutes) {
          
          const newDate = weekDates[currentPosition.dayIndex].toISOString().split('T')[0];
          const duration = timeToMinutes(item.endTime) - timeToMinutes(item.startTime);
          const newEndMinutes = currentPosition.startMinutes + duration;
          
          console.log('Updating availability position:', {
            id: item.id,
            oldDate: item.date,
            newDate,
            oldTime: `${item.startTime} - ${item.endTime}`,
            newTime: `${minutesToTime(currentPosition.startMinutes)} - ${minutesToTime(newEndMinutes)}`
          });
          
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
        }
      }
      
      setDraggedItem(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [weekDates, updateMutation]);

  // Generate time labels (every 2 hours) using show's time format
  const timeLabels = [];
  for (let hour = 0; hour < 24; hour += 2) {
    timeLabels.push({
      hour,
      label: minutesToTime(hour * 60),
      position: (hour * 60 / 1440) * 1440 // Convert to pixel position
    });
  }

  // Generate grid lines based on time increment using show's time format
  const gridLines = [];
  for (let minutes = 0; minutes < 1440; minutes += timeIncrement) {
    const min = minutes % 60;
    gridLines.push({
      minutes,
      label: minutesToTime(minutes),
      isHour: min === 0
    });
  }

  const getAvailabilityColor = (type: string) => {
    switch (type) {
      case 'unavailable': return 'bg-red-500 hover:bg-red-600 border-red-600';
      case 'preferred': return 'bg-blue-500 hover:bg-blue-600 border-blue-600';
      default: return 'bg-gray-500 hover:bg-gray-600 border-gray-600';
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Calendar className="h-4 w-4 mr-2" />
          Manage Availability
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Weekly Availability - {contact.firstName} {contact.lastName}
          </DialogTitle>
          <DialogDescription>
            Drag on the calendar to create availability blocks. Click existing blocks to edit them.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Week navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold w-80 text-center">{formatWeekRange(weekDates)}</h3>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  if (scrollContainerRef.current) {
                    const workingHoursPosition = startHour * 60; // 9 AM = 540 minutes
                    scrollContainerRef.current.scrollTop = workingHoursPosition;
                  }
                }}
              >
                Working Hours
              </Button>
            </div>
            
            {/* Time increment selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm">Grid:</span>
              <Select value={timeIncrement.toString()} onValueChange={(value) => setTimeIncrement(parseInt(value) as 15 | 30 | 60)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Availability type selector for drag creation */}
            <div className="flex items-center space-x-2">
              <span className="text-sm">Create as:</span>
              <Select 
                value={isDragCreating?.availabilityType || 'unavailable'} 
                onValueChange={(value) => {
                  if (isDragCreating) {
                    setIsDragCreating(prev => prev ? { ...prev, availabilityType: value as any } : null);
                  }
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                  <SelectItem value="preferred">Preferred</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="border rounded-lg overflow-hidden bg-white">
            {/* Day headers */}
            <div className="grid grid-cols-8 bg-gray-50 border-b">
              <div className="p-3 text-xs font-medium text-gray-500 border-r">Time</div>
              {weekDates.map((date: Date, index: number) => (
                <div key={index} className="p-3 text-center border-r last:border-r-0">
                  <div className="text-xs font-medium text-gray-500">
                    {dayNames[index]}
                  </div>
                  <div className="text-lg font-semibold">
                    {date.getDate()}
                  </div>
                </div>
              ))}
            </div>

            {/* Calendar body */}
            <div 
              ref={scrollContainerRef}
              className="border-t"
              style={{ 
                height: '500px',
                overflowY: 'scroll',
                position: 'relative'
              }}
              onScroll={(e) => {
                const scrollTop = e.currentTarget.scrollTop;
                setScrollPosition(scrollTop);
              }}
            >
              <div style={{ height: '1440px', position: 'relative' }}> {/* Full 24 hours */}
                <div className="grid grid-cols-8 h-full">
                {/* Time column */}
                <div className="border-r bg-gray-50">
                  <div className="relative h-full">
                    {timeLabels.map(({ hour, label, position }) => (
                      <div
                        key={hour}
                        className="absolute text-xs text-gray-600 px-2 -translate-y-1/2"
                        style={{ top: `${minutesToPosition(hour * 60)}px` }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Day columns */}
                <div className="col-span-7 relative" ref={calendarRef}>
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
                      className="absolute h-full border-r border-gray-200 cursor-crosshair"
                      style={{ 
                        left: `${(dayIndex / 7) * 100}%`,
                        width: `${100 / 7}%`
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
                    
                    // Check if this item is being dragged
                    const isBeingDragged = draggedItem?.item.id === item.id;
                    
                    // Use current position if being dragged, otherwise original position
                    const displayDayIndex = isBeingDragged ? draggedItem.currentPosition.dayIndex : dayIndex;
                    const displayStartMinutes = isBeingDragged ? draggedItem.currentPosition.startMinutes : startMinutes;
                    const displayEndMinutes = displayStartMinutes + duration;
                    
                    return (
                      <div
                        key={item.id}
                        className={`absolute rounded cursor-move border-2 transition-opacity ${getAvailabilityColor(item.availabilityType)} ${isBeingDragged ? 'opacity-80 shadow-lg z-50' : 'hover:opacity-90'}`}
                        style={{
                          left: `${(displayDayIndex / 7) * 100 + 0.5}%`,
                          width: `${100 / 7 - 1}%`,
                          top: `${minutesToPosition(displayStartMinutes)}px`,
                          height: `${minutesToPosition(duration)}px`,
                          transform: isBeingDragged ? 'scale(1.02)' : 'none'
                        }}
                        onMouseDown={(e) => {
                          console.log('Block mousedown triggered for item:', item.id);
                          handleBlockMouseDown(e, item);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Block clicked, justDragged:', justDragged, 'item:', item.id);
                          if (!isBeingDragged && justDragged !== item.id) {
                            setEditingItem({
                              ...item,
                              notes: item.notes || '',
                              availabilityType: item.availabilityType
                            });
                          }
                        }}
                      >
                        <div className="p-1 text-white text-xs">
                          <div className="font-medium">
                            {minutesToTime(displayStartMinutes)} - {minutesToTime(displayEndMinutes)}
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

                  {/* Drag creation preview */}
                  {isDragCreating?.isActive && (
                    <div
                      className={`absolute rounded border-2 border-dashed opacity-60 ${getAvailabilityColor(isDragCreating.availabilityType)}`}
                      style={{
                        left: `${(isDragCreating.startDay / 7) * 100 + 0.5}%`,
                        width: `${100 / 7 - 1}%`,
                        top: `${minutesToPosition(Math.min(isDragCreating.startTime, isDragCreating.currentTime))}px`,
                        height: `${minutesToPosition(Math.abs(isDragCreating.currentTime - isDragCreating.startTime))}px`
                      }}
                    >
                      <div className="p-1 text-white text-xs">
                        <div className="font-medium">
                          {minutesToTime(Math.min(isDragCreating.startTime, isDragCreating.currentTime))} - 
                          {minutesToTime(Math.max(isDragCreating.startTime, isDragCreating.currentTime))}
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
                          {minutesToTime(draggedItem.currentPosition.startMinutes)} - 
                          {minutesToTime(draggedItem.currentPosition.startMinutes + (timeToMinutes(draggedItem.item.endTime) - timeToMinutes(draggedItem.item.startTime)))}
                        </div>
                        <div className="capitalize">{draggedItem.item.availabilityType}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </div>
            </div>
          </div>

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
              Drag to create • Click to edit • Minimum {timeIncrement} minutes
            </div>
          </div>
        </div>

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
      </DialogContent>
    </Dialog>
  );
}