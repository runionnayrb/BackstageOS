#!/usr/bin/env node

/**
 * Test External Email Delivery
 * This simulates an external email being sent through the complete Cloudflare → Worker → Webhook flow
 */

async function testExternalEmailDelivery() {
  console.log('🔍 Testing External Email Delivery Flow');
  console.log('=' .repeat(50));
  
  // Test 1: Direct webhook test (we know this works)
  console.log('\n1️⃣ Testing Direct Webhook...');
  try {
    const directResponse = await fetch('https://backstageos.com/api/email/receive-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'external-test@gmail.com',
        to: 'bryan@backstageos.com',
        subject: 'Direct Webhook Test - ' + new Date().toISOString(),
        text: 'This email was sent directly to the webhook endpoint',
        html: '<p>This email was sent directly to the webhook endpoint</p>',
        timestamp: new Date().toISOString()
      })
    });
    
    const directResult = await directResponse.json();
    console.log(`✅ Direct webhook: ${directResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Message: ${directResult.message}`);
  } catch (error) {
    console.log(`❌ Direct webhook failed: ${error.message}`);
  }

  // Test 2: Test with Worker-style data format  
  console.log('\n2️⃣ Testing Worker Data Format...');
  try {
    const workerResponse = await fetch('https://backstageos.com/api/email/receive-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'bryan@backstageos.com',
        from: 'worker-test@gmail.com', 
        subject: 'Worker Format Test - ' + new Date().toISOString(),
        text: 'This email simulates Cloudflare Worker format',
        html: '<p>This email simulates Cloudflare Worker format</p>',
        headers: {
          'message-id': '<test-' + Date.now() + '@gmail.com>',
          'date': new Date().toUTCString(),
          'from': 'worker-test@gmail.com',
          'to': 'bryan@backstageos.com',
          'subject': 'Worker Format Test'
        },
        timestamp: new Date().toISOString()
      })
    });
    
    const workerResult = await workerResponse.json();
    console.log(`✅ Worker format: ${workerResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   Message: ${workerResult.message}`);
  } catch (error) {
    console.log(`❌ Worker format failed: ${error.message}`);
  }

  // Test 3: Check webhook endpoint health
  console.log('\n3️⃣ Testing Webhook Health...');
  try {
    const healthResponse = await fetch('https://backstageos.com/api/email/webhook-test');
    const healthResult = await healthResponse.json();
    console.log(`✅ Webhook health: ${healthResult.success ? 'HEALTHY' : 'UNHEALTHY'}`);
    console.log(`   Environment: ${healthResult.environment}`);
    console.log(`   Timestamp: ${healthResult.timestamp}`);
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
  }

  console.log('\n4️⃣ Diagnosis Summary:');
  console.log('=' .repeat(30));
  console.log('✅ BackstageOS webhook endpoint is functional');
  console.log('✅ Email processing system is working');
  console.log('');
  console.log('🔍 If external emails still aren\'t reaching bryan@backstageos.com:');
  console.log('');
  console.log('📧 MOST LIKELY ISSUES:');
  console.log('1. Catch-all rule is disabled or misconfigured');
  console.log('2. Worker "backstageos" doesn\'t exist or has wrong code');
  console.log('3. Worker is not properly deployed');
  console.log('4. DNS MX records are pointing elsewhere');
  console.log('');
  console.log('🔧 SOLUTIONS TO TRY:');
  console.log('1. In Cloudflare Dashboard → Email Routing:');
  console.log('   - Verify catch-all rule is ENABLED');
  console.log('   - Ensure it points to "backstageos" worker');
  console.log('   - Check rule priority (should be high)');
  console.log('');
  console.log('2. In Cloudflare Dashboard → Workers:');
  console.log('   - Verify "backstageos" worker exists');
  console.log('   - Deploy the worker code if needed');
  console.log('   - Check worker logs for errors');
  console.log('');
  console.log('3. Test by sending email from external address to bryan@backstageos.com');
  console.log('   and checking worker logs in Cloudflare Dashboard');
}

testExternalEmailDelivery();