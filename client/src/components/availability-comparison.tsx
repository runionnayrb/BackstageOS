import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Calendar, Users, Trash2 } from "lucide-react";
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
  isOpen: boolean;
  onClose: () => void;
}

const START_MINUTES = 8 * 60; // 8:00 AM in minutes
const END_MINUTES = 24 * 60; // Midnight in minutes
const TOTAL_MINUTES = END_MINUTES - START_MINUTES; // 16 hours

export default function AvailabilityComparison({
  projectId,
  isOpen,
  onClose,
}: AvailabilityComparisonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeIncrement, setTimeIncrement] = useState(30); // minutes
  const [editingItem, setEditingItem] = useState<any>(null);

  // Get show settings for timezone and week start
  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
    enabled: isOpen,
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
    
    const configuredStartDay = weekStartMap[startDay] || 0;
    
    let daysToSubtract = currentDay - configuredStartDay;
    if (daysToSubtract < 0) {
      daysToSubtract += 7;
    }
    
    startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract);
    
    for (let i = 0; i < 7; i++) {
      const weekDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i);
      week.push(weekDate);
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

  // Current display dates
  const weekDates = getWeekDates(currentWeek, weekStartDay);
  const displayDates = viewMode === 'weekly' ? weekDates : selectedDate ? [selectedDate] : weekDates.slice(0, 1);

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
    const today = new Date();
    setCurrentWeek(today);
    if (viewMode === 'daily') {
      setSelectedDate(today);
    }
  };

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

  // Convert minutes to height in calendar
  const minutesToHeight = (minutes: number) => {
    return minutes; // 1 pixel per minute
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

  // Get availability for a specific contact and date
  const getContactAvailabilityForDate = (contactId: number, date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return (allAvailability as ProjectAvailability[]).filter(
      (item: ProjectAvailability) => item.contactId === contactId && item.date === dateStr
    );
  };

  // Switch to daily view when clicking on a time block
  const handleBlockClick = (date: Date) => {
    if (viewMode === 'weekly') {
      setSelectedDate(date);
      setViewMode('daily');
    }
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
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Availability Overview
          </DialogTitle>
          <DialogDescription>
            Compare availability across all team members. Click blocks in weekly view for detailed daily view.
          </DialogDescription>
        </DialogHeader>

        {/* Navigation and Controls */}
        <div className="flex items-center justify-between gap-4 border-b pb-4">
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
          </div>

          <div className="text-center">
            <h3 className="font-medium">
              {viewMode === 'weekly' ? (
                `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              ) : (
                selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
              )}
            </h3>
            <p className="text-sm text-gray-500">
              {timezone}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(value: 'weekly' | 'daily') => setViewMode(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
              </SelectContent>
            </Select>
            
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
              {/* Contact Names Sidebar */}
              <div className="w-48 border-r bg-gray-50 overflow-y-auto">
                <div className="p-4">
                  <h4 className="font-medium text-sm text-gray-600 mb-3">
                    Team Members ({contacts.length})
                  </h4>
                  <div className="space-y-2">
                    {contacts.map((contact: any) => (
                      <div
                        key={contact.id}
                        className="p-2 text-sm bg-white rounded border"
                      >
                        {contact.firstName} {contact.lastName}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="flex-1 overflow-auto">
                <div className="relative">
                  {/* Time Header */}
                  <div className="sticky top-0 bg-white border-b z-10">
                    <div className="flex">
                      {displayDates.map((date, dayIndex) => (
                        <div key={dayIndex} className="flex-1 min-w-0">
                          <div className="p-2 text-center border-r">
                            <div className="font-medium">
                              {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                            <div className="text-sm text-gray-500">
                              {date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                            </div>
                          </div>
                          
                          {/* Time Grid Headers */}
                          <div className="flex text-xs text-gray-500 border-b">
                            {timeLabels.map((timeLabel, timeIndex) => (
                              <div
                                key={timeIndex}
                                className="flex-1 p-1 text-center border-r"
                                style={{ minWidth: `${timeIncrement}px` }}
                              >
                                {timeIncrement >= 60 || timeIndex % 2 === 0 ? timeLabel.label : ''}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contact Rows */}
                  <div className="space-y-1">
                    {contacts.map((contact: any) => (
                      <div key={contact.id} className="flex border-b">
                        {displayDates.map((date, dayIndex) => {
                          const dayAvailability = getContactAvailabilityForDate(contact.id, date);
                          
                          return (
                            <div key={dayIndex} className="flex-1 relative border-r" style={{ height: '48px' }}>
                              {/* Time Grid Background */}
                              <div className="absolute inset-0 flex">
                                {timeLabels.map((timeLabel, timeIndex) => (
                                  <div
                                    key={timeIndex}
                                    className="flex-1 border-r border-gray-100"
                                    style={{ minWidth: `${timeIncrement}px` }}
                                  />
                                ))}
                              </div>

                              {/* Availability Blocks */}
                              {dayAvailability.map((item: ProjectAvailability) => {
                                const startMinutes = timeToMinutes(item.startTime);
                                const endMinutes = timeToMinutes(item.endTime);
                                const startPos = minutesToPosition(startMinutes);
                                const duration = endMinutes - startMinutes;
                                const width = (duration / timeIncrement) * timeIncrement;

                                return (
                                  <div
                                    key={item.id}
                                    className={`absolute top-1 cursor-pointer rounded text-xs px-1 text-white ${
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
                                      if (viewMode === 'weekly') {
                                        handleBlockClick(date);
                                      } else {
                                        setEditingItem(item);
                                      }
                                    }}
                                    title={`${item.availabilityType === 'unavailable' ? 'Unavailable' : 'Preferred'}: ${formatTime(startMinutes)} - ${formatTime(endMinutes)}${item.notes ? `\n${item.notes}` : ''}`}
                                  >
                                    <div className="truncate">
                                      {item.availabilityType === 'unavailable' ? 'Unavail' : 'Pref'}
                                    </div>
                                    <div className="text-xs opacity-75">
                                      {formatTime(startMinutes).split(' ')[0]}
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