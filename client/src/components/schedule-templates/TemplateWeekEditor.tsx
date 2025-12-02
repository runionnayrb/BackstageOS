import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Clock, MapPin, Edit3 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ScheduleTemplateEvent {
  id: number;
  templateId: number;
  dayOfWeek: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  type: string;
  eventTypeId: number | null;
  location: string | null;
  notes: string | null;
  isAllDay: boolean;
  participants?: any[];
}

interface EventType {
  id: number;
  name: string;
  color: string;
}

interface TemplateWeekEditorProps {
  templateId: number;
  projectId: number;
  weekStartDay: number;
}

const DEFAULT_DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function TemplateWeekEditor({ templateId, projectId, weekStartDay }: TemplateWeekEditorProps) {
  const { toast } = useToast();
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleTemplateEvent | null>(null);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(0);
  
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStartTime, setEventStartTime] = useState("09:00");
  const [eventEndTime, setEventEndTime] = useState("10:00");
  const [eventType, setEventType] = useState("rehearsal");
  const [eventTypeId, setEventTypeId] = useState<number | null>(null);
  const [eventLocation, setEventLocation] = useState("");
  const [eventNotes, setEventNotes] = useState("");
  const [eventIsAllDay, setEventIsAllDay] = useState(false);

  const { data: events = [], isLoading: eventsLoading } = useQuery<ScheduleTemplateEvent[]>({
    queryKey: [`/api/schedule-templates/${templateId}/events`],
  });

  const { data: eventTypes = [] } = useQuery<EventType[]>({
    queryKey: [`/api/projects/${projectId}/event-types`],
  });

  const orderedDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayIndex = (weekStartDay + i) % 7;
      days.push({
        index: dayIndex,
        name: DEFAULT_DAY_ORDER[dayIndex],
        shortName: DEFAULT_DAY_ORDER[dayIndex].slice(0, 3),
      });
    }
    return days;
  }, [weekStartDay]);

  const eventsByDay = useMemo(() => {
    const grouped: Record<number, ScheduleTemplateEvent[]> = {};
    for (let i = 0; i < 7; i++) {
      grouped[i] = [];
    }
    events.forEach(event => {
      if (event.dayOfWeek >= 0 && event.dayOfWeek <= 6) {
        grouped[event.dayOfWeek].push(event);
      }
    });
    for (let i = 0; i < 7; i++) {
      grouped[i].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return grouped;
  }, [events]);

  const createEventMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", `/api/schedule-templates/${templateId}/events`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/schedule-templates/${templateId}/events`] });
      toast({ title: "Event added to template" });
      handleCloseEventDialog();
    },
    onError: () => {
      toast({ title: "Failed to add event", variant: "destructive" });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number } & any) =>
      apiRequest("PATCH", `/api/schedule-template-events/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/schedule-templates/${templateId}/events`] });
      toast({ title: "Event updated" });
      handleCloseEventDialog();
    },
    onError: () => {
      toast({ title: "Failed to update event", variant: "destructive" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/schedule-template-events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/schedule-templates/${templateId}/events`] });
      toast({ title: "Event deleted" });
      setDeleteDialogOpen(false);
      setSelectedEvent(null);
    },
    onError: () => {
      toast({ title: "Failed to delete event", variant: "destructive" });
    },
  });

  const handleAddEvent = (dayOfWeek: number) => {
    setSelectedEvent(null);
    setSelectedDayOfWeek(dayOfWeek);
    setEventTitle("");
    setEventDescription("");
    setEventStartTime("09:00");
    setEventEndTime("10:00");
    setEventType("rehearsal");
    setEventTypeId(null);
    setEventLocation("");
    setEventNotes("");
    setEventIsAllDay(false);
    setEventDialogOpen(true);
  };

  const handleEditEvent = (event: ScheduleTemplateEvent) => {
    setSelectedEvent(event);
    setSelectedDayOfWeek(event.dayOfWeek);
    setEventTitle(event.title);
    setEventDescription(event.description || "");
    setEventStartTime(event.startTime.slice(0, 5));
    setEventEndTime(event.endTime.slice(0, 5));
    setEventType(event.type);
    setEventTypeId(event.eventTypeId);
    setEventLocation(event.location || "");
    setEventNotes(event.notes || "");
    setEventIsAllDay(event.isAllDay);
    setEventDialogOpen(true);
  };

  const handleDeleteEvent = (event: ScheduleTemplateEvent) => {
    setSelectedEvent(event);
    setDeleteDialogOpen(true);
  };

  const handleCloseEventDialog = () => {
    setEventDialogOpen(false);
    setSelectedEvent(null);
  };

  const handleSaveEvent = () => {
    if (!eventTitle.trim()) {
      toast({ title: "Please enter an event title", variant: "destructive" });
      return;
    }

    const eventData = {
      dayOfWeek: selectedDayOfWeek,
      title: eventTitle.trim(),
      description: eventDescription.trim() || null,
      startTime: eventIsAllDay ? "00:00" : eventStartTime,
      endTime: eventIsAllDay ? "23:59" : eventEndTime,
      type: eventType,
      eventTypeId: eventTypeId,
      location: eventLocation.trim() || null,
      notes: eventNotes.trim() || null,
      isAllDay: eventIsAllDay,
    };

    if (selectedEvent) {
      updateEventMutation.mutate({ id: selectedEvent.id, ...eventData });
    } else {
      createEventMutation.mutate(eventData);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getEventTypeColor = (event: ScheduleTemplateEvent) => {
    if (event.eventTypeId && eventTypes.length > 0) {
      const type = eventTypes.find(t => t.id === event.eventTypeId);
      if (type) return type.color;
    }
    const typeColors: Record<string, string> = {
      rehearsal: '#3b82f6',
      performance: '#ef4444',
      tech: '#8b5cf6',
      meeting: '#10b981',
      other: '#6b7280',
    };
    return typeColors[event.type] || typeColors.other;
  };

  if (eventsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {orderedDays.map((day) => (
          <div key={day.index} className="min-w-0">
            <div className="text-center py-2 bg-muted/50 rounded-t-lg">
              <span className="text-xs md:text-sm font-medium">{day.shortName}</span>
              <span className="hidden md:inline text-xs md:text-sm font-medium">
                {day.name.slice(3)}
              </span>
            </div>
            <div className="border border-t-0 rounded-b-lg min-h-[200px] p-1 md:p-2 space-y-1">
              {eventsByDay[day.index]?.map((event) => (
                <div
                  key={event.id}
                  className="p-1.5 md:p-2 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity group relative"
                  style={{ 
                    backgroundColor: `${getEventTypeColor(event)}20`,
                    borderLeft: `3px solid ${getEventTypeColor(event)}`,
                  }}
                  onClick={() => handleEditEvent(event)}
                  data-testid={`template-event-${event.id}`}
                >
                  <div className="font-medium truncate pr-5" style={{ color: getEventTypeColor(event) }}>
                    {event.title}
                  </div>
                  <div className="text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {event.isAllDay ? 'All day' : `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`}
                    </span>
                  </div>
                  {event.location && (
                    <div className="text-muted-foreground flex items-center gap-1 mt-0.5 hidden md:flex">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}
                  <button
                    className="absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEvent(event);
                    }}
                    data-testid={`button-delete-event-${event.id}`}
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </button>
                </div>
              ))}
              <button
                className="w-full p-1.5 rounded border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
                onClick={() => handleAddEvent(day.index)}
                data-testid={`button-add-event-day-${day.index}`}
              >
                <Plus className="h-3 w-3" />
                <span className="text-xs">Add</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {selectedEvent ? "Edit Event" : "Add Event"}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent 
                ? "Update the event details." 
                : `Add an event to ${DEFAULT_DAY_ORDER[selectedDayOfWeek]}.`}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="eventTitle">Event Title *</Label>
                <Input
                  id="eventTitle"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g., Full Company Rehearsal"
                  data-testid="input-event-title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventDay">Day</Label>
                <Select
                  value={selectedDayOfWeek.toString()}
                  onValueChange={(value) => setSelectedDayOfWeek(parseInt(value))}
                >
                  <SelectTrigger data-testid="select-event-day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_DAY_ORDER.map((name, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isAllDay"
                  checked={eventIsAllDay}
                  onCheckedChange={(checked) => setEventIsAllDay(checked as boolean)}
                  data-testid="checkbox-all-day"
                />
                <Label htmlFor="isAllDay">All day event</Label>
              </div>

              {!eventIsAllDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={eventStartTime}
                      onChange={(e) => setEventStartTime(e.target.value)}
                      data-testid="input-start-time"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={eventEndTime}
                      onChange={(e) => setEventEndTime(e.target.value)}
                      data-testid="input-end-time"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="eventType">Event Type</Label>
                <Select
                  value={eventTypeId?.toString() || eventType}
                  onValueChange={(value) => {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue)) {
                      setEventTypeId(numValue);
                      const type = eventTypes.find(t => t.id === numValue);
                      if (type) setEventType(type.name.toLowerCase());
                    } else {
                      setEventTypeId(null);
                      setEventType(value);
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-event-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.length > 0 ? (
                      eventTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: type.color }}
                            />
                            {type.name}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="rehearsal">Rehearsal</SelectItem>
                        <SelectItem value="performance">Performance</SelectItem>
                        <SelectItem value="tech">Tech</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventLocation">Location</Label>
                <Input
                  id="eventLocation"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="e.g., Main Stage"
                  data-testid="input-event-location"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventDescription">Description</Label>
                <Textarea
                  id="eventDescription"
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Brief description of the event..."
                  rows={2}
                  data-testid="input-event-description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventNotes">Notes</Label>
                <Textarea
                  id="eventNotes"
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={2}
                  data-testid="input-event-notes"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-4 border-t">
            {selectedEvent && (
              <Button
                variant="destructive"
                onClick={() => {
                  setEventDialogOpen(false);
                  handleDeleteEvent(selectedEvent);
                }}
                className="w-full sm:w-auto"
                data-testid="button-delete-event"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
              <Button
                variant="outline"
                onClick={handleCloseEventDialog}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEvent}
                disabled={createEventMutation.isPending || updateEventMutation.isPending}
                className="flex-1 sm:flex-none"
                data-testid="button-save-event"
              >
                {(createEventMutation.isPending || updateEventMutation.isPending) 
                  ? "Saving..." 
                  : (selectedEvent ? "Save Changes" : "Add Event")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedEvent?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedEvent && deleteEventMutation.mutate(selectedEvent.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-event"
            >
              {deleteEventMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
