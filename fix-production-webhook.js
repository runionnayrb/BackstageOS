/**
 * Fix production webhook routing issue
 * 
 * The issue is that the production server at backstageos.com is serving static HTML
 * for all routes instead of hitting the Express API routes. This is a deployment
 * configuration issue where the catch-all static file serving is overriding API routes.
 * 
 * This script provides a workaround by:
 * 1. Testing different webhook endpoints to find one that works
 * 2. Updating the Cloudflare Worker to use the working endpoint
 * 3. Providing deployment instructions for fixing the root cause
 */

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ZONE_ID || !CLOUDFLARE_ACCOUNT_ID) {
  console.error('❌ Missing required environment variables:');
  console.error('   - CLOUDFLARE_API_TOKEN');
  console.error('   - CLOUDFLARE_ZONE_ID');
  console.error('   - CLOUDFLARE_ACCOUNT_ID');
  console.error('');
  console.error('Please set these environment variables and try again.');
  process.exit(1);
}

async function makeCloudflareRequest(endpoint, method = 'GET', data = null) {
  const url = `https://api.cloudflare.com/client/v4${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'application/json',
  };

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

async function testWebhookEndpoint(endpoint) {
  try {
    const testData = {
      to: "bryan@backstageos.com",
      from: "test@external.com",
      subject: "Test Webhook",
      text: "Testing webhook endpoint",
      html: "<p>Testing webhook endpoint</p>",
      headers: {
        "message-id": "<test@external.com>"
      },
      timestamp: new Date().toISOString()
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cloudflare-Worker',
      },
      body: JSON.stringify(testData)
    });

    const contentType = response.headers.get('content-type');
    const responseText = await response.text();
    
    console.log(`📧 Testing ${endpoint}:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${contentType}`);
    console.log(`   Response: ${responseText.substring(0, 100)}...`);
    
    // Check if it's a JSON response (success) or HTML (failure)
    return contentType?.includes('application/json') && response.status === 200;
  } catch (error) {
    console.error(`❌ Error testing ${endpoint}:`, error.message);
    return false;
  }
}

async function updateCloudflareWorker(webhookUrl) {
  try {
    console.log('📝 Updating Cloudflare Worker with new webhook URL...');
    
    // Updated worker script with new webhook URL
    const workerScript = `
// Cloudflare Email Worker Script
// This script handles email routing for BackstageOS

export default {
  async email(message, env, ctx) {
    // Forward the email to BackstageOS webhook
    const webhookUrl = '${webhookUrl}';
    
    try {
      // Convert the email message to the format BackstageOS expects
      const emailData = {
        to: message.to,
        from: message.from,
        subject: await message.headers.get('subject'),
        text: await message.text(),
        html: await message.html(),
        headers: Object.fromEntries(message.headers.entries()),
        timestamp: new Date().toISOString()
      };

      // Send to BackstageOS webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      if (response.ok) {
        console.log('Email successfully forwarded to BackstageOS');
      } else {
        console.error('Failed to forward email:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error processing email:', error);
    }
  }
}
`;

    // Find the worker
    const workersResponse = await makeCloudflareRequest(`/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts`);
    const workers = workersResponse.result;
    
    const backstageWorker = workers.find(w => w.id === 'backstageos' || w.id.includes('backstage'));
    
    if (!backstageWorker) {
      console.error('❌ Could not find BackstageOS worker');
      return false;
    }

    // Update the worker script
    const updateResponse = await makeCloudflareRequest(
      `/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${backstageWorker.id}`,
      'PUT',
      { script: workerScript }
    );

    console.log('✅ Cloudflare Worker updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error updating Cloudflare Worker:', error);
    return false;
  }
}

async function main() {
  console.log('🔧 BackstageOS Production Webhook Fix');
  console.log('=====================================');
  console.log('');
  
  // Test various webhook endpoints to find one that works
  const testEndpoints = [
    'https://backstageos.com/api/email/receive-webhook',
    'https://backstageos.com/email-webhook',
    'https://backstageos.com/webhook/email',
    'https://backstageos.com/api/webhook/email',
    'https://backstageos.com/receive-email',
    'https://backstageos.com/cloudflare-email'
  ];

  console.log('🧪 Testing webhook endpoints...');
  console.log('');

  let workingEndpoint = null;

  for (const endpoint of testEndpoints) {
    const works = await testWebhookEndpoint(endpoint);
    if (works) {
      workingEndpoint = endpoint;
      console.log(`✅ Found working endpoint: ${endpoint}`);
      break;
    }
  }

  if (!workingEndpoint) {
    console.log('❌ No working webhook endpoint found');
    console.log('');
    console.log('ROOT CAUSE: Production server routing is broken');
    console.log('');
    console.log('The issue is that the static file serving in production is overriding');
    console.log('all API routes. This is a deployment configuration problem.');
    console.log('');
    console.log('SOLUTION: Fix the production server configuration to ensure API routes');
    console.log('are registered before static file serving middleware.');
    console.log('');
    console.log('IMMEDIATE WORKAROUND: Deploy the app to a working domain or subdomain');
    console.log('where the API routes function correctly.');
    return;
  }

  console.log('');
  console.log('📧 Updating Cloudflare Worker to use working endpoint...');
  
  const updated = await updateCloudflareWorker(workingEndpoint);
  
  if (updated) {
    console.log('');
    console.log('✅ SUCCESS: Webhook routing fixed!');
    console.log(`📧 Emails will now be forwarded to: ${workingEndpoint}`);
    console.log('');
    console.log('🧪 Test by sending an email to bryan@backstageos.com');
    console.log('   It should now appear in your BackstageOS inbox.');
  } else {
    console.log('❌ Failed to update Cloudflare Worker');
  }
}

main().catch(console.error);