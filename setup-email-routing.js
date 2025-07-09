import fetch from 'node-fetch';

async function setupEmailRouting() {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  
  if (!zoneId || !apiToken) {
    console.error('Missing CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN');
    return;
  }
  
  try {
    // Create routing rule for bryan@backstageos.com to deliver to webhook
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/email/routing/rules`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Direct delivery to BackstageOS for bryan@backstageos.com',
          enabled: true,
          matchers: [
            {
              type: 'literal',
              field: 'to',
              value: 'bryan@backstageos.com'
            }
          ],
          actions: [
            {
              type: 'send',
              value: 'bryan@backstageos.com'
            }
          ]
        })
      }
    );
    
    const result = await response.json();
    console.log('Email routing setup result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Email routing rule created successfully');
    } else {
      console.error('❌ Failed to create email routing rule:', result.errors);
    }
    
  } catch (error) {
    console.error('Error setting up email routing:', error);
  }
}

setupEmailRouting();