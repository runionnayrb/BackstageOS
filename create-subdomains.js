#!/usr/bin/env node
import 'dotenv/config';

const ZONE_ID = '9cb18bcfe89740bffc69765c29779551';
const API_EMAIL = process.env.CLOUDFLARE_API_EMAIL;
const API_KEY = process.env.CLOUDFLARE_API_KEY;

const subdomains = [
  { name: 'beta', target: 'backstageos.com' },
  { name: 'app', target: 'backstageos.com' },
  { name: 'join', target: 'backstageos.com' }
];

async function createCNAMERecord(name, target) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records`, {
    method: 'POST',
    headers: {
      'X-Auth-Email': API_EMAIL,
      'X-Auth-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'CNAME',
      name: name,
      content: target,
      ttl: 300,
      proxied: false
    })
  });

  const result = await response.json();
  
  if (!response.ok) {
    console.error(`Failed to create ${name}.backstageos.com:`, result.errors);
    return false;
  }
  
  console.log(`✅ Created ${name}.backstageos.com → ${target}`);
  return true;
}

async function main() {
  console.log('Creating subdomain CNAME records...');
  
  for (const subdomain of subdomains) {
    await createCNAMERecord(subdomain.name, subdomain.target);
  }
  
  console.log('Done! All subdomains should now resolve.');
}

main().catch(console.error);