#!/usr/bin/env node

/**
 * Automated Catch-All Email Routing Setup
 * This script automatically configures the catch-all webhook rule for unlimited @backstageos.com emails
 */

import { cloudflareService } from './server/services/cloudflareService.js';

async function setupAutomatedCatchAll() {
  console.log('🚀 Setting up automated catch-all email routing...');
  
  try {
    const webhookUrl = 'https://backstageos.com/api/email/receive-webhook';
    
    if (!cloudflareService.isConfigured()) {
      console.error('❌ Cloudflare API not configured');
      console.error('Please set the following environment variables:');
      console.error('- CLOUDFLARE_API_TOKEN');
      console.error('- CLOUDFLARE_ZONE_ID');
      console.error('- CLOUDFLARE_API_EMAIL (optional)');
      console.error('- CLOUDFLARE_API_KEY (optional)');
      process.exit(1);
    }

    console.log('🔧 Ensuring catch-all webhook rule exists...');
    const result = await cloudflareService.ensureCatchAllWebhookRule(webhookUrl);
    
    console.log('✅ SUCCESS! Catch-all email routing configured successfully');
    console.log('📋 Rule details:');
    console.log(`   ID: ${result.id}`);
    console.log(`   Name: ${result.name}`);
    console.log(`   Enabled: ${result.enabled}`);
    console.log(`   Webhook URL: ${webhookUrl}`);
    console.log('');
    console.log('🎉 Email system is now fully automated!');
    console.log('   - ANY email sent to *@backstageos.com will be delivered');
    console.log('   - Users can create unlimited email accounts');
    console.log('   - No manual routing setup ever needed again');
    console.log('');
    console.log('💌 Test by sending an email to bryan@backstageos.com');
    
  } catch (error) {
    console.error('❌ Failed to setup automated catch-all routing:', error.message);
    console.error('');
    console.error('🔧 Manual Setup Required:');
    console.error('1. Go to Cloudflare Dashboard → Your Domain → Email → Email Routing');
    console.error('2. Create a catch-all rule:');
    console.error('   - Match: *@backstageos.com (or "All emails")');
    console.error('   - Action: "Send to Worker"');
    console.error('   - Destination: https://backstageos.com/api/email/receive-webhook');
    console.error('3. Enable the rule');
    console.error('');
    console.error('This will provide unlimited @backstageos.com email addresses automatically.');
  }
}

setupAutomatedCatchAll();