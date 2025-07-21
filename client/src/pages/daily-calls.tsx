import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import { format, parseISO } from "date-fns";
import { Calendar, Plus, Save, FileText, ChevronLeft, Users, Edit } from "lucide-react";
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
import { CastSelector } from "@/components/cast-selector";
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

  // Fetch show settings for time format
  const { data: showSettings } = useQuery({
    queryKey: ['/api/projects', actualProjectId, 'settings'],
    enabled: !!actualProjectId,
  });

  // Fetch event locations with their types
  const { data: eventLocations = [] } = useQuery({
    queryKey: ['/api/projects', actualProjectId, 'event-locations'],
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
      // Also invalidate schedule events since we're now syncing changes back to them
      queryClient.invalidateQueries({ queryKey: ['/api/projects', actualProjectId, 'schedule-events'] });
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
        
        // Get actual cast members called to this event (filter to only cast category)
        const eventCast = (event.participants || [])
          .filter(participant => {
            // Find the contact to check their category
            const contact = contacts.find(c => c.id === participant.contactId);
            return participant.isRequired && contact && contact.category === 'cast';
          })
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
        
        // Determine end-of-day time based on the last event's END time (not start time)
        let endOfDayTime = formatTimeDisplay('23:59', timeFormat as '12' | '24'); // Default fallback with proper formatting
        if (sortedEvents.length > 0) {
          // Find the event with the latest END time, not just the last in start time order
          const eventWithLatestEndTime = sortedEvents.reduce((latest, current) => {
            // Compare raw end times (HH:MM format) to find the actual latest ending event
            const latestEndTime = latest.endTime.replace(/[AP]M/i, '').trim();
            const currentEndTime = current.endTime.replace(/[AP]M/i, '').trim();
            return currentEndTime > latestEndTime ? current : latest;
          });
          // The endTime is already formatted from formatTimeDisplay above, so use it directly
          endOfDayTime = eventWithLatestEndTime.endTime;

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
            // Determine end-of-day time based on the last event's END time (not start time)
            let endOfDayTime = formatTimeDisplay('23:59', timeFormat as '12' | '24'); // Default fallback with proper formatting
            if (events.length > 0) {
              // Find the event with the latest END time, not just the last in start time order
              const eventWithLatestEndTime = events.reduce((latest, current) => {
                // Compare raw end times to find the actual latest ending event
                const latestEndTime = latest.endTime?.replace(/[AP]M/i, '').trim() || '00:00';
                const currentEndTime = current.endTime?.replace(/[AP]M/i, '').trim() || '00:00';
                return currentEndTime > latestEndTime ? current : latest;
              });
              endOfDayTime = eventWithLatestEndTime.endTime || formatTimeDisplay('23:59', timeFormat as '12' | '24');
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
    } else if (actualProjectId && !existingDailyCall && scheduleEvents.length >= 0) {
      // Auto-generate from schedule events for the selected date (even if no events exist)
      generateCallFromSchedule();
    }
  }, [existingDailyCall, selectedDate, actualProjectId, scheduleEvents, contacts, timeFormat]);

  // Date picker navigation function
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const selectedDateStr = format(date, 'yyyy-MM-dd');
      setLocation(`/shows/${actualProjectId}/calls/${selectedDateStr}`);
      setDatePickerOpen(false);
    }
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
        startTime: formatTimeDisplay('23:59', timeFormat as '12' | '24'), // Default when no events exist with proper formatting
        endTime: formatTimeDisplay('23:59', timeFormat as '12' | '24'),
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-gray-900">
              {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
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
              <Button onClick={() => setIsEditing(true)} variant="ghost" size="icon" className="border-0 hover:bg-transparent">
                <Edit className="h-4 w-4 hover:text-blue-600 transition-colors" />
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
                      {(location.events || []).filter(event => event.title !== 'END-OF-DAY').map((event, eventIdx) => (
                        <div key={event.id} className="flex items-start gap-6 py-2">
                          <div className="w-20 text-sm font-medium text-gray-700 flex-shrink-0">
                            {isEditing ? (
                              <Input
                                value={event.startTime}
                                onChange={(e) => {
                                  const newLocations = [...callData.locations];
                                  const originalEventIdx = newLocations[locationIndex].events.findIndex(ev => ev.id === event.id);
                                  newLocations[locationIndex].events[originalEventIdx].startTime = e.target.value;
                                  setCallData(prev => ({ ...prev, locations: newLocations }));
                                }}
                                className="text-xs w-16"
                                placeholder="9:00 AM"
                              />
                            ) : event.startTime}
                          </div>
                          <div className="flex-1">
                            <div>
                              <div className="text-sm font-bold text-gray-800">
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
                                  event.title
                                )}
                              </div>
                              {isEditing ? (
                                <div className="mt-2">
                                  <Label className="text-xs font-medium text-gray-600">Cast Called:</Label>
                                  <div className="mt-1">
                                    <CastSelector
                                      contacts={contacts}
                                      selectedCast={event.cast}
                                      onChange={(newCast) => {
                                        const newLocations = [...callData.locations];
                                        const originalEventIdx = newLocations[locationIndex].events.findIndex(ev => ev.id === event.id);
                                        newLocations[locationIndex].events[originalEventIdx].cast = newCast;
                                        setCallData(prev => ({ ...prev, locations: newLocations }));
                                      }}
                                      placeholder="Type to search cast members..."
                                    />
                                  </div>
                                </div>
                              ) : (
                                event.cast && event.cast.length > 0 && (
                                  <div className="text-xs text-black mt-1">
                                    {event.cast.join(', ')}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {/* Single calculated END-OF-DAY for single location */}
                {(() => {
                  // Find the latest event time across all locations
                  const allEvents = (callData.locations || []).flatMap(location => 
                    (location.events || []).filter(event => event.title !== 'END-OF-DAY')
                  );
                  
                  if (allEvents.length === 0) return null;
                  
                  // Find the latest time
                  const latestEvent = allEvents.reduce((latest, current) => {
                    const currentTime = current.startTime || '00:00';
                    const latestTime = latest.startTime || '00:00';
                    return currentTime > latestTime ? current : latest;
                  });
                  
                  // Calculate END-OF-DAY time (add 30 minutes to latest event)
                  const calculateEndTime = (startTime) => {
                    if (!startTime) return 'END-OF-DAY';
                    
                    // Parse time - handle both 12-hour and 24-hour formats
                    let hours, minutes;
                    
                    // Check if it has AM/PM (12-hour format)
                    const twelveHourMatch = startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                    if (twelveHourMatch) {
                      hours = parseInt(twelveHourMatch[1]);
                      minutes = parseInt(twelveHourMatch[2]);
                      const isPM = twelveHourMatch[3].toUpperCase() === 'PM';
                      
                      // Convert to 24-hour format
                      if (isPM && hours !== 12) hours += 12;
                      if (!isPM && hours === 12) hours = 0;
                    } else {
                      // Assume 24-hour format (HH:MM)
                      const twentyFourHourMatch = startTime.match(/(\d{1,2}):(\d{2})/);
                      if (!twentyFourHourMatch) return 'END-OF-DAY';
                      
                      hours = parseInt(twentyFourHourMatch[1]);
                      minutes = parseInt(twentyFourHourMatch[2]);
                    }
                    
                    // Add 30 minutes
                    minutes += 30;
                    if (minutes >= 60) {
                      hours += 1;
                      minutes -= 60;
                    }
                    
                    // Get time format from show settings (default to 12-hour)
                    const scheduleSettings = parseScheduleSettings((showSettings as any)?.scheduleSettings);
                    const timeFormat = scheduleSettings?.timeFormat || '12h';
                    
                    // Format according to show settings
                    if (timeFormat === '24h') {
                      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    } else {
                      // 12-hour format
                      const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
                      const ampm = hours >= 12 ? 'PM' : 'AM';
                      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
                    }
                  };
                  
                  const endTime = calculateEndTime(latestEvent.startTime);
                  
                  return (
                    <div className="bg-gray-100 py-1">
                      <div className="flex items-center">
                        <div className="w-20 text-sm font-medium text-gray-700">
                          <span className="font-bold">{endTime}</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-gray-900">
                            END-OF-DAY
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              // Multiple locations - 2/3 and 1/3 layout with full-width END-OF-DAY
              <div className="space-y-4">
                {/* Regular events in grid layout */}
                <div className="grid grid-cols-3 gap-8">
                  {/* Main locations in left 2/3 columns */}
                  <div className="col-span-2 space-y-6">
                    {(callData.locations || [])
                      .filter(location => {
                        const eventLocation = eventLocations.find(el => el.name === location.name);
                        return !eventLocation || eventLocation.locationType === 'main';
                      })
                      .map((location, locationIndex) => (
                    <div key={locationIndex} className="space-y-3">
                      <div className="space-y-2">
                        <div className="border-b-2 border-black pb-2">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {location.name}
                          </h4>
                        </div>
                        
                        {/* Regular events for this location */}
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
                              <div>
                                <div className="text-sm font-bold text-gray-800">
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
                                    event.title
                                  )}
                                </div>
                                {isEditing ? (
                                  <div className="mt-2">
                                    <Label className="text-xs font-medium text-gray-600">Cast Called:</Label>
                                    <div className="mt-1">
                                      <CastSelector
                                        contacts={contacts}
                                        selectedCast={event.cast}
                                        onChange={(newCast) => {
                                          const newLocations = [...callData.locations];
                                          const originalEventIdx = newLocations[locationIndex].events.findIndex(ev => ev.id === event.id);
                                          newLocations[locationIndex].events[originalEventIdx].cast = newCast;
                                          setCallData(prev => ({ ...prev, locations: newLocations }));
                                        }}
                                        placeholder="Type to search cast members..."
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  event.cast && event.cast.length > 0 && (
                                    <div className="text-xs text-black mt-1">
                                      {event.cast.join(', ')}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  </div>
                  
                  {/* Auxiliary locations in right 1/3 column */}
                  <div className="col-span-1 space-y-6">
                    {(callData.locations || [])
                      .filter(location => {
                        const eventLocation = eventLocations.find(el => el.name === location.name);
                        return eventLocation && eventLocation.locationType === 'auxiliary';
                      })
                      .map((location, auxLocationIndex) => (
                    <div key={auxLocationIndex} className="space-y-3">
                      <div className="space-y-2">
                        <div className="border-b-2 border-black pb-2">
                          <h4 className="text-lg font-semibold text-gray-900">
                            {location.name}
                          </h4>
                        </div>
                        {(location.events || []).filter(event => event.title !== 'END-OF-DAY').map((event, eventIdx) => (
                          <div key={event.id} className="flex items-start gap-4 py-2">
                            <div className="w-16 text-sm font-medium text-gray-700 flex-shrink-0">
                              {isEditing ? (
                                <Input
                                  value={event.startTime}
                                  onChange={(e) => {
                                    const newLocations = [...callData.locations];
                                    const actualLocationIndex = callData.locations.findIndex(loc => loc.name === location.name);
                                    const originalEventIdx = newLocations[actualLocationIndex].events.findIndex(ev => ev.id === event.id);
                                    newLocations[actualLocationIndex].events[originalEventIdx].startTime = e.target.value;
                                    setCallData(prev => ({ ...prev, locations: newLocations }));
                                  }}
                                  className="text-xs w-14"
                                  placeholder="9:00 AM"
                                />
                              ) : event.startTime}
                            </div>
                            <div className="flex-1">
                              <div>
                                <div className="text-sm font-bold text-gray-800">
                                  {isEditing ? (
                                    <Input
                                      value={event.title}
                                      onChange={(e) => {
                                        const newLocations = [...callData.locations];
                                        const actualLocationIndex = callData.locations.findIndex(loc => loc.name === location.name);
                                        const originalEventIdx = newLocations[actualLocationIndex].events.findIndex(ev => ev.id === event.id);
                                        newLocations[actualLocationIndex].events[originalEventIdx].title = e.target.value;
                                        setCallData(prev => ({ ...prev, locations: newLocations }));
                                      }}
                                      className="font-medium text-sm"
                                    />
                                  ) : (
                                    event.title
                                  )}
                                </div>
                                {isEditing ? (
                                  <div className="mt-2">
                                    <Label className="text-xs font-medium text-gray-600">Cast Called:</Label>
                                    <div className="mt-1">
                                      <CastSelector
                                        contacts={contacts}
                                        selectedCast={event.cast}
                                        onChange={(newCast) => {
                                          const newLocations = [...callData.locations];
                                          const actualLocationIndex = callData.locations.findIndex(loc => loc.name === location.name);
                                          const originalEventIdx = newLocations[actualLocationIndex].events.findIndex(ev => ev.id === event.id);
                                          newLocations[actualLocationIndex].events[originalEventIdx].cast = newCast;
                                          setCallData(prev => ({ ...prev, locations: newLocations }));
                                        }}
                                        placeholder="Type to search cast members..."
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  event.cast && event.cast.length > 0 && (
                                    <div className="text-xs text-black mt-1">
                                      {event.cast.join(', ')}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  </div>
                </div>

                {/* Single calculated END-OF-DAY */}
                {(() => {
                  // Find the latest event time across all locations
                  const allEvents = (callData.locations || []).flatMap(location => 
                    (location.events || []).filter(event => event.title !== 'END-OF-DAY')
                  );
                  
                  if (allEvents.length === 0) return null;
                  
                  // Find the latest time
                  const latestEvent = allEvents.reduce((latest, current) => {
                    const currentTime = current.startTime || '00:00';
                    const latestTime = latest.startTime || '00:00';
                    return currentTime > latestTime ? current : latest;
                  });
                  
                  // Calculate END-OF-DAY time (add 30 minutes to latest event)
                  const calculateEndTime = (startTime) => {
                    if (!startTime) return 'END-OF-DAY';
                    
                    // Parse time - handle both 12-hour and 24-hour formats
                    let hours, minutes;
                    
                    // Check if it has AM/PM (12-hour format)
                    const twelveHourMatch = startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                    if (twelveHourMatch) {
                      hours = parseInt(twelveHourMatch[1]);
                      minutes = parseInt(twelveHourMatch[2]);
                      const isPM = twelveHourMatch[3].toUpperCase() === 'PM';
                      
                      // Convert to 24-hour format
                      if (isPM && hours !== 12) hours += 12;
                      if (!isPM && hours === 12) hours = 0;
                    } else {
                      // Assume 24-hour format (HH:MM)
                      const twentyFourHourMatch = startTime.match(/(\d{1,2}):(\d{2})/);
                      if (!twentyFourHourMatch) return 'END-OF-DAY';
                      
                      hours = parseInt(twentyFourHourMatch[1]);
                      minutes = parseInt(twentyFourHourMatch[2]);
                    }
                    
                    // Add 30 minutes
                    minutes += 30;
                    if (minutes >= 60) {
                      hours += 1;
                      minutes -= 60;
                    }
                    
                    // Get time format from show settings (default to 12-hour)
                    const scheduleSettings = parseScheduleSettings((showSettings as any)?.scheduleSettings);
                    const timeFormat = scheduleSettings?.timeFormat || '12h';
                    
                    // Format according to show settings
                    if (timeFormat === '24h') {
                      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    } else {
                      // 12-hour format
                      const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
                      const ampm = hours >= 12 ? 'PM' : 'AM';
                      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
                    }
                  };
                  
                  const endTime = calculateEndTime(latestEvent.startTime);
                  
                  return (
                    <div className="bg-gray-100 py-1">
                      <div className="flex items-center">
                        <div className="w-20 text-sm font-medium text-gray-700">
                          <span className="font-bold">{endTime}</span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-gray-900">
                            END-OF-DAY
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
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