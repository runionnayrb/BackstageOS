import { storage } from '../storage';
import { sendEmailWithResend } from './resendService';
import { oauthTokenService } from './oauthTokenService';
import { googleOAuthService } from './googleOAuthService';
import { microsoftOAuthService } from './microsoftOAuthService';
import { nanoid } from 'nanoid';

function getBaseUrl(): string {
  const baseUrl = process.env.PUBLIC_BASE_URL ||
    process.env.APP_URL ||
    process.env.REPLIT_DEPLOYMENT_URL ||
    process.env.REPLIT_DEV_DOMAIN ||
    'https://backstageos.com';
  return baseUrl.replace(/\/$/, '');
}

interface ScheduleNotificationData {
  version: {
    id: number;
    version: string;
    versionType: 'major' | 'minor';
    title: string;
    description?: string;
    changelog: string;
    publishedAt: Date;
    weekStart?: string;
  };
  project: {
    id: number;
    name: string;
  };
  publishedBy: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    connectedEmailProvider?: string | null;
    connectedEmailAddress?: string | null;
  };
}

interface ContactNotificationData {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  contactType: string;
}

export class ScheduleNotificationService {
  
  /**
   * Generate or update personal schedule for a contact with secure token
   */
  private async generatePersonalSchedule(
    projectId: number, 
    contactId: number, 
    versionId: number
  ): Promise<string> {
    // Check if personal schedule already exists for this contact/project
    const existingSchedule = await storage.getPersonalScheduleByContactId(contactId, projectId);
    
    if (existingSchedule) {
      // Update existing schedule to point to new version
      await storage.updatePersonalSchedule(existingSchedule.id, {
        currentVersionId: versionId
      });
      return existingSchedule.accessToken;
    }
    
    // Create new personal schedule
    const accessToken = nanoid(32);
    await storage.createPersonalSchedule({
      projectId,
      contactId,
      currentVersionId: versionId,
      accessToken
    });
    
    return accessToken;
  }

  /**
   * Get or create default email template for project
   */
  private async getEmailTemplate(projectId: number, templateType: 'major' | 'minor' = 'major') {
    const templates = await storage.getScheduleEmailTemplatesByProjectId(projectId);
    let template = templates.find((t: any) => t.templateType === templateType);
    
    if (!template) {
      // Return default template structure without creating in database
      template = {
        projectId,
        templateType,
        name: `${templateType === 'major' ? 'Major' : 'Minor'} Schedule Update`,
        subject: '{{showName}} Schedule v{{version}}: {{weekRangeShort}}',
        subjectTemplate: '{{showName}} Schedule v{{version}}: {{weekRangeShort}}',
        htmlContent: this.getDefaultHtmlTemplate(templateType),
        bodyTemplate: this.getDefaultHtmlTemplate(templateType),
        textContent: this.getDefaultTextTemplate(templateType),
      };
    }
    
    return template;
  }

  /**
   * Default HTML email template
   */
  private getDefaultHtmlTemplate(templateType: 'major' | 'minor'): string {
    const isMinor = templateType === 'minor';
    const backgroundColor = '#1e293b'; // Dark header for both major and minor for readability
    const accentColor = '#3b82f6'; // App's blue accent color for all schedule emails
    const headerText = isMinor ? 'Minor Schedule Update' : 'Major Schedule Update';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Schedule Update - {{showName}}</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: ${backgroundColor}; color: white; padding: 30px 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 600;">${headerText}</h1>
      <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">{{showName}}</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 30px 20px;">
      <p style="margin: 0 0 20px 0; font-size: 16px;">Hi {{contactName}},</p>
      
      <p style="margin: 0 0 20px 0; color: #6b7280;">{{publishedBy}} has published a new ${isMinor ? 'minor' : 'major'} version of the production schedule for <strong>{{showName}}</strong>.</p>
      
      <div style="background: #f8fafc; border-left: 4px solid ${accentColor}; padding: 20px; margin: 20px 0; border-radius: 0 4px 4px 0;">
        <h3 style="margin: 0 0 10px 0; color: #111827; font-size: 18px;">{{title}}</h3>
        {{#if description}}
        <p style="margin: 0 0 15px 0; color: #6b7280;">{{description}}</p>
        {{/if}}
        <div style="color: #374151;">
          <strong>What's Changed:</strong>
          <div style="margin-top: 10px; white-space: pre-line;">{{changelog}}</div>
          {{#if changesSummary}}
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <div style="white-space: pre-line;">{{changesSummary}}</div>
          </div>
          {{/if}}
        </div>
      </div>
      
      <!-- Personal Schedule Link -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{personalScheduleUrl}}" style="display: inline-block; background: ${accentColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">View Your Personal Schedule</a>
      </div>
      
      <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 14px;">Your personal schedule link is secure and expires in 30 days. No login required.</p>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #6b7280; font-size: 14px;">
        Published on {{publishedDate}} by {{publishedBy}}<br>
        <span style="color: #9ca3af;">Powered by BackstageOS</span>
      </p>
    </div>
    
  </div>
</body>
</html>`;
  }

  /**
   * Default text email template
   */
  private getDefaultTextTemplate(templateType: 'major' | 'minor'): string {
    const updateType = templateType === 'major' ? 'MAJOR' : 'minor';
    
    return `
${updateType.toUpperCase()} SCHEDULE UPDATE: {{showName}} v{{version}}

Hi {{contactName}},

{{publishedBy}} has published a new ${templateType} version of the production schedule for {{showName}}.

{{title}}
{{#if description}}{{description}}{{/if}}

WHAT'S CHANGED:
{{changelog}}

VIEW YOUR PERSONAL SCHEDULE:
{{personalScheduleUrl}}

Your personal schedule link is secure and expires in 30 days. No login required.

Published on {{publishedDate}} by {{publishedBy}}
Powered by BackstageOS
`;
  }

  /**
   * Get current week range based on user's week start day preference
   */
  private getCurrentWeekRange(scheduleSettings: any): { weekStart: Date, weekEnd: Date } {
    const now = new Date();
    const weekStartDay = scheduleSettings?.weekStartDay || 'sunday';
    
    // Map week start day string to number (0 = Sunday, 1 = Monday, etc.)
    const weekStartMap: { [key: string]: number } = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, 
      thursday: 4, friday: 5, saturday: 6
    };
    
    const weekStartDayNum = weekStartMap[weekStartDay.toLowerCase()] ?? 0;
    
    // Get current day of week (0 = Sunday, 1 = Monday, etc.)
    const currentDayOfWeek = now.getDay();
    
    // Calculate days to subtract to get to week start
    let daysToWeekStart = currentDayOfWeek - weekStartDayNum;
    if (daysToWeekStart < 0) {
      daysToWeekStart += 7;
    }
    
    // Calculate week start date
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToWeekStart);
    weekStart.setHours(0, 0, 0, 0);
    
    // Calculate week end date (6 days after week start)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return { weekStart, weekEnd };
  }

  /**
   * Format date in the requested format (e.g., "Sun, Jul 13, 2025")
   */
  private formatWeekDate(date: Date, timezone: string = 'America/New_York'): string {
    try {
      return date.toLocaleDateString('en-US', {
        timeZone: timezone,
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting week date:', error);
      // Fallback to basic formatting
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }

  /**
   * Format week range for subject line (e.g., "Dec 28, 2025 - Jan 3, 2026" or "Dec 21 - Dec 27, 2025")
   */
  private formatWeekRangeForSubject(weekStart: Date, weekEnd: Date, timezone: string = 'America/New_York'): string {
    try {
      const startYear = weekStart.getFullYear();
      const endYear = weekEnd.getFullYear();
      
      if (startYear === endYear) {
        // Same year: "Dec 21 - Dec 27, 2025"
        const startFormatted = weekStart.toLocaleDateString('en-US', {
          timeZone: timezone,
          month: 'short',
          day: 'numeric'
        });
        const endFormatted = weekEnd.toLocaleDateString('en-US', {
          timeZone: timezone,
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        return `${startFormatted} - ${endFormatted}`;
      } else {
        // Different years: "Dec 28, 2025 - Jan 3, 2026"
        const startFormatted = weekStart.toLocaleDateString('en-US', {
          timeZone: timezone,
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        const endFormatted = weekEnd.toLocaleDateString('en-US', {
          timeZone: timezone,
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        return `${startFormatted} - ${endFormatted}`;
      }
    } catch (error) {
      console.error('Error formatting week range for subject:', error);
      return `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
    }
  }

  /**
   * Replace template variables with actual data
   */
  private async replaceTemplateVariables(
    template: string, 
    data: ScheduleNotificationData, 
    contact: ContactNotificationData,
    personalScheduleUrl: string,
    preCalculatedChanges?: { addedEvents: string; changedEvents: string; removedEvents: string; fullSummary: string }
  ): Promise<string> {
    const contactName = contact.firstName || contact.email;
    const publishedBy = data.publishedBy.firstName 
      ? `${data.publishedBy.firstName} ${data.publishedBy.lastName || ''}`.trim()
      : data.publishedBy.email;
    
    const publishedDate = data.version.publishedAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric', 
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    // Get schedule settings for week calculations
    const showSettings = await storage.getShowSettingsByProjectId(data.project.id);
    const scheduleSettings = (showSettings as any)?.scheduleSettings || {};
    const timezone = scheduleSettings.timezone || 'America/New_York';
    
    // Use version's weekStart if available, otherwise calculate current week
    let weekStartFormatted: string;
    let weekEndFormatted: string;
    let weekRangeForSubject: string;
    
    if (data.version.weekStart) {
      // Format directly from the stored date string to avoid ANY timezone issues
      // weekStart is stored as "YYYY-MM-DD" format
      const [year, month, day] = data.version.weekStart.split('-').map(Number);
      const endDay = day + 6;
      const endDate = new Date(Date.UTC(year, month - 1, endDay));
      const endYear = endDate.getUTCFullYear();
      const endMonth = endDate.getUTCMonth() + 1;
      const endDayFinal = endDate.getUTCDate();
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      
      const startMonthName = months[month - 1];
      const endMonthName = months[endMonth - 1];
      
      // Get weekday for formatted version
      const startDate = new Date(Date.UTC(year, month - 1, day));
      const startWeekday = weekdays[startDate.getUTCDay()];
      const endWeekday = weekdays[endDate.getUTCDay()];
      
      weekStartFormatted = `${startWeekday}, ${startMonthName} ${day}, ${year}`;
      weekEndFormatted = `${endWeekday}, ${endMonthName} ${endDayFinal}, ${endYear}`;
      
      // Subject line format (compact)
      if (year === endYear) {
        weekRangeForSubject = `${startMonthName} ${day} - ${endMonthName} ${endDayFinal}, ${year}`;
      } else {
        weekRangeForSubject = `${startMonthName} ${day}, ${year} - ${endMonthName} ${endDayFinal}, ${endYear}`;
      }
      
      console.log(`📅 Using version weekStart: ${data.version.weekStart} -> ${weekRangeForSubject}`);
    } else {
      // Fallback to current week calculation
      const currentWeek = this.getCurrentWeekRange(scheduleSettings);
      weekStartFormatted = this.formatWeekDate(currentWeek.weekStart, timezone);
      weekEndFormatted = this.formatWeekDate(currentWeek.weekEnd, timezone);
      weekRangeForSubject = this.formatWeekRangeForSubject(currentWeek.weekStart, currentWeek.weekEnd, timezone);
      console.log(`📅 No weekStart on version, using current week`);
    }
    
    const weekRangeFormatted = `${weekStartFormatted} - ${weekEndFormatted}`;

    // Use pre-calculated changes if provided (for performance), otherwise calculate on-demand
    let structuredChanges = preCalculatedChanges || { addedEvents: '', changedEvents: '', removedEvents: '', fullSummary: '' };
    if (!preCalculatedChanges) {
      try {
        const { ScheduleChangeDetectionService } = await import('./scheduleChangeDetectionService.js');
        const changeDetectionService = new ScheduleChangeDetectionService(storage);
        structuredChanges = await changeDetectionService.generateStructuredChanges(data.project.id, data.version.weekStart);
      } catch (error) {
        console.error('Error fetching structured changes for email:', error);
      }
    }

    // Extract version number from title (e.g., "Minor Version 1.1" -> "1.1")
    const versionMatch = data.version.title.match(/Version\s+(\d+\.\d+)/i);
    const fullVersion = versionMatch ? versionMatch[1] : data.version.version;
    
    const variables: Record<string, string> = {
      showName: data.project.name,
      version: fullVersion,
      contactName,
      publishedBy,
      title: data.version.title,
      description: data.version.description || '',
      changelog: data.version.changelog,
      changesSummary: structuredChanges.fullSummary,
      addedEvents: structuredChanges.addedEvents,
      changedEvents: structuredChanges.changedEvents,
      removedEvents: structuredChanges.removedEvents,
      personalScheduleUrl: personalScheduleUrl,
      personalScheduleLink: personalScheduleUrl,
      publishDate: publishedDate,
      publishedDate,
      weekStart: weekStartFormatted,
      weekEnd: weekEndFormatted,
      weekRange: weekRangeFormatted,
      weekRangeShort: weekRangeForSubject
    };

    let result = template;
    
    // Replace all variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    });

    // Handle conditional blocks (simple {{#if variable}} logic)
    result = result.replace(/\{\{#if description\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, content) => {
      return data.version.description ? content : '';
    });
    
    result = result.replace(/\{\{#if changesSummary\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, content) => {
      return structuredChanges.fullSummary ? content : '';
    });

    return result;
  }

  /**
   * Send email using the user's connected email provider (Gmail/Outlook) or fall back to Resend
   */
  private async sendEmailViaProvider(
    userId: number,
    userEmailProvider: string | null | undefined,
    userEmailAddress: string | null | undefined,
    userName: string,
    toEmail: string,
    subject: string,
    htmlContent: string,
    textContent: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Try to use user's connected email provider first
      if (userEmailProvider === 'gmail' && userEmailAddress) {
        console.log(`📧 Sending schedule notification via Gmail (${userEmailAddress}) for userId: ${userId}`);
        const accessToken = await oauthTokenService.getValidGmailAccessToken(userId.toString());
        
        if (accessToken) {
          const result = await googleOAuthService.sendEmail(accessToken, {
            to: [toEmail],
            subject,
            body: htmlContent,
            isHtml: true,
            fromEmail: userEmailAddress,
            fromName: userName
          });
          
          if (result.success) {
            console.log(`✅ Email sent via Gmail to ${toEmail}`);
            return { success: true };
          } else {
            console.error(`⚠️ Gmail send failed, falling back to Resend. Error: ${result.error}`);
          }
        } else {
          console.error(`⚠️ Gmail token expired or invalid for userId: ${userId}, falling back to Resend`);
        }
      } else if (userEmailProvider === 'outlook' && userEmailAddress) {
        console.log(`📧 Sending schedule notification via Outlook (${userEmailAddress}) for userId: ${userId}`);
        const accessToken = await oauthTokenService.getValidOutlookAccessToken(userId.toString());
        
        if (accessToken) {
          const result = await microsoftOAuthService.sendEmail(accessToken, {
            to: [toEmail],
            subject,
            body: htmlContent,
            isHtml: true
          });
          
          if (result.success) {
            console.log(`✅ Email sent via Outlook to ${toEmail}`);
            return { success: true };
          } else {
            console.error(`⚠️ Outlook send failed, falling back to Resend. Error: ${result.error}`);
          }
        } else {
          console.error(`⚠️ Outlook token expired or invalid for userId: ${userId}, falling back to Resend`);
        }
      } else {
        console.log(`📧 No connected email provider for userId: ${userId}, using Resend fallback`);
      }

      // Fall back to Resend if no provider connected or provider failed
      console.log(`📧 Sending schedule notification via Resend to ${toEmail}`);
      await sendEmailWithResend({
        to: [toEmail],
        subject,
        html: htmlContent,
        from: 'schedules@backstageos.com',
        fromName: userName
      });
      
      console.log(`✅ Email sent via Resend to ${toEmail}`);
      return { success: true };
      
    } catch (error) {
      console.error(`❌ Failed to send email to ${toEmail}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send schedule update notification to a single contact using user's connected provider
   */
  private async sendOptimizedNotificationToContact(
    data: ScheduleNotificationData,
    contact: ContactNotificationData,
    template: any,
    personalScheduleUrl: string,
    senderName: string,
    preCalculatedChanges?: { addedEvents: string; changedEvents: string; removedEvents: string; fullSummary: string }
  ) {
    try {
      // Get the subject template from either field name
      const subjectTemplate = template.subject || template.subjectTemplate || 
        `Schedule Update: {{showName}} v{{version}}`;
      
      // Get the HTML content from either field name
      const htmlTemplate = template.htmlContent || template.bodyTemplate || 
        this.getDefaultHtmlTemplate(data.version.versionType);
      
      // Get the text content
      const textTemplate = template.textContent || 
        this.getDefaultTextTemplate(data.version.versionType);

      const subject = await this.replaceTemplateVariables(subjectTemplate, data, contact, personalScheduleUrl, preCalculatedChanges);
      const htmlContent = await this.replaceTemplateVariables(htmlTemplate, data, contact, personalScheduleUrl, preCalculatedChanges);
      const textContent = await this.replaceTemplateVariables(textTemplate, data, contact, personalScheduleUrl, preCalculatedChanges);

      // Send using the user's connected email provider or SendGrid fallback
      const result = await this.sendEmailViaProvider(
        data.publishedBy.id,
        data.publishedBy.connectedEmailProvider,
        data.publishedBy.connectedEmailAddress,
        senderName,
        contact.email,
        subject,
        htmlContent,
        textContent
      );

      if (result.success) {
        // Log notification sent
        await storage.createScheduleVersionNotification({
          versionId: data.version.id,
          contactId: contact.id,
          emailAddress: contact.email,
          sentAt: new Date(),
          status: 'sent'
        });

        console.log(`✅ Schedule notification sent to ${contact.email} for ${data.project.name} v${data.version.version}`);
      } else {
        throw new Error(result.error || 'Email send failed');
      }
      
    } catch (error) {
      console.error(`❌ Failed to send schedule notification to ${contact.email}:`, error);
      
      // Log failed notification
      await storage.createScheduleVersionNotification({
        versionId: data.version.id,
        contactId: contact.id,
        emailAddress: contact.email,
        sentAt: new Date(),
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send schedule update notifications to all project contacts or specific contacts
   */
  public async sendScheduleUpdateNotifications(
    versionId: number,
    projectId: number,
    publishedByUserId: number,
    contactIds?: number[]
  ) {
    try {
      console.log(`📧 Starting schedule notification process for version ${versionId}`);

      // Get version details
      const versions = await storage.getScheduleVersionsByProjectId(projectId);
      const version = versions.find((v: any) => v.id === versionId);
      if (!version) {
        throw new Error(`Schedule version ${versionId} not found`);
      }

      // Get project details
      const project = await storage.getProjectById(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Get publisher details (includes connected email provider info)
      const publishedBy = await storage.getUser(publishedByUserId.toString());
      if (!publishedBy) {
        throw new Error(`User ${publishedByUserId} not found`);
      }

      // Log email provider status
      if (publishedBy.connectedEmailProvider && publishedBy.connectedEmailAddress) {
        console.log(`📧 User has connected ${publishedBy.connectedEmailProvider} account: ${publishedBy.connectedEmailAddress}`);
      } else {
        console.log(`📧 User has no connected email provider, will use SendGrid`);
      }

      // Get project contacts
      let contacts = await storage.getContactsByProjectId(projectId);
      
      // Filter contacts if specific contactIds provided
      if (contactIds && contactIds.length > 0) {
        contacts = contacts.filter((contact: any) => contactIds.includes(contact.id));
        console.log(`📧 Filtering to ${contactIds.length} specific contacts from ${contacts.length} total`);
      }
      
      if (contacts.length === 0) {
        console.log(`ℹ️ No contacts found for project ${projectId}, skipping notifications`);
        return;
      }

      // Get email template
      const template = await this.getEmailTemplate(projectId, version.versionType);

      // Get show settings for sender name
      const showSettings = await storage.getShowSettingsByProjectId(projectId);
      const emailSenderConfig = (showSettings as any)?.scheduleSettings?.emailSender || {};
      const senderName = emailSenderConfig.senderName || 
        (publishedBy.firstName ? `${publishedBy.firstName} ${publishedBy.lastName || ''}`.trim() : publishedBy.email) ||
        `${project.name} SM`;

      // Prepare notification data with connected email provider info
      const notificationData: ScheduleNotificationData = {
        version: {
          id: version.id,
          version: version.version,
          versionType: version.versionType,
          title: version.title,
          description: version.description || undefined,
          changelog: version.changelog,
          publishedAt: version.publishedAt,
          weekStart: version.weekStart
        },
        project: {
          id: project.id,
          name: project.name
        },
        publishedBy: {
          id: publishedBy.id,
          email: publishedBy.email,
          firstName: publishedBy.firstName || undefined,
          lastName: publishedBy.lastName || undefined,
          connectedEmailProvider: publishedBy.connectedEmailProvider,
          connectedEmailAddress: publishedBy.connectedEmailAddress
        }
      };

      console.log(`📬 Sending notifications to ${contacts.length} contacts...`);

      // Pre-calculate structured changes ONCE for all emails (major performance optimization)
      let preCalculatedChanges = { addedEvents: '', changedEvents: '', removedEvents: '', fullSummary: '' };
      try {
        const { ScheduleChangeDetectionService } = await import('./scheduleChangeDetectionService.js');
        const changeDetectionService = new ScheduleChangeDetectionService(storage);
        preCalculatedChanges = await changeDetectionService.generateStructuredChanges(projectId, version.weekStart);
        console.log(`📊 Pre-calculated schedule changes for email templates`);
      } catch (error) {
        console.error('Error pre-calculating structured changes:', error);
      }

      // Send notifications in parallel batches for faster delivery
      const BATCH_SIZE = 10; // Send 10 emails at a time for faster delivery
      for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
        const batch = contacts.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(async (contact) => {
          try {
            // Generate personal schedule access token
            const accessToken = await this.generatePersonalSchedule(projectId, contact.id, versionId);
            const personalScheduleUrl = `${getBaseUrl()}/personal-schedule/${accessToken}`;

            // Send notification using user's connected email provider
            await this.sendOptimizedNotificationToContact(
              notificationData,
              {
                id: contact.id,
                email: contact.email,
                firstName: contact.firstName,
                lastName: contact.lastName,
                contactType: contact.contactType
              },
              template,
              personalScheduleUrl,
              senderName,
              preCalculatedChanges
            );
          } catch (contactError) {
            console.error(`❌ Failed to send notification to ${contact.email}:`, contactError);
            // Continue with other contacts
          }
        }));
      }

      console.log(`✅ Schedule notification process completed for ${project.name} v${version.version}`);
      
    } catch (error) {
      console.error('❌ Schedule notification process failed:', error);
      throw error;
    }
  }
}

export const scheduleNotificationService = new ScheduleNotificationService();
