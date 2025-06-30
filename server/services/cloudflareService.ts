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
  }

  private async makeRequest(endpoint: string, options: any = {}) {
    console.log(`Making Cloudflare API request to: ${this.baseUrl}${endpoint}`);
    console.log(`Using zone ID: ${this.zoneId}`);
    
    // Try API token first, fallback to Global API Key if available
    let headers: any = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.apiToken) {
      headers['Authorization'] = `Bearer ${this.apiToken}`;
    } else if (this.apiEmail && this.apiKey) {
      headers['X-Auth-Email'] = this.apiEmail;
      headers['X-Auth-Key'] = this.apiKey;
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

  async createEmailForward(alias: string, destination: string): Promise<CloudflareRecord> {
    return this.createDNSRecord({
      type: 'MX',
      name: alias,
      content: `10 ${destination}`,
      ttl: 300
    });
  }

  isConfigured(): boolean {
    return !!(this.apiToken && this.zoneId);
  }
}

export const cloudflareService = new CloudflareService();