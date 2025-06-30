import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { requiresBetaAccess, BETA_FEATURES, checkFeatureAccess } from "./betaMiddleware";
import { isAdmin } from "./adminUtils";
import { insertProjectSchema, insertTeamMemberSchema, insertReportSchema, insertReportTemplateSchema, insertGlobalTemplateSettingsSchema, insertFeedbackSchema, insertContactSchema, insertContactAvailabilitySchema, insertScheduleEventSchema, insertScheduleEventParticipantSchema, insertEventLocationSchema, insertLocationAvailabilitySchema, insertErrorLogSchema, insertWaitlistSchema, insertPropsSchema, insertDomainSchema, insertSubdomainSchema, insertEmailAliasSchema, insertPageRouteSchema, insertDomainSettingsSchema } from "@shared/schema";
import { CloudflareService, GoDaddyService } from "./services/cloudflareService";
import { z } from "zod";

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

  // Initialize Cloudflare and GoDaddy services
  const cloudflareService = process.env.CLOUDFLARE_API_TOKEN 
    ? new CloudflareService(process.env.CLOUDFLARE_API_TOKEN)
    : null;
  
  const godaddyService = (process.env.GODADDY_API_KEY && process.env.GODADDY_API_SECRET)
    ? new GoDaddyService(process.env.GODADDY_API_KEY, process.env.GODADDY_API_SECRET)
    : null;

  // Domain Management Routes (Admin only)
  // Get all domains
  app.get('/api/domains', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      if (!isAdmin(req.user.id.toString())) {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      }
      
      const domains = await storage.getDomains(req.user.id.toString());
      res.json(domains);
    } catch (error) {
      console.error('Error fetching domains:', error);
      res.status(500).json({ error: 'Failed to fetch domains' });
    }
  });

  // Create new domain
  app.post('/api/domains', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      if (!isAdmin(req.user.id.toString())) {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      }
      
      const domainData = insertDomainSchema.parse({
        ...req.body,
        createdBy: req.user.id
      });

      const domain = await storage.createDomain(domainData);
      res.status(201).json(domain);
    } catch (error) {
      console.error('Error creating domain:', error);
      res.status(500).json({ error: 'Failed to create domain' });
    }
  });

  // Get domain by ID
  app.get('/api/domains/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      if (!isAdmin(req.user.id.toString())) {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      }
      
      const domain = await storage.getDomain(parseInt(req.params.id), req.user.id);
      if (!domain) {
        return res.status(404).json({ error: 'Domain not found' });
      }
      res.json(domain);
    } catch (error) {
      console.error('Error fetching domain:', error);
      res.status(500).json({ error: 'Failed to fetch domain' });
    }
  });

  // Update domain
  app.put('/api/domains/:id', isAuthenticated, async (req: any, res) => {
    try {
      const domainData = insertDomainSchema.parse({
        ...req.body,
        createdBy: req.user.id
      });

      const domain = await storage.updateDomain(parseInt(req.params.id), domainData, req.user.id);
      if (!domain) {
        return res.status(404).json({ error: 'Domain not found' });
      }
      res.json(domain);
    } catch (error) {
      console.error('Error updating domain:', error);
      res.status(500).json({ error: 'Failed to update domain' });
    }
  });

  // Delete domain
  app.delete('/api/domains/:id', isAuthenticated, async (req: any, res) => {
    try {
      const success = await storage.deleteDomain(parseInt(req.params.id), req.user.id);
      if (!success) {
        return res.status(404).json({ error: 'Domain not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting domain:', error);
      res.status(500).json({ error: 'Failed to delete domain' });
    }
  });

  // Subdomain Management Routes
  // Get subdomains for a domain
  app.get('/api/domains/:domainId/subdomains', isAuthenticated, async (req: any, res) => {
    try {
      const subdomains = await storage.getSubdomains(parseInt(req.params.domainId), req.user.id);
      res.json(subdomains);
    } catch (error) {
      console.error('Error fetching subdomains:', error);
      res.status(500).json({ error: 'Failed to fetch subdomains' });
    }
  });

  // Create new subdomain
  app.post('/api/domains/:domainId/subdomains', isAuthenticated, async (req: any, res) => {
    try {
      const subdomainData = insertSubdomainSchema.parse({
        ...req.body,
        domainId: parseInt(req.params.domainId),
        createdBy: req.user.id
      });

      const subdomain = await storage.createSubdomain(subdomainData);
      res.status(201).json(subdomain);
    } catch (error) {
      console.error('Error creating subdomain:', error);
      res.status(500).json({ error: 'Failed to create subdomain' });
    }
  });

  // Update subdomain
  app.put('/api/domains/:domainId/subdomains/:id', isAuthenticated, async (req: any, res) => {
    try {
      const subdomainData = insertSubdomainSchema.parse({
        ...req.body,
        domainId: parseInt(req.params.domainId),
        createdBy: req.user.id
      });

      const subdomain = await storage.updateSubdomain(parseInt(req.params.id), subdomainData, req.user.id);
      if (!subdomain) {
        return res.status(404).json({ error: 'Subdomain not found' });
      }
      res.json(subdomain);
    } catch (error) {
      console.error('Error updating subdomain:', error);
      res.status(500).json({ error: 'Failed to update subdomain' });
    }
  });

  // Delete subdomain
  app.delete('/api/domains/:domainId/subdomains/:id', isAuthenticated, async (req: any, res) => {
    try {
      const success = await storage.deleteSubdomain(parseInt(req.params.id), req.user.id);
      if (!success) {
        return res.status(404).json({ error: 'Subdomain not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting subdomain:', error);
      res.status(500).json({ error: 'Failed to delete subdomain' });
    }
  });

  // Email Alias Management Routes
  // Get email aliases for a domain
  app.get('/api/domains/:domainId/email-aliases', isAuthenticated, async (req: any, res) => {
    try {
      const aliases = await storage.getEmailAliases(parseInt(req.params.domainId), req.user.id);
      res.json(aliases);
    } catch (error) {
      console.error('Error fetching email aliases:', error);
      res.status(500).json({ error: 'Failed to fetch email aliases' });
    }
  });

  // Create new email alias
  app.post('/api/domains/:domainId/email-aliases', isAuthenticated, async (req: any, res) => {
    try {
      const aliasData = insertEmailAliasSchema.parse({
        ...req.body,
        domainId: parseInt(req.params.domainId),
        createdBy: req.user.id
      });

      const alias = await storage.createEmailAlias(aliasData);
      res.status(201).json(alias);
    } catch (error) {
      console.error('Error creating email alias:', error);
      res.status(500).json({ error: 'Failed to create email alias' });
    }
  });

  // Update email alias
  app.put('/api/domains/:domainId/email-aliases/:id', isAuthenticated, async (req: any, res) => {
    try {
      const aliasData = insertEmailAliasSchema.parse({
        ...req.body,
        domainId: parseInt(req.params.domainId),
        createdBy: req.user.id
      });

      const alias = await storage.updateEmailAlias(parseInt(req.params.id), aliasData, req.user.id);
      if (!alias) {
        return res.status(404).json({ error: 'Email alias not found' });
      }
      res.json(alias);
    } catch (error) {
      console.error('Error updating email alias:', error);
      res.status(500).json({ error: 'Failed to update email alias' });
    }
  });

  // Delete email alias
  app.delete('/api/domains/:domainId/email-aliases/:id', isAuthenticated, async (req: any, res) => {
    try {
      const success = await storage.deleteEmailAlias(parseInt(req.params.id), req.user.id);
      if (!success) {
        return res.status(404).json({ error: 'Email alias not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting email alias:', error);
      res.status(500).json({ error: 'Failed to delete email alias' });
    }
  });

  // Page Route Management
  // Get page routes for a domain
  app.get('/api/domains/:domainId/page-routes', isAuthenticated, async (req: any, res) => {
    try {
      const routes = await storage.getPageRoutes(parseInt(req.params.domainId), req.user.id);
      res.json(routes);
    } catch (error) {
      console.error('Error fetching page routes:', error);
      res.status(500).json({ error: 'Failed to fetch page routes' });
    }
  });

  // Create new page route
  app.post('/api/domains/:domainId/page-routes', isAuthenticated, async (req: any, res) => {
    try {
      const routeData = insertPageRouteSchema.parse({
        ...req.body,
        domainId: parseInt(req.params.domainId),
        createdBy: req.user.id
      });

      const route = await storage.createPageRoute(routeData);
      res.status(201).json(route);
    } catch (error) {
      console.error('Error creating page route:', error);
      res.status(500).json({ error: 'Failed to create page route' });
    }
  });

  // Update page route
  app.put('/api/domains/:domainId/page-routes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const routeData = insertPageRouteSchema.parse({
        ...req.body,
        domainId: parseInt(req.params.domainId),
        createdBy: req.user.id
      });

      const route = await storage.updatePageRoute(parseInt(req.params.id), routeData, req.user.id);
      if (!route) {
        return res.status(404).json({ error: 'Page route not found' });
      }
      res.json(route);
    } catch (error) {
      console.error('Error updating page route:', error);
      res.status(500).json({ error: 'Failed to update page route' });
    }
  });

  // Delete page route
  app.delete('/api/domains/:domainId/page-routes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const success = await storage.deletePageRoute(parseInt(req.params.id), req.user.id);
      if (!success) {
        return res.status(404).json({ error: 'Page route not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting page route:', error);
      res.status(500).json({ error: 'Failed to delete page route' });
    }
  });

  // Domain Settings Management
  // Get domain settings
  app.get('/api/domains/:domainId/settings', isAuthenticated, async (req: any, res) => {
    try {
      const settings = await storage.getDomainSettings(parseInt(req.params.domainId), req.user.id);
      res.json(settings);
    } catch (error) {
      console.error('Error fetching domain settings:', error);
      res.status(500).json({ error: 'Failed to fetch domain settings' });
    }
  });

  // Update domain settings
  app.put('/api/domains/:domainId/settings', isAuthenticated, async (req: any, res) => {
    try {
      const settingsData = insertDomainSettingsSchema.parse({
        ...req.body,
        domainId: parseInt(req.params.domainId),
        createdBy: req.user.id
      });

      const settings = await storage.updateDomainSettings(parseInt(req.params.domainId), settingsData, req.user.id);
      res.json(settings);
    } catch (error) {
      console.error('Error updating domain settings:', error);
      res.status(500).json({ error: 'Failed to update domain settings' });
    }
  });

  // Cloudflare Integration Routes (require API keys)
  // Transfer domain to Cloudflare
  app.post('/api/domains/:id/transfer-to-cloudflare', isAuthenticated, async (req: any, res) => {
    try {
      if (!cloudflareService) {
        return res.status(503).json({ error: 'Cloudflare API token required. Please configure CLOUDFLARE_API_TOKEN environment variable.' });
      }

      const domain = await storage.getDomain(parseInt(req.params.id), req.user.id);
      if (!domain) {
        return res.status(404).json({ error: 'Domain not found' });
      }

      // Create Cloudflare zone
      const cfZone = await cloudflareService.createZone(domain.name);
      
      // Update domain with Cloudflare zone ID
      await storage.updateDomain(parseInt(req.params.id), {
        ...domain,
        cloudflareZoneId: cfZone.id,
        transferredToCloudflare: true,
        dnsProvider: 'cloudflare'
      }, req.user.id);

      res.json({
        success: true,
        nameservers: cfZone.name_servers,
        zoneId: cfZone.id
      });
    } catch (error) {
      console.error('Error transferring domain to Cloudflare:', error);
      res.status(500).json({ error: 'Failed to transfer domain to Cloudflare' });
    }
  });

  // Check domain status
  app.get('/api/domains/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      if (!cloudflareService) {
        return res.status(503).json({ error: 'Cloudflare API token required' });
      }

      const domain = await storage.getDomain(parseInt(req.params.id), req.user.id);
      if (!domain) {
        return res.status(404).json({ error: 'Domain not found' });
      }

      const status = await cloudflareService.checkDomainStatus(domain.name);
      res.json(status);
    } catch (error) {
      console.error('Error checking domain status:', error);
      res.status(500).json({ error: 'Failed to check domain status' });
    }
  });

  // Domain configuration endpoint for admin
  app.post("/api/admin/configure-domain", requireAdmin, async (req: any, res) => {
    try {
      const { domain, target } = req.body;
      
      if (!process.env.CLOUDFLARE_API_TOKEN) {
        return res.status(500).json({ error: 'Cloudflare API token not configured' });
      }

      const { CloudflareService } = await import('./services/cloudflareService.js');
      const cloudflareService = new CloudflareService(process.env.CLOUDFLARE_API_TOKEN);

      // Get the zone for the domain
      const zone = await cloudflareService.getZone(domain);
      if (!zone) {
        return res.status(404).json({ error: `Zone not found for ${domain}` });
      }

      // Create CNAME record pointing to target
      const dnsRecord = await cloudflareService.createDNSRecord(zone.id, {
        type: 'CNAME',
        name: '@',
        content: target,
        ttl: 1,
        proxied: true
      });

      res.json({ 
        success: true, 
        message: `DNS record created for ${domain}`,
        record: dnsRecord 
      });
    } catch (error) {
      console.error('Error configuring domain:', error);
      res.status(500).json({ error: error.message || 'Failed to configure domain' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
