import type { RequestHandler } from "express";
import { storage } from "./storage";

// Define available beta features (deprecated - kept for backward compatibility)
export const BETA_FEATURES = {
  SCRIPT_EDITOR: 'script-editor',
  PROPS_TRACKER: 'props-tracker',
  COSTUME_TRACKER: 'costume-tracker',
  ADVANCED_TEMPLATES: 'advanced-templates',
  TEAM_COLLABORATION: 'team-collaboration',
  CALENDAR_MANAGEMENT: 'calendar-management',
  CAST_MANAGEMENT: 'cast-management',
  TASK_BOARDS: 'task-boards'
} as const;

// Check if user has beta access to specific features
export const requiresBetaAccess = (requiredFeature?: string): RequestHandler => {
  return async (req: any, res, next) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Owner always has access
      if (userId === '44106967') {
        return next();
      }

      // Check if user has beta access
      if (!user.betaAccess) {
        return res.status(403).json({ 
          message: "Beta access required for this feature",
          betaRequired: true 
        });
      }

      next();
    } catch (error) {
      console.error("Beta access check error:", error);
      res.status(500).json({ message: "Access check failed" });
    }
  };
};

// Check if user has access to a feature (for frontend use)
export const checkFeatureAccess = async (userId: string, feature?: string): Promise<boolean> => {
  try {
    // Owner always has access
    if (userId === '44106967') {
      return true;
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return false;
    }

    // Simple beta access check - no feature-specific logic
    return !!user.betaAccess;
  } catch (error) {
    console.error("Feature access check error:", error);
    return false;
  }
};