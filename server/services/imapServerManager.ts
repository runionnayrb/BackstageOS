import { imapServerService } from './imapServerService.js';
import { smtpServerService } from './smtpServerService.js';

export class ImapServerManager {
  private isInitialized = false;

  /**
   * Initialize and start the email servers (IMAP + SMTP)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Email servers already initialized');
      return;
    }

    try {
      console.log('🚀 Starting email servers...');
      
      // Start IMAP server on ports 143 (plain) and 993 (TLS)
      await imapServerService.start(143, 993);
      
      // Start SMTP server on port 587
      await smtpServerService.start();
      
      this.isInitialized = true;
      console.log('✅ Email servers started successfully');
      console.log('📧 Users can now add their BackstageOS email to Apple Mail:');
      console.log('   IMAP Server: backstageos.com, Port: 993 (SSL) or 143 (plain)');
      console.log('   SMTP Server: backstageos.com, Port: 587 (STARTTLS)');
      console.log('   Username: their@backstageos.com email address');
      console.log('   Password: their BackstageOS password');
      
    } catch (error) {
      console.error('❌ Failed to start email servers:', error);
      throw error;
    }
  }

  /**
   * Stop the email servers
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      console.log('🛑 Stopping email servers...');
      await Promise.all([
        imapServerService.stop(),
        smtpServerService.stop()
      ]);
      this.isInitialized = false;
      console.log('✅ Email servers stopped');
    } catch (error) {
      console.error('❌ Error stopping email servers:', error);
      throw error;
    }
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      imap: imapServerService.getStatus(),
      smtp: smtpServerService.getStatus()
    };
  }

  /**
   * Check if the email servers are healthy
   */
  isHealthy(): boolean {
    return this.isInitialized && 
           imapServerService.getStatus().isRunning && 
           smtpServerService.getStatus().isRunning;
  }
}

// Export singleton instance
export const imapServerManager = new ImapServerManager();