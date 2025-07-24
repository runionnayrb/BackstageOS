// Direct test of search engine functionality
import { db } from './server/db.js';
import { emailThreads, emailAccounts, emailMessages } from './shared/schema.js';
import { eq, and, or, ilike, desc, sql, inArray } from 'drizzle-orm';

async function testEmailSearch() {
  console.log('🔍 Testing email search functionality...');
  
  const userId = 2;
  const keyword = 'bryan';
  
  try {
    // Step 1: Get user's email accounts
    console.log('\n1. Getting user email accounts...');
    const userAccounts = await db
      .select({ id: emailAccounts.id, email: emailAccounts.emailAddress })
      .from(emailAccounts)
      .where(eq(emailAccounts.userId, userId));
    
    console.log('User accounts:', userAccounts);
    
    if (userAccounts.length === 0) {
      console.log('❌ No email accounts found for user');
      return;
    }
    
    // Step 2: Search email threads
    console.log('\n2. Searching email threads...');
    const accountIds = userAccounts.map(acc => acc.id);
    const conditions = [inArray(emailThreads.accountId, accountIds)];
    
    const textConditions = [
      or(
        ilike(emailThreads.subject, `%${keyword}%`),
        sql`EXISTS (
          SELECT 1 FROM ${emailMessages} em 
          WHERE em.thread_id = ${emailThreads.id} 
          AND (em.content ILIKE ${`%${keyword}%`} OR em.from_address ILIKE ${`%${keyword}%`})
        )`
      )
    ];
    conditions.push(or(...textConditions));
    
    const whereClause = and(...conditions);
    
    const emailResults = await db
      .select({
        id: emailThreads.id,
        subject: emailThreads.subject,
        messageCount: emailThreads.messageCount,
        lastMessageAt: emailThreads.lastMessageAt,
        isRead: emailThreads.isRead,
        projectId: emailThreads.projectId,
      })
      .from(emailThreads)
      .where(whereClause)
      .orderBy(desc(emailThreads.lastMessageAt))
      .limit(20);
      
    console.log('Email search results:', emailResults);
    
    if (emailResults.length > 0) {
      console.log('✅ Email search working correctly!');
      return true;
    } else {
      console.log('❌ No email results found');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing email search:', error);
    return false;
  }
}

testEmailSearch().then(success => {
  console.log('\n🏁 Test completed:', success ? 'SUCCESS' : 'FAILED');
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test crashed:', error);
  process.exit(1);
});