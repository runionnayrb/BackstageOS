import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Plus, Calendar, X, ChevronDown, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { formatTimeDisplay, parseScheduleSettings } from "@/lib/timeUtils";
import { isShowEvent, getEventTypeDisplayName, getEventTypeColor, ALL_EVENT_TYPES } from "@/lib/eventUtils";
import { filterEventsBySettings } from "@/lib/scheduleUtils";
import EventForm from "@/components/event-form";
import ScheduleFilter from "@/components/schedule-filter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface MonthlyScheduleViewProps {
  projectId: number;
  onDateClick: (date: Date) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  selectedContactIds: number[];
  onFilterChange: (contactIds: number[]) => void;
  selectedEventTypes: string[];
  onEventTypeFilterChange: (eventTypes: string[]) => void;
  selectedIndividualTypes: string[];
  onIndividualTypeFilterChange: (individualTypes: string[]) => void;
  timeIncrement: 15 | 30 | 60;
  setTimeIncrement: (increment: 15 | 30 | 60) => void;
  showAllDayEvents: boolean;
  setShowAllDayEvents: (show: boolean) => void;
  createEventDialog: boolean;
  setCreateEventDialog: (open: boolean) => void;
  onEventClick?: (event: ScheduleEvent) => void;
  viewMode: 'monthly' | 'weekly' | 'daily';
  setViewMode: (mode: 'monthly' | 'weekly' | 'daily') => void;
}

interface ScheduleEvent {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  location?: string;
  notes?: string;
  isAllDay: boolean;
  participants: {
    id: number;
    contactId: number;
    contactFirstName: string;
    contactLastName: string;
    isRequired: boolean;
    status: string;
  }[];
}

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  category: string;
  role?: string;
}

// Event type colors
const getEventColor = (type: string) => {
  switch (type) {
    case 'rehearsal': return 'bg-blue-500';
    case 'performance': return 'bg-red-500';
    case 'tech': return 'bg-purple-500';
    case 'meeting': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

const eventTypeColors = {
  rehearsal: 'bg-blue-500',
  performance: 'bg-red-500',
  tech: 'bg-yellow-500',
  meeting: 'bg-green-500',
  other: 'bg-gray-500',
};

export default function MonthlyScheduleView({
  projectId,
  onDateClick,
  currentDate,
  setCurrentDate,
  selectedContactIds,
  onFilterChange,
  selectedEventTypes,
  onEventTypeFilterChange,
  selectedIndividualTypes,
  onIndividualTypeFilterChange,
  timeIncrement,
  setTimeIncrement,
  showAllDayEvents,
  setShowAllDayEvents,
  createEventDialog,
  setCreateEventDialog,
  onEventClick,
  viewMode,
  setViewMode,
}: MonthlyScheduleViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createEventDialogData, setCreateEventDialogData] = useState<{
    isOpen: boolean;
    date?: string;
  }>({ isOpen: false });

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (createEventDialogData.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [createEventDialogData.isOpen]);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);

  // Get show settings
  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  const scheduleSettings = parseScheduleSettings((showSettings as any)?.scheduleSettings);
  const { timeFormat } = scheduleSettings;

  // Fetch schedule events
  const { data: events = [], isLoading } = useQuery<ScheduleEvent[]>({
    queryKey: [`/api/projects/${projectId}/schedule-events`],
  });

  // Fetch contacts for event assignment
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: [`/api/projects/${projectId}/contacts`],
  });

  // Fetch event types for the project
  const { data: eventTypes = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/event-types`],
    enabled: !!projectId,
  });

  // Filter events based on selected contact IDs and schedule filtering
  const filteredEvents = (() => {
    let eventsToFilter = events;
    
    // Apply schedule filtering based on enabled event types
    eventsToFilter = filterEventsBySettings(eventsToFilter, settings?.scheduleSettings, eventTypes);
    
    // Apply contact filtering
    if (selectedContactIds.length === 0) {
      // When no contacts are selected, show all events that passed the schedule filtering
      return eventsToFilter;
    } else {
      return eventsToFilter.filter(event => 
        event.participants.some(participant => 
          selectedContactIds.includes(participant.contactId)
        )
      );
    }
  })();

  // Generate calendar grid for the current month
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the beginning of the week that contains the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Generate 6 weeks (42 days) to cover all possible month layouts
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredEvents.filter(event => event.date === dateStr);
  };

  // Navigation functions
  const goToPreviousMonth = () => {
    const prevMonth = new Date(currentDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentDate(prevMonth);
  };

  const goToNextMonth = () => {
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentDate(nextMonth);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format month/year header
  const formatMonthYear = () => {
    return currentDate.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await fetch(`/api/projects/${projectId}/schedule-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });
      if (!response.ok) throw new Error("Failed to create event");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule-events`] });
      toast({ title: "Event created successfully" });
      setCreateEventDialogData({ isOpen: false });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to create event", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ eventId, eventData }: { eventId: number; eventData: any }) => {
      const response = await fetch(`/api/schedule-events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });
      if (!response.ok) throw new Error("Failed to update event");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule-events`] });
      setEditingEvent(null);
      toast({ title: "Event updated successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to update event",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const response = await fetch(`/api/schedule-events/${eventId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete event");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule-events`] });
      setEditingEvent(null);
      toast({ title: "Event deleted successfully" });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete event",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateEvent = (formData: any) => {
    createEventMutation.mutate(formData);
  };

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    setCreateEventDialogData({ 
      isOpen: true, 
      date: dateStr 
    });
  };

  // Handle new event dialog from parent
  useEffect(() => {
    if (createEventDialog) {
      setCreateEventDialogData({ isOpen: true });
      setCreateEventDialog(false);
    }
  }, [createEventDialog, setCreateEventDialog]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Removed individual header - using unified main page header */}



      {/* Calendar Grid */}
      <div className="bg-white">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-50">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="py-2 md:p-3 text-center">
              <div className="text-xs md:text-sm font-medium text-gray-500">{day}</div>
            </div>
          ))}
        </div>

        {/* Calendar body */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => {
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = date.toDateString() === new Date().toDateString();
            const dayEvents = getEventsForDate(date);

            return (
              <div
                key={index}
                className={`min-h-16 md:min-h-24 p-1 md:p-2 cursor-pointer transition-colors active:bg-gray-100 md:hover:bg-gray-50 ${
                  !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                } ${isToday ? 'bg-blue-50' : ''}`}
                onClick={() => handleDateClick(date)}
              >
                <div className={`text-sm md:text-base font-medium mb-1 text-center md:text-left ${
                  isToday ? 'text-white bg-red-500 rounded-full w-6 h-6 md:w-7 md:h-7 flex items-center justify-center mx-auto md:mx-0' : ''
                }`}>
                  {date.getDate()}
                </div>
                
                {/* Events for this day */}
                <div className="space-y-0.5 md:space-y-1">
                  {dayEvents
                    .filter(event => showAllDayEvents || !event.isAllDay)
                    .slice(0, 2) // Show fewer events on mobile for cleaner look
                    .map((event) => (
                    <div
                      key={event.id}
                      className={`text-xs px-1 py-0.5 rounded text-white truncate cursor-pointer transition-transform active:scale-95 ${
                        eventTypeColors[event.type as keyof typeof eventTypeColors]
                      }`}
                      title={`${event.title} (${event.isAllDay ? 'All Day' : `${formatTimeDisplay(event.startTime, timeFormat)} - ${formatTimeDisplay(event.endTime, timeFormat)}`})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEventClick) {
                          onEventClick(event);
                        } else {
                          setEditingEvent(event);
                        }
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        const touchTimer = setTimeout(() => {
                          // Haptic feedback if available
                          if ('vibrate' in navigator) {
                            navigator.vibrate(50);
                          }
                          setEditingEvent(event);
                        }, 500);
                        
                        const currentTarget = e.currentTarget;
                        const handleTouchEnd = () => {
                          clearTimeout(touchTimer);
                          if (currentTarget) {
                            currentTarget.removeEventListener('touchend', handleTouchEnd);
                            currentTarget.removeEventListener('touchmove', handleTouchEnd);
                          }
                        };
                        
                        if (currentTarget) {
                          currentTarget.addEventListener('touchend', handleTouchEnd);
                          currentTarget.addEventListener('touchmove', handleTouchEnd);
                        }
                      }}
                    >
                      <span className="hidden md:inline">
                        {event.isAllDay ? event.title : `${formatTimeDisplay(event.startTime, timeFormat)} ${event.title}`}
                      </span>
                      <span className="md:hidden">
                        {event.title}
                      </span>
                    </div>
                  ))}
                  {dayEvents.filter(event => showAllDayEvents || !event.isAllDay).length > 2 && (
                    <div className="text-xs text-gray-500 px-1 text-center md:text-left">
                      +{dayEvents.filter(event => showAllDayEvents || !event.isAllDay).length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Event Dialog - Full Screen Sheet */}
      {editingEvent && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setEditingEvent(null)}
            style={{ touchAction: 'none' }}
          />
          
          {/* Full Screen Sheet */}
          <div 
            className="fixed left-0 right-0 z-50 bg-white flex flex-col"
            style={{ 
              top: '60px', // Just below the BackstageOS header
              bottom: '80px', // Above mobile navigation (typically 64-80px)
              height: 'auto',
              maxHeight: 'calc(100vh - 140px)' // Header + mobile nav space
            }}
            onTouchMove={(e) => {
              // Prevent background scrolling when touching the sheet
              e.stopPropagation();
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <Button 
                variant="ghost" 
                onClick={() => setEditingEvent(null)}
                className="text-gray-500 hover:text-gray-700 p-1 h-auto"
              >
                <X className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold text-black">
                Edit Event
              </h1>
              <div className="w-9" /> {/* Spacer for center alignment */}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
              <EventForm
                projectId={projectId}
                contacts={contacts}
                eventTypes={eventTypes}
                initialDate={editingEvent.date}
                onSubmit={(data) => updateEventMutation.mutate({ eventId: editingEvent.id, eventData: data })}
                onCancel={() => setEditingEvent(null)}
                showButtons={false}
                initialValues={{
                  title: editingEvent.title,
                  description: editingEvent.description || '',
                  type: editingEvent.type,
                  startDate: editingEvent.date,
                  endDate: editingEvent.date,
                  startTime: editingEvent.startTime,
                  endTime: editingEvent.endTime,
                  location: editingEvent.location || '',
                  notes: editingEvent.notes || '',
                  isAllDay: editingEvent.isAllDay,
                  participantIds: editingEvent.participants.map(p => p.contactId),
                }}
              />
            </div>
            
            {/* Sticky Footer with Buttons */}
            <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0 mt-auto">
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingEvent(null)}
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  form="event-form"
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2"
                  disabled={updateEventMutation.isPending}
                >
                  {updateEventMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create Event Bottom Sheet */}
      {createEventDialogData.isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setCreateEventDialogData({ isOpen: false })}
            style={{ touchAction: 'none' }}
          />
          
          {/* Bottom Sheet */}
          <div 
            className="fixed left-0 right-0 z-50 bg-white flex flex-col"
            style={{ 
              top: '60px', // Just below the BackstageOS header
              bottom: '80px', // Above mobile navigation (typically 64-80px)
              height: 'auto',
              maxHeight: 'calc(100vh - 140px)' // Header + mobile nav space
            }}
            onTouchMove={(e) => {
              // Prevent background scrolling when touching the sheet
              e.stopPropagation();
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <Button 
                variant="ghost" 
                onClick={() => setCreateEventDialogData({ isOpen: false })}
                className="text-gray-500 hover:text-gray-700 p-1 h-auto"
              >
                <X className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold text-black">
                New Event
              </h1>
              <div className="w-9" /> {/* Spacer for center alignment */}
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
              <EventForm
                projectId={projectId}
                contacts={contacts}
                eventTypes={eventTypes}
                initialDate={createEventDialogData.date}
                onSubmit={handleCreateEvent}
                onCancel={() => setCreateEventDialogData({ isOpen: false })}
                timeFormat={timeFormat}
                showButtons={false}
              />
            </div>
            
            {/* Sticky Footer with Buttons */}
            <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0 mt-auto">
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCreateEventDialogData({ isOpen: false })}
                  className="px-4 py-2"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  form="event-form"
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2"
                >
                  Create Event
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Event form component is now imported from external file
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            required
            className="w-full"
          />
        </div>
        <div className="min-w-0">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            disabled={formData.isAllDay}
            className="w-full"
          />
        </div>
        <div className="min-w-0">
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            disabled={formData.isAllDay}
            className="w-full"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isAllDay"
          checked={formData.isAllDay}
          onCheckedChange={(checked) => setFormData({ ...formData, isAllDay: !!checked })}
        />
        <Label htmlFor="isAllDay">All Day Event</Label>
      </div>

      <div>
        <Label>Location</Label>
        <LocationSelect
          projectId={projectId}
          value={formData.location}
          onValueChange={(value) => setFormData({ ...formData, location: value })}
          eventDate={formData.date}
          startTime={formData.startTime}
          endTime={formData.endTime}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div>
        <Label>Participants</Label>
        <div className="space-y-3 max-h-80 overflow-y-auto border rounded-md p-3">
          {contacts.length === 0 ? (
            <p className="text-sm text-gray-500">No contacts available</p>
          ) : (
            (() => {
              // Group contacts by category
              const contactsByCategory = contacts.reduce((acc, contact) => {
                const category = contact.category || 'Other';
                if (!acc[category]) {
                  acc[category] = [];
                }
                acc[category].push(contact);
                return acc;
              }, {} as Record<string, typeof contacts>);

              return Object.entries(contactsByCategory).map(([category, categoryContacts]) => {
                const categoryContactIds = categoryContacts.map(c => c.id);
                const allCategorySelected = categoryContactIds.every(id => formData.participantIds.includes(id));
                const someCategorySelected = categoryContactIds.some(id => formData.participantIds.includes(id));

                return (
                  <div key={category} className="space-y-2">
                    {/* Category header with select all checkbox */}
                    <div className="flex items-center space-x-2 font-medium text-gray-700 border-b border-gray-200 pb-1">
                      <Checkbox
                        id={`category-${category}`}
                        checked={allCategorySelected}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = someCategorySelected && !allCategorySelected;
                          }
                        }}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            // Add all category contacts that aren't already selected
                            const newParticipants = [
                              ...formData.participantIds,
                              ...categoryContactIds.filter(id => !formData.participantIds.includes(id))
                            ];
                            setFormData({
                              ...formData,
                              participantIds: newParticipants,
                            });
                          } else {
                            // Remove all category contacts
                            setFormData({
                              ...formData,
                              participantIds: formData.participantIds.filter(id => !categoryContactIds.includes(id)),
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`category-${category}`} className="text-sm font-semibold">
                        {category.replace(/_/g, ' ').toUpperCase()}
                      </Label>
                    </div>

                    {/* Individual contacts in category */}
                    <div className="space-y-1 ml-6">
                      {categoryContacts.map(contact => (
                        <div key={contact.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`contact-${contact.id}`}
                            checked={formData.participantIds.includes(contact.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  participantIds: [...formData.participantIds, contact.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  participantIds: formData.participantIds.filter(id => id !== contact.id),
                                });
                              }
                            }}
                          />
                          <Label htmlFor={`contact-${contact.id}`} className="text-sm">
                            {contact.firstName} {contact.lastName}
                            {contact.role && (
                              <span className="text-gray-500 ml-1">({contact.role})</span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>
      </div>

      {showButtons && (
        <div className="flex justify-end space-x-2 pb-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Create Event
          </Button>
        </div>
      )}
    </form>
  );
}

// Edit Event Form component
function EditEventForm({ 
  event, 
  contacts,
  eventTypes,
  projectId,
  onSubmit, 
  onCancel
}: {
  event: ScheduleEvent;
  contacts: Contact[];
  eventTypes: any[];
  projectId: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    title: event.title,
    description: event.description || '',
    type: event.type,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location || '',
    notes: event.notes || '',
    isAllDay: event.isAllDay,
    participants: event.participants.map(p => p.contactId),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      participants: formData.participants, // Just send the participant IDs
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Event Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="type">Type</Label>
          <EventTypeSelect
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
            projectId={projectId}
            eventTypes={eventTypes}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            className="w-full"
          />
        </div>
        <div className="min-w-0">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            disabled={formData.isAllDay}
            required={!formData.isAllDay}
            className="w-full"
          />
        </div>
        <div className="min-w-0">
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            disabled={formData.isAllDay}
            required={!formData.isAllDay}
            className="w-full"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isAllDay"
          checked={formData.isAllDay}
          onCheckedChange={(checked) => setFormData({ ...formData, isAllDay: !!checked })}
        />
        <Label htmlFor="isAllDay">All Day Event</Label>
      </div>

      <div>
        <Label>Location</Label>
        <LocationSelect
          value={formData.location}
          onValueChange={(value) => setFormData({ ...formData, location: value })}
          projectId={projectId}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>

      <div>
        <Label>Participants</Label>
        <div className="space-y-3 max-h-80 overflow-y-auto border rounded-md p-3">
          {contacts.length === 0 ? (
            <p className="text-sm text-gray-500">No contacts available</p>
          ) : (
            (() => {
              // Group contacts by category
              const contactsByCategory = contacts.reduce((acc, contact) => {
                const category = contact.category || 'Other';
                if (!acc[category]) {
                  acc[category] = [];
                }
                acc[category].push(contact);
                return acc;
              }, {} as Record<string, typeof contacts>);

              return Object.entries(contactsByCategory).map(([category, categoryContacts]) => {
                const categoryContactIds = categoryContacts.map(c => c.id);
                const allCategorySelected = categoryContactIds.every(id => formData.participants.includes(id));
                const someCategorySelected = categoryContactIds.some(id => formData.participants.includes(id));

                return (
                  <div key={category} className="space-y-2">
                    {/* Category header with select all checkbox */}
                    <div className="flex items-center space-x-2 font-medium text-gray-700 border-b border-gray-200 pb-1">
                      <Checkbox
                        id={`edit-category-${category}`}
                        checked={allCategorySelected}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = someCategorySelected && !allCategorySelected;
                          }
                        }}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            // Add all category contacts that aren't already selected
                            const newParticipants = [
                              ...formData.participants,
                              ...categoryContactIds.filter(id => !formData.participants.includes(id))
                            ];
                            setFormData({
                              ...formData,
                              participants: newParticipants,
                            });
                          } else {
                            // Remove all category contacts
                            setFormData({
                              ...formData,
                              participants: formData.participants.filter(id => !categoryContactIds.includes(id)),
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`edit-category-${category}`} className="text-sm font-semibold">
                        {category.replace(/_/g, ' ').toUpperCase()}
                      </Label>
                    </div>

                    {/* Individual contacts in category */}
                    <div className="space-y-1 ml-6">
                      {categoryContacts.map(contact => (
                        <div key={contact.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-contact-${contact.id}`}
                            checked={formData.participants.includes(contact.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  participants: [...formData.participants, contact.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  participants: formData.participants.filter(id => id !== contact.id),
                                });
                              }
                            }}
                          />
                          <Label htmlFor={`edit-contact-${contact.id}`} className="text-sm">
                            {contact.firstName} {contact.lastName}
                            {contact.role && (
                              <span className="text-gray-500 ml-1">({contact.role})</span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Changes</Button>
      </div>
    </form>
  );
}