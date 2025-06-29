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
                  <div className="relative">
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
                      {contacts.map((contact: any) => {
                        const contactAvailability = getContactAvailabilityForDate(contact.id);
                        
                        return (
                          <div key={contact.id} className="h-16 border-b relative bg-white" style={{ minWidth: `${TOTAL_MINUTES}px` }}>
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

                              return (
                                <div
                                  key={item.id}
                                  className={`absolute cursor-pointer rounded text-xs px-2 py-1 text-white top-2 bottom-2 ${
                                    item.availabilityType === 'unavailable'
                                      ? 'bg-red-500 hover:bg-red-600'
                                      : 'bg-blue-500 hover:bg-blue-600'
                                  }`}
                                  style={{
                                    left: `${startPos}px`,
                                    width: `${width}px`,
                                    minWidth: '20px',
                                  }}
                                  onClick={() => setEditingItem(item)}
                                  title={`${item.availabilityType === 'unavailable' ? 'Unavailable' : 'Preferred'}: ${formatTime(startMinutes)} - ${formatTime(endMinutes)}${item.notes ? `\n${item.notes}` : ''}`}
                                >
                                  <div className="font-medium truncate">
                                    {item.availabilityType === 'unavailable' ? 'Out' : 'Pref'}
                                  </div>
                                  <div className="text-xs opacity-90 truncate">
                                    {formatTime(startMinutes)}
                                  </div>
                                </div>
                              );
                            })}
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