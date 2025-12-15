import { storage } from '../storage';
import { sendEmail } from './sendgridService';
import { oauthTokenService } from './oauthTokenService';
import { googleOAuthService } from './googleOAuthService';
import { microsoftOAuthService } from './microsoftOAuthService';
import { nanoid } from 'nanoid';

interface ScheduleNotificationData {
  version: {
    id: number;
    version: string;
    versionType: 'major' | 'minor';
    title: string;
    description?: string;
    changelog: string;
    publishedAt: Date;
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
   * Generate personal schedule for a contact with secure token
   */
  private async generatePersonalSchedule(
    projectId: number, 
    contactId: number, 
    versionId: number
  ): Promise<string> {
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
        templateName: `${templateType === 'major' ? 'Major' : 'Minor'} Schedule Update`,
        subject: templateType === 'major' 
          ? '🎭 Major Schedule Update: {{showName}} v{{version}}'
          : '📅 Minor Schedule Update: {{showName}} v{{version}}',
        subjectTemplate: templateType === 'major' 
          ? '🎭 Major Schedule Update: {{showName}} v{{version}}'
          : '📅 Minor Schedule Update: {{showName}} v{{version}}',
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
    const backgroundColor = isMinor ? '#f8fafc' : '#1e293b';
    const accentColor = isMinor ? '#0ea5e9' : '#dc2626';
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
      <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">{{showName}} v{{version}}</p>
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
        <span style="color: #9ca3af;">BackstageOS • Professional Stage Management</span>
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
BackstageOS • Professional Stage Management
`;
  }

  /**
   * Get current week range based on user's week start day preference
   */
  private getCurrentWeekRange(scheduleSettings: any): { weekStart: Date, weekEnd: Date } {
    const now = new Date();
    const weekStartDay = scheduleSettings?.weekStartDay || 'Sunday';
    
    // Convert weekStartDay to number (0 = Sunday, 1 = Monday, etc.)
    const weekStartDayNum = weekStartDay.toLowerCase() === 'monday' ? 1 : 0;
    
    // Get current day of week (0 = Sunday, 1 = Monday, etc.)
    const currentDayOfWeek = now.getDay();
    
    // Calculate days to subtract to get to week start
    let daysToWeekStart;
    if (weekStartDayNum === 0) { // Sunday start
      daysToWeekStart = currentDayOfWeek;
    } else { // Monday start
      daysToWeekStart = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
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
   * Replace template variables with actual data
   */
  private async replaceTemplateVariables(
    template: string, 
    data: ScheduleNotificationData, 
    contact: ContactNotificationData,
    personalScheduleUrl: string
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
    
    // Calculate current week range
    const { weekStart, weekEnd } = this.getCurrentWeekRange(scheduleSettings);
    const weekStartFormatted = this.formatWeekDate(weekStart, timezone);
    const weekEndFormatted = this.formatWeekDate(weekEnd, timezone);
    const weekRangeFormatted = `${weekStartFormatted} - ${weekEndFormatted}`;

    // Get structured changes for individual template variables
    let structuredChanges = { addedEvents: '', changedEvents: '', removedEvents: '', fullSummary: '' };
    try {
      const changeDetectionService = new (await import('./scheduleChangeDetectionService.js')).ScheduleChangeDetectionService(storage);
      structuredChanges = await changeDetectionService.generateStructuredChanges(data.project.id);
    } catch (error) {
      console.error('Error fetching structured changes for email:', error);
    }

    const variables: Record<string, string> = {
      showName: data.project.name,
      version: data.version.version,
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
      weekRange: weekRangeFormatted
    };

    let result = template;
    
    // Replace all variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value);
    });

    // Handle conditional blocks (simple {{#if description}} logic)
    result = result.replace(/\{\{#if description\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, content) => {
      return data.version.description ? content : '';
    });

    return result;
  }

  /**
   * Send email using the user's connected email provider (Gmail/Outlook) or fall back to SendGrid
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
        console.log(`📧 Sending schedule notification via Gmail (${userEmailAddress})`);
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
            console.warn(`⚠️ Gmail send failed, falling back to SendGrid: ${result.error}`);
          }
        } else {
          console.warn(`⚠️ Gmail token expired or invalid, falling back to SendGrid`);
        }
      } else if (userEmailProvider === 'outlook' && userEmailAddress) {
        console.log(`📧 Sending schedule notification via Outlook (${userEmailAddress})`);
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
            console.warn(`⚠️ Outlook send failed, falling back to SendGrid: ${result.error}`);
          }
        } else {
          console.warn(`⚠️ Outlook token expired or invalid, falling back to SendGrid`);
        }
      }

      // Fall back to SendGrid if no provider connected or provider failed
      console.log(`📧 Sending schedule notification via SendGrid to ${toEmail}`);
      await sendEmail({
        to: [toEmail],
        subject,
        html: htmlContent,
        text: textContent,
        from: {
          email: 'schedules@backstageos.com',
          name: userName
        }
      });
      
      console.log(`✅ Email sent via SendGrid to ${toEmail}`);
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
    senderName: string
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

      const subject = await this.replaceTemplateVariables(subjectTemplate, data, contact, personalScheduleUrl);
      const htmlContent = await this.replaceTemplateVariables(htmlTemplate, data, contact, personalScheduleUrl);
      const textContent = await this.replaceTemplateVariables(textTemplate, data, contact, personalScheduleUrl);

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
          publishedAt: version.publishedAt
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

      // Send notifications to all contacts
      for (const contact of contacts) {
        try {
          // Generate personal schedule access token
          const accessToken = await this.generatePersonalSchedule(projectId, contact.id, versionId);
          const personalScheduleUrl = `${process.env.REPLIT_HOST || 'https://backstageos.com'}/personal-schedule/${accessToken}`;

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
            senderName
          );

          // Small delay to avoid overwhelming email service
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (contactError) {
          console.error(`❌ Failed to send notification to ${contact.email}:`, contactError);
          // Continue with other contacts
        }
      }

      console.log(`✅ Schedule notification process completed for ${project.name} v${version.version}`);
      
    } catch (error) {
      console.error('❌ Schedule notification process failed:', error);
      throw error;
    }
  }
}

export const scheduleNotificationService = new ScheduleNotificationService();
