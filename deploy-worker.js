#!/usr/bin/env node

/**
 * Deploy Cloudflare Worker for Email Routing
 * This script deploys the email handling code to your "backstageos" worker
 */

import fs from 'fs';

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_EMAIL = process.env.CLOUDFLARE_API_EMAIL;
const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_KEY;

// Worker code using Service Worker format (compatible with Cloudflare)
const WORKER_CODE = fs.readFileSync('cloudflare-worker-compatible.js', 'utf8');

async function makeCloudflareRequest(endpoint, method = 'GET', data = null, isFormData = false) {
  const url = `https://api.cloudflare.com/client/v4${endpoint}`;
  let headers = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (CLOUDFLARE_API_TOKEN) {
    headers['Authorization'] = `Bearer ${CLOUDFLARE_API_TOKEN}`;
  } else {
    headers['X-Auth-Email'] = CLOUDFLARE_API_EMAIL;
    headers['X-Auth-Key'] = CLOUDFLARE_API_KEY;
  }

  const options = {
    method,
    headers,
    body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
  };

  const response = await fetch(url, options);
  const result = await response.json();

  if (!result.success) {
    throw new Error(`Cloudflare API error: ${result.errors?.[0]?.message || 'Unknown error'}`);
  }

  return result;
}

async function deployWorker() {
  console.log('🚀 Deploying BackstageOS Email Worker...');
  
  if (!CLOUDFLARE_API_TOKEN && !CLOUDFLARE_API_KEY) {
    console.error('❌ Missing Cloudflare credentials');
    console.error('Please set CLOUDFLARE_API_TOKEN or both CLOUDFLARE_API_EMAIL and CLOUDFLARE_API_KEY');
    return;
  }

  try {
    // Get account ID if not provided
    let accountId = CLOUDFLARE_ACCOUNT_ID;
    if (!accountId) {
      console.log('🔍 Getting account ID...');
      const accounts = await makeCloudflareRequest('/accounts');
      accountId = accounts.result[0]?.id;
      if (!accountId) {
        throw new Error('Could not find account ID');
      }
      console.log(`📋 Using account ID: ${accountId}`);
    }

    // Deploy worker script
    console.log('📦 Deploying worker script...');
    
    const formData = new FormData();
    formData.append('script', new Blob([WORKER_CODE], { type: 'application/javascript' }), 'worker.js');
    
    // Alternative approach using PUT with script content directly
    const deployResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/backstageos`, {
      method: 'PUT',
      headers: {
        'Authorization': CLOUDFLARE_API_TOKEN ? `Bearer ${CLOUDFLARE_API_TOKEN}` : undefined,
        'X-Auth-Email': CLOUDFLARE_API_EMAIL,
        'X-Auth-Key': CLOUDFLARE_API_KEY,
        'Content-Type': 'application/javascript',
      },
      body: WORKER_CODE
    });

    const deployResult = await deployResponse.json();
    
    if (deployResult.success) {
      console.log('✅ Worker deployed successfully!');
      console.log(`📋 Script ID: ${deployResult.result?.id || 'backstageos'}`);
      
      // Test the deployment
      console.log('\n🧪 Testing worker deployment...');
      const testResponse = await fetch('https://backstageos.com/api/email/receive-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'worker-deploy-test@gmail.com',
          to: 'bryan@backstageos.com',
          subject: 'Worker Deployment Test - ' + new Date().toISOString(),
          text: 'Testing worker after deployment',
          html: '<p>Testing worker after deployment</p>'
        })
      });
      
      if (testResponse.ok) {
        console.log('✅ Test email processed successfully!');
        console.log('\n🎉 DEPLOYMENT COMPLETE!');
        console.log('📧 External emails to bryan@backstageos.com should now work');
        console.log('🔄 Send a test email from Gmail to verify the full flow');
      }
      
    } else {
      console.error('❌ Worker deployment failed:', deployResult.errors?.[0]?.message);
    }

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.error('\n🔧 Manual deployment required:');
    console.error('1. Go to Cloudflare Dashboard → Workers & Pages');
    console.error('2. Click on "backstageos" worker');
    console.error('3. Copy the worker code from cloudflare-email-worker.js');
    console.error('4. Paste it in the worker editor and deploy');
  }
}

deployWorker();