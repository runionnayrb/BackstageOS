import https from 'https';

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ZONE_NAME = 'backstageos.com';
const REPLIT_IP = '34.111.179.208';
const TXT_VERIFICATION = 'replit-verify=bfe1706b-0942-4c';

async function makeCloudflareRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.cloudflare.com',
      port: 443,
      path: `/client/v4${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve(response);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function updateDNS() {
  try {
    console.log('Getting zone for backstageos.com...');
    
    // Get zone
    const zonesResponse = await makeCloudflareRequest(`/zones?name=${ZONE_NAME}`);
    if (!zonesResponse.success || zonesResponse.result.length === 0) {
      console.error('Zone not found for backstageos.com');
      return;
    }
    
    const zone = zonesResponse.result[0];
    const zoneId = zone.id;
    console.log(`Found zone: ${zoneId}`);
    
    // Get existing DNS records
    const recordsResponse = await makeCloudflareRequest(`/zones/${zoneId}/dns_records`);
    if (!recordsResponse.success) {
      console.error('Failed to get DNS records:', recordsResponse.errors);
      console.error('Full response:', JSON.stringify(recordsResponse, null, 2));
      return;
    }
    
    const records = recordsResponse.result;
    console.log(`Found ${records.length} DNS records`);
    
    // Find A record for root domain
    const aRecord = records.find(r => r.type === 'A' && (r.name === ZONE_NAME || r.name === '@'));
    
    if (aRecord) {
      console.log(`Updating existing A record: ${aRecord.id}`);
      console.log(`Current IP: ${aRecord.content} -> New IP: ${REPLIT_IP}`);
      
      const updateResponse = await makeCloudflareRequest(
        `/zones/${zoneId}/dns_records/${aRecord.id}`,
        'PUT',
        {
          type: 'A',
          name: '@',
          content: REPLIT_IP,
          ttl: 300
        }
      );
      
      if (updateResponse.success) {
        console.log('✓ A record updated successfully');
      } else {
        console.error('Failed to update A record:', updateResponse.errors);
      }
    } else {
      console.log('Creating new A record...');
      
      const createResponse = await makeCloudflareRequest(
        `/zones/${zoneId}/dns_records`,
        'POST',
        {
          type: 'A',
          name: '@',
          content: REPLIT_IP,
          ttl: 300
        }
      );
      
      if (createResponse.success) {
        console.log('✓ A record created successfully');
      } else {
        console.error('Failed to create A record:', createResponse.errors);
      }
    }
    
    // Check for TXT verification record
    const txtRecord = records.find(r => r.type === 'TXT' && r.content.includes('replit-verify'));
    
    if (!txtRecord) {
      console.log('Adding TXT verification record...');
      
      const txtResponse = await makeCloudflareRequest(
        `/zones/${zoneId}/dns_records`,
        'POST',
        {
          type: 'TXT',
          name: '@',
          content: TXT_VERIFICATION,
          ttl: 300
        }
      );
      
      if (txtResponse.success) {
        console.log('✓ TXT verification record added');
      } else {
        console.error('Failed to add TXT record:', txtResponse.errors);
      }
    } else {
      console.log('✓ TXT verification record already exists');
    }
    
    console.log('\n🎉 DNS update complete!');
    console.log('DNS changes may take a few minutes to propagate.');
    
  } catch (error) {
    console.error('Error updating DNS:', error);
  }
}

updateDNS();