import fetch from 'node-fetch';

export interface CloudflareRecord {
  id?: string;
  type: string;
  name: string;
  content: string;
  ttl?: number;
  proxied?: boolean;
}

export interface CloudflareDomain {
  id: string;
  name: string;
  status: string;
}

class CloudflareService {
  private apiToken: string;
  private apiEmail: string;
  private apiKey: string;
  private zoneId: string;
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
    this.apiEmail = process.env.CLOUDFLARE_API_EMAIL || '';
    this.apiKey = process.env.CLOUDFLARE_API_KEY || '';
    this.zoneId = process.env.CLOUDFLARE_ZONE_ID || '';
    
    console.log('Cloudflare Service initialized:');
    console.log('- API Email:', this.apiEmail ? 'SET' : 'NOT SET');
    console.log('- API Key:', this.apiKey ? `SET (${this.apiKey.length} chars)` : 'NOT SET');
    console.log('- API Token:', this.apiToken ? `SET (${this.apiToken.length} chars)` : 'NOT SET');
    console.log('- Zone ID:', this.zoneId);
  }

  private async makeRequest(endpoint: string, options: any = {}) {
    console.log(`Making Cloudflare API request to: ${this.baseUrl}${endpoint}`);
    console.log(`Using zone ID: ${this.zoneId}`);
    
    // Use Global API Key authentication (more reliable for DNS operations)
    let headers: any = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.apiEmail && this.apiKey) {
      headers['X-Auth-Email'] = this.apiEmail;
      headers['X-Auth-Key'] = this.apiKey;
    } else if (this.apiToken) {
      headers['Authorization'] = `Bearer ${this.apiToken}`;
    } else {
      throw new Error('No valid Cloudflare authentication configured');
    }
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    const responseText = await response.text();
    console.log(`Cloudflare API response status: ${response.status}`);
    console.log(`Cloudflare API response: ${responseText}`);

    if (!response.ok) {
      throw new Error(`Cloudflare API error (${response.status}): ${responseText}`);
    }

    try {
      return JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Invalid JSON response from Cloudflare: ${responseText}`);
    }
  }

  async getDNSRecords(): Promise<CloudflareRecord[]> {
    try {
      // Try with explicit parameters that sometimes help with permissions
      const response = await this.makeRequest(`/zones/${this.zoneId}/dns_records?per_page=100&page=1`) as any;
      return response.result || [];
    } catch (error: any) {
      console.error('DNS records API failed, trying alternative approach:', error.message);
      
      // Alternative: Try to get zone details first to verify permissions
      const zoneResponse = await this.makeRequest(`/zones/${this.zoneId}`) as any;
      console.log('Zone permissions:', zoneResponse.result?.permissions);
      
      // Retry with minimal endpoint
      const retryResponse = await this.makeRequest(`/zones/${this.zoneId}/dns_records`, {
        method: 'GET'
      }) as any;
      return retryResponse.result || [];
    }
  }

  async createDNSRecord(record: CloudflareRecord): Promise<CloudflareRecord> {
    const response = await this.makeRequest(`/zones/${this.zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify(record),
    }) as any;
    return response.result;
  }

  async updateDNSRecord(recordId: string, record: Partial<CloudflareRecord>): Promise<CloudflareRecord> {
    const response = await this.makeRequest(`/zones/${this.zoneId}/dns_records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(record),
    }) as any;
    return response.result;
  }

  async deleteDNSRecord(recordId: string): Promise<boolean> {
    await this.makeRequest(`/zones/${this.zoneId}/dns_records/${recordId}`, {
      method: 'DELETE',
    });
    return true;
  }

  async getZoneInfo(): Promise<CloudflareDomain> {
    const response = await this.makeRequest(`/zones/${this.zoneId}`) as any;
    return response.result;
  }

  async createSubdomain(subdomain: string, target: string): Promise<CloudflareRecord> {
    return this.createDNSRecord({
      type: 'CNAME',
      name: subdomain,
      content: target,
      ttl: 300,
      proxied: false
    });
  }

  async createEmailForward(alias: string, destination: string): Promise<any> {
    try {
      // First ensure email routing is enabled for the zone
      await this.enableEmailRouting();
      
      // Check if required MX records exist for email routing
      await this.ensureEmailMXRecords();
      
      // Create the email routing rule
      const zoneName = await this.getZoneName();
      const requestBody = {
        matchers: [{
          type: 'literal',
          field: 'to',
          value: `${alias}@${zoneName}`
        }],
        actions: [{
          type: 'forward',
          value: [destination]
        }],
        enabled: true,
        name: `Forward ${alias}@${zoneName} to ${destination}`
      };
      
      console.log('Email routing request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await this.makeRequest(`/zones/${this.zoneId}/email/routing/rules`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      }) as any;

      return response.result;
    } catch (error: any) {
      console.error('Error creating email forward:', error);
      throw new Error(`Failed to create email forward: ${error.message}`);
    }
  }

  private async enableEmailRouting(): Promise<void> {
    try {
      // Check if email routing is already enabled
      const status = await this.makeRequest(`/zones/${this.zoneId}/email/routing`) as any;
      
      if (status.result?.enabled) {
        console.log('Email routing already enabled');
        return;
      }

      // Enable email routing
      await this.makeRequest(`/zones/${this.zoneId}/email/routing/enable`, {
        method: 'POST'
      });
      
      console.log('Email routing enabled successfully');
    } catch (error: any) {
      console.error('Error enabling email routing:', error);
      throw new Error(`Failed to enable email routing: ${error.message}`);
    }
  }

  private async ensureEmailMXRecords(): Promise<void> {
    try {
      console.log('Checking MX records for email routing...');
      const dnsRecords = await this.getDNSRecords();
      const mxRecords = dnsRecords.filter(record => record.type === 'MX');
      
      console.log('Existing MX records:', mxRecords);
      
      // Check if Cloudflare Email Routing MX records exist
      const requiredMXRecords = [
        { name: '@', content: 'isaac.mx.cloudflare.net', priority: 93 },
        { name: '@', content: 'linda.mx.cloudflare.net', priority: 83 },
        { name: '@', content: 'amir.mx.cloudflare.net', priority: 42 }
      ];
      
      const zoneName = await this.getZoneName();
      
      for (const requiredMX of requiredMXRecords) {
        const exists = mxRecords.some(existing => 
          existing.content.includes(requiredMX.content.split('.')[0]) // Check for isaac/linda/amir
        );
        
        if (!exists) {
          console.log(`Creating missing MX record: ${requiredMX.content}`);
          await this.createDNSRecord({
            type: 'MX',
            name: requiredMX.name === '@' ? zoneName : requiredMX.name,
            content: `${requiredMX.priority} ${requiredMX.content}`,
            ttl: 300
          });
        }
      }
      
      console.log('MX records verified for email routing');
    } catch (error: any) {
      console.error('Error ensuring MX records:', error);
      // Don't throw - continue with email routing setup
    }
  }

  private async getZoneName(): Promise<string> {
    try {
      const zoneInfo = await this.getZoneInfo();
      return zoneInfo.name;
    } catch (error) {
      console.error('Error getting zone name:', error);
      return 'backstageos.com'; // fallback
    }
  }

  isConfigured(): boolean {
    return !!(this.apiToken && this.zoneId);
  }
}

export const cloudflareService = new CloudflareService();