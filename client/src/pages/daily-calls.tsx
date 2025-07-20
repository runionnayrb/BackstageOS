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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { parseScheduleSettings, formatTimeDisplay } from "@/lib/timeUtils";
import type { DailyCall, Project, Contact, ScheduleEvent } from "@shared/schema";

interface DailyCallSheetParams {
  id: string;
  date: string;
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

export default function DailyCallSheet() {
  const [, setLocation] = useLocation();
  const params = useParams<DailyCallSheetParams>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const actualProjectId = params.id;
  const selectedDate = params.date;
  
  // Check if we're in edit mode from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const [isEditing, setIsEditing] = useState(urlParams.get('edit') === 'true');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
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

  // Fetch all daily calls for navigation
  const { data: allDailyCalls = [] } = useQuery({
    queryKey: ['/api/projects', actualProjectId, 'daily-calls-list'],
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
      // The existingDailyCall might have a different structure from the database
      // Check if it already has the structured format we expect
      if (existingDailyCall.locations && Array.isArray(existingDailyCall.locations) && 
          existingDailyCall.locations.length > 0 && 
          typeof existingDailyCall.locations[0] === 'object' && 
          'events' in existingDailyCall.locations[0]) {
        // Already structured - just ensure END-OF-DAY events
        const locationsWithEndOfDay = (existingDailyCall.locations as CallLocation[]).map(location => {
          const events = location.events || [];
          const hasEndOfDay = events.some(event => event.title === 'END-OF-DAY');
          if (!hasEndOfDay) {
            // Determine end-of-day time based on the last event's end time
            let endOfDayTime = '23:59'; // Default fallback
            if (events.length > 0) {
              const sortedEvents = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));
              const lastEvent = sortedEvents[sortedEvents.length - 1];
              endOfDayTime = lastEvent.endTime;
            }
            
            return {
              ...location,
              events: [...events, {
                id: -1,
                title: 'END-OF-DAY',
                startTime: endOfDayTime,
                endTime: endOfDayTime,
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
      } else {
        // Raw database format - need to transform
        generateCallFromSchedule();
      }
    } else if (actualProjectId && !existingDailyCall) {
      // Auto-generate from schedule events for the selected date (even if no events exist)
      generateCallFromSchedule();
    }
  }, [existingDailyCall, selectedDate, actualProjectId]);

  // Date picker navigation function
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const selectedDateStr = format(date, 'yyyy-MM-dd');
      setLocation(`/shows/${actualProjectId}/calls/${selectedDateStr}`);
      setDatePickerOpen(false);
    }
  };

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
      
      // Get actual participants called to this event
      const eventCast = (event.participants || [])
        .filter(participant => participant.isRequired) // Only show required participants
        .map(participant => `${participant.contactFirstName.charAt(0)}. ${participant.contactLastName}`);
      
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
      
      // Determine end-of-day time based on the last event's end time
      let endOfDayTime = '23:59'; // Default fallback
      if (sortedEvents.length > 0) {
        const lastEvent = sortedEvents[sortedEvents.length - 1];
        endOfDayTime = lastEvent.endTime;
      }
      
      // Add END-OF-DAY event at the end
      sortedEvents.push({
        id: -1, // Special ID for END-OF-DAY
        title: 'END-OF-DAY',
        startTime: endOfDayTime,
        endTime: endOfDayTime,
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
        startTime: '23:59', // Default when no events exist
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
      locations: prev.locations.map((loc, idx) => {
        if (idx === locationIndex) {
          const allEventsExceptEndOfDay = (loc.events || []).filter(event => event.title !== 'END-OF-DAY');
          const sortedEvents = [...allEventsExceptEndOfDay, newEvent].sort((a, b) => a.startTime.localeCompare(b.startTime));
          
          // Determine end-of-day time based on the last event's end time
          let endOfDayTime = '23:59'; // Default fallback
          if (sortedEvents.length > 0) {
            const lastEvent = sortedEvents[sortedEvents.length - 1];
            endOfDayTime = lastEvent.endTime;
          }
          
          return {
            ...loc,
            events: [
              ...sortedEvents,
              // Always add END-OF-DAY at the end with correct time
              {
                id: -1,
                title: 'END-OF-DAY',
                startTime: endOfDayTime,
                endTime: endOfDayTime,
                cast: [],
                notes: undefined
              }
            ]
          };
        }
        return loc;
      })
    }));
    setIsEditing(true);
  };

  // Helper function to update END-OF-DAY time for a location
  const updateEndOfDayTime = (events: Array<{ id: number; title: string; startTime: string; endTime: string; cast: string[]; notes?: string; }>) => {
    const nonEndOfDayEvents = events.filter(event => event.title !== 'END-OF-DAY');
    let endOfDayTime = '23:59'; // Default fallback
    
    if (nonEndOfDayEvents.length > 0) {
      const sortedEvents = [...nonEndOfDayEvents].sort((a, b) => a.startTime.localeCompare(b.startTime));
      const lastEvent = sortedEvents[sortedEvents.length - 1];
      endOfDayTime = lastEvent.endTime;
    }
    
    return [
      ...nonEndOfDayEvents,
      {
        id: -1,
        title: 'END-OF-DAY',
        startTime: endOfDayTime,
        endTime: endOfDayTime,
        cast: [],
        notes: undefined
      }
    ];
  };

  const updateEvent = (locationIndex: number, eventIndex: number, updatedEvent: any) => {
    setCallData(prev => ({
      ...prev,
      locations: prev.locations.map((loc, locIdx) => {
        if (locIdx === locationIndex) {
          const updatedEvents = loc.events.map((event, evtIdx) => 
            evtIdx === eventIndex ? { ...event, ...updatedEvent } : event
          );
          return {
            ...loc,
            events: updateEndOfDayTime(updatedEvents)
          };
        }
        return loc;
      })
    }));
    setIsEditing(true);
  };

  const removeEvent = (locationIndex: number, eventIndex: number) => {
    setCallData(prev => ({
      ...prev,
      locations: prev.locations.map((loc, locIdx) => {
        if (locIdx === locationIndex) {
          const filteredEvents = loc.events.filter((_, evtIdx) => evtIdx !== eventIndex);
          return {
            ...loc,
            events: updateEndOfDayTime(filteredEvents)
          };
        }
        return loc;
      })
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
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(`/shows/${actualProjectId}/calls`)}
            className="text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Daily Calls
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Daily Call - {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
            </h1>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <button className="p-1 focus:outline-none">
                  <Calendar className="h-4 w-4 text-gray-600 hover:text-blue-600 transition-colors" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={parseISO(selectedDate)}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center space-x-3">
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Edit Call
              </Button>
            )}
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
                    <div className="border-b-2 border-black pb-2">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {location.name}
                      </h4>
                    </div>
                    
                    <div className="space-y-2">
                      {(location.events || []).map((event, eventIdx) => (
                        <div key={event.id} className={`flex items-start gap-6 ${event.title === 'END-OF-DAY' ? 'bg-gray-100 py-1 relative' : 'py-2'}`}>
                          {/* Add Event Button in Left Margin - only show on END-OF-DAY row */}
                          {isEditing && event.title === 'END-OF-DAY' && (
                            <Button
                              onClick={() => addEvent(locationIndex)}
                              variant="ghost"
                              size="sm"
                              className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-6 p-0 opacity-0 hover:opacity-100 transition-opacity duration-200 bg-transparent hover:bg-transparent text-black"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          )}
                          <div className="w-20 text-sm font-medium text-gray-700 flex-shrink-0">
                            {event.title === 'END-OF-DAY' ? (
                              <span className="font-bold">{event.startTime}</span>
                            ) : (
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
                                  <div className="text-xs text-black mt-1">
                                    {event.cast.join(', ')}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      

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
                      <div className="border-b-2 border-black pb-2">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {location.name}
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
                                    <div className="text-xs text-black mt-1">
                                      {event.cast.join(', ')}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        

                      </div>
                    </div>
                  ))}
                </div>

                {/* Full-width END-OF-DAY events */}
                {(callData.locations || []).some(location => 
                  (location.events || []).some(event => event.title === 'END-OF-DAY')
                ) && (
                  <div className="space-y-1">
                    {(callData.locations || []).flatMap((location, locationIndex) => 
                      (location.events || [])
                        .filter(event => event.title === 'END-OF-DAY')
                        .map(event => ({ event, locationIndex }))
                    ).map(({ event, locationIndex }, index) => (
                      <div key={`end-of-day-${index}`} className="bg-gray-100 py-1 relative">
                        {/* Add Event Button in Left Margin - only show on first END-OF-DAY row */}
                        {isEditing && index === 0 && (
                          <Button
                            onClick={() => addEvent(locationIndex)}
                            variant="ghost"
                            size="sm"
                            className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-6 p-0 opacity-0 hover:opacity-100 transition-opacity duration-200 bg-transparent hover:bg-transparent text-black"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                        <div className="flex items-center">
                          <div className="w-20 text-sm font-medium text-gray-700">
                            <span className="font-bold">{event.startTime}</span>
                          </div>
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
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Announcements</h3>
            {isEditing ? (
              <Textarea
                value={callData.announcements}
                onChange={(e) => setCallData(prev => ({ ...prev, announcements: e.target.value }))}
                placeholder="Enter general announcements, notes, or reminders for the company..."
                className="min-h-20 border-2 border-black"
              />
            ) : (
              <div className="min-h-20 text-sm text-gray-700 whitespace-pre-wrap border-2 border-black p-3">
                {callData.announcements || 'No announcements for today.'}
              </div>
            )}
          </div>



          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <div className="font-bold text-black text-xs mb-2" style={{ fontSize: '12px' }}>SUBJECT TO CHANGE</div>
            <div className="text-xs text-gray-600" style={{ fontSize: '12px' }}>Page 1 of 1</div>
          </div>
        </div>
      </div>
    </div>
  );
}