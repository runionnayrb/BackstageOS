import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Trust proxy for proper domain handling in production
app.set('trust proxy', true);

// Domain routing configuration will be loaded dynamically from database

// Subdomain-based domain handling
app.use((req, res, next) => {
  const hostname = req.get('host') || req.hostname;
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  
  console.log(`Backstage OS serving on ${hostname}`);
  
  // Set application headers
  res.setHeader('X-Powered-By', 'Backstage OS');
  
  // Force HTTPS for production
  if (protocol !== 'https' && process.env.NODE_ENV === 'production' && !hostname.includes('localhost')) {
    return res.redirect(301, `https://${hostname}${req.url}`);
  }
  
  // Handle domain-specific routing based on Domain Manager configuration
  if (req.path === '/') {
    // Default routing based on your Domain Manager setup
    if (hostname === 'backstageos.com') {
      console.log(`Domain routing: ${hostname} → /landing`);
      req.url = '/landing';
    } else if (hostname.includes('beta.backstageos.com') || hostname.includes('app.backstageos.com')) {
      console.log(`Domain routing: ${hostname} → / (auth required)`);
      // Keep as root, authentication will be handled by frontend
    } else if (hostname.includes('join.backstageos.com')) {
      console.log(`Domain routing: ${hostname} → /landing`);
      req.url = '/landing';
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

(async () => {
  const server = await registerRoutes(app);

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
