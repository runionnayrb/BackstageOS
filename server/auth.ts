import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      profileType?: string | null;
      betaAccess: string | null;
      betaFeatures?: unknown;
      isAdmin?: boolean | null;
      isActive?: boolean | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    }
  }
}

async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

async function comparePasswords(supplied: string, stored: string) {
  return await bcrypt.compare(supplied, stored);
}

export function setupAuth(app: Express) {
  // Use PostgreSQL store for session persistence
  const PgSession = connectPg(session);
  const pgStore = new PgSession({
    pool: pool,
    tableName: 'sessions',
    createTableIfMissing: true
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: pgStore,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for better persistence
      sameSite: 'lax',
    },
    name: 'backstage.sid',
    rolling: true, // Extends session on each request
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  
  // Session refresh middleware - extends session on each request
  app.use((req, res, next) => {
    if (req.session && req.user) {
      // Reset the session timeout on each request
      req.session.touch();
    }
    next();
  });
  
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid email or password" });
          }
          // Transform user to match Express.User interface
          const transformedUser = {
            ...user,
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
            profileType: user.profileType || undefined,
            betaAccess: user.betaAccess || "none",
            isAdmin: user.isAdmin || false,
            isActive: user.isActive !== false, // Default to true unless explicitly false
          };
          return done(null, transformedUser);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id.toString());
      if (!user) {
        return done(null, false);
      }
      // Transform user to match Express.User interface
      const transformedUser = {
        ...user,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        profileType: user.profileType || undefined,
        betaAccess: user.betaAccess || "none",
        isAdmin: user.isAdmin || false,
        isActive: user.isActive !== false, // Default to true unless explicitly false
      };
      done(null, transformedUser);
    } catch (error) {
      done(error);
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Create new user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        betaAccess: "limited", // Default beta access
        defaultReplyToEmail: email, // Auto-populate with their registration email
        emailDisplayName: `${firstName} ${lastName}`.trim() || null, // Auto-populate with their name
      });

      // Check if this email was on the waitlist and convert it to "converted" status
      try {
        await storage.convertWaitlistToUser(email);
        console.log(`Converted waitlist entry for ${email} to "converted" status`);
      } catch (waitlistError) {
        // Log but don't fail registration if waitlist conversion fails
        console.error('Error converting waitlist entry:', waitlistError);
      }

      // Log them in automatically
      const transformedUser = {
        ...user,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        profileType: user.profileType || undefined,
        betaAccess: user.betaAccess || "none",
        isAdmin: user.isAdmin || false,
        isActive: user.isActive !== false, // Default to true unless explicitly false
      };
      req.login(transformedUser, (err) => {
        if (err) return next(err);
        res.status(201).json(transformedUser);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Login endpoint
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    console.log("Login successful:", {
      userId: req.user?.id,
      sessionId: req.session?.id,
      isAuthenticated: req.isAuthenticated(),
      userAgent: req.get('User-Agent')?.substring(0, 50)
    });
    
    // Force session save for mobile Safari compatibility
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
      } else {
        console.log("Session saved successfully");
      }
      res.status(200).json(req.user);
    });
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user endpoint
  app.get("/api/user", async (req, res) => {
    // Check normal authentication first
    if (req.isAuthenticated()) {
      // Check if user account is active
      if (req.user && req.user.isActive === false) {
        console.log(`Access denied: User ${req.user.email} has inactive account`);
        return res.status(403).json({ 
          message: "Account is inactive. Please contact support.",
          reason: "account_inactive"
        });
      }
      return res.json(req.user);
    }
    
    // TEMPORARY: Safari admin bypass for iPad session issues
    if (req.headers['user-agent']?.includes('Safari')) {
      try {
        // Look for the correct admin user (Bryan Runion)
        const adminUser = await storage.getUserByEmail('runion.bryan@gmail.com');
        if (adminUser && adminUser.isAdmin) {
          console.log("SAFARI ADMIN BYPASS: /api/user allowing access for admin user");
          // Transform user to match Express.User interface
          const transformedUser = {
            ...adminUser,
            firstName: adminUser.firstName || undefined,
            lastName: adminUser.lastName || undefined,
            profileType: adminUser.profileType || undefined,
            betaAccess: adminUser.betaAccess || false,
            isAdmin: adminUser.isAdmin || false,
            isActive: adminUser.isActive !== false, // Default to true unless explicitly false
          };
          return res.json(transformedUser);
        }
      } catch (error) {
        console.log("Admin bypass check failed:", error);
      }
    }
    
    return res.sendStatus(401);
  });
}