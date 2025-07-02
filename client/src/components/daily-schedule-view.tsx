import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Plus, Clock, Users, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { formatTimeDisplay, formatTimeFromMinutes, parseScheduleSettings } from "@/lib/timeUtils";
import LocationSelect from "@/components/location-select";

interface DailyScheduleViewProps {
  projectId: number;
  selectedDate: Date;
  onBackToWeekly: () => void;
  currentDate?: Date;
  setCurrentDate?: (date: Date) => void;
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

const START_HOUR = 8; // 8 AM
const END_HOUR = 24; // Midnight
const START_MINUTES = START_HOUR * 60;
const END_MINUTES = END_HOUR * 60;
const TOTAL_MINUTES = END_MINUTES - START_MINUTES;

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

export default function DailyScheduleView({ projectId, selectedDate, onBackToWeekly }: DailyScheduleViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState<Date>(selectedDate);
  const [timeIncrement, setTimeIncrement] = useState<15 | 30 | 60>(30);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [createEventDialog, setCreateEventDialog] = useState<{
    isOpen: boolean;
    startTime?: string;
    endTime?: string;
  }>({ isOpen: false });
  const [isDragCreating, setIsDragCreating] = useState<{
    isActive: boolean;
    startTime: number;
    currentTime: number;
  } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [showAllDayEvents, setShowAllDayEvents] = useState(true);

  // Get show settings
  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${projectId}/settings`],
  });

  // Parse schedule settings with time format preference
  const scheduleSettings = parseScheduleSettings((showSettings as any)?.scheduleSettings);
  const { timeFormat, timezone, workStartTime, workEndTime } = scheduleSettings;

  // Fetch schedule events for the current date
  const { data: allEvents = [], isLoading } = useQuery<ScheduleEvent[]>({
    queryKey: [`/api/projects/${projectId}/schedule-events`],
  });

  const dayEvents = allEvents.filter(event => 
    event.date === currentDate.toISOString().split('T')[0]
  );

  // Fetch contacts
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: [`/api/projects/${projectId}/contacts`],
  });

  // Navigation functions
  const goToPreviousDay = () => {
    const prevDay = new Date(currentDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setCurrentDate(prevDay);
  };

  const goToNextDay = () => {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setCurrentDate(nextDay);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Time formatting functions
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const timeToMinutes = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToPosition = (minutes: number) => {
    const relativeMinutes = Math.max(0, Math.min(minutes - START_MINUTES, TOTAL_MINUTES));
    return (relativeMinutes / TOTAL_MINUTES) * 1080; // 1080px = 18 hours
  };

  const positionToMinutes = (position: number) => {
    const relativeMinutes = (position / 1080) * TOTAL_MINUTES;
    return Math.min(START_MINUTES + relativeMinutes, END_MINUTES - 1);
  };

  const snapToIncrement = (minutes: number) => {
    return Math.round(minutes / timeIncrement) * timeIncrement;
  };

  // Format date display
  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Drag to create events
  const handleMouseDown = (e: React.MouseEvent) => {
    // Allow drag creation on empty grid space (but not on events)
    const target = e.target as HTMLElement;
    const isOnEvent = target.closest('[data-event-id]');
    const isOnTimeLabel = target.closest('.time-label') || target.classList.contains('time-label');
    
    if (!isOnEvent && !isOnTimeLabel && calendarRef.current) {
      const rect = calendarRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const minutes = positionToMinutes(y);
      const snappedMinutes = snapToIncrement(minutes);
      
      setIsDragCreating({
        isActive: true,
        startTime: snappedMinutes,
        currentTime: snappedMinutes,
      });
      
      e.preventDefault();
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragCreating && calendarRef.current) {
      const rect = calendarRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const minutes = positionToMinutes(y);
      const snappedMinutes = snapToIncrement(minutes);
      
      setIsDragCreating(prev => prev ? {
        ...prev,
        currentTime: Math.max(snappedMinutes, prev.startTime + timeIncrement)
      } : null);
    }
  }, [isDragCreating, timeIncrement]);

  const handleMouseUp = useCallback(() => {
    if (isDragCreating) {
      const startTime = formatTime(isDragCreating.startTime);
      const endTime = formatTime(isDragCreating.currentTime);
      
      setCreateEventDialog({
        isOpen: true,
        startTime,
        endTime,
      });
      
      setIsDragCreating(null);
    }
  }, [isDragCreating]);

  useEffect(() => {
    if (isDragCreating) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragCreating, handleMouseMove, handleMouseUp]);

  // Auto-scroll to work hours
  useEffect(() => {
    const workStartMinutes = timeToMinutes(workStartTime);
    const scrollTop = minutesToPosition(workStartMinutes) - 100;
    if (calendarRef.current) {
      calendarRef.current.scrollTop = Math.max(0, scrollTop);
    }
  }, [workStartTime, currentDate]);

  // Mutations
  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await fetch(`/api/projects/${projectId}/schedule-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...eventData,
          date: currentDate.toISOString().split('T')[0],
        }),
      });
      if (!response.ok) throw new Error("Failed to create event");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/schedule-events`] });
      setCreateEventDialog({ isOpen: false });
      toast({ title: "Event created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to create event", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

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
        variant: "destructive" 
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const response = await fetch(`/api/schedule-events/${eventId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete event");
      return response.json();
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
        variant: "destructive" 
      });
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold w-80 text-center">
            {formatDateDisplay(currentDate)}
          </h3>
          <Button variant="outline" size="sm" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={timeIncrement.toString()} onValueChange={(value) => setTimeIncrement(parseInt(value) as 15 | 30 | 60)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 min</SelectItem>
              <SelectItem value="30">30 min</SelectItem>
              <SelectItem value="60">60 min</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant={showAllDayEvents ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAllDayEvents(!showAllDayEvents)}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            All Day
          </Button>
          
          <Button 
            onClick={() => setCreateEventDialog({ isOpen: true })}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        </div>
      </div>

      {/* All-day events section - conditionally rendered */}
      {showAllDayEvents && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">All Day Events</h4>
          <div className="space-y-2">
            {dayEvents
              .filter(event => event.isAllDay)
              .map((event) => (
                <div
                  key={event.id}
                  className={`
                    text-xs p-2 mb-1 rounded text-white cursor-pointer
                    ${getEventColor(event.type)}
                  `}
                  onClick={() => setEditingEvent(event)}
                >
                  <div className="font-medium">{event.title}</div>
                  {event.description && (
                    <div className="text-xs opacity-75">{event.description}</div>
                  )}
                  {event.participants.length > 0 && (
                    <div className="flex items-center gap-1 text-xs opacity-75 mt-1">
                      <Users className="h-3 w-3" />
                      {event.participants.length}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Time-based calendar */}
      <div className="border rounded-lg bg-white overflow-hidden">
        <div 
          ref={calendarRef}
          className="relative overflow-y-auto cursor-crosshair"
          style={{ height: '600px' }}
          onMouseDown={handleMouseDown}
        >
          <div className="relative" style={{ height: '1080px' }}>
            {/* Hour labels and major grid lines */}
            {Array.from({ length: 17 }, (_, i) => {
              const hour = START_HOUR + i;
              const position = (i / 16) * 1080;
              const timeString = `${hour.toString().padStart(2, '0')}:00`;
              const formattedTime = formatTimeDisplay(timeString, timeFormat);
              return (
                <div
                  key={`hour-${hour}`}
                  className="absolute left-0 right-0 border-b border-gray-200"
                  style={{ top: `${position}px` }}
                >
                  <div className="absolute left-0 w-20 p-2 text-sm text-gray-500 bg-white border-r time-label">
                    {formattedTime}
                  </div>
                </div>
              );
            })}

            {/* Time increment grid lines */}
            {Array.from({ length: Math.floor(TOTAL_MINUTES / timeIncrement) }, (_, i) => {
              const minutes = i * timeIncrement;
              const position = (minutes / TOTAL_MINUTES) * 1080;
              const isHour = minutes % 60 === 0;
              
              if (isHour) return null; // Skip hour lines as they're already drawn above
              
              return (
                <div
                  key={`increment-${i}`}
                  className="absolute left-20 right-0 border-b border-gray-100"
                  style={{ top: `${position}px` }}
                />
              );
            })}

            {/* Working hours highlight */}
            <div
              className="absolute left-20 right-0 bg-blue-50 bg-opacity-50 pointer-events-none"
              style={{
                top: `${minutesToPosition(timeToMinutes(workStartTime))}px`,
                height: `${minutesToPosition(timeToMinutes(workEndTime)) - minutesToPosition(timeToMinutes(workStartTime))}px`,
              }}
            />

            {/* Drag preview */}
            {isDragCreating && (
              <div
                className="absolute left-20 right-4 bg-blue-200 border-2 border-blue-400 rounded opacity-50 pointer-events-none"
                style={{
                  top: `${minutesToPosition(isDragCreating.startTime)}px`,
                  height: `${minutesToPosition(isDragCreating.currentTime) - minutesToPosition(isDragCreating.startTime)}px`,
                }}
              />
            )}

            {/* Time-based events */}
            <div className="absolute left-20 right-0 top-0 bottom-0">
              {dayEvents
                .filter(event => !event.isAllDay)
                .map((event) => {
                  const startMinutes = timeToMinutes(event.startTime);
                  const endMinutes = timeToMinutes(event.endTime);
                  const startPos = minutesToPosition(startMinutes);
                  const duration = endMinutes - startMinutes;
                  const height = (duration / TOTAL_MINUTES) * 1080;

                  const eventTypeColors = {
                    rehearsal: 'bg-blue-100 border-blue-300 text-blue-800',
                    performance: 'bg-red-100 border-red-300 text-red-800',
                    tech: 'bg-orange-100 border-orange-300 text-orange-800',
                    meeting: 'bg-green-100 border-green-300 text-green-800',
                    other: 'bg-gray-100 border-gray-300 text-gray-800',
                  };

                  return (
                    <div
                      key={event.id}
                      data-event-id={event.id}
                      className={`absolute left-2 right-2 border-2 rounded-lg px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity shadow-sm ${
                        eventTypeColors[event.type as keyof typeof eventTypeColors] || eventTypeColors.other
                      }`}
                      style={{
                        top: `${startPos}px`,
                        height: `${Math.max(height, 40)}px`, // Minimum height for visibility
                      }}
                      onClick={() => setEditingEvent(event)}
                    >
                      <div className="font-medium truncate">
                        {event.title}
                      </div>
                      <div className="text-sm opacity-75 truncate">
                        {event.startTime} - {event.endTime}
                      </div>
                      {event.location && (
                        <div className="text-sm opacity-75 truncate">
                          📍 {event.location}
                        </div>
                      )}
                      {event.participants.length > 0 && (
                        <div className="text-sm opacity-75 flex items-center gap-1 mt-1">
                          <Users className="h-3 w-3" />
                          {event.participants.length} assigned
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Event summary */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Day Summary ({dayEvents.length} events)
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Rehearsals:</span>
            <span className="ml-2 font-medium">
              {dayEvents.filter(e => e.type === 'rehearsal').length}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Performances:</span>
            <span className="ml-2 font-medium">
              {dayEvents.filter(e => e.type === 'performance').length}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Tech:</span>
            <span className="ml-2 font-medium">
              {dayEvents.filter(e => e.type === 'tech').length}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Meetings:</span>
            <span className="ml-2 font-medium">
              {dayEvents.filter(e => e.type === 'meeting').length}
            </span>
          </div>
        </div>
      </div>

      {/* Create Event Dialog */}
      <Dialog open={createEventDialog.isOpen} onOpenChange={(open) => setCreateEventDialog({ isOpen: open })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          <CreateEventForm
            projectId={projectId}
            contacts={contacts}
            onSubmit={(eventData) => createEventMutation.mutate(eventData)}
            onCancel={() => setCreateEventDialog({ isOpen: false })}
            initialData={{
              date: currentDate.toISOString().split('T')[0],
              startTime: createEventDialog.startTime,
              endTime: createEventDialog.endTime,
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      {editingEvent && (
        <Dialog open={true} onOpenChange={() => setEditingEvent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
            </DialogHeader>
            <EditEventForm
              event={editingEvent}
              contacts={contacts}
              onSubmit={(eventData) => updateEventMutation.mutate({ eventId: editingEvent.id, eventData })}
              onDelete={() => deleteEventMutation.mutate(editingEvent.id)}
              onCancel={() => setEditingEvent(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Shared form components would be extracted to separate files in a real app
// For now, including simplified versions here

function CreateEventForm({ 
  projectId, 
  contacts, 
  onSubmit, 
  onCancel, 
  initialData 
}: { 
  projectId: number;
  contacts: Contact[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    startTime: initialData?.startTime || '10:00',
    endTime: initialData?.endTime || '12:00',
    type: 'rehearsal',
    location: '',
    notes: '',
    isAllDay: false,
    participants: [] as number[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const toggleParticipant = (contactId: number) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.includes(contactId)
        ? prev.participants.filter(id => id !== contactId)
        : [...prev.participants, contactId]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Event Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="type">Event Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rehearsal">Rehearsal</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="tech">Tech</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
            disabled={formData.isAllDay}
            required={!formData.isAllDay}
          />
        </div>
        
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
            disabled={formData.isAllDay}
            required={!formData.isAllDay}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isAllDay"
          checked={formData.isAllDay}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAllDay: !!checked }))}
        />
        <Label htmlFor="isAllDay">All Day Event</Label>
      </div>

      <LocationSelect
        projectId={projectId}
        value={formData.location}
        onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
      />

      <div>
        <Label>Assign Contacts</Label>
        <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
          {contacts.map((contact) => (
            <div key={contact.id} className="flex items-center space-x-2">
              <Checkbox
                id={`contact-${contact.id}`}
                checked={formData.participants.includes(contact.id)}
                onCheckedChange={() => toggleParticipant(contact.id)}
              />
              <Label htmlFor={`contact-${contact.id}`} className="text-sm">
                {contact.firstName} {contact.lastName} - {contact.role || contact.category}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Create Event
        </Button>
      </div>
    </form>
  );
}

function EditEventForm({ 
  event, 
  contacts, 
  onSubmit, 
  onDelete, 
  onCancel 
}: { 
  event: ScheduleEvent;
  contacts: Contact[];
  onSubmit: (data: any) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    title: event.title,
    description: event.description || '',
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    type: event.type,
    location: event.location || '',
    notes: event.notes || '',
    isAllDay: event.isAllDay,
    participants: event.participants.map(p => p.contactId),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const toggleParticipant = (contactId: number) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.includes(contactId)
        ? prev.participants.filter(id => id !== contactId)
        : [...prev.participants, contactId]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Event Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="type">Event Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rehearsal">Rehearsal</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="tech">Tech</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
            disabled={formData.isAllDay}
            required={!formData.isAllDay}
          />
        </div>
        
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
            disabled={formData.isAllDay}
            required={!formData.isAllDay}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isAllDay"
          checked={formData.isAllDay}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAllDay: !!checked }))}
        />
        <Label htmlFor="isAllDay">All Day Event</Label>
      </div>

      <LocationSelect
        projectId={event.projectId}
        value={formData.location}
        onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
      />

      <div>
        <Label>Assigned Contacts ({formData.participants.length})</Label>
        <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
          {contacts.map((contact) => (
            <div key={contact.id} className="flex items-center space-x-2">
              <Checkbox
                id={`contact-${contact.id}`}
                checked={formData.participants.includes(contact.id)}
                onCheckedChange={() => toggleParticipant(contact.id)}
              />
              <Label htmlFor={`contact-${contact.id}`} className="text-sm">
                {contact.firstName} {contact.lastName} - {contact.role || contact.category}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={2}
        />
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="destructive" onClick={onDelete}>
          Delete Event
        </Button>
        <div className="space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Update Event
          </Button>
        </div>
      </div>
    </form>
  );
}