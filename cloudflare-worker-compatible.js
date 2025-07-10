// Cloudflare Email Worker Script - Service Worker Format
// This script should be deployed as a Cloudflare Worker to handle email routing

addEventListener('email', event => {
  event.waitUntil(handleEmail(event.message, event.env, event.ctx));
});

async function handleEmail(message, env, ctx) {
  console.log('📧 Email received:', message.to);
  console.log('🔍 Message object keys:', Object.keys(message));
  
  // Forward the email to BackstageOS webhook
  const webhookUrl = 'https://backstageos.com/api/email/receive-webhook';
  
  try {
    // Convert the email message to the format BackstageOS expects
    const emailData = {
      to: message.to,
      from: message.from,
      subject: message.headers.get('subject'),
      text: message.text || '',
      html: message.html || '',
      headers: Object.fromEntries(message.headers),
      timestamp: new Date().toISOString()
    };

    console.log('🔄 Forwarding to BackstageOS webhook...');
    console.log('📧 Email data:', JSON.stringify(emailData, null, 2));

    // Send to BackstageOS webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Email successfully forwarded to BackstageOS:', result.message);
    } else {
      console.error('❌ Failed to forward email:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }
  } catch (error) {
    console.error('💥 Error processing email:', error.message);
    console.error('Stack:', error.stack);
  }
}