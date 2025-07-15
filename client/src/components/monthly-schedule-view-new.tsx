import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Calendar, X, Clock, MapPin, Users, Edit } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatTimeDisplay, parseScheduleSettings } from "@/lib/timeUtils";
import { isShowEvent, getEventTypeDisplayName, getEventTypeColor, getEventTypeColorFromDatabase } from "@/lib/eventUtils";
import { filterEventsBySettings } from "@/lib/scheduleUtils";
import EventForm from "@/components/event-form";
import { apiRequest } from "@/lib/queryClient";

interface MonthlyScheduleViewProps {
  projectId: number;
  onDateClick: (date: Date) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  selectedContactIds: number[];
  selectedEventTypes: string[];
  selectedIndividualTypes: string[];
  showAllDayEvents: boolean;
  setShowAllDayEvents: (show: boolean) => void;
  createEventDialog: boolean;
  setCreateEventDialog: (open: boolean) => void;
  onEventClick?: (event: ScheduleEvent) => void;
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

export default function MonthlyScheduleView({
  projectId,
  onDateClick,
  currentDate,
  setCurrentDate,
  selectedContactIds,
  selectedEventTypes,
  selectedIndividualTypes,
  showAllDayEvents,
  setShowAllDayEvents,
  createEventDialog,
  setCreateEventDialog,
  onEventClick
}: MonthlyScheduleViewProps) {
  const [editEventDialog, setEditEventDialog] = useState<{ isOpen: boolean; event?: ScheduleEvent }>({ isOpen: false });
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all data needed for event creation/editing
  const { data: events = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/schedule-events`],
  });

  const { data: contacts = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/contacts`],
  });

  const { data: eventTypes = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/event-types`],
  });

  const { data: settings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Get time format from settings
  const scheduleSettings = parseScheduleSettings(settings?.scheduleSettings);
  const timeFormat = scheduleSettings.timeFormat;

  // Filter events based on contacts, all-day settings, and schedule filtering
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    let filteredEvents = events.filter((event: ScheduleEvent) => event.date === dateStr);
    
    // Apply event type filtering based on user selections
    // If no event types are selected at all, show no events
    if (selectedEventTypes.length === 0 && selectedIndividualTypes.length === 0) {
      filteredEvents = [];
    } else {
      filteredEvents = filteredEvents.filter(event => {
        // Normalize event type for comparison
        const normalizedEventType = event.type.replace(/_/g, ' ').toLowerCase();
        
        // Find the event type in the database
        const eventType = eventTypes.find(et => 
          et.id === event.eventTypeId || 
          et.name.toLowerCase() === event.type.toLowerCase() ||
          et.name.toLowerCase() === normalizedEventType
        );
        
        // Check if this event type is selected in Show Schedule
        const typeIdentifier = eventType ? (eventType.isDefault ? eventType.name : eventType.id) : event.type;
        const isSelectedInShowSchedule = selectedEventTypes.includes(typeIdentifier);
        
        if (isSelectedInShowSchedule) {
          return true;
        } else {
          // Check if it's selected in Individual Events
          const eventTypeName = eventType ? eventType.name : event.type;
          const normalizedEventTypeName = eventTypeName.replace(/_/g, ' ').toLowerCase();
          
          return selectedIndividualTypes.some(selectedType => {
            const normalizedSelectedType = selectedType.replace(/_/g, ' ').toLowerCase();
            return normalizedSelectedType === eventTypeName.toLowerCase() ||
                   normalizedSelectedType === event.type.toLowerCase() ||
                   normalizedSelectedType === normalizedEventType ||
                   normalizedSelectedType === normalizedEventTypeName;
          });
        }
      });
    }
    
    if (selectedContactIds.length > 0) {
      filteredEvents = filteredEvents.filter((event: ScheduleEvent) => 
        event.participants.some(participant => selectedContactIds.includes(participant.contactId))
      );
    }

    if (!showAllDayEvents) {
      filteredEvents = filteredEvents.filter((event: ScheduleEvent) => !event.isAllDay);
    }

    return filteredEvents;
  };

  // Mutations for creating and editing events
  const createEventMutation = useMutation({
    mutationFn: (eventData: any) => apiRequest('POST', `/api/schedule-events`, {
      ...eventData,
      projectId,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule-events`] });
      setCreateEventDialog(false);
      toast({
        title: "Event created successfully",
        description: "The event has been added to your schedule.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating event",
        description: error.message || "Failed to create event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, ...eventData }: any) => apiRequest('PUT', `/api/schedule-events/${id}`, eventData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule-events`] });
      setEditEventDialog({ isOpen: false });
      toast({
        title: "Event updated successfully",
        description: "The event has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating event",
        description: error.message || "Failed to update event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (eventId: number) => apiRequest('DELETE', `/api/schedule-events/${eventId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule-events`] });
      setEditEventDialog({ isOpen: false });
      toast({
        title: "Event deleted successfully",
        description: "The event has been removed from your schedule.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting event",
        description: error.message || "Failed to delete event. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle event creation
  const handleCreateEvent = (eventData: any) => {
    createEventMutation.mutate(eventData);
  };

  // Handle event editing
  const handleEditEvent = (eventData: any) => {
    updateEventMutation.mutate(eventData);
  };

  // Handle event deletion
  const handleDeleteEvent = () => {
    if (editEventDialog.event) {
      deleteEventMutation.mutate(editEventDialog.event.id);
    }
  };

  // Calendar generation
  const generateCalendar = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfCalendar = new Date(firstDayOfMonth);
    firstDayOfCalendar.setDate(firstDayOfCalendar.getDate() - firstDayOfCalendar.getDay());
    
    const days = [];
    let currentDay = new Date(firstDayOfCalendar);
    
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        weekDays.push(new Date(currentDay));
        currentDay.setDate(currentDay.getDate() + 1);
      }
      days.push(weekDays);
      
      if (currentDay > lastDayOfMonth && currentDay.getDay() === 0) {
        break;
      }
    }
    
    return days;
  }, []);

  const calendarDays = generateCalendar(currentDate);

  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  return (
    <div className="space-y-4">
      {/* Removed individual calendar header - using unified main page header */}

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 border-r last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.flat().map((date, index) => {
            const dayEvents = getEventsForDate(date);
            const isCurrentMonthDay = isCurrentMonth(date);
            const isTodayDate = isToday(date);

            return (
              <div
                key={index}
                className={`min-h-16 md:min-h-24 p-1 md:p-2 border-r border-b last:border-r-0 ${
                  !isCurrentMonthDay ? 'bg-gray-50 text-gray-400' : ''
                }`}
              >
                <div 
                  className={`flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full text-sm font-medium cursor-pointer transition-colors hover:bg-gray-100 ${
                    isTodayDate ? 'bg-red-500 text-white hover:bg-red-600' : ''
                  }`}
                  onClick={() => onDateClick(date)}
                >
                  {date.getDate()}
                </div>
                
                {/* Events */}
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 3).map((event: ScheduleEvent) => {
                    const eventTypeColor = getEventTypeColorFromDatabase(event.type, eventTypes);
                    return (
                      <Popover key={event.id}>
                        <PopoverTrigger asChild>
                          <div
                            className="px-1 py-0.5 rounded text-xs truncate cursor-pointer transition-colors text-white hover:opacity-80"
                            style={{ backgroundColor: eventTypeColor }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {event.title}
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="start">
                          <div className="p-4 space-y-3">
                            {/* Event Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: eventTypeColor }}
                                />
                                <h3 className="font-medium text-sm">{event.title}</h3>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  setEditEventDialog({ isOpen: true, event });
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>

                            {/* Event Details */}
                            <div className="space-y-2">
                              {/* Time */}
                              <div className="flex items-center space-x-2 text-xs text-gray-600">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {event.isAllDay 
                                    ? 'All Day' 
                                    : `${formatTimeDisplay(event.startTime, timeFormat).replace(':00', '')} - ${formatTimeDisplay(event.endTime, timeFormat).replace(':00', '')}`
                                  }
                                </span>
                              </div>

                              {/* Location */}
                              {event.location && (
                                <div className="flex items-center space-x-2 text-xs text-gray-600">
                                  <MapPin className="h-3 w-3" />
                                  <span>{event.location}</span>
                                </div>
                              )}

                              {/* Event Type */}
                              <div className="flex items-center space-x-2 text-xs text-gray-600">
                                <Calendar className="h-3 w-3" />
                                <span>{getEventTypeDisplayName(event.type)}</span>
                              </div>

                              {/* Participants */}
                              {event.participants && event.participants.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-2 text-xs text-gray-600">
                                    <Users className="h-3 w-3" />
                                    <span className="font-medium">Participants ({event.participants.length})</span>
                                  </div>
                                  <div className="ml-5 space-y-1">
                                    {(() => {
                                      // Group participants by contact category
                                      const participantsByCategory = event.participants.reduce((acc, participant) => {
                                        // Find the contact details from the contacts array
                                        const contact = contacts.find(c => c.id === participant.contactId);
                                        if (contact) {
                                          const category = contact.category || 'Other';
                                          if (!acc[category]) {
                                            acc[category] = [];
                                          }
                                          acc[category].push({
                                            ...participant,
                                            contactName: `${contact.firstName} ${contact.lastName}`,
                                            contactRole: contact.role
                                          });
                                        }
                                        return acc;
                                      }, {} as Record<string, any[]>);

                                      // Sort categories in the same order as the filter
                                      const categoryOrder = ['cast', 'stage_management', 'crew', 'creative_team', 'theater_staff'];
                                      const sortedCategories = Object.keys(participantsByCategory).sort((a, b) => {
                                        const aIndex = categoryOrder.indexOf(a);
                                        const bIndex = categoryOrder.indexOf(b);
                                        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                                        if (aIndex === -1) return 1;
                                        if (bIndex === -1) return -1;
                                        return aIndex - bIndex;
                                      });

                                      return sortedCategories.map(category => (
                                        <div key={category} className="space-y-0.5">
                                          <div className="text-xs font-medium text-gray-800 capitalize">
                                            {category.replace('_', ' ')}
                                          </div>
                                          {participantsByCategory[category].map(participant => (
                                            <div key={participant.id} className="text-xs text-gray-600 ml-2 flex items-center justify-between">
                                              <span>
                                                {participant.contactName}
                                                {participant.contactRole && (
                                                  <span className="text-gray-500"> ({participant.contactRole})</span>
                                                )}
                                              </span>
                                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                participant.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                participant.status === 'declined' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                              }`}>
                                                {participant.status}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </div>
                              )}

                              {/* Description */}
                              {event.description && (
                                <div className="text-xs text-gray-700 pt-1">
                                  <p>{event.description}</p>
                                </div>
                              )}

                              {/* Notes */}
                              {event.notes && (
                                <div className="text-xs text-gray-700 pt-1">
                                  <p className="font-medium">Notes:</p>
                                  <p>{event.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 px-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Event Dialog */}
      <Dialog open={editEventDialog.isOpen} onOpenChange={(open) => setEditEventDialog({ isOpen: open })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {editEventDialog.event && (
            <EventForm
              projectId={projectId}
              contacts={contacts}
              eventTypes={eventTypes}
              initialDate={editEventDialog.event.date}
              onSubmit={handleEditEvent}
              onCancel={() => setEditEventDialog({ isOpen: false })}
              timeFormat={timeFormat}
            />
          )}
          <div className="flex justify-between pt-4">
            <Button
              variant="destructive"
              onClick={handleDeleteEvent}
              disabled={deleteEventMutation.isPending}
            >
              {deleteEventMutation.isPending ? "Deleting..." : "Delete Event"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}