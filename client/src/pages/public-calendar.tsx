import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Download, ExternalLink, Clock, MapPin, User, Mail, Eye } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface PublicCalendarData {
  project: {
    id: number;
    name: string;
    description: string;
  };
  contact: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    contactType: string;
  };
  events: Array<{
    id: number;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    eventType: string;
    description: string;
    notes: string;
  }>;
}

export default function PublicCalendar() {
  const [calendarData, setCalendarData] = useState<PublicCalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        // Extract token from URL manually since this route is outside wouter routing
        const pathParts = window.location.pathname.split('/');
        const token = pathParts[pathParts.length - 1];
        
        if (!token || token === 'public-calendar') {
          throw new Error('No token provided');
        }

        const data = await apiRequest('GET', `/api/public-calendar/${token}`);
        setCalendarData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load calendar');
        toast({
          title: "Error",
          description: err.message || "Failed to load calendar",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, [toast]);

  const generateGoogleCalendarLink = () => {
    if (!calendarData?.events || calendarData.events.length === 0) return '';

    // For multiple events, we'll create a link to add the first event
    const firstEvent = calendarData.events[0];
    if (firstEvent) {
      const startDateTime = new Date(`${firstEvent.date}T${firstEvent.startTime}`);
      const endDateTime = new Date(`${firstEvent.date}T${firstEvent.endTime}`);
      
      const formatDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: firstEvent.title,
        dates: `${formatDate(startDateTime)}/${formatDate(endDateTime)}`,
        details: firstEvent.description || '',
        location: firstEvent.location || '',
        sprop: 'name:BackstageOS'
      });

      return `https://calendar.google.com/calendar/render?${params.toString()}`;
    }

    return '';
  };

  const downloadICSFile = () => {
    if (!calendarData?.events || calendarData.events.length === 0) return;

    const icsEvents = calendarData.events.map(event => {
      const startDateTime = new Date(`${event.date}T${event.startTime}`);
      const endDateTime = new Date(`${event.date}T${event.endTime}`);
      
      const formatDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      return [
        'BEGIN:VEVENT',
        `DTSTART:${formatDate(startDateTime)}`,
        `DTEND:${formatDate(endDateTime)}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.description || ''}`,
        `LOCATION:${event.location || ''}`,
        `UID:${event.id}@backstageos.com`,
        'END:VEVENT'
      ].join('\n');
    }).join('\n');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//BackstageOS//Personal Schedule//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      icsEvents,
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${calendarData.project.name}_${calendarData.contact.firstName}_${calendarData.contact.lastName}_schedule.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Started",
      description: "Your personal schedule has been downloaded as an ICS file."
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading your personal schedule...</p>
        </div>
      </div>
    );
  }

  if (error || !calendarData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Access Error</CardTitle>
            <CardDescription>
              {error || 'This calendar link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600">
              Please contact your stage manager for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Calendar className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Personal Schedule
            </h1>
          </div>
          <p className="text-gray-600">
            {`${calendarData.contact.firstName} ${calendarData.contact.lastName}'s Schedule`}
          </p>
        </div>

        {/* Project & Contact Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Production Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Production</Label>
                <p className="text-lg font-semibold">{calendarData.project.name}</p>
                {calendarData.project.description && (
                  <p className="text-sm text-gray-600">{calendarData.project.description}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Team Member</Label>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{calendarData.contact.firstName} {calendarData.contact.lastName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{calendarData.contact.email}</span>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Schedule Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Add to Your Calendar</CardTitle>
            <CardDescription>
              Download your personal schedule or add events to Google Calendar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={downloadICSFile}
                className="flex-1 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download ICS File
              </Button>
              <Button
                onClick={() => window.open(generateGoogleCalendarLink(), '_blank')}
                variant="outline"
                className="flex-1 flex items-center gap-2"
                disabled={!calendarData.events?.length}
              >
                <ExternalLink className="h-4 w-4" />
                Open in Google Calendar
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              The ICS file can be imported into most calendar applications including Google Calendar, Apple Calendar, and Outlook.
            </p>
          </CardContent>
        </Card>

        {/* Schedule Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              Schedule Events
              <Badge variant="secondary" className="ml-2">
                {calendarData.events?.length || 0} events
              </Badge>
            </CardTitle>
            <CardDescription>
              Your personal schedule for {calendarData.project.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {calendarData.events?.length ? (
              <div className="space-y-4">
                {calendarData.events
                  .sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime())
                  .map((event) => (
                    <div key={event.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{event.title}</h3>
                        <Badge variant="outline" className="self-start sm:self-center">
                          {event.eventType}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            {new Date(`${event.date}T${event.startTime}`).toLocaleString()} - {new Date(`${event.date}T${event.endTime}`).toLocaleString()}
                          </span>
                        </div>
                        
                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        
                        {event.description && (
                          <div className="mt-2">
                            <p className="font-medium">Description:</p>
                            <p className="text-gray-700">{event.description}</p>
                          </div>
                        )}
                        
                        {event.notes && (
                          <div className="mt-2">
                            <p className="font-medium">Notes:</p>
                            <p className="text-gray-700">{event.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No events scheduled at this time.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Access Info */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <div className="flex items-center justify-center gap-2">
            <Eye className="h-3 w-3" />
            <span>
              Powered by BackstageOS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}