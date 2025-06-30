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
  private zoneId: string;
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
    this.zoneId = process.env.CLOUDFLARE_ZONE_ID || '';
  }

  private async makeRequest(endpoint: string, options: any = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudflare API error: ${error}`);
    }

    return response.json();
  }

  async getDNSRecords(): Promise<CloudflareRecord[]> {
    const response = await this.makeRequest(`/zones/${this.zoneId}/dns_records`) as any;
    return response.result || [];
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