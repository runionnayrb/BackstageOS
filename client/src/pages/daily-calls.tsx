import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import { format, parseISO } from "date-fns";
import { Calendar, Plus, Save, FileText, ChevronLeft, Users, Edit, Upload, Trash2, Import } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { parseScheduleSettings, formatTimeDisplay } from "@/lib/timeUtils";
import { CastSelector } from "@/components/cast-selector";
import { DailyCall, Project, EmailContact, ScheduleEvent } from "@shared/schema";

interface DailyCallSheetParams {
  id: string;
  date: string;
}

interface CallLocation {
  name: string;
  locationType?: 'main' | 'auxiliary';
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
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

  // Fetch project contacts (show contacts with contact groups for cast filtering)
  const { data: contacts = [] } = useQuery({
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

  // Get the location names for fittings and appointments based on their location type
  const fittingsLocationName = eventLocations.find((loc: any) => loc.locationType === 'fittings')?.name || '';
  const appointmentsLocationName = eventLocations.find((loc: any) => loc.locationType === 'appointments')?.name || '';

  // Fetch existing daily call for the selected date
  const { data: existingDailyCall, isLoading } = useQuery<DailyCall>({
    queryKey: ['/api/projects', actualProjectId, 'daily-calls', selectedDate],
    enabled: !!actualProjectId && !!selectedDate,
  });

  // Parse schedule settings for timezone and time format preferences
  const scheduleSettings = parseScheduleSettings((showSettings as any)?.scheduleSettings);
  const { timeFormat = '12', timezone, dayStartHour = 8, dayEndHour = 24 } = scheduleSettings;
  
  // Calculate time range for extended day support (e.g., 7 AM - 2 AM next day)
  const startMinutes = dayStartHour * 60;
  const endMinutes = dayEndHour * 60;
  
  // Helper to adjust minutes for extended day schedules (times past midnight sort after 11 PM)
  const adjustMinutesForExtendedDay = (minutes: number): number => {
    // Only apply adjustment if schedule extends past midnight (endMinutes > 1440)
    // and the time is before startMinutes (e.g., 1 AM is before 7 AM start)
    // Any time before the day start (e.g., 1 AM, 2 AM, 2:30 AM when start is 7 AM)
    // should be treated as "after midnight" and sort after 11 PM events
    if (endMinutes > 1440 && minutes < startMinutes) {
      return minutes + 1440;
    }
    return minutes;
  };

  // Mutation for saving daily call with optimistic updates
  const saveCallMutation = useMutation({
    mutationFn: async (data: any) => {
      if (existingDailyCall?.id) {
        try {
          // Try to update the existing daily call
          return await apiRequest('PATCH', `/api/projects/${actualProjectId}/daily-calls/${existingDailyCall.id}`, data);
        } catch (error: any) {
          // If it was deleted (404), create a new one instead
          if (error.status === 404 || (error.response && error.response.status === 404)) {
            console.log('Daily call was deleted, creating new one instead');
            return await apiRequest('POST', `/api/projects/${actualProjectId}/daily-calls`, { ...data, date: selectedDate });
          }
          throw error;
        }
      } else {
        return apiRequest('POST', `/api/projects/${actualProjectId}/daily-calls`, { ...data, date: selectedDate });
      }
    },
    onMutate: async (data) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/projects', actualProjectId, 'daily-calls-list'] });
      
      // Snapshot the previous value
      const previousCalls = queryClient.getQueryData(['/api/projects', actualProjectId, 'daily-calls-list']);
      
      // Optimistically update the list
      if (!existingDailyCall?.id) {
        // Creating new - add to list
        queryClient.setQueryData(['/api/projects', actualProjectId, 'daily-calls-list'], (old: any[]) => {
          if (!old) return old;
          const newCall = {
            id: -1, // Temporary ID
            date: selectedDate,
            projectId: actualProjectId,
            locations: data.locations,
            announcements: data.announcements,
          };
          return [...old, newCall].sort((a, b) => a.date.localeCompare(b.date));
        });
      }
      
      return { previousCalls };
    },
    onSuccess: () => {
      toast({
        title: "Call Sheet Saved",
        description: "Daily call sheet has been saved successfully.",
      });
      setIsEditing(false);
      // Also invalidate schedule events since we're now syncing changes back to them
      queryClient.invalidateQueries({ queryKey: ['/api/projects', actualProjectId, 'schedule-events'] });
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousCalls) {
        queryClient.setQueryData(['/api/projects', actualProjectId, 'daily-calls-list'], context.previousCalls);
      }
      toast({
        title: "Error",
        description: "Failed to save daily call sheet.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Refetch to ensure we're in sync with server
      queryClient.invalidateQueries({ queryKey: ['/api/projects', actualProjectId, 'daily-calls'] });
    },
  });

  // Load existing daily call data when it changes  
  useEffect(() => {
    if (!actualProjectId || !scheduleEvents || !eventLocations || !contacts) return;
    if (isEditing) return;
    
    // If we have a saved daily call with actual data, use that instead of regenerating
    if (existingDailyCall && existingDailyCall.locations && existingDailyCall.locations.length > 0) {
      setCallData({
        locations: existingDailyCall.locations,
        announcements: existingDailyCall.announcements || '',
        fittingsEvents: existingDailyCall.fittingsEvents || [],
        appointmentsEvents: existingDailyCall.appointmentsEvents || []
      });
      return;
    }
    
    // Otherwise, generate from schedule (either no saved call, or saved call has no data)
    const generatedData = generateCallFromSchedule();
    if (generatedData) {
      setCallData(prev => ({
        ...prev,
        ...generatedData
      }));
    }
  }, [actualProjectId, selectedDate, timeFormat, scheduleEvents, eventLocations, contacts, isEditing, existingDailyCall]);

  // Date picker navigation function
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const selectedDateStr = format(date, 'yyyy-MM-dd');
      setLocation(`/shows/${actualProjectId}/calls/${selectedDateStr}`);
      setDatePickerOpen(false);
    }
  };

  const generateCallFromSchedule = () => {
    if (!actualProjectId || !scheduleEvents || !eventLocations) return null;

    console.log('📅 Generating call for date:', selectedDate);
    console.log('📅 Total schedule events:', scheduleEvents.length);

    // Filter events for the selected date
    const dayEvents = scheduleEvents.filter(event => {
      // The API returns event.date as a string like "2025-11-19"
      const matches = event.date === selectedDate;
      if (matches) {
        console.log('✅ Event matched:', event.title, 'on', event.date);
      }
      return matches;
    });
    
    console.log('📅 Found', dayEvents.length, 'events for', selectedDate);
    
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
      
      // Get actual cast members called to this event (filter by contacts in "Cast" group)
      const eventCast = (event.participants || [])
        .filter(participant => {
          if (!participant.isRequired) return false;
          
          // Find the actual contact to check if they're in the Cast group
          const contact = contacts.find(c => c.id === participant.contactId);
          return contact && contact.contactGroup?.name === 'Cast';
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

    // Helper function to convert time string to minutes since midnight for proper comparison
    const timeToMinutesLocal = (timeStr: string): number => {
      if (!timeStr) return 0;
      const cleanTime = timeStr.trim();
      
      // Handle 24-hour format (e.g., "14:30")
      if (!cleanTime.includes('AM') && !cleanTime.includes('PM')) {
        const [hours, minutes] = cleanTime.split(':').map(Number);
        return (hours || 0) * 60 + (minutes || 0);
      }
      
      // Handle 12-hour format (e.g., "2:30 PM")
      const isPM = cleanTime.toUpperCase().includes('PM');
      const timeWithoutAmPm = cleanTime.replace(/\s*(AM|PM)\s*/i, '').trim();
      const [hours, minutes] = timeWithoutAmPm.split(':').map(Number);
      
      let hour24 = hours || 0;
      if (isPM && hour24 !== 12) hour24 += 12;
      if (!isPM && hour24 === 12) hour24 = 0;
      
      return hour24 * 60 + (minutes || 0);
    };
    
    // Adjusted version that handles extended day schedules (times past midnight)
    const timeToMinutesAdjusted = (timeStr: string): number => {
      return adjustMinutesForExtendedDay(timeToMinutesLocal(timeStr));
    };

    // Calculate single END-OF-DAY time for the entire day (latest end time across all events)
    // Uses adjusted time comparison to properly handle events past midnight
    let globalEndOfDayTime = formatTimeDisplay('23:59', timeFormat as '12' | '24'); // Default fallback
    const allEventsAcrossTypes = Object.values(locationTypeGroups).flat();
    if (allEventsAcrossTypes.length > 0) {
      // Find the latest end time across all events on this day using adjusted time comparison
      // This ensures events ending at 1 AM are considered later than events ending at 11 PM
      const latestEvent = allEventsAcrossTypes.reduce((latest, event) => {
        return timeToMinutesAdjusted(event.endTime) > timeToMinutesAdjusted(latest.endTime) ? event : latest;
      }, allEventsAcrossTypes[0]);
      globalEndOfDayTime = latestEvent.endTime;
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

    // Create the locations array
    const locations: CallLocation[] = [];
    
    // Get the location names
    const mainLocationNames = Object.keys(mainLocationGroups);
    const auxiliaryLocationNames = Object.keys(auxiliaryLocationGroups);
    const totalLocationCount = mainLocationNames.length + auxiliaryLocationNames.length;
    
    // Check if we have more than 2 total locations
    const hasMoreThanTwoLocations = totalLocationCount > 2;
    
    if (hasMoreThanTwoLocations) {
      // More than 2 locations: show all in single column
      // Primary (main) locations first, then secondary (auxiliary) locations
      
      // Add all main locations first
      mainLocationNames.forEach((mainLocationName, index) => {
        // Clone array to avoid mutating the original
        const mainEvents = [...mainLocationGroups[mainLocationName]].sort(sortByTime);
        
        // Add END-OF-DAY only to the last location in the combined list
        const isLastLocation = index === mainLocationNames.length - 1 && auxiliaryLocationNames.length === 0;
        if (isLastLocation) {
          mainEvents.push({
            id: -1,
            title: 'END-OF-DAY',
            startTime: globalEndOfDayTime,
            endTime: globalEndOfDayTime,
            cast: [],
            notes: undefined,
            location: ''
          });
        }
        
        locations.push({
          name: mainLocationName,
          events: mainEvents,
          locationType: 'main'
        });
      });
      
      // Then add all auxiliary locations
      auxiliaryLocationNames.forEach((auxiliaryLocationName, index) => {
        // Clone array to avoid mutating the original
        const auxiliaryEvents = [...auxiliaryLocationGroups[auxiliaryLocationName]].sort(sortByTime);
        
        // Add END-OF-DAY to the last auxiliary location (which is the last overall)
        const isLastLocation = index === auxiliaryLocationNames.length - 1;
        if (isLastLocation) {
          auxiliaryEvents.push({
            id: -1,
            title: 'END-OF-DAY',
            startTime: globalEndOfDayTime,
            endTime: globalEndOfDayTime,
            cast: [],
            notes: undefined,
            location: ''
          });
        }
        
        locations.push({
          name: auxiliaryLocationName,
          events: auxiliaryEvents,
          locationType: 'auxiliary'
        });
      });
    } else {
      // 2 or fewer locations: use two-column layout (existing behavior)
      // END-OF-DAY should be added to the LAST location in the list
      const hasAuxiliaryLocation = auxiliaryLocationNames.length > 0;
      
      // Get the main location (left column)
      if (mainLocationNames.length > 0) {
        const mainLocationName = mainLocationNames[0];
        // Clone array to avoid mutating the original
        const mainEvents = [...mainLocationGroups[mainLocationName]].sort(sortByTime);
        
        // Only add END-OF-DAY to main location if there's no auxiliary location
        if (!hasAuxiliaryLocation) {
          mainEvents.push({
            id: -1,
            title: 'END-OF-DAY',
            startTime: globalEndOfDayTime,
            endTime: globalEndOfDayTime,
            cast: [],
            notes: undefined,
            location: ''
          });
        }
        
        locations.push({
          name: mainLocationName,
          events: mainEvents,
          locationType: 'main'
        });
      }
      
      // Get the auxiliary location (right column)
      if (auxiliaryLocationNames.length > 0) {
        const auxiliaryLocationName = auxiliaryLocationNames[0];
        // Clone array to avoid mutating the original
        const auxiliaryEvents = [...auxiliaryLocationGroups[auxiliaryLocationName]].sort(sortByTime);
        
        // Add END-OF-DAY to auxiliary location (the last location)
        auxiliaryEvents.push({
          id: -1,
          title: 'END-OF-DAY',
          startTime: globalEndOfDayTime,
          endTime: globalEndOfDayTime,
          cast: [],
          notes: undefined,
          location: ''
        });
        
        locations.push({
          name: auxiliaryLocationName,
          events: auxiliaryEvents,
          locationType: 'auxiliary'
        });
      }
    }

    // Create the generated data object
    const generatedData = {
      locations,
      fittingsEvents: locationTypeGroups.fittings,
      appointmentsEvents: locationTypeGroups.appointments,
      announcements: ''
    };

    // Set state with the generated data
    setCallData(prev => ({
      ...prev,
      ...generatedData
    }));
    
    // Return the generated data for auto-saving
    return generatedData;
  };

  const handleSave = () => {
    console.log('💾 Saving daily call with data:', callData);
    saveCallMutation.mutate({
      locations: callData.locations,
      announcements: callData.announcements,
      fittingsEvents: callData.fittingsEvents || [],
      appointmentsEvents: callData.appointmentsEvents || [],
      events: scheduleEvents.filter(event => event.date === selectedDate)
    });
  };

  // Delete mutation with optimistic update
  const deleteCallMutation = useMutation({
    mutationFn: async () => {
      if (!existingDailyCall?.id) throw new Error('No daily call to delete');
      return apiRequest('DELETE', `/api/projects/${actualProjectId}/daily-calls/${existingDailyCall.id}`);
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/projects', actualProjectId, 'daily-calls-list'] });
      
      // Snapshot the previous value
      const previousCalls = queryClient.getQueryData(['/api/projects', actualProjectId, 'daily-calls-list']);
      
      // Optimistically update by removing this call from the list
      queryClient.setQueryData(['/api/projects', actualProjectId, 'daily-calls-list'], (old: any[]) => {
        if (!old) return old;
        return old.filter(call => call.id !== existingDailyCall?.id);
      });
      
      // Return context with the snapshot
      return { previousCalls };
    },
    onSuccess: () => {
      toast({
        title: "Daily Call Deleted",
        description: "The daily call has been deleted. Schedule events were not affected.",
      });
      setShowDeleteDialog(false);
      // Navigate back to the list
      setLocation(`/shows/${actualProjectId}/calls`);
    },
    onError: (_error, _variables, context) => {
      // Rollback to the previous value on error
      if (context?.previousCalls) {
        queryClient.setQueryData(['/api/projects', actualProjectId, 'daily-calls-list'], context.previousCalls);
      }
      toast({
        title: "Error",
        description: "Failed to delete daily call.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Refetch to ensure we're in sync with the server
      queryClient.invalidateQueries({ queryKey: ['/api/projects', actualProjectId, 'daily-calls-list'] });
    },
  });

  const addLocation = (locationName?: string) => {
    // Use provided name or first available event location, or default to 'New Location'
    const defaultName = locationName || 
      (eventLocations.length > 0 ? eventLocations[0].name : 'New Location');
    
    // Create new location with empty events array (no END-OF-DAY - that's managed globally)
    const newLocation = {
      name: defaultName,
      events: []
    };
    
    setCallData(prev => {
      const newLocations = [...prev.locations, newLocation];
      // Apply global END-OF-DAY recalculation
      return {
        ...prev,
        locations: updateGlobalEndOfDay(newLocations)
      };
    });
    setIsEditing(true);
  };

  const updateLocationName = (locationIndex: number, newName: string) => {
    setCallData(prev => ({
      ...prev,
      locations: prev.locations.map((loc, idx) => 
        idx === locationIndex ? { ...loc, name: newName } : loc
      )
    }));
  };

  const addFittingsSection = () => {
    const newFittingEvent = {
      id: Date.now(),
      title: 'New Fitting',
      startTime: formatTimeDisplay('10:00', timeFormat as '12' | '24'),
      endTime: formatTimeDisplay('11:00', timeFormat as '12' | '24'),
      cast: [],
      notes: '',
      location: ''
    };
    
    setCallData(prev => ({
      ...prev,
      fittingsEvents: [...(prev.fittingsEvents || []), newFittingEvent]
    }));
    setIsEditing(true);
  };

  const addAppointmentsSection = () => {
    const newAppointmentEvent = {
      id: Date.now(),
      title: 'New Meeting',
      startTime: formatTimeDisplay('10:00', timeFormat as '12' | '24'),
      endTime: formatTimeDisplay('11:00', timeFormat as '12' | '24'),
      cast: [],
      notes: '',
      location: ''
    };
    
    setCallData(prev => ({
      ...prev,
      appointmentsEvents: [...(prev.appointmentsEvents || []), newAppointmentEvent]
    }));
    setIsEditing(true);
  };

  const updateFittingEvent = (eventIndex: number, updatedEvent: any) => {
    setCallData(prev => ({
      ...prev,
      fittingsEvents: (prev.fittingsEvents || []).map((event, idx) => 
        idx === eventIndex ? { ...event, ...updatedEvent } : event
      )
    }));
  };

  const updateAppointmentEvent = (eventIndex: number, updatedEvent: any) => {
    setCallData(prev => ({
      ...prev,
      appointmentsEvents: (prev.appointmentsEvents || []).map((event, idx) => 
        idx === eventIndex ? { ...event, ...updatedEvent } : event
      )
    }));
  };

  const removeFittingEvent = (eventIndex: number) => {
    setCallData(prev => ({
      ...prev,
      fittingsEvents: (prev.fittingsEvents || []).filter((_, idx) => idx !== eventIndex)
    }));
  };

  const removeAppointmentEvent = (eventIndex: number) => {
    setCallData(prev => ({
      ...prev,
      appointmentsEvents: (prev.appointmentsEvents || []).filter((_, idx) => idx !== eventIndex)
    }));
  };

  // Helper to remove empty secondary locations (keeps primary location even if empty)
  const pruneEmptySecondaryLocations = (locations: CallLocation[]) => {
    return locations.filter((loc, idx) => {
      // Always keep the primary location (index 0)
      if (idx === 0) return true;
      // Keep secondary locations only if they have non-END-OF-DAY events
      const hasRealEvents = (loc.events || []).some(e => e.title !== 'END-OF-DAY');
      return hasRealEvents;
    });
  };

  // Remove an event from a specific location
  const removeLocationEvent = (locationIndex: number, eventIndex: number) => {
    setCallData(prev => {
      const newLocations = prev.locations.map((loc, idx) => 
        idx === locationIndex 
          ? { ...loc, events: loc.events.filter((_, eIdx) => eIdx !== eventIndex) }
          : loc
      );
      // Prune empty secondary locations, then recalculate END-OF-DAY
      const prunedLocations = pruneEmptySecondaryLocations(newLocations);
      return {
        ...prev,
        locations: updateGlobalEndOfDay(prunedLocations)
      };
    });
  };

  // Helper function to extract participant name in "F. Last" format
  const getParticipantName = (p: any): string => {
    const firstName = p.contactFirstName?.trim() || '';
    const lastName = p.contactLastName?.trim() || '';
    if (firstName && lastName) {
      return `${firstName.charAt(0)}. ${lastName}`;
    }
    if (lastName) return lastName;
    if (firstName) return firstName;
    return '';
  };

  // Helper function to normalize time string by removing seconds
  const normalizeTime = (timeStr: string): string => {
    if (!timeStr) return timeStr;
    // Handle HH:MM:SS format - strip seconds
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  };

  // Helper function to convert time string to minutes for proper sorting
  const sortTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const cleanTime = timeStr.trim();
    
    // Handle 24-hour format (e.g., "14:30")
    if (!cleanTime.includes('AM') && !cleanTime.includes('PM')) {
      const [hours, minutes] = cleanTime.split(':').map(Number);
      return (hours || 0) * 60 + (minutes || 0);
    }
    
    // Handle 12-hour format (e.g., "2:30 PM")
    const isPM = cleanTime.toUpperCase().includes('PM');
    const timeWithoutAmPm = cleanTime.replace(/\s*(AM|PM)\s*/i, '').trim();
    const [hours, minutes] = timeWithoutAmPm.split(':').map(Number);
    
    let hour24 = hours || 0;
    if (isPM && hour24 !== 12) hour24 += 12;
    if (!isPM && hour24 === 12) hour24 = 0;
    
    return hour24 * 60 + (minutes || 0);
  };
  
  // Adjusted version for extended day schedules (times past midnight sort after 11 PM)
  const sortTimeToMinutesAdjusted = (timeStr: string): number => {
    return adjustMinutesForExtendedDay(sortTimeToMinutes(timeStr));
  };

  // Helper function to sort events by start time (handles extended day schedules)
  const sortByTime = (a: any, b: any): number => {
    return sortTimeToMinutesAdjusted(a.startTime) - sortTimeToMinutesAdjusted(b.startTime);
  };

  // Helper function to check if participants match "Full Cast" or "Full Company"
  const getCastLabel = (participants: any[]): string[] => {
    if (!participants || participants.length === 0) return [];
    
    // Get all contacts for this project
    const allContacts = (contacts as any[]) || [];
    if (allContacts.length === 0) return participants.map((p: any) => getParticipantName(p)).filter((n: string) => n.length > 0);
    
    // Get participant contact IDs
    const participantIds = participants.map((p: any) => p.contactId).filter(Boolean);
    
    // Get cast members (contacts in "Cast" group)
    const castMembers = allContacts.filter((c: any) => c.contactGroup?.name === 'Cast');
    const castIds = castMembers.map((c: any) => c.id);
    
    // Check if all cast members are selected (Full Cast)
    if (castIds.length > 0 && castIds.every((id: number) => participantIds.includes(id)) && participantIds.every((id: number) => castIds.includes(id))) {
      return ['Full Cast'];
    }
    
    // Check if all contacts are selected (Full Company)
    const allContactIds = allContacts.map((c: any) => c.id);
    if (allContactIds.length > 0 && allContactIds.every((id: number) => participantIds.includes(id)) && participantIds.every((id: number) => allContactIds.includes(id))) {
      return ['Full Company'];
    }
    
    // Otherwise return individual names in "F. Last" format
    return participants.map((p: any) => getParticipantName(p)).filter((n: string) => n.length > 0);
  };

  // Import schedule events from the schedule into the daily call
  const importFromSchedule = async () => {
    if (!actualProjectId || !selectedDate) return;
    
    setImportLoading(true);
    try {
      // Fetch schedule events for the selected date with participants
      const scheduleEventsForDate = await apiRequest('GET', `/api/projects/${actualProjectId}/schedule-events-by-date?date=${selectedDate}`);
      
      if (!scheduleEventsForDate || scheduleEventsForDate.length === 0) {
        toast({
          title: "No Events Found",
          description: "No scheduled events were found for this date.",
          variant: "destructive",
        });
        setShowImportDialog(false);
        setImportLoading(false);
        return;
      }
      
      // Group events by location - use a Map to preserve insertion order and handle all locations
      const eventsByLocation = new Map<string, any[]>();
      const fittingsEvents: any[] = [];
      const appointmentsEvents: any[] = [];
      
      for (const event of scheduleEventsForDate) {
        const eventType = event.type?.toLowerCase() || '';
        const eventTitle = event.title?.toLowerCase() || '';
        
        // Get cast names using the smart label function (handles Full Cast/Full Company)
        const castNames = getCastLabel(event.participants || []);
        
        // Normalize times by stripping seconds (08:00:00 -> 08:00)
        const normalizedStartTime = normalizeTime(event.startTime);
        const normalizedEndTime = normalizeTime(event.endTime);
        
        // Categorize events: fittings, meetings/appointments, or regular events
        if (eventType === 'fitting' || eventTitle.includes('fitting') || eventTitle.includes('costume')) {
          fittingsEvents.push({
            id: event.id,
            title: event.title,
            startTime: formatTimeDisplay(normalizedStartTime, timeFormat as '12' | '24'),
            endTime: formatTimeDisplay(normalizedEndTime, timeFormat as '12' | '24'),
            cast: castNames,
            notes: event.notes || '',
            location: event.location || ''
          });
        } else if (eventType === 'meeting' || eventType === 'appointment' || eventTitle.includes('meeting') || eventTitle.includes('appointment')) {
          appointmentsEvents.push({
            id: event.id,
            title: event.title,
            startTime: formatTimeDisplay(normalizedStartTime, timeFormat as '12' | '24'),
            endTime: formatTimeDisplay(normalizedEndTime, timeFormat as '12' | '24'),
            cast: castNames,
            notes: event.notes || '',
            location: event.location || ''
          });
        } else {
          // Regular events - group by location
          const locationName = event.location || 'Main Location';
          if (!eventsByLocation.has(locationName)) {
            eventsByLocation.set(locationName, []);
          }
          
          eventsByLocation.get(locationName)!.push({
            id: event.id,
            title: event.title,
            startTime: formatTimeDisplay(normalizedStartTime, timeFormat as '12' | '24'),
            endTime: formatTimeDisplay(normalizedEndTime, timeFormat as '12' | '24'),
            cast: castNames,
            notes: event.notes || ''
          });
        }
      }
      
      // Convert location groups to the expected format, excluding END-OF-DAY entries
      const newLocations: CallLocation[] = Array.from(eventsByLocation.entries()).map(([name, events]) => ({
        name,
        events: events
          .filter(e => e.title !== 'END-OF-DAY')
          .sort(sortByTime)
      }));
      
      // Update call data with imported events (replaces existing data)
      // Apply global END-OF-DAY recalculation
      const locationsToUse = newLocations.length > 0 ? newLocations : (callData.locations || []);
      setCallData(prev => ({
        ...prev,
        locations: updateGlobalEndOfDay(locationsToUse),
        fittingsEvents: fittingsEvents.length > 0 ? fittingsEvents : prev.fittingsEvents,
        appointmentsEvents: appointmentsEvents.length > 0 ? appointmentsEvents : prev.appointmentsEvents,
      }));
      
      // Count imported items for feedback
      const totalLocationEvents = Array.from(eventsByLocation.values()).flat().length;
      const totalImported = totalLocationEvents + fittingsEvents.length + appointmentsEvents.length;
      
      toast({
        title: "Import Successful",
        description: `Imported ${totalImported} event${totalImported !== 1 ? 's' : ''} from schedule (${totalLocationEvents} regular, ${fittingsEvents.length} fittings, ${appointmentsEvents.length} meetings).`,
      });
      
      setShowImportDialog(false);
      setIsEditing(true);
    } catch (error) {
      console.error('Error importing from schedule:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import events from schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setImportLoading(false);
    }
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
    
    setCallData(prev => {
      const newLocations = prev.locations.map((loc, idx) => {
        if (idx === locationIndex) {
          // Filter out END-OF-DAY and add the new event
          const allEventsExceptEndOfDay = (loc.events || []).filter(event => event.title !== 'END-OF-DAY');
          return {
            ...loc,
            events: [...allEventsExceptEndOfDay, newEvent]
          };
        }
        return loc;
      });
      
      // Apply global END-OF-DAY recalculation
      return {
        ...prev,
        locations: updateGlobalEndOfDay(newLocations)
      };
    });
    setIsEditing(true);
  };

  // Helper function to update a specific event property and recalculate END-OF-DAY
  const updateLocationEventProperty = (locationIndex: number, eventIdx: number, property: string, value: any) => {
    setCallData(prev => {
      const newLocations = prev.locations.map((loc, idx) => {
        if (idx === locationIndex) {
          const newEvents = [...loc.events];
          if (newEvents[eventIdx]) {
            newEvents[eventIdx] = { ...newEvents[eventIdx], [property]: value };
          }
          return { ...loc, events: newEvents };
        }
        return loc;
      });
      // Recalculate END-OF-DAY if endTime was changed
      return {
        ...prev,
        locations: property === 'endTime' ? updateGlobalEndOfDay(newLocations) : newLocations
      };
    });
  };

  // Helper function to convert time string to minutes since midnight for proper comparison
  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const cleanTime = timeStr.trim();
    
    // Handle 24-hour format (e.g., "14:30")
    if (!cleanTime.includes('AM') && !cleanTime.includes('PM')) {
      const [hours, minutes] = cleanTime.split(':').map(Number);
      return (hours || 0) * 60 + (minutes || 0);
    }
    
    // Handle 12-hour format (e.g., "2:30 PM")
    const isPM = cleanTime.toUpperCase().includes('PM');
    const timeWithoutAmPm = cleanTime.replace(/\s*(AM|PM)\s*/i, '').trim();
    const [hours, minutes] = timeWithoutAmPm.split(':').map(Number);
    
    let hour24 = hours || 0;
    if (isPM && hour24 !== 12) hour24 += 12;
    if (!isPM && hour24 === 12) hour24 = 0;
    
    return hour24 * 60 + (minutes || 0);
  };
  
  // Adjusted version for extended day schedules (times past midnight are later)
  const timeToMinutesExtended = (timeStr: string): number => {
    return adjustMinutesForExtendedDay(timeToMinutes(timeStr));
  };

  // Helper function to update END-OF-DAY time for the entire day (single END-OF-DAY)
  const updateGlobalEndOfDay = (locations: CallLocation[]) => {
    // Remove all existing END-OF-DAY events from all locations
    const locationsWithoutEndOfDay = locations.map(location => ({
      ...location,
      events: (location.events || []).filter(event => event.title !== 'END-OF-DAY')
    }));

    // Calculate global end-of-day time across all locations
    // Uses extended day adjustment to properly handle events past midnight
    let globalEndOfDayTime = formatTimeDisplay('23:59', timeFormat as '12' | '24');
    const allEvents = locationsWithoutEndOfDay.flatMap(loc => loc.events || []);
    
    if (allEvents.length > 0) {
      // Find the event with the latest end time using extended time comparison
      // This ensures events ending at 1 AM are considered later than events ending at 11 PM
      const latestEvent = allEvents.reduce((latest, event) => {
        return timeToMinutesExtended(event.endTime) > timeToMinutesExtended(latest.endTime) ? event : latest;
      }, allEvents[0]);
      globalEndOfDayTime = latestEvent.endTime;
    }

    // Add END-OF-DAY only to the last location (after all primary and secondary locations)
    const lastIndex = locationsWithoutEndOfDay.length - 1;
    return locationsWithoutEndOfDay.map((location, index) => {
      if (index === lastIndex) {
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
      
      // Collect section and item positions BEFORE rendering to canvas
      // These are used to calculate smart page breaks
      const sections = element.querySelectorAll('[data-pdf-section]');
      const items = element.querySelectorAll('[data-pdf-item]');
      const sectionMetrics: Array<{ name: string; top: number; height: number; bottom: number; priority: string }> = [];
      const itemMetrics: Array<{ name: string; top: number; height: number; bottom: number }> = [];
      const containerRect = element.getBoundingClientRect();
      
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top;
        sectionMetrics.push({
          name: section.getAttribute('data-pdf-section') || 'unknown',
          top: relativeTop,
          height: rect.height,
          bottom: relativeTop + rect.height,
          priority: section.getAttribute('data-pdf-priority') || 'normal'
        });
      });
      
      // Collect individual event/item metrics
      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top;
        itemMetrics.push({
          name: item.getAttribute('data-pdf-item') || 'event',
          top: relativeTop,
          height: rect.height,
          bottom: relativeTop + rect.height
        });
      });
      
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
            // Keep original padding to maintain position consistency with metrics
            
            // Hide the app footer since we'll add it as proper PDF footer
            const appFooter = clonedElement.querySelector('.mt-8.pt-6.border-t.border-gray-200.text-center');
            if (appFooter) {
              (appFooter as HTMLElement).style.display = 'none';
            }
            
            // Remove grey background from END-OF-DAY rows in PDF export, but keep text visible
            const endOfDayRows = clonedElement.querySelectorAll('[data-end-of-day-row="true"]');
            endOfDayRows.forEach(el => {
              (el as HTMLElement).style.backgroundColor = 'transparent';
              (el as HTMLElement).style.background = 'none';
            });

          }
        }
      });
      
      // Page dimensions and layout (8.5x11 inch letter size with 0.5" margins)
      const pageWidth = 215.9; // Letter width in mm (8.5 inches)
      const pageHeight = 279.4; // Letter height in mm (11 inches)
      const marginMm = 12.7; // 0.5 inch margins in mm
      const contentWidth = pageWidth - (marginMm * 2);
      // Footer is small (SUBJECT TO CHANGE + page number) - only ~6mm needed
      const contentHeight = pageHeight - (marginMm * 2) - 6; // Reserve 6mm for footer
      
      // Calculate how the content scales to fit the page width
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const scale = canvas.width / element.scrollWidth; // Pixel scale factor
      
      // Convert content height to pixels for break calculations
      const contentHeightPx = (contentHeight / imgWidth) * canvas.width;
      
      // Calculate page breaks that NEVER split events
      // Strategy: Find items that would be split and snap the break to their top
      const pageBreaks: Array<{ startPx: number; endPx: number }> = [];
      let currentPageStart = 0;
      
      // Build a sorted list of all item boundaries in canvas pixels
      const itemBoundaries: Array<{ topPx: number; bottomPx: number; name: string }> = [];
      
      // Add items (individual events) - these are the atomic units we never split
      itemMetrics.forEach(item => {
        itemBoundaries.push({
          topPx: Math.floor(item.top * scale),
          bottomPx: Math.ceil(item.bottom * scale),
          name: item.name
        });
      });
      
      // Sort by top position
      itemBoundaries.sort((a, b) => a.topPx - b.topPx);
      
      while (currentPageStart < canvas.height) {
        const idealPageEnd = currentPageStart + contentHeightPx;
        
        // If this would be the last page, take the rest
        if (idealPageEnd >= canvas.height) {
          pageBreaks.push({ 
            startPx: Math.floor(currentPageStart), 
            endPx: Math.ceil(canvas.height) 
          });
          break;
        }
        
        // Find the best break point - start with ideal and adjust if needed
        let actualPageEnd = Math.floor(idealPageEnd);
        
        // Check if any item would be split at this break point
        // If so, move the break to BEFORE that item (at its topPx)
        for (const item of itemBoundaries) {
          // Skip items entirely before this page
          if (item.bottomPx <= currentPageStart) continue;
          
          // Skip items entirely after our ideal break (they're fine on next page)
          if (item.topPx >= idealPageEnd) continue;
          
          // Check if this item crosses the ideal break point
          // (item starts before break AND ends after break)
          if (item.topPx < idealPageEnd && item.bottomPx > idealPageEnd) {
            // This item would be split - we need to break BEFORE it
            // Only do this if there's meaningful content before this item
            const contentBeforeItem = item.topPx - currentPageStart;
            if (contentBeforeItem > 50) { // At least 50px of content
              actualPageEnd = item.topPx;
              break; // Found the first item that would split, use its top
            }
          }
        }
        
        // Ensure we made progress (prevent infinite loop)
        if (actualPageEnd <= currentPageStart) {
          actualPageEnd = Math.floor(currentPageStart + contentHeightPx);
        }
        
        pageBreaks.push({ 
          startPx: Math.floor(currentPageStart), 
          endPx: actualPageEnd 
        });
        currentPageStart = actualPageEnd;
      }
      
      const totalPages = pageBreaks.length;
      
      // Add content page by page using calculated break points
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        if (pageNum > 1) {
          pdf.addPage();
        }
        
        const pageBreak = pageBreaks[pageNum - 1];
        const sourceY = pageBreak.startPx;
        const sourceHeight = pageBreak.endPx - pageBreak.startPx;
        
        // Convert to mm for PDF placement
        const sliceHeightMm = (sourceHeight / canvas.width) * imgWidth;
        
        // Create a temporary canvas with just this slice
        const sliceCanvas = document.createElement('canvas');
        const sliceCtx = sliceCanvas.getContext('2d');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sourceHeight;
        
        // Draw the slice
        sliceCtx?.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
        
        // Convert slice to data URL
        const sliceImgData = sliceCanvas.toDataURL('image/png', 1.0);
        
        // Add the image slice to this page
        pdf.addImage(sliceImgData, 'PNG', marginMm, marginMm, imgWidth, sliceHeightMm, '', 'FAST');
        
        // Add footer matching app footer exactly - centered and bolded
        const footerStartY = pageHeight - marginMm - 8;
        
        // First line: SUBJECT TO CHANGE (bold, centered)
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(100, 100, 100); // Gray color
        const subjectText = 'SUBJECT TO CHANGE';
        const subjectTextWidth = pdf.getTextWidth(subjectText);
        pdf.text(subjectText, (pageWidth - subjectTextWidth) / 2, footerStartY);
        
        // Second line: Page X of Y (normal weight, centered)
        pdf.setFont('helvetica', 'normal');
        const pageText = `Page ${pageNum} of ${totalPages}`;
        const pageTextWidth = pdf.getTextWidth(pageText);
        pdf.text(pageText, (pageWidth - pageTextWidth) / 2, footerStartY + 4);
      }
      
      // Generate filename and save with Safari-friendly approach
      const formattedDate = format(parseISO(selectedDate), 'yyyy-MM-dd');
      const filename = `${formattedDate}-${project.name}-Daily Call.pdf`;
      
      // Use a timeout to ensure Safari processes the PDF generation properly
      setTimeout(() => {
        pdf.save(filename);
        toast({
          title: "PDF Downloaded",
          description: `Daily call sheet exported as ${totalPages}-page PDF.`,
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

  const handlePrint = async () => {
    try {
      // Generate PDF and open for printing (similar to exportToPDF but opens for print)
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      const dailyCallElement = document.querySelector('#daily-call-content');
      if (!dailyCallElement) {
        toast({
          title: "Print Error",
          description: "Could not find daily call content to print.",
          variant: "destructive",
        });
        return;
      }
      
      // Create canvas directly from the original element (like exportToPDF does)
      const canvas = await html2canvas(dailyCallElement, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'white',
        logging: false,
        width: 794,
        windowWidth: 1200
      });
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });
      
      const marginMm = 12.7; // 0.5 inch margins
      const pageWidth = 215.9; // 8.5 inches
      const pageHeight = 279.4; // 11 inches
      const contentWidth = pageWidth - (2 * marginMm);
      const contentHeight = pageHeight - (2 * marginMm) - 12; // Reserve space for footer
      
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add content to PDF
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      if (imgHeight <= contentHeight) {
        // Single page
        pdf.addImage(imgData, 'PNG', marginMm, marginMm, imgWidth, imgHeight);
        
        // Add footer
        const footerStartY = pageHeight - marginMm - 8;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(100, 100, 100);
        const subjectText = 'SUBJECT TO CHANGE';
        const subjectTextWidth = pdf.getTextWidth(subjectText);
        pdf.text(subjectText, (pageWidth - subjectTextWidth) / 2, footerStartY);
        
        pdf.setFont('helvetica', 'normal');
        const pageText = 'Page 1 of 1';
        const pageTextWidth = pdf.getTextWidth(pageText);
        pdf.text(pageText, (pageWidth - pageTextWidth) / 2, footerStartY + 4);
      } else {
        // Multi-page handling
        const totalPages = Math.ceil(imgHeight / contentHeight);
        
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          if (pageNum > 1) pdf.addPage();
          
          const yOffset = -(pageNum - 1) * contentHeight;
          pdf.addImage(imgData, 'PNG', marginMm, marginMm + yOffset, imgWidth, imgHeight);
          
          const footerStartY = pageHeight - marginMm - 8;
          
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(100, 100, 100);
          const subjectText = 'SUBJECT TO CHANGE';
          const subjectTextWidth = pdf.getTextWidth(subjectText);
          pdf.text(subjectText, (pageWidth - subjectTextWidth) / 2, footerStartY);
          
          pdf.setFont('helvetica', 'normal');
          const pageText = `Page ${pageNum} of ${totalPages}`;
          const pageTextWidth = pdf.getTextWidth(pageText);
          pdf.text(pageText, (pageWidth - pageTextWidth) / 2, footerStartY + 4);
        }
      }
      
      // Create blob URL and open for printing
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      // Open PDF in new window for printing
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 1000);
      } else {
        toast({
          title: "Print Error",
          description: "Please allow pop-ups to use the print function.",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('Print error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Print Error",
        description: `Failed to generate daily call for printing: ${errorMessage}`,
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
      {/* Desktop Header */}
      <div className="hidden md:block bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold">
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
              <Upload className="h-4 w-4 hover:text-blue-600 transition-colors" />
            </Button>
            {!isEditing && existingDailyCall && (
              <Button onClick={() => setShowDeleteDialog(true)} variant="ghost" size="icon" className="border-0 hover:bg-transparent">
                <Trash2 className="h-4 w-4 hover:text-red-600 transition-colors" />
              </Button>
            )}
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="ghost" size="icon" className="border-0 hover:bg-transparent">
                <Edit className="h-4 w-4 hover:text-blue-600 transition-colors" />
              </Button>
            )}
            {isEditing && (
              <>
                <Button 
                  onClick={() => setShowImportDialog(true)} 
                  variant="outline"
                  data-testid="button-import-schedule"
                >
                  <Import className="h-4 w-4 mr-2" />
                  Import from Schedule
                </Button>
                <Button onClick={handleSave} disabled={saveCallMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {saveCallMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Add minimal top padding */}
      <div className="md:hidden pt-4"></div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div id="daily-call-content" className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Call Sheet Header */}
          <div className="text-center mb-8" data-pdf-section="header">
            <h2 className="text-3xl font-bold text-gray-900">{project?.name}</h2>
            <h3 className="text-xl text-black mt-2">DAILY SCHEDULE</h3>
            <p className="text-lg text-black mt-0.5">
              {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>

          {/* Call Schedule by Location */}
          <div className="space-y-6" data-pdf-section="schedule">

            {(callData.locations || []).length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No schedule events found for this date.</p>
                  <Button onClick={() => addLocation()} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Manual Call Sheet
                  </Button>
                </CardContent>
              </Card>
            ) : (callData.locations || []).length === 1 ? (
              // Single location - full width
              <div className="space-y-8">
                {(callData.locations || []).map((location, locationIndex) => (
                  <div key={locationIndex} className="space-y-1" data-pdf-section={`location-${locationIndex}`}>
                    <div className="border-b-2 border-black pb-2 flex items-center justify-between">
                      {isEditing ? (
                        <Select
                          value={location.name}
                          onValueChange={(value) => updateLocationName(locationIndex, value)}
                        >
                          <SelectTrigger className="w-auto border-0 p-0 text-lg font-semibold focus:ring-0 focus:ring-offset-0" data-testid={`select-location-${locationIndex}`}>
                            <SelectValue placeholder="Select location">{location.name || 'Select location'}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {eventLocations.length > 0 ? (
                              eventLocations.map((loc: any) => (
                                <SelectItem key={loc.id} value={loc.name} data-testid={`select-location-option-${loc.id}`}>
                                  {loc.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value={location.name} data-testid="select-location-current">{location.name}</SelectItem>
                            )}
                            <SelectItem value="New Location" data-testid="select-location-new">New Location</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <h4 className="text-lg font-semibold text-gray-900" data-testid={`text-location-name-${locationIndex}`}>
                          {location.name}
                        </h4>
                      )}
                      {isEditing && (
                        <Button 
                          onClick={() => {
                            console.log('TEST: Add event button clicked for location:', locationIndex);
                            addEvent(locationIndex);
                          }}
                          size="sm"
                          variant="outline"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Event
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2 overflow-visible">
                      {(location.events || []).map((event, eventIdx) => (
                        <div 
                          key={event.id} 
                          data-pdf-item={`event-${event.id}`}
                          data-end-of-day-row={event.title === 'END-OF-DAY' ? 'true' : undefined}
                          className={`flex ${event.title === 'END-OF-DAY' ? 'items-center' : 'items-start'} gap-6 ${event.title === 'END-OF-DAY' ? 'bg-gray-100 py-1 relative overflow-visible' : 'py-2'}`}
                          onClick={(e) => {
                            console.log('Row clicked:', { eventTitle: event.title, isEditing });
                            if (isEditing && event.title === 'END-OF-DAY') {
                              console.log('Add event (row clicked) for location:', locationIndex);
                              addEvent(locationIndex);
                            }
                          }}
                          style={isEditing && event.title === 'END-OF-DAY' ? { cursor: 'pointer' } : {}}
                        >
                          {/* Add Event Button in Left Margin - only show on END-OF-DAY row */}
                          {isEditing && event.title === 'END-OF-DAY' && (
                            <div
                              className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-6 opacity-0 hover:opacity-100 transition-opacity duration-200 z-10 flex items-center justify-center"
                            >
                              <Plus className="h-4 w-4 text-black" />
                            </div>
                          )}
                          <div className="w-20 text-sm font-medium text-gray-700 flex-shrink-0">
                            {event.title === 'END-OF-DAY' ? (
                              <span className="font-bold leading-none flex items-center h-full">{event.startTime}</span>
                            ) : (
                              isEditing ? (
                                <div className="flex flex-col gap-1">
                                  <Input
                                    value={event.startTime}
                                    onChange={(e) => {
                                      const newLocations = [...callData.locations];
                                      newLocations[locationIndex].events[eventIdx].startTime = e.target.value;
                                      setCallData(prev => ({ ...prev, locations: newLocations }));
                                    }}
                                    className="text-xs w-24"
                                    placeholder="9:00 AM"
                                    data-testid={`input-start-time-${locationIndex}-${eventIdx}`}
                                  />
                                  <Input
                                    value={event.endTime}
                                    onChange={(e) => {
                                      updateLocationEventProperty(locationIndex, eventIdx, 'endTime', e.target.value);
                                    }}
                                    className="text-xs w-24"
                                    placeholder="10:00 AM"
                                    data-testid={`input-end-time-${locationIndex}-${eventIdx}`}
                                  />
                                </div>
                              ) : event.startTime
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
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
                              {isEditing && event.title !== 'END-OF-DAY' && (
                                <Button
                                  onClick={() => removeLocationEvent(locationIndex, eventIdx)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 ml-2"
                                  data-testid={`button-delete-event-${locationIndex}-${eventIdx}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Add Event button for this location */}
                      {isEditing && (
                        <div className="pt-2 border-t border-gray-100">
                          <Button
                            onClick={() => addEvent(locationIndex)}
                            variant="outline"
                            size="sm"
                            className="w-full"
                            data-testid={`button-add-event-location-${locationIndex}`}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Event to {location.name}
                          </Button>
                        </div>
                      )}

                    </div>
                  </div>
                ))}
              </div>
            ) : (callData.locations || []).length === 2 ? (
              // Exactly 2 locations - two-column chronologically aligned layout
              <div className="space-y-1" data-pdf-section="two-column-schedule">
                {/* Column headers */}
                <div className="grid grid-cols-7 gap-0">
                  {(callData.locations || []).map((location, locationIndex) => (
                    <div key={locationIndex} className={`${locationIndex === 0 ? 'col-span-4' : 'col-span-3'}`}>
                      <div className="border-b-2 border-black pb-2">
                        {isEditing ? (
                          <Select
                            value={location.name}
                            onValueChange={(value) => updateLocationName(locationIndex, value)}
                          >
                            <SelectTrigger className="w-auto border-0 p-0 text-lg font-semibold focus:ring-0 focus:ring-offset-0" data-testid={`select-multi-location-${locationIndex}`}>
                              <SelectValue placeholder="Select location">{location.name || 'Select location'}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {eventLocations.length > 0 ? (
                                eventLocations.map((loc: any) => (
                                  <SelectItem key={loc.id} value={loc.name} data-testid={`select-multi-location-option-${loc.id}`}>
                                    {loc.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value={location.name} data-testid="select-multi-location-current">{location.name}</SelectItem>
                              )}
                              <SelectItem value="New Location" data-testid="select-multi-location-new">New Location</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <h4 className="text-lg font-semibold text-gray-900" data-testid={`text-multi-location-name-${locationIndex}`}>
                            {location.name}
                          </h4>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Events chronologically aligned across columns */}
                <div className="space-y-2">
                  {(() => {
                    // Parse time string to minutes for comparison
                    const parseTimeToMinutes = (timeStr: string): number => {
                      if (!timeStr || typeof timeStr !== 'string') return 0;
                      let cleanTime = timeStr.trim();
                      if (cleanTime.includes(' ')) {
                        const [time, period] = cleanTime.split(' ');
                        if (time && time.includes(':')) {
                          let [hours, minutes] = time.split(':').map(Number);
                          if (period === 'PM' && hours !== 12) hours += 12;
                          if (period === 'AM' && hours === 12) hours = 0;
                          return hours * 60 + (minutes || 0);
                        }
                      } else if (cleanTime.includes(':')) {
                        const [hours, minutes] = cleanTime.split(':').map(Number);
                        return hours * 60 + (minutes || 0);
                      }
                      return 0;
                    };

                    // Get events by location (excluding END-OF-DAY)
                    const location0Events = (callData.locations[0]?.events || [])
                      .filter(e => e.title !== 'END-OF-DAY')
                      .map((e, idx) => ({ ...e, originalIdx: idx }));
                    const location1Events = (callData.locations[1]?.events || [])
                      .filter(e => e.title !== 'END-OF-DAY')
                      .map((e, idx) => ({ ...e, originalIdx: idx }));

                    // Collect all unique time slots and sort them
                    const allTimeSlots = new Map<number, { time: string, loc0Events: any[], loc1Events: any[] }>();
                    
                    location0Events.forEach(event => {
                      const minutes = parseTimeToMinutes(event.startTime);
                      if (!allTimeSlots.has(minutes)) {
                        allTimeSlots.set(minutes, { time: event.startTime, loc0Events: [], loc1Events: [] });
                      }
                      allTimeSlots.get(minutes)!.loc0Events.push(event);
                    });
                    
                    location1Events.forEach(event => {
                      const minutes = parseTimeToMinutes(event.startTime);
                      if (!allTimeSlots.has(minutes)) {
                        allTimeSlots.set(minutes, { time: event.startTime, loc0Events: [], loc1Events: [] });
                      }
                      allTimeSlots.get(minutes)!.loc1Events.push(event);
                    });

                    // Sort time slots chronologically
                    const sortedTimeSlots = Array.from(allTimeSlots.entries())
                      .sort((a, b) => a[0] - b[0])
                      .map(([_, slot]) => slot);

                    // Flatten slots into aligned rows
                    const alignedRows: Array<{ loc0Event: any | null, loc1Event: any | null, rowKey: string }> = [];
                    sortedTimeSlots.forEach((slot, slotIndex) => {
                      const maxEvents = Math.max(slot.loc0Events.length, slot.loc1Events.length);
                      for (let eventIdx = 0; eventIdx < maxEvents; eventIdx++) {
                        alignedRows.push({
                          loc0Event: slot.loc0Events[eventIdx] || null,
                          loc1Event: slot.loc1Events[eventIdx] || null,
                          rowKey: `slot-${slotIndex}-${eventIdx}`
                        });
                      }
                    });

                    // Render aligned rows
                    return alignedRows.map(({ loc0Event, loc1Event, rowKey }) => (
                          <div key={rowKey} className="grid grid-cols-7 gap-0">
                            {/* Left column (location 0) */}
                            <div className="col-span-4">
                              {loc0Event ? (
                                <div className="flex items-start gap-6 py-2">
                                  <div className="w-20 text-sm font-medium text-gray-700 flex-shrink-0">
                                    {isEditing ? (
                                      <div className="flex flex-col gap-1">
                                        <Input
                                          value={loc0Event.startTime}
                                          onChange={(e) => {
                                            const newLocations = [...callData.locations];
                                            const realIdx = newLocations[0].events.findIndex(ev => ev.id === loc0Event.id);
                                            if (realIdx !== -1) {
                                              newLocations[0].events[realIdx].startTime = e.target.value;
                                              setCallData(prev => ({ ...prev, locations: newLocations }));
                                            }
                                          }}
                                          className="text-xs w-24"
                                          placeholder="9:00 AM"
                                        />
                                        <Input
                                          value={loc0Event.endTime}
                                          onChange={(e) => {
                                            const realIdx = callData.locations[0].events.findIndex(ev => ev.id === loc0Event.id);
                                            if (realIdx !== -1) {
                                              updateLocationEventProperty(0, realIdx, 'endTime', e.target.value);
                                            }
                                          }}
                                          className="text-xs w-24"
                                          placeholder="10:00 AM"
                                        />
                                      </div>
                                    ) : loc0Event.startTime}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <div className="text-sm font-bold text-gray-800">
                                          {isEditing ? (
                                            <Input
                                              value={loc0Event.title}
                                              onChange={(e) => {
                                                const newLocations = [...callData.locations];
                                                const realIdx = newLocations[0].events.findIndex(ev => ev.id === loc0Event.id);
                                                if (realIdx !== -1) {
                                                  newLocations[0].events[realIdx].title = e.target.value;
                                                  setCallData(prev => ({ ...prev, locations: newLocations }));
                                                }
                                              }}
                                              className="font-medium text-sm"
                                            />
                                          ) : loc0Event.title}
                                        </div>
                                        {isEditing ? (
                                          <div className="mt-2">
                                            <Label className="text-xs font-medium text-gray-600">Cast Called:</Label>
                                            <div className="mt-1">
                                              <CastSelector
                                                contacts={contacts}
                                                selectedCast={loc0Event.cast || []}
                                                onChange={(newCast) => {
                                                  const newLocations = [...callData.locations];
                                                  const realIdx = newLocations[0].events.findIndex(ev => ev.id === loc0Event.id);
                                                  if (realIdx !== -1) {
                                                    newLocations[0].events[realIdx].cast = newCast;
                                                    setCallData(prev => ({ ...prev, locations: newLocations }));
                                                  }
                                                }}
                                                placeholder="Type to search cast members..."
                                              />
                                            </div>
                                          </div>
                                        ) : (
                                          loc0Event.cast && loc0Event.cast.length > 0 && (
                                            <div className="text-xs text-black mt-1">
                                              {loc0Event.cast.join(', ')}
                                            </div>
                                          )
                                        )}
                                      </div>
                                      {isEditing && (
                                        <Button
                                          onClick={() => {
                                            const realIdx = callData.locations[0].events.findIndex(ev => ev.id === loc0Event.id);
                                            if (realIdx !== -1) {
                                              removeLocationEvent(0, realIdx);
                                            }
                                          }}
                                          variant="ghost"
                                          size="sm"
                                          className="text-red-500 hover:text-red-700 ml-2"
                                          data-testid={`button-delete-multi-event-0-${loc0Event.id}`}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="py-2" />
                              )}
                            </div>

                            {/* Right column (location 1) */}
                            <div className="col-span-3">
                              {loc1Event ? (
                                <div className="flex items-start gap-6 py-2">
                                  <div className="w-20 text-sm font-medium text-gray-700 flex-shrink-0">
                                    {isEditing ? (
                                      <div className="flex flex-col gap-1">
                                        <Input
                                          value={loc1Event.startTime}
                                          onChange={(e) => {
                                            const newLocations = [...callData.locations];
                                            const realIdx = newLocations[1].events.findIndex(ev => ev.id === loc1Event.id);
                                            if (realIdx !== -1) {
                                              newLocations[1].events[realIdx].startTime = e.target.value;
                                              setCallData(prev => ({ ...prev, locations: newLocations }));
                                            }
                                          }}
                                          className="text-xs w-24"
                                          placeholder="9:00 AM"
                                        />
                                        <Input
                                          value={loc1Event.endTime}
                                          onChange={(e) => {
                                            const realIdx = callData.locations[1].events.findIndex(ev => ev.id === loc1Event.id);
                                            if (realIdx !== -1) {
                                              updateLocationEventProperty(1, realIdx, 'endTime', e.target.value);
                                            }
                                          }}
                                          className="text-xs w-24"
                                          placeholder="10:00 AM"
                                        />
                                      </div>
                                    ) : loc1Event.startTime}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <div className="text-sm font-bold text-gray-800">
                                          {isEditing ? (
                                            <Input
                                              value={loc1Event.title}
                                              onChange={(e) => {
                                                const newLocations = [...callData.locations];
                                                const realIdx = newLocations[1].events.findIndex(ev => ev.id === loc1Event.id);
                                                if (realIdx !== -1) {
                                                  newLocations[1].events[realIdx].title = e.target.value;
                                                  setCallData(prev => ({ ...prev, locations: newLocations }));
                                                }
                                              }}
                                              className="font-medium text-sm"
                                            />
                                          ) : loc1Event.title}
                                        </div>
                                        {isEditing ? (
                                          <div className="mt-2">
                                            <Label className="text-xs font-medium text-gray-600">Cast Called:</Label>
                                            <div className="mt-1">
                                              <CastSelector
                                                contacts={contacts}
                                                selectedCast={loc1Event.cast || []}
                                                onChange={(newCast) => {
                                                  const newLocations = [...callData.locations];
                                                  const realIdx = newLocations[1].events.findIndex(ev => ev.id === loc1Event.id);
                                                  if (realIdx !== -1) {
                                                    newLocations[1].events[realIdx].cast = newCast;
                                                    setCallData(prev => ({ ...prev, locations: newLocations }));
                                                  }
                                                }}
                                                placeholder="Type to search cast members..."
                                              />
                                            </div>
                                          </div>
                                        ) : (
                                          loc1Event.cast && loc1Event.cast.length > 0 && (
                                            <div className="text-xs text-black mt-1">
                                              {loc1Event.cast.join(', ')}
                                            </div>
                                          )
                                        )}
                                      </div>
                                      {isEditing && (
                                        <Button
                                          onClick={() => {
                                            const realIdx = callData.locations[1].events.findIndex(ev => ev.id === loc1Event.id);
                                            if (realIdx !== -1) {
                                              removeLocationEvent(1, realIdx);
                                            }
                                          }}
                                          variant="ghost"
                                          size="sm"
                                          className="text-red-500 hover:text-red-700 ml-2"
                                          data-testid={`button-delete-multi-event-1-${loc1Event.id}`}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="py-2" />
                              )}
                            </div>
                          </div>
                        ));
                  })()}
                </div>

                {/* Add Event buttons for each location */}
                {isEditing && (
                  <div className="grid grid-cols-7 gap-4 pt-2 border-t border-gray-100">
                    <div className="col-span-4">
                      <Button
                        onClick={() => addEvent(0)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        data-testid="button-add-event-multi-location-0"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Event to {callData.locations[0]?.name || 'Primary'}
                      </Button>
                    </div>
                    <div className="col-span-3">
                      <Button
                        onClick={() => addEvent(1)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        data-testid="button-add-event-multi-location-1"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Event to {callData.locations[1]?.name || 'Secondary'}
                      </Button>
                    </div>
                  </div>
                )}

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
                      <div key={`end-of-day-${index}`} data-end-of-day-row="true" className="bg-gray-100 py-2 relative flex items-center">
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
                        <div className="flex items-center gap-6">
                          <div className="w-20 text-sm font-medium text-gray-700 flex-shrink-0">
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
            ) : (
              // More than 2 locations - single column with all locations listed
              // Primary locations first, then secondary locations
              <div className="space-y-8">
                {(callData.locations || []).map((location, locationIndex) => (
                  <div key={locationIndex} className="space-y-1" data-pdf-section={`location-${locationIndex}`}>
                    <div className="border-b-2 border-black pb-2 flex items-center justify-between">
                      {isEditing ? (
                        <Select
                          value={location.name}
                          onValueChange={(value) => updateLocationName(locationIndex, value)}
                        >
                          <SelectTrigger className="w-auto border-0 p-0 text-lg font-semibold focus:ring-0 focus:ring-offset-0" data-testid={`select-multi-col-location-${locationIndex}`}>
                            <SelectValue placeholder="Select location">{location.name || 'Select location'}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {eventLocations.length > 0 ? (
                              eventLocations.map((loc: any) => (
                                <SelectItem key={loc.id} value={loc.name} data-testid={`select-multi-col-location-option-${loc.id}`}>
                                  {loc.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value={location.name} data-testid="select-multi-col-location-current">{location.name}</SelectItem>
                            )}
                            <SelectItem value="New Location" data-testid="select-multi-col-location-new">New Location</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <h4 className="text-lg font-semibold text-gray-900" data-testid={`text-multi-col-location-name-${locationIndex}`}>
                          {location.name}
                          {location.locationType && (
                            <span className="ml-2 text-sm font-normal text-gray-500">
                              ({location.locationType === 'main' ? 'Primary' : 'Secondary'})
                            </span>
                          )}
                        </h4>
                      )}
                      {isEditing && (
                        <Button 
                          onClick={() => addEvent(locationIndex)}
                          size="sm"
                          variant="outline"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Event
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2 overflow-visible">
                      {(location.events || []).filter(event => event.title !== 'END-OF-DAY').map((event, eventIdx) => (
                        <div 
                          key={event.id}
                          data-pdf-item={`event-${event.id}`}
                          className="flex items-start gap-6 py-2"
                        >
                          <div className="w-20 text-sm font-medium text-gray-700 flex-shrink-0">
                            {isEditing ? (
                              <div className="flex flex-col gap-1">
                                <Input
                                  value={event.startTime}
                                  onChange={(e) => {
                                    const newLocations = [...callData.locations];
                                    newLocations[locationIndex].events[eventIdx].startTime = e.target.value;
                                    setCallData(prev => ({ ...prev, locations: newLocations }));
                                  }}
                                  className="text-xs w-24"
                                  placeholder="9:00 AM"
                                  data-testid={`input-multi-col-start-time-${locationIndex}-${eventIdx}`}
                                />
                                <Input
                                  value={event.endTime}
                                  onChange={(e) => {
                                    updateLocationEventProperty(locationIndex, eventIdx, 'endTime', e.target.value);
                                  }}
                                  className="text-xs w-24"
                                  placeholder="10:00 AM"
                                  data-testid={`input-multi-col-end-time-${locationIndex}-${eventIdx}`}
                                />
                              </div>
                            ) : event.startTime}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="text-sm font-bold text-gray-800">
                                  {isEditing ? (
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
                                {isEditing ? (
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
                              {isEditing && (
                                <Button
                                  onClick={() => removeLocationEvent(locationIndex, eventIdx)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 ml-2"
                                  data-testid={`button-delete-multi-col-event-${locationIndex}-${eventIdx}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Add Event button for this location */}
                      {isEditing && (
                        <div className="pt-2 border-t border-gray-100">
                          <Button
                            onClick={() => addEvent(locationIndex)}
                            variant="outline"
                            size="sm"
                            className="w-full"
                            data-testid={`button-add-event-multi-col-location-${locationIndex}`}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Event to {location.name}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Full-width END-OF-DAY section after all locations */}
                {(callData.locations || []).some(location => 
                  (location.events || []).some(event => event.title === 'END-OF-DAY')
                ) && (
                  <div className="mt-4">
                    {(callData.locations || []).flatMap((location, locationIndex) => 
                      (location.events || [])
                        .filter(event => event.title === 'END-OF-DAY')
                        .map(event => ({ event, locationIndex }))
                    ).map(({ event, locationIndex }, index) => (
                      <div key={`end-of-day-multi-${index}`} data-end-of-day-row="true" className="bg-gray-100 py-2 relative flex items-center">
                        {isEditing && index === 0 && (
                          <Button
                            onClick={() => addEvent(callData.locations.length - 1)}
                            variant="ghost"
                            size="sm"
                            className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-6 p-0 opacity-0 hover:opacity-100 transition-opacity duration-200 bg-transparent hover:bg-transparent text-black"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                        <div className="flex items-center gap-6">
                          <div className="w-20 text-sm font-medium text-gray-700 flex-shrink-0">
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

            {/* Edit Mode Action Buttons */}
            {isEditing && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
                {(callData.locations || []).length < 2 && (
                  <Button
                    onClick={() => addLocation()}
                    variant="outline"
                    size="sm"
                    data-testid="button-add-secondary-location"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Secondary Location
                  </Button>
                )}
                <Button
                  onClick={addFittingsSection}
                  variant="outline"
                  size="sm"
                  data-testid="button-add-fitting"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Fitting
                </Button>
                <Button
                  onClick={addAppointmentsSection}
                  variant="outline"
                  size="sm"
                  data-testid="button-add-meeting"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Meeting
                </Button>
              </div>
            )}
          </div>

          {/* Fittings Section - show if there are fittings events */}
          {(callData.fittingsEvents && callData.fittingsEvents.length > 0) && (
            <div className="mt-6" data-pdf-section="fittings" data-pdf-priority="high">
              <div className="border-b-2 border-black pb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Fittings</h3>
                {isEditing && (
                  <Button onClick={addFittingsSection} variant="outline" size="sm" data-testid="button-add-fitting-inline">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Fitting
                  </Button>
                )}
              </div>
              <div className="space-y-2 mt-1">
                {callData.fittingsEvents
                  .sort(sortByTime)
                  .map((event, index) => (
                    <div key={`fitting-${event.id}`} data-pdf-item={`fitting-${event.id}`} className="flex items-start gap-6 py-2">
                      <div className="w-20 text-sm font-medium text-gray-700 flex-shrink-0">
                        {isEditing ? (
                          <Input
                            value={event.startTime}
                            onChange={(e) => updateFittingEvent(index, { startTime: e.target.value })}
                            className="text-xs w-24"
                            placeholder="10:00 AM"
                          />
                        ) : event.startTime}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <div className="text-sm font-bold text-gray-800">
                            {isEditing ? (
                              <Input
                                value={event.title}
                                onChange={(e) => updateFittingEvent(index, { title: e.target.value })}
                                className="font-medium text-sm"
                              />
                            ) : (
                              <>
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
                              </>
                            )}
                          </div>
                          {isEditing ? (
                            <Button
                              onClick={() => removeFittingEvent(index)}
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            (event.location?.trim() || fittingsLocationName) && 
                            <div className="text-xs text-gray-600">{event.location?.trim() || fittingsLocationName}</div>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="mt-2">
                            <Label className="text-xs font-medium text-gray-600">Cast:</Label>
                            <div className="mt-1">
                              <CastSelector
                                contacts={contacts}
                                selectedCast={event.cast || []}
                                onChange={(newCast) => updateFittingEvent(index, { cast: newCast })}
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
                        {!isEditing && event.notes && (
                          <div className="text-xs text-gray-600 mt-1">{event.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Appointments & Meetings Section - show if there are appointments events */}
          {(callData.appointmentsEvents && callData.appointmentsEvents.length > 0) && (
            <div className="mt-6">
              <div className="border-b-2 border-black pb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Appointments & Meetings</h3>
                {isEditing && (
                  <Button onClick={addAppointmentsSection} variant="outline" size="sm" data-testid="button-add-meeting-inline">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Meeting
                  </Button>
                )}
              </div>
              <div className="space-y-2 mt-1">
                {callData.appointmentsEvents
                  .sort(sortByTime)
                  .map((event, index) => (
                    <div key={`appointment-${event.id}`} data-pdf-item={`appointment-${event.id}`} className="flex items-start gap-6 py-2">
                      <div className="w-20 text-sm font-medium text-gray-700 flex-shrink-0">
                        {isEditing ? (
                          <Input
                            value={event.startTime}
                            onChange={(e) => updateAppointmentEvent(index, { startTime: e.target.value })}
                            className="text-xs w-24"
                            placeholder="10:00 AM"
                          />
                        ) : event.startTime}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <div className="text-sm font-bold text-gray-800">
                            {isEditing ? (
                              <Input
                                value={event.title}
                                onChange={(e) => updateAppointmentEvent(index, { title: e.target.value })}
                                className="font-medium text-sm"
                              />
                            ) : (
                              <>
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
                              </>
                            )}
                          </div>
                          {isEditing ? (
                            <Button
                              onClick={() => removeAppointmentEvent(index)}
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            (event.location?.trim() || appointmentsLocationName) && 
                            <div className="text-xs text-gray-600">{event.location?.trim() || appointmentsLocationName}</div>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="mt-2">
                            <Label className="text-xs font-medium text-gray-600">Attendees:</Label>
                            <div className="mt-1">
                              <CastSelector
                                contacts={contacts}
                                selectedCast={event.cast || []}
                                onChange={(newCast) => updateAppointmentEvent(index, { cast: newCast })}
                                placeholder="Type to search attendees..."
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
                        {!isEditing && event.notes && (
                          <div className="text-xs text-gray-600 mt-1">{event.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Announcements Section */}
          <div className="mt-6" data-pdf-section="announcements" data-pdf-priority="high">
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Daily Call?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the saved daily call for {format(parseISO(selectedDate), 'MMMM d, yyyy')}.
              <br /><br />
              <strong>Your schedule events will NOT be affected.</strong> This only removes the saved daily call sheet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCallMutation.mutate()}
              disabled={deleteCallMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteCallMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import from Schedule Confirmation Dialog */}
      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import from Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will import all scheduled events for {format(parseISO(selectedDate), 'MMMM d, yyyy')} into this daily call.
              <br /><br />
              Events will be categorized automatically:
              <ul className="list-disc ml-4 mt-2">
                <li>Regular events grouped by location</li>
                <li>Fittings and costume events</li>
                <li>Meetings and appointments</li>
              </ul>
              <br />
              <strong>You can continue editing after import.</strong> Existing data will be replaced with the imported schedule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={importFromSchedule}
              disabled={importLoading}
              data-testid="button-confirm-import"
            >
              {importLoading ? 'Importing...' : 'Import'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}