/**
 * Create individual email routing rules for BackstageOS email system
 * This creates specific routing rules without requiring Cloudflare Workers
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const CLOUDFLARE_API_EMAIL = process.env.CLOUDFLARE_API_EMAIL;
const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_KEY;
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const WEBHOOK_URL = 'https://backstageos.com/api/email/receive-webhook';

// Email addresses to create routing rules for
const EMAIL_ADDRESSES = [
  'bryan@backstageos.com',
  'admin@backstageos.com',
  'test@backstageos.com',
  'demo@backstageos.com',
  'staging@backstageos.com'
];

async function makeCloudflareRequest(endpoint, method = 'GET', data = null) {
  const url = `https://api.cloudflare.com/client/v4${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Email': CLOUDFLARE_API_EMAIL,
      'X-Auth-Key': CLOUDFLARE_API_KEY,
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  console.log(`🌐 Making ${method} request to: ${endpoint}`);
  
  const response = await fetch(url, options);
  const result = await response.json();

  if (!result.success) {
    console.error('❌ Cloudflare API Error:', result.errors);
    throw new Error(`Cloudflare API Error: ${JSON.stringify(result.errors)}`);
  }

  return result;
}

async function checkExistingRules() {
  console.log('\n📋 Checking existing email routing rules...');
  
  try {
    const response = await makeCloudflareRequest(`/zones/${CLOUDFLARE_ZONE_ID}/email/routing/rules`);
    const rules = response.result || [];
    
    console.log(`Found ${rules.length} existing email routing rules:`);
    
    rules.forEach((rule, index) => {
      const matcher = rule.matchers?.[0];
      const action = rule.actions?.[0];
      
      console.log(`  ${index + 1}. ${matcher?.field}: ${matcher?.value} → ${action?.type}: ${action?.value?.[0] || 'N/A'}`);
    });
    
    return rules;
  } catch (error) {
    console.error('❌ Error checking existing rules:', error.message);
    return [];
  }
}

async function createWebhookRoutingRule(emailAddress) {
  console.log(`\n🔧 Creating webhook routing rule for: ${emailAddress}`);
  
  try {
    const ruleData = {
      enabled: true,
      matchers: [
        {
          field: "to",
          type: "literal",
          value: emailAddress
        }
      ],
      actions: [
        {
          type: "forward",
          value: [WEBHOOK_URL]
        }
      ]
    };

    const response = await makeCloudflareRequest(
      `/zones/${CLOUDFLARE_ZONE_ID}/email/routing/rules`,
      'POST',
      ruleData
    );

    console.log(`✅ Created routing rule for ${emailAddress}`);
    return response.result;
    
  } catch (error) {
    console.error(`❌ Failed to create rule for ${emailAddress}:`, error.message);
    
    // If webhook routing isn't supported, try forwarding to a trigger email
    console.log(`🔄 Trying alternative forwarding approach...`);
    
    try {
      const fallbackData = {
        enabled: true,
        matchers: [
          {
            field: "to", 
            type: "literal",
            value: emailAddress
          }
        ],
        actions: [
          {
            type: "forward",
            value: ["webhook-trigger@backstageos.com"]
          }
        ]
      };

      const fallbackResponse = await makeCloudflareRequest(
        `/zones/${CLOUDFLARE_ZONE_ID}/email/routing/rules`,
        'POST', 
        fallbackData
      );

      console.log(`✅ Created fallback forwarding rule for ${emailAddress} → webhook-trigger@backstageos.com`);
      return fallbackResponse.result;
      
    } catch (fallbackError) {
      console.error(`❌ Fallback also failed for ${emailAddress}:`, fallbackError.message);
      throw fallbackError;
    }
  }
}

async function deleteConflictingRules() {
  console.log('\n🗑️  Checking for conflicting forwarding rules to delete...');
  
  const existingRules = await checkExistingRules();
  
  // Find rules that forward @backstageos.com emails to external services
  const conflictingRules = existingRules.filter(rule => {
    const matcher = rule.matchers?.[0];
    const action = rule.actions?.[0];
    
    // Look for forwarding rules to external email addresses (not our webhook)
    const isBackstageOSEmail = matcher?.value?.includes('@backstageos.com');
    const isForwardingAction = action?.type === 'forward';
    const isExternalForward = action?.value?.[0] && 
                             !action.value[0].includes('backstageos.com') && 
                             !action.value[0].includes('webhook');
    
    return isBackstageOSEmail && isForwardingAction && isExternalForward;
  });
  
  console.log(`Found ${conflictingRules.length} conflicting forwarding rules`);
  
  for (const rule of conflictingRules) {
    try {
      const matcher = rule.matchers?.[0];
      const action = rule.actions?.[0];
      
      console.log(`🗑️  Deleting conflicting rule: ${matcher?.value} → ${action?.value?.[0]}`);
      
      await makeCloudflareRequest(
        `/zones/${CLOUDFLARE_ZONE_ID}/email/routing/rules/${rule.tag}`,
        'DELETE'
      );
      
      console.log(`✅ Deleted conflicting rule for ${matcher?.value}`);
      
    } catch (error) {
      console.error(`❌ Failed to delete rule ${rule.tag}:`, error.message);
    }
  }
}

async function createEmailRoutingRules() {
  console.log('🚀 Starting BackstageOS Email Routing Setup');
  console.log('==========================================');
  
  if (!CLOUDFLARE_API_EMAIL || !CLOUDFLARE_API_KEY || !CLOUDFLARE_ZONE_ID) {
    console.error('❌ Missing required Cloudflare credentials');
    console.error('Please ensure these environment variables are set:');
    console.error('- CLOUDFLARE_API_EMAIL');
    console.error('- CLOUDFLARE_API_KEY'); 
    console.error('- CLOUDFLARE_ZONE_ID');
    process.exit(1);
  }

  try {
    // Step 1: Check existing rules
    await checkExistingRules();
    
    // Step 2: Delete conflicting external forwarding rules  
    await deleteConflictingRules();
    
    // Step 3: Create webhook routing rules for each email address
    console.log('\n📧 Creating webhook routing rules...');
    
    const results = [];
    for (const emailAddress of EMAIL_ADDRESSES) {
      try {
        const result = await createWebhookRoutingRule(emailAddress);
        results.push({ email: emailAddress, success: true, rule: result });
      } catch (error) {
        results.push({ email: emailAddress, success: false, error: error.message });
      }
    }
    
    // Step 4: Summary
    console.log('\n📊 SETUP SUMMARY');
    console.log('================');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Successfully created: ${successful.length} routing rules`);
    successful.forEach(r => console.log(`   - ${r.email}`));
    
    if (failed.length > 0) {
      console.log(`❌ Failed to create: ${failed.length} routing rules`);
      failed.forEach(r => console.log(`   - ${r.email}: ${r.error}`));
    }
    
    console.log('\n🎉 Email routing setup completed!');
    console.log('\n🧪 Test by sending an email to any of the configured addresses.');
    console.log('📨 Emails should now appear in your BackstageOS inbox.');
    
    // Step 5: Final verification
    await checkExistingRules();
    
  } catch (error) {
    console.error('\n💥 Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
createEmailRoutingRules();