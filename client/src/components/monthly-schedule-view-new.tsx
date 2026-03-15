import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Calendar, X, Clock, MapPin, Users, Edit } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatTimeDisplay, parseScheduleSettings } from "@/lib/timeUtils";
import { isShowEvent, getEventTypeDisplayName, getEventTypeColor, getEventTypeColorFromDatabase, isLightColor, calculatePerformanceNumbers, isPerformanceType } from "@/lib/eventUtils";
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
  selectedLocations?: string[];
  showProductionCalendar?: boolean;
  onProductionCalendarFilterChange?: (show: boolean) => void;
  showAllDayEvents: boolean;
  setShowAllDayEvents: (show: boolean) => void;
  createEventDialog: boolean;
  setCreateEventDialog: (open: boolean) => void;
  onEventClick?: (event: ScheduleEvent) => void;
  onEventEdit?: (event: ScheduleEvent) => void;
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
  eventTypeId?: number | null;
  location?: string;
  notes?: string;
  isAllDay: boolean;
  parentEventId?: number | null;
  isProductionLevel?: boolean;
  status?: string;
  cancellationReason?: string | null;
  participants: {
    id: number;
    contactId: number;
    contactFirstName: string;
    contactLastName: string;
    isRequired: boolean;
    status: string;
  }[];
  childEvents?: ScheduleEvent[]; // For events with children
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
  selectedLocations = [],
  showProductionCalendar = true,
  onProductionCalendarFilterChange,
  showAllDayEvents,
  setShowAllDayEvents,
  createEventDialog,
  setCreateEventDialog,
  onEventClick,
  onEventEdit
}: MonthlyScheduleViewProps) {
  const [editEventDialog, setEditEventDialog] = useState<{ isOpen: boolean; event?: ScheduleEvent }>({ isOpen: false });
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all data needed for event creation/editing
  const { data: events = [] } = useQuery({
    queryKey: ['/api/projects', projectId, 'schedule-events'],
    select: (data) => {
      console.log('📅 All events in monthly view:', data?.map(e => ({
        id: e.id,
        title: e.title,
        date: e.date,
        isAllDay: e.isAllDay,
        isProductionLevel: e.isProductionLevel
      })));
      return data;
    }
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['/api/projects', projectId, 'contacts'],
  });

  const { data: eventTypes = [] } = useQuery({
    queryKey: ['/api/projects', projectId, 'event-types'],
  });

  const { data: settings } = useQuery({
    queryKey: ['/api/projects', projectId, 'settings'],
  });

  // Get time format and week start day from settings
  const scheduleSettings = parseScheduleSettings(settings?.scheduleSettings);
  const { timeFormat, weekStartDay } = scheduleSettings;

  // Calculate performance numbers for all events
  const performanceNumbers = useMemo(() => {
    const config = scheduleSettings.performanceNumbering || {
      firstPerformanceEventId: null,
      startingNumber: 1,
    };
    return calculatePerformanceNumbers(events, config, eventTypes);
  }, [events, scheduleSettings.performanceNumbering, eventTypes]);

  // Filter events based on contacts, all-day settings, and schedule filtering
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    let filteredEvents = events.filter((event: ScheduleEvent) => event.date === dateStr);
    
    // Apply production calendar filter if enabled
    if (showProductionCalendar) {
      filteredEvents = filteredEvents.filter((event: ScheduleEvent) => event.isProductionLevel === true);
    }
    
    // Apply event type filtering based on user selections
    // Always include important date events and production-level events regardless of filtering
    // If no event types are selected at all, show all events (changed from only important dates)
    if (!showProductionCalendar && selectedEventTypes.length === 0 && selectedIndividualTypes.length === 0) {
      // Show all events when no filters are selected (previously only showed important_date events)
      // This includes production-level events and regular events
      filteredEvents = filteredEvents; // Show all events
    } else if (!showProductionCalendar) {
      filteredEvents = filteredEvents.filter(event => {
        // Always include important date events and production-level events
        if (event.type === 'important_date' || event.isProductionLevel) {
          return true;
        }
        
        // Normalize event type for comparison
        const normalizedEventType = event.type.replace(/_/g, ' ').toLowerCase();
        
        // Find the event type in the database
        const eventType = eventTypes.find(et => 
          et.id === event.eventTypeId || 
          et.name.toLowerCase() === event.type.toLowerCase() ||
          et.name.toLowerCase() === normalizedEventType
        );
        
        // Check if this event type is selected in Show Schedule
        // Use the event type NAME for comparison since schedule-filter passes names
        const eventTypeName = eventType ? eventType.name : event.type;
        const isSelectedInShowSchedule = selectedEventTypes.some(selectedType => 
          selectedType.toLowerCase() === eventTypeName.toLowerCase() ||
          selectedType.toLowerCase() === event.type.toLowerCase() ||
          selectedType.toLowerCase() === normalizedEventType
        );
        
        if (isSelectedInShowSchedule) {
          return true;
        } else {
          // Check if it's selected in Individual Events
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

    // Apply location filtering
    if (selectedLocations.length > 0) {
      filteredEvents = filteredEvents.filter((event: ScheduleEvent) => {
        if (!event.location) return false;
        const eventLocationLower = event.location.toLowerCase();
        return selectedLocations.some(loc => 
          eventLocationLower === loc.toLowerCase() || 
          eventLocationLower.includes(loc.toLowerCase()) ||
          loc.toLowerCase().includes(eventLocationLower)
        );
      });
    }

    if (!showAllDayEvents) {
      // Always show important date events and production-level events regardless of All Day toggle
      filteredEvents = filteredEvents.filter((event: ScheduleEvent) => 
        !event.isAllDay || event.type === 'important_date' || event.isProductionLevel
      );
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
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'schedule-events'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'schedule-events'] });
      // Also invalidate Show Settings query since Important Date events sync to project settings
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'settings'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'schedule-events'] });
      // Also invalidate Show Settings query since Important Date events sync to project settings
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'settings'] });
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
    if (editEventDialog.event) {
      updateEventMutation.mutate({
        id: editEventDialog.event.id,
        ...eventData
      });
    }
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
    
    // Map week start day string to number
    const weekStartMap: { [key: string]: number } = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, 
      thursday: 4, friday: 5, saturday: 6
    };
    
    const configuredStartDay = weekStartMap[weekStartDay] || 0;
    const firstDayOfMonthWeekday = firstDayOfMonth.getDay();
    
    // Calculate days to subtract to get to the configured start day
    let daysToSubtract = firstDayOfMonthWeekday - configuredStartDay;
    if (daysToSubtract < 0) {
      daysToSubtract += 7;
    }
    
    firstDayOfCalendar.setDate(firstDayOfCalendar.getDate() - daysToSubtract);
    
    const days = [];
    let currentDay = new Date(firstDayOfCalendar);
    
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        weekDays.push(new Date(currentDay));
        currentDay.setDate(currentDay.getDate() + 1);
      }
      days.push(weekDays);
      
      if (currentDay > lastDayOfMonth && currentDay.getDay() === configuredStartDay) {
        break;
      }
    }
    
    return days;
  }, [weekStartDay]);

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
          {(() => {
            const allDayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
            const weekStartMap: { [key: string]: number } = {
              sunday: 0, monday: 1, tuesday: 2, wednesday: 3, 
              thursday: 4, friday: 5, saturday: 6
            };
            
            const configuredStartDay = weekStartMap[weekStartDay] || 0;
            const orderedDayNames = [
              ...allDayNames.slice(configuredStartDay),
              ...allDayNames.slice(0, configuredStartDay)
            ];
            
            return orderedDayNames.map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 border-r last:border-r-0">
                {day}
              </div>
            ));
          })()}
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
                  {dayEvents
                    .sort((a, b) => {
                      // All Day events first
                      if (a.isAllDay && !b.isAllDay) return -1;
                      if (!a.isAllDay && b.isAllDay) return 1;
                      // Then sort by start time for timed events
                      return a.startTime.localeCompare(b.startTime);
                    })
                    .slice(0, 3)
                    .map((event: ScheduleEvent) => {
                      const eventTypeColor = getEventTypeColorFromDatabase(event.type, eventTypes, event.eventTypeId);
                      const formatEventTime = (time: string) => formatTimeDisplay(time.slice(0, 5), timeFormat);
                      

                      
                      // Log every event to see what data we have
                      if (event.title === "Another test event") {
                        console.log('🔍 FOUND "Another test event" in map:', JSON.stringify(event, null, 2));
                      }
                      
                      return (
                        <Popover 
                          key={event.id}
                          open={openPopoverId === `event-${event.id}`}
                          onOpenChange={(open) => setOpenPopoverId(open ? `event-${event.id}` : null)}
                        >
                          <PopoverTrigger asChild>
                            <div
                              className={`px-1 py-0.5 rounded text-xs cursor-pointer transition-colors hover:opacity-80 flex items-center justify-between ${
                                isLightColor(eventTypeColor) ? 'text-gray-900' : 'text-white'
                              }`}
                              style={{ backgroundColor: eventTypeColor }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center space-x-1 min-w-0">
                                {!event.isAllDay && (
                                  <span className="font-medium opacity-90 text-[10px] flex-shrink-0">
                                    {formatEventTime(event.startTime)}
                                  </span>
                                )}
                                <span className="truncate">
                                  {event.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
                                {event.status === 'cancelled' && (
                                  <span className="text-[8px] font-bold bg-red-500 text-white px-0.5 rounded leading-none">X</span>
                                )}
                                {performanceNumbers.get(event.id) && (
                                  <span className="text-[8px] font-bold bg-white/30 px-0.5 rounded leading-none">#{performanceNumbers.get(event.id)}</span>
                                )}
                              </div>
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
                                {event.status === 'cancelled' && (
                                  <span className="text-xs font-bold bg-red-500 text-white px-1.5 py-0.5 rounded">Cancelled</span>
                                )}
                                {performanceNumbers.get(event.id) && (
                                  <span className="text-xs font-bold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-1.5 py-0.5 rounded">#{performanceNumbers.get(event.id)}</span>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  setOpenPopoverId(null);
                                  console.log('🔥 SETTING EDIT EVENT DIALOG with event:', JSON.stringify(event, null, 2));
                                  console.log('🔥 Event has isProductionLevel?', 'isProductionLevel' in event, event.isProductionLevel);
                                  if (onEventEdit) {
                                    onEventEdit(event);
                                  } else {
                                    setEditEventDialog({ isOpen: true, event });
                                  }
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
                                    : `${formatTimeDisplay(event.startTime.slice(0, 5), timeFormat).replace(':00', '')} - ${formatTimeDisplay(event.endTime.slice(0, 5), timeFormat).replace(':00', '')}`
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
                                <span>{getEventTypeDisplayName(event.type, eventTypes, event.eventTypeId)}</span>
                              </div>

                              {/* Cancellation Reason */}
                              {event.status === 'cancelled' && event.cancellationReason && (
                                <div className="bg-red-50 border border-red-200 rounded-md p-2">
                                  <div className="text-xs font-medium text-red-700 mb-1">Cancellation Reason:</div>
                                  <div className="text-xs text-red-600">{event.cancellationReason}</div>
                                </div>
                              )}

                              {/* Participants */}
                              {event.participants && event.participants.length > 0 && (
                                <Popover 
                                  open={openPopoverId === `event-${event.id}-participants`}
                                  onOpenChange={(open) => setOpenPopoverId(open ? `event-${event.id}-participants` : null)}
                                >
                                  <PopoverTrigger asChild>
                                    <div className="flex items-center space-x-2 text-xs text-gray-600 cursor-pointer hover:text-gray-800 transition-colors">
                                      <Users className="h-3 w-3" />
                                      <span>{event.participants.length} {event.participants.length === 1 ? 'Person Called' : 'People Called'}</span>
                                    </div>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-72 p-0 max-h-80 overflow-y-auto" align="start">
                                    <div className="p-4 space-y-3">
                                      <h4 className="font-medium text-sm">People Called</h4>
                                      <div className="space-y-3">
                                        {(() => {
                                          // Group participants by contact group name
                                          const participantsByGroup = event.participants.reduce((acc, participant) => {
                                            // Find the contact details from the contacts array for group and role
                                            const contact = contacts.find(c => c.id === participant.contactId);
                                            const groupName = contact?.contactGroup?.name || 'Unassigned';
                                            
                                            if (!acc[groupName]) {
                                              acc[groupName] = [];
                                            }
                                            acc[groupName].push({
                                              ...participant,
                                              contactName: `${participant.contactFirstName || contact?.firstName || ''} ${participant.contactLastName || contact?.lastName || ''}`.trim() || 'Unknown',
                                              contactRole: contact?.role
                                            });
                                            return acc;
                                          }, {} as Record<string, any[]>);

                                          // Sort groups alphabetically, with Unassigned at the end
                                          const sortedGroups = Object.keys(participantsByGroup).sort((a, b) => {
                                            if (a === 'Unassigned') return 1;
                                            if (b === 'Unassigned') return -1;
                                            return a.localeCompare(b);
                                          });

                                          return sortedGroups.map(groupName => (
                                            <div key={groupName} className="space-y-1">
                                              <div className="text-xs font-medium text-gray-800 border-b border-gray-200 pb-1">
                                                {groupName}
                                              </div>
                                              {participantsByGroup[groupName].map(participant => (
                                                <div key={participant.id} className="text-xs text-gray-900 ml-1 py-0.5">
                                                  <span className="font-medium">
                                                    {participant.contactName || 'No name'}
                                                  </span>
                                                  {participant.contactRole && (
                                                    <span className="text-gray-600 font-normal"> ({participant.contactRole})</span>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          ));
                                        })()}
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
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
      {console.log('🚨🚨 EDIT DIALOG STATE:', editEventDialog)}
      <Dialog open={editEventDialog.isOpen} onOpenChange={(open) => setEditEventDialog({ isOpen: open })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {editEventDialog.event && (() => {
            console.log('🚨 EDIT DIALOG EVENT:', JSON.stringify(editEventDialog.event, null, 2));
            console.log('🚨 Event isProductionLevel value:', editEventDialog.event.isProductionLevel);
            
            console.log('🎯 Event type should now be correct:', editEventDialog.event.type);
            
            const initialValuesForForm = {
              title: editEventDialog.event.title,
              description: editEventDialog.event.description,
              type: editEventDialog.event.type, // Event should now have correct type name
              startDate: editEventDialog.event.date,
              endDate: editEventDialog.event.date,
              startTime: editEventDialog.event.startTime.slice(0, 5),
              endTime: editEventDialog.event.endTime.slice(0, 5),
              location: editEventDialog.event.location || "",
              notes: editEventDialog.event.notes || "",
              isAllDay: editEventDialog.event.isAllDay,
              isProductionLevel: editEventDialog.event.isProductionLevel,
              participantIds: editEventDialog.event.participants.map(p => p.contactId),
            };
            console.log('🚨 FINAL initialValues with mapped type:', JSON.stringify(initialValuesForForm, null, 2));
            return (
              <EventForm
                projectId={projectId}
                contacts={contacts}
                eventTypes={eventTypes}
                initialDate={editEventDialog.event.date}
                onSubmit={handleEditEvent}
                onCancel={() => setEditEventDialog({ isOpen: false })}
                timeFormat={timeFormat}
                initialValues={initialValuesForForm}
              />
            );
          })()}
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