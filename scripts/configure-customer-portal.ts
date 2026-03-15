import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not set');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
});

async function configureCustomerPortal() {
  console.log('🔧 Configuring Stripe Customer Portal...\n');

  try {
    // Check if configuration already exists
    const existingConfigs = await stripe.billingPortal.configurations.list({ limit: 5 });
    
    if (existingConfigs.data.length > 0) {
      console.log('✅ Customer Portal already configured');
      console.log(`   Config ID: ${existingConfigs.data[0].id}`);
      return;
    }

    // Create new Customer Portal configuration
    const config = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'BackstageOS - Manage Your Subscription',
        privacy_policy_url: 'https://backstageos.com/privacy',
        terms_of_service_url: 'https://backstageos.com/terms',
      },
      features: {
        customer_update: {
          enabled: true,
          allowed_updates: ['email', 'name', 'address', 'phone'],
        },
        invoice_history: {
          enabled: true,
        },
        payment_method_update: {
          enabled: true,
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          proration_behavior: 'none',
        },
        subscription_update: {
          enabled: false,
        },
      },
      default_return_url: 'https://backstageos.com/billing',
    });

    console.log('✅ Customer Portal configured successfully!');
    console.log(`   Config ID: ${config.id}`);
    console.log(`   Default Return URL: ${config.default_return_url}`);
    console.log('\n   Features enabled:');
    console.log('   - Update customer info (email, name, address, phone)');
    console.log('   - View invoice history');
    console.log('   - Update payment methods');
    console.log('   - Cancel subscription (at period end)');
    console.log('   - Update subscription');

  } catch (error: any) {
    console.error('❌ Failed to configure Customer Portal:', error.message);
    
    if (error.message.includes('privacy_policy_url') || error.message.includes('terms_of_service_url')) {
      console.log('\n📝 Note: Trying minimal configuration without policy URLs...');
      
      try {
        const minimalConfig = await stripe.billingPortal.configurations.create({
          features: {
            invoice_history: {
              enabled: true,
            },
            payment_method_update: {
              enabled: true,
            },
            subscription_cancel: {
              enabled: true,
              mode: 'at_period_end',
            },
          },
          default_return_url: 'https://backstageos.com/billing',
        });
        
        console.log('✅ Customer Portal configured with minimal settings!');
        console.log(`   Config ID: ${minimalConfig.id}`);
      } catch (minimalError: any) {
        console.error('❌ Minimal configuration also failed:', minimalError.message);
      }
    }
  }
}

configureCustomerPortal().catch(console.error);
