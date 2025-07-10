#!/usr/bin/env node

/**
 * Debug Email Flow for Catch-All System
 * This script tests the complete email routing flow to identify where emails are getting lost
 */

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const CLOUDFLARE_API_EMAIL = process.env.CLOUDFLARE_API_EMAIL;
const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_KEY;

async function makeCloudflareRequest(endpoint, method = 'GET', data = null) {
  const url = `https://api.cloudflare.com/client/v4${endpoint}`;
  let headers = {
    'Content-Type': 'application/json',
  };

  if (CLOUDFLARE_API_TOKEN) {
    headers['Authorization'] = `Bearer ${CLOUDFLARE_API_TOKEN}`;
  } else {
    headers['X-Auth-Email'] = CLOUDFLARE_API_EMAIL;
    headers['X-Auth-Key'] = CLOUDFLARE_API_KEY;
  }

  const options = {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  };

  const response = await fetch(url, options);
  const result = await response.json();

  if (!result.success) {
    throw new Error(`Cloudflare API error: ${result.errors?.[0]?.message || 'Unknown error'}`);
  }

  return result;
}

async function debugEmailFlow() {
  console.log('🔍 Debugging Email Flow for BackstageOS Catch-All System');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Check email routing status
    console.log('\n1️⃣ Checking Email Routing Status...');
    try {
      const status = await makeCloudflareRequest(`/zones/${CLOUDFLARE_ZONE_ID}/email/routing`);
      console.log(`✅ Email routing enabled: ${status.result?.enabled || 'unknown'}`);
      console.log(`📧 Domain: ${status.result?.name || 'unknown'}`);
    } catch (error) {
      console.log(`❌ Could not check routing status: ${error.message}`);
    }

    // Step 2: List all email routing rules
    console.log('\n2️⃣ Checking Email Routing Rules...');
    const rulesResponse = await makeCloudflareRequest(`/zones/${CLOUDFLARE_ZONE_ID}/email/routing/rules`);
    const rules = rulesResponse.result || [];
    
    console.log(`📋 Found ${rules.length} email routing rules:`);
    
    let catchAllFound = false;
    rules.forEach((rule, index) => {
      console.log(`\n   Rule ${index + 1}:`);
      console.log(`   - ID: ${rule.id}`);
      console.log(`   - Name: ${rule.name}`);
      console.log(`   - Enabled: ${rule.enabled}`);
      console.log(`   - Priority: ${rule.priority || 'default'}`);
      
      if (rule.matchers) {
        console.log(`   - Matchers: ${JSON.stringify(rule.matchers, null, 6)}`);
        const hasCatchAll = rule.matchers.some(m => m.type === 'all' || (m.type === 'literal' && m.value.includes('*')));
        if (hasCatchAll) {
          catchAllFound = true;
          console.log(`   🎯 CATCH-ALL RULE FOUND!`);
        }
      }
      
      if (rule.actions) {
        console.log(`   - Actions: ${JSON.stringify(rule.actions, null, 6)}`);
      }
    });

    if (!catchAllFound) {
      console.log(`\n❌ NO CATCH-ALL RULE FOUND! This is likely the problem.`);
    }

    // Step 3: Check Workers
    console.log('\n3️⃣ Checking Cloudflare Workers...');
    try {
      const workersResponse = await makeCloudflareRequest(`/accounts/${CLOUDFLARE_ZONE_ID}/workers/scripts`);
      const workers = workersResponse.result || [];
      console.log(`🔧 Found ${workers.length} workers:`);
      
      workers.forEach(worker => {
        console.log(`   - ${worker.id}: ${worker.modified_on}`);
        if (worker.id.includes('backstage') || worker.id.includes('email')) {
          console.log(`   🎯 EMAIL WORKER FOUND: ${worker.id}`);
        }
      });
    } catch (error) {
      console.log(`⚠️ Could not list workers: ${error.message}`);
    }

    // Step 4: Test webhook endpoint
    console.log('\n4️⃣ Testing Webhook Endpoint...');
    try {
      const testResponse = await fetch('https://backstageos.com/api/email/receive-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'debug@test.com',
          to: 'bryan@backstageos.com',
          subject: 'Debug Test Email',
          text: 'Testing webhook endpoint',
          html: '<p>Testing webhook endpoint</p>'
        })
      });
      
      if (testResponse.ok) {
        const result = await testResponse.json();
        console.log(`✅ Webhook endpoint working: ${result.message}`);
      } else {
        console.log(`❌ Webhook endpoint failed: ${testResponse.status} ${testResponse.statusText}`);
      }
    } catch (error) {
      console.log(`❌ Webhook test failed: ${error.message}`);
    }

    // Step 5: Recommendations
    console.log('\n5️⃣ Diagnosis & Recommendations:');
    console.log('=' .repeat(40));
    
    if (!catchAllFound) {
      console.log('❌ PRIMARY ISSUE: No catch-all rule found in email routing');
      console.log('🔧 SOLUTION: Create catch-all rule in Cloudflare Dashboard:');
      console.log('   1. Go to Email Routing → Rules');
      console.log('   2. Create rule with matcher type "all"');
      console.log('   3. Set action to send to "backstageos" worker');
      console.log('   4. Enable the rule');
    } else {
      console.log('✅ Catch-all rule exists - checking other potential issues...');
      console.log('🔧 POTENTIAL SOLUTIONS:');
      console.log('   1. Verify "backstageos" worker is deployed and working');
      console.log('   2. Check worker logs in Cloudflare Dashboard');
      console.log('   3. Ensure catch-all rule has highest priority');
      console.log('   4. Test with a fresh external email');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugEmailFlow();