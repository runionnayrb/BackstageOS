import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { storage } from "./storage";
import { User } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { pool, db } from "./db";
import { users, teamMembers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sendEmailWithResend } from "./services/resendService";

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
    createTableIfMissing: true,
    disableTouch: true,
  });

  const isReplit = !!(process.env.REPL_ID || process.env.REPL_SLUG);
  const useSecureCookies = process.env.NODE_ENV === 'production' || isReplit;
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: pgStore,
    cookie: {
      secure: useSecureCookies,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: useSecureCookies ? 'none' : 'lax',
    },
    name: 'backstage.sid',
    rolling: false,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  
  // Passport 0.7 compatibility: wrap regenerate/save to work with connect-pg-simple
  // Passport 0.7 calls req.session.regenerate() during login, which can break
  // session stores that don't fully support regeneration
  app.use((req, res, next) => {
    if (req.session) {
      const origRegenerate = req.session.regenerate;
      req.session.regenerate = function (cb: (err?: any) => void) {
        origRegenerate.call(this, (err: any) => {
          if (!err && req.session && req.session.cookie) {
            const host = req.get('host') || '';
            const domain = getCookieDomain(host);
            if (domain) {
              req.session.cookie.domain = domain;
            }
          }
          cb(err);
        });
      };

      const origSave = req.session.save;
      req.session.save = function (cb?: (err?: any) => void) {
        origSave.call(this, cb || function () {});
      };
    }

    const host = req.get('host') || '';
    if (req.session && req.session.cookie) {
      const domain = getCookieDomain(host);
      if (domain) {
        req.session.cookie.domain = domain;
      }
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

      // Create new user - beta access depends on BILLING_MODE
      // BILLING_MODE=beta (default): All users get free access
      // BILLING_MODE=live: Users must pay to access features
      const billingMode = process.env.BILLING_MODE || 'beta';
      const grantBetaAccess = billingMode === 'beta';
      
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        betaAccess: grantBetaAccess, // Only grant free beta access in beta mode
        defaultReplyToEmail: email, // Auto-populate with their registration email
        emailDisplayName: `${firstName} ${lastName}`.trim() || null, // Auto-populate with their name
      });

      // Check if this email has pending team invitations and auto-assign profileType from project owner
      try {
        const pendingInvitations = await db.select()
          .from(teamMembers)
          .where(eq(teamMembers.email, email));
        
        if (pendingInvitations.length > 0) {
          // Get the first pending invitation's project
          const firstInvitation = pendingInvitations[0];
          const project = await storage.getProjectById(firstInvitation.projectId);
          
          if (project) {
            // Get the project owner's profileType
            const projectOwner = await storage.getUser(project.ownerId.toString());
            
            if (projectOwner && projectOwner.profileType) {
              // Auto-assign the owner's profileType to the new team member
              await storage.updateUser(user.id, { profileType: projectOwner.profileType });
              console.log(`Auto-assigned profileType "${projectOwner.profileType}" to ${email} from project owner`);
            }
          }
        }
      } catch (invitationError) {
        // Log but don't fail registration if invitation check fails
        console.error('Error checking team invitations:', invitationError);
      }

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
        isActive: user.isActive !== false,
      };
      
      req.login(transformedUser, (loginErr) => {
        if (loginErr) return next(loginErr);
        
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error on register:", saveErr);
          }
          res.status(201).json(transformedUser);
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Login endpoint
  app.post("/api/login", passport.authenticate("local"), async (req, res) => {
    const host = req.get('host') || '';
    
    console.log("Login successful:", {
      userId: req.user?.id,
      sessionId: req.session?.id,
      isAuthenticated: req.isAuthenticated(),
      host: host,
      cookieDomain: req.session?.cookie?.domain,
      cookieSecure: req.session?.cookie?.secure,
      userAgent: req.get('User-Agent')?.substring(0, 50)
    });
    
    // Update lastActiveAt timestamp on login
    if (req.user?.id) {
      try {
        await storage.updateUser(req.user.id, { lastActiveAt: new Date() });
      } catch (error) {
        console.error("Failed to update lastActiveAt on login:", error);
      }
    }
    
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error("Session save error:", saveErr);
      } else {
        console.log("Session saved successfully with ID:", req.session?.id);
      }
      res.status(200).json(req.user);
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
        
        const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
        res.clearCookie('backstage.sid', {
          path: '/',
          domain: cookieDomain,
          httpOnly: true,
          secure: isSecure,
          sameSite: isSecure ? 'none' : 'lax'
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

  // Forgot password - send reset email
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "If an account exists with that email, you will receive a password reset link." });
      }

      // Generate a secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save token to database
      await db.update(users)
        .set({
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires,
        })
        .where(eq(users.id, user.id));

      // Build reset URL
      const host = req.get('host') || 'backstageos.com';
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const resetUrl = `${protocol}://${host}/reset-password?token=${resetToken}`;

      // Send reset email via Resend
      try {
        await sendEmailWithResend({
          to: [email],
          subject: "Reset Your BackstageOS Password",
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Reset Your Password</h1>
              <p style="color: #555; font-size: 16px; line-height: 1.5;">
                You requested to reset your password for your BackstageOS account. Click the button below to set a new password:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="color: #777; font-size: 14px; line-height: 1.5;">
                This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px;">
                BackstageOS - Professional Stage Management Platform
              </p>
            </div>
          `,
        });
        console.log(`Password reset email sent to ${email} via Resend`);
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
        // Don't expose email sending errors to user
      }

      res.json({ message: "If an account exists with that email, you will receive a password reset link." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "An error occurred. Please try again." });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Find user with valid token
      const [user] = await db.select()
        .from(users)
        .where(eq(users.passwordResetToken, token))
        .limit(1);

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }

      // Check if token is expired
      if (!user.passwordResetExpires || new Date() > user.passwordResetExpires) {
        return res.status(400).json({ message: "Reset link has expired. Please request a new one." });
      }

      // Hash new password and update user
      const hashedPassword = await hashPassword(password);
      
      await db.update(users)
        .set({
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      console.log(`Password reset successful for user ${user.email}`);
      res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "An error occurred. Please try again." });
    }
  });
}