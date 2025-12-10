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
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
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
  
  // Use provided from address or default to noreply
  const senderEmail = emailData.from || 'noreply@reset.backstageos.com';
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
