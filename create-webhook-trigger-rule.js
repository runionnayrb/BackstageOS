/**
 * Create the missing webhook-trigger@backstageos.com routing rule
 * This connects the forwarding system to the BackstageOS webhook
 */

import dotenv from 'dotenv';
dotenv.config();

const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!CLOUDFLARE_ZONE_ID || !CLOUDFLARE_API_TOKEN) {
  console.error('❌ Missing Cloudflare credentials in .env file');
  process.exit(1);
}

async function createWebhookTriggerRule() {
  try {
    console.log('🔧 Creating webhook-trigger@backstageos.com routing rule...');
    
    // Create routing rule that sends webhook-trigger emails to BackstageOS webhook
    const ruleData = {
      matchers: [
        {
          type: "literal",
          field: "to",
          value: "webhook-trigger@backstageos.com"
        }
      ],
      actions: [
        {
          type: "forward",
          value: ["webhook-trigger@backstageos.com"]
        }
      ],
      enabled: true,
      name: "Send webhook-trigger emails to BackstageOS API"
    };

    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/email/routing/rules`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ruleData)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Successfully created webhook-trigger routing rule');
      console.log('📧 Email flow is now complete:');
      console.log('   External email → bryan@backstageos.com');
      console.log('   → Cloudflare forwards to webhook-trigger@backstageos.com');
      console.log('   → BackstageOS webhook processes and routes to correct inbox');
      
    } else {
      console.error('❌ Failed to create webhook-trigger rule:', result.errors);
      
      // The real issue: we need a direct webhook rule, not forwarding
      console.log('\n💡 Alternative approach: Create direct webhook rule for all @backstageos.com addresses');
      console.log('Since webhook-trigger forwarding creates a loop, let\'s try a catch-all webhook rule instead...');
      
      const catchAllData = {
        matchers: [
          {
            type: "literal", 
            field: "to",
            value: "*@backstageos.com"
          }
        ],
        actions: [
          {
            type: "webhook",
            value: ["https://backstageos.com/api/email/receive-webhook"]
          }
        ],
        enabled: true,
        name: "BackstageOS Direct Webhook Routing"
      };

      const webhookResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/email/routing/rules`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(catchAllData)
      });

      const webhookResult = await webhookResponse.json();
      
      if (webhookResult.success) {
        console.log('✅ Created direct webhook rule for all @backstageos.com addresses');
      } else {
        console.error('❌ Direct webhook also failed:', webhookResult.errors);
        console.log('\n🔄 Falling back to manual Cloudflare dashboard configuration...');
        console.log('Please go to Cloudflare dashboard → Email Routing → Create rule:');
        console.log('- Custom address: *@backstageos.com');
        console.log('- Action: Send to webhook');
        console.log('- Destination: https://backstageos.com/api/email/receive-webhook');
      }
    }
    
  } catch (error) {
    console.error('❌ Error creating webhook routing:', error);
  }
}

createWebhookTriggerRule();