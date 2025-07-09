// Cloudflare Email Worker Script
// This script should be deployed as a Cloudflare Worker to handle email routing

export default {
  async email(message, env, ctx) {
    // Forward the email to BackstageOS webhook
    const webhookUrl = 'https://backstageos.com/api/email/receive-webhook';
    
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