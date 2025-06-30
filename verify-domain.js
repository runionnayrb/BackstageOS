#!/usr/bin/env node

import https from 'https';

const DOMAIN = 'backstageos.com';
const EXPECTED_PATHS = ['/api/user', '/signin', '/landing'];

async function testEndpoint(hostname, path) {
  return new Promise((resolve) => {
    const options = {
      hostname,
      path,
      method: 'GET',
      timeout: 5000,
      headers: {
        'User-Agent': 'Domain-Verification/1.0'
      }
    };

    const req = https.request(options, (res) => {
      resolve({
        path,
        status: res.statusCode,
        headers: Object.fromEntries(Object.entries(res.headers).filter(([k]) => 
          ['server', 'x-powered-by', 'replit-cluster'].includes(k)
        ))
      });
    });

    req.on('error', (error) => {
      resolve({ path, error: error.message });
    });

    req.on('timeout', () => {
      resolve({ path, error: 'timeout' });
    });

    req.end();
  });
}

async function verifyDomain() {
  console.log(`🔍 Verifying ${DOMAIN} deployment...`);
  
  const results = await Promise.all(
    EXPECTED_PATHS.map(path => testEndpoint(DOMAIN, path))
  );

  console.log('\n📊 Results:');
  results.forEach(result => {
    if (result.error) {
      console.log(`❌ ${result.path}: ${result.error}`);
    } else {
      const indicator = result.status < 400 ? '✅' : result.status === 404 ? '⚠️' : '❌';
      console.log(`${indicator} ${result.path}: ${result.status}`);
      if (result.headers['replit-cluster']) {
        console.log(`   🖥️  Replit cluster: ${result.headers['replit-cluster']}`);
      }
    }
  });

  const hasErrors = results.some(r => r.error);
  const hasReplit = results.some(r => r.headers && r.headers['replit-cluster']);
  
  console.log('\n🎯 Summary:');
  if (hasReplit) {
    console.log('✅ Domain reaches Replit servers');
  } else {
    console.log('❌ Domain not reaching Replit');
  }
  
  if (!hasErrors && results.every(r => r.status && r.status < 500)) {
    console.log('✅ Application responding correctly');
  } else if (results.some(r => r.status === 404)) {
    console.log('⚠️  Application deployed but needs domain connection');
  } else {
    console.log('❌ Application not responding');
  }
}

verifyDomain().catch(console.error);