/**
 * Fix missing routing rule for bryan@backstageos.com
 * This creates the webhook routing rule that should have been created automatically
 */

import dotenv from 'dotenv';
dotenv.config();

const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!CLOUDFLARE_ZONE_ID || !CLOUDFLARE_API_TOKEN) {
  console.error('❌ Missing Cloudflare credentials');
  console.error('Required environment variables: CLOUDFLARE_ZONE_ID, CLOUDFLARE_API_TOKEN');
  process.exit(1);
}

async function fixBryanEmailRouting() {
  try {
    console.log('🔧 Creating missing routing rule for bryan@backstageos.com...');
    
    // Create webhook routing rule for bryan@backstageos.com
    const ruleData = {
      matchers: [
        {
          type: "literal",
          field: "to",
          value: "bryan@backstageos.com"
        }
      ],
      actions: [
        {
          type: "forward",
          value: ["webhook-trigger@backstageos.com"]
        }
      ],
      enabled: true,
      name: "Route bryan@backstageos.com to BackstageOS webhook"
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
      console.log('✅ Successfully created routing rule for bryan@backstageos.com');
      console.log('📧 External emails to bryan@backstageos.com will now reach BackstageOS');
      console.log('🎯 Rule ID:', result.result.id);
      
      // Test the setup
      console.log('\n🧪 To test the setup:');
      console.log('1. Send an email to bryan@backstageos.com from any external email');
      console.log('2. Check your BackstageOS inbox');
      console.log('3. The email should appear within seconds');
      
    } else {
      console.error('❌ Failed to create routing rule:', result.errors);
      
      if (result.errors?.[0]?.code === 1004) {
        console.log('\n💡 The address might already have a routing rule');
        console.log('Check your Cloudflare dashboard: Email > Routes');
      }
    }
    
  } catch (error) {
    console.error('❌ Error creating routing rule:', error);
  }
}

fixBryanEmailRouting();