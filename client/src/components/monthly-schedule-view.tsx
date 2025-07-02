import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Plus, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { formatTimeDisplay, parseScheduleSettings } from "@/lib/timeUtils";
import { isShowEvent, getEventTypeDisplayName, getEventTypeColor, ALL_EVENT_TYPES } from "@/lib/eventUtils";
import LocationSelect from "@/components/location-select";

interface MonthlyScheduleViewProps {
  projectId: number;
  onDateClick: (date: Date) => void;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  selectedContactIds: number[];
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
}: MonthlyScheduleViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createEventDialog, setCreateEventDialog] = useState<{
    isOpen: boolean;
    date?: string;
  }>({ isOpen: false });
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
  const [showAllDayEvents, setShowAllDayEvents] = useState(true);

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

  // Filter events based on selected contact IDs
  const filteredEvents = selectedContactIds.length === 0 
    ? events.filter(event => isShowEvent(event.type)) // Show only show-wide events when no filter is applied (show schedule)
    : events.filter(event => 
        event.participants.some(participant => 
          selectedContactIds.includes(participant.contactId)
        )
      );

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
      setCreateEventDialog({ isOpen: false });
    },
    onError: (error) => {
      toast({ 
        title: "Failed to create event", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleCreateEvent = (formData: any) => {
    createEventMutation.mutate(formData);
  };

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    setCreateEventDialog({ 
      isOpen: true, 
      date: dateStr 
    });
  };

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
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold w-80 text-center">{formatMonthYear()}</h3>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center space-x-2">
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

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-3 text-center border-r last:border-r-0">
              <div className="text-sm font-medium text-gray-500">{day}</div>
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
                className={`min-h-24 border-r border-b last:border-r-0 p-2 cursor-pointer hover:bg-gray-50 ${
                  !isCurrentMonth ? 'bg-gray-100 text-gray-400' : ''
                } ${isToday ? 'bg-blue-50' : ''}`}
                onClick={() => handleDateClick(date)}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : ''}`}>
                  {date.getDate()}
                </div>
                
                {/* Events for this day */}
                <div className="space-y-1">
                  {dayEvents
                    .filter(event => showAllDayEvents || !event.isAllDay)
                    .slice(0, 3)
                    .map((event) => (
                    <div
                      key={event.id}
                      className={`text-xs px-1 py-0.5 rounded text-white truncate ${
                        eventTypeColors[event.type as keyof typeof eventTypeColors]
                      }`}
                      title={`${event.title} (${event.isAllDay ? 'All Day' : `${formatTimeDisplay(event.startTime, timeFormat)} - ${formatTimeDisplay(event.endTime, timeFormat)}`})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingEvent(event);
                      }}
                    >
                      {event.isAllDay ? event.title : `${formatTimeDisplay(event.startTime, timeFormat)} ${event.title}`}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Event Dialog */}
      {createEventDialog.isOpen && (
        <Dialog open={createEventDialog.isOpen} onOpenChange={() => setCreateEventDialog({ isOpen: false })}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <EventForm
              projectId={projectId}
              contacts={contacts}
              initialDate={createEventDialog.date}
              onSubmit={handleCreateEvent}
              onCancel={() => setCreateEventDialog({ isOpen: false })}
              timeFormat={timeFormat}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Event form component (simplified for this implementation)
function EventForm({ 
  projectId, 
  contacts, 
  initialDate, 
  onSubmit, 
  onCancel,
  timeFormat 
}: {
  projectId: number;
  contacts: Contact[];
  initialDate?: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  timeFormat: string;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: initialDate || '',
    startTime: '09:00',
    endTime: '10:00',
    type: 'other',
    location: '',
    notes: '',
    isAllDay: false,
    participantIds: [] as number[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Clean up the form data before submission
    const cleanedData = {
      ...formData,
      location: formData.location?.trim() || undefined,
      description: formData.description?.trim() || undefined,
      notes: formData.notes?.trim() || undefined,
    };
    onSubmit(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
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
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
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

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            disabled={formData.isAllDay}
          />
        </div>
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            disabled={formData.isAllDay}
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

      <LocationSelect
        projectId={projectId}
        value={formData.location}
        onValueChange={(value) => setFormData({ ...formData, location: value })}
        eventDate={formData.date}
        startTime={formData.startTime}
        endTime={formData.endTime}
      />

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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