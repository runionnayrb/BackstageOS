import { DatabaseStorage } from './storage';

interface EmailConfig {
  fromName: string;
  fromEmail: string;
  replyToEmail: string;
}

/**
 * Get email configuration for a specific project/show
 * Uses project-specific settings if available, otherwise falls back to user defaults
 */
export async function getEmailConfig(
  storage: DatabaseStorage, 
  userId: string, 
  projectId?: string
): Promise<EmailConfig> {
  // Get user data for fallbacks
  const user = await storage.getUserById(userId);
  
  let project = null;
  if (projectId) {
    try {
      project = await storage.getProjectById(projectId);
    } catch (error) {
      console.log('Project not found, using user defaults');
    }
  }

  // Determine display name
  const fromName = 
    project?.customEmailDisplayName ||  // Project-specific override
    user?.emailDisplayName ||           // User default
    `${user?.firstName} ${user?.lastName}`.trim() || // Fallback to full name
    'Stage Manager';                    // Final fallback

  // Determine reply-to email
  const replyToEmail = 
    project?.customReplyToEmail ||      // Project-specific override
    user?.defaultReplyToEmail ||        // User default
    user?.email ||                      // Fallback to user's main email
    '';

  return {
    fromName,
    fromEmail: 'sm@backstageos.com',    // Always use the universal alias
    replyToEmail
  };
}

/**
 * Format email sender for use in email headers
 * Returns: "Display Name <sm@backstageos.com>"
 */
export function formatEmailSender(config: EmailConfig): string {
  return `${config.fromName} <${config.fromEmail}>`;
}

/**
 * Get SendGrid-compatible email configuration
 */
export function getSendGridConfig(config: EmailConfig) {
  return {
    from: {
      email: config.fromEmail,
      name: config.fromName
    },
    replyTo: config.replyToEmail ? {
      email: config.replyToEmail,
      name: config.fromName
    } : undefined
  };
}