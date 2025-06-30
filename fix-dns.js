// Quick script to update DNS records for backstageos.com to point to Replit
const { CloudflareService } = require('./dist/server/services/cloudflareService.js');

async function updateDNS() {
  try {
    const cloudflareService = new CloudflareService(process.env.CLOUDFLARE_API_TOKEN);
    
    // Get the zone for backstageos.com
    const zone = await cloudflareService.getZone('backstageos.com');
    if (!zone) {
      console.log('Zone not found for backstageos.com');
      return;
    }
    
    console.log('Found zone:', zone.id);
    
    // List existing DNS records
    const records = await cloudflareService.listDNSRecords(zone.id);
    console.log('Existing A records:', records.filter(r => r.type === 'A'));
    
    // Find and update the A record for @ (root domain)
    const aRecord = records.find(r => r.type === 'A' && r.name === 'backstageos.com');
    
    if (aRecord) {
      console.log('Updating existing A record:', aRecord.id);
      await cloudflareService.updateDNSRecord(zone.id, aRecord.id, {
        type: 'A',
        name: '@',
        content: '34.111.179.208',
        ttl: 300
      });
      console.log('A record updated to point to Replit IP: 34.111.179.208');
    } else {
      console.log('Creating new A record');
      await cloudflareService.createDNSRecord(zone.id, {
        type: 'A',
        name: '@',
        content: '34.111.179.208',
        ttl: 300
      });
      console.log('A record created to point to Replit IP: 34.111.179.208');
    }
    
    // Add TXT verification record if it doesn't exist
    const txtRecord = records.find(r => r.type === 'TXT' && r.content.includes('replit-verify'));
    if (!txtRecord) {
      console.log('Adding Replit verification TXT record');
      await cloudflareService.createDNSRecord(zone.id, {
        type: 'TXT',
        name: '@',
        content: 'replit-verify=bfe1706b-0942-4c',
        ttl: 300
      });
      console.log('TXT verification record added');
    } else {
      console.log('TXT verification record already exists');
    }
    
    console.log('DNS update complete!');
    
  } catch (error) {
    console.error('Error updating DNS:', error);
  }
}

updateDNS();