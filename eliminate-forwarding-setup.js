/**
 * Eliminate email forwarding rules and set up direct webhook routing
 * Since BackstageOS now has a complete email system, forwarding is unnecessary
 */

import dotenv from 'dotenv';
dotenv.config();

const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!CLOUDFLARE_ZONE_ID || !CLOUDFLARE_API_TOKEN) {
  console.error('❌ Missing Cloudflare credentials in .env file');
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

async function eliminateForwardingSetup() {
  try {
    console.log('🔄 Eliminating forwarding setup and creating direct webhook routing...\n');
    
    // Get existing rules
    const existingRules = await makeCloudflareRequest('/email/routing/rules');
    console.log(`📋 Found ${existingRules.length} existing email rules`);
    
    // Delete rules that forward to webhook-trigger@backstageos.com
    const forwardingRules = existingRules.filter(rule => 
      rule.actions?.[0]?.value?.includes('webhook-trigger@backstageos.com')
    );
    
    console.log(`🗑️ Deleting ${forwardingRules.length} forwarding rules...`);
    for (const rule of forwardingRules) {
      await makeCloudflareRequest(`/email/routing/rules/${rule.id}`, 'DELETE');
      console.log(`   ✅ Deleted forwarding rule: ${rule.matchers?.[0]?.value || 'Unknown'}`);
    }
    
    // Create single catch-all webhook rule
    console.log('\n🎯 Creating catch-all webhook rule for direct routing...');
    
    const webhookRuleData = {
      matchers: [
        {
          type: "all"
        }
      ],
      actions: [
        {
          type: "forward",
          value: ["runion.bryan@gmail.com"]  // Temporary fallback while testing webhook
        }
      ],
      enabled: true,
      name: "BackstageOS Catch-All Webhook"
    };

    try {
      const webhookRule = await makeCloudflareRequest('/email/routing/rules', 'POST', webhookRuleData);
      console.log('✅ Created catch-all rule with temporary Gmail fallback');
      console.log('🔧 Next step: Test webhook endpoint, then update rule to use webhook URL');
      
    } catch (webhookError) {
      console.log('❌ Webhook rule creation failed, trying individual address rules...');
      
      // Fallback: Create specific rules for key addresses
      const addresses = ['bryan@backstageos.com', 'admin@backstageos.com', 'test@backstageos.com'];
      
      for (const address of addresses) {
        const addressRuleData = {
          matchers: [
            {
              type: "literal",
              field: "to", 
              value: address
            }
          ],
          actions: [
            {
              type: "forward",
              value: ["runion.bryan@gmail.com"]  // Temporary fallback
            }
          ],
          enabled: true,
          name: `Route ${address} to Gmail (temporary)`
        };
        
        try {
          await makeCloudflareRequest('/email/routing/rules', 'POST', addressRuleData);
          console.log(`✅ Created temporary Gmail rule for ${address}`);
        } catch (error) {
          console.log(`❌ Failed to create rule for ${address}:`, error.message);
        }
      }
    }
    
    console.log('\n🎉 Forwarding elimination complete!');
    console.log('📧 Emails will now be delivered to Gmail temporarily');
    console.log('🔧 Once webhook is confirmed working, we can update rules to use direct webhook routing');
    
  } catch (error) {
    console.error('❌ Error during forwarding elimination:', error);
  }
}

eliminateForwardingSetup();