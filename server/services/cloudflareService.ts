import Cloudflare from 'cloudflare';
import axios from 'axios';

export class CloudflareService {
  private cf: Cloudflare;
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
    this.cf = new Cloudflare({ apiToken });
  }

  // Zone Management
  async createZone(domain: string) {
    try {
      const response = await this.cf.zones.create({
        name: domain,
        account: { id: process.env.CLOUDFLARE_ACCOUNT_ID! },
        type: 'full'
      });
      return response;
    } catch (error) {
      console.error('Error creating Cloudflare zone:', error);
      throw error;
    }
  }

  async getZone(zoneName: string) {
    try {
      const zones = await this.cf.zones.list({ name: zoneName });
      return zones.result?.[0];
    } catch (error) {
      console.error('Error fetching Cloudflare zone:', error);
      throw error;
    }
  }

  async listZones() {
    try {
      const response = await this.cf.zones.list();
      return response.result;
    } catch (error) {
      console.error('Error listing Cloudflare zones:', error);
      throw error;
    }
  }

  // DNS Record Management
  async createDNSRecord(zoneId: string, record: {
    type: string;
    name: string;
    content: string;
    ttl?: number;
    proxied?: boolean;
  }) {
    try {
      const response = await this.cf.dns.records.create(zoneId, record);
      return response;
    } catch (error) {
      console.error('Error creating DNS record:', error);
      throw error;
    }
  }

  async updateDNSRecord(zoneId: string, recordId: string, record: {
    type: string;
    name: string;
    content: string;
    ttl?: number;
    proxied?: boolean;
  }) {
    try {
      const response = await this.cf.dns.records.update(zoneId, recordId, record);
      return response;
    } catch (error) {
      console.error('Error updating DNS record:', error);
      throw error;
    }
  }

  async deleteDNSRecord(zoneId: string, recordId: string) {
    try {
      const response = await this.cf.dns.records.delete(zoneId, recordId);
      return response;
    } catch (error) {
      console.error('Error deleting DNS record:', error);
      throw error;
    }
  }

  async listDNSRecords(zoneId: string) {
    try {
      const response = await this.cf.dns.records.list(zoneId);
      return response.result;
    } catch (error) {
      console.error('Error listing DNS records:', error);
      throw error;
    }
  }

  // Email Routing Management
  async enableEmailRouting(zoneId: string) {
    try {
      const response = await this.cf.emailRouting.enable(zoneId);
      return response;
    } catch (error) {
      console.error('Error enabling email routing:', error);
      throw error;
    }
  }

  async createEmailRoutingRule(zoneId: string, rule: {
    matcher: { type: string; field: string; value: string };
    action: { type: string; value: string[] };
    enabled: boolean;
    name: string;
  }) {
    try {
      const response = await this.cf.emailRouting.rules.create(zoneId, rule);
      return response;
    } catch (error) {
      console.error('Error creating email routing rule:', error);
      throw error;
    }
  }

  async updateEmailRoutingRule(zoneId: string, ruleId: string, rule: {
    matcher: { type: string; field: string; value: string };
    action: { type: string; value: string[] };
    enabled: boolean;
    name: string;
  }) {
    try {
      const response = await this.cf.emailRouting.rules.update(zoneId, ruleId, rule);
      return response;
    } catch (error) {
      console.error('Error updating email routing rule:', error);
      throw error;
    }
  }

  async deleteEmailRoutingRule(zoneId: string, ruleId: string) {
    try {
      const response = await this.cf.emailRouting.rules.delete(zoneId, ruleId);
      return response;
    } catch (error) {
      console.error('Error deleting email routing rule:', error);
      throw error;
    }
  }

  async listEmailRoutingRules(zoneId: string) {
    try {
      const response = await this.cf.emailRouting.rules.list(zoneId);
      return response.result;
    } catch (error) {
      console.error('Error listing email routing rules:', error);
      throw error;
    }
  }

  // SSL Certificate Management
  async getSSLSettings(zoneId: string) {
    try {
      const response = await this.cf.ssl.settings.get(zoneId);
      return response;
    } catch (error) {
      console.error('Error fetching SSL settings:', error);
      throw error;
    }
  }

  async updateSSLSettings(zoneId: string, value: string) {
    try {
      const response = await this.cf.ssl.settings.update(zoneId, { value });
      return response;
    } catch (error) {
      console.error('Error updating SSL settings:', error);
      throw error;
    }
  }

  // Zone Settings Management
  async getZoneSettings(zoneId: string) {
    try {
      const response = await this.cf.zones.settings.list(zoneId);
      return response.result;
    } catch (error) {
      console.error('Error fetching zone settings:', error);
      throw error;
    }
  }

  async updateZoneSetting(zoneId: string, settingId: string, value: any) {
    try {
      const response = await this.cf.zones.settings.update(zoneId, settingId, { value });
      return response;
    } catch (error) {
      console.error('Error updating zone setting:', error);
      throw error;
    }
  }

  // Analytics
  async getZoneAnalytics(zoneId: string, since: string, until: string) {
    try {
      const response = await this.cf.zones.analytics.dashboard.get(zoneId, {
        since,
        until,
        continuous: true
      });
      return response;
    } catch (error) {
      console.error('Error fetching zone analytics:', error);
      throw error;
    }
  }

  // Domain Transfer Helpers
  async getNameservers(zoneId: string) {
    try {
      const zone = await this.cf.zones.get(zoneId);
      return zone.name_servers;
    } catch (error) {
      console.error('Error fetching nameservers:', error);
      throw error;
    }
  }

  async checkDomainStatus(domain: string) {
    try {
      const zone = await this.getZone(domain);
      return {
        exists: !!zone,
        status: zone?.status,
        nameServers: zone?.name_servers,
        development_mode: zone?.development_mode,
        paused: zone?.paused
      };
    } catch (error) {
      console.error('Error checking domain status:', error);
      throw error;
    }
  }
}

// GoDaddy Integration for Domain Transfer
export class GoDaddyService {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl = 'https://api.godaddy.com/v1';

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  private getHeaders() {
    return {
      'Authorization': `sso-key ${this.apiKey}:${this.apiSecret}`,
      'Content-Type': 'application/json'
    };
  }

  async getDomainInfo(domain: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/domains/${domain}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching domain info from GoDaddy:', error);
      throw error;
    }
  }

  async updateNameservers(domain: string, nameservers: string[]) {
    try {
      const response = await axios.patch(
        `${this.baseUrl}/domains/${domain}`,
        { nameServers: nameservers },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating nameservers on GoDaddy:', error);
      throw error;
    }
  }

  async getDNSRecords(domain: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/domains/${domain}/records`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching DNS records from GoDaddy:', error);
      throw error;
    }
  }

  async updateDNSRecords(domain: string, records: any[]) {
    try {
      const response = await axios.put(
        `${this.baseUrl}/domains/${domain}/records`,
        records,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating DNS records on GoDaddy:', error);
      throw error;
    }
  }
}