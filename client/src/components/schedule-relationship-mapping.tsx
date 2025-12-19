import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Plus, Link, Unlink, ArrowRight } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
  parentEventId?: number | null;
  isProductionLevel?: boolean;
  participants: {
    id: number;
    contactId: number;
    contactFirstName: string;
    contactLastName: string;
    isRequired: boolean;
    status: string;
  }[];
  childEvents?: ScheduleEvent[];
}

interface ScheduleRelationshipMappingProps {
  projectId: number;
}

export default function ScheduleRelationshipMapping({ projectId }: ScheduleRelationshipMappingProps) {
  const { toast } = useToast();
  const [selectedProductionEvent, setSelectedProductionEvent] = useState<ScheduleEvent | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newEventData, setNewEventData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    type: 'rehearsal',
    location: '',
    notes: ''
  });

  // Fetch production-level events
  const { data: productionEvents = [], isLoading: isLoadingProduction } = useQuery({
    queryKey: [`/api/projects/${projectId}/production-events`],
    enabled: !!projectId
  });

  // Fetch daily events for selected production event
  const { data: dailyEvents = [], isLoading: isLoadingDaily } = useQuery({
    queryKey: [`/api/schedule-events/${selectedProductionEvent?.id}/daily-events`],
    enabled: !!selectedProductionEvent?.id
  });

  // Create daily event mutation
  const createDailyEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await fetch(`/api/schedule-events/${selectedProductionEvent?.id}/create-daily-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      if (!response.ok) throw new Error('Failed to create daily event');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/schedule-events/${selectedProductionEvent?.id}/daily-events`] });
      setShowCreateDialog(false);
      setNewEventData({
        title: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        type: 'rehearsal',
        location: '',
        notes: ''
      });
      toast({
        title: "Success",
        description: "Daily event created and linked to production event",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create daily event",
        variant: "destructive",
      });
    }
  });

  // Link existing event mutation
  const linkEventMutation = useMutation({
    mutationFn: async ({ dailyEventId, parentEventId }: { dailyEventId: number; parentEventId: number }) => {
      const response = await fetch(`/api/schedule-events/${dailyEventId}/link-to-production/${parentEventId}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to link event');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/schedule-events/${selectedProductionEvent?.id}/daily-events`] });
      toast({
        title: "Success",
        description: "Event linked to production event",
      });
    }
  });

  // Unlink event mutation
  const unlinkEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const response = await fetch(`/api/schedule-events/${eventId}/unlink`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to unlink event');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/schedule-events/${selectedProductionEvent?.id}/daily-events`] });
      toast({
        title: "Success",
        description: "Event unlinked from production event",
      });
    }
  });

  const handleCreateDailyEvent = () => {
    if (!selectedProductionEvent) return;
    createDailyEventMutation.mutate(newEventData);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Schedule Relationship Mapping</h2>
        <Badge variant="outline" className="text-xs">
          Track Plan vs Reality
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Events Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Production Schedule Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingProduction ? (
              <div className="text-center py-4">Loading production events...</div>
            ) : productionEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No production-level events found</p>
                <p className="text-sm">Create events with "Production Level" enabled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {productionEvents.map((event: ScheduleEvent) => (
                  <div
                    key={event.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedProductionEvent?.id === event.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedProductionEvent(event)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(event.date)} • {formatTime(event.startTime)} - {formatTime(event.endTime)}
                        </p>
                        {event.location && (
                          <p className="text-sm text-muted-foreground">{event.location}</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {event.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Events Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Daily Detail Events
              {selectedProductionEvent && (
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              )}
            </CardTitle>
            {selectedProductionEvent && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Daily Event
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Daily Event</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={newEventData.title}
                        onChange={(e) => setNewEventData({ ...newEventData, title: e.target.value })}
                        placeholder="Daily event title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newEventData.date}
                        onChange={(e) => setNewEventData({ ...newEventData, date: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startTime">Start Time</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={newEventData.startTime}
                          onChange={(e) => setNewEventData({ ...newEventData, startTime: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endTime">End Time</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={newEventData.endTime}
                          onChange={(e) => setNewEventData({ ...newEventData, endTime: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="type">Event Type</Label>
                      <Select 
                        value={newEventData.type} 
                        onValueChange={(value) => setNewEventData({ ...newEventData, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rehearsal">Rehearsal</SelectItem>
                          <SelectItem value="tech">Tech</SelectItem>
                          <SelectItem value="performance">Performance</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={newEventData.location}
                        onChange={(e) => setNewEventData({ ...newEventData, location: e.target.value })}
                        placeholder="Event location"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newEventData.description}
                        onChange={(e) => setNewEventData({ ...newEventData, description: e.target.value })}
                        placeholder="Event description"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateDailyEvent}
                        disabled={createDailyEventMutation.isPending}
                      >
                        {createDailyEventMutation.isPending ? "Creating..." : "Create Event"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {!selectedProductionEvent ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a production event to view daily details</p>
              </div>
            ) : isLoadingDaily ? (
              <div className="text-center py-4">Loading daily events...</div>
            ) : dailyEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No daily events linked to this production event</p>
                <p className="text-sm">Create daily events to track actual execution</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dailyEvents.map((event: ScheduleEvent) => (
                  <div
                    key={event.id}
                    className="p-3 border rounded-lg bg-green-50 border-green-200"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(event.date)} • {formatTime(event.startTime)} - {formatTime(event.endTime)}
                        </p>
                        {event.location && (
                          <p className="text-sm text-muted-foreground">{event.location}</p>
                        )}
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs bg-green-100">
                          Linked
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unlinkEventMutation.mutate(event.id)}
                          disabled={unlinkEventMutation.isPending}
                        >
                          <Unlink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedProductionEvent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Schedule Relationship Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <h4 className="font-medium text-blue-900">Production Event: {selectedProductionEvent.title}</h4>
                <p className="text-sm text-blue-700">
                  {formatDate(selectedProductionEvent.date)} • {formatTime(selectedProductionEvent.startTime)} - {formatTime(selectedProductionEvent.endTime)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-700">{dailyEvents.length} linked daily events</p>
                <p className="text-xs text-blue-600">Track plan vs reality execution</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}