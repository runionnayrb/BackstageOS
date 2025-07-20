import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { format, parseISO } from "date-fns";
import { Calendar, Plus, Save, FileText, ChevronLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { DailyCall, Project, Contact, ScheduleEvent } from "@shared/schema";

interface DailyCallsPageProps {
  id: string;
}

interface CallLocation {
  name: string;
  events: Array<{
    id: number;
    title: string;
    startTime: string;
    endTime: string;
    cast: string[];
    notes?: string;
  }>;
}

export default function DailyCallsPage({ id: projectId }: DailyCallsPageProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isEditing, setIsEditing] = useState(false);
  const [callData, setCallData] = useState<{
    locations: CallLocation[];
    announcements: string;
    endOfDayNotes: string;
  }>({
    locations: [],
    announcements: '',
    endOfDayNotes: ''
  });

  // Fetch project data
  const { data: project } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
  });

  // Fetch contacts (cast members)
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/projects', projectId, 'contacts'],
  });

  // Fetch schedule events for the selected date
  const { data: scheduleEvents = [] } = useQuery<ScheduleEvent[]>({
    queryKey: ['/api/projects', projectId, 'schedule-events'],
  });

  // Fetch existing daily call for the selected date
  const { data: existingDailyCall, isLoading } = useQuery<DailyCall>({
    queryKey: ['/api/projects', projectId, 'daily-calls', selectedDate],
    enabled: !!selectedDate,
  });

  // Mutation for saving daily call
  const saveCallMutation = useMutation({
    mutationFn: async (data: any) => {
      if (existingDailyCall?.id) {
        return apiRequest('PATCH', `/api/projects/${projectId}/daily-calls/${existingDailyCall.id}`, data);
      } else {
        return apiRequest('POST', `/api/projects/${projectId}/daily-calls`, { ...data, date: selectedDate });
      }
    },
    onSuccess: () => {
      toast({
        title: "Call Sheet Saved",
        description: "Daily call sheet has been saved successfully.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'daily-calls'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save daily call sheet.",
        variant: "destructive",
      });
    },
  });

  // Load existing daily call data when it changes
  useEffect(() => {
    if (existingDailyCall) {
      setCallData({
        locations: existingDailyCall.locations || [],
        announcements: existingDailyCall.announcements || '',
        endOfDayNotes: existingDailyCall.endOfDayNotes || ''
      });
    } else {
      // Auto-generate from schedule events for the selected date
      generateCallFromSchedule();
    }
  }, [existingDailyCall, selectedDate]);

  const generateCallFromSchedule = () => {
    if (!scheduleEvents.length) return;

    // Filter events for the selected date
    const dayEvents = scheduleEvents.filter(event => event.date === selectedDate);
    
    // Group events by location
    const locationGroups: { [key: string]: any[] } = {};
    
    dayEvents.forEach(event => {
      const location = event.location || 'Main Stage';
      if (!locationGroups[location]) {
        locationGroups[location] = [];
      }
      
      // Get cast members for this event (this would come from participants in real implementation)
      const eventCast = contacts
        .filter(contact => contact.contactType === 'cast')
        .slice(0, Math.floor(Math.random() * 5) + 2) // Random subset for demo
        .map(contact => `${contact.firstName.charAt(0)}. ${contact.lastName}`);
      
      locationGroups[location].push({
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        cast: eventCast,
        notes: event.notes || event.description
      });
    });

    // Convert to locations array
    const locations: CallLocation[] = Object.entries(locationGroups).map(([name, events]) => ({
      name,
      events: events.sort((a, b) => a.startTime.localeCompare(b.startTime))
    }));

    setCallData(prev => ({
      ...prev,
      locations
    }));
  };

  const handleSave = () => {
    saveCallMutation.mutate({
      locations: callData.locations,
      announcements: callData.announcements,
      endOfDayNotes: callData.endOfDayNotes,
      events: scheduleEvents.filter(event => event.date === selectedDate)
    });
  };

  const addLocation = () => {
    setCallData(prev => ({
      ...prev,
      locations: [...prev.locations, { name: 'New Location', events: [] }]
    }));
    setIsEditing(true);
  };

  const addEvent = (locationIndex: number) => {
    const newEvent = {
      id: Date.now(),
      title: 'New Event',
      startTime: '10:00',
      endTime: '11:00',
      cast: [],
      notes: ''
    };
    
    setCallData(prev => ({
      ...prev,
      locations: prev.locations.map((loc, idx) => 
        idx === locationIndex 
          ? { ...loc, events: [...loc.events, newEvent] }
          : loc
      )
    }));
    setIsEditing(true);
  };

  const formatCastList = (cast: string[]) => {
    if (cast.length === 0) return 'TBD';
    return cast.join(', ');
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading daily call...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/projects/${projectId}`)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to {project?.name}
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Daily Call Sheets</h1>
              <p className="text-gray-600">Create and manage daily call sheets for your production</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>
            {isEditing && (
              <Button onClick={handleSave} disabled={saveCallMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {saveCallMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Call Sheet Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">{project?.name}</h2>
            <h3 className="text-xl text-gray-700 mt-2">DAILY CALL SHEET</h3>
            <p className="text-lg text-gray-600 mt-1">
              {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>

          {/* Announcements Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">ANNOUNCEMENTS</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={callData.announcements}
                  onChange={(e) => setCallData(prev => ({ ...prev, announcements: e.target.value }))}
                  placeholder="Enter general announcements, notes, or reminders for the company..."
                  className="min-h-20"
                />
              ) : (
                <div className="min-h-20 text-gray-700 whitespace-pre-wrap">
                  {callData.announcements || 'No announcements for today.'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Call Schedule by Location */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">CALL SCHEDULE</h3>
              {isEditing && (
                <Button onClick={addLocation} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              )}
            </div>

            {callData.locations.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No schedule events found for this date.</p>
                  <Button onClick={addLocation} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Manual Call Sheet
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {callData.locations.map((location, locationIndex) => (
                  <Card key={locationIndex} className="border-2 border-gray-200">
                    <CardHeader className="bg-gray-50">
                      <CardTitle className="text-lg flex items-center">
                        {isEditing ? (
                          <Input
                            value={location.name}
                            onChange={(e) => {
                              setCallData(prev => ({
                                ...prev,
                                locations: prev.locations.map((loc, idx) => 
                                  idx === locationIndex 
                                    ? { ...loc, name: e.target.value }
                                    : loc
                                )
                              }));
                            }}
                            className="font-semibold"
                          />
                        ) : (
                          <>
                            <Users className="h-5 w-5 mr-2" />
                            {location.name}
                          </>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {location.events.map((event, eventIndex) => (
                          <div key={eventIndex} className="border-l-4 border-blue-500 pl-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  {event.startTime} - {event.endTime}
                                </Badge>
                                <span className="font-semibold text-gray-900">{event.title}</span>
                              </div>
                            </div>
                            <div className="text-sm text-gray-700 mb-1">
                              <strong>Called:</strong> {formatCastList(event.cast)}
                            </div>
                            {event.notes && (
                              <div className="text-sm text-gray-600 italic">
                                {event.notes}
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {isEditing && (
                          <Button 
                            onClick={() => addEvent(locationIndex)} 
                            variant="ghost" 
                            size="sm"
                            className="w-full mt-2"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Event
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* End of Day Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">END-OF-DAY</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={callData.endOfDayNotes}
                  onChange={(e) => setCallData(prev => ({ ...prev, endOfDayNotes: e.target.value }))}
                  placeholder="Enter end of day notes, next day preparation, or closing announcements..."
                  className="min-h-20"
                />
              ) : (
                <div className="min-h-20 text-gray-700 whitespace-pre-wrap">
                  {callData.endOfDayNotes || 'No end-of-day notes.'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Button */}
          {!isEditing && (
            <div className="mt-8 text-center">
              <Button onClick={() => setIsEditing(true)} variant="outline" size="lg">
                <FileText className="h-4 w-4 mr-2" />
                Edit Call Sheet
              </Button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
            {project?.name} • Generated by BackstageOS • {format(new Date(), 'MMM d, yyyy')}
          </div>
        </div>
      </div>
    </div>
  );
}