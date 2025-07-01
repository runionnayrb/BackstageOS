import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function fixBetaDomain() {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const apiEmail = process.env.CLOUDFLARE_API_EMAIL;
  const apiKey = process.env.CLOUDFLARE_API_KEY;
  
  console.log('Fixing beta.backstageos.com CNAME record...');
  
  try {
    // First, get the current CNAME record for beta.backstageos.com
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?name=beta.backstageos.com&type=CNAME`, {
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
    
    if (data.result.length === 0) {
      console.log('No CNAME record found for beta.backstageos.com');
      return;
    }
    
    const cnameRecord = data.result[0];
    console.log(`Current CNAME: ${cnameRecord.name} → ${cnameRecord.content}`);
    
    // The issue is that it's pointing to the dev URL instead of production
    // For Replit deployments, we need to point to the production deployment
    // Let's try updating it to point to the same target as the main domain
    // Since the main domain uses an A record to 34.111.179.208, that's the production IP
    
    // Actually, for subdomains in Replit deployments, we should delete the CNAME 
    // and create an A record pointing to the same IP as the main domain
    
    console.log('Deleting current CNAME record...');
    const deleteResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${cnameRecord.id}`, {
      method: 'DELETE',
      headers: {
        'X-Auth-Email': apiEmail,
        'X-Auth-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    const deleteData = await deleteResponse.json();
    if (!deleteData.success) {
      console.error('Failed to delete CNAME record:', deleteData.errors);
      return;
    }
    
    console.log('✅ CNAME record deleted');
    
    // Create new A record pointing to the same IP as main domain
    console.log('Creating A record for beta.backstageos.com...');
    const createResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
      method: 'POST',
      headers: {
        'X-Auth-Email': apiEmail,
        'X-Auth-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'A',
        name: 'beta.backstageos.com',
        content: '34.111.179.208', // Same IP as main domain
        ttl: 1, // Auto
        proxied: false // Don't proxy for initial verification
      })
    });
    
    const createData = await createResponse.json();
    if (!createData.success) {
      console.error('Failed to create A record:', createData.errors);
      return;
    }
    
    console.log('✅ A record created for beta.backstageos.com → 34.111.179.208');
    console.log('Replit should now be able to verify the domain');
    
  } catch (error) {
    console.error('Error fixing beta domain:', error);
  }
}

fixBetaDomain();