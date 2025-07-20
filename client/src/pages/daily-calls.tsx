import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
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
import { parseScheduleSettings, formatTimeDisplay } from "@/lib/timeUtils";
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
  const params = useParams();
  
  // Use params.id if projectId prop is not available
  const actualProjectId = projectId || params.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isEditing, setIsEditing] = useState(false);
  const [callData, setCallData] = useState<{
    locations: CallLocation[];
    announcements: string;
  }>({
    locations: [],
    announcements: ''
  });

  // Fetch project data
  const { data: project } = useQuery<Project>({
    queryKey: ['/api/projects', actualProjectId],
    enabled: !!actualProjectId,
  });

  // Fetch contacts (cast members)
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/projects', actualProjectId, 'contacts'],
    enabled: !!actualProjectId,
  });

  // Fetch schedule events for the selected date
  const { data: scheduleEvents = [] } = useQuery<ScheduleEvent[]>({
    queryKey: ['/api/projects', actualProjectId, 'schedule-events'],
    enabled: !!actualProjectId,
  });

  // Fetch show settings for timezone and time format preferences
  const { data: showSettings } = useQuery({
    queryKey: [`/api/projects/${actualProjectId}/settings`],
    enabled: !!actualProjectId,
  });

  // Fetch existing daily call for the selected date
  const { data: existingDailyCall, isLoading } = useQuery<DailyCall>({
    queryKey: ['/api/projects', actualProjectId, 'daily-calls', selectedDate],
    enabled: !!actualProjectId && !!selectedDate,
  });

  // Parse schedule settings for timezone and time format preferences
  const scheduleSettings = parseScheduleSettings((showSettings as any)?.scheduleSettings);
  const { timeFormat = '12', timezone } = scheduleSettings;

  // Mutation for saving daily call
  const saveCallMutation = useMutation({
    mutationFn: async (data: any) => {
      if (existingDailyCall?.id) {
        return apiRequest('PATCH', `/api/projects/${actualProjectId}/daily-calls/${existingDailyCall.id}`, data);
      } else {
        return apiRequest('POST', `/api/projects/${actualProjectId}/daily-calls`, { ...data, date: selectedDate });
      }
    },
    onSuccess: () => {
      toast({
        title: "Call Sheet Saved",
        description: "Daily call sheet has been saved successfully.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/projects', actualProjectId, 'daily-calls'] });
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
      // Ensure END-OF-DAY events are added to existing data
      const locationsWithEndOfDay = (existingDailyCall.locations || []).map(location => {
        const events = location.events || [];
        const hasEndOfDay = events.some(event => event.title === 'END-OF-DAY');
        if (!hasEndOfDay) {
          return {
            ...location,
            events: [...events, {
              id: -1,
              title: 'END-OF-DAY',
              startTime: '23:59',
              endTime: '23:59',
              cast: [],
              notes: undefined
            }]
          };
        }
        return location;
      });
      
      setCallData({
        locations: locationsWithEndOfDay,
        announcements: existingDailyCall.announcements || ''
      });
    } else if (actualProjectId && !existingDailyCall) {
      // Auto-generate from schedule events for the selected date (even if no events exist)
      generateCallFromSchedule();
    }
  }, [existingDailyCall, selectedDate, actualProjectId]);

  const generateCallFromSchedule = () => {
    if (!actualProjectId) return;

    // Filter events for the selected date
    const dayEvents = scheduleEvents.filter(event => event.date === selectedDate);
    
    // Group events by location
    const locationGroups: { [key: string]: any[] } = {};
    
    // If there are schedule events for the day, group them by location
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
        startTime: formatTimeDisplay(event.startTime?.slice(0, 5) || event.startTime, timeFormat as '12' | '24'),
        endTime: formatTimeDisplay(event.endTime?.slice(0, 5) || event.endTime, timeFormat as '12' | '24'),
        cast: eventCast,
        notes: event.notes || event.description
      });
    });

    // If no events exist for the day, create a default location
    if (Object.keys(locationGroups).length === 0) {
      locationGroups['Main Stage'] = [];
    }

    // Convert to locations array and add END-OF-DAY to each location
    const locations: CallLocation[] = Object.entries(locationGroups).map(([name, events]) => {
      const sortedEvents = events.sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      // Add END-OF-DAY event at the end
      sortedEvents.push({
        id: -1, // Special ID for END-OF-DAY
        title: 'END-OF-DAY',
        startTime: '23:59',
        endTime: '23:59',
        cast: [],
        notes: undefined
      });
      
      return {
        name,
        events: sortedEvents
      };
    });

    setCallData(prev => ({
      ...prev,
      locations
    }));
  };

  const handleSave = () => {
    saveCallMutation.mutate({
      locations: callData.locations,
      announcements: callData.announcements,

      events: scheduleEvents.filter(event => event.date === selectedDate)
    });
  };

  const addLocation = () => {
    const newLocation = {
      name: 'New Location',
      events: [{
        id: -1,
        title: 'END-OF-DAY',
        startTime: '23:59',
        endTime: '23:59',
        cast: [],
        notes: undefined
      }]
    };
    
    setCallData(prev => ({
      ...prev,
      locations: [...prev.locations, newLocation]
    }));
    setIsEditing(true);
  };

  const addEvent = (locationIndex: number) => {
    const newEvent = {
      id: Date.now(),
      title: 'New Event',
      startTime: formatTimeDisplay('10:00', timeFormat as '12' | '24'),
      endTime: formatTimeDisplay('11:00', timeFormat as '12' | '24'),
      cast: [],
      notes: ''
    };
    
    setCallData(prev => ({
      ...prev,
      locations: prev.locations.map((loc, idx) => 
        idx === locationIndex 
          ? { 
              ...loc, 
              events: [
                ...(loc.events || []).filter(event => event.title !== 'END-OF-DAY'),
                newEvent,
                // Always add END-OF-DAY at the end
                {
                  id: -1,
                  title: 'END-OF-DAY',
                  startTime: '23:59',
                  endTime: '23:59',
                  cast: [],
                  notes: undefined
                }
              ]
            }
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
            <h3 className="text-xl text-gray-700 mt-2">DAILY SCHEDULE</h3>
            <p className="text-lg text-gray-600 mt-1">
              {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>

          {/* Call Schedule by Location */}
          <div className="space-y-6">
            {isEditing && (
              <div className="flex justify-end">
                <Button onClick={addLocation} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </div>
            )}

            {(callData.locations || []).length === 0 ? (
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
            ) : (callData.locations || []).length === 1 ? (
              // Single location - full width
              <div className="space-y-8">
                {(callData.locations || []).map((location, locationIndex) => (
                  <div key={locationIndex} className="space-y-3">
                    <div className="border-b-2 border-gray-300 pb-2">
                      <h4 className="text-lg font-semibold text-gray-900">
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
                            className="font-semibold text-lg"
                          />
                        ) : (
                          location.name
                        )}
                      </h4>
                    </div>
                    
                    <div className="space-y-2">
                      {(location.events || []).map((event, eventIdx) => (
                        <div key={event.id} className={`flex items-start gap-6 ${event.title === 'END-OF-DAY' ? 'bg-gray-100 py-1' : 'py-2'}`}>
                          <div className="w-20 text-sm font-medium text-gray-700 flex-shrink-0">
                            {event.title === 'END-OF-DAY' ? '' : (
                              isEditing ? (
                                <Input
                                  value={event.startTime}
                                  onChange={(e) => {
                                    const newLocations = [...callData.locations];
                                    newLocations[locationIndex].events[eventIdx].startTime = e.target.value;
                                    setCallData(prev => ({ ...prev, locations: newLocations }));
                                  }}
                                  className="text-xs w-16"
                                  placeholder="9:00 AM"
                                />
                              ) : event.startTime
                            )}
                          </div>
                          <div className="flex-1">
                            {isEditing && event.title !== 'END-OF-DAY' ? (
                              <Input
                                value={event.title}
                                onChange={(e) => {
                                  const newLocations = [...callData.locations];
                                  newLocations[locationIndex].events[eventIdx].title = e.target.value;
                                  setCallData(prev => ({ ...prev, locations: newLocations }));
                                }}
                                className="font-medium text-sm"
                              />
                            ) : (
                              <div>
                                <div className={`text-sm ${event.title === 'END-OF-DAY' ? 'font-bold text-gray-900' : 'font-bold text-gray-800'}`}>
                                  {event.title}
                                </div>
                                {event.cast.length > 0 && (
                                  <div className="text-xs text-gray-600 mt-1 ml-6">
                                    {event.cast.join(', ')}
                                  </div>
                                )}
                                {event.notes && (
                                  <div className="text-xs text-gray-500 italic mt-1 ml-6">{event.notes}</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {isEditing && (
                        <Button 
                          onClick={() => addEvent(locationIndex)} 
                          variant="ghost" 
                          size="sm"
                          className="w-full mt-4"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Event
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Multiple locations - 2/3 and 1/3 layout with full-width END-OF-DAY
              <div className="space-y-4">
                {/* Regular events in grid layout */}
                <div className="grid grid-cols-3 gap-8">
                  {(callData.locations || []).map((location, locationIndex) => (
                    <div key={locationIndex} className={`space-y-3 ${locationIndex === 0 ? 'col-span-2' : 'col-span-1'}`}>
                      <div className="border-b-2 border-gray-300 pb-2">
                        <h4 className="text-lg font-semibold text-gray-900">
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
                              className="font-semibold text-lg"
                            />
                          ) : (
                            location.name
                          )}
                        </h4>
                      </div>
                      
                      <div className="space-y-2">
                        {(location.events || []).filter(event => event.title !== 'END-OF-DAY').map((event, eventIdx) => (
                          <div key={event.id} className="flex items-start gap-4 py-2">
                            <div className="w-16 text-sm font-medium text-gray-700 flex-shrink-0">
                              {isEditing ? (
                                <Input
                                  value={event.startTime}
                                  onChange={(e) => {
                                    const newLocations = [...callData.locations];
                                    const originalEventIdx = newLocations[locationIndex].events.findIndex(ev => ev.id === event.id);
                                    newLocations[locationIndex].events[originalEventIdx].startTime = e.target.value;
                                    setCallData(prev => ({ ...prev, locations: newLocations }));
                                  }}
                                  className="text-xs w-14"
                                  placeholder="9:00 AM"
                                />
                              ) : event.startTime}
                            </div>
                            <div className="flex-1">
                              {isEditing ? (
                                <Input
                                  value={event.title}
                                  onChange={(e) => {
                                    const newLocations = [...callData.locations];
                                    const originalEventIdx = newLocations[locationIndex].events.findIndex(ev => ev.id === event.id);
                                    newLocations[locationIndex].events[originalEventIdx].title = e.target.value;
                                    setCallData(prev => ({ ...prev, locations: newLocations }));
                                  }}
                                  className="font-medium text-sm"
                                />
                              ) : (
                                <div>
                                  <div className="text-sm font-bold text-gray-800">
                                    {event.title}
                                  </div>
                                  {event.cast.length > 0 && (
                                    <div className="text-xs text-gray-600 mt-1 ml-4">
                                      {event.cast.join(', ')}
                                    </div>
                                  )}
                                  {event.notes && (
                                    <div className="text-xs text-gray-500 italic mt-1 ml-4">{event.notes}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {isEditing && (
                          <Button 
                            onClick={() => addEvent(locationIndex)} 
                            variant="ghost" 
                            size="sm"
                            className="w-full mt-4"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Event
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Full-width END-OF-DAY events */}
                {(callData.locations || []).some(location => 
                  (location.events || []).some(event => event.title === 'END-OF-DAY')
                ) && (
                  <div className="space-y-1">
                    {(callData.locations || []).flatMap(location => 
                      (location.events || []).filter(event => event.title === 'END-OF-DAY')
                    ).map((event, index) => (
                      <div key={`end-of-day-${index}`} className="bg-gray-100 py-1">
                        <div className="flex items-center">
                          <div className="w-20 text-sm font-medium text-gray-700"></div>
                          <div className="flex-1">
                            <div className="text-sm font-bold text-gray-900">
                              {event.title}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>



          {/* Announcements Section */}
          <Card className="mt-6">
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