import Stripe from "stripe";
import { storage } from "../storage";
import type { InsertBillingPlan, BillingPlan } from "@shared/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
});

export class BillingSyncService {
  
  async createPlanWithStripe(planData: InsertBillingPlan): Promise<BillingPlan> {
    let createdProduct: Stripe.Product | null = null;
    let createdPrice: Stripe.Price | null = null;
    let createdPlan: any = null;

    try {
      const productName = planData.name || 'Unnamed Plan';
      const interval = planData.billingInterval as 'month' | 'year';
      const amount = Math.round(parseFloat(String(planData.price)) * 100);

      console.log(`BillingSyncService: Creating Stripe Product: ${productName}`);
      createdProduct = await stripe.products.create({
        name: productName,
        description: planData.description || `BackstageOS ${productName}`,
        metadata: {
          planId: planData.planId,
          source: 'backstageos-admin',
        },
      });

      console.log(`BillingSyncService: Created Stripe Product: ${createdProduct.id}`);
      createdPrice = await stripe.prices.create({
        product: createdProduct.id,
        unit_amount: amount,
        currency: 'usd',
        recurring: interval === 'month' || interval === 'year' ? {
          interval: interval,
        } : undefined,
        lookup_key: `${planData.planId}-${interval}-${Date.now()}`,
        metadata: {
          planId: planData.planId,
          billingInterval: interval,
        },
      });

      console.log(`BillingSyncService: Created Stripe Price: ${createdPrice.id}`);
      const planWithStripeData = {
        ...planData,
        stripeProductId: createdProduct.id,
        activeStripePriceId: createdPrice.id,
      };

      createdPlan = await storage.createBillingPlan(planWithStripeData);
      console.log(`BillingSyncService: Created billing plan in DB: ${createdPlan.id}`);

      await storage.createBillingPlanPrice({
        planId: createdPlan.id,
        stripeProductId: createdProduct.id,
        stripePriceId: createdPrice.id,
        unitAmount: planData.price,
        currency: 'usd',
        billingInterval: planData.billingInterval,
        isActive: true,
        validFrom: new Date(),
        validUntil: null,
        archivedBy: null,
      });

      console.log(`BillingSyncService: Successfully created plan with Stripe sync`);
      return createdPlan;
    } catch (error: any) {
      console.error("BillingSyncService: Error creating plan, initiating cleanup:", error);

      if (createdPlan) {
        try {
          console.log(`BillingSyncService: Deleting created plan from DB: ${createdPlan.id}`);
          await storage.deleteBillingPlan(createdPlan.id);
        } catch (cleanupError) {
          console.error("BillingSyncService: CRITICAL - Failed to delete plan from DB:", cleanupError);
        }
      }

      if (createdPrice) {
        try {
          console.log(`BillingSyncService: Deactivating Stripe Price: ${createdPrice.id}`);
          await stripe.prices.update(createdPrice.id, { active: false });
        } catch (cleanupError) {
          console.error("BillingSyncService: Failed to deactivate price:", cleanupError);
        }
      }

      if (createdProduct) {
        try {
          console.log(`BillingSyncService: Deactivating Stripe Product: ${createdProduct.id}`);
          await stripe.products.update(createdProduct.id, { active: false });
        } catch (cleanupError) {
          console.error("BillingSyncService: Failed to deactivate product:", cleanupError);
        }
      }

      throw error;
    }
  }

  async updatePlanWithStripe(planId: number, planData: Partial<InsertBillingPlan>): Promise<BillingPlan> {
    let newPriceCreated: Stripe.Price | null = null;
    let oldPriceId: string | null = null;

    try {
      const existingPlan = await storage.getBillingPlanById(planId);
      if (!existingPlan) {
        throw new Error('Billing plan not found');
      }

      const productNameChanged = planData.name && planData.name !== existingPlan.name;
      const descriptionChanged = planData.description !== undefined && planData.description !== existingPlan.description;
      const priceChanged = planData.price && parseFloat(String(planData.price)) !== parseFloat(String(existingPlan.price));
      const intervalChanged = planData.billingInterval && planData.billingInterval !== existingPlan.billingInterval;

      let newProductId = existingPlan.stripeProductId;
      let newPriceId = existingPlan.activeStripePriceId;

      console.log(`BillingSyncService: Updating plan ${planId} - nameChanged:${productNameChanged}, descriptionChanged:${descriptionChanged}, priceChanged:${priceChanged}, intervalChanged:${intervalChanged}`);

      if (existingPlan.stripeProductId && (productNameChanged || descriptionChanged)) {
        console.log(`BillingSyncService: Updating Stripe Product: ${existingPlan.stripeProductId}`);
        const updateData: any = {
          metadata: {
            planId: planData.planId || existingPlan.planId,
            source: 'backstageos-admin',
            lastUpdated: new Date().toISOString(),
          },
        };
        if (productNameChanged) updateData.name = planData.name;
        if (descriptionChanged) updateData.description = planData.description || '';
        await stripe.products.update(existingPlan.stripeProductId, updateData);
      } else if (!existingPlan.stripeProductId) {
        console.log(`BillingSyncService: Creating Stripe Product for existing plan`);
        const product = await stripe.products.create({
          name: planData.name || existingPlan.name,
          description: planData.description || existingPlan.description || `BackstageOS ${planData.name || existingPlan.name}`,
          metadata: {
            planId: planData.planId || existingPlan.planId,
            source: 'backstageos-admin',
          },
        });
        newProductId = product.id;
      }

      if (priceChanged || intervalChanged || !existingPlan.activeStripePriceId) {
        const finalPrice = planData.price ?? existingPlan.price;
        const finalInterval = planData.billingInterval ?? existingPlan.billingInterval;
        const amount = Math.round(parseFloat(String(finalPrice)) * 100);
        oldPriceId = existingPlan.activeStripePriceId;

        if (!newProductId) {
          console.log(`BillingSyncService: Creating Stripe Product (missing product ID)`);
          const product = await stripe.products.create({
            name: planData.name || existingPlan.name,
            description: planData.description || existingPlan.description || `BackstageOS ${planData.name || existingPlan.name}`,
            metadata: {
              planId: planData.planId || existingPlan.planId,
              source: 'backstageos-admin',
            },
          });
          newProductId = product.id;
        }

        console.log(`BillingSyncService: Creating new Stripe Price`);
        newPriceCreated = await stripe.prices.create({
          product: newProductId,
          unit_amount: amount,
          currency: 'usd',
          recurring: finalInterval === 'month' || finalInterval === 'year' ? {
            interval: finalInterval as 'month' | 'year',
          } : undefined,
          lookup_key: `${planData.planId || existingPlan.planId}-${finalInterval}-${Date.now()}`,
          metadata: {
            planId: planData.planId || existingPlan.planId,
            billingInterval: finalInterval,
          },
        });
        newPriceId = newPriceCreated.id;
        console.log(`BillingSyncService: Created new Stripe Price: ${newPriceId}`);

        if (oldPriceId) {
          console.log(`BillingSyncService: Archiving old Stripe Price: ${oldPriceId}`);
          await stripe.prices.update(oldPriceId, { active: false });

          const existingPriceRecords = await storage.getBillingPlanPrices(planId);
          const oldPriceRecord = existingPriceRecords.find(
            p => p.stripePriceId === oldPriceId && p.isActive
          );
          if (oldPriceRecord) {
            await storage.archiveBillingPlanPrice(oldPriceRecord.id, 'admin-price-update');
          }
        }

        await storage.createBillingPlanPrice({
          planId: planId,
          stripeProductId: newProductId,
          stripePriceId: newPriceId,
          unitAmount: finalPrice,
          currency: 'usd',
          billingInterval: finalInterval,
          isActive: true,
          validFrom: new Date(),
          validUntil: null,
          archivedBy: null,
        });
      }

      const updatedData = {
        ...planData,
        stripeProductId: newProductId,
        activeStripePriceId: newPriceId,
      };

      const updatedPlan = await storage.updateBillingPlan(planId, updatedData);
      console.log(`BillingSyncService: Successfully updated plan ${planId}`);
      return updatedPlan;
    } catch (error: any) {
      console.error("BillingSyncService: Error updating plan, initiating rollback:", error);

      if (newPriceCreated) {
        try {
          console.log(`BillingSyncService: Deactivating newly created price: ${newPriceCreated.id}`);
          await stripe.prices.update(newPriceCreated.id, { active: false });
        } catch (cleanupError) {
          console.error("BillingSyncService: Failed to deactivate new price:", cleanupError);
        }
      }

      if (oldPriceId && newPriceCreated) {
        try {
          console.log(`BillingSyncService: Reactivating old price: ${oldPriceId}`);
          await stripe.prices.update(oldPriceId, { active: true });
        } catch (cleanupError) {
          console.error("BillingSyncService: CRITICAL - Failed to reactivate old price:", cleanupError);
        }
      }

      throw error;
    }
  }

  async getPriceDetails(priceId: string): Promise<Stripe.Price | null> {
    try {
      const price = await stripe.prices.retrieve(priceId);
      return price;
    } catch (error) {
      console.error(`BillingSyncService: Error fetching price ${priceId}:`, error);
      return null;
    }
  }

  async getProductDetails(productId: string): Promise<Stripe.Product | null> {
    try {
      const product = await stripe.products.retrieve(productId);
      return product;
    } catch (error) {
      console.error(`BillingSyncService: Error fetching product ${productId}:`, error);
      return null;
    }
  }

  async syncDescriptionsFromStripe(): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    try {
      const plans = await storage.getBillingPlans();
      const productIds = [...new Set(plans.filter(p => p.stripeProductId).map(p => p.stripeProductId!))];

      for (const productId of productIds) {
        try {
          const product = await stripe.products.retrieve(productId);
          const plansWithProduct = plans.filter(p => p.stripeProductId === productId);
          
          for (const plan of plansWithProduct) {
            if (plan.description !== product.description) {
              await storage.updateBillingPlan(plan.id, { description: product.description || null });
              updated++;
            }
          }
        } catch (err: any) {
          errors.push(`Failed to fetch product ${productId}: ${err.message}`);
        }
      }

      return { updated, errors };
    } catch (error: any) {
      throw new Error(`Failed to sync descriptions: ${error.message}`);
    }
  }
}

export const billingSyncService = new BillingSyncService();
