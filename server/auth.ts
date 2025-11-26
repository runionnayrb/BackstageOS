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

function getCookieDomain(host: string): string | undefined {
  if (host.includes('backstageos.com')) {
    return '.backstageos.com';
  }
  return undefined;
}

function isProductionHost(host: string): boolean {
  return host.includes('backstageos.com') || 
         host.includes('.replit.app') ||
         host.includes('.replit.dev');
}

export function setupAuth(app: Express) {
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
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    },
    name: 'backstage.sid',
    rolling: true,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  
  app.use((req, res, next) => {
    const host = req.get('host') || '';
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    
    if (req.session && req.session.cookie) {
      req.session.cookie.secure = isSecure;
      
      const domain = getCookieDomain(host);
      if (domain) {
        req.session.cookie.domain = domain;
      }
    }
    next();
  });
  
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

      // Check if email is on the waitlist for beta access
      let hasWaitlistAccess = false;
      try {
        const waitlistEntry = await storage.getWaitlistByEmail(email);
        hasWaitlistAccess = !!waitlistEntry;
        console.log(`Waitlist check for ${email}: ${hasWaitlistAccess ? 'FOUND' : 'NOT FOUND'}`);
      } catch (waitlistError) {
        console.error('Error checking waitlist:', waitlistError);
      }

      // Create new user - only grant beta access if they're on the waitlist
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        betaAccess: hasWaitlistAccess, // Only grant beta access if on waitlist
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

      // Log them in automatically with session regeneration
      const transformedUser = {
        ...user,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        profileType: user.profileType || undefined,
        betaAccess: user.betaAccess || "none",
        isAdmin: user.isAdmin || false,
        isActive: user.isActive !== false,
      };
      
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) {
          console.error("Session regeneration error on register:", regenerateErr);
        }
        
        req.login(transformedUser, (loginErr) => {
          if (loginErr) return next(loginErr);
          
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error("Session save error on register:", saveErr);
            }
            res.status(201).json(transformedUser);
          });
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Login endpoint with session regeneration for security
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    const user = req.user;
    const host = req.get('host') || '';
    
    req.session.regenerate((regenerateErr) => {
      if (regenerateErr) {
        console.error("Session regeneration error:", regenerateErr);
      }
      
      req.login(user!, (loginErr) => {
        if (loginErr) {
          console.error("Re-login after regeneration error:", loginErr);
          return res.status(500).json({ message: "Login failed" });
        }
        
        console.log("Login successful:", {
          userId: req.user?.id,
          sessionId: req.session?.id,
          isAuthenticated: req.isAuthenticated(),
          host: host,
          cookieDomain: req.session?.cookie?.domain,
          cookieSecure: req.session?.cookie?.secure,
          userAgent: req.get('User-Agent')?.substring(0, 50)
        });
        
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
          } else {
            console.log("Session saved successfully with ID:", req.session?.id);
          }
          res.status(200).json(req.user);
        });
      });
    });
  });

  // Logout endpoint - fully destroy session and clear cookie
  app.post("/api/logout", (req, res, next) => {
    const host = req.get('host') || '';
    const cookieDomain = getCookieDomain(host);
    
    req.logout((logoutErr) => {
      if (logoutErr) {
        console.error("Logout error:", logoutErr);
        return next(logoutErr);
      }
      
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
        }
        
        res.clearCookie('backstage.sid', {
          path: '/',
          domain: cookieDomain,
          httpOnly: true,
          secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
          sameSite: 'lax'
        });
        
        console.log("Logout complete, session destroyed, cookie cleared");
        res.sendStatus(200);
      });
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

      // Check subscription status and add payment info to user data
      try {
        const user = await storage.getUser(req.user.id.toString());
        if (user && !user.isAdmin) {
          const needsPayment = user.subscriptionStatus === 'past_due' ||
                              user.subscriptionStatus === 'canceled' ||
                              user.subscriptionStatus === 'incomplete';

          // Add payment status to user response for frontend handling
          if (needsPayment) {
            console.log(`User ${req.user.email} needs payment: ${user.subscriptionStatus}`);
            return res.json({ 
              ...req.user,
              needsPayment: true,
              subscriptionStatus: user.subscriptionStatus,
              redirectTo: "/billing"
            });
          }
        }
      } catch (error) {
        console.error("Subscription status check error in /api/user:", error);
        // Continue on error to avoid blocking legitimate users
      }

      return res.json(req.user);
    }
    
    // SECURITY: No bypass - users must be properly authenticated
    // Return 401 for unauthenticated requests
    return res.sendStatus(401);
  });
}