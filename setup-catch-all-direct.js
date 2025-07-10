#!/usr/bin/env node

/**
 * Direct Cloudflare API Setup for Catch-All Email Routing
 * This script directly calls Cloudflare API to configure unlimited @backstageos.com email routing
 */

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const CLOUDFLARE_API_EMAIL = process.env.CLOUDFLARE_API_EMAIL;
const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_KEY;

if (!CLOUDFLARE_API_TOKEN && !CLOUDFLARE_API_KEY) {
  console.error('❌ Missing Cloudflare credentials');
  console.error('Please set CLOUDFLARE_API_TOKEN or both CLOUDFLARE_API_EMAIL and CLOUDFLARE_API_KEY');
  process.exit(1);
}

if (!CLOUDFLARE_ZONE_ID) {
  console.error('❌ Missing CLOUDFLARE_ZONE_ID');
  process.exit(1);
}

async function makeCloudflareRequest(endpoint, method = 'GET', data = null) {
  const url = `https://api.cloudflare.com/client/v4${endpoint}`;
  let headers = {
    'Content-Type': 'application/json',
  };

  // Use token auth if available, otherwise use API key
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

async function setupCatchAllRule() {
  console.log('🚀 Setting up catch-all email routing for unlimited @backstageos.com addresses...');
  
  try {
    const webhookUrl = 'https://backstageos.com/api/email/receive-webhook';
    
    // First, check if email routing is enabled
    console.log('📋 Checking email routing status...');
    try {
      const status = await makeCloudflareRequest(`/zones/${CLOUDFLARE_ZONE_ID}/email/routing`);
      if (!status.result?.enabled) {
        console.log('🔧 Enabling email routing...');
        await makeCloudflareRequest(`/zones/${CLOUDFLARE_ZONE_ID}/email/routing/enable`, 'POST');
      }
    } catch (error) {
      console.log('⚠️ Could not check routing status, continuing...');
    }

    // Get existing rules to check for catch-all
    console.log('🔍 Checking for existing catch-all rules...');
    const rulesResponse = await makeCloudflareRequest(`/zones/${CLOUDFLARE_ZONE_ID}/email/routing/rules`);
    const existingRules = rulesResponse.result || [];
    
    // Check if catch-all webhook rule already exists
    const catchAllRule = existingRules.find(rule => {
      const hasCatchAllMatcher = rule.matchers?.some(matcher => 
        matcher.type === 'all' || 
        (matcher.type === 'literal' && matcher.value === '*@backstageos.com')
      );
      const hasWebhookAction = rule.actions?.some(action => 
        action.type === 'send' || action.type === 'worker'
      );
      return hasCatchAllMatcher && hasWebhookAction;
    });

    if (catchAllRule) {
      console.log('✅ Catch-all webhook rule already exists!');
      console.log(`   Rule ID: ${catchAllRule.id}`);
      console.log(`   Name: ${catchAllRule.name}`);
      console.log(`   Enabled: ${catchAllRule.enabled}`);
      console.log('🎉 Email system already configured for unlimited addresses!');
      return;
    }

    console.log('🚀 Creating catch-all webhook rule...');
    
    // Try different rule configurations
    const ruleConfigurations = [
      // Configuration 1: Use 'send' action with destinations array
      {
        name: 'BackstageOS Catch-All Webhook Route',
        enabled: true,
        matchers: [{ type: 'all' }],
        actions: [{ 
          type: 'send', 
          destinations: [webhookUrl] 
        }],
        priority: 1000
      },
      // Configuration 2: Use 'worker' action
      {
        name: 'BackstageOS Catch-All Worker Route', 
        enabled: true,
        matchers: [{ type: 'all' }],
        actions: [{ 
          type: 'worker', 
          value: webhookUrl 
        }],
        priority: 1000
      },
      // Configuration 3: Literal match for *@backstageos.com
      {
        name: 'BackstageOS Domain Catch-All',
        enabled: true,
        matchers: [{
          type: 'literal',
          field: 'to',
          value: '*@backstageos.com'
        }],
        actions: [{ 
          type: 'send', 
          destinations: [webhookUrl] 
        }],
        priority: 1000
      }
    ];

    let createdRule = null;
    for (const [index, config] of ruleConfigurations.entries()) {
      try {
        console.log(`🔧 Trying configuration ${index + 1}...`);
        const response = await makeCloudflareRequest(
          `/zones/${CLOUDFLARE_ZONE_ID}/email/routing/rules`,
          'POST',
          config
        );
        createdRule = response.result;
        console.log(`✅ Successfully created rule with configuration ${index + 1}!`);
        break;
      } catch (error) {
        console.log(`❌ Configuration ${index + 1} failed: ${error.message}`);
        if (index === ruleConfigurations.length - 1) {
          throw error;
        }
      }
    }

    if (createdRule) {
      console.log('🎉 SUCCESS! Catch-all email routing configured successfully!');
      console.log('📋 Rule details:');
      console.log(`   ID: ${createdRule.id}`);
      console.log(`   Name: ${createdRule.name}`);
      console.log(`   Enabled: ${createdRule.enabled}`);
      console.log(`   Webhook URL: ${webhookUrl}`);
      console.log('');
      console.log('✨ Email system is now fully automated!');
      console.log('   - ANY email sent to *@backstageos.com will be delivered instantly');
      console.log('   - Users can create unlimited email accounts without setup');
      console.log('   - bryan@backstageos.com will now receive external emails');
      console.log('   - test-user@backstageos.com will work automatically');
      console.log('   - stage-manager@backstageos.com will work automatically');
      console.log('');
      console.log('💌 Test by sending an email to bryan@backstageos.com from Gmail');
    }
    
  } catch (error) {
    console.error('❌ Automated setup failed:', error.message);
    console.error('');
    console.error('🔧 Manual Setup Instructions:');
    console.error('1. Go to Cloudflare Dashboard → backstageos.com → Email → Email Routing');
    console.error('2. Click "Create route"');
    console.error('3. Configure the route:');
    console.error('   - Custom address: *@backstageos.com (or select "All emails")');
    console.error('   - Action: "Send to Worker" or "Send to webhook"');
    console.error('   - Destination: https://backstageos.com/api/email/receive-webhook');
    console.error('   - Enable the rule');
    console.error('');
    console.error('This will provide unlimited @backstageos.com email addresses automatically.');
  }
}

setupCatchAllRule();