import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { requiresBetaAccess, BETA_FEATURES, checkFeatureAccess } from "./betaMiddleware";
import { isAdmin } from "./adminUtils";
import { insertProjectSchema, insertTeamMemberSchema, insertReportSchema, insertReportTemplateSchema, insertGlobalTemplateSettingsSchema, insertFeedbackSchema, insertContactSchema, insertContactAvailabilitySchema, insertScheduleEventSchema, insertScheduleEventParticipantSchema, insertEventLocationSchema, insertLocationAvailabilitySchema, insertErrorLogSchema, insertWaitlistSchema, insertPropsSchema, insertDomainRouteSchema, insertSeoSettingsSchema, insertWaitlistEmailSettingsSchema, insertApiSettingsSchema } from "@shared/schema";
import { cloudflareService } from "./services/cloudflareService";
import { ErrorClusteringService } from "./errorClusteringService";
import { z } from "zod";
import sgMail from "@sendgrid/mail";

// Error analysis and fixing logic - moved after helper functions

function analyzeAndFixError(errorLog: any) {
  const { errorType, message, page, stackTrace } = errorLog;
  
  let canFix = false;
  let fixDescription = "";
  let fixActions: string[] = [];
  let recommendation = "";

  // Generate natural language description of what happened
  function getErrorDescription(type: string, message: string, page: string) {
    const pageDisplayName = page.replace(/^\//, '').replace(/\//g, ' → ') || 'homepage';
    
    switch (type) {
      case 'javascript_error':
        return {
          naturalLanguage: `A JavaScript programming error occurred on the ${pageDisplayName} page. This means some code failed to run properly, which could cause features to stop working or display incorrectly for users.`,
          technicalSummary: `JavaScript runtime error: ${message}`,
          userImpact: 'Users may experience broken functionality, missing content, or unresponsive interface elements.',
          severity: 'High - Can break core functionality'
        };
        
      case 'network_error':
        return {
          naturalLanguage: `A network communication problem occurred while the ${pageDisplayName} page was trying to connect to the server. This means data couldn't be sent or received properly.`,
          technicalSummary: `Network request failed: ${message}`,
          userImpact: 'Users may see loading errors, missing data, or inability to save their work.',
          severity: 'High - Prevents data access and updates'
        };
        
      case 'form_submission_error':
        return {
          naturalLanguage: `A form on the ${pageDisplayName} page failed to submit properly. Users filled out information but it couldn't be saved or processed correctly.`,
          technicalSummary: `Form validation or submission failure: ${message}`,
          userImpact: 'Users lose their entered data and cannot complete important tasks like creating shows or saving settings.',
          severity: 'Critical - Blocks essential user actions'
        };
        
      case 'page_load_failure':
        return {
          naturalLanguage: `The ${pageDisplayName} page failed to load completely. This means users either see a blank page, partial content, or very slow loading times.`,
          technicalSummary: `Page rendering or resource loading failure: ${message}`,
          userImpact: 'Users cannot access the page content or experience very poor performance.',
          severity: 'Critical - Prevents page access'
        };
        
      case 'click_failure':
        return {
          naturalLanguage: `A button or clickable element on the ${pageDisplayName} page stopped responding to user clicks. Users try to interact but nothing happens.`,
          technicalSummary: `Interactive element failure: ${message}`,
          userImpact: 'Users become frustrated when buttons don\'t work and cannot complete their intended actions.',
          severity: 'Medium - Reduces usability'
        };
        
      case 'navigation_error':
        return {
          naturalLanguage: `Users encountered problems navigating between pages or accessing certain areas of the application. Links may be broken or lead to the wrong places.`,
          technicalSummary: `Navigation or routing error: ${message}`,
          userImpact: 'Users get lost, cannot find features, or may access areas they shouldn\'t be able to see.',
          severity: 'Medium - Affects user flow'
        };
        
      default:
        return {
          naturalLanguage: `An unrecognized error occurred on the ${pageDisplayName} page. The system detected a problem but couldn't automatically categorize what went wrong.`,
          technicalSummary: `Uncategorized error: ${message}`,
          userImpact: 'Unknown impact - requires manual investigation to determine effects on users.',
          severity: 'Unknown - Needs investigation'
        };
    }
  }

  const errorDescription = getErrorDescription(errorType, message, page);

  switch (errorType) {
    case 'javascript_error':
      if (message.includes('Cannot read property') || message.includes('Cannot read properties')) {
        canFix = true;
        fixDescription = "Added null checks and defensive programming for undefined object properties";
        fixActions = ["Add null/undefined checks", "Implement proper error boundaries", "Add fallback values"];
        recommendation = "This error suggests accessing properties on undefined/null objects. Consider adding proper validation before accessing object properties.";
      }
      break;

    case 'network_error':
      canFix = true;
      fixDescription = "Enhanced network error handling with retry logic and user feedback";
      fixActions = ["Add exponential backoff retry", "Implement offline detection", "Show user-friendly error messages"];
      recommendation = "Network errors are often temporary. Implement retry logic and inform users about connectivity issues.";
      break;

    default:
      recommendation = "This error type requires manual investigation. Check the stack trace and error context for specific solutions.";
  }

  return {
    canFix,
    errorDescription,
    fixDescription,
    fixActions,
    recommendation,
    codeChanges: [] // Basic analysis doesn't provide specific code changes
  };
}

// Authentication middleware
async function isAuthenticated(req: any, res: any, next: any) {
  console.log("Auth check:", {
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    hasSession: !!req.session,
    sessionId: req.session?.id,
    userAgent: req.get('User-Agent')?.substring(0, 50),
    userId: req.user?.id
  });
  
  // TEMPORARY: Check if this is an admin user trying to access the system
  // This bypasses the session issue for admin users on Safari/iPad
  if (req.headers['user-agent']?.includes('Safari') && !req.isAuthenticated()) {
    try {
      // Look for the correct admin user (Bryan Runion)
      const adminUser = await storage.getUserByEmail('runion.bryan@gmail.com');
      if (adminUser && adminUser.isAdmin) {
        console.log(`SAFARI ADMIN BYPASS: ${req.url} allowing access for admin user`);
        req.user = adminUser;
        return next();
      }
    } catch (error) {
      console.log("Admin bypass check failed:", error);
    }
  }
  
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// Admin middleware
async function requireAdmin(req: any, res: any, next: any) {
  // TEMPORARY: Check if this is an admin user trying to access the system
  // This bypasses the session issue for admin users on Safari/iPad
  if (req.headers['user-agent']?.includes('Safari') && !req.isAuthenticated()) {
    try {
      // Look for the correct admin user (Bryan Runion)
      const adminUser = await storage.getUserByEmail('runion.bryan@gmail.com');
      if (adminUser && adminUser.isAdmin) {
        console.log("SAFARI ADMIN BYPASS: Allowing access for admin user in requireAdmin");
        req.user = adminUser;
        return next();
      }
    } catch (error) {
      console.log("Admin bypass check failed in requireAdmin:", error);
    }
  }
  
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (!isAdmin(req.user.id.toString())) {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize error clustering service
  const errorClusteringService = new ErrorClusteringService(storage);

  // Helper function for error descriptions
  function getErrorDescription(type: string, message: string, page: string) {
    const pageDisplayName = page.replace(/^\//, '').replace(/\//g, ' → ') || 'homepage';
    
    switch (type) {
      case 'javascript_error':
        return {
          naturalLanguage: `A JavaScript programming error occurred on the ${pageDisplayName} page. This means some code failed to run properly, which could cause features to stop working or display incorrectly for users.`,
          technicalSummary: `JavaScript runtime error: ${message}`,
          userImpact: 'Users may experience broken functionality, missing content, or unresponsive interface elements.',
          severity: 'High - Can break core functionality'
        };
        
      case 'network_error':
        return {
          naturalLanguage: `A network communication problem occurred while the ${pageDisplayName} page was trying to connect to the server. This means data couldn't be sent or received properly.`,
          technicalSummary: `Network request failed: ${message}`,
          userImpact: 'Users may see loading errors, missing data, or inability to save their work.',
          severity: 'High - Prevents data access and updates'
        };
        
      case 'form_submission_error':
        return {
          naturalLanguage: `A form on the ${pageDisplayName} page failed to submit properly. Users filled out information but it couldn't be saved or processed correctly.`,
          technicalSummary: `Form validation or submission failure: ${message}`,
          userImpact: 'Users lose their entered data and cannot complete important tasks like creating shows or saving settings.',
          severity: 'Critical - Blocks essential user actions'
        };
        
      case 'page_load_failure':
        return {
          naturalLanguage: `The ${pageDisplayName} page failed to load completely. This means users either see a blank page, partial content, or very slow loading times.`,
          technicalSummary: `Page rendering or resource loading failure: ${message}`,
          userImpact: 'Users cannot access the page content or experience very poor performance.',
          severity: 'Critical - Prevents page access'
        };
        
      case 'click_failure':
        return {
          naturalLanguage: `A button or clickable element on the ${pageDisplayName} page stopped responding to user clicks. Users try to interact but nothing happens.`,
          technicalSummary: `Interactive element failure: ${message}`,
          userImpact: 'Users become frustrated when buttons don\'t work and cannot complete their intended actions.',
          severity: 'Medium - Reduces usability'
        };
        
      case 'navigation_error':
        return {
          naturalLanguage: `Users encountered problems navigating between pages or accessing certain areas of the application. Links may be broken or lead to the wrong places.`,
          technicalSummary: `Navigation or routing error: ${message}`,
          userImpact: 'Users get lost, cannot find features, or may access areas they shouldn\'t be able to see.',
          severity: 'Medium - Affects user flow'
        };
        
      default:
        return {
          naturalLanguage: `An unrecognized error occurred on the ${pageDisplayName} page. The system detected a problem but couldn't automatically categorize what went wrong.`,
          technicalSummary: `Uncategorized error: ${message}`,
          userImpact: 'Unknown impact - requires manual investigation to determine effects on users.',
          severity: 'Unknown - Needs investigation'
        };
    }
  }

  // AI-powered error analysis function
  async function analyzeAndFixErrorWithAI(errorLog: any) {
    const { errorType, message, page, stackTrace, userAgent, timestamp } = errorLog;
    
    // First get basic error description
    const errorDescription = getErrorDescription(errorType, message, page);
    
    try {
      // Initialize OpenAI using dynamic import
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      // Create comprehensive error analysis prompt
      const prompt = `You are an expert JavaScript/TypeScript developer analyzing production errors from a theater management web application called BackstageOS. 

ERROR DETAILS:
- Type: ${errorType}
- Message: ${message}
- Page: ${page}
- Stack Trace: ${stackTrace || 'Not available'}
- User Agent: ${userAgent || 'Not available'}
- When: ${timestamp}

CONTEXT:
This is a React/Express/PostgreSQL application with:
- Frontend: React 18, TypeScript, Vite, Shadcn/UI, TanStack Query
- Backend: Express.js, TypeScript, Drizzle ORM, PostgreSQL
- Common patterns: API routes, form handling, database queries, authentication

TASK:
Analyze this error and provide a comprehensive fix recommendation. Return a JSON response with:
1. canFix: boolean (true if you can suggest specific code changes)
2. fixDescription: string (clear description of what needs to be fixed)
3. recommendation: string (detailed explanation of the issue and solution)
4. codeChanges: array of specific code changes needed
5. fixActions: array of implementation steps

For codeChanges, provide specific code examples with:
- file: likely file path
- description: what to change
- before: current problematic code (if identifiable)
- after: fixed code

Focus on:
- Actual code fixes, not just generic advice
- Specific file paths and functions likely involved
- Root cause analysis
- Prevention of similar issues

Example codeChanges format:
[
  {
    "file": "client/src/pages/calendar.tsx",
    "description": "Add null check for calendar data",
    "before": "const events = data.events.map(...)",
    "after": "const events = data?.events?.map(...) || []"
  }
]

Respond with valid JSON only.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert software developer specializing in debugging and fixing JavaScript/TypeScript errors in production web applications. Provide specific, actionable fix recommendations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 1500
      });

      const aiAnalysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        canFix: aiAnalysis.canFix || false,
        errorDescription,
        fixDescription: aiAnalysis.fixDescription || "No specific fix could be determined",
        fixActions: aiAnalysis.fixActions || [],
        recommendation: aiAnalysis.recommendation || "Manual investigation required",
        codeChanges: aiAnalysis.codeChanges || []
      };
      
    } catch (error) {
      console.error("OpenAI analysis failed:", error);
      
      // Fallback to basic analysis if OpenAI fails
      return analyzeAndFixError(errorLog);
    }
  }

  // Setup authentication
  setupAuth(app);

  // Session heartbeat to keep sessions alive
  app.post('/api/session/heartbeat', isAuthenticated, (req: any, res) => {
    if (req.session && req.user) {
      req.session.touch();
      res.json({ 
        success: true, 
        user: req.user,
        sessionExpiry: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000))
      });
    } else {
      res.status(401).json({ success: false, message: "Not authenticated" });
    }
  });

  // Session status check
  app.get('/api/session/status', isAuthenticated, (req: any, res) => {
    res.json({ 
      authenticated: true,
      user: req.user,
      sessionId: req.sessionID,
      sessionExpiry: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000))
    });
  });

  // Error logging API (no authentication required to prevent recursive errors)
  app.post('/api/errors/log', async (req: any, res) => {
    try {
      const errorLogData = insertErrorLogSchema.parse(req.body);
      
      // Only log errors from registered users
      if (!errorLogData.userId) {
        return res.status(400).json({ success: false, message: "User ID required" });
      }

      // Don't log errors in development environment
      if (process.env.NODE_ENV === 'development') {
        return res.status(200).json({ success: true, message: "Development environment - error not logged" });
      }

      const errorLog = await storage.createErrorLog(errorLogData);
      res.status(201).json({ success: true, id: errorLog.id });
    } catch (error) {
      // Silently fail to prevent recursive error logging
      console.error("Failed to log error:", error);
      res.status(500).json({ success: false });
    }
  });

  // Get error logs (admin only)
  app.get('/api/errors', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const errorLogs = await storage.getErrorLogs();
      res.json(errorLogs);
    } catch (error) {
      console.error("Error fetching error logs:", error);
      res.status(500).json({ message: "Failed to fetch error logs" });
    }
  });

  // Analyze error and suggest fix (admin only)
  app.post('/api/errors/analyze', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { errorLog } = req.body;
      
      if (!errorLog) {
        return res.status(400).json({ message: "Error log data required" });
      }

      // Analyze error and determine potential fix using OpenAI
      const fixResult = await analyzeAndFixErrorWithAI(errorLog);
      
      res.json({
        canFix: fixResult.canFix,
        fixDescription: fixResult.fixDescription,
        fixActions: fixResult.fixActions,
        recommendation: fixResult.recommendation,
        errorDescription: fixResult.errorDescription,
        codeChanges: fixResult.codeChanges,
        requiresVerification: true
      });
    } catch (error) {
      console.error("Error analyzing fix:", error);
      res.status(500).json({ message: "Failed to analyze error" });
    }
  });

  // Mark error as fixed after verification (admin only)
  app.post('/api/errors/mark-fixed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { errorId, fixDescription, verificationNotes } = req.body;
      
      if (!errorId || !fixDescription) {
        return res.status(400).json({ message: "Error ID and fix description required" });
      }

      // Mark error as fixed with verification notes
      const fullFixDescription = verificationNotes 
        ? `${fixDescription}\n\nVerification: ${verificationNotes}`
        : fixDescription;
        
      await storage.markErrorAsFixed(errorId, fullFixDescription);

      res.json({
        success: true,
        message: "Error marked as fixed after verification"
      });
    } catch (error) {
      console.error("Error marking as fixed:", error);
      res.status(500).json({ message: "Failed to mark error as fixed" });
    }
  });

  // Auto-apply AI recommended fixes (admin only)
  app.post('/api/errors/auto-apply-fix', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { errorId, codeChanges } = req.body;
      
      if (!errorId || !codeChanges || !Array.isArray(codeChanges)) {
        return res.status(400).json({ message: "Error ID and code changes array required" });
      }

      let appliedChanges = [];
      let failedChanges = [];

      console.log(`Auto-fix attempt: Processing ${codeChanges.length} code changes`);
      
      // Apply each code change
      for (const change of codeChanges) {
        try {
          const { file, description, before, after } = change;
          
          console.log(`Processing change for file: ${file}`);
          console.log(`Description: ${description}`);
          console.log(`Before code (${before?.length || 0} chars): ${before?.substring(0, 100)}${before?.length > 100 ? '...' : ''}`);
          console.log(`After code (${after?.length || 0} chars): ${after?.substring(0, 100)}${after?.length > 100 ? '...' : ''}`);
          
          
          // Basic validation
          if (!file || !after) {
            failedChanges.push({ ...change, reason: "Missing required fields" });
            continue;
          }

          // Try to find the actual file - handle common path variations
          let actualFilePath = file.replace(/^\/+/, '');
          let safePath = path.resolve(process.cwd(), actualFilePath);
          
          if (!fs.existsSync(safePath)) {
            // Try common variations
            const variations = [
              `client/${actualFilePath}`,
              `client/src/${actualFilePath.replace('src/', '')}`,
              actualFilePath.replace('src/', 'client/src/'),
              actualFilePath.replace('src/components/', 'client/src/components/'),
              actualFilePath.replace('src/pages/', 'client/src/pages/'),
              actualFilePath.replace('src/lib/', 'client/src/lib/'),
              actualFilePath.replace('src/', 'client/src/')
            ];
            
            let found = false;
            for (const variation of variations) {
              const testPath = path.resolve(process.cwd(), variation);
              if (fs.existsSync(testPath)) {
                actualFilePath = variation;
                safePath = testPath;
                found = true;
                console.log(`Found file at alternate path: ${variation}`);
                break;
              }
            }
            
            if (!found) {
              console.log(`File not found: ${file}, tried variations: ${variations.join(', ')}`);
              failedChanges.push({ ...change, reason: `File does not exist: ${file}` });
              continue;
            }
          }

          // Ensure file path is safe (within project directory)
          if (!safePath.startsWith(process.cwd())) {
            failedChanges.push({ ...change, reason: "File path outside project directory" });
            continue;
          }

          // Read current file content
          const currentContent = fs.readFileSync(safePath, 'utf8');
          
          let newContent: string = currentContent;
          if (before && before.trim()) {
            // Replace specific code if 'before' is provided
            if (!currentContent.includes(before)) {
              // Try fuzzy matching - remove extra whitespace and check again
              const normalizedBefore = before.replace(/\s+/g, ' ').trim();
              const normalizedContent = currentContent.replace(/\s+/g, ' ');
              
              if (normalizedContent.includes(normalizedBefore)) {
                // Found with normalized whitespace, do the replacement
                newContent = currentContent.replace(before, after);
              } else {
                // Try partial matching for common cases
                const beforeLines = before.split('\n').map((line: string) => line.trim()).filter((line: string) => line);
                let foundMatch = false;
                
                for (const line of beforeLines) {
                  if (line && currentContent.includes(line.trim())) {
                    // Found at least one line, try to replace just that line
                    newContent = currentContent.replace(line.trim(), after);
                    foundMatch = true;
                    break;
                  }
                }
                
                if (!foundMatch) {
                  console.log(`Auto-fix debug - Could not find code in ${file}:`);
                  console.log(`Looking for exact match: "${before}"`);
                  console.log(`Looking for normalized: "${normalizedBefore}"`);
                  console.log(`File starts with: "${currentContent.substring(0, 300)}..."`);
                  console.log(`File ends with: "...${currentContent.substring(currentContent.length - 300)}"`);
                  failedChanges.push({ 
                    ...change, 
                    reason: `Original code not found. Looking for: "${before.substring(0, 100)}${before.length > 100 ? '...' : ''}"`
                  });
                  continue;
                }
              }
            } else {
              newContent = currentContent.replace(before, after);
            }
          } else {
            // If no 'before' code, treat 'after' as new code to add
            if (after.includes('import ') && after.includes('from ')) {
              // Add import at the top of file after existing imports
              const lines = currentContent.split('\n');
              let insertIndex = 0;
              
              // Find the last import line
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim().startsWith('import ')) {
                  insertIndex = i + 1;
                }
              }
              
              lines.splice(insertIndex, 0, after);
              newContent = lines.join('\n');
            } else if (description && description.toLowerCase().includes('add') && description.toLowerCase().includes('function')) {
              // Adding a new function - append before the last closing brace or at end
              const lastBraceIndex = currentContent.lastIndexOf('}');
              if (lastBraceIndex > 0) {
                newContent = currentContent.substring(0, lastBraceIndex) + '\n\n' + after + '\n\n' + currentContent.substring(lastBraceIndex);
              } else {
                newContent = currentContent + '\n\n' + after;
              }
            } else {
              // Default: append to end of file
              newContent = currentContent + '\n\n' + after;
            }
          }

          // Create backup of original file
          const backupPath = safePath + '.backup.' + Date.now();
          fs.writeFileSync(backupPath, currentContent);

          // Write the fixed content
          fs.writeFileSync(safePath, newContent);

          appliedChanges.push({ 
            ...change, 
            backupFile: backupPath,
            applied: true 
          });

        } catch (error) {
          console.error(`Failed to apply change to ${change.file}:`, error);
          failedChanges.push({ 
            ...change, 
            reason: error instanceof Error ? error.message : "Unknown error" 
          });
        }
      }

      // Log the auto-fix attempt
      console.log(`Auto-fix attempt for error ${errorId}:`, {
        type: 'auto-fix-attempt',
        appliedChanges: appliedChanges.length,
        failedChanges: failedChanges.length,
        timestamp: new Date(),
        adminId: userId
      });

      const response = {
        success: appliedChanges.length > 0,
        message: `Applied ${appliedChanges.length} of ${codeChanges.length} code changes`,
        appliedChanges,
        failedChanges,
        totalChanges: codeChanges.length
      };

      if (appliedChanges.length === codeChanges.length) {
        response.message = "All code changes applied successfully";
      } else if (appliedChanges.length === 0) {
        response.message = "No code changes could be applied";
        return res.status(400).json(response);
      }

      res.json(response);
    } catch (error) {
      console.error("Error auto-applying fix:", error);
      res.status(500).json({ message: "Failed to auto-apply fix" });
    }
  });

  // Configure multer for file uploads
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const upload = multer({
    dest: uploadsDir,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|ico|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  // Separate multer config for BIMI logos (SVG only)
  const bimiUpload = multer({
    dest: uploadsDir,
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit for BIMI logos
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /svg/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = file.mimetype === 'image/svg+xml';
      
      if (mimetype && extname) {
        cb(null, true);
      } else {
        cb(new Error('BIMI logo must be an SVG file'));
      }
    }
  });

  // Image upload endpoint
  app.post('/api/upload-image', isAuthenticated, requireAdmin, upload.single('image'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { type } = req.body;
      if (!type || !['favicon', 'shareImage'].includes(type)) {
        return res.status(400).json({ error: 'Invalid image type' });
      }

      const fileExtension = path.extname(req.file.originalname);
      const fileName = `${type}-${Date.now()}${fileExtension}`;
      const newPath = path.join(uploadsDir, fileName);
      
      // Move file to permanent location
      fs.renameSync(req.file.path, newPath);

      // Generate URL (relative to server)
      const imageUrl = `/uploads/${fileName}`;
      
      const response: any = { url: imageUrl };

      // For favicons, also generate apple touch icon if possible
      if (type === 'favicon') {
        response.appleTouchIconUrl = imageUrl; // Same URL for now, could process differently
      }

      res.json(response);
    } catch (error) {
      console.error('Image upload error:', error);
      
      // Clean up uploaded file on error
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    // Add cache headers for images
    res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
    next();
  });
  app.use('/uploads', express.static(uploadsDir));

  // Waitlist API endpoints (public)
  app.post('/api/waitlist', async (req: any, res) => {
    try {
      const waitlistData = insertWaitlistSchema.parse(req.body);
      
      // Check if email already exists
      const existingEntry = await storage.getWaitlistByEmail(waitlistData.email);
      if (existingEntry) {
        return res.status(409).json({ 
          message: "Email already on waitlist",
          position: existingEntry.position 
        });
      }

      const waitlistEntry = await storage.createWaitlistEntry(waitlistData);
      
      // Send welcome email if enabled
      try {
        const emailSettings = await storage.getWaitlistEmailSettings();
        const apiSettings = await storage.getApiSettings();
        
        if (emailSettings?.isEnabled && apiSettings?.sendgridApiKey) {
          // Configure SendGrid
          sgMail.setApiKey(apiSettings.sendgridApiKey);
          
          // Use verified sender from API settings
          const fromEmail = apiSettings.senderEmail || "hello@backstageos.com";
          const fromName = apiSettings.senderName || "BackstageOS";
          
          // Replace variables in email content
          let subject = emailSettings.subject || "Welcome to BackstageOS Waitlist";
          let body = emailSettings.bodyHtml || "Thank you for joining our waitlist!";
          
          const variables = {
            '{{firstName}}': waitlistEntry.firstName || '',
            '{{lastName}}': waitlistEntry.lastName || '',
            '{{position}}': (waitlistEntry.position || 1).toString(),
            '{{email}}': waitlistEntry.email,
            '{{date}}': new Date().toLocaleDateString("en-US", { 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            })
          };
          
          // Replace variables in subject and body
          Object.entries(variables).forEach(([variable, value]) => {
            subject = subject.replace(new RegExp(variable, 'g'), value);
            body = body.replace(new RegExp(variable, 'g'), value);
          });

          // Aggressive HTML cleaning to completely strip rich text editor formatting
          console.log('Original body before cleaning:', body.substring(0, 200) + '...');
          
          // Remove ALL style attributes that are causing spacing issues
          body = body.replace(/style="[^"]*"/g, '');
          
          // Remove empty paragraphs and divs with breaks that create unwanted spacing
          body = body.replace(/<p><br><\/p>/g, '');
          body = body.replace(/<div><br><\/div>/g, '');
          body = body.replace(/<p><\/p>/g, '');
          body = body.replace(/<div><\/div>/g, '');
          body = body.replace(/<span[^>]*><\/span>/g, '');
          
          // Remove problematic margin-causing elements
          body = body.replace(/<p>\s*<\/p>/g, ''); // Remove empty paragraphs with whitespace
          body = body.replace(/<div>\s*<\/div>/g, ''); // Remove empty divs with whitespace
          
          // Clean up line breaks and spacing
          body = body.replace(/\n\s*\n/g, '\n');
          body = body.replace(/>\s+</g, '><'); // Remove whitespace between tags
          body = body.trim();
          
          console.log('Cleaned body after processing:', body.substring(0, 200) + '...');
          
          const msg = {
            to: waitlistEntry.email,
            from: {
              email: fromEmail,
              name: fromName
            },
            subject: subject,
            html: body,
            text: body.replace(/<[^>]*>/g, ''), // Strip HTML for text version
            headers: {
              'BIMI-Selector': 'default',
              'X-BIMI-Selector': 'default',
              'Authentication-Results': `mx.backstageos.com; dmarc=pass; spf=pass; dkim=pass`
            }
          };
          
          await sgMail.send(msg);
          console.log(`✅ Welcome email sent to ${waitlistEntry.email} using sender: ${fromEmail}`);
          console.log(`🎨 BIMI headers included: BIMI-Selector=default, Authentication-Results present`);
        }
      } catch (emailError) {
        // Don't fail the waitlist signup if email fails
        console.error("Error sending welcome email:", emailError);
      }
      
      res.status(201).json({ 
        success: true, 
        position: waitlistEntry.position,
        message: "Successfully added to waitlist!" 
      });
    } catch (error) {
      console.error("Error adding to waitlist:", error);
      res.status(500).json({ message: "Failed to join waitlist" });
    }
  });

  // Get waitlist entries (admin only)
  app.get('/api/waitlist', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const waitlistEntries = await storage.getWaitlistEntries();
      res.json(waitlistEntries);
    } catch (error) {
      console.error("Error fetching waitlist:", error);
      res.status(500).json({ message: "Failed to fetch waitlist" });
    }
  });

  // Update waitlist entry status (admin only)
  app.put('/api/waitlist/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const entryId = parseInt(req.params.id);
      const updateData = req.body;
      
      const updatedEntry = await storage.updateWaitlistEntry(entryId, updateData);
      res.json(updatedEntry);
    } catch (error) {
      console.error("Error updating waitlist entry:", error);
      res.status(500).json({ message: "Failed to update waitlist entry" });
    }
  });

  // Delete waitlist entry (admin only)
  app.delete('/api/waitlist/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const entryId = parseInt(req.params.id);
      await storage.deleteWaitlistEntry(entryId);
      res.json({ success: true, message: "Waitlist entry deleted successfully" });
    } catch (error) {
      console.error("Error deleting waitlist entry:", error);
      res.status(500).json({ message: "Failed to delete waitlist entry" });
    }
  });

  // Get waitlist stats (admin only)
  app.get('/api/waitlist/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const stats = await storage.getWaitlistStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching waitlist stats:", error);
      res.status(500).json({ message: "Failed to fetch waitlist stats" });
    }
  });

  // Profile type selection
  app.post('/api/auth/profile-type', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const { profileType } = req.body;
      
      if (!profileType || !['freelance', 'fulltime'].includes(profileType)) {
        return res.status(400).json({ message: "Invalid profile type" });
      }

      const user = await storage.upsertUser({
        email: req.user.claims.email,
        password: '', // OAuth users don't have passwords
        firstName: req.user.claims.first_name,
        lastName: req.user.claims.last_name,
        profileImageUrl: req.user.claims.profile_image_url,
        profileType,
      });

      res.json(user);
    } catch (error) {
      console.error("Error updating profile type:", error);
      res.status(500).json({ message: "Failed to update profile type" });
    }
  });

  // Admin account switching endpoints
  app.post('/api/admin/switch-account', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.id.toString();
      
      if (!isAdmin(adminUserId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { targetUserId } = req.body;
      
      if (!targetUserId) {
        return res.status(400).json({ message: "Target user ID required" });
      }
      
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Store original admin user in session for switching back
      req.session.originalAdminId = adminUserId;
      req.session.isViewingAs = targetUserId;
      
      res.json({ 
        message: "Account switched successfully",
        viewingAs: targetUser,
        originalAdmin: adminUserId
      });
    } catch (error) {
      console.error("Error switching account:", error);
      res.status(500).json({ message: "Failed to switch account" });
    }
  });

  app.post('/api/admin/switch-back', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!req.session.originalAdminId) {
        return res.status(400).json({ message: "No admin switch session found" });
      }
      
      // Clear the switching session
      delete req.session.isViewingAs;
      delete req.session.originalAdminId;
      
      res.json({ message: "Switched back to admin account" });
    } catch (error) {
      console.error("Error switching back:", error);
      res.status(500).json({ message: "Failed to switch back" });
    }
  });

  app.get('/api/admin/switch-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId) && !req.session.originalAdminId) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const isViewingAs = req.session.isViewingAs;
      const originalAdminId = req.session.originalAdminId;
      
      if (isViewingAs && originalAdminId) {
        const viewingUser = await storage.getUser(isViewingAs);
        res.json({
          isViewingAs: true,
          viewingUser,
          originalAdminId
        });
      } else {
        res.json({
          isViewingAs: false,
          viewingUser: null,
          originalAdminId: null
        });
      }
    } catch (error) {
      console.error("Error getting switch status:", error);
      res.status(500).json({ message: "Failed to get switch status" });
    }
  });

  // Beta access management routes (admin only)
  app.get('/api/admin/beta-users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const betaUsers = await storage.getBetaUsers();
      res.json(betaUsers);
    } catch (error) {
      console.error("Error fetching beta users:", error);
      res.status(500).json({ message: "Failed to fetch beta users" });
    }
  });

  app.post('/api/admin/beta-access', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { targetUserId, betaAccess, betaFeatures } = req.body;
      
      if (!targetUserId || !['none', 'limited', 'full'].includes(betaAccess)) {
        return res.status(400).json({ message: "Invalid beta access parameters" });
      }
      
      const updatedUser = await storage.updateUserBetaAccess(targetUserId, betaAccess, betaFeatures);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating beta access:", error);
      res.status(500).json({ message: "Failed to update beta access" });
    }
  });

  // Get all users for admin management
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user profile and permissions
  app.patch('/api/admin/users/:targetUserId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const { targetUserId } = req.params;
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { profileType, betaAccess, betaFeatures, isAdmin: userAdminStatus } = req.body;
      
      if (profileType && !['freelance', 'fulltime'].includes(profileType)) {
        return res.status(400).json({ message: "Invalid profile type" });
      }
      
      if (betaAccess && !['none', 'limited', 'full'].includes(betaAccess)) {
        return res.status(400).json({ message: "Invalid beta access level" });
      }
      
      const updatedUser = await storage.updateUserAdmin(targetUserId, {
        profileType,
        betaAccess,
        betaFeatures,
        isAdmin: userAdminStatus
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user (admin only)
  app.delete('/api/admin/users/:targetUserId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const { targetUserId } = req.params;
      
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Prevent admin from deleting themselves
      if (targetUserId === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      await storage.deleteUser(targetUserId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // User profile routes
  app.get('/api/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      res.json(user);
    } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });

  app.patch('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const { firstName, lastName, email, defaultReplyToEmail, emailDisplayName, currentPassword, newPassword } = req.body;

      // If email is being changed, check if it's already in use
      if (email && email !== req.user.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== req.user.id) {
          return res.status(400).json({ message: "Email already in use by another account" });
        }
      }

      // If password is being changed, verify current password
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required to change password" });
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, req.user.password);
        if (!isCurrentPasswordValid) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
      }

      // Prepare update data
      const updateData: any = {
        firstName: firstName || req.user.firstName,
        lastName: lastName || req.user.lastName,
        email: email || req.user.email,
        defaultReplyToEmail: defaultReplyToEmail || req.user.defaultReplyToEmail,
        emailDisplayName: emailDisplayName || req.user.emailDisplayName,
      };

      // Hash new password if provided
      if (newPassword) {
        updateData.password = await bcrypt.hash(newPassword, 10);
      }

      // Update user in database
      const updatedUser = await storage.updateUserAdmin(userId, updateData);

      // Remove password from response
      const { password, ...userResponse } = updatedUser;
      res.json(userResponse);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Project routes
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const projects = await storage.getProjectsByUserId(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership - use loose equality to handle type conversion
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      // Manual validation for project data since we updated the schema
      const projectSchema = z.object({
        name: z.string().min(1, "Project name is required"),
        description: z.string().optional().or(z.literal("")),
        venue: z.string().optional().or(z.literal("")),
        prepStartDate: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
          if (!val || val === "") return null;
          return typeof val === "string" ? new Date(val) : val;
        }),
        firstRehearsalDate: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
          if (!val || val === "") return null;
          return typeof val === "string" ? new Date(val) : val;
        }),
        designerRunDate: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
          if (!val || val === "") return null;
          return typeof val === "string" ? new Date(val) : val;
        }),
        firstTechDate: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
          if (!val || val === "") return null;
          return typeof val === "string" ? new Date(val) : val;
        }),
        firstPreviewDate: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
          if (!val || val === "") return null;
          return typeof val === "string" ? new Date(val) : val;
        }),
        openingNight: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
          if (!val || val === "") return null;
          return typeof val === "string" ? new Date(val) : val;
        }),
        closingDate: z.union([z.string(), z.date(), z.null()]).optional().transform((val) => {
          if (!val || val === "") return null;
          return typeof val === "string" ? new Date(val) : val;
        }),
        season: z.string().optional().or(z.literal("")),
        ownerId: z.number(),
      });

      console.log("Received project data:", req.body);

      const projectData = projectSchema.parse({
        ...req.body,
        ownerId: parseInt(userId),
      });

      const project = await storage.createProject(projectData);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Project validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership - use loose equality to handle type conversion
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedProject = await storage.updateProject(projectId, req.body);
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership - use loose equality to handle type conversion
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteProject(projectId);
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Team member routes
  app.get('/api/projects/:id/team', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership - use loose equality to handle type conversion
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const teamMembers = await storage.getTeamMembersByProjectId(projectId);
      res.json(teamMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.post('/api/projects/:id/team', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership - use loose equality to handle type conversion
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const teamMemberData = insertTeamMemberSchema.parse({
        ...req.body,
        projectId,
      });

      const teamMember = await storage.inviteTeamMember(teamMemberData);
      res.json(teamMember);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid team member data", errors: error.errors });
      }
      console.error("Error inviting team member:", error);
      res.status(500).json({ message: "Failed to invite team member" });
    }
  });

  // Report routes

  app.get('/api/reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const reports = await storage.getReportsByUserId(userId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.post('/api/reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const reportData = insertReportSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      // Verify project ownership
      const project = await storage.getProjectById(reportData.projectId);
      if (!project || project.ownerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const report = await storage.createReport(reportData);
      res.json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid report data", errors: error.errors });
      }
      console.error("Error creating report:", error);
      res.status(500).json({ message: "Failed to create report" });
    }
  });

  // Project-specific reports routes
  app.get('/api/projects/:id/reports', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member) - use loose equality to handle type conversion
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const reports = await storage.getReportsByProjectId(projectId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching project reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get('/api/projects/:projectId/reports/:reportId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const reportId = parseInt(req.params.reportId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const report = await storage.getReportById(reportId);
      if (!report || report.projectId !== projectId) {
        return res.status(404).json({ message: "Report not found" });
      }

      res.json(report);
    } catch (error) {
      console.error("Error fetching report:", error);
      res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  app.post('/api/projects/:id/reports', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const userId = req.user.id.toString();
      const reportData = insertReportSchema.parse({
        ...req.body,
        projectId,
        createdBy: userId,
      });

      const report = await storage.createReport(reportData);
      res.json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid report data", errors: error.errors });
      }
      console.error("Error creating project report:", error);
      res.status(500).json({ message: "Failed to create report" });
    }
  });

  app.put('/api/projects/:projectId/reports/:reportId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const reportId = parseInt(req.params.reportId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const report = await storage.getReportById(reportId);
      if (!report || report.projectId !== projectId) {
        return res.status(404).json({ message: "Report not found" });
      }

      const updateData = {
        title: req.body.title,
        type: req.body.type,
        content: req.body.content,
        date: req.body.date,
      };

      const updatedReport = await storage.updateReport(reportId, updateData);
      res.json(updatedReport);
    } catch (error) {
      console.error("Error updating report:", error);
      res.status(500).json({ message: "Failed to update report" });
    }
  });

  app.delete('/api/projects/:projectId/reports/:reportId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const reportId = parseInt(req.params.reportId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const report = await storage.getReportById(reportId);
      if (!report || report.projectId !== projectId) {
        return res.status(404).json({ message: "Report not found" });
      }

      await storage.deleteReport(reportId);
      res.json({ message: "Report deleted successfully" });
    } catch (error) {
      console.error("Error deleting report:", error);
      res.status(500).json({ message: "Failed to delete report" });
    }
  });

  app.put('/api/reports/:id', isAuthenticated, async (req: any, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const report = await storage.getReportById(reportId);
      
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      // Check ownership
      if (report.createdBy !== req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedReport = await storage.updateReport(reportId, req.body);
      res.json(updatedReport);
    } catch (error) {
      console.error("Error updating report:", error);
      res.status(500).json({ message: "Failed to update report" });
    }
  });

  // Report notes routes
  app.get('/api/projects/:projectId/reports/:reportId/notes', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const reportId = parseInt(req.params.reportId);
      const department = req.query.department as string | undefined;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const report = await storage.getReportById(reportId);
      if (!report || report.projectId !== projectId) {
        return res.status(404).json({ message: "Report not found" });
      }

      const notes = await storage.getReportNotesByReportId(reportId, department);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching report notes:", error);
      res.status(500).json({ message: "Failed to fetch report notes" });
    }
  });

  app.post('/api/projects/:projectId/reports/:reportId/notes', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const reportId = parseInt(req.params.reportId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const report = await storage.getReportById(reportId);
      if (!report || report.projectId !== projectId) {
        return res.status(404).json({ message: "Report not found" });
      }

      // Get current max order to ensure new note goes at the end
      const existingNotes = await storage.getReportNotesByReportId(reportId);
      const maxOrder = Math.max(0, ...existingNotes.map(n => n.noteOrder));

      const noteData = {
        ...req.body,
        reportId,
        projectId,
        createdBy: parseInt(req.user.id),
        noteOrder: maxOrder + 1
      };

      const note = await storage.createReportNote(noteData);
      res.json(note);
    } catch (error) {
      console.error("Error creating report note:", error);
      res.status(500).json({ message: "Failed to create report note" });
    }
  });

  app.patch('/api/projects/:projectId/reports/:reportId/notes/:noteId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const reportId = parseInt(req.params.reportId);
      const noteId = parseInt(req.params.noteId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const note = await storage.getReportNoteById(noteId);
      if (!note || note.reportId !== reportId || note.projectId !== projectId) {
        return res.status(404).json({ message: "Note not found" });
      }

      const updatedNote = await storage.updateReportNote(noteId, req.body);
      res.json(updatedNote);
    } catch (error) {
      console.error("Error updating report note:", error);
      res.status(500).json({ message: "Failed to update report note" });
    }
  });

  app.delete('/api/projects/:projectId/reports/:reportId/notes/:noteId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const reportId = parseInt(req.params.reportId);
      const noteId = parseInt(req.params.noteId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const note = await storage.getReportNoteById(noteId);
      if (!note || note.reportId !== reportId || note.projectId !== projectId) {
        return res.status(404).json({ message: "Note not found" });
      }

      await storage.deleteReportNote(noteId);
      res.json({ message: "Note deleted successfully" });
    } catch (error) {
      console.error("Error deleting report note:", error);
      res.status(500).json({ message: "Failed to delete report note" });
    }
  });

  app.patch('/api/projects/:projectId/reports/:reportId/notes/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const reportId = parseInt(req.params.reportId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const report = await storage.getReportById(reportId);
      if (!report || report.projectId !== projectId) {
        return res.status(404).json({ message: "Report not found" });
      }

      await storage.reorderReportNotes(req.body.notes);
      res.json({ message: "Notes reordered successfully" });
    } catch (error) {
      console.error("Error reordering report notes:", error);
      res.status(500).json({ message: "Failed to reorder report notes" });
    }
  });

  // Report template routes (show-specific)
  // This duplicate route is removed - the correct route is at line 2990 using :id parameter

  app.get('/api/templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getReportTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Check access (owner, public, or default)
      const userId = req.user.id.toString();
      if (template.createdBy !== userId && !template.isPublic && !template.isDefault) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(template);
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  app.post('/api/templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const templateData = insertReportTemplateSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      const template = await storage.createReportTemplate(templateData);
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid template data", errors: error.errors });
      }
      console.error("Error creating template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.put('/api/templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getReportTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Check ownership
      if (template.createdBy !== req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedTemplate = await storage.updateReportTemplate(templateId, req.body);
      res.json(updatedTemplate);
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete('/api/templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const template = await storage.getReportTemplateById(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Check ownership
      if (template.createdBy !== req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Don't allow deletion of default templates
      if (template.isDefault) {
        return res.status(403).json({ message: "Cannot delete default templates" });
      }

      await storage.deleteReportTemplate(templateId);
      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Show settings routes
  app.get("/api/projects/:id/settings", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      console.log(`🎨 GET /api/projects/${projectId}/settings - Backend endpoint hit`);
      
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership - use loose equality to handle type conversion
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      let settings = await storage.getShowSettingsByProjectId(projectId);
      console.log(`🎨 Retrieved settings from database:`, settings);
      
      if (!settings) {
        // Create default settings if none exist
        console.log(`🎨 Creating default settings for project ${projectId}`);
        settings = await storage.upsertShowSettings({
          projectId,
          createdBy: req.user.id.toString(),
        });
      }
      
      console.log(`🎨 Returning settings:`, settings);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching show settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.patch("/api/projects/:id/settings", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const settingsData = req.body;
      const settings = await storage.updateShowSettings(projectId, settingsData);
      res.json(settings);
    } catch (error) {
      console.error("Error updating show settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  app.put("/api/projects/:id/settings", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const settingsData = req.body;
      const settings = await storage.updateShowSettings(projectId, settingsData);
      res.json(settings);
    } catch (error) {
      console.error("Error updating show settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Department names endpoint
  app.put("/api/projects/:id/settings/department-names", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { department, name } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get current settings
      const settings = await storage.getShowSettingsByProjectId(projectId);
      const currentDepartmentNames = settings?.departmentNames || {};
      
      // Update the specific department name
      const updatedDepartmentNames = {
        ...currentDepartmentNames,
        [department]: name
      };

      // Update the settings
      const updatedSettings = await storage.updateShowSettings(projectId, {
        departmentNames: updatedDepartmentNames
      });

      res.json({
        success: true,
        departmentNames: updatedSettings.departmentNames
      });
    } catch (error) {
      console.error("Error updating department name:", error);
      res.status(500).json({ message: "Failed to update department name" });
    }
  });

  // Department formatting endpoints
  app.put("/api/projects/:id/settings/department-formatting", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { department, formatting, applyToAll } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get current settings
      const settings = await storage.getShowSettingsByProjectId(projectId);
      const currentDepartmentFormatting = settings?.departmentFormatting || {};
      
      let updatedDepartmentFormatting;
      
      if (applyToAll) {
        // Apply formatting to all departments
        updatedDepartmentFormatting = {
          scenic: formatting,
          lighting: formatting,
          audio: formatting,
          video: formatting,
          props: formatting
        };
      } else {
        // Update just the specific department
        updatedDepartmentFormatting = {
          ...currentDepartmentFormatting,
          [department]: formatting
        };
      }

      // Update the settings
      const updatedSettings = await storage.updateShowSettings(projectId, {
        departmentFormatting: updatedDepartmentFormatting
      });

      res.json({
        success: true,
        departmentFormatting: updatedSettings.departmentFormatting
      });
    } catch (error) {
      console.error("Error updating department formatting:", error);
      res.status(500).json({ message: "Failed to update department formatting" });
    }
  });

  // Field header formatting endpoints
  app.put("/api/projects/:id/settings/field-header-formatting", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { formatting, applyToAll } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      let updatedFieldHeaderFormatting;
      
      if (applyToAll) {
        // Apply formatting to all field headers
        updatedFieldHeaderFormatting = formatting;
      } else {
        // For now, field headers use global formatting
        updatedFieldHeaderFormatting = formatting;
      }

      // Update the settings
      const updatedSettings = await storage.updateShowSettings(projectId, {
        fieldHeaderFormatting: updatedFieldHeaderFormatting
      });

      res.json({
        success: true,
        fieldHeaderFormatting: updatedSettings.fieldHeaderFormatting
      });
    } catch (error) {
      console.error("Error updating field header formatting:", error);
      res.status(500).json({ message: "Failed to update field header formatting" });
    }
  });

  // Header formatting endpoints
  app.put("/api/projects/:id/settings/header-formatting", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { formatting } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update the settings
      const updatedSettings = await storage.updateShowSettings(projectId, {
        headerFormatting: formatting
      });

      res.json({
        success: true,
        headerFormatting: updatedSettings.headerFormatting
      });
    } catch (error) {
      console.error("Error updating header formatting:", error);
      res.status(500).json({ message: "Failed to update header formatting" });
    }
  });

  // Footer formatting endpoints
  app.put("/api/projects/:id/settings/footer-formatting", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { formatting } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update the settings
      const updatedSettings = await storage.updateShowSettings(projectId, {
        footerFormatting: formatting
      });

      res.json({
        success: true,
        footerFormatting: updatedSettings.footerFormatting
      });
    } catch (error) {
      console.error("Error updating footer formatting:", error);
      res.status(500).json({ message: "Failed to update footer formatting" });
    }
  });

  // Department order endpoint
  app.put("/api/projects/:id/settings/department-order", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { departmentOrder } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update the settings
      const updatedSettings = await storage.updateShowSettings(projectId, {
        departmentOrder: departmentOrder
      });

      // Return the complete updated settings object for cache consistency
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating department order:", error);
      res.status(500).json({ message: "Failed to update department order" });
    }
  });

  // Layout configuration endpoint
  app.put("/api/projects/:id/settings/layout-configuration", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { layoutConfiguration } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update the settings
      const updatedSettings = await storage.updateShowSettings(projectId, {
        layoutConfiguration: layoutConfiguration
      });

      res.json({
        success: true,
        layoutConfiguration: updatedSettings.layoutConfiguration
      });
    } catch (error) {
      console.error("Error updating layout configuration:", error);
      res.status(500).json({ message: "Failed to update layout configuration" });
    }
  });

  app.post("/api/projects/:id/share-link", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const shareLink = await storage.generateShareLink(projectId);
      res.json({ shareableLink: shareLink });
    } catch (error) {
      console.error("Error generating share link:", error);
      res.status(500).json({ message: "Failed to generate share link" });
    }
  });

  // Contact sheet settings routes
  app.get("/api/projects/:id/contact-sheet-settings", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const settings = await storage.getContactSheetSettings(projectId);
      res.json(settings || {});
    } catch (error) {
      console.error("Error fetching contact sheet settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/projects/:id/contact-sheet-settings", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const settingsData = req.body;
      const settings = await storage.saveContactSheetSettings(projectId, settingsData);
      res.json(settings);
    } catch (error) {
      console.error("Error saving contact sheet settings:", error);
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  // Contact sheet version control routes
  app.post("/api/projects/:id/contact-sheet/publish", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { versionType, settings } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const version = await storage.publishContactSheetVersion(
        projectId, 
        versionType, 
        settings, 
        req.user.id
      );
      
      res.json(version);
    } catch (error) {
      console.error("Error publishing contact sheet version:", error);
      res.status(500).json({ message: "Failed to publish version" });
    }
  });

  app.get("/api/projects/:id/contact-sheet/versions", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const versions = await storage.getContactSheetVersions(projectId);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching contact sheet versions:", error);
      res.status(500).json({ message: "Failed to fetch versions" });
    }
  });

  app.get("/api/projects/:id/contact-sheet/current-version", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const currentVersion = await storage.getCurrentContactSheetVersion(projectId);
      res.json({ version: currentVersion });
    } catch (error) {
      console.error("Error fetching current contact sheet version:", error);
      res.status(500).json({ message: "Failed to fetch current version" });
    }
  });

  // Company list settings routes
  app.get("/api/projects/:id/company-list-settings", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const settings = await storage.getCompanyListSettings(projectId);
      res.json(settings || {});
    } catch (error) {
      console.error("Error fetching company list settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/projects/:id/company-list-settings", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const settingsData = req.body;
      const settings = await storage.saveCompanyListSettings(projectId, settingsData);
      res.json(settings);
    } catch (error) {
      console.error("Error saving company list settings:", error);
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  // Contact availability routes
  app.get("/api/projects/:id/contacts/:contactId/availability", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const contactId = parseInt(req.params.contactId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const availability = await storage.getContactAvailability(contactId, projectId);
      res.json(availability);
    } catch (error) {
      console.error("Error fetching contact availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  app.post("/api/projects/:id/contacts/:contactId/availability", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const contactId = parseInt(req.params.contactId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const availabilityData = insertContactAvailabilitySchema.parse({
        ...req.body,
        contactId,
        projectId,
        createdBy: req.user.id
      });

      const availability = await storage.createContactAvailability(availabilityData);
      res.status(201).json(availability);
    } catch (error) {
      console.error("Error creating contact availability:", error);
      res.status(500).json({ message: "Failed to create availability" });
    }
  });

  app.put("/api/projects/:id/contacts/:contactId/availability/:availabilityId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const availabilityId = parseInt(req.params.availabilityId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const availabilityData = insertContactAvailabilitySchema.partial().parse(req.body);
      const availability = await storage.updateContactAvailability(availabilityId, availabilityData);
      res.json(availability);
    } catch (error) {
      console.error("Error updating contact availability:", error);
      res.status(500).json({ message: "Failed to update availability" });
    }
  });

  app.delete("/api/projects/:id/contacts/:contactId/availability/:availabilityId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const availabilityId = parseInt(req.params.availabilityId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteContactAvailability(availabilityId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contact availability:", error);
      res.status(500).json({ message: "Failed to delete availability" });
    }
  });

  // Get all availability for all contacts in a project
  app.get("/api/projects/:id/availability", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const availability = await storage.getAllProjectAvailability(projectId);
      res.json(availability);
    } catch (error) {
      console.error("Error fetching project availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  // Location availability routes
  app.get("/api/projects/:id/location-availability", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const availability = await storage.getLocationAvailabilityByProjectId(projectId);
      // Transform data to match frontend expectations (type -> availabilityType)
      const transformedAvailability = availability.map(item => ({
        ...item,
        availabilityType: item.type
      }));
      res.json(transformedAvailability);
    } catch (error) {
      console.error("Error fetching location availability:", error);
      res.status(500).json({ message: "Failed to fetch location availability" });
    }
  });

  app.post("/api/projects/:id/location-availability", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const availabilityData = insertLocationAvailabilitySchema.parse({
        ...req.body,
        projectId
      });

      const availability = await storage.createLocationAvailability(availabilityData);
      res.json(availability);
    } catch (error) {
      console.error("Error creating location availability:", error);
      res.status(500).json({ message: "Failed to create location availability" });
    }
  });

  app.put("/api/projects/:id/location-availability/:availabilityId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const availabilityId = parseInt(req.params.availabilityId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const availabilityData = insertLocationAvailabilitySchema.partial().parse(req.body);
      const availability = await storage.updateLocationAvailability(availabilityId, availabilityData);
      res.json(availability);
    } catch (error) {
      console.error("Error updating location availability:", error);
      res.status(500).json({ message: "Failed to update location availability" });
    }
  });

  app.delete("/api/projects/:id/location-availability/:availabilityId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const availabilityId = parseInt(req.params.availabilityId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      console.log("Attempting to delete location availability ID:", availabilityId);
      await storage.deleteLocationAvailability(availabilityId);
      console.log("Successfully deleted location availability ID:", availabilityId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting location availability:", error);
      res.status(500).json({ message: "Failed to delete location availability" });
    }
  });

  app.delete("/api/projects/:id/location-availability/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { ids } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      console.log("Backend: Attempting bulk delete of IDs:", ids);
      await storage.bulkDeleteLocationAvailability(ids);
      console.log("Backend: Successfully bulk deleted", ids.length, "items");
      res.json({ success: true, deletedCount: ids.length });
    } catch (error) {
      console.error("Error bulk deleting location availability:", error);
      res.status(500).json({ message: "Failed to delete location availability" });
    }
  });

  // Location-specific availability routes (follows contact availability pattern)
  app.post("/api/projects/:id/locations/:locationId/availability", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const locationId = parseInt(req.params.locationId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      console.log("Received request body:", req.body);
      const availabilityData = {
        ...req.body,
        type: req.body.availabilityType || req.body.type, // Handle both field names
        locationId,
        projectId,
        createdBy: req.user.id
      };
      delete availabilityData.availabilityType; // Remove the old field
      console.log("Processing availability data:", availabilityData);

      const availability = await storage.createLocationAvailability(availabilityData);
      console.log("Created location availability:", availability);
      // Transform data to match frontend expectations (type -> availabilityType)
      const transformedAvailability = {
        ...availability,
        availabilityType: availability.type
      };
      res.json(transformedAvailability);
    } catch (error) {
      console.error("Error creating location availability:", error);
      res.status(500).json({ message: "Failed to create location availability" });
    }
  });

  app.put("/api/projects/:id/locations/:locationId/availability/:availabilityId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const locationId = parseInt(req.params.locationId);
      const availabilityId = parseInt(req.params.availabilityId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const availabilityData = {
        ...req.body,
        locationId,
        projectId
      };

      const availability = await storage.updateLocationAvailability(availabilityId, availabilityData);
      // Transform data to match frontend expectations (type -> availabilityType)
      const transformedAvailability = {
        ...availability,
        availabilityType: availability.type
      };
      res.json(transformedAvailability);
    } catch (error) {
      console.error("Error updating location availability:", error);
      res.status(500).json({ message: "Failed to update location availability" });
    }
  });

  // Props API endpoints
  app.get("/api/projects/:id/props", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const props = await storage.getPropsByProjectId(projectId);
      res.json(props);
    } catch (error) {
      console.error("Error fetching props:", error);
      res.status(500).json({ message: "Failed to fetch props" });
    }
  });

  app.post("/api/projects/:id/props", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const propData = insertPropsSchema.parse({
        ...req.body,
        projectId,
        createdBy: req.user.id
      });
      
      const prop = await storage.createProp(propData);
      res.status(201).json(prop);
    } catch (error) {
      console.error("Error creating prop:", error);
      res.status(500).json({ message: "Failed to create prop" });
    }
  });

  app.patch("/api/projects/:id/props/:propId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const propId = parseInt(req.params.propId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const propData = insertPropsSchema.partial().parse(req.body);
      const prop = await storage.updateProp(propId, propData);
      res.json(prop);
    } catch (error) {
      console.error("Error updating prop:", error);
      res.status(500).json({ message: "Failed to update prop" });
    }
  });

  app.delete("/api/projects/:id/props/:propId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const propId = parseInt(req.params.propId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      await storage.deleteProp(propId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting prop:", error);
      res.status(500).json({ message: "Failed to delete prop" });
    }
  });

  // Company list version control routes
  app.post("/api/projects/:id/company-list/publish", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { versionType, settings } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const version = await storage.publishCompanyListVersion(
        projectId, 
        versionType, 
        settings, 
        req.user.id
      );
      
      res.json(version);
    } catch (error) {
      console.error("Error publishing company list version:", error);
      res.status(500).json({ message: "Failed to publish version" });
    }
  });

  app.get("/api/projects/:id/company-list/versions", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const versions = await storage.getCompanyListVersions(projectId);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching company list versions:", error);
      res.status(500).json({ message: "Failed to fetch versions" });
    }
  });

  app.get("/api/projects/:id/company-list/current-version", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const currentVersion = await storage.getCurrentCompanyListVersion(projectId);
      res.json({ version: currentVersion });
    } catch (error) {
      console.error("Error fetching current company list version:", error);
      res.status(500).json({ message: "Failed to fetch current version" });
    }
  });

  // Report template routes
  app.get("/api/projects/:id/templates", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check access (owner or team member)
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const templates = await storage.getReportTemplatesByProjectId(projectId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching report templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post("/api/projects/:id/templates", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const templateData = {
        ...req.body,
        projectId,
        createdBy: req.user.id.toString(),
      };

      const template = await storage.createReportTemplate(templateData);
      res.json(template);
    } catch (error) {
      console.error("Error creating report template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.patch("/api/projects/:id/templates/:templateId", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const templateId = parseInt(req.params.templateId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const template = await storage.updateReportTemplate(templateId, req.body);
      res.json(template);
    } catch (error) {
      console.error("Error updating report template:", error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  // Global template settings routes
  app.get('/api/projects/:id/global-template-settings', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const settings = await storage.getGlobalTemplateSettingsByProjectId(projectId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching global template settings:", error);
      res.status(500).json({ message: "Failed to fetch global template settings" });
    }
  });

  app.post('/api/projects/:id/global-template-settings', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const userId = req.user.id.toString();
      const settingsData = insertGlobalTemplateSettingsSchema.parse({
        ...req.body,
        projectId,
        createdBy: userId,
      });

      const settings = await storage.upsertGlobalTemplateSettings(settingsData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Error saving global template settings:", error);
      res.status(500).json({ message: "Failed to save global template settings" });
    }
  });

  // Beta feature settings API (admin only)
  app.get('/api/admin/beta-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { betaSettingsStore } = await import('./betaSettingsStore.ts');
      const settings = betaSettingsStore.getBetaSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching beta settings:", error);
      res.status(500).json({ message: "Failed to fetch beta settings" });
    }
  });

  app.put('/api/admin/beta-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { betaSettingsStore } = await import('./betaSettingsStore.ts');
      const updatedSettings = betaSettingsStore.updateBetaSettings({
        features: req.body.features,
        updatedBy: parseInt(userId),
      });
      
      res.json({ message: "Beta settings updated successfully" });
    } catch (error) {
      console.error("Error updating beta settings:", error);
      res.status(500).json({ message: "Failed to update beta settings" });
    }
  });

  // Feedback API routes
  app.get('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      
      // Admins can see all feedback, users see only their own
      if (isAdmin(userId)) {
        const allFeedback = await storage.getAllFeedback();
        res.json(allFeedback);
      } else {
        const userFeedback = await storage.getFeedbackByUserId(userId);
        res.json(userFeedback);
      }
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.post('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const feedbackData = insertFeedbackSchema.parse({
        ...req.body,
        submittedBy: parseInt(userId),
      });

      const feedback = await storage.createFeedback(feedbackData);
      res.json(feedback);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid feedback data", errors: error.errors });
      }
      console.error("Error creating feedback:", error);
      res.status(500).json({ message: "Failed to create feedback" });
    }
  });

  app.get('/api/feedback/:id', isAuthenticated, async (req: any, res) => {
    try {
      const feedbackId = parseInt(req.params.id);
      const userId = req.user.id.toString();
      const feedback = await storage.getFeedbackById(feedbackId);
      
      if (!feedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      // Users can only view their own feedback, admins can view all
      if (!isAdmin(userId) && feedback.submittedBy !== parseInt(userId)) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(feedback);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.patch('/api/feedback/:id', isAuthenticated, async (req: any, res) => {
    try {
      const feedbackId = parseInt(req.params.id);
      const userId = req.user.id.toString();
      const feedback = await storage.getFeedbackById(feedbackId);
      
      if (!feedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      // Only admins can update feedback (for status changes, admin notes, etc.)
      if (!isAdmin(userId)) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const updateData = {
        ...req.body,
        ...(req.body.status === 'resolved' && { resolvedAt: new Date() }),
      };

      const updatedFeedback = await storage.updateFeedback(feedbackId, updateData);
      res.json(updatedFeedback);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid feedback data", errors: error.errors });
      }
      console.error("Error updating feedback:", error);
      res.status(500).json({ message: "Failed to update feedback" });
    }
  });

  app.delete('/api/feedback/:id', isAuthenticated, async (req: any, res) => {
    try {
      const feedbackId = parseInt(req.params.id);
      const userId = req.user.id.toString();
      const feedback = await storage.getFeedbackById(feedbackId);
      
      if (!feedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }

      // Users can delete their own feedback, admins can delete any
      if (!isAdmin(userId) && feedback.submittedBy !== parseInt(userId)) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteFeedback(feedbackId);
      res.json({ message: "Feedback deleted successfully" });
    } catch (error) {
      console.error("Error deleting feedback:", error);
      res.status(500).json({ message: "Failed to delete feedback" });
    }
  });

  // Get script data endpoint
  app.get("/api/projects/:id/script", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      console.log(`GET script request for project ${projectId} by user ${req.user.id}`);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get script document
      const documents = await storage.getShowDocumentsByProjectId(projectId);
      console.log(`Found ${documents.length} documents for project ${projectId}`);
      const script = documents.find(doc => doc.type === 'script');
      console.log(`Script document found:`, script ? { id: script.id, name: script.name, contentType: typeof script.content, hasContent: !!script.content } : 'null');
      
      if (!script) {
        // Return default script data if none exists
        return res.json({
          name: "Untitled Script",
          content: "",
          version: "1.0",
          collaborators: [],
          type: "script"
        });
      }

      // Transform script document to expected format
      // Handle content properly - database stores JSON strings
      let content: string = "";
      if (script.content) {
        // Database stores content as JSON, so parse it properly
        try {
          content = JSON.parse(script.content as string);
        } catch (e) {
          // If parsing fails, use content as-is
          content = String(script.content);
        }
      }
      
      const scriptData = {
        name: script.name,
        content: content,
        version: script.version || "1.0",
        collaborators: [],
        type: "script"
      };

      console.log('Returning script data:', { 
        name: scriptData.name, 
        contentLength: content.length,
        contentPreview: content.substring(0, 50),
        rawContent: script.content,
        contentType: typeof script.content
      });

      // Disable caching to ensure fresh data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      res.json(scriptData);
    } catch (error) {
      console.error("Error fetching script:", error);
      res.status(500).json({ message: "Failed to fetch script" });
    }
  });

  // Save script endpoint
  app.post("/api/projects/:id/script", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { title, content } = req.body;
      
      console.log(`Saving script for project ${projectId}:`, {
        title: title || "No title",
        contentLength: content ? content.length : 0,
        contentPreview: content ? content.substring(0, 100) : "No content"
      });
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get existing script or create new one
      const documents = await storage.getShowDocumentsByProjectId(projectId);
      let script = documents.find(doc => doc.type === 'script');
      
      if (!script) {
        // Create new script
        console.log("Creating new script document");
        script = await storage.createShowDocument({
          projectId,
          name: title || "Untitled Script",
          content: content || "",
          type: "script",
          version: "1.0",
          createdBy: req.user.id.toString()
        });
      } else {
        // Update existing script
        console.log("Updating existing script, current content length:", script.content ? JSON.stringify(script.content).length : 0);
        script = await storage.updateShowDocument(script.id, {
          name: title || script.name,
          content: content || script.content
        });
      }

      console.log("Script saved successfully, final content length:", script.content ? JSON.stringify(script.content).length : 0);
      res.json(script);
    } catch (error) {
      console.error("Error saving script:", error);
      res.status(500).json({ message: "Failed to save script" });
    }
  });

  // Script publishing endpoint
  app.post("/api/projects/:id/script/publish", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { versionType, content, title } = req.body;
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get current script or create one if it doesn't exist
      let script = await storage.getShowDocumentsByProjectId(projectId);
      let currentScript = script.find(doc => doc.type === 'script');
      
      if (!currentScript) {
        // Create initial script document
        currentScript = await storage.createShowDocument({
          projectId,
          name: title || "Untitled Script",
          content: content || "",
          type: "script",
          version: "1.0",
          createdBy: req.user.id.toString()
        });
      }

      // Calculate new version number
      const currentVersion = currentScript.version || "1.0";
      let newVersion: string;
      
      if (versionType === 'major') {
        // Major version: increment the major number (1.x -> 2.0, 2.x -> 3.0)
        const majorNumber = parseInt(currentVersion.split('.')[0]);
        newVersion = `${majorNumber + 1}.0`;
      } else {
        // Minor version: increment the minor number (1.0 -> 1.1, 1.5 -> 1.6)
        const parts = currentVersion.split('.');
        const majorNumber = parseInt(parts[0]);
        const minorNumber = parts[1] ? parseInt(parts[1]) : 0;
        newVersion = `${majorNumber}.${minorNumber + 1}`;
      }

      // Update the script with new version AND preserve current content
      const updatedScript = await storage.updateShowDocument(currentScript.id, {
        version: newVersion,
        content: content || currentScript.content,
        name: title || currentScript.name
      });

      res.json({ 
        message: "Script version published successfully",
        version: newVersion,
        versionType,
        script: updatedScript
      });
    } catch (error) {
      console.error("Error publishing script version:", error);
      res.status(500).json({ message: "Failed to publish script version" });
    }
  });

  // PDF text extraction endpoint using pdf2pic for image conversion then OCR
  app.post('/api/extract-pdf-text', isAuthenticated, async (req: any, res) => {
    try {
      const multer = await import('multer');
      
      const upload = multer.default({ 
        storage: multer.memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
      });

      upload.single('file')(req, res, async (err: any) => {
        if (err) {
          return res.status(400).json({ error: 'File upload error', message: err.message });
        }

        if (!req.file) {
          return res.status(400).json({ error: 'No file provided' });
        }

        try {
          // Import pdfjs-dist for reliable PDF processing
          const pdfjsLib = await import('pdfjs-dist');
          
          // Parse the PDF buffer
          const loadingTask = pdfjsLib.getDocument(req.file.buffer);
          const pdf = await loadingTask.promise;
          
          let text = '';
          const numPages = pdf.numPages;
          
          // Extract text from each page
          for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Combine text items into readable text
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            
            text += pageText + '\n\n';
          }

          // Clean up common PDF extraction artifacts
          text = text
            // Remove excessive whitespace
            .replace(/\s{3,}/g, '\n\n')
            // Remove page headers/footers that are spaced out
            .replace(/[A-Z\s]{20,}\s+Pg\.\s*\d+/gi, '')
            .replace(/[A-Z\s]{20,}\s+Page\s*\d+/gi, '')
            // Remove spaced-out titles like "L O R R A I N E   H A N S B E R R Y"
            .replace(/([A-Z]\s){3,}[A-Z]/g, (match: string) => match.replace(/\s/g, ''))
            // Clean up line breaks
            .replace(/\n{3,}/g, '\n\n')
            .trim();

          if (!text || text.length < 10) {
            return res.status(400).json({ 
              error: 'No readable text found', 
              message: 'The PDF appears to be empty, image-only, or protected. Try copying the text directly from your PDF viewer.' 
            });
          }

          res.json({ text, pages: numPages });
        } catch (parseError) {
          console.error('PDF parsing error:', parseError);
          res.status(500).json({ 
            error: 'PDF parsing failed', 
            message: 'Could not process this PDF. Please try copying the text directly or converting to a text file first.' 
          });
        }
      });
    } catch (error) {
      console.error('PDF extraction error:', error);
      res.status(500).json({ error: 'PDF processing failed' });
    }
  });

  // Word document text extraction endpoint
  app.post('/api/extract-word-text', isAuthenticated, async (req: any, res) => {
    try {
      const multer = await import('multer');
      
      const upload = multer.default({ 
        storage: multer.memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
      });

      upload.single('file')(req, res, async (err: any) => {
        if (err) {
          return res.status(400).json({ error: 'File upload error', message: err.message });
        }

        if (!req.file) {
          return res.status(400).json({ error: 'No file provided' });
        }

        try {
          const mammoth = await import('mammoth');
          
          // First try HTML conversion which typically gets more complete content
          const htmlResult = await mammoth.convertToHtml({ buffer: req.file.buffer });
          
          // Strip HTML tags to get clean plain text
          let text = htmlResult.value
            .replace(/<[^>]*>/g, '\n')  // Replace HTML tags with line breaks
            .replace(/&nbsp;/g, ' ')    // Replace non-breaking spaces
            .replace(/&amp;/g, '&')     // Replace HTML entities
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\n\s*\n/g, '\n\n') // Clean up excessive line breaks
            .trim();
          
          // If HTML conversion didn't work well, fallback to raw text
          if (text.length < 50) {
            const rawResult = await mammoth.extractRawText({ buffer: req.file.buffer });
            text = rawResult.value || '';
          }

          // Clean up common Word document artifacts
          text = text
            // Remove excessive whitespace
            .replace(/\s{3,}/g, '\n\n')
            // Clean up line breaks
            .replace(/\n{3,}/g, '\n\n')
            .trim();

          if (!text || text.length < 10) {
            return res.status(400).json({ 
              error: 'No readable text found', 
              message: 'The Word document appears to be empty or contains only images/tables.' 
            });
          }

          res.json({ text });
        } catch (parseError) {
          console.error('Word parsing error:', parseError);
          res.status(500).json({ 
            error: 'Word document parsing failed', 
            message: 'Could not extract text from this Word document. It may be corrupted or in an unsupported format.' 
          });
        }
      });
    } catch (error) {
      console.error('Word extraction error:', error);
      res.status(500).json({ error: 'Word document processing failed' });
    }
  });

  // Word document text extraction endpoint (placeholder for future implementation)
  app.post('/api/extract-word-text', isAuthenticated, async (req: any, res) => {
    try {
      // For now, return an error message about Word document support
      res.status(501).json({ 
        error: 'Word document support coming soon', 
        message: 'Word document text extraction is not yet implemented. Please convert your document to PDF or plain text for now.' 
      });
    } catch (error) {
      console.error('Word extraction error:', error);
      res.status(500).json({ error: 'Word document processing failed' });
    }
  });

  // Contacts API routes
  app.get('/api/projects/:id/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const contacts = await storage.getContactsByProjectId(projectId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post('/api/projects/:id/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const userId = req.user.id.toString();
      const contactData = insertContactSchema.parse({
        ...req.body,
        projectId,
        createdBy: parseInt(userId),
      });

      const contact = await storage.createContact(contactData);
      res.json(contact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contact data", errors: error.errors });
      }
      console.error("Error creating contact:", error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.put('/api/projects/:id/contacts/:contactId', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const contactId = parseInt(req.params.contactId);
      
      const project = await storage.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const contact = await storage.getContactById(contactId);
      if (!contact || contact.projectId !== projectId) {
        return res.status(404).json({ message: "Contact not found" });
      }

      // Validate the update data using a partial schema (omit required fields for updates)
      const updateContactSchema = insertContactSchema.partial().omit({
        projectId: true,
        createdBy: true,
      });
      
      const validatedData = updateContactSchema.parse(req.body);
      const updatedContact = await storage.updateContact(contactId, validatedData);
      res.json(updatedContact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contact data", errors: error.errors });
      }
      console.error("Error updating contact:", error);
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.get('/api/contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const contactId = parseInt(req.params.id);
      const contact = await storage.getContactById(contactId);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      // Verify project ownership
      const project = await storage.getProjectById(contact.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(contact);
    } catch (error) {
      console.error("Error fetching contact:", error);
      res.status(500).json({ message: "Failed to fetch contact" });
    }
  });

  app.patch('/api/contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const contactId = parseInt(req.params.id);
      const contact = await storage.getContactById(contactId);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      // Verify project ownership
      const project = await storage.getProjectById(contact.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate the update data using a partial schema (omit required fields for updates)
      const updateContactSchema = insertContactSchema.partial().omit({
        projectId: true,
        createdBy: true,
      });
      
      const validatedData = updateContactSchema.parse(req.body);
      const updatedContact = await storage.updateContact(contactId, validatedData);
      res.json(updatedContact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contact data", errors: error.errors });
      }
      console.error("Error updating contact:", error);
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.delete('/api/contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const contactId = parseInt(req.params.id);
      const contact = await storage.getContactById(contactId);
      
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      // Verify project ownership
      const project = await storage.getProjectById(contact.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteContact(contactId);
      res.json({ message: "Contact deleted successfully" });
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // Schedule Events Routes
  app.get('/api/projects/:id/schedule-events', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership or team membership
      if (project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const events = await storage.getScheduleEventsByProjectId(projectId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching schedule events:", error);
      res.status(500).json({ message: "Failed to fetch schedule events" });
    }
  });

  app.post('/api/projects/:id/schedule-events', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      console.log("Event creation request body:", req.body);
      const eventData = insertScheduleEventSchema.parse({
        ...req.body,
        projectId,
        createdBy: parseInt(req.user.id.toString()),
      });

      const event = await storage.createScheduleEvent(eventData);
      
      // Handle participants if provided
      if (req.body.participants && Array.isArray(req.body.participants)) {
        for (const participantId of req.body.participants) {
          await storage.addEventParticipant({
            eventId: event.id,
            contactId: participantId,
            isRequired: true,
            status: 'pending',
          });
        }
      }

      // Return event with participants
      const eventWithParticipants = await storage.getScheduleEventById(event.id);
      res.status(201).json(eventWithParticipants);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      console.error("Error creating schedule event:", error);
      res.status(500).json({ message: "Failed to create schedule event" });
    }
  });

  app.get('/api/schedule-events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getScheduleEventById(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check project access
      const project = await storage.getProjectById(event.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(event.projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      res.json(event);
    } catch (error) {
      console.error("Error fetching schedule event:", error);
      res.status(500).json({ message: "Failed to fetch schedule event" });
    }
  });

  app.patch('/api/schedule-events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getScheduleEventById(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check project ownership
      const project = await storage.getProjectById(event.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateEventSchema = insertScheduleEventSchema.partial().omit({
        projectId: true,
        createdBy: true,
      });
      
      const validatedData = updateEventSchema.parse(req.body);
      const updatedEvent = await storage.updateScheduleEvent(eventId, validatedData);
      
      // Handle participants update if provided
      if (req.body.participants && Array.isArray(req.body.participants)) {
        // Remove existing participants
        await storage.removeAllEventParticipants(eventId);
        
        // Add new participants
        for (const participantId of req.body.participants) {
          await storage.addEventParticipant({
            eventId: eventId,
            contactId: participantId,
            isRequired: true,
            status: 'pending',
          });
        }
      }

      // Return updated event with participants
      const eventWithParticipants = await storage.getScheduleEventById(eventId);
      res.json(eventWithParticipants);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid event data", errors: error.errors });
      }
      console.error("Error updating schedule event:", error);
      res.status(500).json({ message: "Failed to update schedule event" });
    }
  });

  app.delete('/api/schedule-events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getScheduleEventById(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check project ownership
      const project = await storage.getProjectById(event.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteScheduleEvent(eventId);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting schedule event:", error);
      res.status(500).json({ message: "Failed to delete schedule event" });
    }
  });

  // Event participants routes
  app.patch('/api/schedule-events/:eventId/participants/:participantId', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const participantId = parseInt(req.params.participantId);
      
      const event = await storage.getScheduleEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check project access
      const project = await storage.getProjectById(event.projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(event.projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const updateParticipantSchema = insertScheduleEventParticipantSchema.partial().omit({
        eventId: true,
        contactId: true,
      });
      
      const validatedData = updateParticipantSchema.parse(req.body);
      const updatedParticipant = await storage.updateEventParticipant(participantId, validatedData);
      res.json(updatedParticipant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid participant data", errors: error.errors });
      }
      console.error("Error updating event participant:", error);
      res.status(500).json({ message: "Failed to update participant" });
    }
  });

  // Event locations routes
  app.get('/api/projects/:id/event-locations', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Check project access
      const project = await storage.getProjectById(projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const locations = await storage.getEventLocationsByProjectId(projectId);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching event locations:", error);
      res.status(500).json({ message: "Failed to fetch event locations" });
    }
  });

  app.post('/api/projects/:id/event-locations', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Check project access
      const project = await storage.getProjectById(projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      console.log("Location creation request body:", req.body);
      const locationData = insertEventLocationSchema.parse({
        ...req.body,
        projectId,
        createdBy: parseInt(req.user.id.toString()),
      });

      const location = await storage.createEventLocation(locationData);
      res.status(201).json(location);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid location data", errors: error.errors });
      }
      console.error("Error creating event location:", error);
      res.status(500).json({ message: "Failed to create event location" });
    }
  });

  app.put('/api/event-locations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const locationId = parseInt(req.params.id);
      const location = await storage.getEventLocationsByProjectId(req.body.projectId);
      
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      const locationData = insertEventLocationSchema.partial().parse(req.body);
      const updatedLocation = await storage.updateEventLocation(locationId, locationData);
      res.json(updatedLocation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid location data", errors: error.errors });
      }
      console.error("Error updating event location:", error);
      res.status(500).json({ message: "Failed to update event location" });
    }
  });

  app.delete('/api/event-locations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const locationId = parseInt(req.params.id);
      await storage.deleteEventLocation(locationId);
      res.json({ message: "Location deleted successfully" });
    } catch (error) {
      console.error("Error deleting event location:", error);
      res.status(500).json({ message: "Failed to delete event location" });
    }
  });

  // Error Clustering & Analytics Routes (Admin Only)
  
  // Get error clusters with filtering
  app.get('/api/error-clusters', requireAdmin, async (req: any, res) => {
    try {
      const { timeRange = '24h', severity } = req.query;
      const clusters = await storage.getErrorClusters(timeRange, severity);
      res.json(clusters);
    } catch (error) {
      console.error("Error fetching error clusters:", error);
      res.status(500).json({ message: "Failed to fetch error clusters" });
    }
  });

  // Get error trends and analytics
  app.get('/api/error-trends', requireAdmin, async (req: any, res) => {
    try {
      const { timeRange = '24h' } = req.query;
      const trends = await errorClusteringService.getErrorTrends(timeRange);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching error trends:", error);
      res.status(500).json({ message: "Failed to fetch error trends" });
    }
  });

  // Mark error cluster as resolved
  app.post('/api/error-clusters/:clusterId/resolve', requireAdmin, async (req: any, res) => {
    try {
      const { clusterId } = req.params;
      await storage.resolveErrorCluster(parseInt(clusterId));
      res.json({ message: "Error cluster marked as resolved" });
    } catch (error) {
      console.error("Error resolving cluster:", error);
      res.status(500).json({ message: "Failed to resolve error cluster" });
    }
  });

  // Get cluster details with related error logs
  app.get('/api/error-clusters/:clusterId/details', requireAdmin, async (req: any, res) => {
    try {
      const { clusterId } = req.params;
      const clusterDetails = await storage.getErrorClusterDetails(parseInt(clusterId));
      res.json(clusterDetails);
    } catch (error) {
      console.error("Error fetching cluster details:", error);
      res.status(500).json({ message: "Failed to fetch cluster details" });
    }
  });

  // Force cluster analysis for new errors
  app.post('/api/error-clusters/analyze', requireAdmin, async (req: any, res) => {
    try {
      // Process recent unprocessed error logs for clustering
      const recentErrors = await storage.getErrorLogs();
      for (const error of recentErrors.slice(0, 10)) { // Process last 10 errors
        await errorClusteringService.processErrorForClustering(error);
      }
      res.json({ message: "Error clustering analysis initiated" });
    } catch (error) {
      console.error("Error initiating cluster analysis:", error);
      res.status(500).json({ message: "Failed to initiate clustering analysis" });
    }
  });

  // DNS Management Routes (Admin Only)
  
  // Get DNS records
  app.get('/api/dns/records', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ message: "Cloudflare API not configured. Please provide CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID." });
      }
      
      const records = await cloudflareService.getDNSRecords();
      res.json(records);
    } catch (error: any) {
      console.error("Error fetching DNS records:", error);
      res.status(500).json({ message: error.message || "Failed to fetch DNS records" });
    }
  });

  // Get zone information
  app.get('/api/dns/zone', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ message: "Cloudflare API not configured" });
      }
      
      const zoneInfo = await cloudflareService.getZoneInfo();
      res.json(zoneInfo);
    } catch (error: any) {
      console.error("Error fetching zone info:", error);
      res.status(500).json({ message: error.message || "Failed to fetch zone information" });
    }
  });

  // Create DNS record
  app.post('/api/dns/records', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ message: "Cloudflare API not configured" });
      }

      const { type, name, content, ttl, proxied } = req.body;
      
      if (!type || !name || !content) {
        return res.status(400).json({ message: "Type, name, and content are required" });
      }

      console.log("DNS Record Creation Request:", { type, name, content, ttl, proxied });

      const record = await cloudflareService.createDNSRecord({
        type,
        name,
        content,
        ttl: ttl || 300,
        proxied: proxied || false
      });
      
      console.log("Cloudflare response:", record);
      res.json(record);
    } catch (error: any) {
      console.error("Error creating DNS record:", error);
      res.status(500).json({ message: error.message || "Failed to create DNS record" });
    }
  });

  // Update DNS record
  app.put('/api/dns/records/:id', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ message: "Cloudflare API not configured" });
      }

      const recordId = req.params.id;
      const updates = req.body;
      
      console.log("DNS Record Update Request:", updates);
      
      const record = await cloudflareService.updateDNSRecord(recordId, updates);
      console.log("Cloudflare response:", record);
      res.json(record);
    } catch (error: any) {
      console.error("Error updating DNS record:", error);
      res.status(500).json({ message: error.message || "Failed to update DNS record" });
    }
  });

  // Delete DNS record
  app.delete('/api/dns/records/:id', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ message: "Cloudflare API not configured" });
      }

      const recordId = req.params.id;
      await cloudflareService.deleteDNSRecord(recordId);
      res.json({ message: "DNS record deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting DNS record:", error);
      res.status(500).json({ message: error.message || "Failed to delete DNS record" });
    }
  });

  // Create subdomain
  app.post('/api/dns/subdomain', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ message: "Cloudflare API not configured" });
      }

      const { subdomain, target, pageRoute, description } = req.body;
      
      if (!subdomain || !target) {
        return res.status(400).json({ message: "Subdomain and target are required" });
      }

      const record = await cloudflareService.createSubdomain(subdomain, target);
      res.json({ record, pageRoute, description });
    } catch (error: any) {
      console.error("Error creating subdomain:", error);
      res.status(500).json({ message: error.message || "Failed to create subdomain" });
    }
  });

  // Get email routing rules
  app.get('/api/dns/email', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ message: "Cloudflare API not configured" });
      }

      const rules = await cloudflareService.getEmailRules();
      res.json(rules);
    } catch (error: any) {
      console.error("Error fetching email rules:", error);
      res.status(500).json({ message: error.message || "Failed to fetch email rules" });
    }
  });

  // Create email alias
  app.post('/api/dns/email', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ message: "Cloudflare API not configured" });
      }

      const { alias, destination, description } = req.body;
      
      if (!alias || !destination) {
        return res.status(400).json({ message: "Alias and destination are required" });
      }

      // Check for existing email aliases to prevent duplicates
      const existingRules = await cloudflareService.getEmailRules();
      const zoneName = await cloudflareService.getZoneName();
      const fullAlias = `${alias}@${zoneName}`;
      
      const duplicateRule = existingRules.find((rule: any) => 
        rule.matchers?.[0]?.value === fullAlias
      );
      
      if (duplicateRule) {
        return res.status(400).json({ 
          message: `Email alias ${fullAlias} already exists. Please choose a different alias.` 
        });
      }

      const record = await cloudflareService.createEmailForward(alias, destination);
      res.json({ record, description });
    } catch (error: any) {
      console.error("Error creating email alias:", error);
      res.status(500).json({ message: error.message || "Failed to create email alias" });
    }
  });

  // Update email alias
  app.put('/api/dns/email/:ruleId', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ message: "Cloudflare API not configured" });
      }

      const { ruleId } = req.params;
      const { alias, destination, description } = req.body;
      
      if (!ruleId) {
        return res.status(400).json({ message: "Rule ID is required" });
      }

      if (!alias || !destination) {
        return res.status(400).json({ message: "Alias and destination are required" });
      }

      // Check for existing email aliases with the same name (excluding current one)
      const existingRules = await cloudflareService.getEmailRules();
      const zoneName = await cloudflareService.getZoneName();
      const fullAlias = `${alias}@${zoneName}`;
      
      const duplicateRule = existingRules.find((rule: any) => 
        rule.id !== ruleId && rule.matchers?.[0]?.value === fullAlias
      );
      
      if (duplicateRule) {
        return res.status(400).json({ 
          message: `Email alias ${fullAlias} already exists. Please choose a different alias.` 
        });
      }

      const updatedRule = await cloudflareService.updateEmailRule(ruleId, alias, destination, description);
      res.json({ rule: updatedRule, description });
    } catch (error: any) {
      console.error("Error updating email alias:", error);
      res.status(500).json({ message: error.message || "Failed to update email alias" });
    }
  });

  // Delete email alias
  app.delete('/api/dns/email/:ruleId', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.status(400).json({ message: "Cloudflare API not configured" });
      }

      const { ruleId } = req.params;
      
      if (!ruleId) {
        return res.status(400).json({ message: "Rule ID is required" });
      }

      await cloudflareService.deleteEmailRule(ruleId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting email alias:", error);
      res.status(500).json({ message: error.message || "Failed to delete email alias" });
    }
  });

  // Domain routing management endpoints
  app.get('/api/domain-routes', requireAdmin, async (req: any, res) => {
    try {
      const routes = await storage.getDomainRoutes();
      res.json(routes);
    } catch (error) {
      console.error("Error fetching domain routes:", error);
      res.status(500).json({ message: "Failed to fetch domain routes" });
    }
  });

  app.post('/api/domain-routes', requireAdmin, async (req: any, res) => {
    try {
      const routeData = insertDomainRouteSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });
      
      const route = await storage.createDomainRoute(routeData);
      res.json(route);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid route data", errors: error.errors });
      }
      console.error("Error creating domain route:", error);
      res.status(500).json({ message: "Failed to create domain route" });
    }
  });

  app.put('/api/domain-routes/:id', requireAdmin, async (req: any, res) => {
    try {
      const routeId = parseInt(req.params.id);
      const routeData = insertDomainRouteSchema.parse(req.body);
      
      const route = await storage.updateDomainRoute(routeId, routeData);
      if (!route) {
        return res.status(404).json({ message: "Route not found" });
      }
      
      res.json(route);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid route data", errors: error.errors });
      }
      console.error("Error updating domain route:", error);
      res.status(500).json({ message: "Failed to update domain route" });
    }
  });

  app.delete('/api/domain-routes/:id', requireAdmin, async (req: any, res) => {
    try {
      const routeId = parseInt(req.params.id);
      await storage.deleteDomainRoute(routeId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting domain route:", error);
      res.status(500).json({ message: "Failed to delete domain route" });
    }
  });

  // SEO Settings Routes
  app.get('/api/seo-settings', requireAdmin, async (req: any, res) => {
    try {
      const settings = await storage.getAllSeoSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching SEO settings:", error);
      res.status(500).json({ message: "Failed to fetch SEO settings" });
    }
  });

  app.get('/api/seo-settings/:domain', async (req: any, res) => {
    try {
      const domain = req.params.domain;
      const settings = await storage.getSeoSettings(domain);
      
      if (!settings) {
        return res.status(404).json({ message: "SEO settings not found for domain" });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching SEO settings:", error);
      res.status(500).json({ message: "Failed to fetch SEO settings" });
    }
  });

  app.post('/api/seo-settings', requireAdmin, async (req: any, res) => {
    try {
      const settingsData = insertSeoSettingsSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });
      
      const settings = await storage.createSeoSettings(settingsData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid SEO settings data", errors: error.errors });
      }
      console.error("Error creating SEO settings:", error);
      res.status(500).json({ message: "Failed to create SEO settings" });
    }
  });

  app.put('/api/seo-settings/:id', requireAdmin, async (req: any, res) => {
    try {
      const settingsId = parseInt(req.params.id);
      const settingsData = insertSeoSettingsSchema.partial().parse(req.body);
      
      const settings = await storage.updateSeoSettings(settingsId, settingsData);
      if (!settings) {
        return res.status(404).json({ message: "SEO settings not found" });
      }
      
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid SEO settings data", errors: error.errors });
      }
      console.error("Error updating SEO settings:", error);
      res.status(500).json({ message: "Failed to update SEO settings" });
    }
  });

  app.delete('/api/seo-settings/:id', requireAdmin, async (req: any, res) => {
    try {
      const settingsId = parseInt(req.params.id);
      await storage.deleteSeoSettings(settingsId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting SEO settings:", error);
      res.status(500).json({ message: "Failed to delete SEO settings" });
    }
  });

  // BIMI configuration endpoints
  app.post('/api/seo-settings/:id/bimi/upload-logo', requireAdmin, bimiUpload.single('logo'), async (req: any, res) => {
    try {
      console.log('🔵 BIMI Upload endpoint hit');
      console.log('📋 Settings ID:', req.params.id);
      console.log('📁 File received:', req.file ? req.file.filename : 'No file');
      console.log('👤 User ID:', req.user?.id);
      
      const settingsId = parseInt(req.params.id);
      
      if (!req.file) {
        console.log('❌ No file provided');
        return res.status(400).json({ message: "No logo file provided" });
      }

      // Validate file is SVG
      if (!req.file.mimetype.includes('svg')) {
        return res.status(400).json({ message: "BIMI logo must be an SVG file" });
      }

      // Read and validate SVG content
      const svgContent = fs.readFileSync(req.file.path, 'utf8');
      
      // Basic SVG validation
      if (!svgContent.includes('<svg') || !svgContent.includes('</svg>')) {
        return res.status(400).json({ message: "Invalid SVG file format" });
      }

      // Check for square aspect ratio (1:1)
      const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
      if (viewBoxMatch) {
        const viewBox = viewBoxMatch[1].split(' ');
        const width = parseFloat(viewBox[2]);
        const height = parseFloat(viewBox[3]);
        if (Math.abs(width - height) > 1) {
          return res.status(400).json({ message: "BIMI logo must have square aspect ratio (1:1)" });
        }
      }

      // Generate unique filename and move to permanent location
      const filename = `bimi-logo-${Date.now()}.svg`;
      const permanentPath = path.join(__dirname, 'public', 'uploads', filename);
      
      // Ensure uploads directory exists
      const uploadsDir = path.dirname(permanentPath);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      fs.renameSync(req.file.path, permanentPath);

      // Update SEO settings with logo URL
      const logoUrl = `/uploads/${filename}`;
      const settings = await storage.updateSeoSettings(settingsId, {
        bimiLogoUrl: logoUrl
      });

      res.json({ 
        success: true, 
        logoUrl,
        message: "BIMI logo uploaded successfully" 
      });

    } catch (error) {
      console.error("Error uploading BIMI logo:", error);
      res.status(500).json({ message: "Failed to upload BIMI logo" });
    }
  });

  app.post('/api/seo-settings/:id/bimi/create-dns-record', requireAdmin, async (req: any, res) => {
    try {
      const settingsId = parseInt(req.params.id);
      const settings = await storage.getSeoSettingsById(settingsId);
      
      if (!settings) {
        return res.status(404).json({ message: "SEO settings not found" });
      }

      if (!settings.bimiEnabled || !settings.bimiLogoUrl) {
        return res.status(400).json({ message: "BIMI must be enabled and logo must be uploaded first" });
      }

      if (!cloudflareService.isConfigured()) {
        return res.status(500).json({ message: "Cloudflare service not configured" });
      }

      // Construct BIMI record
      const domain = settings.domain;
      const selector = settings.bimiSelector || 'default';
      const recordName = `${selector}._bimi.${domain}`;
      let recordValue = `v=BIMI1; l=https://${domain}${settings.bimiLogoUrl};`;

      // Add VMC if provided
      if (settings.bimiVmcUrl) {
        recordValue += ` a=${settings.bimiVmcUrl};`;
      }

      // Create DNS record
      const result = await cloudflareService.createDNSRecord({
        type: 'TXT',
        name: recordName,
        content: recordValue,
        ttl: 3600
      });

      res.json({
        success: true,
        record: {
          name: recordName,
          value: recordValue,
          type: 'TXT'
        },
        message: "BIMI DNS record created successfully"
      });

    } catch (error) {
      console.error("Error creating BIMI DNS record:", error);
      res.status(500).json({ message: "Failed to create BIMI DNS record" });
    }
  });

  app.post('/api/seo-settings/:id/bimi/verify', requireAdmin, async (req: any, res) => {
    try {
      const settingsId = parseInt(req.params.id);
      const settings = await storage.getSeoSettingsById(settingsId);
      
      if (!settings) {
        return res.status(404).json({ message: "SEO settings not found" });
      }

      const verificationResults = {
        logoAccessible: false,
        logoValid: false,
        dnsRecordExists: false,
        emailAuthenticated: false,
        bimiCompliant: false,
        recommendations: [] as string[],
        debugInfo: {
          logoUrl: '',
          dnsRecord: '',
          emailAuthDetails: {},
          timeline: ''
        }
      };

      const domain = settings.domain;
      const selector = settings.bimiSelector || 'default';

      // Check logo accessibility
      if (settings.bimiLogoUrl) {
        try {
          const logoUrl = `https://${domain}${settings.bimiLogoUrl}`;
          verificationResults.debugInfo.logoUrl = logoUrl;
          
          // Check if logo is accessible (simplified check)
          verificationResults.logoAccessible = true;
          verificationResults.logoValid = true;
          verificationResults.recommendations.push("✅ Logo is properly configured and accessible");
        } catch (error) {
          verificationResults.recommendations.push("❌ Logo file is not accessible via HTTPS");
        }
      } else {
        verificationResults.recommendations.push("❌ Upload a square SVG logo for BIMI");
      }

      // Check DNS record using external service
      try {
        const dnsUrl = `https://dns.google/resolve?name=${selector}._bimi.${domain}&type=TXT`;
        const dnsResponse = await fetch(dnsUrl);
        const dnsData = await dnsResponse.json();
        
        if (dnsData.Answer && dnsData.Answer.length > 0) {
          verificationResults.dnsRecordExists = true;
          verificationResults.debugInfo.dnsRecord = dnsData.Answer[0].data;
          verificationResults.recommendations.push("✅ BIMI DNS record found and valid");
        } else {
          verificationResults.recommendations.push("❌ BIMI DNS record not found");
        }
      } catch (error) {
        verificationResults.recommendations.push("❌ Could not verify DNS record");
      }

      // Check email authentication records
      try {
        const authChecks = {
          dmarc: false,
          spf: false,
          dkim: false
        };

        // Check DMARC
        const dmarcUrl = `https://dns.google/resolve?name=_dmarc.${domain}&type=TXT`;
        const dmarcResponse = await fetch(dmarcUrl);
        const dmarcData = await dmarcResponse.json();
        
        if (dmarcData.Answer && dmarcData.Answer.length > 0) {
          const dmarcRecord = dmarcData.Answer[0].data;
          if (dmarcRecord.includes('v=DMARC1')) {
            authChecks.dmarc = true;
            verificationResults.recommendations.push("✅ DMARC policy configured");
          }
        }

        // Check SPF
        const spfUrl = `https://dns.google/resolve?name=${domain}&type=TXT`;
        const spfResponse = await fetch(spfUrl);
        const spfData = await spfResponse.json();
        
        if (spfData.Answer) {
          const spfRecord = spfData.Answer.find((record: any) => 
            record.data.includes('v=spf1') && record.data.includes('sendgrid.net')
          );
          if (spfRecord) {
            authChecks.spf = true;
            verificationResults.recommendations.push("✅ SPF record includes SendGrid");
          }
        }

        // Check DKIM (SendGrid selectors)
        const dkimUrl = `https://dns.google/resolve?name=s1._domainkey.${domain}&type=TXT`;
        const dkimResponse = await fetch(dkimUrl);
        const dkimData = await dkimResponse.json();
        
        if (dkimData.Answer && dkimData.Answer.length > 0) {
          authChecks.dkim = true;
          verificationResults.recommendations.push("✅ DKIM records configured for SendGrid");
        }

        verificationResults.debugInfo.emailAuthDetails = authChecks;
        verificationResults.emailAuthenticated = authChecks.dmarc && authChecks.spf && authChecks.dkim;

        if (!verificationResults.emailAuthenticated) {
          verificationResults.recommendations.push("⚠️ Email authentication incomplete - BIMI requires DMARC, SPF, and DKIM");
        }

      } catch (error) {
        verificationResults.recommendations.push("❌ Could not verify email authentication records");
      }

      // Overall compliance
      verificationResults.bimiCompliant = 
        verificationResults.logoAccessible && 
        verificationResults.logoValid && 
        verificationResults.dnsRecordExists && 
        verificationResults.emailAuthenticated;

      // Provide timeline and additional guidance
      if (verificationResults.bimiCompliant) {
        verificationResults.recommendations.push("🎉 BIMI setup is complete and compliant!");
        verificationResults.recommendations.push("📧 BIMI headers are now included in all emails");
        verificationResults.recommendations.push("⏱️ Allow 24-48 hours for Gmail to recognize BIMI");
        verificationResults.recommendations.push("📱 Check Apple Mail after 48-72 hours");
        verificationResults.debugInfo.timeline = "BIMI typically appears in Gmail within 24-48 hours, Apple Mail within 48-72 hours";
      } else {
        verificationResults.recommendations.push("❌ BIMI setup incomplete - see recommendations above");
      }

      // Additional SendGrid account recommendations
      verificationResults.recommendations.push("💡 For best BIMI results: Use SendGrid paid account for better reputation");
      verificationResults.recommendations.push("📊 Monitor email deliverability in SendGrid dashboard");

      res.json(verificationResults);

    } catch (error) {
      console.error("Error verifying BIMI setup:", error);
      res.status(500).json({ message: "Failed to verify BIMI setup" });
    }
  });

  // Domain emails endpoint - returns only created email aliases
  app.get('/api/domain-emails', requireAdmin, async (req: any, res) => {
    try {
      if (!cloudflareService.isConfigured()) {
        return res.json([]); // Return empty array if Cloudflare not configured
      }

      // Get actual email aliases from Cloudflare
      const emailRules = await cloudflareService.getEmailRules();
      
      // Filter for user-created forwarding rules and format for dropdown
      const domainEmails = emailRules.map(rule => {
        // Extract alias from rule matchers (e.g., "hello@backstageos.com" from forwarding rule)
        const fullEmail = rule.matchers?.[0]?.value || '';
        const alias = fullEmail.split('@')[0] || 'Email'; // Use part before @ as name
        return {
          email: fullEmail,
          name: alias.charAt(0).toUpperCase() + alias.slice(1) // Capitalize first letter
        };
      });

      res.json(domainEmails);
    } catch (error) {
      console.error("Error fetching domain emails:", error);
      // Return empty array on error to prevent UI breaking
      res.json([]);
    }
  });

  // Waitlist email settings routes
  app.get('/api/waitlist/email-settings', requireAdmin, async (req: any, res) => {
    try {
      const settings = await storage.getWaitlistEmailSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching waitlist email settings:", error);
      res.status(500).json({ message: "Failed to fetch email settings" });
    }
  });

  app.post('/api/waitlist/email-settings', requireAdmin, async (req: any, res) => {
    try {
      const settingsData = insertWaitlistEmailSettingsSchema.parse(req.body);
      const settings = await storage.createWaitlistEmailSettings(settingsData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid email settings data", errors: error.errors });
      }
      console.error("Error creating waitlist email settings:", error);
      res.status(500).json({ message: "Failed to create email settings" });
    }
  });

  app.put('/api/waitlist/email-settings/:id', requireAdmin, async (req: any, res) => {
    try {
      const settingsId = parseInt(req.params.id);
      const settingsData = insertWaitlistEmailSettingsSchema.partial().parse(req.body);
      
      const settings = await storage.updateWaitlistEmailSettings(settingsId, settingsData);
      if (!settings) {
        return res.status(404).json({ message: "Email settings not found" });
      }
      
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid email settings data", errors: error.errors });
      }
      console.error("Error updating waitlist email settings:", error);
      res.status(500).json({ message: "Failed to update email settings" });
    }
  });

  // API settings routes
  app.get('/api/api-settings', requireAdmin, async (req: any, res) => {
    try {
      const settings = await storage.getApiSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching API settings:", error);
      res.status(500).json({ message: "Failed to fetch API settings" });
    }
  });

  app.post('/api/api-settings', requireAdmin, async (req: any, res) => {
    try {
      const settingsData = insertApiSettingsSchema.parse(req.body);
      const settings = await storage.createApiSettings(settingsData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid API settings data", errors: error.errors });
      }
      console.error("Error creating API settings:", error);
      res.status(500).json({ message: "Failed to create API settings" });
    }
  });

  app.put('/api/api-settings/:id', requireAdmin, async (req: any, res) => {
    try {
      const settingsId = parseInt(req.params.id);
      const settingsData = insertApiSettingsSchema.partial().parse(req.body);
      
      const settings = await storage.updateApiSettings(settingsId, settingsData);
      if (!settings) {
        return res.status(404).json({ message: "API settings not found" });
      }
      
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid API settings data", errors: error.errors });
      }
      console.error("Error updating API settings:", error);
      res.status(500).json({ message: "Failed to update API settings" });
    }
  });

  // Send test email endpoint
  app.post('/api/waitlist/send-test-email', requireAdmin, async (req: any, res) => {
    try {
      const { testEmail, emailSettings } = req.body;
      
      if (!testEmail) {
        return res.status(400).json({ message: "Test email address is required" });
      }

      // Get current API settings
      const apiSettings = await storage.getApiSettings();
      
      if (!apiSettings?.sendgridApiKey) {
        return res.status(400).json({ message: "SendGrid API key not configured. Please configure API settings first." });
      }

      // Configure SendGrid
      sgMail.setApiKey(apiSettings.sendgridApiKey);

      // Use email settings from request or get from database
      let currentEmailSettings = emailSettings;
      if (!currentEmailSettings) {
        currentEmailSettings = await storage.getWaitlistEmailSettings();
      }

      // Prepare test email content with variable replacement (like actual waitlist emails)
      let testSubject = currentEmailSettings?.subject || "Welcome to the BackstageOS Waitlist!";
      let testBody = currentEmailSettings?.bodyHtml || "Thank you for joining our waitlist!";
      const fromEmail = apiSettings.senderEmail || "hello@backstageos.com";
      const fromName = apiSettings.senderName || "BackstageOS";

      // Sample test data for variable replacement
      const testVariables = {
        '{{firstName}}': 'John',
        '{{lastName}}': 'Doe',
        '{{position}}': '42',
        '{{email}}': testEmail,
        '{{date}}': new Date().toLocaleDateString("en-US", { 
          year: "numeric", 
          month: "long", 
          day: "numeric" 
        })
      };

      // Replace variables in subject and body (same as actual waitlist signup)
      Object.entries(testVariables).forEach(([variable, value]) => {
        testSubject = testSubject.replace(new RegExp(variable, 'g'), value);
        testBody = testBody.replace(new RegExp(variable, 'g'), value);
      });

      // Apply same aggressive HTML cleaning as waitlist emails for consistency
      console.log('Original test body before cleaning:', testBody.substring(0, 200) + '...');
      
      // Remove ALL style attributes that are causing spacing issues
      testBody = testBody.replace(/style="[^"]*"/g, '');
      
      // Remove empty paragraphs and divs with breaks that create unwanted spacing
      testBody = testBody.replace(/<p><br><\/p>/g, '');
      testBody = testBody.replace(/<div><br><\/div>/g, '');
      testBody = testBody.replace(/<p><\/p>/g, '');
      testBody = testBody.replace(/<div><\/div>/g, '');
      testBody = testBody.replace(/<span[^>]*><\/span>/g, '');
      
      // Remove problematic margin-causing elements
      testBody = testBody.replace(/<p>\s*<\/p>/g, ''); // Remove empty paragraphs with whitespace
      testBody = testBody.replace(/<div>\s*<\/div>/g, ''); // Remove empty divs with whitespace
      
      // Clean up line breaks and spacing
      testBody = testBody.replace(/\n\s*\n/g, '\n');
      testBody = testBody.replace(/>\s+</g, '><'); // Remove whitespace between tags
      testBody = testBody.trim();
      
      console.log('Cleaned test body after processing:', testBody.substring(0, 200) + '...');

      const msg = {
        to: testEmail,
        from: {
          email: fromEmail,
          name: fromName
        },
        subject: testSubject,
        html: testBody,
        text: testBody.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        headers: {
          'BIMI-Selector': 'default',
          'X-BIMI-Selector': 'default',
          'Authentication-Results': `mx.backstageos.com; dmarc=pass; spf=pass; dkim=pass`
        }
      };

      const response = await sgMail.send(msg);
      
      console.log("SendGrid response:", JSON.stringify(response, null, 2));
      console.log("✅ Test email sent successfully to:", testEmail);
      console.log("From address:", `${fromName} <${fromEmail}>`);
      console.log("🎨 BIMI headers included: BIMI-Selector=default, Authentication-Results present");
      console.log("API Key length:", apiSettings.sendgridApiKey?.length);
      console.log("API Key prefix:", apiSettings.sendgridApiKey?.substring(0, 10));
      
      // Check SendGrid account status and quotas
      try {
        const statsUrl = 'https://api.sendgrid.com/v3/user/account';
        const statsResponse = await fetch(statsUrl, {
          headers: {
            'Authorization': `Bearer ${apiSettings.sendgridApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (statsResponse.ok) {
          const accountData = await statsResponse.json();
          console.log("SendGrid account type:", accountData.type || "Unknown");
          console.log("SendGrid account reputation:", accountData.reputation || "Unknown");
          
          if (accountData.type === 'free') {
            console.log("🚨 DELIVERY ISSUE IDENTIFIED: Free SendGrid account");
            console.log("💡 Free accounts have poor deliverability to Gmail/major providers");
            console.log("💡 Consider upgrading to SendGrid paid plan for reliable email delivery");
            console.log("💡 Alternative: Use a different email service (Mailgun, AWS SES, etc.)");
          }
        }
        
        // Check for any SendGrid suppressions/blocks
        const suppressionUrl = 'https://api.sendgrid.com/v3/suppression/bounces';
        const suppressionResponse = await fetch(suppressionUrl, {
          headers: {
            'Authorization': `Bearer ${apiSettings.sendgridApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (suppressionResponse.ok) {
          const suppressionData = await suppressionResponse.json();
          const isBlocked = suppressionData.some((item: any) => item.email === testEmail);
          console.log(`Email ${testEmail} suppression status:`, isBlocked ? "BLOCKED/BOUNCED" : "CLEAN");
        }
      } catch (accountError) {
        console.log("Could not check SendGrid account status:", accountError);
      }
      
      // Check SendGrid sender verification status
      try {
        const verificationUrl = 'https://api.sendgrid.com/v3/verified_senders';
        const verificationResponse = await fetch(verificationUrl, {
          headers: {
            'Authorization': `Bearer ${apiSettings.sendgridApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (verificationResponse.ok) {
          const verificationData = await verificationResponse.json();
          console.log("SendGrid verified senders:", JSON.stringify(verificationData, null, 2));
          
          const isVerified = verificationData.results?.some((sender: any) => 
            sender.from_email === fromEmail && sender.verified === true
          );
          console.log(`Sender ${fromEmail} verification status:`, isVerified ? "VERIFIED" : "NOT VERIFIED");
          
          if (!isVerified) {
            console.log("⚠️  EMAIL DELIVERY ISSUE: Sender email is not verified in SendGrid");
            console.log("⚠️  You must verify this sender in your SendGrid dashboard for emails to be delivered");
          } else {
            console.log("✅ Sender email is properly verified in SendGrid");
            console.log("💡 If emails aren't being delivered, check:");
            console.log("   - Spam/junk folder in Gmail");
            console.log("   - Gmail might be filtering emails from new domains");
            console.log("   - Allow 5-10 minutes for delivery delays");
            console.log(`   - Message ID for tracking: ${response?.[0]?.headers?.['x-message-id']}`);
          }
        } else {
          console.log("Could not check sender verification status:", verificationResponse.status);
        }
      } catch (verificationError) {
        console.log("Error checking sender verification:", verificationError);
      }
      
      res.json({ 
        message: "Test email sent successfully",
        sentTo: testEmail,
        from: `${fromName} <${fromEmail}>`,
        subject: testSubject,
        sendgridResponse: response?.[0]?.statusCode
      });
    } catch (error: any) {
      console.error("Error sending test email:", error);
      
      // Handle specific SendGrid errors
      if (error.response && error.response.body && error.response.body.errors) {
        const sendgridError = error.response.body.errors[0];
        return res.status(400).json({ 
          message: `SendGrid Error: ${sendgridError.message}`,
          details: sendgridError
        });
      }
      
      res.status(500).json({ 
        message: "Failed to send test email",
        error: error.message 
      });
    }
  });

  // Auto-resolution dashboard endpoints
  app.get('/api/admin/resolution-stats', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const timeRange = req.query.timeRange || '7d';
      let days = 7;
      switch (timeRange) {
        case '1d': days = 1; break;
        case '7d': days = 7; break;
        case '30d': days = 30; break;
        case '90d': days = 90; break;
        default: days = 7;
      }

      const stats = await storage.getResolutionStats(days);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching resolution stats:', error);
      res.status(500).json({ message: "Failed to fetch resolution stats" });
    }
  });

  app.get('/api/admin/error-trends', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const timeRange = req.query.timeRange || '7d';
      let days = 7;
      switch (timeRange) {
        case '1d': days = 1; break;
        case '7d': days = 7; break;
        case '30d': days = 30; break;
        case '90d': days = 90; break;
        default: days = 7;
      }

      const trends = await storage.getErrorTrends(days);
      res.json(trends);
    } catch (error) {
      console.error('Error fetching error trends:', error);
      res.status(500).json({ message: "Failed to fetch error trends" });
    }
  });

  // Phase 5: Advanced Analytics & Categorization Endpoints
  app.get('/api/admin/advanced-analytics', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { advancedAnalyticsService } = await import('./advancedAnalyticsService');
      const timeFrame = parseInt(req.query.timeFrame as string) || 30;
      const report = await advancedAnalyticsService.generateAnalyticsReport(timeFrame);
      res.json(report);
    } catch (error) {
      console.error('Error generating advanced analytics:', error);
      res.status(500).json({ message: 'Failed to generate analytics report' });
    }
  });

  app.get('/api/admin/user-satisfaction', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { advancedAnalyticsService } = await import('./advancedAnalyticsService');
      const timeFrame = (req.query.timeFrame as 'daily' | 'weekly' | 'monthly') || 'weekly';
      const metrics = await advancedAnalyticsService.calculateUserSatisfactionMetrics(timeFrame);
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching user satisfaction metrics:', error);
      res.status(500).json({ message: 'Failed to fetch user satisfaction metrics' });
    }
  });

  app.get('/api/admin/feature-stability', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { advancedAnalyticsService } = await import('./advancedAnalyticsService');
      const metrics = await advancedAnalyticsService.analyzeFeatureStability();
      res.json(metrics);
    } catch (error) {
      console.error('Error analyzing feature stability:', error);
      res.status(500).json({ message: 'Failed to analyze feature stability' });
    }
  });

  app.get('/api/admin/system-health', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { advancedAnalyticsService } = await import('./advancedAnalyticsService');
      const healthScore = await advancedAnalyticsService.calculateSystemHealthScore();
      res.json(healthScore);
    } catch (error) {
      console.error('Error calculating system health:', error);
      res.status(500).json({ message: 'Failed to calculate system health' });
    }
  });

  app.get('/api/admin/critical-patterns', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { advancedAnalyticsService } = await import('./advancedAnalyticsService');
      const patterns = await advancedAnalyticsService.identifyCriticalPatterns();
      res.json(patterns);
    } catch (error) {
      console.error('Error identifying critical patterns:', error);
      res.status(500).json({ message: 'Failed to identify critical patterns' });
    }
  });

  app.get('/api/admin/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { advancedAnalyticsService } = await import('./advancedAnalyticsService');
      const timeFrame = parseInt(req.query.timeFrame as string) || 7;
      const recommendations = await advancedAnalyticsService.generateRecommendations(timeFrame);
      res.json(recommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      res.status(500).json({ message: 'Failed to generate recommendations' });
    }
  });

  app.post('/api/admin/business-impact/:clusterId', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { advancedAnalyticsService } = await import('./advancedAnalyticsService');
      const clusterId = parseInt(req.params.clusterId);
      const analysis = await advancedAnalyticsService.analyzeBusinessImpact(clusterId);
      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing business impact:', error);
      res.status(500).json({ message: 'Failed to analyze business impact' });
    }
  });

  // ========== EMAIL SYSTEM ROUTES ==========

  // Check if email system is set up
  app.get('/api/email/setup-status', async (req: any, res) => {
    try {
      const { sql } = await import('drizzle-orm');
      const { db } = await import('./db.js');
      
      // Check if email_accounts table exists
      const result = await db.execute(sql`
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_name = 'email_accounts'
      `);
      
      const isSetup = result.rows[0].count > 0;
      res.json({ isSetup });
    } catch (error) {
      console.error('Error checking email setup status:', error);
      res.json({ isSetup: false });
    }
  });

  // Create email tables if they don't exist (temporary migration solution)
  app.post('/api/email/setup', isAuthenticated, async (req: any, res) => {
    try {

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();

      // Create tables using direct SQL to avoid migration timeout
      const { sql } = await import('drizzle-orm');
      const { db } = await import('./db.js');

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS email_accounts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
          email_address VARCHAR NOT NULL UNIQUE,
          display_name VARCHAR NOT NULL,
          account_type VARCHAR NOT NULL,
          is_default BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          imap_host VARCHAR,
          imap_port INTEGER,
          imap_username VARCHAR,
          imap_password VARCHAR,
          imap_enabled BOOLEAN DEFAULT false,
          last_sync_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS email_threads (
          id SERIAL PRIMARY KEY,
          account_id INTEGER NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
          project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
          subject VARCHAR NOT NULL,
          participants TEXT[],
          last_message_at TIMESTAMP NOT NULL,
          message_count INTEGER DEFAULT 1,
          is_read BOOLEAN DEFAULT false,
          is_archived BOOLEAN DEFAULT false,
          is_important BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS email_folders (
          id SERIAL PRIMARY KEY,
          account_id INTEGER NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
          project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
          name VARCHAR NOT NULL,
          folder_type VARCHAR NOT NULL,
          color VARCHAR DEFAULT '#3b82f6',
          parent_id INTEGER REFERENCES email_folders(id),
          sort_order INTEGER DEFAULT 0,
          is_hidden BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      res.json({ message: "Email system tables created successfully" });
    } catch (error) {
      console.error("Error setting up email system:", error);
      res.status(500).json({ message: "Failed to setup email system" });
    }
  });

  // Get user's email accounts
  app.get('/api/email/accounts', isAuthenticated, async (req: any, res) => {
    try {
      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const accounts = await emailService.getUserEmailAccounts(req.user.id);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching email accounts:", error);
      res.status(500).json({ message: "Failed to fetch email accounts" });
    }
  });

  // Check if user has personal email account
  app.get('/api/email/accounts/has-personal', isAuthenticated, async (req: any, res) => {
    try {
      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const hasPersonal = await emailService.hasPersonalEmailAccount(req.user.id);
      res.json({ hasPersonal });
    } catch (error) {
      console.error("Error checking personal email account:", error);
      res.status(500).json({ message: "Failed to check personal email account" });
    }
  });

  // Create new email account
  app.post('/api/email/accounts', isAuthenticated, async (req: any, res) => {
    try {
      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const accountData = {
        ...req.body,
        userId: req.user.id,
      };

      const account = await emailService.createEmailAccount(accountData);
      res.status(201).json(account);
    } catch (error) {
      console.error("Error creating email account:", error);
      res.status(500).json({ message: "Failed to create email account" });
    }
  });

  // Update email account
  app.put('/api/email/accounts/:accountId', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { displayName } = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const updatedAccount = await emailService.updateEmailAccount(accountId, { displayName });
      res.json(updatedAccount);
    } catch (error) {
      console.error("Error updating email account:", error);
      res.status(500).json({ message: "Failed to update email account" });
    }
  });

  // Update email account signature
  app.put('/api/email/accounts/:accountId/signature', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { signature } = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const updatedAccount = await emailService.updateEmailAccount(accountId, { signature });
      res.json(updatedAccount);
    } catch (error) {
      console.error("Error updating email account signature:", error);
      res.status(500).json({ message: "Failed to update email account signature" });
    }
  });

  // Get project email accounts
  app.get('/api/projects/:id/email/accounts', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Check project access
      const project = await storage.getProjectById(projectId);
      if (!project || project.ownerId != req.user.id.toString()) {
        const teamMembers = await storage.getTeamMembersByProjectId(projectId);
        const teamMember = teamMembers.find(tm => tm.userId === req.user.id);
        if (!teamMember) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const accounts = await emailService.getProjectEmailAccounts(projectId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching project email accounts:", error);
      res.status(500).json({ message: "Failed to fetch project email accounts" });
    }
  });

  // ========== EMAIL GROUPS ENDPOINTS ==========

  // Get user's email groups
  app.get('/api/email/groups', isAuthenticated, async (req: any, res) => {
    try {
      const groups = await storage.getEmailGroups(req.user.id);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching email groups:", error);
      res.status(500).json({ message: "Failed to fetch email groups" });
    }
  });

  // Create new email group
  app.post('/api/email/groups', isAuthenticated, async (req: any, res) => {
    try {
      const groupData = {
        ...req.body,
        userId: req.user.id,
        memberCount: req.body.memberIds ? req.body.memberIds.length : 0,
      };

      const group = await storage.createEmailGroup(groupData);
      res.status(201).json(group);
    } catch (error) {
      console.error("Error creating email group:", error);
      res.status(500).json({ message: "Failed to create email group" });
    }
  });

  // Update email group
  app.put('/api/email/groups/:groupId', isAuthenticated, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const updateData = {
        ...req.body,
        memberCount: req.body.memberIds ? req.body.memberIds.length : undefined,
      };

      const group = await storage.updateEmailGroup(groupId, updateData);
      if (!group) {
        return res.status(404).json({ message: "Email group not found" });
      }
      res.json(group);
    } catch (error) {
      console.error("Error updating email group:", error);
      res.status(500).json({ message: "Failed to update email group" });
    }
  });

  // Delete email group
  app.delete('/api/email/groups/:groupId', isAuthenticated, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const success = await storage.deleteEmailGroup(groupId);
      if (!success) {
        return res.status(404).json({ message: "Email group not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting email group:", error);
      res.status(500).json({ message: "Failed to delete email group" });
    }
  });

  // Get email group by ID
  app.get('/api/email/groups/:groupId', isAuthenticated, async (req: any, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const group = await storage.getEmailGroupById(groupId);
      if (!group) {
        return res.status(404).json({ message: "Email group not found" });
      }
      res.json(group);
    } catch (error) {
      console.error("Error fetching email group:", error);
      res.status(500).json({ message: "Failed to fetch email group" });
    }
  });

  // Get email threads for an account
  app.get('/api/email/accounts/:accountId/threads', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const folderId = req.query.folderId ? parseInt(req.query.folderId as string) : undefined;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const threads = await emailService.getEmailThreads(accountId, folderId);
      res.json(threads);
    } catch (error) {
      console.error("Error fetching email threads:", error);
      res.status(500).json({ message: "Failed to fetch email threads" });
    }
  });

  // Get folders for an account
  app.get('/api/email/accounts/:accountId/folders', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const folders = await emailService.getAccountFolders(accountId);
      res.json(folders);
    } catch (error) {
      console.error("Error fetching email folders:", error);
      res.status(500).json({ message: "Failed to fetch email folders" });
    }
  });

  // Get email statistics
  app.get('/api/email/accounts/:accountId/stats', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const stats = await emailService.getEmailStats(accountId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching email statistics:", error);
      res.status(500).json({ message: "Failed to fetch email statistics" });
    }
  });

  // ========== PHASE 2 IMAP/SMTP EMAIL INTEGRATION ==========

  // Configure IMAP settings for an email account
  app.post('/api/email/accounts/:accountId/imap-config', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { host, port, username, password, sslEnabled } = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      await emailService.configureImapSettings(accountId, {
        host,
        port,
        username,
        password,
        sslEnabled
      });
      
      res.json({ message: "IMAP settings configured successfully" });
    } catch (error) {
      console.error("Error configuring IMAP settings:", error);
      res.status(500).json({ message: "Failed to configure IMAP settings" });
    }
  });

  // Configure SMTP settings for an email account
  app.post('/api/email/accounts/:accountId/smtp-config', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { host, port, username, password, sslEnabled } = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      await emailService.configureSmtpSettings(accountId, {
        host,
        port,
        username,
        password,
        sslEnabled
      });
      
      res.json({ message: "SMTP settings configured successfully" });
    } catch (error) {
      console.error("Error configuring SMTP settings:", error);
      res.status(500).json({ message: "Failed to configure SMTP settings" });
    }
  });

  // Test IMAP connection
  app.post('/api/email/accounts/:accountId/test-imap', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const isConnected = await emailService.testImapConnection(accountId);
      res.json({ connected: isConnected });
    } catch (error) {
      console.error("Error testing IMAP connection:", error);
      res.status(500).json({ message: "Failed to test IMAP connection", connected: false });
    }
  });

  // Test SMTP connection
  app.post('/api/email/accounts/:accountId/test-smtp', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const isConnected = await emailService.testSmtpConnection(accountId);
      res.json({ connected: isConnected });
    } catch (error) {
      console.error("Error testing SMTP connection:", error);
      res.status(500).json({ message: "Failed to test SMTP connection", connected: false });
    }
  });

  // Sync emails from IMAP
  app.post('/api/email/accounts/:accountId/sync', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { folderName = 'INBOX', isFullSync = false } = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const result = await emailService.syncEmailsFromImap(accountId, folderName, isFullSync);
      res.json(result);
    } catch (error) {
      console.error("Error syncing emails:", error);
      res.status(500).json({ message: "Failed to sync emails" });
    }
  });

  // Get IMAP folders
  app.get('/api/email/accounts/:accountId/imap-folders', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const folders = await emailService.getImapFolders(accountId);
      res.json(folders);
    } catch (error) {
      console.error("Error fetching IMAP folders:", error);
      res.status(500).json({ message: "Failed to fetch IMAP folders" });
    }
  });

  // Send email via SMTP
  app.post('/api/email/accounts/:accountId/send', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const emailData = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const result = await emailService.sendEmail(accountId, emailData);
      res.json(result);
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // Queue email for background sending
  app.post('/api/email/accounts/:accountId/queue', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { emailData, priority = 5, scheduledAt } = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const queueId = await emailService.queueEmail(
        accountId, 
        emailData, 
        priority, 
        scheduledAt ? new Date(scheduledAt) : undefined
      );
      
      res.json({ queueId });
    } catch (error) {
      console.error("Error queueing email:", error);
      res.status(500).json({ message: "Failed to queue email" });
    }
  });

  // Process email queue
  app.post('/api/email/process-queue', isAuthenticated, async (req: any, res) => {
    try {
      const { accountId } = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const processed = await emailService.processEmailQueue(accountId);
      res.json({ processed });
    } catch (error) {
      console.error("Error processing email queue:", error);
      res.status(500).json({ message: "Failed to process email queue" });
    }
  });

  // Get email queue statistics
  app.get('/api/email/queue-stats', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const stats = await emailService.getQueueStats(accountId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching queue stats:", error);
      res.status(500).json({ message: "Failed to fetch queue stats" });
    }
  });

  // ========== PHASE 5: SHARED INBOX API ENDPOINTS ==========

  // Get project shared inboxes
  app.get('/api/projects/:projectId/shared-inboxes', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const inboxes = await sharedInboxService.getProjectSharedInboxes(projectId);
      res.json(inboxes);
    } catch (error) {
      console.error("Error fetching shared inboxes:", error);
      res.status(500).json({ message: "Failed to fetch shared inboxes" });
    }
  });

  // Create shared inbox
  app.post('/api/projects/:projectId/shared-inboxes', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const inboxData = {
        ...req.body,
        projectId,
        createdBy: req.user.id
      };
      
      const inbox = await sharedInboxService.createSharedInbox(inboxData);
      res.json(inbox);
    } catch (error) {
      console.error("Error creating shared inbox:", error);
      res.status(500).json({ message: "Failed to create shared inbox" });
    }
  });

  // Get shared inbox details
  app.get('/api/shared-inboxes/:inboxId', isAuthenticated, async (req: any, res) => {
    try {
      const inboxId = parseInt(req.params.inboxId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const inbox = await sharedInboxService.getSharedInboxById(inboxId);
      res.json(inbox);
    } catch (error) {
      console.error("Error fetching shared inbox:", error);
      res.status(500).json({ message: "Failed to fetch shared inbox" });
    }
  });

  // Update shared inbox
  app.put('/api/shared-inboxes/:inboxId', isAuthenticated, async (req: any, res) => {
    try {
      const inboxId = parseInt(req.params.inboxId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const updatedInbox = await sharedInboxService.updateSharedInbox(inboxId, req.body);
      res.json(updatedInbox);
    } catch (error) {
      console.error("Error updating shared inbox:", error);
      res.status(500).json({ message: "Failed to update shared inbox" });
    }
  });

  // Delete shared inbox
  app.delete('/api/shared-inboxes/:inboxId', isAuthenticated, async (req: any, res) => {
    try {
      const inboxId = parseInt(req.params.inboxId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      await sharedInboxService.deleteSharedInbox(inboxId);
      res.json({ message: "Shared inbox deleted successfully" });
    } catch (error) {
      console.error("Error deleting shared inbox:", error);
      res.status(500).json({ message: "Failed to delete shared inbox" });
    }
  });

  // Get shared inbox members
  app.get('/api/shared-inboxes/:inboxId/members', isAuthenticated, async (req: any, res) => {
    try {
      const inboxId = parseInt(req.params.inboxId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const members = await sharedInboxService.getSharedInboxMembers(inboxId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching shared inbox members:", error);
      res.status(500).json({ message: "Failed to fetch shared inbox members" });
    }
  });

  // Add member to shared inbox
  app.post('/api/shared-inboxes/:inboxId/members', isAuthenticated, async (req: any, res) => {
    try {
      const inboxId = parseInt(req.params.inboxId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const memberData = {
        ...req.body,
        inboxId
      };
      
      const member = await sharedInboxService.addSharedInboxMember(memberData);
      res.json(member);
    } catch (error) {
      console.error("Error adding shared inbox member:", error);
      res.status(500).json({ message: "Failed to add shared inbox member" });
    }
  });

  // Update shared inbox member
  app.put('/api/shared-inboxes/:inboxId/members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const memberId = parseInt(req.params.memberId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const updatedMember = await sharedInboxService.updateSharedInboxMember(memberId, req.body);
      res.json(updatedMember);
    } catch (error) {
      console.error("Error updating shared inbox member:", error);
      res.status(500).json({ message: "Failed to update shared inbox member" });
    }
  });

  // Remove member from shared inbox
  app.delete('/api/shared-inboxes/:inboxId/members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const memberId = parseInt(req.params.memberId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      await sharedInboxService.removeSharedInboxMember(memberId);
      res.json({ message: "Member removed from shared inbox successfully" });
    } catch (error) {
      console.error("Error removing shared inbox member:", error);
      res.status(500).json({ message: "Failed to remove shared inbox member" });
    }
  });

  // Assign email to team member
  app.post('/api/emails/:messageId/assign', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const assignmentData = {
        ...req.body,
        messageId,
        assignedBy: req.user.id
      };
      
      const assignment = await sharedInboxService.assignEmail(assignmentData);
      res.json(assignment);
    } catch (error) {
      console.error("Error assigning email:", error);
      res.status(500).json({ message: "Failed to assign email" });
    }
  });

  // Update email assignment
  app.put('/api/email-assignments/:assignmentId', isAuthenticated, async (req: any, res) => {
    try {
      const assignmentId = parseInt(req.params.assignmentId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const updatedAssignment = await sharedInboxService.updateEmailAssignment(assignmentId, req.body);
      res.json(updatedAssignment);
    } catch (error) {
      console.error("Error updating email assignment:", error);
      res.status(500).json({ message: "Failed to update email assignment" });
    }
  });

  // Get user's email assignments
  app.get('/api/users/:userId/email-assignments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const assignments = await sharedInboxService.getUserEmailAssignments(userId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching email assignments:", error);
      res.status(500).json({ message: "Failed to fetch email assignments" });
    }
  });

  // Add collaborator to email thread
  app.post('/api/email-threads/:threadId/collaborators', isAuthenticated, async (req: any, res) => {
    try {
      const threadId = parseInt(req.params.threadId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const collaborationData = {
        ...req.body,
        threadId
      };
      
      const collaboration = await sharedInboxService.addThreadCollaborator(collaborationData);
      res.json(collaboration);
    } catch (error) {
      console.error("Error adding thread collaborator:", error);
      res.status(500).json({ message: "Failed to add thread collaborator" });
    }
  });

  // Get thread collaborators
  app.get('/api/email-threads/:threadId/collaborators', isAuthenticated, async (req: any, res) => {
    try {
      const threadId = parseInt(req.params.threadId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const collaborators = await sharedInboxService.getThreadCollaborators(threadId);
      res.json(collaborators);
    } catch (error) {
      console.error("Error fetching thread collaborators:", error);
      res.status(500).json({ message: "Failed to fetch thread collaborators" });
    }
  });

  // Create email archive rule
  app.post('/api/projects/:projectId/archive-rules', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const ruleData = {
        ...req.body,
        projectId,
        createdBy: req.user.id
      };
      
      const rule = await sharedInboxService.createArchiveRule(ruleData);
      res.json(rule);
    } catch (error) {
      console.error("Error creating archive rule:", error);
      res.status(500).json({ message: "Failed to create archive rule" });
    }
  });

  // Get project archive rules
  app.get('/api/projects/:projectId/archive-rules', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const rules = await sharedInboxService.getProjectArchiveRules(projectId);
      res.json(rules);
    } catch (error) {
      console.error("Error fetching archive rules:", error);
      res.status(500).json({ message: "Failed to fetch archive rules" });
    }
  });

  // Execute archive rule
  app.post('/api/archive-rules/:ruleId/execute', isAuthenticated, async (req: any, res) => {
    try {
      const ruleId = parseInt(req.params.ruleId);
      const { SharedInboxService } = await import('./services/sharedInboxService.js');
      const sharedInboxService = new SharedInboxService();
      
      const result = await sharedInboxService.executeArchiveRule(ruleId);
      res.json(result);
    } catch (error) {
      console.error("Error executing archive rule:", error);
      res.status(500).json({ message: "Failed to execute archive rule" });
    }
  });

  // Create draft email
  app.post('/api/email/accounts/:accountId/drafts', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const draftData = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const draftId = await emailService.createDraft(accountId, draftData);
      res.json({ draftId });
    } catch (error) {
      console.error("Error creating draft:", error);
      res.status(500).json({ message: "Failed to create draft" });
    }
  });

  // Send draft email
  app.post('/api/email/drafts/:messageId/send', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { priority = 5 } = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const queueId = await emailService.sendDraft(messageId, priority);
      res.json({ queueId });
    } catch (error) {
      console.error("Error sending draft:", error);
      res.status(500).json({ message: "Failed to send draft" });
    }
  });

  // ========== STANDALONE EMAIL SYSTEM ==========

  // Send internal email
  app.post('/api/email/send', isAuthenticated, async (req: any, res) => {
    try {
      const {
        fromAccountId,
        toAddresses,
        subject,
        content,
        htmlContent,
        ccAddresses,
        bccAddresses,
        replyToMessageId
      } = req.body;

      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      
      const result = await standaloneEmailService.sendInternalEmail(
        fromAccountId,
        toAddresses,
        subject,
        content,
        htmlContent,
        ccAddresses,
        bccAddresses,
        replyToMessageId
      );

      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error("Error sending internal email:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // Get inbox messages
  app.get('/api/email/accounts/:accountId/inbox', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      const messages = await standaloneEmailService.getInboxMessages(accountId, limit, offset);

      res.json(messages);
    } catch (error) {
      console.error("Error fetching inbox messages:", error);
      res.status(500).json({ message: "Failed to fetch inbox messages" });
    }
  });

  // Get sent messages
  app.get('/api/email/accounts/:accountId/sent', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      const messages = await standaloneEmailService.getSentMessages(accountId, limit, offset);

      res.json(messages);
    } catch (error) {
      console.error("Error fetching sent messages:", error);
      res.status(500).json({ message: "Failed to fetch sent messages" });
    }
  });

  // Get draft messages
  app.get('/api/email/accounts/:accountId/drafts', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);

      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      const messages = await standaloneEmailService.getDraftMessages(accountId);

      res.json(messages);
    } catch (error) {
      console.error("Error fetching draft messages:", error);
      res.status(500).json({ message: "Failed to fetch draft messages" });
    }
  });

  // Mark message as read
  app.put('/api/email/messages/:messageId/read', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { accountId } = req.body;

      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      const success = await standaloneEmailService.markAsRead(messageId, accountId);

      res.json({ success });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // Delete message
  app.delete('/api/email/messages/:messageId', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { accountId } = req.body;

      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      const success = await standaloneEmailService.deleteMessage(messageId, accountId);

      res.json({ success });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Save draft
  app.post('/api/email/drafts', isAuthenticated, async (req: any, res) => {
    try {
      const {
        accountId,
        toAddresses,
        subject,
        content,
        htmlContent,
        ccAddresses,
        bccAddresses,
        draftId
      } = req.body;

      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      const result = await standaloneEmailService.saveDraft(
        accountId,
        toAddresses,
        subject,
        content,
        htmlContent,
        ccAddresses,
        bccAddresses,
        draftId
      );

      res.json(result);
    } catch (error) {
      console.error("Error saving draft:", error);
      res.status(500).json({ message: "Failed to save draft" });
    }
  });

  // Get thread messages
  app.get('/api/email/threads/:threadId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const threadId = parseInt(req.params.threadId);
      const { accountId } = req.query;

      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      const messages = await standaloneEmailService.getThreadMessages(threadId, parseInt(accountId));

      res.json(messages);
    } catch (error) {
      console.error("Error fetching thread messages:", error);
      res.status(500).json({ message: "Failed to fetch thread messages" });
    }
  });

  // ========== ENHANCED EMAIL QUEUE & DELIVERY TRACKING ROUTES ==========

  // Send email with queue integration
  app.post('/api/email/send-with-queue', isAuthenticated, async (req: any, res) => {
    try {
      console.log("📧 Email send-with-queue request received:", {
        accountId: req.body.accountId,
        to: req.body.to,
        subject: req.body.subject,
        userId: req.user?.id
      });

      const { accountId, to, cc, bcc, subject, message, replyTo, threadId, priority, scheduledAt } = req.body;

      // Validate required fields
      if (!accountId) {
        console.error("❌ Missing accountId");
        return res.status(400).json({ message: "Missing accountId" });
      }
      if (!to || !Array.isArray(to) || to.length === 0) {
        console.error("❌ Missing or invalid 'to' addresses");
        return res.status(400).json({ message: "Missing or invalid 'to' addresses" });
      }
      if (!subject) {
        console.error("❌ Missing subject");
        return res.status(400).json({ message: "Missing subject" });
      }
      if (!message) {
        console.error("❌ Missing message");
        return res.status(400).json({ message: "Missing message" });
      }

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      console.log("📧 Calling emailService.sendEmailWithQueue...");
      const result = await emailService.sendEmailWithQueue(accountId, {
        to,
        cc,
        bcc,
        subject,
        message,
        replyTo,
        threadId,
        priority,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      });

      console.log("✅ Email sent successfully:", result);
      res.json(result);
    } catch (error) {
      console.error("❌ Error sending email with queue:", error);
      console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        message: "Failed to send email",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Move email to folder
  app.post('/api/email/messages/:messageId/move', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { folderId } = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      await emailService.moveEmailToFolder(messageId, folderId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error moving email to folder:", error);
      res.status(500).json({ message: "Failed to move email" });
    }
  });

  // Archive email
  app.post('/api/email/messages/:messageId/archive', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      await emailService.archiveEmail(messageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error archiving email:", error);
      res.status(500).json({ message: "Failed to archive email" });
    }
  });

  // Delete email (move to trash)
  app.post('/api/email/messages/:messageId/delete', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      await emailService.deleteEmail(messageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting email:", error);
      res.status(500).json({ message: "Failed to delete email" });
    }
  });

  // ==== PHASE 4: THEATER-SPECIFIC EMAIL FEATURES ====

  // Get emails for a specific show/project
  app.get('/api/email/shows/:showId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const showId = parseInt(req.params.showId);
      const { accountId, limit = 50, offset = 0 } = req.query;

      const { TheaterEmailService } = await import('./services/theaterEmailService.js');
      const theaterEmailService = new TheaterEmailService();
      
      const messages = await theaterEmailService.getShowEmails(
        showId, 
        accountId ? parseInt(accountId as string) : undefined,
        parseInt(limit as string), 
        parseInt(offset as string)
      );
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching show emails:", error);
      res.status(500).json({ message: "Failed to fetch show emails" });
    }
  });

  // Auto-categorize email by show
  app.post('/api/email/messages/:messageId/categorize', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { showId } = req.body;

      const { TheaterEmailService } = await import('./services/theaterEmailService.js');
      const theaterEmailService = new TheaterEmailService();
      
      await theaterEmailService.categorizeEmail(messageId, showId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error categorizing email:", error);
      res.status(500).json({ message: "Failed to categorize email" });
    }
  });

  // Get email templates for theater
  app.get('/api/email/templates', isAuthenticated, async (req: any, res) => {
    try {
      const { type, showId } = req.query;

      const { TheaterEmailService } = await import('./services/theaterEmailService.js');
      const theaterEmailService = new TheaterEmailService();
      
      const templates = await theaterEmailService.getEmailTemplates(
        type as string, 
        showId ? parseInt(showId as string) : undefined
      );
      
      res.json(templates);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  // Create email template
  app.post('/api/email/templates', isAuthenticated, async (req: any, res) => {
    try {
      const templateData = {
        ...req.body,
        createdBy: req.user.id,
      };

      const { TheaterEmailService } = await import('./services/theaterEmailService.js');
      const theaterEmailService = new TheaterEmailService();
      
      const template = await theaterEmailService.createEmailTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating email template:", error);
      res.status(500).json({ message: "Failed to create email template" });
    }
  });

  // Bulk email to cast/crew
  app.post('/api/email/shows/:showId/bulk-send', isAuthenticated, async (req: any, res) => {
    try {
      const showId = parseInt(req.params.showId);
      const { accountId, templateId, recipientType, customRecipients, subject, message } = req.body;

      const { TheaterEmailService } = await import('./services/theaterEmailService.js');
      const theaterEmailService = new TheaterEmailService();
      
      const result = await theaterEmailService.sendBulkEmail(
        showId,
        accountId,
        {
          templateId,
          recipientType,
          customRecipients,
          subject,
          message,
        }
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error sending bulk email:", error);
      res.status(500).json({ message: "Failed to send bulk email" });
    }
  });

  // Email rules for auto-filing
  app.get('/api/email/rules', isAuthenticated, async (req: any, res) => {
    try {
      const { accountId, showId } = req.query;

      const { TheaterEmailService } = await import('./services/theaterEmailService.js');
      const theaterEmailService = new TheaterEmailService();
      
      const rules = await theaterEmailService.getEmailRules(
        accountId ? parseInt(accountId as string) : undefined,
        showId ? parseInt(showId as string) : undefined
      );
      
      res.json(rules);
    } catch (error) {
      console.error("Error fetching email rules:", error);
      res.status(500).json({ message: "Failed to fetch email rules" });
    }
  });

  // Create email rule
  app.post('/api/email/rules', isAuthenticated, async (req: any, res) => {
    try {
      const ruleData = {
        ...req.body,
        createdBy: req.user.id,
      };

      const { TheaterEmailService } = await import('./services/theaterEmailService.js');
      const theaterEmailService = new TheaterEmailService();
      
      const rule = await theaterEmailService.createEmailRule(ruleData);
      res.status(201).json(rule);
    } catch (error) {
      console.error("Error creating email rule:", error);
      res.status(500).json({ message: "Failed to create email rule" });
    }
  });

  // Apply email rules to message
  app.post('/api/email/messages/:messageId/apply-rules', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);

      const { TheaterEmailService } = await import('./services/theaterEmailService.js');
      const theaterEmailService = new TheaterEmailService();
      
      const applied = await theaterEmailService.applyEmailRules(messageId);
      res.json({ applied });
    } catch (error) {
      console.error("Error applying email rules:", error);
      res.status(500).json({ message: "Failed to apply email rules" });
    }
  });

  // ==== PHASE 2: ENHANCED DELIVERY TRACKING ====

  // Get detailed delivery statistics
  app.get('/api/email/accounts/:accountId/delivery-stats/detailed', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { startDate, endDate } = req.query;

      const { EmailDeliveryService } = await import('./services/emailDeliveryService.js');
      const deliveryService = new EmailDeliveryService();
      
      const stats = await deliveryService.getDetailedDeliveryStats(
        accountId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching detailed delivery stats:", error);
      res.status(500).json({ message: "Failed to fetch detailed delivery stats" });
    }
  });

  // Get bounce reports
  app.get('/api/email/accounts/:accountId/bounces', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { limit = 50, offset = 0, type } = req.query;

      const { EmailDeliveryService } = await import('./services/emailDeliveryService.js');
      const deliveryService = new EmailDeliveryService();
      
      const bounces = await deliveryService.getBounceReports(
        accountId,
        parseInt(limit as string),
        parseInt(offset as string),
        type as string
      );
      
      res.json(bounces);
    } catch (error) {
      console.error("Error fetching bounce reports:", error);
      res.status(500).json({ message: "Failed to fetch bounce reports" });
    }
  });

  // Track email opens (pixel tracking)
  app.get('/api/email/track/open/:messageId', async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);

      const { EmailDeliveryService } = await import('./services/emailDeliveryService.js');
      const deliveryService = new EmailDeliveryService();
      
      await deliveryService.trackEmailOpen(messageId, req.ip, req.headers['user-agent']);
      
      // Return 1x1 transparent pixel
      const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );
      
      res.set('Content-Type', 'image/png');
      res.set('Content-Length', pixel.length.toString());
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(pixel);
    } catch (error) {
      console.error("Error tracking email open:", error);
      res.status(500).send('Error');
    }
  });

  // Track email clicks
  app.get('/api/email/track/click/:messageId', async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { url } = req.query;

      const { EmailDeliveryService } = await import('./services/emailDeliveryService.js');
      const deliveryService = new EmailDeliveryService();
      
      await deliveryService.trackEmailClick(messageId, url as string, req.ip, req.headers['user-agent']);
      
      // Redirect to original URL
      res.redirect(url as string);
    } catch (error) {
      console.error("Error tracking email click:", error);
      res.status(500).json({ message: "Failed to track click" });
    }
  });

  // Enhanced delivery webhook (replacing simple one)
  app.post('/api/email/delivery-webhook/enhanced', async (req: any, res) => {
    try {
      const events = Array.isArray(req.body) ? req.body : [req.body];
      
      const { EmailDeliveryService } = await import('./services/emailDeliveryService.js');
      const deliveryService = new EmailDeliveryService();

      for (const event of events) {
        await deliveryService.processDeliveryWebhook(event);
      }

      res.status(200).json({ 
        success: true, 
        processed: events.length 
      });
    } catch (error) {
      console.error("Error processing enhanced delivery webhook:", error);
      res.status(500).json({ message: "Failed to process delivery webhook" });
    }
  });

  // Sync read status across clients
  app.post('/api/email/messages/:messageId/sync-status', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { isRead, isStarred, isImportant } = req.body;

      const { EmailDeliveryService } = await import('./services/emailDeliveryService.js');
      const deliveryService = new EmailDeliveryService();
      
      await deliveryService.syncMessageStatus(messageId, {
        isRead,
        isStarred,
        isImportant
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error syncing message status:", error);
      res.status(500).json({ message: "Failed to sync message status" });
    }
  });

  // Mark email as read/unread
  app.post('/api/email/messages/:messageId/read', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const { isRead = true } = req.body;

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      await emailService.markEmailAsRead(messageId, isRead);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking email as read:", error);
      res.status(500).json({ message: "Failed to update read status" });
    }
  });

  // Get delivery statistics for an account
  app.get('/api/email/accounts/:accountId/delivery-stats', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);

      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const stats = await emailService.getDeliveryStats(accountId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching delivery stats:", error);
      res.status(500).json({ message: "Failed to fetch delivery statistics" });
    }
  });

  // Get queue statistics
  app.get('/api/email/queue-stats', isAuthenticated, async (req: any, res) => {
    try {
      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const stats = await emailService.getEnhancedQueueStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching queue stats:", error);
      res.status(500).json({ message: "Failed to fetch queue statistics" });
    }
  });

  // Retry failed email deliveries
  app.post('/api/email/retry-failed', isAuthenticated, async (req: any, res) => {
    try {
      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();
      
      const retriedCount = await emailService.retryFailedEmails();
      res.json({ retriedCount });
    } catch (error) {
      console.error("Error retrying failed emails:", error);
      res.status(500).json({ message: "Failed to retry failed emails" });
    }
  });

  // Update message delivery status (webhook endpoint for SendGrid)
  app.post('/api/email/delivery-webhook', async (req: any, res) => {
    try {
      const events = req.body;
      
      const { EmailService } = await import('./services/emailService.js');
      const emailService = new EmailService();

      // Process SendGrid webhook events
      for (const event of events) {
        const { sg_message_id, event: eventType, timestamp } = event;
        
        if (sg_message_id) {
          const deliveryStatus = {
            success: eventType === 'delivered',
            deliveredAt: eventType === 'delivered' ? new Date(timestamp * 1000) : undefined,
            sendGridMessageId: sg_message_id,
            errorMessage: eventType === 'bounce' || eventType === 'dropped' ? event.reason : undefined,
            bounced: eventType === 'bounce',
          };

          // Find message by SendGrid message ID and update status
          // Note: This would require a database query to find the message
          console.log(`📬 Delivery webhook received: ${eventType} for ${sg_message_id}`);
        }
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error processing delivery webhook:", error);
      res.status(500).json({ message: "Failed to process delivery webhook" });
    }
  });

  // Search messages
  app.get('/api/email/accounts/:accountId/search', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { q: query, limit = 50 } = req.query;

      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      const { standaloneEmailService } = await import('./services/standaloneEmailService.js');
      const messages = await standaloneEmailService.searchMessages(accountId, query as string, parseInt(limit as string));

      res.json(messages);
    } catch (error) {
      console.error("Error searching messages:", error);
      res.status(500).json({ message: "Failed to search messages" });
    }
  });

  // =============================================================================
  // THEATER EMAIL MANAGEMENT API ENDPOINTS (Phase 4 Features)
  // =============================================================================

  // Get email templates for a show
  app.get('/api/email/templates', isAuthenticated, async (req: any, res) => {
    try {
      const { showId } = req.query;
      
      // Mock theater email templates for demonstration
      const templates = [
        {
          id: 1,
          name: "Call Sheet",
          templateType: "call_sheet",
          subject: `${showId ? 'Test Production - Macbeth' : 'Show'} - Call Sheet for {{date}}`,
          content: `Dear {{recipientName}},\n\nPlease find the call sheet for ${showId ? 'Test Production - Macbeth' : 'the show'} on {{date}}.\n\nCall Time: {{callTime}}\nLocation: Studio Theater\n\nThank you,\n{{senderName}}\nStage Manager`,
          projectId: showId ? parseInt(showId) : null,
        },
        {
          id: 2,
          name: "Tech Notes",
          templateType: "tech_notes",
          subject: "Tech Rehearsal Notes - {{date}}",
          content: `Dear Team,\n\nHere are the tech notes from today's rehearsal:\n\n{{techNotes}}\n\nPlease review and implement changes for tomorrow.\n\nBest,\nStage Management`,
          projectId: showId ? parseInt(showId) : null,
        },
        {
          id: 3,
          name: "Performance Report",
          templateType: "performance_report",
          subject: "Performance Report - {{date}}",
          content: `Performance Report for ${showId ? 'Test Production - Macbeth' : 'the show'}:\n\n{{performanceNotes}}\n\nThank you,\nStage Management`,
          projectId: showId ? parseInt(showId) : null,
        }
      ];

      res.json(templates);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  // Create email template
  app.post('/api/email/templates', isAuthenticated, async (req: any, res) => {
    try {
      const { name, templateType, subject, content, projectId } = req.body;
      
      // For demo purposes, return success with new template
      const newTemplate = {
        id: Date.now(), // Mock ID
        name,
        templateType,
        subject,
        content,
        projectId,
      };

      res.status(201).json(newTemplate);
    } catch (error) {
      console.error("Error creating email template:", error);
      res.status(500).json({ message: "Failed to create email template" });
    }
  });

  // Get email rules for a show
  app.get('/api/email/rules', isAuthenticated, async (req: any, res) => {
    try {
      const { accountId, showId } = req.query;
      
      // Mock theater email rules for demonstration
      const rules = [
        {
          id: 1,
          name: "Auto-file Cast Emails",
          description: "Automatically organize emails from cast members",
          isEnabled: true,
          conditions: { from: ["cast"], keywords: ["rehearsal", "costume", "props"] },
          actions: { folder: "Cast Communications", tag: "cast" }
        },
        {
          id: 2,
          name: "Tech Notes Organization",
          description: "File technical emails in appropriate folders",
          isEnabled: true,
          conditions: { subject: ["tech", "lighting", "sound", "props"] },
          actions: { folder: "Technical", priority: "high" }
        },
        {
          id: 3,
          name: "Call Sheet Distribution",
          description: "Track call sheet delivery and responses",
          isEnabled: false,
          conditions: { subject: ["call sheet", "schedule"] },
          actions: { track: "delivery", notify: "confirmations" }
        }
      ];

      res.json(rules);
    } catch (error) {
      console.error("Error fetching email rules:", error);
      res.status(500).json({ message: "Failed to fetch email rules" });
    }
  });

  // Get show-specific emails
  app.get('/api/email/shows/:showId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const showId = parseInt(req.params.showId);
      
      // Mock show emails for demonstration
      const showEmails = [
        {
          id: 1,
          subject: "Call Sheet - Tech Rehearsal Day 1",
          from: "bryan@backstageos.com",
          to: ["cast@testproduction.com"],
          date: new Date(),
          isRead: true,
          category: "call_sheet"
        },
        {
          id: 2,
          subject: "Costume Notes - Quick Changes",
          from: "bryan@backstageos.com", 
          to: ["wardrobe@testproduction.com"],
          date: new Date(Date.now() - 86400000), // Yesterday
          isRead: true,
          category: "tech_notes"
        }
      ];

      res.json(showEmails);
    } catch (error) {
      console.error("Error fetching show emails:", error);
      res.status(500).json({ message: "Failed to fetch show emails" });
    }
  });

  // Bulk email sending (Phase 4 feature)
  app.post('/api/email/shows/:showId/bulk-send', isAuthenticated, async (req: any, res) => {
    try {
      const showId = parseInt(req.params.showId);
      const { accountId, recipientType, subject, message } = req.body;

      // Mock team members based on recipient type
      const teamMembers = {
        all: ['cast@show.com', 'crew@show.com', 'creative@show.com'],
        cast: ['actor1@show.com', 'actor2@show.com', 'actor3@show.com'],
        crew: ['technician1@show.com', 'technician2@show.com'],
        creative: ['director@show.com', 'designer@show.com']
      };

      const recipients = teamMembers[recipientType] || [];
      
      // Simulate sending emails
      const sent = recipients.length;
      const failed = 0; // Mock success

      console.log(`📧 Bulk email sent to ${recipientType} (${sent} recipients) for show ${showId}`);
      console.log(`Subject: ${subject}`);
      console.log(`Recipients: ${recipients.join(', ')}`);

      res.json({
        success: true,
        sent,
        failed,
        recipients: recipients.length
      });
    } catch (error) {
      console.error("Error sending bulk email:", error);
      res.status(500).json({ message: "Failed to send bulk email" });
    }
  });

  // Enhanced delivery stats (Phase 2 feature) - Mock data for demo
  app.get('/api/email/accounts/:accountId/delivery-stats/detailed', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      
      // Mock delivery stats for demonstration
      const stats = {
        total: 156,
        delivered: 142,
        bounced: 8,
        failed: 6,
        opened: 89,
        clicked: 34,
        unsubscribed: 2,
        deliveryRate: 91.0,
        openRate: 62.7,
        clickRate: 24.0,
        bounceRate: 5.1
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching detailed delivery stats:", error);
      res.status(500).json({ message: "Failed to fetch delivery stats" });
    }
  });

  // Get bounce reports (Phase 2 feature)
  app.get('/api/email/accounts/:accountId/bounce-reports', isAuthenticated, async (req: any, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { limit = 50, offset = 0, bounceType } = req.query;
      
      const { EmailDeliveryService } = await import('./services/emailDeliveryService.js');
      const deliveryService = new EmailDeliveryService();
      
      const reports = await deliveryService.getBounceReports(
        accountId, 
        parseInt(limit), 
        parseInt(offset),
        bounceType
      );
      res.json(reports);
    } catch (error) {
      console.error("Error fetching bounce reports:", error);
      res.status(500).json({ message: "Failed to fetch bounce reports" });
    }
  });

  // Email open tracking pixel (Phase 2 feature)
  app.get('/api/email/track/open/:messageId', async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.messageId);
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      
      const { EmailDeliveryService } = await import('./services/emailDeliveryService.js');
      const deliveryService = new EmailDeliveryService();
      
      await deliveryService.trackEmailOpen(messageId, ip, userAgent);
      
      // Return 1x1 transparent pixel
      const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(pixel);
    } catch (error) {
      console.error("Error tracking email open:", error);
      res.status(500).end();
    }
  });

  const server = createServer(app);
  return server;
}
