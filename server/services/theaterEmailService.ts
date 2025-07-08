import { storage } from '../storage.js';
import { 
  emailMessages, 
  emailTemplates, 
  emailRules, 
  emailFolders,
  projects, 
  contacts,
  teamMembers,
  scheduleEvents,
  InsertEmailTemplate,
  InsertEmailRule,
  EmailMessage,
  EmailTemplate,
  EmailRule
} from '../../shared/schema.js';
import { eq, and, or, like, desc, sql, inArray } from 'drizzle-orm';
import { EmailService } from './emailService.js';

export class TheaterEmailService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * Get emails related to a specific show/project
   */
  async getShowEmails(
    showId: number, 
    accountId?: number, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<EmailMessage[]> {
    const query = db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.relatedShowId, showId))
      .orderBy(desc(emailMessages.dateReceived))
      .limit(limit)
      .offset(offset);

    if (accountId) {
      query.where(and(
        eq(emailMessages.relatedShowId, showId),
        eq(emailMessages.accountId, accountId)
      ));
    }

    return await query;
  }

  /**
   * Auto-categorize email by show based on content analysis
   */
  async categorizeEmail(messageId: number, showId: number): Promise<void> {
    await db
      .update(emailMessages)
      .set({ relatedShowId: showId })
      .where(eq(emailMessages.id, messageId));
  }

  /**
   * Smart auto-categorization based on email content
   */
  async autoCategorizeFEmail(messageId: number, userId: number): Promise<number | null> {
    // Get the email message
    const message = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.id, messageId))
      .limit(1);

    if (!message[0]) return null;

    // Get user's active projects
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, userId));

    // Analyze email content for project keywords
    const emailContent = `${message[0].subject || ''} ${message[0].content || ''}`.toLowerCase();
    
    for (const project of userProjects) {
      const projectKeywords = [
        project.name.toLowerCase(),
        project.venue?.toLowerCase() || '',
        project.season?.toLowerCase() || ''
      ].filter(Boolean);

      // Check if any project keywords appear in email content
      if (projectKeywords.some(keyword => emailContent.includes(keyword))) {
        await this.categorizeEmail(messageId, project.id);
        return project.id;
      }
    }

    return null;
  }

  /**
   * Get email templates for theater use
   */
  async getEmailTemplates(type?: string, showId?: number): Promise<EmailTemplate[]> {
    let query = db.select().from(emailTemplates);

    const conditions = [];
    if (type) {
      conditions.push(eq(emailTemplates.templateType, type));
    }
    if (showId) {
      conditions.push(eq(emailTemplates.projectId, showId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(emailTemplates.createdAt));
  }

  /**
   * Create email template
   */
  async createEmailTemplate(templateData: InsertEmailTemplate): Promise<EmailTemplate> {
    const [template] = await storage.db
      .insert(emailTemplates)
      .values(templateData)
      .returning();

    return template;
  }

  /**
   * Send bulk email to cast/crew
   */
  async sendBulkEmail(
    showId: number,
    accountId: number,
    options: {
      templateId?: number;
      recipientType: 'all' | 'cast' | 'crew' | 'creative' | 'custom';
      customRecipients?: string[];
      subject: string;
      message: string;
    }
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const results = { sent: 0, failed: 0, errors: [] as string[] };

    try {
      // Get recipients based on type
      let recipients: string[] = [];

      if (options.recipientType === 'custom' && options.customRecipients) {
        recipients = options.customRecipients;
      } else {
        // Get team members and contacts for the show
        const teamMembers = await db
          .select({
            email: contactPeople.email,
            role: teamMembers.role
          })
          .from(teamMembers)
          .leftJoin(contactPeople, eq(teamMembers.contactId, contactPeople.id))
          .where(eq(teamMembers.projectId, showId));

        switch (options.recipientType) {
          case 'all':
            recipients = teamMembers.map(m => m.email).filter(Boolean);
            break;
          case 'cast':
            recipients = teamMembers
              .filter(m => m.role?.toLowerCase().includes('actor') || m.role?.toLowerCase().includes('cast'))
              .map(m => m.email)
              .filter(Boolean);
            break;
          case 'crew':
            recipients = teamMembers
              .filter(m => m.role?.toLowerCase().includes('crew') || m.role?.toLowerCase().includes('tech'))
              .map(m => m.email)
              .filter(Boolean);
            break;
          case 'creative':
            recipients = teamMembers
              .filter(m => 
                m.role?.toLowerCase().includes('director') || 
                m.role?.toLowerCase().includes('designer') ||
                m.role?.toLowerCase().includes('creative')
              )
              .map(m => m.email)
              .filter(Boolean);
            break;
        }
      }

      // Get template if specified
      let emailContent = options.message;
      if (options.templateId) {
        const template = await db
          .select()
          .from(emailTemplates)
          .where(eq(emailTemplates.id, options.templateId))
          .limit(1);

        if (template[0]) {
          emailContent = template[0].htmlContent || template[0].content || options.message;
        }
      }

      // Send email to each recipient
      for (const email of recipients) {
        try {
          await this.emailService.sendEmail(accountId, {
            to: [email],
            subject: options.subject,
            message: emailContent,
            relatedShowId: showId
          });
          results.sent++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Failed to send to ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

    } catch (error) {
      results.errors.push(`Bulk email setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return results;
  }

  /**
   * Get email rules
   */
  async getEmailRules(accountId?: number, showId?: number): Promise<EmailRule[]> {
    let query = db.select().from(emailRules);

    const conditions = [];
    if (accountId) {
      conditions.push(eq(emailRules.accountId, accountId));
    }
    if (showId) {
      conditions.push(eq(emailRules.projectId, showId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(emailRules.priority), desc(emailRules.createdAt));
  }

  /**
   * Create email rule
   */
  async createEmailRule(ruleData: InsertEmailRule): Promise<EmailRule> {
    const [rule] = await db
      .insert(emailRules)
      .values(ruleData)
      .returning();

    return rule;
  }

  /**
   * Apply email rules to a message
   */
  async applyEmailRules(messageId: number): Promise<number> {
    // Get the message
    const message = await db
      .select()
      .from(emailMessages)
      .where(eq(emailMessages.id, messageId))
      .limit(1);

    if (!message[0]) return 0;

    // Get applicable rules
    const rules = await db
      .select()
      .from(emailRules)
      .where(
        and(
          eq(emailRules.accountId, message[0].accountId),
          eq(emailRules.isEnabled, true)
        )
      )
      .orderBy(desc(emailRules.priority));

    let appliedCount = 0;

    for (const rule of rules) {
      try {
        // Check if rule conditions match
        if (await this.evaluateRuleConditions(message[0], rule.conditions)) {
          // Apply rule actions
          await this.executeRuleActions(message[0], rule.actions);
          appliedCount++;
        }
      } catch (error) {
        console.error(`Error applying rule ${rule.id}:`, error);
      }
    }

    return appliedCount;
  }

  /**
   * Evaluate rule conditions against a message
   */
  private async evaluateRuleConditions(message: EmailMessage, conditions: any): Promise<boolean> {
    if (!conditions || typeof conditions !== 'object') return false;

    const { field, operator, value } = conditions;
    let messageValue: string = '';

    switch (field) {
      case 'subject':
        messageValue = message.subject || '';
        break;
      case 'from':
        messageValue = message.fromAddress || '';
        break;
      case 'to':
        messageValue = message.toAddresses?.join(', ') || '';
        break;
      case 'content':
        messageValue = message.content || '';
        break;
      default:
        return false;
    }

    switch (operator) {
      case 'contains':
        return messageValue.toLowerCase().includes(value.toLowerCase());
      case 'equals':
        return messageValue.toLowerCase() === value.toLowerCase();
      case 'starts_with':
        return messageValue.toLowerCase().startsWith(value.toLowerCase());
      case 'ends_with':
        return messageValue.toLowerCase().endsWith(value.toLowerCase());
      default:
        return false;
    }
  }

  /**
   * Execute rule actions on a message
   */
  private async executeRuleActions(message: EmailMessage, actions: any): Promise<void> {
    if (!actions || typeof actions !== 'object') return;

    const { action, folderId, showId, isImportant, isStarred } = actions;

    const updates: Partial<EmailMessage> = {};

    switch (action) {
      case 'move_to_folder':
        if (folderId) {
          updates.folderId = folderId;
        }
        break;
      case 'categorize_show':
        if (showId) {
          updates.relatedShowId = showId;
        }
        break;
      case 'mark_important':
        updates.isImportant = true;
        break;
      case 'mark_starred':
        updates.isStarred = true;
        break;
      case 'mark_read':
        updates.isRead = true;
        break;
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(emailMessages)
        .set(updates)
        .where(eq(emailMessages.id, message.id));
    }
  }

  /**
   * Create default theater email templates for a project
   */
  async createDefaultTheaterTemplates(showId: number, createdBy: number): Promise<EmailTemplate[]> {
    const defaultTemplates = [
      {
        name: 'Call Sheet',
        templateType: 'call_sheet',
        subject: '{{showName}} - Call Sheet for {{date}}',
        content: `Dear {{recipientName}},

Please find the call sheet for {{showName}} on {{date}}.

Call Time: {{callTime}}
Location: {{venue}}

If you have any questions, please don't hesitate to reach out.

Thank you,
{{senderName}}
Stage Manager`,
        htmlContent: `<div>
  <h2>{{showName}} - Call Sheet</h2>
  <p><strong>Date:</strong> {{date}}</p>
  <p><strong>Call Time:</strong> {{callTime}}</p>
  <p><strong>Location:</strong> {{venue}}</p>
  <p>Dear {{recipientName}},</p>
  <p>Please find the call sheet for {{showName}} attached.</p>
  <p>If you have any questions, please don't hesitate to reach out.</p>
  <p>Thank you,<br/>{{senderName}}<br/>Stage Manager</p>
</div>`,
        projectId: showId,
        createdBy,
      },
      {
        name: 'Rehearsal Report',
        templateType: 'rehearsal_report',
        subject: '{{showName}} - Rehearsal Report {{date}}',
        content: `{{showName}} Rehearsal Report - {{date}}

Rehearsal: {{rehearsalType}}
Scenes Worked: {{scenesWorked}}
Notes: {{notes}}

Next Rehearsal: {{nextRehearsal}}

{{senderName}}
Stage Manager`,
        htmlContent: `<div>
  <h2>{{showName}} - Rehearsal Report</h2>
  <p><strong>Date:</strong> {{date}}</p>
  <p><strong>Rehearsal Type:</strong> {{rehearsalType}}</p>
  <p><strong>Scenes Worked:</strong> {{scenesWorked}}</p>
  <p><strong>Notes:</strong> {{notes}}</p>
  <p><strong>Next Rehearsal:</strong> {{nextRehearsal}}</p>
  <p>{{senderName}}<br/>Stage Manager</p>
</div>`,
        projectId: showId,
        createdBy,
      },
      {
        name: 'Tech Notes',
        templateType: 'tech_notes',
        subject: '{{showName}} - Tech Notes {{date}}',
        content: `{{showName}} Tech Notes - {{date}}

Tech Session: {{techType}}
Cues Worked: {{cuesWorked}}
Outstanding Issues: {{issues}}

Next Tech: {{nextTech}}

{{senderName}}
Stage Manager`,
        htmlContent: `<div>
  <h2>{{showName}} - Tech Notes</h2>
  <p><strong>Date:</strong> {{date}}</p>
  <p><strong>Tech Session:</strong> {{techType}}</p>
  <p><strong>Cues Worked:</strong> {{cuesWorked}}</p>
  <p><strong>Outstanding Issues:</strong> {{issues}}</p>
  <p><strong>Next Tech:</strong> {{nextTech}}</p>
  <p>{{senderName}}<br/>Stage Manager</p>
</div>`,
        projectId: showId,
        createdBy,
      }
    ];

    const templates = [];
    for (const templateData of defaultTemplates) {
      const template = await this.createEmailTemplate(templateData);
      templates.push(template);
    }

    return templates;
  }

  /**
   * Get emails related to scheduling events
   */
  async getScheduleRelatedEmails(showId: number, eventDate: Date): Promise<EmailMessage[]> {
    // Get emails sent around the event date (within 3 days)
    const startDate = new Date(eventDate);
    startDate.setDate(startDate.getDate() - 3);
    
    const endDate = new Date(eventDate);
    endDate.setDate(endDate.getDate() + 3);

    return await storage.db
      .select()
      .from(emailMessages)
      .where(
        and(
          eq(emailMessages.relatedShowId, showId),
          sql`${emailMessages.dateSent} >= ${startDate}`,
          sql`${emailMessages.dateSent} <= ${endDate}`
        )
      )
      .orderBy(desc(emailMessages.dateSent));
  }

  /**
   * Create show-specific email folders
   */
  async createShowEmailFolders(accountId: number, showId: number): Promise<void> {
    const showFolders = [
      { name: 'Rehearsal Reports', folderType: 'project', color: '#10b981' },
      { name: 'Tech Notes', folderType: 'project', color: '#f59e0b' },
      { name: 'Call Sheets', folderType: 'project', color: '#3b82f6' },
      { name: 'Cast Communications', folderType: 'project', color: '#8b5cf6' },
      { name: 'Crew Communications', folderType: 'project', color: '#ef4444' },
      { name: 'Creative Team', folderType: 'project', color: '#06b6d4' },
    ];

    for (const folder of showFolders) {
      await db.insert(emailFolders).values({
        accountId,
        projectId: showId,
        ...folder,
      });
    }
  }
}