import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Users, Trash2, ArrowLeft } from "lucide-react";
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

  // Convert minutes to position from 8 AM
  const minutesToPosition = (minutes: number) => {
    return Math.max(0, minutes - START_MINUTES);
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
  const positionToMinutes = (position: number) => {
    // Convert pixel position to minutes (1 pixel = 1 minute in our timeline)
    return Math.round(position + START_MINUTES);
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
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/projects/${projectId}/contacts/${data.contactId}/availability/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update availability");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/availability`] });
      setEditingItem(null);
      setDraggedItem(null);
      setResizingItem(null);
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

  const handleSaveEdit = () => {
    if (!editingItem) return;
    
    updateMutation.mutate({
      id: editingItem.id,
      data: {
        contactId: editingItem.contactId,
        availabilityType: editingItem.availabilityType,
        notes: editingItem.notes,
      },
    });
  };

  const handleDelete = () => {
    if (!editingItem) return;
    deleteMutation.mutate(editingItem.id);
  };

  // Drag event handlers
  const handleMouseDown = (e: React.MouseEvent, contactId: number) => {
    if (e.button !== 0) return; // Only left click
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left; // Position relative to the contact row
    const y = e.clientY - rect.top;
    
    setIsDragging(true);
    setDragStart({ x, y, contactId });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

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
      
      const startMinutes = snapToIncrement(Math.max(START_MINUTES, positionToMinutes(leftX)));
      const endMinutes = snapToIncrement(Math.max(startMinutes + timeIncrement, Math.min(END_MINUTES, positionToMinutes(rightX))));
      
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
      
      const startMinutes = snapToIncrement(Math.max(START_MINUTES, positionToMinutes(leftX)));
      const endMinutes = snapToIncrement(Math.max(startMinutes + timeIncrement, Math.min(END_MINUTES, positionToMinutes(rightX))));
      
      setNewBlock({
        ...newBlock,
        startTime: formatTimeFromMinutes(startMinutes),
        endTime: formatTimeFromMinutes(endMinutes),
      });
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    if (newBlock && newBlock.startTime !== newBlock.endTime) {
      createMutation.mutate(newBlock);
    } else if (draggedItem) {
      updateMutation.mutate({
        id: draggedItem.id,
        data: {
          contactId: draggedItem.contactId,
          startTime: draggedItem.startTime,
          endTime: draggedItem.endTime,
          availabilityType: draggedItem.availabilityType,
          notes: draggedItem.notes,
          date: currentDate.toISOString().split('T')[0],
        },
      });
    } else if (resizingItem) {
      updateMutation.mutate({
        id: resizingItem.id,
        data: {
          contactId: resizingItem.contactId,
          startTime: resizingItem.startTime,
          endTime: resizingItem.endTime,
          availabilityType: resizingItem.availabilityType,
          notes: resizingItem.notes,
          date: currentDate.toISOString().split('T')[0],
        },
      });
    }
    
    setIsDragging(false);
    setDragStart(null);
    setNewBlock(null);
    setDraggedItem(null);
    setResizingItem(null);
    setResizeMode(null);
  };

  const handleBlockMouseDown = (e: React.MouseEvent, item: ProjectAvailability, mode?: 'move' | 'resize-top' | 'resize-bottom') => {
    e.stopPropagation();
    
    // Get position relative to the entire timeline container, not just the block
    const timelineContainer = e.currentTarget.closest('.relative') as HTMLElement;
    const rect = timelineContainer?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDragging(true);
    setDragStart({ x, y });
    
    if (mode === 'resize-top' || mode === 'resize-bottom') {
      setResizingItem({
        ...item,
        originalStartTime: item.startTime,
        originalEndTime: item.endTime,
      });
      setResizeMode(mode === 'resize-top' ? 'top' : 'bottom');
    } else {
      setDraggedItem({
        ...item,
        originalStartTime: item.startTime,
        originalEndTime: item.endTime,
      });
    }
    
    e.preventDefault();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="h-[calc(100vh-8rem)] flex flex-col">
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
              <div className="ml-4 text-sm font-medium">
                {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                {timezone}
              </p>
            </div>

            <div className="flex items-center gap-2">
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
          </div>

          {/* Calendar Content */}
          <div className="flex-1 flex overflow-hidden">
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
                    <span className="font-medium text-sm">Team Members</span>
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
                      <div className="flex" style={{ minWidth: `${TOTAL_MINUTES}px` }}>
                        {timeLabels.map((timeLabel) => (
                          <div
                            key={timeLabel.minutes}
                            className="border-r text-center py-2 text-xs text-gray-500"
                            style={{
                              width: `${timeIncrement}px`,
                              minWidth: `${timeIncrement}px`,
                            }}
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
                            className="h-16 border-b relative bg-white cursor-crosshair" 
                            style={{ minWidth: `${TOTAL_MINUTES}px` }}
                            onMouseDown={(e) => handleMouseDown(e, contact.id)}
                          >
                            {/* Time Grid Background */}
                            {timeLabels.map((timeLabel) => (
                              <div
                                key={timeLabel.minutes}
                                className="absolute border-r border-gray-100 h-full"
                                style={{
                                  left: `${timeLabel.position}px`,
                                  width: '1px',
                                }}
                              />
                            ))}

                            {/* Availability Blocks */}
                            {contactAvailability.map((item: ProjectAvailability) => {
                              const startMinutes = timeToMinutes(item.startTime);
                              const endMinutes = timeToMinutes(item.endTime);
                              const startPos = minutesToPosition(startMinutes);
                              const width = endMinutes - startMinutes;

                              // Check if this item is being dragged or resized
                              const isBeingDragged = draggedItem?.id === item.id;
                              const isBeingResized = resizingItem?.id === item.id;
                              const currentItem = isBeingDragged ? draggedItem : isBeingResized ? resizingItem : item;

                              const currentStartMinutes = timeToMinutes(currentItem.startTime);
                              const currentEndMinutes = timeToMinutes(currentItem.endTime);
                              const currentStartPos = minutesToPosition(currentStartMinutes);
                              const currentWidth = currentEndMinutes - currentStartMinutes;

                              return (
                                <div
                                  key={item.id}
                                  className={`absolute text-xs text-white top-2 bottom-2 rounded group ${
                                    currentItem.availabilityType === 'unavailable'
                                      ? 'bg-red-500 hover:bg-red-600'
                                      : 'bg-blue-500 hover:bg-blue-600'
                                  } ${(isBeingDragged || isBeingResized) ? 'opacity-80 z-20' : 'z-10'}`}
                                  style={{
                                    left: `${currentStartPos}px`,
                                    width: `${currentWidth}px`,
                                    minWidth: '20px',
                                  }}
                                  onMouseDown={(e) => handleBlockMouseDown(e, item, 'move')}
                                  onDoubleClick={() => setEditingItem(item)}
                                  title={`${currentItem.availabilityType === 'unavailable' ? 'Unavailable' : 'Preferred'}: ${formatTime(currentStartMinutes)} - ${formatTime(currentEndMinutes)}${currentItem.notes ? `\n${currentItem.notes}` : ''}`}
                                >
                                  {/* Left resize handle */}
                                  <div
                                    className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize bg-white opacity-0 group-hover:opacity-50"
                                    onMouseDown={(e) => handleBlockMouseDown(e, item, 'resize-top')}
                                  />
                                  
                                  {/* Content */}
                                  <div className="px-2 py-1 cursor-move h-full flex flex-col justify-center">
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
                        disabled={updateMutation.isPending}
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
      </div>
    </div>
  );
}