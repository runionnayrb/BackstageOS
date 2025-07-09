import { db } from '../db.js';
import { emailMessages } from '@shared/schema';
import { and, eq, lt, sql } from 'drizzle-orm';

export class EmailCleanupService {
  /**
   * Permanently delete emails from trash that are older than 30 days
   */
  async cleanupOldTrashEmails(): Promise<{ deletedCount: number }> {
    try {
      console.log('🗑️ Starting cleanup of old trash emails...');
      
      // Calculate the date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Find emails in trash folder that are older than 30 days
      const emailsToDelete = await db
        .select({ id: emailMessages.id, subject: emailMessages.subject })
        .from(emailMessages)
        .where(
          and(
            sql`${emailMessages.labels} @> ARRAY['trash']::text[]`, // In trash folder
            lt(emailMessages.dateSent, thirtyDaysAgo) // Older than 30 days
          )
        );
      
      if (emailsToDelete.length === 0) {
        console.log('✅ No old trash emails found to delete');
        return { deletedCount: 0 };
      }
      
      console.log(`🗑️ Found ${emailsToDelete.length} old trash emails to permanently delete`);
      
      // Permanently delete the old trash emails
      const result = await db
        .delete(emailMessages)
        .where(
          and(
            sql`${emailMessages.labels} @> ARRAY['trash']::text[]`,
            lt(emailMessages.dateSent, thirtyDaysAgo)
          )
        );
      
      console.log(`✅ Permanently deleted ${emailsToDelete.length} old trash emails`);
      return { deletedCount: emailsToDelete.length };
      
    } catch (error) {
      console.error('❌ Error cleaning up old trash emails:', error);
      throw error;
    }
  }
  
  /**
   * Get statistics about emails in trash
   */
  async getTrashStatistics(): Promise<{
    totalTrashEmails: number;
    oldTrashEmails: number;
    nextCleanupDate: Date;
  }> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Count total emails in trash
      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(emailMessages)
        .where(sql`${emailMessages.labels} @> ARRAY['trash']::text[]`);
      
      // Count old emails in trash (ready for deletion)
      const [oldResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(emailMessages)
        .where(
          and(
            sql`${emailMessages.labels} @> ARRAY['trash']::text[]`,
            lt(emailMessages.dateSent, thirtyDaysAgo)
          )
        );
      
      // Next cleanup will be tomorrow
      const nextCleanupDate = new Date();
      nextCleanupDate.setDate(nextCleanupDate.getDate() + 1);
      
      return {
        totalTrashEmails: totalResult.count || 0,
        oldTrashEmails: oldResult.count || 0,
        nextCleanupDate
      };
      
    } catch (error) {
      console.error('Error getting trash statistics:', error);
      throw error;
    }
  }
  
  /**
   * Schedule daily cleanup job
   */
  startCleanupScheduler(): void {
    console.log('📅 Starting email cleanup scheduler (runs daily at midnight)');
    
    // Function to schedule next run at midnight
    const scheduleNextRun = () => {
      const now = new Date();
      const nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 0, 0); // Next day at midnight
      
      const msUntilMidnight = nextMidnight.getTime() - now.getTime();
      
      console.log(`⏰ Next cleanup scheduled for: ${nextMidnight.toLocaleString()}`);
      
      setTimeout(() => {
        this.cleanupOldTrashEmails().then(() => {
          // Schedule the next run
          scheduleNextRun();
        }).catch((error) => {
          console.error('❌ Email cleanup failed, will retry next day:', error);
          // Still schedule next run even if current one fails
          scheduleNextRun();
        });
      }, msUntilMidnight);
    };
    
    // Start the scheduling
    scheduleNextRun();
  }
}

export const emailCleanupService = new EmailCleanupService();