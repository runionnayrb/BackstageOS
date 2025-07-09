#!/usr/bin/env node

/**
 * Eliminate email forwarding rules and set up direct webhook routing
 * Since BackstageOS now has a complete email system, forwarding is unnecessary
 */

import fetch from 'node-fetch';

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const WEBHOOK_URL = 'https://backstageos.com/api/email/receive-webhook';

async function makeCloudflareRequest(endpoint, method = 'GET', data = null) {
  const url = `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(`Cloudflare API error: ${JSON.stringify(result.errors)}`);
  }
  
  return result.result;
}

async function eliminateForwardingSetup() {
  console.log('🗑️  ELIMINATING EMAIL FORWARDING - Setting up direct BackstageOS delivery');
  
  try {
    // Get current email routing rules
    const rules = await makeCloudflareRequest('/email/routing/rules');
    
    console.log(`📧 Found ${rules.length} existing email routing rules`);
    
    const backstageosRules = rules.filter(rule => {
      const matcher = rule.matchers?.[0];
      return matcher && matcher.field === 'to' && matcher.value.includes('@backstageos.com');
    });
    
    if (backstageosRules.length > 0) {
      console.log(`\n🎯 Found ${backstageosRules.length} @backstageos.com rules to eliminate:`);
      
      for (const rule of backstageosRules) {
        const matcher = rule.matchers[0];
        const action = rule.actions[0];
        
        console.log(`   - ${matcher.value} → ${action.type} → ${action.value}`);
        
        if (action.type === 'forward') {
          console.log(`     ❌ FORWARDING RULE - Will be deleted`);
        } else if (action.type === 'worker' && action.value === WEBHOOK_URL) {
          console.log(`     ✅ Already webhook - Will keep`);
        }
      }
      
      // Delete forwarding rules
      const forwardingRules = backstageosRules.filter(rule => 
        rule.actions[0].type === 'forward'
      );
      
      console.log(`\n🗑️  Deleting ${forwardingRules.length} forwarding rules...`);
      
      for (const rule of forwardingRules) {
        try {
          await makeCloudflareRequest(`/email/routing/rules/${rule.tag}`, 'DELETE');
          console.log(`   ✅ Deleted: ${rule.matchers[0].value}`);
        } catch (error) {
          console.log(`   ❌ Failed to delete ${rule.matchers[0].value}: ${error.message}`);
        }
      }
    }
    
    // Create the catch-all webhook rule
    console.log('\n🎯 Creating catch-all webhook rule for ALL @backstageos.com emails...');
    
    const catchAllRule = {
      name: 'BackstageOS Complete Email System',
      enabled: true,
      matchers: [
        {
          type: 'literal',
          field: 'to',
          value: '*@backstageos.com'
        }
      ],
      actions: [
        {
          type: 'worker',
          value: WEBHOOK_URL
        }
      ]
    };
    
    try {
      await makeCloudflareRequest('/email/routing/rules', 'POST', catchAllRule);
      console.log('✅ SUCCESS! Catch-all webhook rule created');
      console.log('✅ ALL @backstageos.com emails now deliver directly to BackstageOS');
      console.log('✅ No external forwarding - complete email independence');
      console.log('✅ Unlimited email accounts work automatically');
      
    } catch (error) {
      console.log('❌ API limitation - manual setup required:');
      console.log('\n📋 MANUAL STEPS (2 minutes):');
      console.log('1. Go to Cloudflare Dashboard → backstageos.com → Email → Email Routing');
      console.log('2. Delete any existing @backstageos.com forwarding rules');
      console.log('3. Create ONE new rule:');
      console.log('   - Match: *@backstageos.com');
      console.log('   - Action: Send to Worker');
      console.log('   - Destination: https://backstageos.com/api/email/receive-webhook');
      console.log('4. Enable the rule');
      console.log('\n✅ Result: Complete email independence with unlimited accounts');
    }
    
  } catch (error) {
    console.error('❌ Error accessing Cloudflare:', error.message);
    console.log('\n📋 MANUAL ELIMINATION STEPS:');
    console.log('1. Go to Cloudflare Dashboard → backstageos.com → Email → Email Routing');
    console.log('2. DELETE all existing @backstageos.com forwarding rules');
    console.log('3. CREATE ONE catch-all webhook rule:');
    console.log('   - Match: *@backstageos.com');
    console.log('   - Action: Send to Worker');  
    console.log('   - Destination: https://backstageos.com/api/email/receive-webhook');
    console.log('\n✅ This eliminates forwarding and enables complete BackstageOS email independence');
  }
}

eliminateForwardingSetup().catch(console.error);