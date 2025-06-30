#!/usr/bin/env node

async function testEndpoint(hostname, path) {
  try {
    const response = await fetch(`https://${hostname}${path}`, {
      headers: {
        'Host': hostname,
        'User-Agent': 'Domain-Test/1.0'
      }
    });
    
    console.log(`${hostname}${path} -> ${response.status} ${response.statusText}`);
    return response.status;
  } catch (error) {
    console.log(`${hostname}${path} -> ERROR: ${error.message}`);
    return 0;
  }
}

async function verifyDomain() {
  console.log('Testing deployed app on Replit URL...');
  
  // Test the deployed Replit app first
  await testEndpoint('backstageos.replit.app', '/');
  await testEndpoint('backstageos.replit.app', '/landing');
  
  console.log('\nTesting custom domains...');
  
  // Test custom domains
  await testEndpoint('backstageos.com', '/');
  await testEndpoint('beta.backstageos.com', '/');
  
  console.log('\nIf Replit URL works but custom domains don\'t, you need to configure custom domains in your Replit deployment settings.');
}

verifyDomain().catch(console.error);