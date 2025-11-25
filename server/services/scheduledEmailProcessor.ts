import { db } from '../db.js';
import { scheduledEmails, users } from '@shared/schema';
import { eq, lte, and } from 'drizzle-orm';

let isProcessing = false;

async function processScheduledEmails() {
  if (isProcessing) {
    return;
  }
  
  isProcessing = true;
  
  try {
    const now = new Date();
    
    const dueEmails = await db.select({
      email: scheduledEmails,
      user: users
    })
      .from(scheduledEmails)
      .innerJoin(users, eq(scheduledEmails.userId, users.id))
      .where(and(
        eq(scheduledEmails.status, 'pending'),
        lte(scheduledEmails.scheduledFor, now)
      ));
    
    if (dueEmails.length === 0) {
      isProcessing = false;
      return;
    }
    
    console.log(`📬 Processing ${dueEmails.length} scheduled email(s)...`);
    
    for (const { email, user } of dueEmails) {
      try {
        await db.update(scheduledEmails)
          .set({ status: 'sending' })
          .where(eq(scheduledEmails.id, email.id));
        
        let success = false;
        let error = null;
        
        try {
          if (user.connectedEmailProvider === 'gmail') {
            const { gmailIntegrationService, setGmailUserId } = await import('./gmailIntegrationService.js');
            setGmailUserId(user.id.toString());
            const result = await gmailIntegrationService.sendEmail({
              to: email.toAddresses,
              cc: email.ccAddresses,
              bcc: email.bccAddresses,
              subject: email.subject,
              body: email.content,
              isHtml: true
            });
            success = result.success;
            if (!success) error = result.error;
          } else if (user.connectedEmailProvider === 'outlook') {
            const { outlookIntegrationService } = await import('./outlookIntegrationService.js');
            const result = await outlookIntegrationService.sendEmail({
              to: email.toAddresses,
              cc: email.ccAddresses,
              bcc: email.bccAddresses,
              subject: email.subject,
              body: email.content,
              isHtml: true
            });
            success = result.success;
            if (!success) error = result.error;
          } else {
            const { standaloneEmailService } = await import('./standaloneEmailService.js');
            const result = await standaloneEmailService.sendInternalEmail(
              email.accountId || 0,
              email.toAddresses,
              email.subject,
              email.content,
              undefined,
              email.ccAddresses,
              email.bccAddresses
            );
            success = result.success;
            if (!success) error = result.error;
          }
        } catch (sendError) {
          error = sendError instanceof Error ? sendError.message : 'Unknown error';
        }
        
        if (success) {
          await db.update(scheduledEmails)
            .set({ status: 'sent', sentAt: new Date() })
            .where(eq(scheduledEmails.id, email.id));
          
          console.log(`✅ Scheduled email sent: ${email.id} - "${email.subject}" to ${email.toAddresses}`);
        } else {
          await db.update(scheduledEmails)
            .set({ status: 'failed', error: error || 'Failed to send email' })
            .where(eq(scheduledEmails.id, email.id));
          
          console.error(`❌ Failed to send scheduled email ${email.id}:`, error);
        }
      } catch (emailError) {
        console.error(`Error processing scheduled email ${email.id}:`, emailError);
        
        await db.update(scheduledEmails)
          .set({ status: 'failed', error: emailError instanceof Error ? emailError.message : 'Processing error' })
          .where(eq(scheduledEmails.id, email.id));
      }
    }
  } catch (error) {
    console.error('Error in scheduled email processor:', error);
  } finally {
    isProcessing = false;
  }
}

export function startScheduledEmailProcessor() {
  console.log('📅 Starting scheduled email processor (checking every 60 seconds)...');
  
  processScheduledEmails();
  
  setInterval(processScheduledEmails, 60 * 1000);
}
