import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

app.use((req, res, next) => {
  if (req.path === '/health' || (req.path === '/' && req.method === 'GET' && !req.headers['accept']?.includes('text/html'))) {
    return res.status(200).json({ status: 'ok' });
  }
  next();
});

// Trust proxy for proper domain handling in production
app.set('trust proxy', true);

// Domain routing configuration will be loaded dynamically from database

// Subdomain-based domain handling with Cloudflare proxy support
app.use((req, res, next) => {
  // Get hostname from multiple potential sources when behind Cloudflare proxy
  // Cloudflare sets X-Forwarded-Host or CF-Visitor headers when proxying
  const hostname = req.get('x-forwarded-host') || req.get('host') || req.hostname;
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  
  // Set application headers
  res.setHeader('X-Powered-By', 'BackstageOS');
  
  // Force HTTPS for production
  if (protocol !== 'https' && process.env.NODE_ENV === 'production' && hostname && !hostname.includes('localhost')) {
    return res.redirect(301, `https://${hostname}${req.url}`);
  }
  
  // Handle domain-specific routing based on Page Manager database configuration
  if (req.path === '/' && hostname) {
    // Fallback when hostname detection fails in production
    if (!hostname || hostname.includes('replit.app')) {
      // Don't redirect, let the app handle routing
    } else if (hostname === 'backstageos.com' || (hostname.includes('backstageos.com') && !hostname.includes('beta.') && !hostname.includes('join.'))) {
      req.url = '/landing';
    } else if (hostname.includes('beta.backstageos.com') || hostname.includes('app.backstageos.com')) {
      // Keep as root, authentication will be handled by frontend
    } else if (hostname.includes('join.backstageos.com')) {
      req.url = '/landing';
    }
    // Unknown hostnames use default routing
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

(async () => {
  const server = await registerRoutes(app);
  
  // Initialize default data in background (non-blocking)
  initializeDefaultAccountTypes().catch(err => console.error('Account types init failed:', err));

  // Defer email processor startup to after server is listening (non-blocking)
  setImmediate(async () => {
    try {
      const { startScheduledEmailProcessor } = await import('./services/scheduledEmailProcessor.js');
      startScheduledEmailProcessor();
    } catch (err) {
      console.error('Failed to start scheduled email processor:', err);
    }
  });

  // Self-hosted IMAP/SMTP email servers disabled - using Google/Outlook OAuth integration instead
  // To re-enable, uncomment the following:
  // try {
  //   const { imapServerManager } = await import('./services/imapServerManager.js');
  //   await imapServerManager.initialize();
  // } catch (error) {
  //   console.error('Failed to initialize IMAP server:', error);
  // }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // SEO settings cache (in-memory, refreshes every 5 minutes)
  const seoCache = new Map<string, { data: any; timestamp: number }>();
  const SEO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async function getCachedSeoSettings(domain: string): Promise<any> {
    const cached = seoCache.get(domain);
    if (cached && Date.now() - cached.timestamp < SEO_CACHE_TTL) {
      return cached.data;
    }
    
    const { storage } = await import('./storage.js');
    const seoSettings = await storage.getSeoSettings(domain);
    seoCache.set(domain, { data: seoSettings, timestamp: Date.now() });
    return seoSettings;
  }

  // SEO injection middleware - inject domain-specific SEO settings into HTML
  app.use((req, res, next) => {
    // Store original send function
    const originalSend = res.send;
    
    res.send = async function(data: any) {
      // Only process HTML responses
      if (typeof data === 'string' && data.includes('<html') && data.includes('</html>')) {
        try {
          // Extract domain from request headers
          const hostname = req.get('x-forwarded-host') || req.get('host') || req.hostname;
          const cleanDomain = hostname ? hostname.split(':')[0] : null;
          
          if (cleanDomain) {
            // Fetch SEO settings for this domain (from cache)
            const seoSettings = await getCachedSeoSettings(cleanDomain);
            
            if (seoSettings) {
              // Generate SEO meta tags
              const seoMeta = generateSeoMetaTags(seoSettings);
              
              // Replace the meta tag section in HTML
              const headRegex = /<head[^>]*>([\s\S]*?)<\/head>/i;
              const match = data.match(headRegex);
              
              if (match) {
                // Find where to insert SEO tags (after charset and viewport, before default SEO)
                const headContent = match[1];
                // Replace existing SEO section or insert new one
                const newHeadContent = headContent
                  .replace(/<!-- Default SEO Meta Tags -->[\s\S]*?<!-- PWA Manifest -->/, seoMeta + '\n    \n    <!-- PWA Manifest -->')
                  .replace(/<!-- Favicon -->[\s\S]*?<!-- PWA Manifest -->/, seoMeta.match(/<!-- Favicon -->[\s\S]*?<!-- PWA Manifest -->/)?.[0] || '');
                
                data = data.replace(match[0], `<head${match[0].match(/^<head([^>]*)>/i)?.[1] || ''}>${newHeadContent}</head>`);
              }
            }
          }
        } catch (error) {
          console.error('SEO injection error:', error);
          // Continue without SEO injection if there's an error
        }
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  });

  function generateSeoMetaTags(settings: any): string {
    const escapeHtml = (text: string) => {
      if (!text) return '';
      const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return String(text).replace(/[&<>"']/g, (char) => map[char]);
    };

    const title = escapeHtml(settings.siteTitle || 'BackstageOS');
    const description = escapeHtml(settings.siteDescription || '');
    const keywords = escapeHtml(settings.keywords || '');
    const author = escapeHtml(settings.author || 'BackstageOS');
    const robots = escapeHtml(settings.robotsDirectives || 'index, follow');
    const themeColor = escapeHtml(settings.themeColor || '#1a1a1a');
    const canonical = escapeHtml(settings.canonicalUrl || '');
    const language = escapeHtml(settings.languageCode || 'en-US');

    const ogTitle = escapeHtml(settings.siteTitle || 'BackstageOS');
    const ogDescription = escapeHtml(settings.siteDescription || '');
    const ogType = escapeHtml(settings.openGraphType || 'website');
    const ogImage = escapeHtml(settings.shareImageUrl || '');
    const ogImageAlt = escapeHtml(settings.shareImageAlt || '');

    const twitterCard = escapeHtml(settings.twitterCard || 'summary_large_image');
    const twitterTitle = escapeHtml(settings.siteTitle || 'BackstageOS');
    const twitterDescription = escapeHtml(settings.siteDescription || '');
    const twitterImage = escapeHtml(settings.shareImageUrl || '');
    const twitterImageAlt = escapeHtml(settings.shareImageAlt || '');

    const favicon = escapeHtml(settings.faviconUrl || '/uploads/favicon.png');
    const appleTouchIcon = escapeHtml(settings.appleTouchIconUrl || favicon);

    let tags = `    <!-- Default SEO Meta Tags -->
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="keywords" content="${keywords}" />
    <meta name="author" content="${author}" />
    <meta name="robots" content="${robots}" />
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="${ogTitle}" />
    <meta property="og:description" content="${ogDescription}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="BackstageOS" />`;

    if (ogImage) {
      tags += `\n    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:alt" content="${ogImageAlt}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />`;
    }

    tags += `
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="${twitterCard}" />
    <meta name="twitter:title" content="${twitterTitle}" />
    <meta name="twitter:description" content="${twitterDescription}" />`;

    if (twitterImage) {
      tags += `\n    <meta name="twitter:image" content="${twitterImage}" />
    <meta name="twitter:image:alt" content="${twitterImageAlt}" />`;
    }

    tags += `
    
    <!-- PWA Meta Tags -->
    <meta name="theme-color" content="${themeColor}" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="BackstageOS" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="msapplication-TileColor" content="${themeColor}" />
    <meta name="msapplication-tap-highlight" content="no" />
    
    <!-- Additional Meta Tags -->
    ${canonical ? `<link rel="canonical" href="${canonical}" />` : ''}
    <link rel="icon" href="${favicon}" />
    <link rel="apple-touch-icon" href="${appleTouchIcon}" />
    <link rel="apple-touch-icon" sizes="152x152" href="${appleTouchIcon}" />
    <link rel="apple-touch-icon" sizes="180x180" href="${appleTouchIcon}" />
    <link rel="apple-touch-icon" sizes="167x167" href="${appleTouchIcon}" />
    
    <!-- PWA Manifest -->`;

    return tags;
  }

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
