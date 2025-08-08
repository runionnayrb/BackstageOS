import { imapServerService } from './imapServerService.js';

export class ImapServerManager {
  private isInitialized = false;

  /**
   * Initialize and start the IMAP server
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('IMAP server already initialized');
      return;
    }

    try {
      console.log('🚀 Starting IMAP server...');
      
      // Start IMAP server on ports 143 (plain) and 993 (TLS)
      await imapServerService.start(143, 993);
      
      this.isInitialized = true;
      console.log('✅ IMAP server started successfully');
      console.log('📧 Users can now add their BackstageOS email to Apple Mail:');
      console.log('   Server: backstageos.com (or your domain)');
      console.log('   Port: 993 (SSL) or 143 (plain)');
      console.log('   Username: their@backstageos.com email address');
      console.log('   Password: their BackstageOS password');
      
    } catch (error) {
      console.error('❌ Failed to start IMAP server:', error);
      throw error;
    }
  }

  /**
   * Stop the IMAP server
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      console.log('🛑 Stopping IMAP server...');
      await imapServerService.stop();
      this.isInitialized = false;
      console.log('✅ IMAP server stopped');
    } catch (error) {
      console.error('❌ Error stopping IMAP server:', error);
      throw error;
    }
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      ...imapServerService.getStatus()
    };
  }

  /**
   * Check if the IMAP server is healthy
   */
  isHealthy(): boolean {
    return this.isInitialized && imapServerService.getStatus().isRunning;
  }
}

// Export singleton instance
export const imapServerManager = new ImapServerManager();