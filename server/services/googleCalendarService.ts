import { google } from 'googleapis';
import { storage } from '../storage';
import { PersonalSchedule, ScheduleEvent, GoogleCalendarIntegration } from '@shared/schema';

export class GoogleCalendarService {
  private oauth2Client: any;

  constructor(hostname?: string) {
    // Use provided hostname or default fallback
    const redirectUri = hostname 
      ? `https://${hostname}/auth/google/callback`
      : process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';
    
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
  }

  // Generate OAuth URL for calendar access
  generateAuthUrl(projectId: number, userId: number): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: JSON.stringify({ projectId, userId }),
      prompt: 'consent',
      // Add development mode parameters to bypass verification for testing
      include_granted_scopes: true,
      approval_prompt: 'force'
    });
  }

  // Handle OAuth callback and store tokens
  async handleOAuthCallback(code: string, state: string): Promise<GoogleCalendarIntegration> {
    const { projectId, userId } = JSON.parse(state);
    
    const { tokens } = await this.oauth2Client.getAccessToken(code);
    this.oauth2Client.setCredentials(tokens);

    // Get calendar info
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const calendarList = await calendar.calendarList.list();
    const primaryCalendar = calendarList.data.items?.find(cal => cal.primary);

    if (!primaryCalendar) {
      throw new Error('No primary calendar found');
    }

    const integration = await storage.createGoogleCalendarIntegration({
      projectId,
      userId,
      calendarId: primaryCalendar.id!,
      calendarName: primaryCalendar.summary!,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      syncSettings: {
        syncPersonalSchedules: true,
        syncEventTypes: [],
        defaultReminders: [{ method: 'email', minutes: 15 }]
      }
    });

    return integration;
  }

  // Refresh access token if needed
  private async refreshTokenIfNeeded(integration: GoogleCalendarIntegration): Promise<GoogleCalendarIntegration> {
    if (!integration.tokenExpiry || new Date() < integration.tokenExpiry) {
      return integration;
    }

    this.oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
    });

    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      const updatedIntegration = await storage.updateGoogleCalendarIntegration(integration.id, {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || integration.refreshToken,
        tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined,
      });

      return updatedIntegration;
    } catch (error) {
      console.error('Failed to refresh Google Calendar token:', error);
      throw new Error('Google Calendar authentication expired. Please reconnect.');
    }
  }

  // Sync personal schedule to Google Calendar
  async syncPersonalScheduleToGoogleCalendar(
    personalSchedule: PersonalSchedule,
    integration: GoogleCalendarIntegration,
    events: ScheduleEvent[]
  ): Promise<void> {
    try {
      const refreshedIntegration = await this.refreshTokenIfNeeded(integration);
      
      this.oauth2Client.setCredentials({
        access_token: refreshedIntegration.accessToken,
        refresh_token: refreshedIntegration.refreshToken,
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      // Filter events based on sync settings
      const eventsToSync = events.filter(event => {
        if (!refreshedIntegration.syncSettings.syncPersonalSchedules) return false;
        if (refreshedIntegration.syncSettings.syncEventTypes.length === 0) return true;
        return refreshedIntegration.syncSettings.syncEventTypes.includes(event.eventType || '');
      });

      // Create calendar events
      for (const event of eventsToSync) {
        const calendarEvent = {
          summary: event.title,
          description: this.formatEventDescription(event),
          location: event.location,
          start: event.isAllDay 
            ? { date: new Date(event.startTime).toISOString().split('T')[0] }
            : { dateTime: new Date(event.startTime).toISOString() },
          end: event.isAllDay
            ? { date: new Date(event.endTime).toISOString().split('T')[0] }
            : { dateTime: new Date(event.endTime).toISOString() },
          reminders: {
            useDefault: false,
            overrides: refreshedIntegration.syncSettings.defaultReminders
          },
          extendedProperties: {
            private: {
              backstageOSEventId: event.id.toString(),
              backstageOSProjectId: personalSchedule.projectId.toString(),
              backstageOSPersonalScheduleId: personalSchedule.id.toString()
            }
          }
        };

        await calendar.events.insert({
          calendarId: refreshedIntegration.calendarId,
          requestBody: calendarEvent
        });
      }

      console.log(`Synced ${eventsToSync.length} events to Google Calendar for personal schedule ${personalSchedule.id}`);
    } catch (error) {
      console.error('Failed to sync personal schedule to Google Calendar:', error);
      throw new Error('Failed to sync to Google Calendar. Please check your connection.');
    }
  }

  // Format event description for Google Calendar
  private formatEventDescription(event: ScheduleEvent): string {
    let description = '';
    
    if (event.eventType) {
      description += `Event Type: ${event.eventType}\n`;
    }
    
    if (event.description) {
      description += `\nDescription:\n${event.description}`;
    }
    
    if (event.notes) {
      description += `\n\nNotes:\n${event.notes}`;
    }

    description += '\n\n---\nManaged by BackstageOS';
    
    return description;
  }

  // Clean up old calendar events before syncing new ones
  async cleanupOldCalendarEvents(integration: GoogleCalendarIntegration, personalScheduleId: number): Promise<void> {
    try {
      const refreshedIntegration = await this.refreshTokenIfNeeded(integration);
      
      this.oauth2Client.setCredentials({
        access_token: refreshedIntegration.accessToken,
        refresh_token: refreshedIntegration.refreshToken,
      });

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      // Find events created by BackstageOS for this personal schedule
      const events = await calendar.events.list({
        calendarId: refreshedIntegration.calendarId,
        privateExtendedProperty: `backstageOSPersonalScheduleId=${personalScheduleId}`
      });

      // Delete old events
      if (events.data.items) {
        for (const event of events.data.items) {
          await calendar.events.delete({
            calendarId: refreshedIntegration.calendarId,
            eventId: event.id!
          });
        }
      }

      console.log(`Cleaned up ${events.data.items?.length || 0} old calendar events`);
    } catch (error) {
      console.error('Failed to cleanup old calendar events:', error);
      // Don't throw error here - cleanup failure shouldn't block sync
    }
  }

  // Get available calendars for user
  async getUserCalendars(integration: GoogleCalendarIntegration): Promise<any[]> {
    const refreshedIntegration = await this.refreshTokenIfNeeded(integration);
    
    this.oauth2Client.setCredentials({
      access_token: refreshedIntegration.accessToken,
      refresh_token: refreshedIntegration.refreshToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const calendarList = await calendar.calendarList.list();

    return calendarList.data.items || [];
  }

  // Update sync settings
  async updateSyncSettings(
    integrationId: number, 
    syncSettings: GoogleCalendarIntegration['syncSettings']
  ): Promise<GoogleCalendarIntegration> {
    return await storage.updateGoogleCalendarIntegration(integrationId, { syncSettings });
  }
}

// GoogleCalendarService class is exported above and instantiated per request with hostname