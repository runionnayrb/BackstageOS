import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Trust proxy for proper domain handling in production
app.set('trust proxy', true);

// Serve policy pages as static HTML - instant loading, no auth checks
app.get('/security', (_req, res) => {
  res.send(getPolicyPageHTML('Security', 'How we protect your production data', getSecurityContent()));
});

app.get('/privacy', (_req, res) => {
  res.send(getPolicyPageHTML('Privacy Policy', 'How we handle your data', getPrivacyContent()));
});

app.get('/terms', (_req, res) => {
  res.send(getPolicyPageHTML('Terms of Service', 'Terms and conditions for using BackstageOS', getTermsContent()));
});

// Domain routing configuration will be loaded dynamically from database

// Subdomain-based domain handling with Cloudflare proxy support
app.use((req, res, next) => {
  // Get hostname from multiple potential sources when behind Cloudflare proxy
  // Cloudflare sets X-Forwarded-Host or CF-Visitor headers when proxying
  const hostname = req.get('x-forwarded-host') || req.get('host') || req.hostname;
  const cfVisitor = req.get('cf-visitor');
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  
  console.log(`BackstageOS serving on ${hostname}`);
  console.log(`Headers - Host: ${req.get('host')}, X-Forwarded-Host: ${req.get('x-forwarded-host')}, CF-Visitor: ${cfVisitor}`);
  
  // Set application headers
  res.setHeader('X-Powered-By', 'BackstageOS');
  
  // Force HTTPS for production
  if (protocol !== 'https' && process.env.NODE_ENV === 'production' && hostname && !hostname.includes('localhost')) {
    return res.redirect(301, `https://${hostname}${req.url}`);
  }
  
  // Handle domain-specific routing based on Page Manager database configuration
  if (req.path === '/' && hostname) {
    console.log(`Production routing check for hostname: ${hostname}`);
    
    // Fallback when hostname detection fails in production
    if (!hostname || hostname.includes('replit.app')) {
      console.log(`Replit deployment URL detected, allowing all routes`);
      // Don't redirect, let the app handle routing
    } else if (hostname === 'backstageos.com' || (hostname.includes('backstageos.com') && !hostname.includes('beta.') && !hostname.includes('join.'))) {
      console.log(`Domain routing: ${hostname} → /landing`);
      req.url = '/landing';
    } else if (hostname.includes('beta.backstageos.com') || hostname.includes('app.backstageos.com')) {
      console.log(`Domain routing: ${hostname} → / (auth required)`);
      // Keep as root, authentication will be handled by frontend
    } else if (hostname.includes('join.backstageos.com')) {
      console.log(`Domain routing: ${hostname} → /landing`);
      req.url = '/landing';
    } else {
      console.log(`Unknown hostname: ${hostname}, allowing default routing`);
      // Don't redirect unknown hostnames, let frontend handle it
    }
  }
  
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Initialize default account types
async function initializeDefaultAccountTypes() {
  try {
    const { storage } = await import('./storage');
    
    // Check if account types already exist
    const existingAccountTypes = await storage.getAccountTypes();
    
    if (existingAccountTypes.length === 0) {
      console.log('Creating default account types...');
      
      // Create Freelancer account type
      await storage.createAccountType({
        name: 'Freelancer',
        description: 'Individual freelance theater professionals',
        sortOrder: 1,
        isActive: true
      });
      
      // Create Full-time account type
      await storage.createAccountType({
        name: 'Full-time',
        description: 'Full-time theater professionals and staff',
        sortOrder: 2,
        isActive: true
      });
      
      console.log('✅ Default account types created successfully');
    }
  } catch (error) {
    console.error('Failed to initialize default account types:', error);
  }
}

// Helper function to generate policy page HTML
function getPolicyPageHTML(title: string, subtitle: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | BackstageOS</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background: #fff; }
    .header { background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%); color: white; padding: 48px 16px; }
    .header-content { max-width: 896px; margin: 0 auto; }
    .back-link { display: inline-flex; align-items: center; gap: 8px; color: white; text-decoration: none; margin-bottom: 24px; opacity: 0.9; }
    .back-link:hover { opacity: 1; }
    h1 { font-size: 2.25rem; font-weight: 700; margin-bottom: 16px; }
    .subtitle { font-size: 1.25rem; opacity: 0.9; }
    .content { max-width: 896px; margin: 0 auto; padding: 48px 16px; }
    h2 { font-size: 1.5rem; font-weight: 600; margin: 24px 0 12px; color: #0f172a; }
    p { margin-bottom: 16px; color: #475569; }
    ul { list-style: disc; padding-left: 24px; margin-bottom: 16px; color: #475569; }
    li { margin-bottom: 8px; }
    .footer { padding-top: 32px; margin-top: 32px; border-top: 1px solid #e2e8f0; }
    .footer p { font-size: 0.875rem; color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-content">
      <a href="/projects" class="back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back
      </a>
      <h1>${title}</h1>
      <p class="subtitle">${subtitle}</p>
    </div>
  </div>
  <div class="content">
    ${content}
    <div class="footer">
      <p>Last updated: November 2025</p>
    </div>
  </div>
</body>
</html>`;
}

function getSecurityContent(): string {
  return `
    <h2>Data Protection & Encryption</h2>
    <p>BackstageOS implements industry-leading security measures to protect your production data. All data transmitted between your device and our servers is encrypted using TLS 1.3, the same encryption standard used by financial institutions and healthcare providers.</p>

    <h2>At-Rest Encryption</h2>
    <p>Your data is encrypted at rest using AES-256 encryption. This means that even if someone gains unauthorized access to our servers, your information remains protected and unreadable without the proper encryption keys.</p>

    <h2>Authentication & Access Control</h2>
    <p>We employ multi-factor authentication (MFA) to ensure that only authorized users can access accounts. Your passwords are hashed using bcrypt with multiple rounds, making them resistant to brute-force attacks. We never store passwords in plain text.</p>

    <h2>Session Security</h2>
    <p>Your session tokens are stored securely and expire after a period of inactivity. We use secure, HTTP-only cookies to prevent cross-site scripting attacks. Each session is tied to your specific device and browser fingerprint.</p>

    <h2>Regular Security Audits</h2>
    <p>We conduct regular security assessments and penetration testing to identify and fix vulnerabilities. Our systems are monitored 24/7 for suspicious activity and unauthorized access attempts.</p>

    <h2>Compliance & Standards</h2>
    <p>BackstageOS is designed to comply with GDPR, CCPA, and other data protection regulations. We follow OWASP (Open Web Application Security Project) best practices for secure software development.</p>

    <h2>Third-Party Security</h2>
    <p>Any third-party services we use for payment processing, email delivery, or cloud infrastructure are carefully vetted for security compliance. We ensure they meet the same security standards we maintain.</p>

    <h2>Data Breach Notification</h2>
    <p>In the unlikely event of a security incident, we will notify affected users within 72 hours and provide guidance on protecting their accounts. We maintain comprehensive incident response procedures.</p>

    <h2>Your Security Responsibilities</h2>
    <p>While we provide robust security infrastructure, we recommend:</p>
    <ul>
      <li>Using a strong, unique password for your account</li>
      <li>Enabling multi-factor authentication</li>
      <li>Keeping your devices and browsers updated</li>
      <li>Not sharing your login credentials</li>
      <li>Logging out when using shared devices</li>
    </ul>

    <h2>Security Contact</h2>
    <p>If you discover a security vulnerability, please contact us at security@backstageos.com. We take security concerns seriously and will respond promptly to reports.</p>
  `;
}

function getPrivacyContent(): string {
  return `
    <h2>Information We Collect</h2>
    <p>We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support. This includes your name, email address, and any production-related data you choose to store in BackstageOS.</p>

    <h2>How We Use Your Information</h2>
    <p>We use the information we collect to provide, maintain, and improve our services, to communicate with you about your account and updates, and to ensure the security of our platform.</p>

    <h2>Data Storage and Security</h2>
    <p>Your data is stored on secure servers with encryption at rest and in transit. We implement industry-standard security measures to protect your information from unauthorized access.</p>

    <h2>Data Sharing</h2>
    <p>We do not sell your personal information. We may share data with trusted service providers who assist us in operating our platform, subject to confidentiality agreements.</p>

    <h2>Your Rights</h2>
    <p>You have the right to access, correct, or delete your personal information. You can export your data at any time through your account settings.</p>

    <h2>Cookies and Tracking</h2>
    <p>We use essential cookies to maintain your session and preferences. We do not use third-party tracking cookies for advertising purposes.</p>

    <h2>Changes to This Policy</h2>
    <p>We may update this privacy policy from time to time. We will notify you of any significant changes by email or through the application.</p>

    <h2>Contact Us</h2>
    <p>If you have questions about this privacy policy, please contact us at privacy@backstageos.com.</p>
  `;
}

function getTermsContent(): string {
  return `
    <h2>Acceptance of Terms</h2>
    <p>By accessing or using BackstageOS, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>

    <h2>Use of Service</h2>
    <p>You may use BackstageOS for lawful purposes only. You agree not to use the service to store or transmit any content that is illegal, harmful, or violates the rights of others.</p>

    <h2>Account Responsibilities</h2>
    <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>

    <h2>Intellectual Property</h2>
    <p>The BackstageOS platform, including its design, features, and content, is protected by copyright and other intellectual property laws. You retain ownership of the data you store in the platform.</p>

    <h2>Service Availability</h2>
    <p>We strive to provide reliable service but do not guarantee uninterrupted access. We may perform maintenance or updates that temporarily affect availability.</p>

    <h2>Limitation of Liability</h2>
    <p>BackstageOS is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>

    <h2>Termination</h2>
    <p>We reserve the right to suspend or terminate accounts that violate these terms. You may cancel your account at any time through your account settings.</p>

    <h2>Changes to Terms</h2>
    <p>We may modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.</p>

    <h2>Contact</h2>
    <p>For questions about these terms, please contact us at legal@backstageos.com.</p>
  `;
}

(async () => {
  const server = await registerRoutes(app);
  
  // Initialize default data
  await initializeDefaultAccountTypes();

  // Start scheduled email processor (checks every minute)
  const { startScheduledEmailProcessor } = await import('./services/scheduledEmailProcessor.js');
  startScheduledEmailProcessor();

  // Initialize IMAP server for Apple Mail integration
  try {
    const { imapServerManager } = await import('./services/imapServerManager.js');
    await imapServerManager.initialize();
  } catch (error) {
    console.error('Failed to initialize IMAP server:', error);
    // Don't fail startup if IMAP server fails
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    log(`Custom domain handling active for backstageos.com`);
  });
})();
