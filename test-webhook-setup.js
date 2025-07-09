import { CloudflareService } from './server/services/cloudflareService.ts';

async function testWebhookSetup() {
  try {
    const cloudflareService = new CloudflareService();
    
    // Try to create webhook routing for bryan@backstageos.com
    const webhookUrl = 'https://backstageos.com/api/email/receive-webhook';
    const result = await cloudflareService.createWebhookEmailRoute('bryan', webhookUrl);
    
    console.log('✅ Webhook routing created successfully:', result);
  } catch (error) {
    console.error('❌ Failed to create webhook routing:', error);
  }
}

testWebhookSetup();