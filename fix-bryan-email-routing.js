#!/usr/bin/env node

/**
 * Fix missing routing rule for bryan@backstageos.com
 * This creates the webhook routing rule that should have been created automatically
 */

import { cloudflareService } from './server/services/cloudflareService.js';

async function fixBryanEmailRouting() {
  console.log('🔧 Creating missing routing rule for bryan@backstageos.com...');
  
  try {
    
    // Create webhook routing rule for bryan@backstageos.com
    const webhookUrl = 'https://backstageos.com/api/email/receive-webhook';
    const emailAlias = 'bryan'; // Just the part before @
    
    console.log(`Creating webhook route: ${emailAlias}@backstageos.com → ${webhookUrl}`);
    
    const result = await cloudflareService.createWebhookEmailRoute(emailAlias, webhookUrl);
    
    console.log('✅ Success! Routing rule created:', result);
    console.log(`✅ bryan@backstageos.com will now route to BackstageOS webhook`);
    console.log('✅ The email system should now work end-to-end!');
    
  } catch (error) {
    console.error('❌ Failed to create routing rule:', error);
    console.error('Error details:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('✅ Routing rule already exists - this is good!');
      console.log('✅ bryan@backstageos.com should already work');
    } else {
      console.log('\n🔍 To manually fix this:');
      console.log('1. Go to Cloudflare Dashboard → Email Routing');
      console.log('2. Create a new route with:');
      console.log('   - Match: bryan@backstageos.com');
      console.log('   - Action: Send to Worker');
      console.log('   - Worker: https://backstageos.com/api/email/receive-webhook');
    }
  }
}

fixBryanEmailRouting();