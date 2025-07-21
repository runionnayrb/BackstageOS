import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import { format, parseISO } from "date-fns";
import { Calendar, Plus, Save, FileText, ChevronLeft, Users, Edit, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
    fittingsEvents?: any[];
    appointmentsEvents?: any[];
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

  // Fetch event locations to map location names to types
  const { data: eventLocations = [] } = useQuery({
    queryKey: [`/api/projects/${actualProjectId}/event-locations`],
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
    if (existingDailyCall) {
      // The existingDailyCall might have a different structure from the database
      // Check if it already has the structured format we expect
      if (existingDailyCall.locations && Array.isArray(existingDailyCall.locations) && 
          existingDailyCall.locations.length > 0 && 
          typeof existingDailyCall.locations[0] === 'object' && 
          'events' in existingDailyCall.locations[0]) {
        // Force regeneration from schedule to fix duplicate END-OF-DAY issue
        generateCallFromSchedule();
        return; // Early return to avoid setting stale data
      } else {
        // Raw database format - need to transform
        generateCallFromSchedule();
      }
    } else if (actualProjectId && !existingDailyCall) {
      // Auto-generate from schedule events for the selected date (even if no events exist)
      generateCallFromSchedule();
    }
  }, [existingDailyCall, selectedDate, actualProjectId, timeFormat, scheduleEvents, eventLocations]); // Include scheduleEvents and eventLocations to regenerate when data loads

  // Date picker navigation function
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const selectedDateStr = format(date, 'yyyy-MM-dd');
      setLocation(`/shows/${actualProjectId}/calls/${selectedDateStr}`);
      setDatePickerOpen(false);
    }
  };

  const generateCallFromSchedule = () => {
    if (!actualProjectId || !scheduleEvents || !eventLocations) return;

    // Filter events for the selected date - handle different date formats
    const dayEvents = scheduleEvents.filter(event => {
      try {
        // Handle different possible date formats in the event data
        let eventDateStr = '';
        if (event.date) {
          eventDateStr = event.date;
        } else if (event.startTime) {
          // Extract date from startTime if needed
          const dateFromStartTime = new Date(event.startTime).toISOString().split('T')[0];
          eventDateStr = dateFromStartTime;
        }
        
        return eventDateStr === selectedDate;
      } catch (error) {
        console.warn('Error parsing date for event:', event);
        return false;
      }
    });
    
    // Group events by location type (Main, Auxiliary, Fittings, Appointments)
    const locationTypeGroups: { [key: string]: any[] } = {
      main: [],
      auxiliary: [],
      fittings: [],
      appointments: []
    };
    
    // If there are schedule events for the day, group them by location type
    dayEvents.forEach(event => {
      const eventLocation = eventLocations.find(loc => loc.name === event.location);
      const locationType = eventLocation?.locationType || 'main'; // Default to main if not found
      
      if (!locationTypeGroups[locationType]) {
        locationTypeGroups[locationType] = [];
      }
      
      // Get actual cast members called to this event (filter by contact category = 'cast')
      const eventCast = (event.participants || [])
        .filter(participant => {
          if (!participant.isRequired) return false;
          
          // Find the actual contact to get the category
          const contact = contacts.find(c => c.id === participant.contactId);
          return contact && contact.category === 'cast';
        })
        .map(participant => `${participant.contactFirstName.charAt(0)}. ${participant.contactLastName}`);
      
      const processedEvent = {
        id: event.id,
        title: event.title,
        startTime: formatTimeDisplay(event.startTime?.slice(0, 5) || event.startTime, timeFormat as '12' | '24'),
        endTime: formatTimeDisplay(event.endTime?.slice(0, 5) || event.endTime, timeFormat as '12' | '24'),
        cast: eventCast,
        notes: event.notes || event.description,
        location: event.location // Keep location name for display
      };
      
      locationTypeGroups[locationType].push(processedEvent);
    });

    // Calculate single END-OF-DAY time for the entire day (latest end time across all events)
    let globalEndOfDayTime = formatTimeDisplay('23:59', timeFormat as '12' | '24'); // Default fallback
    const allEventsAcrossTypes = Object.values(locationTypeGroups).flat();
    if (allEventsAcrossTypes.length > 0) {
      // Find the latest end time across all events on this day
      const latestEndTime = allEventsAcrossTypes.reduce((latest, event) => {
        return event.endTime > latest ? event.endTime : latest;
      }, '00:00');
      globalEndOfDayTime = latestEndTime;
    }

    // Group events by actual location names within each location type
    const mainLocationGroups: { [key: string]: any[] } = {};
    const auxiliaryLocationGroups: { [key: string]: any[] } = {};
    
    // Group main events by location name
    locationTypeGroups.main.forEach(event => {
      const locationName = event.location || 'Main Location';
      if (!mainLocationGroups[locationName]) {
        mainLocationGroups[locationName] = [];
      }
      mainLocationGroups[locationName].push(event);
    });
    
    // Group auxiliary events by location name  
    locationTypeGroups.auxiliary.forEach(event => {
      const locationName = event.location || 'Auxiliary Location';
      if (!auxiliaryLocationGroups[locationName]) {
        auxiliaryLocationGroups[locationName] = [];
      }
      auxiliaryLocationGroups[locationName].push(event);
    });

    // Create the main locations array for two-column layout
    const locations: CallLocation[] = [];
    
    // Get the main location names (left column)
    const mainLocationNames = Object.keys(mainLocationGroups);
    if (mainLocationNames.length > 0) {
      // For now, take the first main location for left column
      const mainLocationName = mainLocationNames[0];
      const mainEvents = mainLocationGroups[mainLocationName].sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      // Add END-OF-DAY to the first (main) location
      mainEvents.push({
        id: -1,
        title: 'END-OF-DAY',
        startTime: globalEndOfDayTime,
        endTime: globalEndOfDayTime,
        cast: [],
        notes: undefined,
        location: ''
      });
      
      locations.push({
        name: mainLocationName,
        events: mainEvents,
        locationType: 'main'
      });
    }
    
    // Get the auxiliary location names (right column)
    const auxiliaryLocationNames = Object.keys(auxiliaryLocationGroups);
    if (auxiliaryLocationNames.length > 0) {
      // Take the first auxiliary location for right column
      const auxiliaryLocationName = auxiliaryLocationNames[0];
      const auxiliaryEvents = auxiliaryLocationGroups[auxiliaryLocationName].sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      locations.push({
        name: auxiliaryLocationName,
        events: auxiliaryEvents,
        locationType: 'auxiliary'
      });
    }

    // Also store fittings and appointments data for conditional sections
    setCallData(prev => ({
      ...prev,
      locations,
      fittingsEvents: locationTypeGroups.fittings,
      appointmentsEvents: locationTypeGroups.appointments
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

  // Helper function to update END-OF-DAY time for the entire day (single END-OF-DAY)
  const updateGlobalEndOfDay = (locations: CallLocation[]) => {
    // Remove all existing END-OF-DAY events from all locations
    const locationsWithoutEndOfDay = locations.map(location => ({
      ...location,
      events: location.events.filter(event => event.title !== 'END-OF-DAY')
    }));

    // Calculate global end-of-day time across all locations
    let globalEndOfDayTime = formatTimeDisplay('23:59', timeFormat as '12' | '24');
    const allEvents = locationsWithoutEndOfDay.flatMap(loc => loc.events);
    
    if (allEvents.length > 0) {
      const latestEndTime = allEvents.reduce((latest, event) => {
        return event.endTime > latest ? event.endTime : latest;
      }, '00:00');
      globalEndOfDayTime = latestEndTime;
    }

    // Add END-OF-DAY only to the first location
    return locationsWithoutEndOfDay.map((location, index) => {
      if (index === 0) {
        return {
          ...location,
          events: [...location.events, {
            id: -1,
            title: 'END-OF-DAY',
            startTime: globalEndOfDayTime,
            endTime: globalEndOfDayTime,
            cast: [],
            notes: undefined
          }]
        };
      }
      return location;
    });
  };

  const updateEvent = (locationIndex: number, eventIndex: number, updatedEvent: any) => {
    setCallData(prev => {
      const updatedLocations = prev.locations.map((loc, locIdx) => {
        if (locIdx === locationIndex) {
          const updatedEvents = loc.events.map((event, evtIdx) => 
            evtIdx === eventIndex ? { ...event, ...updatedEvent } : event
          );
          return {
            ...loc,
            events: updatedEvents
          };
        }
        return loc;
      });
      
      return {
        ...prev,
        locations: updateGlobalEndOfDay(updatedLocations)
      };
    });
    setIsEditing(true);
  };

  const removeEvent = (locationIndex: number, eventIndex: number) => {
    setCallData(prev => {
      const updatedLocations = prev.locations.map((loc, locIdx) => {
        if (locIdx === locationIndex) {
          const filteredEvents = loc.events.filter((_, evtIdx) => evtIdx !== eventIndex);
          return {
            ...loc,
            events: filteredEvents
          };
        }
        return loc;
      });
      
      return {
        ...prev,
        locations: updateGlobalEndOfDay(updatedLocations)
      };
    });
    setIsEditing(true);
  };

  const formatCastList = (cast: string[]) => {
    if (cast.length === 0) return 'TBD';
    return cast.join(', ');
  };

  const exportToPDF = async () => {
    if (!project) return;
    
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = await import('html2canvas');
      
      // Get the daily call content element
      const element = document.getElementById('daily-call-content');
      if (!element) {
        toast({
          title: "Export failed",
          description: "Unable to find content to export",
          variant: "destructive"
        });
        return;
      }
      
      // Safari-specific optimizations
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      // Create PDF with higher quality settings
      const pdf = new jsPDF('p', 'mm', 'letter');
      
      // Set high-quality rendering
      pdf.internal.scaleFactor = 2.83; // 300 DPI equivalent
      
      // Create canvas with much higher resolution for crisp text
      const canvas = await html2canvas.default(element, {
        scale: 3, // Higher scale for better text quality
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        // Enhanced quality options
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('daily-call-content');
          if (clonedElement) {
            // Set explicit font settings for better rendering
            clonedElement.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            clonedElement.style.webkitFontSmoothing = 'antialiased';
            clonedElement.style.mozOsxFontSmoothing = 'grayscale';
            clonedElement.style.textRendering = 'optimizeLegibility';
            
            // Remove border and shadow to make it look like a clean document
            clonedElement.style.border = 'none';
            clonedElement.style.boxShadow = 'none';
            clonedElement.style.borderRadius = '0';
            clonedElement.style.padding = '20px'; // Reduced padding for tighter margins
            
            // Fix END-OF-DAY text alignment by making gray row taller and centering text
            const grayRows = clonedElement.querySelectorAll('.bg-gray-100');
            grayRows.forEach(row => {
              if (row.textContent?.includes('END-OF-DAY')) {
                // Make the gray row taller
                row.style.paddingTop = '8px';
                row.style.paddingBottom = '8px';
                row.style.minHeight = '36px';
                
                // Find all text-containing elements and center them
                const allTextElements = row.querySelectorAll('*');
                allTextElements.forEach(el => {
                  if (el.textContent && (el.textContent.includes('END-OF-DAY') || el.textContent.includes('14:00'))) {
                    el.style.lineHeight = '1.2';
                    el.style.margin = '0';
                    el.style.padding = '0';
                  }
                });
              }
            });

          }
        }
      });
      
      // Convert canvas to high-quality image data
      let imgData;
      try {
        imgData = canvas.toDataURL('image/png', 1.0); // Maximum quality PNG
      } catch (canvasError) {
        console.warn('Canvas toDataURL failed, trying JPEG:', canvasError);
        imgData = canvas.toDataURL('image/jpeg', 1.0); // Maximum quality JPEG
      }
      
      // Calculate dimensions to fit on letter size page with minimal margins
      const pageWidth = 215.9; // Letter width in mm
      const pageHeight = 279.4; // Letter height in mm
      const marginMm = 8; // Much smaller margins to match app interface more closely
      const imgWidth = pageWidth - (marginMm * 2); // Margins on both sides
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add image to PDF with maximum quality and minimal margins
      pdf.addImage(imgData, 'PNG', marginMm, marginMm, imgWidth, Math.min(imgHeight, pageHeight - (marginMm * 2)), '', 'FAST');
      
      // Generate filename and save with Safari-friendly approach
      const formattedDate = format(parseISO(selectedDate), 'yyyy-MM-dd');
      const filename = `${formattedDate}-${project.name}-Daily Call.pdf`;
      
      // Use a timeout to ensure Safari processes the PDF generation properly
      setTimeout(() => {
        pdf.save(filename);
        toast({
          title: "PDF Downloaded",
          description: "Daily call sheet has been exported as PDF.",
        });
      }, isSafari ? 100 : 0);
      
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Export Error",
        description: `Failed to export daily call sheet as PDF${error.message ? ': ' + error.message : '.'}`,
        variant: "destructive",
      });
    }
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
            <Button onClick={exportToPDF} variant="ghost" size="icon" className="border-0 hover:bg-transparent">
              <Download className="h-4 w-4 hover:text-blue-600 transition-colors" />
            </Button>
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
        <div id="daily-call-content" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Call Sheet Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">{project?.name}</h2>
            <h3 className="text-xl text-black mt-2">DAILY SCHEDULE</h3>
            <p className="text-lg text-black mt-0.5">
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
                  <div key={locationIndex} className="space-y-1">
                    <div className="border-b-2 border-black pb-2">
                      <h4 className="text-lg font-semibold text-gray-900">
                        {location.name}
                      </h4>
                    </div>
                    
                    <div className="space-y-2">
                      {(location.events || []).map((event, eventIdx) => (
                        <div key={event.id} className={`flex ${event.title === 'END-OF-DAY' ? 'items-center' : 'items-start'} gap-6 ${event.title === 'END-OF-DAY' ? 'bg-gray-100 py-1 relative' : 'py-2'}`}>
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
                              <span className="font-bold leading-none flex items-center h-full">{event.startTime}</span>
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
                            <div>
                              <div className={`text-sm ${event.title === 'END-OF-DAY' ? 'font-bold text-gray-900 leading-none flex items-center h-full' : 'font-bold text-gray-800'}`}>
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
                                  event.title
                                )}
                              </div>
                              {isEditing && event.title !== 'END-OF-DAY' ? (
                                <div className="mt-2">
                                  <Label className="text-xs font-medium text-gray-600">Cast Called:</Label>
                                  <div className="mt-1">
                                    <CastSelector
                                      contacts={contacts}
                                      selectedCast={event.cast}
                                      onChange={(newCast) => {
                                        const newLocations = [...callData.locations];
                                        newLocations[locationIndex].events[eventIdx].cast = newCast;
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
            ) : (
              // Multiple locations - chronologically aligned with no gap
              <div className="space-y-1">
                {/* Column headers */}
                <div className="grid grid-cols-7 gap-0">
                  {(callData.locations || []).map((location, locationIndex) => (
                    <div key={locationIndex} className={`${locationIndex === 0 ? 'col-span-4' : 'col-span-3'}`}>
                      <div className="border-b-2 border-black pb-2">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {location.name}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Events chronologically aligned across columns */}
                <div className="space-y-2">
                  {(() => {
                    // Get all non-END-OF-DAY events from all locations with their location info
                    const allEventsWithLocation = (callData.locations || []).flatMap((location, locationIndex) => 
                      (location.events || [])
                        .filter(event => event.title !== 'END-OF-DAY')
                        .map(event => ({ 
                          ...event, 
                          locationIndex,
                          locationName: location.name 
                        }))
                    );

                    // Sort all events chronologically by start time
                    const sortedEvents = allEventsWithLocation.sort((a, b) => {
                      // Parse time string to comparable format
                      const parseTime = (timeStr) => {
                        if (!timeStr || typeof timeStr !== 'string') return 0;
                        
                        // Handle different time formats
                        let cleanTime = timeStr.trim();
                        if (cleanTime.includes(' ')) {
                          // Format: "9:00 AM" or "2:30 PM"
                          const [time, period] = cleanTime.split(' ');
                          if (time && time.includes(':')) {
                            let [hours, minutes] = time.split(':').map(Number);
                            if (period === 'PM' && hours !== 12) hours += 12;
                            if (period === 'AM' && hours === 12) hours = 0;
                            return hours * 60 + (minutes || 0);
                          }
                        } else if (cleanTime.includes(':')) {
                          // Format: "09:00" or "14:30"
                          const [hours, minutes] = cleanTime.split(':').map(Number);
                          return hours * 60 + (minutes || 0);
                        }
                        return 0;
                      };
                      
                      return parseTime(a.startTime) - parseTime(b.startTime);
                    });

                    // Render each event in chronological order, positioned in its column
                    return sortedEvents.map((event, eventIndex) => (
                      <div key={`${event.id}-${eventIndex}`} className="grid grid-cols-7 gap-0">
                        {/* Left column (location 0) */}
                        <div className="col-span-4">
                          {event.locationIndex === 0 && (
                            <div className="flex items-start gap-4 py-2">
                              <div className="w-16 text-sm font-medium text-gray-700 flex-shrink-0">
                                {isEditing ? (
                                  <Input
                                    value={event.startTime}
                                    onChange={(e) => {
                                      const newLocations = [...callData.locations];
                                      const originalEventIdx = newLocations[0].events.findIndex(ev => ev.id === event.id);
                                      if (originalEventIdx !== -1) {
                                        newLocations[0].events[originalEventIdx].startTime = e.target.value;
                                        setCallData(prev => ({ ...prev, locations: newLocations }));
                                      }
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
                                          const originalEventIdx = newLocations[0].events.findIndex(ev => ev.id === event.id);
                                          if (originalEventIdx !== -1) {
                                            newLocations[0].events[originalEventIdx].title = e.target.value;
                                            setCallData(prev => ({ ...prev, locations: newLocations }));
                                          }
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
                                          selectedCast={event.cast || []}
                                          onChange={(newCast) => {
                                            const newLocations = [...callData.locations];
                                            const originalEventIdx = newLocations[0].events.findIndex(ev => ev.id === event.id);
                                            if (originalEventIdx !== -1) {
                                              newLocations[0].events[originalEventIdx].cast = newCast;
                                              setCallData(prev => ({ ...prev, locations: newLocations }));
                                            }
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
                          )}
                        </div>

                        {/* Right column (location 1) */}
                        <div className="col-span-3">
                          {event.locationIndex === 1 && (
                            <div className="flex items-start gap-4 py-2">
                              <div className="w-16 text-sm font-medium text-gray-700 flex-shrink-0">
                                {isEditing ? (
                                  <Input
                                    value={event.startTime}
                                    onChange={(e) => {
                                      const newLocations = [...callData.locations];
                                      const originalEventIdx = newLocations[1].events.findIndex(ev => ev.id === event.id);
                                      if (originalEventIdx !== -1) {
                                        newLocations[1].events[originalEventIdx].startTime = e.target.value;
                                        setCallData(prev => ({ ...prev, locations: newLocations }));
                                      }
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
                                          const originalEventIdx = newLocations[1].events.findIndex(ev => ev.id === event.id);
                                          if (originalEventIdx !== -1) {
                                            newLocations[1].events[originalEventIdx].title = e.target.value;
                                            setCallData(prev => ({ ...prev, locations: newLocations }));
                                          }
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
                                          selectedCast={event.cast || []}
                                          onChange={(newCast) => {
                                            const newLocations = [...callData.locations];
                                            const originalEventIdx = newLocations[1].events.findIndex(ev => ev.id === event.id);
                                            if (originalEventIdx !== -1) {
                                              newLocations[1].events[originalEventIdx].cast = newCast;
                                              setCallData(prev => ({ ...prev, locations: newLocations }));
                                            }
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
                          )}
                        </div>
                      </div>
                    ));
                  })()}
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

          {/* Fittings Section - only show if there are fittings events */}
          {(callData.fittingsEvents && callData.fittingsEvents.length > 0) && (
            <div className="mt-6">
              <div className="border-b-2 border-black pb-2">
                <h3 className="text-lg font-semibold text-gray-900">Fittings</h3>
              </div>
              <div className="space-y-2 mt-1">
                {callData.fittingsEvents
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((event, index) => (
                    <div key={`fitting-${event.id}`} className="flex items-start gap-6 py-2">
                      <div className="w-20 text-sm font-medium text-gray-700 flex-shrink-0">
                        {event.startTime}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <div className="text-sm font-bold text-gray-800">
                            {event.title}{event.startTime && event.endTime && (() => {
                              const parseTime = (timeStr) => {
                                if (!timeStr) return 0;
                                const [hours, minutes] = timeStr.split(':').map(Number);
                                return hours * 60 + minutes;
                              };
                              const startMinutes = parseTime(event.startTime);
                              const endMinutes = parseTime(event.endTime);
                              const duration = endMinutes - startMinutes;
                              return duration > 0 ? ` - (${duration} Mins)` : '';
                            })()}
                          </div>
                          <div className="text-xs text-gray-600">{event.location}</div>
                        </div>
                        {event.cast && event.cast.length > 0 && (
                          <div className="text-xs text-black mt-1">
                            {event.cast.join(', ')}
                          </div>
                        )}
                        {event.notes && (
                          <div className="text-xs text-gray-600 mt-1">{event.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Appointments & Meetings Section - only show if there are appointments events */}
          {(callData.appointmentsEvents && callData.appointmentsEvents.length > 0) && (
            <div className="mt-6">
              <div className="border-b-2 border-black pb-2">
                <h3 className="text-lg font-semibold text-gray-900">Appointments & Meetings</h3>
              </div>
              <div className="space-y-2 mt-1">
                {callData.appointmentsEvents
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((event, index) => (
                    <div key={`appointment-${event.id}`} className="flex items-start gap-6 py-2">
                      <div className="w-20 text-sm font-medium text-gray-700 flex-shrink-0">
                        {event.startTime}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <div className="text-sm font-bold text-gray-800">
                            {event.title}{event.startTime && event.endTime && (() => {
                              const parseTime = (timeStr) => {
                                if (!timeStr) return 0;
                                const [hours, minutes] = timeStr.split(':').map(Number);
                                return hours * 60 + minutes;
                              };
                              const startMinutes = parseTime(event.startTime);
                              const endMinutes = parseTime(event.endTime);
                              const duration = endMinutes - startMinutes;
                              return duration > 0 ? ` - (${duration} Mins)` : '';
                            })()}
                          </div>
                          <div className="text-xs text-gray-600">{event.location}</div>
                        </div>
                        {event.cast && event.cast.length > 0 && (
                          <div className="text-xs text-black mt-1">
                            {event.cast.join(', ')}
                          </div>
                        )}
                        {event.notes && (
                          <div className="text-xs text-gray-600 mt-1">{event.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Announcements Section */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Announcements</h3>
            {isEditing ? (
              <Textarea
                value={callData.announcements}
                onChange={(e) => setCallData(prev => ({ ...prev, announcements: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const textarea = e.target as HTMLTextAreaElement;
                    const { value, selectionStart } = textarea;
                    
                    // Split content into lines up to cursor position
                    const beforeCursor = value.substring(0, selectionStart);
                    const afterCursor = value.substring(selectionStart);
                    const lines = beforeCursor.split('\n');
                    
                    // Get the current line
                    const currentLine = lines[lines.length - 1];
                    
                    // Check if current line starts with a number pattern (e.g., "1. ", "12. ")
                    const numberMatch = currentLine.match(/^(\d+)\.\s/);
                    
                    let newText;
                    let nextNumber;
                    if (numberMatch) {
                      // If we're on a numbered line, create the next number
                      const currentNumber = parseInt(numberMatch[1]);
                      nextNumber = currentNumber + 1;
                      newText = beforeCursor + '\n' + nextNumber + '. ' + afterCursor;
                    } else if (lines.length === 1 && currentLine.trim() === '') {
                      // If it's the first line and empty, start with "1. "
                      nextNumber = 1;
                      newText = '1. ' + afterCursor;
                    } else {
                      // For any other case, determine the next number based on existing content
                      const allLines = value.split('\n');
                      const numberedLines = allLines.filter(line => /^\d+\.\s/.test(line));
                      nextNumber = numberedLines.length + 1;
                      newText = beforeCursor + '\n' + nextNumber + '. ' + afterCursor;
                    }
                    
                    setCallData(prev => ({ ...prev, announcements: newText }));
                    
                    // Set cursor position after the new number
                    setTimeout(() => {
                      const newCursorPos = beforeCursor.length + 1 + nextNumber.toString().length + 2;
                      textarea.setSelectionRange(newCursorPos, newCursorPos);
                    }, 0);
                  }
                }}
                placeholder="Start typing and press Enter to create numbered items..."
                className="min-h-20 border-2 border-black"
              />
            ) : (
              <div className="min-h-20 text-sm text-black whitespace-pre-wrap border-2 border-black p-3">
                {callData.announcements || '1.   No announcements for today'}
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