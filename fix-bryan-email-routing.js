/**
 * Fix missing routing rule for bryan@backstageos.com
 * This creates the webhook routing rule that should have been created automatically
 */

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

async function makeCloudflareRequest(endpoint, method = 'GET', data = null) {
  const url = `https://api.cloudflare.com/client/v4${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'application/json',
  };

  const options = {
    method,
    headers,
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(`Cloudflare API error: ${result.errors?.[0]?.message || 'Unknown error'}`);
  }
  
  return result;
}

async function fixBryanEmailRouting() {
  try {
    console.log('🔍 Checking current email routing rules...');
    
    // First, check existing rules
    const existingRules = await makeCloudflareRequest(`/zones/${CLOUDFLARE_ZONE_ID}/email/routing/rules`);
    console.log('Current rules:', existingRules.result.map(r => ({
      id: r.id,
      name: r.name,
      matcher: r.matchers?.[0],
      action: r.actions?.[0]
    })));
    
    // Check if bryan@backstageos.com already has a rule
    const bryanRule = existingRules.result.find(rule => 
      rule.matchers?.[0]?.value === 'bryan@backstageos.com'
    );
    
    if (bryanRule) {
      console.log('✅ bryan@backstageos.com rule already exists:', bryanRule);
      
      // Check if it's routing to webhook
      const action = bryanRule.actions?.[0];
      if (action?.type === 'worker' && action?.value?.includes('backstageos.com/api/email/receive-webhook')) {
        console.log('✅ Rule is correctly configured for webhook routing');
        return;
      } else {
        console.log('⚠️ Rule exists but not configured for webhook routing');
        console.log('Current action:', action);
      }
    } else {
      console.log('❌ No rule found for bryan@backstageos.com');
    }
    
    // Create the missing rule
    console.log('🚀 Creating webhook routing rule for bryan@backstageos.com...');
    
    const ruleData = {
      enabled: true,
      name: "Route bryan@backstageos.com to BackstageOS webhook",
      matchers: [
        {
          field: "to",
          type: "literal", 
          value: "bryan@backstageos.com"
        }
      ],
      actions: [
        {
          type: "worker",
          value: "https://backstageos.com/api/email/receive-webhook"
        }
      ]
    };
    
    const newRule = await makeCloudflareRequest(
      `/zones/${CLOUDFLARE_ZONE_ID}/email/routing/rules`,
      'POST',
      ruleData
    );
    
    console.log('✅ Successfully created email routing rule!');
    console.log('Rule details:', {
      id: newRule.result.id,
      name: newRule.result.name,
      enabled: newRule.result.enabled,
      matcher: newRule.result.matchers?.[0],
      action: newRule.result.actions?.[0]
    });
    
    console.log('🎉 bryan@backstageos.com is now configured to route to BackstageOS webhook!');
    console.log('Test by sending an email to bryan@backstageos.com from any external email account');
    
  } catch (error) {
    console.error('❌ Error fixing Bryan email routing:', error);
    
    // If worker routing isn't available, try catch-all approach
    console.log('🔄 Attempting catch-all approach...');
    
    try {
      const catchAllData = {
        enabled: true,
        name: "Catch-all BackstageOS emails",
        matchers: [
          {
            field: "to",
            type: "literal",
            value: "*@backstageos.com"
          }
        ],
        actions: [
          {
            type: "worker",
            value: "https://backstageos.com/api/email/receive-webhook"
          }
        ]
      };
      
      const catchAllRule = await makeCloudflareRequest(
        `/zones/${CLOUDFLARE_ZONE_ID}/email/routing/rules`,
        'POST',
        catchAllData
      );
      
      console.log('✅ Created catch-all rule as fallback!');
      console.log('Catch-all rule:', catchAllRule.result);
      
    } catch (fallbackError) {
      console.error('❌ Catch-all approach also failed:', fallbackError);
      
      console.log('\n📝 MANUAL SETUP REQUIRED:');
      console.log('1. Go to your Cloudflare dashboard');
      console.log('2. Navigate to backstageos.com → Email → Email Routing → Routes');
      console.log('3. Create a new route:');
      console.log('   - Custom address: bryan@backstageos.com');
      console.log('   - Action: Send to Worker');
      console.log('   - Destination: https://backstageos.com/api/email/receive-webhook');
      console.log('4. Enable the rule');
    }
  }
}

fixBryanEmailRouting();