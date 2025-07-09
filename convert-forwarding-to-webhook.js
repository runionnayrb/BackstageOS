#!/usr/bin/env node

/**
 * Convert existing email forwarding rules to webhook routing for BackstageOS email system
 * This addresses the issue where existing forwarding was set up before the email system
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

async function convertForwardingToWebhook() {
  console.log('🔍 Checking existing email routing rules...');
  
  try {
    // Get current email routing rules
    const rules = await makeCloudflareRequest('/email/routing/rules');
    
    console.log(`📧 Found ${rules.length} existing email routing rules:`);
    
    const backstageosRules = [];
    
    rules.forEach((rule, index) => {
      const matcher = rule.matchers?.[0];
      const action = rule.actions?.[0];
      
      if (matcher && matcher.field === 'to' && matcher.value.includes('@backstageos.com')) {
        console.log(`${index + 1}. ${matcher.value} → ${action.type} → ${action.value}`);
        backstageosRules.push({
          id: rule.tag,
          email: matcher.value,
          currentAction: action.type,
          currentDestination: action.value,
          rule: rule
        });
      }
    });
    
    if (backstageosRules.length === 0) {
      console.log('❌ No @backstageos.com routing rules found');
      console.log('✅ Ready to create catch-all webhook rule');
      await createCatchAllRule();
      return;
    }
    
    console.log(`\n🎯 Found ${backstageosRules.length} @backstageos.com rules to convert:`);
    
    // Check if any are already webhook rules
    const webhookRules = backstageosRules.filter(rule => 
      rule.currentAction === 'worker' || rule.currentDestination === WEBHOOK_URL
    );
    
    const forwardRules = backstageosRules.filter(rule => 
      rule.currentAction === 'forward' || rule.currentAction === 'drop'
    );
    
    if (webhookRules.length > 0) {
      console.log(`✅ ${webhookRules.length} rules already using webhook`);
      webhookRules.forEach(rule => {
        console.log(`   - ${rule.email} (already correct)`);
      });
    }
    
    if (forwardRules.length > 0) {
      console.log(`\n🔄 ${forwardRules.length} rules need conversion from forwarding to webhook:`);
      forwardRules.forEach(rule => {
        console.log(`   - ${rule.email} (currently forwarding to ${rule.currentDestination})`);
      });
      
      console.log('\n⚠️  SOLUTION: Instead of converting individual rules, create ONE catch-all rule');
      console.log('   This will handle ALL @backstageos.com emails automatically');
      
      await createCatchAllRule();
    }
    
  } catch (error) {
    console.error('❌ Error checking routing rules:', error.message);
  }
}

async function createCatchAllRule() {
  console.log('\n🎯 Creating catch-all webhook rule: *@backstageos.com → BackstageOS webhook');
  
  try {
    const ruleData = {
      name: 'BackstageOS Catch-All Webhook Route',
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
    
    console.log('📝 Rule configuration:');
    console.log(`   Match: *@backstageos.com`);
    console.log(`   Action: Send to Worker`);
    console.log(`   Destination: ${WEBHOOK_URL}`);
    
    // Note: This will likely fail due to API limitations, but shows the intended solution
    const result = await makeCloudflareRequest('/email/routing/rules', 'POST', ruleData);
    
    console.log('✅ SUCCESS! Catch-all webhook rule created');
    console.log('✅ ALL @backstageos.com emails will now route to BackstageOS');
    console.log('✅ No manual setup needed for new email accounts');
    
  } catch (error) {
    console.error('❌ API Error (expected):', error.message);
    console.log('\n📋 MANUAL SETUP REQUIRED (Due to Cloudflare API limitation):');
    console.log('1. Go to Cloudflare Dashboard → backstageos.com → Email → Email Routing');
    console.log('2. Click "Create route"');
    console.log('3. Configure exactly:');
    console.log('   - Custom address: *@backstageos.com');
    console.log('   - Action: Send to Worker');
    console.log('   - Destination: https://backstageos.com/api/email/receive-webhook');
    console.log('4. Enable the rule');
    console.log('\n✅ This ONE rule will handle ALL email accounts automatically');
    console.log('✅ Existing forwarding rules can remain (they\'ll be overridden by catch-all)');
  }
}

// Run the conversion
convertForwardingToWebhook().catch(console.error);