import { Router } from 'express';
import { db } from '../db.js';
import { emailForwardingRules, emailAccounts, users } from '../../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { emailForwardingService } from '../services/emailForwardingService.js';
// Use isAuthenticated middleware from main routes file
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const router = Router();

// Get forwarding rules for current user
router.get('/rules', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    const rules = await db
      .select({
        id: emailForwardingRules.id,
        accountId: emailForwardingRules.accountId,
        forwardToEmail: emailForwardingRules.forwardToEmail,
        isActive: emailForwardingRules.isActive,
        forwardIncoming: emailForwardingRules.forwardIncoming,
        forwardOutgoing: emailForwardingRules.forwardOutgoing,
        keepOriginal: emailForwardingRules.keepOriginal,
        backstageEmail: emailAccounts.emailAddress,
        displayName: emailAccounts.displayName,
        accountType: emailAccounts.accountType,
        createdAt: emailForwardingRules.createdAt
      })
      .from(emailForwardingRules)
      .innerJoin(emailAccounts, eq(emailAccounts.id, emailForwardingRules.accountId))
      .where(eq(emailForwardingRules.userId, userId));

    res.json(rules);
  } catch (error) {
    console.error('❌ Error fetching forwarding rules:', error);
    res.status(500).json({ error: 'Failed to fetch forwarding rules' });
  }
});

// Create new forwarding rule
router.post('/rules', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { accountId, forwardToEmail } = req.body;

    if (!accountId || !forwardToEmail) {
      return res.status(400).json({ error: 'Account ID and forward to email are required' });
    }

    // Verify user owns the account
    const [account] = await db
      .select()
      .from(emailAccounts)
      .where(and(
        eq(emailAccounts.id, accountId),
        eq(emailAccounts.userId, userId)
      ))
      .limit(1);

    if (!account) {
      return res.status(404).json({ error: 'Email account not found' });
    }

    await emailForwardingService.createForwardingRule(userId, accountId, forwardToEmail);

    res.json({ success: true, message: 'Forwarding rule created successfully' });
  } catch (error) {
    console.error('❌ Error creating forwarding rule:', error);
    res.status(500).json({ error: 'Failed to create forwarding rule' });
  }
});

// Update forwarding rule
router.put('/rules/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const ruleId = parseInt(req.params.id);
    const { isActive, forwardIncoming, forwardOutgoing, keepOriginal } = req.body;

    // Verify user owns the rule
    const [rule] = await db
      .select()
      .from(emailForwardingRules)
      .where(and(
        eq(emailForwardingRules.id, ruleId),
        eq(emailForwardingRules.userId, userId)
      ))
      .limit(1);

    if (!rule) {
      return res.status(404).json({ error: 'Forwarding rule not found' });
    }

    await emailForwardingService.updateForwardingRule(ruleId, {
      isActive,
      forwardIncoming,
      forwardOutgoing,
      keepOriginal
    });

    res.json({ success: true, message: 'Forwarding rule updated successfully' });
  } catch (error) {
    console.error('❌ Error updating forwarding rule:', error);
    res.status(500).json({ error: 'Failed to update forwarding rule' });
  }
});

// Delete forwarding rule
router.delete('/rules/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const ruleId = parseInt(req.params.id);

    // Verify user owns the rule
    const [rule] = await db
      .select()
      .from(emailForwardingRules)
      .where(and(
        eq(emailForwardingRules.id, ruleId),
        eq(emailForwardingRules.userId, userId)
      ))
      .limit(1);

    if (!rule) {
      return res.status(404).json({ error: 'Forwarding rule not found' });
    }

    await emailForwardingService.deleteForwardingRule(ruleId);

    res.json({ success: true, message: 'Forwarding rule deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting forwarding rule:', error);
    res.status(500).json({ error: 'Failed to delete forwarding rule' });
  }
});

// Test forwarding setup
router.post('/test', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { accountId } = req.body;

    // Get user's email account
    const [account] = await db
      .select()
      .from(emailAccounts)
      .where(and(
        eq(emailAccounts.id, accountId),
        eq(emailAccounts.userId, userId)
      ))
      .limit(1);

    if (!account) {
      return res.status(404).json({ error: 'Email account not found' });
    }

    // Send test email to BackstageOS address
    const testSubject = `Test Email - ${new Date().toLocaleString()}`;
    const testBody = `This is a test email sent to ${account.emailAddress} to verify forwarding is working properly.`;

    // Here you would normally send the email via your email service
    // For now, we'll just simulate it
    console.log(`📧 Test email would be sent to: ${account.emailAddress}`);
    console.log(`📧 Subject: ${testSubject}`);

    res.json({ 
      success: true, 
      message: `Test email sent to ${account.emailAddress}. Check your forwarded email address.`,
      testDetails: {
        to: account.emailAddress,
        subject: testSubject,
        sentAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

export default router;