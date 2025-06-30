#!/usr/bin/env node
import 'dotenv/config';

const ZONE_ID = '9cb18bcfe89740bffc69765c29779551';
const API_EMAIL = process.env.CLOUDFLARE_API_EMAIL;
const API_KEY = process.env.CLOUDFLARE_API_KEY;

async function updateDNS() {
  console.log('Fixing DNS configuration for Replit deployment...');
  
  try {
    // First, get all DNS records to find the A records for backstageos.com
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records`, {
      headers: {
        'X-Auth-Email': API_EMAIL,
        'X-Auth-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      console.error('Failed to fetch DNS records:', data.errors);
      return;
    }
    
    console.log('Current DNS records:');
    data.result.forEach(record => {
      if (record.name === 'backstageos.com') {
        console.log(`- ${record.type}: ${record.name} → ${record.content}`);
      }
    });
    
    // Find A records for the root domain
    const aRecords = data.result.filter(record => 
      record.name === 'backstageos.com' && record.type === 'A'
    );
    
    if (aRecords.length > 0) {
      console.log(`\nFound ${aRecords.length} A record(s) that need to be converted to CNAME...`);
      
      // Delete existing A records
      for (const record of aRecords) {
        console.log(`Deleting A record: ${record.content}`);
        await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${record.id}`, {
          method: 'DELETE',
          headers: {
            'X-Auth-Email': API_EMAIL,
            'X-Auth-Key': API_KEY,
          }
        });
      }
      
      // Create CNAME record pointing to Replit
      console.log('Creating CNAME record pointing to Replit...');
      const createResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records`, {
        method: 'POST',
        headers: {
          'X-Auth-Email': API_EMAIL,
          'X-Auth-Key': API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'CNAME',
          name: 'backstageos.com',
          content: 'backstageos.replit.app',
          ttl: 300,
          proxied: false
        })
      });
      
      const createData = await createResponse.json();
      
      if (createData.success) {
        console.log('✅ Successfully created CNAME record: backstageos.com → backstageos.replit.app');
        console.log('\nDNS configuration is now ready for Replit domain linking!');
        console.log('You can now try linking your domain in Replit again.');
      } else {
        console.error('Failed to create CNAME record:', createData.errors);
      }
    } else {
      console.log('No A records found. Checking if CNAME already exists...');
      
      const cnameRecord = data.result.find(record => 
        record.name === 'backstageos.com' && record.type === 'CNAME'
      );
      
      if (cnameRecord) {
        console.log(`CNAME already exists: ${cnameRecord.content}`);
        if (cnameRecord.content !== 'backstageos.replit.app') {
          console.log('Updating CNAME to point to Replit...');
          const updateResponse = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${cnameRecord.id}`, {
            method: 'PUT',
            headers: {
              'X-Auth-Email': API_EMAIL,
              'X-Auth-Key': API_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type: 'CNAME',
              name: 'backstageos.com',
              content: 'backstageos.replit.app',
              ttl: 300,
              proxied: false
            })
          });
          
          const updateData = await updateResponse.json();
          if (updateData.success) {
            console.log('✅ Updated CNAME record to point to Replit');
          }
        } else {
          console.log('✅ CNAME already correctly points to Replit');
        }
      }
    }
    
  } catch (error) {
    console.error('Error updating DNS:', error);
  }
}

updateDNS();