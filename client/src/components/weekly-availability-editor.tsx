import { useState, useRef, useCallback } from "react";
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
  const [draggedItem, setDraggedItem] = useState<ContactAvailability | null>(null);
  const [isResizing, setIsResizing] = useState<{ id: number; edge: 'start' | 'end' } | null>(null);
  const [editingItem, setEditingItem] = useState<ContactAvailability & { notes: string; availabilityType: string } | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const calendarRef = useRef<HTMLDivElement>(null);

  // Get week dates
  const getWeekDates = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day; // Sunday = 0
    startOfWeek.setDate(diff);
    
    for (let i = 0; i < 7; i++) {
      const weekDate = new Date(startOfWeek);
      weekDate.setDate(startOfWeek.getDate() + i);
      week.push(weekDate);
    }
    return week;
  };

  const weekDates = getWeekDates(currentWeek);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Fetch availability data
  const { data: availability = [], isLoading } = useQuery({
    queryKey: [`/api/projects/${contact.projectId}/contacts/${contact.id}/availability`],
    enabled: isOpen,
  });

  // Filter availability for current week
  const weekAvailability = (availability as ContactAvailability[]).filter((item: ContactAvailability) => {
    const itemDate = new Date(item.date);
    return weekDates.some(weekDate => 
      weekDate.toISOString().split('T')[0] === item.date
    );
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/projects/${contact.projectId}/contacts/${contact.id}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create availability");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/projects/${contact.projectId}/contacts/${contact.id}/availability`] 
      });
      toast({ title: "Availability added successfully" });
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
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const minutesToPosition = (minutes: number): number => {
    // 24 hours = 1440 minutes, each hour = 60px, so 1440px total height
    return (minutes / 1440) * 1440;
  };

  const positionToMinutes = (position: number): number => {
    return Math.max(0, Math.min(1440, Math.round((position / 1440) * 1440)));
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
    const dayWidth = rect.width / 7;
    const y = e.clientY - rect.top - 60; // Subtract header height
    const minutes = positionToMinutes(y);

    // Check if clicking on existing item
    const clickedItem = weekAvailability.find(item => {
      const itemDay = weekDates.findIndex(date => date.toISOString().split('T')[0] === item.date);
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
    setIsDragCreating({
      isActive: true,
      startDay: dayIndex,
      startTime: minutes,
      currentDay: dayIndex,
      currentTime: minutes,
      availabilityType: 'unavailable'
    });

    const handleMouseMove = (e: MouseEvent) => {
      if (!calendarRef.current || !isDragCreating?.isActive) return;

      const rect = calendarRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top - 60;
      const newMinutes = positionToMinutes(y);

      setIsDragCreating(prev => prev ? {
        ...prev,
        currentTime: newMinutes
      } : null);
    };

    const handleMouseUp = () => {
      if (isDragCreating?.isActive) {
        const startTime = Math.min(isDragCreating.startTime, isDragCreating.currentTime);
        const endTime = Math.max(isDragCreating.startTime, isDragCreating.currentTime);
        
        if (endTime - startTime >= 15) { // Minimum 15 minutes
          const date = weekDates[dayIndex].toISOString().split('T')[0];
          createMutation.mutate({
            date,
            startTime: minutesToTime(startTime),
            endTime: minutesToTime(endTime),
            availabilityType: isDragCreating.availabilityType,
            notes: ""
          });
        }
      }
      
      setIsDragCreating(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isDragCreating, weekAvailability, weekDates, createMutation]);

  // Generate time labels (every 2 hours)
  const timeLabels = [];
  for (let hour = 0; hour < 24; hour += 2) {
    timeLabels.push({
      hour,
      label: `${hour.toString().padStart(2, '0')}:00`,
      position: (hour * 60 / 1440) * 1440 // Convert to pixel position
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
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
            <div className="flex items-center space-x-4">
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
              {weekDates.map((date, index) => (
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
            <div className="relative" style={{ height: '600px' }}>
              <div className="grid grid-cols-8 h-full">
                {/* Time column */}
                <div className="border-r bg-gray-50">
                  <div className="relative h-full">
                    {timeLabels.map(({ hour, label, position }) => (
                      <div
                        key={hour}
                        className="absolute text-xs text-gray-600 px-2 -translate-y-1/2"
                        style={{ top: `${(position / 1440) * 100}%` }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Day columns */}
                <div className="col-span-7 relative" ref={calendarRef}>
                  {/* Hour grid lines */}
                  {timeLabels.map(({ hour, position }) => (
                    <div
                      key={hour}
                      className="absolute w-full border-t border-gray-200"
                      style={{ top: `${(position / 1440) * 100}%` }}
                    />
                  ))}

                  {/* Day columns background */}
                  {weekDates.map((_, dayIndex) => (
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
                    const dayIndex = weekDates.findIndex(date => 
                      date.toISOString().split('T')[0] === item.date
                    );
                    if (dayIndex === -1) return null;

                    const startMinutes = timeToMinutes(item.startTime);
                    const endMinutes = timeToMinutes(item.endTime);
                    const duration = endMinutes - startMinutes;
                    
                    return (
                      <div
                        key={item.id}
                        className={`absolute rounded cursor-pointer border-2 ${getAvailabilityColor(item.availabilityType)}`}
                        style={{
                          left: `${(dayIndex / 7) * 100 + 0.5}%`,
                          width: `${100 / 7 - 1}%`,
                          top: `${(startMinutes / 1440) * 100}%`,
                          height: `${(duration / 1440) * 100}%`
                        }}
                        onClick={() => setEditingItem({
                          ...item,
                          notes: item.notes || '',
                          availabilityType: item.availabilityType
                        })}
                      >
                        <div className="p-1 text-white text-xs">
                          <div className="font-medium">
                            {item.startTime} - {item.endTime}
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
                        top: `${(Math.min(isDragCreating.startTime, isDragCreating.currentTime) / 1440) * 100}%`,
                        height: `${(Math.abs(isDragCreating.currentTime - isDragCreating.startTime) / 1440) * 100}%`
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
              Drag to create • Click to edit • Minimum 15 minutes
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