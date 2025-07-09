/**
 * Convert existing email forwarding rules to webhook routing for BackstageOS email system
 * This addresses the issue where existing forwarding was set up before the email system
 */

import dotenv from 'dotenv';
dotenv.config();

const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const WEBHOOK_URL = 'https://backstageos.com/api/email/receive-webhook';

if (!CLOUDFLARE_ZONE_ID || !CLOUDFLARE_API_TOKEN) {
  console.error('❌ Missing Cloudflare credentials');
  process.exit(1);
}

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
  try {
    console.log('🔄 Converting forwarding rules to webhook routing...\n');
    
    // Get existing rules
    const existingRules = await makeCloudflareRequest('/email/routing/rules');
    console.log(`📋 Found ${existingRules.length} existing email rules`);
    
    // Find rules that forward to webhook-trigger@backstageos.com
    const forwardingRules = existingRules.filter(rule => 
      rule.actions?.[0]?.value?.includes('webhook-trigger@backstageos.com')
    );
    
    console.log(`🎯 Found ${forwardingRules.length} forwarding rules to convert`);
    
    // Convert each forwarding rule to webhook
    for (const rule of forwardingRules) {
      const originalEmail = rule.matchers?.[0]?.value;
      if (!originalEmail) continue;
      
      console.log(`\n🔧 Converting ${originalEmail}...`);
      
      // Delete the old forwarding rule
      await makeCloudflareRequest(`/email/routing/rules/${rule.id}`, 'DELETE');
      console.log(`   ✅ Deleted forwarding rule`);
      
      // Try self-forwarding approach first
      console.log(`   🔄 Trying self-forwarding approach...`);
      const selfForwardData = {
        matchers: [
          {
            type: "literal",
            field: "to",
            value: originalEmail
          }
        ],
        actions: [
          {
            type: "forward",
            value: [originalEmail] // Forward to itself!
          }
        ],
        enabled: true,
        name: `Self-forward ${originalEmail} for webhook processing`
      };
      
      try {
        const selfForwardRule = await makeCloudflareRequest('/email/routing/rules', 'POST', selfForwardData);
        console.log(`   ✅ Created self-forwarding rule for ${originalEmail}`);
        console.log(`   💡 This may trigger webhook processing automatically`);
        continue;
      } catch (selfForwardError) {
        console.log(`   ❌ Self-forwarding failed: ${selfForwardError.message}`);
      }
      
      // Fallback: Try direct webhook routing
      console.log(`   🔄 Trying direct webhook routing...`);
      const webhookData = {
        matchers: [
          {
            type: "literal",
            field: "to",
            value: originalEmail
          }
        ],
        actions: [
          {
            type: "webhook",
            value: [WEBHOOK_URL]
          }
        ],
        enabled: true,
        name: `Webhook route ${originalEmail} to BackstageOS`
      };
      
      try {
        const webhookRule = await makeCloudflareRequest('/email/routing/rules', 'POST', webhookData);
        console.log(`   ✅ Created direct webhook rule for ${originalEmail}`);
      } catch (webhookError) {
        console.log(`   ❌ Direct webhook failed: ${webhookError.message}`);
        
        // Final fallback: Restore to Gmail forwarding
        console.log(`   🔄 Restoring Gmail forwarding as fallback...`);
        const gmailFallbackData = {
          matchers: [
            {
              type: "literal",
              field: "to",
              value: originalEmail
            }
          ],
          actions: [
            {
              type: "forward",
              value: ["runion.bryan@gmail.com"]
            }
          ],
          enabled: true,
          name: `Fallback Gmail forwarding for ${originalEmail}`
        };
        
        await makeCloudflareRequest('/email/routing/rules', 'POST', gmailFallbackData);
        console.log(`   ✅ Restored Gmail forwarding for ${originalEmail}`);
      }
    }
    
    console.log('\n🎉 Conversion complete!');
    console.log('📧 Test by sending an email to bryan@backstageos.com');
    console.log('🔍 Check both BackstageOS inbox and Gmail for delivery');
    
  } catch (error) {
    console.error('❌ Error during conversion:', error);
  }
}

async function createCatchAllRule() {
  try {
    console.log('\n🎯 Creating catch-all rule for unlimited email addresses...');
    
    const catchAllData = {
      matchers: [
        {
          type: "all"
        }
      ],
      actions: [
        {
          type: "forward", 
          value: ["runion.bryan@gmail.com"] // Safe fallback while testing
        }
      ],
      enabled: false, // Start disabled for safety
      name: "BackstageOS Catch-All (disabled for testing)"
    };
    
    const catchAllRule = await makeCloudflareRequest('/email/routing/rules', 'POST', catchAllData);
    console.log('✅ Created disabled catch-all rule');
    console.log('🔧 Enable this rule once individual addresses are working');
    console.log('📝 Then you can create unlimited @backstageos.com addresses automatically');
    
  } catch (error) {
    console.log('❌ Catch-all rule creation failed:', error.message);
  }
}

// Run both functions
await convertForwardingToWebhook();
await createCatchAllRule();