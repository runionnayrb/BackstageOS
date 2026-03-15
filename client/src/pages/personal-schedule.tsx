import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Calendar, AlertCircle, X, MapPin, Clock, Users, History, ChevronRight, ChevronDown } from "lucide-react";
import { format, parseISO, isValid, isBefore, startOfDay } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getEventTypeColorFromDatabase, isLightColor, calculatePerformanceNumbers } from "@/lib/eventUtils";

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
  eventTypes: EventType[];
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
  eventTypes: EventType[];
}

interface PersonalScheduleViewerProps {
  token: string;
}

function PersonalScheduleViewer({ token }: PersonalScheduleViewerProps) {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showPreviousSchedules, setShowPreviousSchedules] = useState(false);
  const [selectedHistoricalWeek, setSelectedHistoricalWeek] = useState<string | null>(null);
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});

  const today = useMemo(() => startOfDay(new Date()), []);

  const { data: scheduleData, isLoading, error } = useQuery<PersonalScheduleData & { performanceNumbers?: Record<number, number | null> }>({
    queryKey: token === "test" ? [`/api/schedule/test-personal`] : [`/api/schedule/${token}`],
    enabled: !!token,
  });

  const performanceNumbers = useMemo(() => {
    if (!scheduleData?.performanceNumbers) return new Map<number, number | null>();
    
    // Convert the object from server into a Map for the existing UI logic
    const perfMap = new Map<number, number | null>();
    Object.entries(scheduleData.performanceNumbers).forEach(([id, num]) => {
      perfMap.set(Number(id), num);
    });
    return perfMap;
  }, [scheduleData]);

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
      <div className="bg-white">
        <div className="max-w-4xl mx-auto px-4 pt-8 pb-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Personal Schedule</h1>
            <p className="text-lg text-gray-600 font-medium">{project.name}</p>
            <p className="text-gray-700 mt-1">
              <span className="font-medium">{contactName}</span> {getContactTypeDisplay(contact.contactType)}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-3">
        {/* Events List */}
        <div className="bg-white rounded-lg">
          <div className="px-6 py-4">
            <div className="flex flex-col">
              {version ? (
                <p className="text-sm text-gray-500 mb-1">
                  Version {getVersionDisplay(version)} • Published: {formatPublishedDate(version.publishedAt)}
                </p>
              ) : (
                <p className="text-sm text-gray-500 mb-1">
                  No upcoming schedule published
                </p>
              )}
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Schedule</h2>
              <p className="text-gray-600 text-sm">
                You have {events.length} upcoming event{events.length !== 1 ? 's' : ''} scheduled
              </p>
            </div>
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
                      const dateObj = startOfDay(parseISO(date));
                      const isPastDay = isBefore(dateObj, today);
                      const isCollapsed = collapsedDays[date] !== undefined ? collapsedDays[date] : isPastDay;

                      return (
                        <div key={date} className="border-b border-gray-100 last:border-0">
                          {/* Date Header */}
                          <div 
                            className="px-6 py-4 bg-white flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => setCollapsedDays(prev => ({ ...prev, [date]: !isCollapsed }))}
                          >
                            <div>
                              <h4 className="text-base font-semibold text-gray-900">{formatDate(date)}</h4>
                              <p className="text-sm text-gray-600">
                                {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            {isCollapsed ? (
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          
                          {/* Events for this date */}
                          {!isCollapsed && (
                            <div className="pb-2">
                              {dayEvents.map((event) => {
                              const eventColor = getEventColor(event);
                              // Force high contrast dark text for better readability
                              const textColorClass = 'text-gray-900';
                              const secondaryTextClass = 'text-gray-700';
                              return (
                                <div 
                                  key={event.id} 
                                  className="px-6 py-1 cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setSelectedEvent(event)}
                                >
                                  <div 
                                    className="flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-sm" 
                                    style={{ 
                                      borderLeftColor: eventColor,
                                      backgroundColor: `${eventColor}15`
                                    }}
                                  >
                                    <div className={`text-sm min-w-[80px] pt-1 ${secondaryTextClass}`}>
                                      {event.isAllDay ? (
                                        <div>
                                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-black/10 text-gray-900">
                                            All Day
                                          </span>
                                        </div>
                                      ) : (
                                        <div>
                                          <div className="font-bold">
                                            {formatTime(event.startTime)}
                                          </div>
                                          {event.endTime && (
                                            <div className="text-xs mt-1 font-medium">
                                              {formatTime(event.endTime)}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <h4 className={`font-bold text-base mb-1 ${textColorClass}`}>
                                        {event.title}
                                        {performanceNumbers.get(event.id) && ` #${performanceNumbers.get(event.id)}`}
                                      </h4>
                                      {event.location && (
                                        <div className={`text-sm font-medium ${secondaryTextClass}`}>
                                          {event.location}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          )}
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
                  <HistoricalWeekEventsViewer 
                    data={historicalWeekData} 
                    onSelectEvent={(event) => {
                      setSelectedEvent(event);
                      setShowPreviousSchedules(false);
                    }}
                    getEventColor={getEventColor}
                    formatTime={formatTime}
                    formatDate={formatDate}
                  />
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

function HistoricalWeekEventsViewer({ 
  data, 
  onSelectEvent, 
  getEventColor, 
  formatTime, 
  formatDate 
}: { 
  data: HistoricalWeekEvents, 
  onSelectEvent: (event: any) => void,
  getEventColor: any,
  formatTime: any,
  formatDate: any
}) {
  const performanceNumbers = useMemo(() => {
    return calculatePerformanceNumbers(
      data.events.map(e => ({
        ...e,
        endDate: null,
        status: 'published'
      })),
      { firstPerformanceEventId: null, startingNumber: 1 },
      data.eventTypes
    );
  }, [data]);

  return (
    <div>
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">
          {format(parseISO(data.weekStart), 'MMM d')} - {format(parseISO(data.weekEnd), 'MMM d, yyyy')}
        </h3>
        <p className="text-sm text-gray-500">Version {data.version}</p>
      </div>
      
      {data.events.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No events for this week</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(
            data.events.reduce((acc, event) => {
              const dateKey = event.date;
              if (!acc[dateKey]) acc[dateKey] = [];
              acc[dateKey].push(event);
              return acc;
            }, {} as Record<string, typeof data.events>)
          )
          .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
          .map(([date, dayEvents]) => (
            <div key={date} className="border border-gray-100 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                <h4 className="font-semibold text-sm text-gray-900">{formatDate(date)}</h4>
              </div>
              <div className="divide-y divide-gray-50">
                {dayEvents.sort((a, b) => {
                  if (a.isAllDay && !b.isAllDay) return -1;
                  if (!a.isAllDay && b.isAllDay) return 1;
                  const timeA = a.startTime || '00:00:00';
                  const timeB = b.startTime || '00:00:00';
                  return timeA.localeCompare(timeB);
                }).map((event) => {
                  const eventColor = getEventColor(event, data.eventTypes);
                  const textColorClass = 'text-gray-900';
                  const secondaryTextClass = 'text-gray-700';
                  const perfNum = performanceNumbers.get(event.id);

                  return (
                    <div 
                      key={event.id}
                      className="p-3 cursor-pointer hover:bg-gray-50 transition-colors border-l-4"
                      style={{ borderLeftColor: eventColor }}
                      onClick={() => onSelectEvent(event)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`text-sm min-w-[65px] font-bold ${secondaryTextClass}`}>
                          {event.isAllDay ? 'All Day' : formatTime(event.startTime)}
                        </div>
                        <div>
                          <p className={`font-bold ${textColorClass}`}>
                            {event.title}
                            {perfNum && ` #${perfNum}`}
                          </p>
                          {event.location && <p className={`text-xs font-medium ${secondaryTextClass}`}>{event.location}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}