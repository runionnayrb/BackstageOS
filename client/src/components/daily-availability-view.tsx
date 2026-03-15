import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Trash2, ArrowLeft } from "lucide-react";
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

interface DailyAvailabilityViewProps {
  projectId: number;
  selectedDate: Date;
  isOpen: boolean;
  onClose: () => void;
}

const START_MINUTES = 8 * 60; // 8:00 AM in minutes
const END_MINUTES = 24 * 60; // Midnight in minutes
const TOTAL_MINUTES = END_MINUTES - START_MINUTES; // 16 hours

export default function DailyAvailabilityView({
  projectId,
  selectedDate,
  isOpen,
  onClose,
}: DailyAvailabilityViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [timeIncrement, setTimeIncrement] = useState(30); // minutes
  const [editingItem, setEditingItem] = useState<any>(null);

  // Get show settings for timezone
  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
    enabled: isOpen,
  });

  // Get timezone from settings
  const scheduleSettings = (showSettings as any)?.scheduleSettings || {};
  const timezone = scheduleSettings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Fetch all project availability
  const { data: allAvailability = [], isLoading } = useQuery<ProjectAvailability[]>({
    queryKey: [`/api/projects/${projectId}/availability`],
    enabled: isOpen,
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

  // Fetch schedule events to show assignments
  const { data: scheduleEvents = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/schedule-events`],
    enabled: isOpen,
  });

  // Get schedule events for a specific contact and the selected date
  const getContactScheduleEventsForDate = (contactId: number) => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    return (scheduleEvents as any[]).filter((event: any) => {
      if (event.date !== dateStr) return false;
      return event.participants?.some((p: any) => (p.contactId === contactId) || (p.id === contactId));
    });
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

  // Generate time labels
  const generateTimeLabels = () => {
    const labels = [];
    for (let minutes = START_MINUTES; minutes < END_MINUTES; minutes += timeIncrement) {
      labels.push({
        minutes,
        label: formatTime(minutes),
        position: minutesToPosition(minutes),
      });
    }
    return labels;
  };

  const timeLabels = generateTimeLabels();

  // Get availability for a specific contact and the selected date
  const getContactAvailabilityForDate = (contactId: number) => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    return (allAvailability as ProjectAvailability[]).filter(
      (item: ProjectAvailability) => item.contactId === contactId && item.date === dateStr
    );
  };

  // Mutations for CRUD operations
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
      toast({ title: "Availability updated successfully" });
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
      const item = (allAvailability as ProjectAvailability[]).find((a: ProjectAvailability) => a.id === id);
      if (!item) throw new Error("Item not found");
      
      const response = await fetch(`/api/projects/${projectId}/contacts/${item.contactId}/availability/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete availability");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/availability`] });
      toast({ title: "Availability deleted successfully" });
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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Availability - {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </DialogTitle>
          <DialogDescription>
            Detailed view of team availability for the selected day. Click on blocks to edit.
          </DialogDescription>
        </DialogHeader>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4 border-b pb-4">
          <Button onClick={onClose} variant="outline" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Weekly View
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              {timezone}
            </p>
          </div>

          <div className="flex items-center gap-2">
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

        {/* Main Content */}
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
              {/* Time Labels */}
              <div className="w-20 border-r bg-gray-50">
                <div className="h-12 border-b"></div> {/* Header spacer */}
                <div className="relative" style={{ height: `${TOTAL_MINUTES}px` }}>
                  {timeLabels.map((timeLabel) => (
                    <div
                      key={timeLabel.minutes}
                      className="absolute text-xs text-gray-500 pr-2 text-right w-full"
                      style={{
                        top: `${timeLabel.position}px`,
                        transform: 'translateY(-50%)',
                      }}
                    >
                      {timeIncrement >= 60 || timeLabel.minutes % 60 === 0 ? timeLabel.label : ''}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Columns */}
              <div className="flex-1 overflow-auto">
                <div className="flex">
                  {contacts.map((contact: any) => {
                    const contactAvailability = getContactAvailabilityForDate(contact.id);
                    
                    return (
                      <div key={contact.id} className="flex-1 min-w-48 border-r">
                        {/* Contact Header */}
                        <div className="h-12 p-2 border-b bg-gray-50 text-center">
                          <div className="text-sm font-medium truncate">
                            {contact.firstName} {contact.lastName}
                          </div>
                        </div>

                        {/* Availability Column */}
                        <div className="relative" style={{ height: `${TOTAL_MINUTES}px` }}>
                          {/* Time Grid Background */}
                          {timeLabels.map((timeLabel) => (
                            <div
                              key={timeLabel.minutes}
                              className="absolute w-full border-b border-gray-100"
                              style={{
                                top: `${timeLabel.position}px`,
                                height: '1px',
                              }}
                            />
                          ))}

                          {/* Availability Blocks */}
                          {contactAvailability.map((item: ProjectAvailability) => {
                            const startMinutes = timeToMinutes(item.startTime);
                            const endMinutes = timeToMinutes(item.endTime);
                            const startPos = minutesToPosition(startMinutes);
                            const duration = endMinutes - startMinutes;

                            return (
                              <div
                                key={item.id}
                                className={`absolute left-1 right-1 cursor-pointer rounded text-xs px-2 py-1 text-white ${
                                  item.availabilityType === 'unavailable'
                                    ? 'bg-red-500 hover:bg-red-600'
                                    : 'bg-blue-500 hover:bg-blue-600'
                                }`}
                                style={{
                                  top: `${startPos}px`,
                                  height: `${duration}px`,
                                  minHeight: '20px',
                                }}
                                onClick={() => setEditingItem(item)}
                                title={`${item.availabilityType === 'unavailable' ? 'Unavailable' : 'Preferred'}: ${formatTime(startMinutes)} - ${formatTime(endMinutes)}${item.notes ? `\n${item.notes}` : ''}`}
                              >
                                <div className="font-medium">
                                  {item.availabilityType === 'unavailable' ? 'Unavailable' : 'Preferred'}
                                </div>
                                <div className="text-xs opacity-90">
                                  {formatTime(startMinutes)} - {formatTime(endMinutes)}
                                </div>
                                {item.notes && (
                                  <div className="text-xs opacity-75 mt-1 truncate">
                                    {item.notes}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Schedule Assignments */}
                          {getContactScheduleEventsForDate(contact.id).map((event: any) => {
                            const startMinutes = timeToMinutes(event.startTime);
                            const endMinutes = timeToMinutes(event.endTime);
                            const startPos = minutesToPosition(startMinutes);
                            const duration = endMinutes - startMinutes;

                            return (
                              <div
                                key={`event-${event.id}`}
                                className="absolute left-1 right-1 rounded text-xs px-2 py-1 text-white bg-green-600 border border-green-700 shadow-sm z-10 opacity-90"
                                style={{
                                  top: `${startPos}px`,
                                  height: `${duration}px`,
                                  minHeight: '24px',
                                }}
                                title={`Scheduled: ${event.title}\n${formatTime(startMinutes)} - ${formatTime(endMinutes)}`}
                              >
                                <div className="font-bold truncate">{event.title}</div>
                                <div className="text-[10px] opacity-90">
                                  {formatTime(startMinutes)} - {formatTime(endMinutes)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
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
      </DialogContent>
    </Dialog>
  );
}