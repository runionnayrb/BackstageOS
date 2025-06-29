import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format, addDays, subDays, startOfWeek, endOfWeek, parseISO, formatISO } from 'date-fns';

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
  date: string;
  startTime: string;
  endTime: string;
  type: 'unavailable' | 'preferred';
  notes?: string;
}

interface LocationAvailabilityPageProps {
  projectId: number;
  onBack: () => void;
}

const START_MINUTES = 8 * 60; // 8:00 AM
const END_MINUTES = 24 * 60; // Midnight
const TOTAL_MINUTES = END_MINUTES - START_MINUTES; // 16 hours

export default function LocationAvailabilityPage({ projectId, onBack }: LocationAvailabilityPageProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeIncrement, setTimeIncrement] = useState(30);
  const [editingBlock, setEditingBlock] = useState<LocationAvailability | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<number[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Refs for drag operations
  const dragRef = useRef<{
    isDragging: boolean;
    startY: number;
    startTime: string;
    endTime: string;
    type: 'unavailable' | 'preferred';
    locationId: number;
    date: string;
  } | null>(null);

  const resizeRef = useRef<{
    isResizing: boolean;
    blockId: number;
    edge: 'top' | 'bottom';
    originalStartTime: string;
    originalEndTime: string;
    initialMouseY: number;
  } | null>(null);

  // Fetch show settings for timezone and working hours
  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Fetch locations for this project
  const { data: locations = [] } = useQuery<EventLocation[]>({
    queryKey: [`/api/projects/${projectId}/locations`],
  });

  // Get schedule settings with safe access
  const scheduleSettings: any = (() => {
    const settings = showSettings as any;
    if (!settings || !settings.scheduleSettings) {
      return { weekStartDay: 0, timeFormat: '12', workStartTime: '09:00', workEndTime: '18:00', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    }
    
    try {
      const parsed = typeof settings.scheduleSettings === 'string' ? 
        JSON.parse(settings.scheduleSettings) : 
        settings.scheduleSettings;
      return {
        weekStartDay: 0,
        timeFormat: '12',
        workStartTime: '09:00',
        workEndTime: '18:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...parsed
      };
    } catch {
      return { weekStartDay: 0, timeFormat: '12', workStartTime: '09:00', workEndTime: '18:00', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    }
  })();

  // Fetch availability for the current week
  const weekStartDay = Math.max(0, Math.min(6, scheduleSettings?.weekStartDay || 0));
  const safeCurrentDate = currentDate instanceof Date && !isNaN(currentDate.getTime()) ? currentDate : new Date();
  const weekStart = startOfWeek(safeCurrentDate, { weekStartsOn: weekStartDay as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
  const weekEnd = endOfWeek(safeCurrentDate, { weekStartsOn: weekStartDay as 0 | 1 | 2 | 3 | 4 | 5 | 6 });

  const { data: availability = [] } = useQuery<LocationAvailability[]>({
    queryKey: [`/api/projects/${projectId}/location-availability`],
  });

  // Mutations for CRUD operations
  const createMutation = useMutation({
    mutationFn: (data: Omit<LocationAvailability, 'id'>) =>
      fetch(`/api/projects/${projectId}/location-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/location-availability`] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: LocationAvailability) =>
      fetch(`/api/projects/${projectId}/location-availability/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/location-availability`] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/projects/${projectId}/location-availability/${id}`, {
        method: 'DELETE',
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/location-availability`] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: number[]) =>
      fetch(`/api/projects/${projectId}/location-availability/bulk`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/location-availability`] });
      setSelectedLocations([]);
      setIsMultiSelectMode(false);
    },
  });

  // Navigation functions
  const goToPreviousWeek = () => setCurrentDate(prev => subDays(prev, 7));
  const goToNextWeek = () => setCurrentDate(prev => addDays(prev, 7));
  const goToToday = () => {
    const timezone = scheduleSettings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date().toLocaleString("en-US", { timeZone: timezone });
    setCurrentDate(new Date(now));
  };

  // Time conversion functions
  const minutesToHeight = (minutes: number) => minutes;
  const positionToMinutes = (position: number) => Math.min(Math.max(position + START_MINUTES, START_MINUTES), END_MINUTES - 1);
  const minutesToTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Format time for display
  const formatTime = (time: string) => {
    const timeFormat = scheduleSettings?.timeFormat || '12';
    const [hours, minutes] = time.split(':').map(Number);
    
    if (timeFormat === '24') {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } else {
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
  };

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Generate time labels
  const timeLabels = [];
  for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += 120) {
    timeLabels.push(minutesToTime(minutes));
  }

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent, locationId: number, date: string) => {
    if (isMultiSelectMode) return;
    
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const startMinutes = positionToMinutes(y);
    const endMinutes = Math.min(startMinutes + timeIncrement, END_MINUTES);
    
    dragRef.current = {
      isDragging: true,
      startY: y,
      startTime: minutesToTime(startMinutes),
      endTime: minutesToTime(endMinutes),
      type: 'unavailable',
      locationId,
      date: format(parseISO(date), 'yyyy-MM-dd'),
    };
  };

  // Handle mouse move during drag
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current?.isDragging && !resizeRef.current?.isResizing) return;
    
    if (dragRef.current?.isDragging) {
      const rect = e.currentTarget.getBoundingClientRect();
      const currentY = e.clientY - rect.top;
      const startY = dragRef.current.startY;
      const minY = Math.min(startY, currentY);
      const maxY = Math.max(startY, currentY);
      
      const startMinutes = positionToMinutes(minY);
      const endMinutes = positionToMinutes(maxY + timeIncrement);
      
      dragRef.current.startTime = minutesToTime(startMinutes);
      dragRef.current.endTime = minutesToTime(Math.min(endMinutes, END_MINUTES));
    }
    
    if (resizeRef.current?.isResizing) {
      const rect = e.currentTarget.getBoundingClientRect();
      const currentY = e.clientY - rect.top;
      const deltaY = currentY - resizeRef.current.initialMouseY;
      const deltaMinutes = deltaY;
      
      const originalStart = timeToMinutes(resizeRef.current.originalStartTime);
      const originalEnd = timeToMinutes(resizeRef.current.originalEndTime);
      
      let newStartTime = resizeRef.current.originalStartTime;
      let newEndTime = resizeRef.current.originalEndTime;
      
      if (resizeRef.current.edge === 'top') {
        const newStart = Math.max(START_MINUTES, originalStart + deltaMinutes);
        if (newStart < originalEnd - timeIncrement) {
          newStartTime = minutesToTime(newStart);
        }
      } else {
        const newEnd = Math.min(END_MINUTES, originalEnd + deltaMinutes);
        if (newEnd > originalStart + timeIncrement) {
          newEndTime = minutesToTime(newEnd);
        }
      }
      
      // Update the block immediately in cache
      const block = availability.find(b => b.id === resizeRef.current!.blockId);
      if (block) {
        const updatedBlock = { ...block, startTime: newStartTime, endTime: newEndTime };
        const queryKey = [`/api/projects/${projectId}/location-availability`, format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')];
        queryClient.setQueryData(queryKey, (old: LocationAvailability[] = []) =>
          old.map(b => b.id === resizeRef.current!.blockId ? updatedBlock : b)
        );
      }
    }
  };

  // Handle mouse up
  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragRef.current?.isDragging) {
      const { startTime, endTime, type, locationId, date } = dragRef.current;
      
      if (timeToMinutes(endTime) - timeToMinutes(startTime) >= timeIncrement) {
        createMutation.mutate({
          locationId,
          date,
          startTime,
          endTime,
          type,
          notes: '',
        }, {
          onSuccess: () => {
            // Auto-open edit dialog
            setTimeout(() => {
              const newBlock = availability.find(b => 
                b.locationId === locationId && 
                b.date === date && 
                b.startTime === startTime && 
                b.endTime === endTime
              );
              if (newBlock) {
                setEditingBlock(newBlock);
                setIsDialogOpen(true);
              }
            }, 100);
          }
        });
      }
      
      dragRef.current = null;
    }
    
    if (resizeRef.current?.isResizing) {
      const block = availability.find(b => b.id === resizeRef.current!.blockId);
      if (block) {
        // Debounced save to database
        setTimeout(() => {
          updateMutation.mutate(block);
        }, 500);
      }
      resizeRef.current = null;
    }
  };

  // Handle block click/double-click
  const handleBlockClick = (block: LocationAvailability, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isMultiSelectMode && e.shiftKey) {
      setSelectedLocations(prev => 
        prev.includes(block.id) 
          ? prev.filter(id => id !== block.id)
          : [...prev, block.id]
      );
      return;
    }
    
    // Double-click to edit
    if (e.detail === 2) {
      setEditingBlock(block);
      setIsDialogOpen(true);
    }
  };

  // Handle resize
  const handleResizeStart = (e: React.MouseEvent, blockId: number, edge: 'top' | 'bottom') => {
    e.stopPropagation();
    const block = availability.find(b => b.id === blockId);
    if (!block) return;
    
    resizeRef.current = {
      isResizing: true,
      blockId,
      edge,
      originalStartTime: block.startTime,
      originalEndTime: block.endTime,
      initialMouseY: e.clientY - e.currentTarget.getBoundingClientRect().top,
    };
  };

  // Get availability blocks for a specific location and date
  const getAvailabilityForLocationAndDate = (locationId: number, date: string) => {
    return availability.filter(a => 
      a.locationId === locationId && 
      a.date === format(parseISO(date), 'yyyy-MM-dd')
    );
  };

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && !isMultiSelectMode) {
        setIsMultiSelectMode(true);
      }
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLocations.length > 0) {
        if (confirm(`Are you sure you want to delete ${selectedLocations.length} availability block(s)?`)) {
          bulkDeleteMutation.mutate(selectedLocations);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.shiftKey && isMultiSelectMode) {
        setIsMultiSelectMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isMultiSelectMode, selectedLocations, bulkDeleteMutation]);

  // Handle edit form submission
  const handleEditSubmit = () => {
    if (!editingBlock) return;
    
    updateMutation.mutate(editingBlock, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setEditingBlock(null);
        toast({ title: "Availability updated successfully" });
      },
    });
  };

  // Handle delete
  const handleDelete = () => {
    if (!editingBlock) return;
    
    deleteMutation.mutate(editingBlock.id, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setEditingBlock(null);
        toast({ title: "Availability deleted successfully" });
      },
    });
  };

  const timezone = scheduleSettings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Calendar
          </Button>
          <h1 className="text-2xl font-bold">Location Availability</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={timeIncrement.toString()} onValueChange={(value) => setTimeIncrement(Number(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 min</SelectItem>
              <SelectItem value="30">30 min</SelectItem>
              <SelectItem value="60">60 min</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button variant="outline" onClick={goToToday}>
            <Calendar className="mr-2 h-4 w-4" />
            Today
          </Button>
          <Button variant="outline" onClick={goToNextWeek}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-lg font-semibold">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </div>
        
        {timezone && (
          <div className="text-sm text-gray-600">
            {timezone}
          </div>
        )}
      </div>

      {/* Multi-select indicator */}
      {isMultiSelectMode && (
        <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
          <span className="text-sm text-blue-800">
            Multi-select mode - Hold Shift and click blocks to select
          </span>
          {selectedLocations.length > 0 && (
            <span className="text-sm text-blue-800">
              {selectedLocations.length} selected - Press Delete to remove
            </span>
          )}
        </div>
      )}

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-8 bg-gray-50">
          <div className="p-3 border-r font-medium">Location</div>
          {weekDays.map((date, index) => (
            <div key={index} className="p-3 border-r last:border-r-0 font-medium text-center">
              <div>{format(date, 'EEE')}</div>
              <div className="text-sm text-gray-600">{format(date, 'MMM d')}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-8">
          {/* Time Labels Column */}
          <div className="border-r">
            <div className="relative" style={{ height: `${TOTAL_MINUTES}px` }}>
              {timeLabels.map((time, index) => (
                <div
                  key={index}
                  className="absolute text-xs text-gray-500 -translate-y-2"
                  style={{ top: `${(timeToMinutes(time) - START_MINUTES)}px` }}
                >
                  {formatTime(time)}
                </div>
              ))}
            </div>
          </div>

          {/* Location Columns */}
          {weekDays.map((date, dayIndex) => (
            <div key={dayIndex} className="border-r last:border-r-0">
              {locations.map((location, locationIndex) => (
                <div
                  key={`${dayIndex}-${locationIndex}`}
                  className={`relative border-b ${isMultiSelectMode ? 'cursor-pointer' : 'cursor-crosshair'}`}
                  style={{ height: `${TOTAL_MINUTES}px` }}
                  onMouseDown={(e) => handleMouseDown(e, location.id, date.toISOString())}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                >
                  {/* Working hours background */}
                  {scheduleSettings?.workStartTime && scheduleSettings?.workEndTime && (
                    <div
                      className="absolute bg-blue-50 border-l-2 border-blue-200"
                      style={{
                        top: `${timeToMinutes(scheduleSettings.workStartTime) - START_MINUTES}px`,
                        height: `${timeToMinutes(scheduleSettings.workEndTime) - timeToMinutes(scheduleSettings.workStartTime)}px`,
                        left: 0,
                        right: 0,
                      }}
                    />
                  )}

                  {/* Grid lines */}
                  {Array.from({ length: Math.floor(TOTAL_MINUTES / 60) }, (_, i) => (
                    <div
                      key={i}
                      className="absolute border-t border-gray-200"
                      style={{ top: `${i * 60}px`, left: 0, right: 0 }}
                    />
                  ))}

                  {/* Availability blocks */}
                  {getAvailabilityForLocationAndDate(location.id, date.toISOString()).map((block) => (
                    <div
                      key={block.id}
                      className={`absolute left-1 right-1 rounded text-xs text-white cursor-pointer transition-opacity duration-200 ${
                        block.type === 'unavailable' ? 'bg-red-500' : 'bg-blue-500'
                      } ${selectedLocations.includes(block.id) ? 'ring-2 ring-yellow-400' : ''}`}
                      style={{
                        top: `${timeToMinutes(block.startTime) - START_MINUTES}px`,
                        height: `${timeToMinutes(block.endTime) - timeToMinutes(block.startTime)}px`,
                      }}
                      onClick={(e) => handleBlockClick(block, e)}
                    >
                      {/* Resize handles */}
                      <div
                        className="absolute top-0 left-0 right-0 h-2 cursor-n-resize hover:bg-black hover:bg-opacity-20"
                        onMouseDown={(e) => handleResizeStart(e, block.id, 'top')}
                      />
                      <div
                        className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-black hover:bg-opacity-20"
                        onMouseDown={(e) => handleResizeStart(e, block.id, 'bottom')}
                      />
                      
                      <div className="p-1 text-center">
                        <div className="font-medium">
                          {block.type === 'unavailable' ? 'Unavailable' : 'Preferred'}
                        </div>
                        <div className="text-xs opacity-90">
                          {formatTime(block.startTime)} - {formatTime(block.endTime)}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Location label */}
                  {dayIndex === 0 && (
                    <div className="absolute left-2 top-2 text-sm font-medium bg-white px-2 py-1 rounded shadow">
                      {location.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Location Availability</DialogTitle>
          </DialogHeader>
          
          {editingBlock && (
            <div className="space-y-4">
              <div>
                <Label>Availability Type</Label>
                <RadioGroup
                  value={editingBlock.type}
                  onValueChange={(value: 'unavailable' | 'preferred') =>
                    setEditingBlock({ ...editingBlock, type: value })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unavailable" id="unavailable" />
                    <Label htmlFor="unavailable">Unavailable</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="preferred" id="preferred" />
                    <Label htmlFor="preferred">Preferred</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={editingBlock.notes || ''}
                  onChange={(e) => setEditingBlock({ ...editingBlock, notes: e.target.value })}
                  placeholder="Add any notes about this availability..."
                  rows={3}
                />
              </div>

              <div className="flex justify-between">
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleEditSubmit}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}