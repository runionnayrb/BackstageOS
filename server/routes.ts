import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { requiresBetaAccess, BETA_FEATURES, checkFeatureAccess } from "./betaMiddleware";
import { isAdmin } from "./adminUtils";
import { insertProjectSchema, insertTeamMemberSchema, insertReportSchema, insertReportTemplateSchema, insertGlobalTemplateSettingsSchema, insertFeedbackSchema, insertContactSchema, insertContactAvailabilitySchema, insertScheduleEventSchema, insertScheduleEventParticipantSchema, insertEventLocationSchema, insertLocationAvailabilitySchema, insertErrorLogSchema, insertWaitlistSchema, insertPropsSchema, insertDomainRouteSchema, insertSeoSettingsSchema, insertWaitlistEmailSettingsSchema, insertApiSettingsSchema } from "@shared/schema";
import { cloudflareService } from "./services/cloudflareService";
import { z } from "zod";
import sgMail from "@sendgrid/mail";

// Authentication middleware
function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

// Admin middleware
function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (!isAdmin(req.user.id.toString())) {
    return res.status(403).json({ message: "Admin access required" });
  }
  
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
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

          // Clean rich text editor formatting to match template appearance
          body = body.replace(/style="[^"]*"/g, ''); // Remove all inline styles added by rich text editor
          body = body.replace(/<(h2|p|ul|li|div)([^>]*)>/g, '<$1>'); // Remove attributes from basic HTML tags
          body = body.replace(/<div><br><\/div>/g, ''); // Remove empty div breaks
          body = body.replace(/<p><\/p>/g, ''); // Remove empty paragraphs
          body = body.replace(/<p><br><\/p>/g, ''); // Remove paragraph breaks
          
          console.log('DEBUG - Final cleaned email HTML:');
          console.log(body);
          
          const msg = {
            to: waitlistEntry.email,
            from: {
              email: fromEmail,
              name: fromName
            },
            subject: subject,
            html: body,
            text: body.replace(/<[^>]*>/g, '') // Strip HTML for text version
          };
          
          await sgMail.send(msg);
          console.log(`Welcome email sent to ${waitlistEntry.email} using sender: ${fromEmail}`);
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
        id: userId,
        email: req.user.claims.email,
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
  app.patch('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const { firstName, lastName, email, currentPassword, newPassword } = req.body;

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

  // Report template routes (show-specific)
  app.get('/api/projects/:projectId/templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id.toString();
      const projectId = parseInt(req.params.projectId);
      
      // Verify project ownership
      const project = await storage.getProjectById(projectId);
      if (!project || project.ownerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const templates = await storage.getReportTemplatesByProjectId(projectId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

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
      const project = await storage.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check ownership - use loose equality to handle type conversion
      if (project.ownerId != req.user.id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      let settings = await storage.getShowSettingsByProjectId(projectId);
      
      if (!settings) {
        // Create default settings if none exist
        settings = await storage.upsertShowSettings({
          projectId,
          createdBy: req.user.id.toString(),
        });
      }
      
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
      res.json(availability);
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

      await storage.deleteLocationAvailability(availabilityId);
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

      await storage.bulkDeleteLocationAvailability(ids);
      res.json({ success: true, deletedCount: ids.length });
    } catch (error) {
      console.error("Error bulk deleting location availability:", error);
      res.status(500).json({ message: "Failed to delete location availability" });
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

      const eventData = insertScheduleEventSchema.parse({
        ...req.body,
        projectId,
        createdBy: req.user.id.toString(),
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
      const updatedParticipant = await storage.updateEventParticipant(eventId, participantId, validatedData);
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

      const locationData = insertEventLocationSchema.parse({
        ...req.body,
        projectId,
        createdBy: req.user.id.toString(),
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

      // NO HTML CLEANING - Send exactly as designed in template

      const msg = {
        to: testEmail,
        from: {
          email: fromEmail,
          name: fromName
        },
        subject: testSubject,
        html: testBody,
        text: testBody.replace(/<[^>]*>/g, '') // Strip HTML for text version
      };

      const response = await sgMail.send(msg);
      
      console.log("SendGrid response:", JSON.stringify(response, null, 2));
      console.log("Email sent successfully to:", testEmail);
      console.log("From address:", `${fromName} <${fromEmail}>`);
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

  const server = createServer(app);
  return server;
}


