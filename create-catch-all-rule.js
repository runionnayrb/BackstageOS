/**
 * Create catch-all email routing rule for unlimited @backstageos.com addresses
 * This enables ANY email sent to *@backstageos.com to route to BackstageOS
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

async function createCatchAllRule() {
  try {
    console.log('🔍 Checking for existing catch-all rule...');
    
    // First, check existing rules
    const existingRules = await makeCloudflareRequest(`/zones/${CLOUDFLARE_ZONE_ID}/email/routing/rules`);
    
    // Look for existing catch-all rule
    const catchAllRule = existingRules.result.find(rule => 
      rule.matchers?.[0]?.value === '*@backstageos.com' ||
      rule.matchers?.[0]?.value === '*' ||
      rule.name?.toLowerCase().includes('catch-all')
    );
    
    if (catchAllRule) {
      console.log('✅ Found existing catch-all rule:', {
        id: catchAllRule.id,
        name: catchAllRule.name,
        matcher: catchAllRule.matchers?.[0],
        action: catchAllRule.actions?.[0],
        enabled: catchAllRule.enabled
      });
      
      // Check if it's properly configured
      const action = catchAllRule.actions?.[0];
      if (action?.type === 'worker' && action?.value?.includes('backstageos.com')) {
        console.log('✅ Catch-all rule is properly configured for BackstageOS');
        return catchAllRule;
      } else {
        console.log('⚠️ Catch-all rule exists but not configured correctly');
        console.log('Current action:', action);
      }
    } else {
      console.log('❌ No catch-all rule found');
    }
    
    // Create new catch-all rule
    console.log('🚀 Creating catch-all rule for unlimited @backstageos.com addresses...');
    
    const catchAllData = {
      enabled: true,
      name: "BackstageOS Catch-All Email System",
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
    
    const newRule = await makeCloudflareRequest(
      `/zones/${CLOUDFLARE_ZONE_ID}/email/routing/rules`,
      'POST',
      catchAllData
    );
    
    console.log('✅ Successfully created catch-all email rule!');
    console.log('Rule details:', {
      id: newRule.result.id,
      name: newRule.result.name,
      enabled: newRule.result.enabled,
      matcher: newRule.result.matchers?.[0],
      action: newRule.result.actions?.[0]
    });
    
    console.log('🎉 UNLIMITED @backstageos.com EMAIL ADDRESSES NOW AVAILABLE!');
    console.log('');
    console.log('Examples that will work:');
    console.log('- bryan@backstageos.com');
    console.log('- support@backstageos.com');
    console.log('- macbeth-sm@backstageos.com');
    console.log('- team@backstageos.com');
    console.log('- ANY-NAME@backstageos.com');
    console.log('');
    console.log('All emails will automatically route to BackstageOS inbox!');
    
    return newRule.result;
    
  } catch (error) {
    console.error('❌ Error creating catch-all rule:', error);
    
    console.log('\n📝 MANUAL SETUP REQUIRED:');
    console.log('1. Go to your Cloudflare dashboard');
    console.log('2. Navigate to backstageos.com → Email → Email Routing → Routes');
    console.log('3. Create a new route:');
    console.log('   - Custom address: *@backstageos.com');
    console.log('   - Action: Send to Worker');
    console.log('   - Destination: https://backstageos.com/api/email/receive-webhook');
    console.log('   - Name: BackstageOS Catch-All Email System');
    console.log('4. Enable the rule');
    console.log('');
    console.log('This will enable unlimited @backstageos.com email addresses!');
  }
}

createCatchAllRule();