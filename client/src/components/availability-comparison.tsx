import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Calendar, Users, Trash2, ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import DailyAvailabilityView from "./daily-availability-view";

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
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDateForDaily, setSelectedDateForDaily] = useState<Date | null>(null);
  const [timeIncrement, setTimeIncrement] = useState(30); // minutes
  const [editingItem, setEditingItem] = useState<any>(null);

  // Get show settings for timezone and week start
  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Get week dates based on configured week start day
  const getWeekDates = (date: Date, startDay: string = "sunday") => {
    const week = [];
    const startOfWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const currentDay = startOfWeek.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const weekStartMap: { [key: string]: number } = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, 
      thursday: 4, friday: 5, saturday: 6
    };
    
    const targetStartDay = weekStartMap[startDay.toLowerCase()] || 0;
    const daysToSubtract = (currentDay - targetStartDay + 7) % 7;
    
    startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    
    return week;
  };

  // Get timezone from settings
  const scheduleSettings = (showSettings as any)?.scheduleSettings || {};
  const timezone = scheduleSettings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const weekStartDay = scheduleSettings.weekStartDay || "sunday";

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

  // Generate week dates
  const weekDates = getWeekDates(currentWeek, weekStartDay);

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

  // Get availability for a specific contact and date
  const getContactAvailabilityForDate = (contactId: number, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return (allAvailability as ProjectAvailability[]).filter(
      (item: ProjectAvailability) => item.contactId === contactId && item.date === dateStr
    );
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

  // Handle block click to open daily view
  const handleBlockClick = (date: Date) => {
    setSelectedDateForDaily(date);
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
                <h1 className="text-xl font-semibold">Team Availability Overview</h1>
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
              Compare availability across all team members. Click blocks in weekly view for detailed daily view.
            </p>
          </div>

          {/* Navigation and Controls */}
          <div className="flex items-center justify-between gap-4 border-b pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Button onClick={goToPreviousWeek} variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button onClick={goToToday} variant="outline" size="sm">
                Today
              </Button>
              <Button onClick={goToNextWeek} variant="outline" size="sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="ml-4 text-sm font-medium">
                {weekDates[0]?.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {weekDates[6]?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
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

                {/* Calendar Grid */}
                <div className="flex-1 overflow-auto">
                  <div className="relative">
                    {/* Time Header */}
                    <div className="sticky top-0 bg-white border-b z-10">
                      <div className="flex">
                        {weekDates.map((date: Date, dayIndex: number) => (
                          <div key={dayIndex} className="flex-1 min-w-0">
                            <div className="p-2 text-center border-r">
                              <div className="font-medium">
                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                              </div>
                              <div className="text-sm text-gray-500">
                                {date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Contact Rows */}
                    <div className="space-y-1">
                      {contacts.map((contact: any) => (
                        <div key={contact.id} className="flex border-b">
                          {weekDates.map((date: Date, dayIndex: number) => {
                            const dayAvailability = getContactAvailabilityForDate(contact.id, date);
                            
                            return (
                              <div key={dayIndex} className="flex-1 h-16 border-r relative bg-white">
                                {dayAvailability.map((item: ProjectAvailability) => {
                                  const startMinutes = timeToMinutes(item.startTime);
                                  const endMinutes = timeToMinutes(item.endTime);
                                  const startPos = minutesToPosition(startMinutes);
                                  const width = endMinutes - startMinutes;

                                  return (
                                    <div
                                      key={item.id}
                                      className={`absolute cursor-pointer rounded text-xs px-2 py-1 text-white ${
                                        item.availabilityType === 'unavailable'
                                          ? 'bg-red-500 hover:bg-red-600'
                                          : 'bg-blue-500 hover:bg-blue-600'
                                      }`}
                                      style={{
                                        left: `${(startPos / TOTAL_MINUTES) * 100}%`,
                                        width: `${(width / TOTAL_MINUTES) * 100}%`,
                                        height: '36px',
                                        minWidth: '20px',
                                      }}
                                      onClick={() => {
                                        handleBlockClick(date);
                                      }}
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
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Daily Availability View */}
          {selectedDateForDaily && (
            <DailyAvailabilityView
              projectId={projectId}
              selectedDate={selectedDateForDaily}
              isOpen={!!selectedDateForDaily}
              onClose={() => setSelectedDateForDaily(null)}
            />
          )}

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