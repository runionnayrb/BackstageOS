import Stripe from "stripe";
import { storage } from "../storage";
import type { ShowBilling, InsertShowBilling, InsertShowBillingEvent, Project } from "@shared/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
});

const ACTIVATION_FEE_CENTS = 40000;
const MONTHLY_FEE_CENTS = 10000;
const TRIAL_DAYS = 14;
const MONTHS_BEFORE_MONTHLY_BILLING = 6;

export type BillingType = 'limited_run' | 'long_running';
export type BillingStatus = 'trial' | 'unpaid' | 'active' | 'paused' | 'canceled' | 'archived';

export interface ShowBillingSummary {
  projectId: number;
  billingType: BillingType;
  billingStatus: BillingStatus;
  showStartDate: string;
  showEndDate: string | null;
  activationFeePaid: boolean;
  activationFeePaidAt: Date | null;
  trialEndsAt: Date | null;
  trialActive: boolean;
  trialDaysRemaining: number | null;
  monthlyBillingStartsAt: string | null;
  monthlyBillingActive: boolean;
  hasActiveSubscription: boolean;
  dueToday: number;
  monthlyAmount: number | null;
  closedAt: Date | null;
  archivedAt: Date | null;
}

export class ShowBillingService {
  
  /**
   * Get the earliest production start date from available dates.
   * Uses whichever is earlier: first rehearsal or opening night.
   * Some productions may have rehearsals before performances, others may go straight to performances.
   */
  getProductionStartDate(project: { 
    firstRehearsalDate?: Date | string | null; 
    openingNight?: Date | string | null;
  }): Date {
    const dates: Date[] = [];
    
    if (project.firstRehearsalDate) {
      dates.push(new Date(project.firstRehearsalDate));
    }
    if (project.openingNight) {
      dates.push(new Date(project.openingNight));
    }
    
    if (dates.length === 0) {
      return new Date(); // Default to today if no dates set
    }
    
    // Return the earliest date
    return dates.reduce((earliest, current) => 
      current < earliest ? current : earliest
    );
  }
  
  classifyShowType(startDate: Date, endDate: Date | null): BillingType {
    if (!endDate) {
      return 'long_running';
    }
    
    const sixMonthsFromStart = new Date(startDate);
    sixMonthsFromStart.setMonth(sixMonthsFromStart.getMonth() + MONTHS_BEFORE_MONTHLY_BILLING);
    
    if (endDate > sixMonthsFromStart) {
      return 'long_running';
    }
    
    return 'limited_run';
  }
  
  calculateMonthlyBillingStartDate(startDate: Date): Date {
    const monthlyStartDate = new Date(startDate);
    monthlyStartDate.setMonth(monthlyStartDate.getMonth() + MONTHS_BEFORE_MONTHLY_BILLING);
    return monthlyStartDate;
  }
  
  calculateTrialEndDate(): Date {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
    return trialEnd;
  }

  async getShowBillingSummary(projectId: number): Promise<ShowBillingSummary | null> {
    const billing = await storage.getShowBillingByProjectId(projectId);
    if (!billing) return null;
    
    const now = new Date();
    const trialEndsAt = billing.trialEndsAt ? new Date(billing.trialEndsAt) : null;
    const trialActive = trialEndsAt ? now < trialEndsAt : false;
    const trialDaysRemaining = trialEndsAt && trialActive 
      ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    const monthlyBillingStartsAt = billing.monthlyBillingStartsAt;
    const monthlyBillingActive = billing.billingType === 'long_running' 
      && monthlyBillingStartsAt 
      && new Date(monthlyBillingStartsAt) <= now
      && billing.billingStatus === 'active'
      && !billing.closedAt
      && !billing.archivedAt;
    
    let dueToday = 0;
    if (billing.billingStatus === 'unpaid' || (billing.billingStatus === 'trial' && !trialActive)) {
      dueToday = ACTIVATION_FEE_CENTS / 100;
    }
    
    return {
      projectId: billing.projectId,
      billingType: billing.billingType as BillingType,
      billingStatus: billing.billingStatus as BillingStatus,
      showStartDate: billing.showStartDate,
      showEndDate: billing.showEndDate,
      activationFeePaid: !!billing.activationFeePaidAt,
      activationFeePaidAt: billing.activationFeePaidAt ? new Date(billing.activationFeePaidAt) : null,
      trialEndsAt,
      trialActive,
      trialDaysRemaining,
      monthlyBillingStartsAt,
      monthlyBillingActive,
      hasActiveSubscription: !!billing.stripeSubscriptionId,
      dueToday,
      monthlyAmount: billing.billingType === 'long_running' ? MONTHLY_FEE_CENTS / 100 : null,
      closedAt: billing.closedAt ? new Date(billing.closedAt) : null,
      archivedAt: billing.archivedAt ? new Date(billing.archivedAt) : null,
    };
  }
  
  async requiresActivationFee(projectId: number): Promise<boolean> {
    const billing = await storage.getShowBillingByProjectId(projectId);
    if (!billing) return true;
    return !billing.activationFeePaidAt;
  }
  
  async requiresMonthlySubscription(projectId: number, onDate: Date = new Date()): Promise<boolean> {
    const billing = await storage.getShowBillingByProjectId(projectId);
    if (!billing) return false;
    
    if (billing.billingType !== 'long_running') return false;
    if (billing.billingStatus !== 'active') return false;
    if (billing.closedAt || billing.archivedAt) return false;
    if (billing.stripeSubscriptionId) return false;
    
    if (!billing.monthlyBillingStartsAt) return false;
    
    return new Date(billing.monthlyBillingStartsAt) <= onDate;
  }
  
  async initializeShowBilling(
    projectId: number, 
    startDate: Date, 
    endDate: Date | null,
    ownerId: number
  ): Promise<ShowBilling> {
    const existing = await storage.getShowBillingByProjectId(projectId);
    if (existing) {
      return existing;
    }
    
    const billingType = this.classifyShowType(startDate, endDate);
    const monthlyBillingStartsAt = billingType === 'long_running' 
      ? this.calculateMonthlyBillingStartDate(startDate).toISOString().split('T')[0]
      : null;
    
    const trialEndsAt = this.calculateTrialEndDate();
    
    const billingData: InsertShowBilling = {
      projectId,
      billingType,
      showStartDate: startDate.toISOString().split('T')[0],
      showEndDate: endDate ? endDate.toISOString().split('T')[0] : null,
      monthlyBillingStartsAt,
      trialEndsAt,
      billingStatus: 'trial',
    };
    
    const billing = await storage.createShowBilling(billingData);
    
    await this.logBillingEvent(projectId, 'trial_started', null, null, {
      trialEndsAt: trialEndsAt.toISOString(),
      billingType,
      ownerId,
    });
    
    return billing;
  }
  
  async createActivationCheckout(
    projectId: number, 
    userId: number,
    userEmail: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ checkoutUrl: string; sessionId: string }> {
    const billing = await storage.getShowBillingByProjectId(projectId);
    if (!billing) {
      throw new Error('Show billing record not found');
    }
    
    if (billing.activationFeePaidAt) {
      throw new Error('Activation fee already paid');
    }
    
    const project = await storage.getProjectById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    
    let customerId = billing.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId: String(userId),
          projectId: String(projectId),
          source: 'backstageos-show-billing',
        },
      });
      customerId = customer.id;
      
      await storage.updateShowBilling(billing.id, {
        stripeCustomerId: customerId,
      });
    }
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `BackstageOS - ${project.name}`,
            description: billing.billingType === 'long_running' 
              ? 'Show activation fee (Long Running Show)'
              : 'Show activation fee (Limited Run)',
          },
          unit_amount: ACTIVATION_FEE_CENTS,
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        projectId: String(projectId),
        userId: String(userId),
        eventType: 'show_activation',
        billingType: billing.billingType,
      },
    });
    
    return {
      checkoutUrl: session.url!,
      sessionId: session.id,
    };
  }
  
  async handleActivationPaymentSuccess(
    projectId: number, 
    stripePaymentId: string
  ): Promise<ShowBilling> {
    const billing = await storage.getShowBillingByProjectId(projectId);
    if (!billing) {
      throw new Error('Show billing record not found');
    }
    
    const updatedBilling = await storage.updateShowBilling(billing.id, {
      activationFeePaidAt: new Date(),
      stripeActivationPaymentId: stripePaymentId,
      billingStatus: 'active',
    });
    
    await this.logBillingEvent(projectId, 'activation_paid', stripePaymentId, ACTIVATION_FEE_CENTS / 100, {
      billingType: billing.billingType,
    });
    
    return updatedBilling;
  }
  
  async createMonthlySubscription(projectId: number): Promise<ShowBilling> {
    const billing = await storage.getShowBillingByProjectId(projectId);
    if (!billing) {
      throw new Error('Show billing record not found');
    }
    
    if (billing.billingType !== 'long_running') {
      throw new Error('Monthly subscription only applies to long running shows');
    }
    
    if (billing.stripeSubscriptionId) {
      throw new Error('Monthly subscription already exists');
    }
    
    if (!billing.stripeCustomerId) {
      throw new Error('No Stripe customer found for this show');
    }
    
    const project = await storage.getProjectById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    
    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: MONTHLY_FEE_CENTS,
      recurring: { interval: 'month' },
      product_data: {
        name: `BackstageOS Monthly - ${project.name}`,
        metadata: {
          projectId: String(projectId),
          source: 'backstageos-show-monthly',
        },
      },
    });
    
    const subscription = await stripe.subscriptions.create({
      customer: billing.stripeCustomerId,
      items: [{ price: price.id }],
      metadata: {
        projectId: String(projectId),
        eventType: 'show_monthly',
      },
    });
    
    const updatedBilling = await storage.updateShowBilling(billing.id, {
      stripeSubscriptionId: subscription.id,
    });
    
    await this.logBillingEvent(projectId, 'monthly_started', subscription.id, null, {
      subscriptionStatus: subscription.status,
    });
    
    return updatedBilling;
  }
  
  async cancelMonthlySubscription(projectId: number): Promise<ShowBilling> {
    const billing = await storage.getShowBillingByProjectId(projectId);
    if (!billing) {
      throw new Error('Show billing record not found');
    }
    
    if (!billing.stripeSubscriptionId) {
      throw new Error('No active monthly subscription found');
    }
    
    await stripe.subscriptions.cancel(billing.stripeSubscriptionId);
    
    const updatedBilling = await storage.updateShowBilling(billing.id, {
      stripeSubscriptionId: null,
    });
    
    await this.logBillingEvent(projectId, 'subscription_canceled', billing.stripeSubscriptionId, null, {});
    
    return updatedBilling;
  }
  
  async convertShowToLongRunning(projectId: number, newEndDate: Date | null): Promise<ShowBilling> {
    const billing = await storage.getShowBillingByProjectId(projectId);
    if (!billing) {
      throw new Error('Show billing record not found');
    }
    
    if (billing.billingType === 'long_running') {
      return billing;
    }
    
    const startDate = new Date(billing.showStartDate);
    const monthlyBillingStartsAt = this.calculateMonthlyBillingStartDate(startDate);
    const now = new Date();
    
    const monthlyBillingStartsAtStr = monthlyBillingStartsAt.toISOString().split('T')[0];
    
    const updatedBilling = await storage.updateShowBilling(billing.id, {
      billingType: 'long_running',
      showEndDate: newEndDate ? newEndDate.toISOString().split('T')[0] : null,
      monthlyBillingStartsAt: monthlyBillingStartsAtStr,
    });
    
    await this.logBillingEvent(projectId, 'converted_to_long_running', null, null, {
      previousType: billing.billingType,
      newEndDate: newEndDate?.toISOString() || null,
      monthlyBillingStartsAt: monthlyBillingStartsAtStr,
    });
    
    if (monthlyBillingStartsAt <= now && billing.billingStatus === 'active' && !billing.stripeSubscriptionId) {
      await this.createMonthlySubscription(projectId);
    }
    
    return updatedBilling;
  }
  
  async closeShow(projectId: number): Promise<ShowBilling> {
    const billing = await storage.getShowBillingByProjectId(projectId);
    if (!billing) {
      throw new Error('Show billing record not found');
    }
    
    if (billing.stripeSubscriptionId) {
      await this.cancelMonthlySubscription(projectId);
    }
    
    const updatedBilling = await storage.updateShowBilling(billing.id, {
      closedAt: new Date(),
      billingStatus: 'paused',
    });
    
    await this.logBillingEvent(projectId, 'show_closed', null, null, {});
    
    return updatedBilling;
  }
  
  async reopenShow(projectId: number): Promise<ShowBilling> {
    const billing = await storage.getShowBillingByProjectId(projectId);
    if (!billing) {
      throw new Error('Show billing record not found');
    }
    
    if (!billing.closedAt) {
      throw new Error('Show is not closed');
    }
    
    if (billing.archivedAt) {
      throw new Error('Cannot reopen an archived show');
    }
    
    const updatedBilling = await storage.updateShowBilling(billing.id, {
      closedAt: null,
      billingStatus: billing.activationFeePaidAt ? 'active' : 'unpaid',
    });
    
    await this.logBillingEvent(projectId, 'show_reopened', null, null, {});
    
    if (billing.billingType === 'long_running' && await this.requiresMonthlySubscription(projectId)) {
      await this.createMonthlySubscription(projectId);
    }
    
    return updatedBilling;
  }
  
  async archiveShow(projectId: number): Promise<ShowBilling> {
    const billing = await storage.getShowBillingByProjectId(projectId);
    if (!billing) {
      throw new Error('Show billing record not found');
    }
    
    if (billing.stripeSubscriptionId) {
      await this.cancelMonthlySubscription(projectId);
    }
    
    const updatedBilling = await storage.updateShowBilling(billing.id, {
      closedAt: billing.closedAt || new Date(),
      archivedAt: new Date(),
      billingStatus: 'archived',
    });
    
    await this.logBillingEvent(projectId, 'show_archived', null, null, {});
    
    return updatedBilling;
  }
  
  async transferOwnership(projectId: number, newOwnerId: number, newOwnerEmail: string): Promise<ShowBilling> {
    const billing = await storage.getShowBillingByProjectId(projectId);
    if (!billing) {
      throw new Error('Show billing record not found');
    }
    
    if (billing.stripeSubscriptionId) {
      await this.cancelMonthlySubscription(projectId);
    }
    
    const newCustomer = await stripe.customers.create({
      email: newOwnerEmail,
      metadata: {
        userId: String(newOwnerId),
        projectId: String(projectId),
        source: 'backstageos-show-billing-transfer',
      },
    });
    
    const updatedBilling = await storage.updateShowBilling(billing.id, {
      stripeCustomerId: newCustomer.id,
      stripeSubscriptionId: null,
    });
    
    await this.logBillingEvent(projectId, 'ownership_transferred', null, null, {
      newOwnerId,
      previousCustomerId: billing.stripeCustomerId,
      newCustomerId: newCustomer.id,
    });
    
    if (billing.billingType === 'long_running' && billing.billingStatus === 'active' && !billing.closedAt) {
      if (await this.requiresMonthlySubscription(projectId)) {
        await this.createMonthlySubscription(projectId);
      }
    }
    
    return updatedBilling;
  }
  
  async processMonthlyBillingActivations(): Promise<{ processed: number; errors: string[] }> {
    const today = new Date();
    const billingsNeedingActivation = await storage.getShowBillingsRequiringMonthlyActivation(today);
    
    let processed = 0;
    const errors: string[] = [];
    
    for (const billing of billingsNeedingActivation) {
      try {
        await this.createMonthlySubscription(billing.projectId);
        processed++;
        console.log(`ShowBillingService: Started monthly billing for project ${billing.projectId}`);
      } catch (error: any) {
        const errorMsg = `Failed to start monthly billing for project ${billing.projectId}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`ShowBillingService: ${errorMsg}`);
      }
    }
    
    return { processed, errors };
  }
  
  async updateShowDates(projectId: number, newStartDate: Date, newEndDate: Date | null): Promise<ShowBilling> {
    const billing = await storage.getShowBillingByProjectId(projectId);
    if (!billing) {
      throw new Error('Show billing record not found');
    }
    
    const newBillingType = this.classifyShowType(newStartDate, newEndDate);
    const currentBillingType = billing.billingType as BillingType;
    
    const updates: Partial<InsertShowBilling> = {
      showStartDate: newStartDate.toISOString().split('T')[0],
      showEndDate: newEndDate ? newEndDate.toISOString().split('T')[0] : null,
    };
    
    if (currentBillingType === 'limited_run' && newBillingType === 'long_running') {
      updates.billingType = 'long_running';
      updates.monthlyBillingStartsAt = this.calculateMonthlyBillingStartDate(newStartDate).toISOString().split('T')[0];
    }
    
    const updatedBilling = await storage.updateShowBilling(billing.id, updates);
    return updatedBilling;
  }
  
  async checkTrialExpired(projectId: number): Promise<boolean> {
    const billing = await storage.getShowBillingByProjectId(projectId);
    if (!billing) return false;
    
    if (billing.billingStatus !== 'trial') return false;
    if (!billing.trialEndsAt) return false;
    
    const now = new Date();
    const trialEndsAt = new Date(billing.trialEndsAt);
    
    if (now > trialEndsAt) {
      await storage.updateShowBilling(billing.id, {
        billingStatus: 'unpaid',
      });
      return true;
    }
    
    return false;
  }
  
  private async logBillingEvent(
    projectId: number, 
    eventType: string, 
    providerReference: string | null,
    amount: number | null,
    metadata: Record<string, any>
  ): Promise<void> {
    const eventData: InsertShowBillingEvent = {
      projectId,
      eventType,
      providerReference,
      amount: amount ? String(amount) : null,
      metadata,
    };
    
    await storage.createShowBillingEvent(eventData);
  }
  
  async migrateExistingShows(): Promise<{ migrated: number; skipped: number; errors: string[] }> {
    const allProjects = await storage.getAllProjects();
    
    let migrated = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    for (const project of allProjects) {
      try {
        const existingBilling = await storage.getShowBillingByProjectId(project.id);
        if (existingBilling) {
          skipped++;
          continue;
        }
        
        const startDate = this.getProductionStartDate(project);
        
        const endDate = project.closingDate || null;
        
        const billingType = this.classifyShowType(startDate, endDate ? new Date(endDate) : null);
        const monthlyBillingStartsAt = billingType === 'long_running' 
          ? this.calculateMonthlyBillingStartDate(startDate).toISOString().split('T')[0]
          : null;
        
        const trialEndsAt = this.calculateTrialEndDate();
        
        const billingData: InsertShowBilling = {
          projectId: project.id,
          billingType,
          showStartDate: new Date(startDate).toISOString().split('T')[0],
          showEndDate: endDate ? new Date(endDate).toISOString().split('T')[0] : null,
          monthlyBillingStartsAt,
          trialEndsAt,
          billingStatus: 'trial',
        };
        
        await storage.createShowBilling(billingData);
        
        await this.logBillingEvent(project.id, 'trial_started', null, null, {
          migratedFromExisting: true,
          trialEndsAt: trialEndsAt.toISOString(),
          billingType,
          ownerId: project.ownerId,
        });
        
        migrated++;
        console.log(`ShowBillingService: Migrated billing for project ${project.id} (${project.name}) as ${billingType}`);
      } catch (error: any) {
        const errorMsg = `Failed to migrate project ${project.id}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`ShowBillingService: ${errorMsg}`);
      }
    }
    
    return { migrated, skipped, errors };
  }

  startBillingScheduler(): void {
    console.log('📅 Starting show billing scheduler (runs daily at 1 AM)');
    
    const scheduleNextRun = () => {
      const now = new Date();
      const next1am = new Date();
      next1am.setHours(1, 0, 0, 0);
      if (now >= next1am) {
        next1am.setDate(next1am.getDate() + 1);
      }
      
      const msUntilRun = next1am.getTime() - now.getTime();
      console.log(`⏰ Next show billing check scheduled for: ${next1am.toLocaleString()}`);
      
      setTimeout(async () => {
        console.log('🔄 Running daily show billing tasks...');
        
        try {
          await this.processExpiredTrials();
          await this.processMonthlyBillingActivations();
          console.log('✅ Daily show billing tasks completed');
        } catch (error: any) {
          console.error('❌ Show billing scheduler error:', error.message);
        }
        
        scheduleNextRun();
      }, msUntilRun);
    };
    
    scheduleNextRun();
  }

  async processExpiredTrials(): Promise<{ expired: number; errors: string[] }> {
    console.log('Processing expired trials...');
    const errors: string[] = [];
    let expired = 0;
    
    try {
      const allBillings = await storage.getAllShowBillings();
      const now = new Date();
      
      for (const billing of allBillings) {
        if (billing.billingStatus === 'trial' && billing.trialEndsAt) {
          const trialEnd = new Date(billing.trialEndsAt);
          if (now >= trialEnd) {
            try {
              await storage.updateShowBilling(billing.id, { billingStatus: 'unpaid' });
              await this.logBillingEvent(billing.projectId, 'trial_expired', null, null, {
                trialEndedAt: trialEnd.toISOString(),
              });
              expired++;
              console.log(`Trial expired for project ${billing.projectId}`);
            } catch (error: any) {
              errors.push(`Failed to expire trial for project ${billing.projectId}: ${error.message}`);
            }
          }
        }
      }
    } catch (error: any) {
      errors.push(`Failed to fetch billings: ${error.message}`);
    }
    
    return { expired, errors };
  }
}

export const showBillingService = new ShowBillingService();
