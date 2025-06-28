import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Plus, Trash2, Edit3 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  availabilityType: 'available' | 'unavailable' | 'preferred';
  notes?: string;
}

interface AvailabilityEditorProps {
  contact: Contact;
}

export function AvailabilityEditor({ contact }: AvailabilityEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [draggedItem, setDraggedItem] = useState<ContactAvailability | null>(null);
  const [isResizing, setIsResizing] = useState<{ id: number; edge: 'start' | 'end' } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ContactAvailability | null>(null);
  
  const [newAvailability, setNewAvailability] = useState({
    date: selectedDate,
    startTime: "09:00",
    endTime: "17:00",
    availabilityType: "available" as const,
    notes: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const timelineRef = useRef<HTMLDivElement>(null);

  // Fetch availability data
  const { data: availability = [], isLoading } = useQuery({
    queryKey: [`/api/projects/${contact.projectId}/contacts/${contact.id}/availability`],
    enabled: isOpen,
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
      setShowAddForm(false);
      setNewAvailability({
        date: selectedDate,
        startTime: "09:00",
        endTime: "17:00",
        availabilityType: "available",
        notes: ""
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

  // Filter availability for selected date
  const dayAvailability = (availability as ContactAvailability[]).filter((item: ContactAvailability) => item.date === selectedDate);

  // Time conversion utilities
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
    // 24 hours = 1440 minutes, timeline height = 1440px (1px per minute)
    return minutes;
  };

  const positionToMinutes = (position: number): number => {
    return Math.max(0, Math.min(1440, Math.round(position)));
  };

  // Handle drag and drop
  const handleMouseDown = useCallback((e: React.MouseEvent, item: ContactAvailability, action: 'move' | 'resize-start' | 'resize-end') => {
    e.preventDefault();
    
    if (action === 'move') {
      setDraggedItem(item);
    } else if (action === 'resize-start') {
      setIsResizing({ id: item.id, edge: 'start' });
    } else if (action === 'resize-end') {
      setIsResizing({ id: item.id, edge: 'end' });
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const minutes = positionToMinutes(y);
      
      if (draggedItem && action === 'move') {
        const duration = timeToMinutes(item.endTime) - timeToMinutes(item.startTime);
        const newStartMinutes = Math.max(0, Math.min(1440 - duration, minutes));
        const newEndMinutes = newStartMinutes + duration;
        
        updateMutation.mutate({
          id: item.id,
          data: {
            startTime: minutesToTime(newStartMinutes),
            endTime: minutesToTime(newEndMinutes)
          }
        });
      } else if (isResizing) {
        const startMinutes = timeToMinutes(item.startTime);
        const endMinutes = timeToMinutes(item.endTime);
        
        if (isResizing.edge === 'start') {
          const newStartMinutes = Math.max(0, Math.min(endMinutes - 15, minutes)); // Minimum 15 minutes
          updateMutation.mutate({
            id: item.id,
            data: { startTime: minutesToTime(newStartMinutes) }
          });
        } else if (isResizing.edge === 'end') {
          const newEndMinutes = Math.max(startMinutes + 15, Math.min(1440, minutes)); // Minimum 15 minutes
          updateMutation.mutate({
            id: item.id,
            data: { endTime: minutesToTime(newEndMinutes) }
          });
        }
      }
    };

    const handleMouseUp = () => {
      setDraggedItem(null);
      setIsResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [draggedItem, isResizing, updateMutation]);

  // Generate time labels for timeline
  const timeLabels = [];
  for (let hour = 0; hour < 24; hour++) {
    timeLabels.push({
      hour,
      label: `${hour.toString().padStart(2, '0')}:00`,
      position: hour * 60 // minutes from midnight
    });
  }

  const getAvailabilityColor = (type: string) => {
    switch (type) {
      case 'available': return 'bg-green-500 hover:bg-green-600';
      case 'unavailable': return 'bg-red-500 hover:bg-red-600';
      case 'preferred': return 'bg-blue-500 hover:bg-blue-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const handleSubmit = () => {
    createMutation.mutate(newAvailability);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Calendar className="h-4 w-4 mr-2" />
          Manage Availability
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            Availability - {contact.firstName} {contact.lastName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Date selector and controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button 
                onClick={() => setShowAddForm(true)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Availability
              </Button>
            </div>
          </div>

          {/* Add/Edit form */}
          {showAddForm && (
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold">Add New Availability</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newAvailability.startTime}
                    onChange={(e) => setNewAvailability(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newAvailability.endTime}
                    onChange={(e) => setNewAvailability(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="availabilityType">Type</Label>
                <Select 
                  value={newAvailability.availabilityType} 
                  onValueChange={(value) => setNewAvailability(prev => ({ ...prev, availabilityType: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                    <SelectItem value="preferred">Preferred</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newAvailability.notes}
                  onChange={(e) => setNewAvailability(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="flex border rounded-lg overflow-hidden bg-gray-50" style={{ height: '500px' }}>
            {/* Time labels */}
            <div className="w-16 bg-white border-r">
              <div className="relative" style={{ height: '1440px' }}>
                {timeLabels.map(({ hour, label, position }) => (
                  <div
                    key={hour}
                    className="absolute text-xs text-gray-600 -translate-y-1/2"
                    style={{ top: `${position}px` }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline area */}
            <div className="flex-1 relative overflow-auto">
              <div 
                ref={timelineRef}
                className="relative bg-white"
                style={{ height: '1440px' }}
              >
                {/* Hour grid lines */}
                {timeLabels.map(({ hour, position }) => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-gray-200"
                    style={{ top: `${position}px` }}
                  />
                ))}

                {/* Availability blocks */}
                {dayAvailability.map((item: ContactAvailability) => {
                  const startMinutes = timeToMinutes(item.startTime);
                  const endMinutes = timeToMinutes(item.endTime);
                  const duration = endMinutes - startMinutes;
                  
                  return (
                    <div
                      key={item.id}
                      className={`absolute left-2 right-2 rounded cursor-move shadow-sm border-2 border-white ${getAvailabilityColor(item.availabilityType)}`}
                      style={{
                        top: `${startMinutes}px`,
                        height: `${duration}px`
                      }}
                      onMouseDown={(e) => handleMouseDown(e, item, 'move')}
                    >
                      {/* Resize handle - top */}
                      <div
                        className="absolute top-0 left-0 right-0 h-2 cursor-n-resize hover:bg-black hover:bg-opacity-20"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleMouseDown(e, item, 'resize-start');
                        }}
                      />
                      
                      {/* Content */}
                      <div className="p-2 text-white text-xs">
                        <div className="font-semibold">
                          {item.startTime} - {item.endTime}
                        </div>
                        <div className="capitalize">{item.availabilityType}</div>
                        {item.notes && (
                          <div className="mt-1 opacity-90">{item.notes}</div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="absolute top-1 right-1 opacity-0 hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-white hover:bg-black hover:bg-opacity-20"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(item.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {/* Resize handle - bottom */}
                      <div
                        className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-black hover:bg-opacity-20"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleMouseDown(e, item, 'resize-end');
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Unavailable</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Preferred</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}