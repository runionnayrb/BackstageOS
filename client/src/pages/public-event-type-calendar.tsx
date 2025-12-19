import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Download, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EventTypeCalendarShare {
  id: number;
  projectId: number;
  eventTypeName: string;
  eventTypeCategory: string;
  token: string;
  isActive: boolean;
  accessCount: number;
  lastAccessed: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: number;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
}

interface ScheduleEvent {
  id: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  date: string;
  isAllDay: boolean;
  eventType: string | null;
  location: string | null;
  notes: string | null;
}

export default function PublicEventTypeCalendar() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();

  // Fetch event type share details
  const { data: shareData, isLoading: shareLoading, error: shareError } = useQuery({
    queryKey: [`/api/public-calendar/event-type/${token}`],
    queryFn: () => apiRequest('GET', `/api/public-calendar/event-type/${token}`)
  });

  // Fetch project details
  const { data: projectData, isLoading: projectLoading } = useQuery({
    queryKey: [`/api/public-calendar/event-type/${token}/project`],
    queryFn: () => apiRequest('GET', `/api/public-calendar/event-type/${token}/project`),
    enabled: !!shareData
  });

  // Fetch events for the event type
  const { data: eventsData = [], isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: [`/api/public-calendar/event-type/${token}/events`],
    queryFn: () => apiRequest('GET', `/api/public-calendar/event-type/${token}/events`),
    enabled: !!shareData,
    refetchInterval: 60000 // Refetch every minute for real-time updates
  });

  if (shareLoading || projectLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (shareError || !shareData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Access Error</CardTitle>
            <CardDescription>
              {shareError ? 'Failed to load calendar share' : 'No token provided or invalid token'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Please check the link and try again, or contact the person who shared this calendar with you.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const share = shareData as EventTypeCalendarShare;
  const project = projectData as Project;
  const events = Array.isArray(eventsData) ? eventsData as ScheduleEvent[] : [];

  const handleDownloadICS = () => {
    const link = `${window.location.origin}/api/public-calendar/event-type/${token}/subscribe.ics`;
    const anchor = document.createElement('a');
    anchor.href = link;
    anchor.download = `calendar-${share.eventTypeName.toLowerCase().replace(/\s+/g, '-')}.ics`;
    anchor.click();
    toast({
      title: "Calendar Downloaded",
      description: "The dynamic calendar file has been downloaded. Import this into your calendar app for automatic updates."
    });
  };

  const formatDateTime = (date: string, startTime: string, endTime: string, isAllDay: boolean) => {
    const eventDate = new Date(date);
    const dateStr = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (isAllDay) {
      return `${dateStr} - All Day`;
    }

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    const startStr = start.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    const endStr = end.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    return `${dateStr}, ${startStr} - ${endStr}`;
  };

  const groupEventsByMonth = (events: ScheduleEvent[]) => {
    const grouped: Record<string, ScheduleEvent[]> = {};
    
    events.forEach(event => {
      const date = new Date(event.date);
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(event);
    });

    // Sort events within each month by date
    Object.keys(grouped).forEach(month => {
      grouped[month].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });

    return grouped;
  };

  const groupedEvents = groupEventsByMonth(events);
  const sortedMonths = Object.keys(groupedEvents).sort((a, b) => 
    new Date(a + ' 1').getTime() - new Date(b + ' 1').getTime()
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{share.eventTypeName} Calendar</h1>
          {project && (
            <p className="text-lg text-muted-foreground mb-1">{project.name}</p>
          )}
          <Badge variant={share.eventTypeCategory === 'show_schedule' ? 'default' : 'secondary'} className="mb-4">
            {share.eventTypeCategory === 'show_schedule' ? 'Show Events' : 'Individual Events'}
          </Badge>
          
          <div className="flex justify-center gap-4 mt-6">
            <Button onClick={handleDownloadICS} className="gap-2">
              <Download className="h-4 w-4" />
              Download Calendar
            </Button>
            <Button variant="outline" onClick={() => refetchEvents()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Events List */}
        {events.length > 0 ? (
          <div className="space-y-8">
            {sortedMonths.map(month => (
              <div key={month} className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground border-b pb-2">
                  {month}
                </h2>
                <div className="grid gap-4">
                  {groupedEvents[month].map(event => (
                    <Card key={event.id} className="border">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{event.title}</CardTitle>
                            <CardDescription className="mt-1">
                              {formatDateTime(event.date, event.startTime, event.endTime, event.isAllDay)}
                            </CardDescription>
                          </div>
                          {event.eventType && (
                            <Badge variant="outline" className="ml-4">
                              {event.eventType}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {event.location && (
                            <div className="text-sm">
                              <span className="font-medium">Location: </span>
                              {event.location}
                            </div>
                          )}
                          {event.description && (
                            <div className="text-sm">
                              <span className="font-medium">Description: </span>
                              {event.description}
                            </div>
                          )}
                          {event.notes && (
                            <div className="text-sm">
                              <span className="font-medium">Notes: </span>
                              {event.notes}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Events Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                There are currently no {share.eventTypeName.toLowerCase()} events scheduled for this production.
                {eventsLoading && " Loading events..."}
              </p>
              {!eventsLoading && (
                <Button variant="outline" onClick={() => refetchEvents()} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Check for Updates
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>This calendar updates automatically when new events are added.</p>
          <p className="mt-1">Powered by BackstageOS</p>
        </div>
      </div>
    </div>
  );
}