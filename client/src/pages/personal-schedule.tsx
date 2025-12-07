import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Calendar, AlertCircle, X, MapPin, Clock, Users, History, ChevronRight } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getEventTypeColorFromDatabase, isLightColor } from "@/lib/eventUtils";

interface HistoricalWeek {
  weekStart: string;
  weekEnd: string;
  version: string;
  publishedAt: string;
  eventCount: number;
  isLegacy?: boolean;
}

interface EventType {
  id: number;
  name: string;
  color: string;
}

interface PersonalScheduleData {
  personalSchedule: {
    id: number;
    accessToken: string;
    lastViewedAt?: string;
  };
  project: {
    id: number;
    name: string;
    description?: string;
  };
  contact: {
    id: number;
    firstName?: string;
    lastName?: string;
    email: string;
    contactType: string;
  };
  version: {
    id: number;
    version: string;
    versionType: 'major' | 'minor';
    minorVersion?: number;
    title: string;
    description?: string;
    publishedAt: string;
  } | null;
  events: Array<{
    id: number;
    title: string;
    description?: string;
    date: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    type: string;
    isAllDay: boolean;
    notes?: string;
    eventTypeId?: number;
  }>;
  historicalWeeks?: HistoricalWeek[];
  eventTypes?: EventType[];
}

interface HistoricalWeekEvents {
  weekStart: string;
  weekEnd: string;
  version: string;
  publishedAt: string;
  events: Array<{
    id: number;
    title: string;
    description?: string;
    date: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    type: string;
    isAllDay: boolean;
    notes?: string;
    eventTypeId?: number;
  }>;
  eventTypes?: EventType[];
}

interface PersonalScheduleViewerProps {
  token: string;
}

function PersonalScheduleViewer({ token }: PersonalScheduleViewerProps) {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showPreviousSchedules, setShowPreviousSchedules] = useState(false);
  const [selectedHistoricalWeek, setSelectedHistoricalWeek] = useState<string | null>(null);

  const { data: scheduleData, isLoading, error } = useQuery<PersonalScheduleData>({
    queryKey: token === "test" ? [`/api/schedule/test-personal`] : [`/api/schedule/${token}`],
    enabled: !!token,
  });

  // Fetch historical week events on demand (not available for test tokens)
  const isTestToken = token === "test";
  const { data: historicalWeekData, isLoading: isLoadingHistorical } = useQuery<HistoricalWeekEvents>({
    queryKey: [`/api/schedule/${token}/history/${selectedHistoricalWeek}`],
    enabled: !!token && !!selectedHistoricalWeek && !isTestToken,
  });



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Loading Your Personal Schedule</h2>
          <p className="text-gray-600">Please wait while we fetch your personalized schedule...</p>
        </div>
      </div>
    );
  }

  if (error || !scheduleData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Error</h2>
          <p className="text-gray-600 mb-4">
            This personal schedule link is no longer valid. It may have expired or been deactivated.
          </p>
          <p className="text-sm text-gray-500">
            Please contact your stage manager for a new link.
          </p>
        </div>
      </div>
    );
  }

  const { personalSchedule, project, contact, version, events } = scheduleData;
  const contactName = contact.firstName ? `${contact.firstName} ${contact.lastName || ''}`.trim() : contact.email;
  
  // Helper to get week start (Sunday) for a date
  const getWeekStart = (dateString: string): string => {
    const date = parseISO(dateString);
    const dayOfWeek = date.getDay();
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - dayOfWeek);
    return format(weekStart, 'yyyy-MM-dd');
  };

  // Sort events by date and time
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.startTime || '00:00:00'}`);
    const dateB = new Date(`${b.date}T${b.startTime || '00:00:00'}`);
    return dateA.getTime() - dateB.getTime();
  });

  // Group events by week, then by date
  const eventsByWeek = sortedEvents.reduce((acc, event) => {
    const weekKey = getWeekStart(event.date);
    if (!acc[weekKey]) {
      acc[weekKey] = {};
    }
    const dateKey = event.date;
    if (!acc[weekKey][dateKey]) {
      acc[weekKey][dateKey] = [];
    }
    acc[weekKey][dateKey].push(event);
    return acc;
  }, {} as Record<string, Record<string, typeof sortedEvents>>);

  // Sort events within each date by time
  Object.values(eventsByWeek).forEach(weekEvents => {
    Object.values(weekEvents).forEach(dayEvents => {
      dayEvents.sort((a, b) => {
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        if (a.isAllDay && b.isAllDay) return 0;
        const timeA = a.startTime || '00:00:00';
        const timeB = b.startTime || '00:00:00';
        return timeA.localeCompare(timeB);
      });
    });
  });

  // Get sorted week keys
  const sortedWeeks = Object.keys(eventsByWeek).sort();
  
  // Format week range for display
  const formatWeekRange = (weekStart: string): string => {
    const start = parseISO(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, 'EEEE, MMMM d, yyyy') : dateString;
    } catch {
      return dateString;
    }
  };

  const formatPublishedDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return dateString;
      
      // Format as: Saturday, July 19, 2025 at 13:05
      // Using 24-hour format as default (can be enhanced with show settings later)
      return format(date, 'EEEE, MMMM d, yyyy \'at\' HH:mm');
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'h:mm a');
    } catch {
      return timeString;
    }
  };

  const getEventTypeDisplay = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getContactTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      'cast': 'Cast Member',
      'stage_management': 'Stage Management',
      'crew': 'Crew',
      'creative_team': 'Creative Team',
      'theater_staff': 'Theater Staff'
    };
    return typeMap[type] || type;
  };

  // Get event type color from show settings, falling back to defaults
  // Can optionally pass eventTypes for historical weeks which have their own event types
  const getEventColor = (event: { type: string; eventTypeId?: number }, eventTypesOverride?: EventType[]) => {
    const eventTypesList = eventTypesOverride || scheduleData?.eventTypes || [];
    return getEventTypeColorFromDatabase(event.type, eventTypesList, event.eventTypeId);
  };

  const getVersionDisplay = (version: { version: string; versionType: 'major' | 'minor'; minorVersion?: number }) => {
    if (version.versionType === 'minor') {
      return `${version.version}.${version.minorVersion || 1}`;
    }
    return `${version.version}.0`;
  };

  // Note: Expiry checking removed as it's handled server-side

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Personal Schedule</h1>
              <div className="space-y-1">
                {version ? (
                  <p className="text-gray-600 mb-2">
                    Version {getVersionDisplay(version)}, Published: {formatPublishedDate(version.publishedAt)}
                  </p>
                ) : (
                  <p className="text-gray-600 mb-2">
                    No upcoming schedule published
                  </p>
                )}
                <p className="text-gray-700">
                  <span className="font-medium">{contactName}</span> • {getContactTypeDisplay(contact.contactType)}
                </p>
                <p className="text-gray-600">{project.name}</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Events List */}
        <div className="bg-white rounded-lg">
          <div className="px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Schedule</h2>
            <p className="text-gray-600 text-sm">
              You have {events.length} upcoming event{events.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>

          {events.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Events</h3>
              <p className="text-gray-600">
                {scheduleData.historicalWeeks && scheduleData.historicalWeeks.length > 0 
                  ? "You don't have any upcoming events scheduled. Check Previous Schedules below for past weeks."
                  : "You don't have any events assigned to you in this schedule yet."}
              </p>
            </div>
          ) : (
            <div>
              {sortedWeeks.map((weekStart, weekIndex) => {
                const weekEvents = eventsByWeek[weekStart];
                const sortedDates = Object.keys(weekEvents).sort();
                const weekEventCount = Object.values(weekEvents).flat().length;
                
                return (
                  <div key={weekStart} className={weekIndex > 0 ? "mt-6 pt-6 border-t border-gray-200" : ""}>
                    {/* Week Header */}
                    <div className="px-6 py-3 bg-gray-50 rounded-t-lg">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        Week of {formatWeekRange(weekStart)}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {weekEventCount} event{weekEventCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    
                    {/* Days within this week */}
                    {sortedDates.map((date) => {
                      const dayEvents = weekEvents[date];
                      return (
                        <div key={date}>
                          {/* Date Header */}
                          <div className="px-6 pt-4 pb-2 bg-white">
                            <h4 className="text-base font-semibold text-gray-900">{formatDate(date)}</h4>
                            <p className="text-sm text-gray-600">
                              {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          
                          {/* Events for this date */}
                          <div>
                            {dayEvents.map((event) => (
                              <div 
                                key={event.id} 
                                className="px-6 pt-2 pb-6 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => setSelectedEvent(event)}
                              >
                                <div 
                                  className="flex items-start gap-3 p-4 rounded-lg border-l-4" 
                                  style={{ 
                                    borderLeftColor: getEventColor(event),
                                    backgroundColor: `${getEventColor(event)}10`
                                  }}
                                >
                                  <div className="text-sm text-gray-700 min-w-[80px] pt-1">
                                    {event.isAllDay ? (
                                      <div>
                                        <span className="inline-flex items-center px-2 py-1 bg-white bg-opacity-80 text-gray-800 rounded text-xs font-medium">
                                          All Day
                                        </span>
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="font-medium">
                                          {formatTime(event.startTime)}
                                        </div>
                                        {event.endTime && (
                                          <div className="text-xs text-gray-600 mt-1">
                                            {formatTime(event.endTime)}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 mb-1">{event.title}</h4>
                                    {event.location && (
                                      <div className="text-sm text-gray-700 mb-1">
                                        {event.location}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Previous Schedules Button - hide for test tokens since they don't have real historical data */}
        {!isTestToken && scheduleData.historicalWeeks && scheduleData.historicalWeeks.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowPreviousSchedules(true)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              data-testid="button-previous-schedules"
            >
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-gray-500" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Previous Schedules</p>
                  <p className="text-sm text-gray-500">{scheduleData.historicalWeeks.length} past week{scheduleData.historicalWeeks.length !== 1 ? 's' : ''} available</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>This is your personal schedule for {project.name}.</p>
          <p>Powered by BackstageOS</p>
        </div>
      </div>

      {/* Previous Schedules Sheet */}
      <Sheet open={showPreviousSchedules} onOpenChange={(open) => {
        setShowPreviousSchedules(open);
        if (!open) {
          setSelectedHistoricalWeek(null);
        }
      }}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-xl">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle>Previous Schedules</SheetTitle>
          </SheetHeader>
          
          <div className="overflow-y-auto h-full pb-8">
            {selectedHistoricalWeek ? (
              // Show events for selected historical week
              <div className="py-4">
                <button
                  onClick={() => setSelectedHistoricalWeek(null)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  Back to weeks
                </button>
                
                {isLoadingHistorical ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : historicalWeekData ? (
                  <div>
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-900">
                        {format(parseISO(historicalWeekData.weekStart), 'MMM d')} - {format(parseISO(historicalWeekData.weekEnd), 'MMM d, yyyy')}
                      </h3>
                      <p className="text-sm text-gray-500">Version {historicalWeekData.version}</p>
                    </div>
                    
                    {historicalWeekData.events.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No events for this week</p>
                    ) : (
                      <div className="space-y-3">
                        {historicalWeekData.events.map((event) => (
                          <div 
                            key={event.id}
                            className="p-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity border-l-4"
                            style={{ 
                              borderLeftColor: getEventColor(event, historicalWeekData.eventTypes),
                              backgroundColor: `${getEventColor(event, historicalWeekData.eventTypes)}15`
                            }}
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowPreviousSchedules(false);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-sm text-gray-600 min-w-[60px]">
                                {event.isAllDay ? 'All Day' : formatTime(event.startTime)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{event.title}</p>
                                <p className="text-sm text-gray-500">{formatDate(event.date)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">Failed to load events</p>
                )}
              </div>
            ) : (
              // Show list of historical weeks
              <div className="py-4 space-y-2">
                {(!scheduleData.historicalWeeks || scheduleData.historicalWeeks.length === 0) ? (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No previous schedules available</p>
                    <p className="text-sm text-gray-400 mt-1">Past weeks will appear here once published</p>
                  </div>
                ) : (
                  scheduleData.historicalWeeks.map((week) => (
                    <button
                      key={week.weekStart}
                      onClick={() => setSelectedHistoricalWeek(week.weekStart)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-medium text-gray-900">
                          {format(parseISO(week.weekStart), 'MMM d')} - {format(parseISO(week.weekEnd), 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {week.eventCount} event{week.eventCount !== 1 ? 's' : ''} • Version {week.version}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Event Details</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Title */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{selectedEvent.title}</h3>
                <div 
                  className={`inline-block px-3 py-1 rounded text-xs font-medium ${isLightColor(getEventColor(selectedEvent)) ? 'text-gray-900' : 'text-white'}`}
                  style={{ backgroundColor: getEventColor(selectedEvent) }}
                >
                  {selectedEvent.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </div>
              </div>

              {/* Time */}
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>
                  {selectedEvent.isAllDay ? 'All Day' : (
                    <>
                      {formatTime(selectedEvent.startTime)}
                      {selectedEvent.endTime && ` - ${formatTime(selectedEvent.endTime)}`}
                    </>
                  )}
                </span>
              </div>

              {/* Location */}
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}

              {/* Description */}
              {selectedEvent.description && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedEvent.description}</p>
                </div>
              )}

              {/* Notes */}
              {selectedEvent.notes && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                  <p className="text-gray-600 italic">{selectedEvent.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PersonalScheduleViewer;