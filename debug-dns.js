import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function checkDNSRecords() {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const apiEmail = process.env.CLOUDFLARE_API_EMAIL;
  const apiKey = process.env.CLOUDFLARE_API_KEY;
  
  console.log('Checking DNS records for beta.backstageos.com...');
  console.log('Zone ID:', zoneId);
  console.log('API Email:', apiEmail ? 'SET' : 'NOT SET');
  console.log('API Key:', apiKey ? 'SET' : 'NOT SET');
  
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
      headers: {
        'X-Auth-Email': apiEmail,
        'X-Auth-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      console.error('Failed to fetch DNS records:', data.errors);
      return;
    }
    
    console.log('\nAll DNS records:');
    data.result.forEach(record => {
      console.log(`- ${record.type}: ${record.name} → ${record.content} (Proxied: ${record.proxied})`);
    });
    
    console.log('\nRecords for beta.backstageos.com:');
    const betaRecords = data.result.filter(record => record.name.includes('beta.backstageos.com'));
    if (betaRecords.length === 0) {
      console.log('❌ NO RECORDS FOUND for beta.backstageos.com');
    } else {
      betaRecords.forEach(record => {
        console.log(`✅ ${record.type}: ${record.name} → ${record.content} (Proxied: ${record.proxied})`);
      });
    }
    
  } catch (error) {
    console.error('Error checking DNS records:', error);
  }
}

checkDNSRecords();