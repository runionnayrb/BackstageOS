import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Calendar, AlertCircle, X, MapPin, Clock, Users } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";

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
    title: string;
    description?: string;
    publishedAt: string;
  };
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
  }>;
}

interface PersonalScheduleViewerProps {
  token: string;
}

function PersonalScheduleViewer({ token }: PersonalScheduleViewerProps) {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const { data: scheduleData, isLoading, error } = useQuery<PersonalScheduleData>({
    queryKey: token === "test" ? [`/api/schedule/test-personal`] : [`/api/schedule/${token}`],
    enabled: !!token,
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
  
  // Sort events by date and time
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.startTime || '00:00:00'}`);
    const dateB = new Date(`${b.date}T${b.startTime || '00:00:00'}`);
    return dateA.getTime() - dateB.getTime();
  });

  // Group events by date
  const eventsByDate = sortedEvents.reduce((acc, event) => {
    const dateKey = event.date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, typeof sortedEvents>);

  // Sort events within each date by time
  Object.values(eventsByDate).forEach(dayEvents => {
    dayEvents.sort((a, b) => {
      // All day events first
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      if (a.isAllDay && b.isAllDay) return 0;
      
      // Then by start time
      const timeA = a.startTime || '00:00:00';
      const timeB = b.startTime || '00:00:00';
      return timeA.localeCompare(timeB);
    });
  });

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

  const getEventTypeColor = (type: string) => {
    // Default colors for common event types
    const defaultColors: Record<string, string> = {
      'rehearsal': '#3B82F6', // blue
      'tech_rehearsal': '#F59E0B', // amber
      'performance': '#10B981', // emerald
      'meeting': '#8B5CF6', // violet
      'costume_fitting': '#EC4899', // pink
      'photo_shoot': '#6366F1', // indigo
      'dress_rehearsal': '#F97316', // orange
      'preview': '#84CC16', // lime
      'dark': '#1F2937', // gray-800
    };
    return defaultColors[type] || '#6B7280'; // default gray
  };

  const getVersionDisplay = (version: { version: string; versionType: 'major' | 'minor' }) => {
    if (version.versionType === 'minor') {
      return `${version.version}.1`;
    }
    return version.version;
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
                <p className="text-gray-600 mb-2">
                  Version {getVersionDisplay(version)}, Published: {formatPublishedDate(version.publishedAt)}
                </p>
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
            <h2 className="text-lg font-semibold text-gray-900">My Schedule</h2>
            <p className="text-gray-600 text-sm">
              You are scheduled for {events.length} event{events.length !== 1 ? 's' : ''} this week
            </p>
          </div>

          {events.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Scheduled</h3>
              <p className="text-gray-600">You don't have any events assigned to you in this schedule version.</p>
            </div>
          ) : (
            <div>
              {Object.entries(eventsByDate).map(([date, dayEvents], dateIndex) => (
                <div key={date}>
                  {/* Date Header */}
                  <div className="px-6 pt-4 pb-2 bg-white">
                    <h3 className="text-lg font-semibold text-gray-900">{formatDate(date)}</h3>
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
                            borderLeftColor: getEventTypeColor(event.type),
                            backgroundColor: `${getEventTypeColor(event.type)}10`
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
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>This is your personal schedule for {project.name}.</p>
          <p>Powered by BackstageOS</p>
        </div>
      </div>

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
                  className="inline-block px-3 py-1 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: getEventTypeColor(selectedEvent.type) }}
                >
                  {selectedEvent.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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