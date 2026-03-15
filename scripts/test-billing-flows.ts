import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not set');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil',
});

interface TestResult {
  test: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

async function runTests() {
  console.log('🧪 Running BackstageOS Billing Flow Tests\n');
  console.log('='.repeat(50));

  // Test 1: Stripe Connection
  console.log('\n📡 Test 1: Stripe API Connection');
  try {
    const account = await stripe.accounts.retrieve();
    results.push({
      test: 'Stripe API Connection',
      passed: true,
      details: `Connected to account: ${account.id}`,
    });
    console.log('  ✅ Connected to Stripe');
  } catch (error: any) {
    results.push({
      test: 'Stripe API Connection',
      passed: false,
      details: error.message,
    });
    console.log('  ❌ Failed:', error.message);
  }

  // Test 2: Products exist
  console.log('\n📦 Test 2: BackstageOS Products in Stripe');
  try {
    const products = await stripe.products.list({ active: true, limit: 20 });
    const backstageProducts = products.data.filter(p => 
      p.name.toLowerCase().includes('backstageos') || 
      p.name.toLowerCase().includes('backstage')
    );
    
    if (backstageProducts.length >= 3) {
      results.push({
        test: 'BackstageOS Products',
        passed: true,
        details: `Found ${backstageProducts.length} products: ${backstageProducts.map(p => p.name).join(', ')}`,
      });
      console.log(`  ✅ Found ${backstageProducts.length} BackstageOS products`);
      backstageProducts.forEach(p => console.log(`     - ${p.name}`));
    } else {
      results.push({
        test: 'BackstageOS Products',
        passed: false,
        details: `Expected at least 3 products, found ${backstageProducts.length}`,
      });
      console.log(`  ⚠️ Only found ${backstageProducts.length} products`);
    }
  } catch (error: any) {
    results.push({
      test: 'BackstageOS Products',
      passed: false,
      details: error.message,
    });
    console.log('  ❌ Failed:', error.message);
  }

  // Test 3: Prices exist (activation fee $400, monthly $100)
  console.log('\n💰 Test 3: Pricing Configuration');
  try {
    const prices = await stripe.prices.list({ active: true, limit: 50 });
    
    const activationPrice = prices.data.find(p => p.unit_amount === 40000 && !p.recurring);
    const monthlyPrice = prices.data.find(p => p.unit_amount === 10000 && p.recurring?.interval === 'month');
    
    const hasActivation = !!activationPrice;
    const hasMonthly = !!monthlyPrice;
    
    if (hasActivation && hasMonthly) {
      results.push({
        test: 'Pricing Configuration',
        passed: true,
        details: `Activation: $400 (${activationPrice?.id}), Monthly: $100/mo (${monthlyPrice?.id})`,
      });
      console.log('  ✅ Pricing configured correctly');
      console.log(`     - Activation fee: $400 (${activationPrice?.id})`);
      console.log(`     - Monthly fee: $100/mo (${monthlyPrice?.id})`);
    } else {
      results.push({
        test: 'Pricing Configuration',
        passed: false,
        details: `Missing: ${!hasActivation ? 'activation ($400)' : ''} ${!hasMonthly ? 'monthly ($100)' : ''}`,
      });
      console.log('  ⚠️ Some prices missing');
    }
  } catch (error: any) {
    results.push({
      test: 'Pricing Configuration',
      passed: false,
      details: error.message,
    });
    console.log('  ❌ Failed:', error.message);
  }

  // Test 4: Webhook endpoint configured
  console.log('\n🔗 Test 4: Webhook Configuration');
  try {
    const webhooks = await stripe.webhookEndpoints.list({ limit: 10 });
    const backstageWebhook = webhooks.data.find(w => 
      w.url.includes('backstageos') || w.url.includes('stripe-webhook')
    );
    
    if (backstageWebhook) {
      const requiredEvents = [
        'checkout.session.completed',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
      ];
      const hasRequiredEvents = requiredEvents.every(e => 
        backstageWebhook.enabled_events.includes(e) || 
        backstageWebhook.enabled_events.includes('*')
      );
      
      results.push({
        test: 'Webhook Configuration',
        passed: hasRequiredEvents,
        details: `URL: ${backstageWebhook.url}, Status: ${backstageWebhook.status}`,
      });
      console.log(`  ✅ Webhook found: ${backstageWebhook.url}`);
      console.log(`     Status: ${backstageWebhook.status}`);
    } else {
      results.push({
        test: 'Webhook Configuration',
        passed: false,
        details: 'No BackstageOS webhook found',
      });
      console.log('  ⚠️ No webhook endpoint configured');
    }
  } catch (error: any) {
    results.push({
      test: 'Webhook Configuration',
      passed: false,
      details: error.message,
    });
    console.log('  ❌ Failed:', error.message);
  }

  // Test 5: Customer Portal Configuration
  console.log('\n🚪 Test 5: Customer Portal Configuration');
  try {
    const portalConfigs = await stripe.billingPortal.configurations.list({ limit: 5 });
    
    if (portalConfigs.data.length > 0) {
      const activeConfig = portalConfigs.data.find(c => c.is_default) || portalConfigs.data[0];
      results.push({
        test: 'Customer Portal',
        passed: true,
        details: `Portal configured (${activeConfig.id})`,
      });
      console.log('  ✅ Customer Portal configured');
    } else {
      results.push({
        test: 'Customer Portal',
        passed: false,
        details: 'No portal configuration found',
      });
      console.log('  ⚠️ No Customer Portal configuration');
    }
  } catch (error: any) {
    results.push({
      test: 'Customer Portal',
      passed: false,
      details: error.message,
    });
    console.log('  ❌ Failed:', error.message);
  }

  // Test 6: Create test checkout session (validates checkout flow works)
  console.log('\n🛒 Test 6: Checkout Session Creation');
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'BackstageOS - Test Show',
            description: 'Test activation fee',
          },
          unit_amount: 40000,
        },
        quantity: 1,
      }],
      success_url: 'https://backstageos.com/test-success',
      cancel_url: 'https://backstageos.com/test-cancel',
      metadata: {
        projectId: '999',
        userId: '999',
        eventType: 'show_activation',
        billingType: 'limited_run',
        testSession: 'true',
      },
    });

    results.push({
      test: 'Checkout Session Creation',
      passed: true,
      details: `Session created: ${session.id}`,
    });
    console.log('  ✅ Checkout session created successfully');
    console.log(`     Session ID: ${session.id}`);
    
    // Expire the test session immediately
    await stripe.checkout.sessions.expire(session.id);
    console.log('     (Test session expired)');
  } catch (error: any) {
    results.push({
      test: 'Checkout Session Creation',
      passed: false,
      details: error.message,
    });
    console.log('  ❌ Failed:', error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 TEST SUMMARY\n');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.test}: ${r.passed ? 'PASSED' : 'FAILED'}`);
    if (!r.passed) {
      console.log(`   Details: ${r.details}`);
    }
  });
  
  console.log(`\n${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n🎉 All billing flows are working correctly!');
  } else {
    console.log('\n⚠️ Some tests failed - please review the details above.');
  }
}

runTests().catch(console.error);
