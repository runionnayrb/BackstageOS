import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, Users, FileText, AlertCircle, Shield } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";

interface PersonalScheduleData {
  personalSchedule: {
    id: number;
    accessToken: string;
    expiresAt: string;
    isActive: boolean;
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

  const { data: scheduleData, isLoading, error } = useQuery<PersonalScheduleData>({
    queryKey: [`/api/schedule/${token}`],
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

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, 'EEEE, MMMM d, yyyy') : dateString;
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

  // Check if token expires soon (within 7 days)
  const expiresAt = new Date(personalSchedule.expiresAt);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const expiresSoon = daysUntilExpiry <= 7;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Personal Schedule</h1>
              <div className="space-y-1">
                <p className="text-gray-700">
                  <span className="font-medium">{contactName}</span> • {getContactTypeDisplay(contact.contactType)}
                </p>
                <p className="text-gray-600">{project.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Shield className="h-4 w-4" />
              <span>Secure Access</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Version Info */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                {version.title}
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Version {version.version}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Published {formatDate(version.publishedAt)}
                </span>
              </div>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              version.versionType === 'major' 
                ? 'bg-red-100 text-red-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {version.versionType === 'major' ? 'Major Update' : 'Minor Update'}
            </span>
          </div>
          
          {version.description && (
            <p className="text-gray-700">{version.description}</p>
          )}
        </div>

        {/* Expiry Warning */}
        {expiresSoon && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-yellow-800">Access Expiring Soon</h3>
                <p className="text-yellow-700 text-sm">
                  This link will expire in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}. 
                  Contact your stage manager if you need continued access.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Events List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Your Schedule</h2>
            <p className="text-gray-600 text-sm">
              {events.length} event{events.length !== 1 ? 's' : ''} assigned to you
            </p>
          </div>

          {events.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Scheduled</h3>
              <p className="text-gray-600">You don't have any events assigned to you in this schedule version.</p>
            </div>
          ) : (
            <div className="divide-y">
              {sortedEvents.map((event) => (
                <div key={event.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                      {getEventTypeDisplay(event.type)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>{formatDate(event.date)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {event.isAllDay 
                          ? 'All Day' 
                          : `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`
                        }
                      </span>
                    </div>

                    {event.location && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span>{event.location}</span>
                      </div>
                    )}
                  </div>

                  {event.description && (
                    <p className="text-gray-700 mt-3">{event.description}</p>
                  )}

                  {event.notes && (
                    <p className="text-gray-600 text-sm mt-2 italic">{event.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>This is your personal schedule for {project.name}.</p>
          <p>Powered by BackstageOS • Professional Stage Management</p>
        </div>
      </div>
    </div>
  );
}

export default PersonalScheduleViewer;