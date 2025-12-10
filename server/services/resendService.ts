import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    console.error('❌ X_REPLIT_TOKEN not found - REPL_IDENTITY:', !!process.env.REPL_IDENTITY, 'WEB_REPL_RENEWAL:', !!process.env.WEB_REPL_RENEWAL);
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  console.log('🔐 Fetching Resend credentials from connector hostname:', hostname);
  
  try {
    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );
    
    if (!response.ok) {
      console.error('❌ Failed to fetch Resend credentials:', response.status, response.statusText);
      throw new Error(`Connector request failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📋 Connector response:', data.items?.length, 'items found');
    
    connectionSettings = data.items?.[0];

    if (!connectionSettings) {
      console.error('❌ No Resend connection found in response');
      throw new Error('Resend not connected');
    }
    
    if (!connectionSettings.settings?.api_key) {
      console.error('❌ Resend connection has no API key - settings:', Object.keys(connectionSettings.settings || {}));
      throw new Error('Resend API key not configured');
    }
    
    console.log('✅ Resend credentials retrieved successfully');
    return {
      apiKey: connectionSettings.settings.api_key, 
      fromEmail: connectionSettings.settings.from_email
    };
  } catch (error) {
    console.error('❌ Error fetching Resend credentials:', error instanceof Error ? error.message : error);
    throw error;
  }
}

export async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: fromEmail
  };
}

interface EmailData {
  to: string[];
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
}

export async function sendEmailWithResend(emailData: EmailData): Promise<any> {
  const { client, fromEmail } = await getResendClient();
  
  console.log('📧 Resend fromEmail from connector:', fromEmail);
  
  // Use provided from address or replace with verified domain
  let senderEmail = emailData.from;
  if (!senderEmail && fromEmail) {
    // Replace the domain with the verified one
    senderEmail = fromEmail.replace(/backstageos\.com/, 'reset.backstageos.com');
  }
  senderEmail = senderEmail || 'noreply@reset.backstageos.com';
  
  const senderName = emailData.fromName || 'BackstageOS';
  console.log('📧 Using sender email:', senderEmail);
  
  const response = await client.emails.send({
    from: `${senderName} <${senderEmail}>`,
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html,
  });

  if (response.error) {
    console.error('❌ Resend error:', response.error);
    throw new Error(response.error.message);
  }

  console.log('✅ Email sent successfully via Resend to:', emailData.to);
  console.log('📨 Resend response:', response);
  return response;
}
