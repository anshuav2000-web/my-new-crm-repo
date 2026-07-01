import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";
import { promisify } from "util";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { users, settings } from "@shared/schema";
import { eq } from "drizzle-orm";
import { broadcastEvent } from "./routes";
import { Resend } from "resend";

const scryptAsync = promisify(crypto.scrypt);

// Hash password with scrypt
async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Compare password
async function comparePasswords(supplied: string, hashed: string) {
  try {
    const [hashedPassword, salt] = hashed.split(".");
    const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return crypto.timingSafeEqual(Buffer.from(hashedPassword, "hex"), buf);
  } catch (err) {
    return false;
  }
}

// Get resend email client securely with fallbacks
async function getResendClient() {
  try {
    const settingsArr = await db.select().from(settings);
    const settingsMap: Record<string, string> = {};
    for (const s of settingsArr) {
      if (s.value !== null) settingsMap[s.key] = s.value;
    }

    if (settingsMap.resend_api_key) {
      return {
        client: new Resend(settingsMap.resend_api_key),
        fromEmail: settingsMap.company_email ? `Canvas Cartel <${settingsMap.company_email}>` : "Canvas Cartel <info@canvascartel.in>",
      };
    }
  } catch (err) {
    console.error("Failed to query DB settings inside auth:getResendClient:", err);
  }

  if (process.env.RESEND_API_KEY) {
    return {
      client: new Resend(process.env.RESEND_API_KEY),
      fromEmail: process.env.RESEND_FROM_EMAIL || "Canvas Cartel <info@canvascartel.in>",
    };
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (xReplitToken && hostname) {
    try {
      const connectionSettings = await fetch(
        "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
        { headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken } }
      ).then((r) => r.json()).then((data) => data.items?.[0]);

      if (connectionSettings && connectionSettings.settings.api_key) {
        return {
          client: new Resend(connectionSettings.settings.api_key),
          fromEmail: connectionSettings.settings.from_email || "Canvas Cartel <onboarding@resend.dev>",
        };
      }
    } catch (e) {
      console.error("Failed to fetch Resend from Replit connector:", e);
    }
  }

  return null;
}

export function setupAuth(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    pool: pool,
    createTableIfMissing: true, // Will automatically create sessions table in PostgreSQL!
    tableName: "sessions",
    ttl: sessionTtl / 1000,
  });

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "canvas_cartel_crm_fallback_secret",
      store: sessionStore,
      resave: true, // Force session to save back to the session store
      saveUninitialized: false,
      proxy: true, // Required for trust proxy session cookie detection over reverse proxies
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax", // Ensure same-site lax is set to allow session transfers correctly
        maxAge: sessionTtl,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db.select().from(users).where(eq(users.username, username));
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, cb) => {
    cb(null, user.id);
  });

  passport.deserializeUser(async (id: string, cb) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      cb(null, user);
    } catch (err) {
      cb(err);
    }
  });

  // ========== AUTHENTICATION ENDPOINTS ==========

  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password, fullName, email } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required." });
      }

      // Check if user already exists
      const [existing] = await db.select().from(users).where(eq(users.username, username));
      if (existing) {
        return res.status(400).json({ message: "Username already exists." });
      }

      const hashedPassword = await hashPassword(password);

      // Determine role: make first user "admin", subsequent users "staff"
      const allUsers = await db.select().from(users);
      const role = allUsers.length === 0 ? "admin" : "staff";

      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          fullName: fullName || null,
          email: email || null,
          role,
          avatar: null,
        })
        .returning();

      req.login(newUser, (err) => {
        if (err) return next(err);
        return res.status(201).json(newUser);
      });
    } catch (err: any) {
      console.error("REGISTRATION ERROR TRACE:", err);
      return res.status(500).json({ message: err.message || "Internal server registration failure." });
    }
  });

  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(400).json({ message: info?.message || "Login failed" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((destroyErr) => {
        if (destroyErr) return next(destroyErr);
        res.clearCookie("connect.sid"); // Clear the session cookie explicitly
        res.json({ success: true, message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/auth/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    return res.json(req.user);
  });

  // ========== USER PROFILE & SETTINGS ENDPOINTS ==========

  // Update profile details
  app.patch("/api/auth/profile", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = req.user as any;
      const { fullName, email, phone, department, designation, bio, skills } = req.body;

      const [updatedUser] = await db
        .update(users)
        .set({
          fullName: fullName !== undefined ? fullName : undefined,
          email: email !== undefined ? email : undefined,
          phone: phone !== undefined ? phone : undefined,
          department: department !== undefined ? department : undefined,
          designation: designation !== undefined ? designation : undefined,
          bio: bio !== undefined ? bio : undefined,
          skills: skills !== undefined ? skills : undefined,
        })
        .where(eq(users.id, currentUser.id))
        .returning();

      // Broadcast update to sync user state across tabs
      broadcastEvent("users", "update", updatedUser);

      res.json(updatedUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Change password securely
  app.post("/api/auth/change-password", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = req.user as any;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Both current and new passwords are required." });
      }

      // Verify current password
      const [user] = await db.select().from(users).where(eq(users.id, currentUser.id));
      const isCorrect = await comparePasswords(currentPassword, user.password);
      if (!isCorrect) {
        return res.status(400).json({ message: "Incorrect current password." });
      }

      const newHashed = await hashPassword(newPassword);
      await db.update(users).set({ password: newHashed }).where(eq(users.id, currentUser.id));

      res.json({ success: true, message: "Password updated successfully." });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Forgot Password / Password Recovery Handler
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { username, email } = req.body;
      if (!username && !email) {
        return res.status(400).json({ message: "Please provide your username or email address." });
      }

      // Find user by username or email
      let userRecord;
      if (username) {
        const [u] = await db.select().from(users).where(eq(users.username, username));
        userRecord = u;
      } else {
        const [u] = await db.select().from(users).where(eq(users.email, email));
        userRecord = u;
      }

      if (!userRecord) {
        return res.status(404).json({ message: "No user found with the provided details." });
      }

      // Reset to standard temporary recovery password
      const tempPass = "CanvasRecover2026!";
      const hashedTemp = await hashPassword(tempPass);
      await db.update(users).set({ password: hashedTemp }).where(eq(users.id, userRecord.id));

      return res.json({
        success: true,
        message: "Your password has been successfully reset! Since standard email setups are offline, here is your temporary login password:",
        tempPassword: tempPass,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Get all users
  app.get("/api/admin/users", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = req.user as any;
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      const allUsers = await db.select().from(users);
      res.json(allUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Update user role & permissions
  app.patch("/api/admin/users/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = req.user as any;
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      const targetUserId = req.params.id as string;
      const { role, permissions } = req.body;

      const [updatedUser] = await db
        .update(users)
        .set({
          role: role || undefined,
          permissions: permissions || undefined,
        })
        .where(eq(users.id, targetUserId))
        .returning();

      // Broadcast real-time permission sync
      broadcastEvent("users", "update", updatedUser);

      res.json(updatedUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Register fresh employee user, auto-generate temporary password and send a gorgeous welcome email
  app.post("/api/admin/create-user", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = req.user as any;
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Only administrators can create accounts." });
      }

      const { username, email, fullName, role, department, designation } = req.body;
      if (!username || !email || !fullName) {
        return res.status(400).json({ message: "Username, email, and full name are required." });
      }

      // Check if username already exists
      const [existingUser] = await db.select().from(users).where(eq(users.username, username));
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists." });
      }

      // Auto-generate safe temporary password
      const tempPassword = "CC_Temp_" + crypto.randomBytes(3).toString("hex").toUpperCase();
      const hashedTempPassword = await hashPassword(tempPassword);

      // Default modules permissions based on role
      const modules = ["leads", "contacts", "pipeline", "call-logs", "tasks", "invoices", "payments", "expenses", "webhooks", "settings"];
      const permissions: Record<string, boolean> = {};
      modules.forEach((m) => {
        permissions[m] = role === "manager" || ["leads", "contacts", "pipeline", "call-logs", "tasks"].includes(m);
      });

      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedTempPassword,
          fullName,
          email,
          role: role || "staff",
          department: department || null,
          designation: designation || null,
          permissions,
          avatar: null,
        })
        .returning();

      // Broadcast real-time creation
      broadcastEvent("users", "create", newUser);

      // Try sending onboarding welcome email with Resend
      let emailSent = false;
      const resendInfo = await getResendClient();
      if (resendInfo) {
        try {
          const emailHtml = `
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#ffffff;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">
              <tr>
                <td style="background:#0A1628;padding:40px;color:#ffffff;text-align:center">
                  <h1 style="margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px">Canvas Cartel Connect</h1>
                  <p style="margin:8px 0 0;font-size:13px;color:#B3B9C6;letter-spacing:0.5px">AI Automation & Digital Solutions</p>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;color:#4A4F5C;line-height:1.6">
                  <p style="margin:0;font-size:16px;font-weight:700;color:#0A1628">Hello ${fullName},</p>
                  <p style="margin:12px 0 0;font-size:14px">Welcome to the team! A fresh account has been successfully created for you on the **Canvas Cartel CRM** system.</p>
                  
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:25px 0;background:#F4F6FB;border-radius:8px;padding:20px">
                    <tr>
                      <td style="font-size:13px">
                        <div style="margin-bottom:8px">🔗 <strong>CRM Link:</strong> <a href="https://ccrm.canvascartel.in" style="color:#1E5EFF;font-weight:600;text-decoration:none">ccrm.canvascartel.in</a></div>
                        <div style="margin-bottom:8px">👤 <strong>Username:</strong> <code style="font-family:monospace;background:#E5E7EB;padding:2px 6px;border-radius:4px">${username}</code></div>
                        <div>🔑 <strong>Temporary Password:</strong> <code style="font-family:monospace;background:#E5E7EB;padding:2px 6px;border-radius:4px">${tempPassword}</code></div>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0;font-size:13px;color:#E53E3E;font-weight:600">⚠️ IMPORTANT ACTION REQUIRED:</p>
                  <p style="margin:6px 0 0;font-size:13px;color:#6B7280">Please log in immediately using your temporary password and update it by navigating to your <strong>My Profile</strong> tab inside settings.</p>
                </td>
              </tr>
              <tr>
                <td style="background:#F4F6FB;padding:20px;text-align:center;font-size:12px;color:#8A8F9C;border-top:1px solid #E5E7EB">
                  Canvas Cartel • Gurugram • hello@canvascartel.in
                </td>
              </tr>
            </table>
          `;

          await resendInfo.client.emails.send({
            from: resendInfo.fromEmail,
            to: [email],
            subject: "Welcome to Canvas Cartel - Your CRM Account is Ready!",
            html: emailHtml,
          });
          emailSent = true;
          console.log(`[Onboarding] Welcome email sent successfully to ${email}`);
        } catch (emailErr) {
          console.error("[Onboarding] Failed to send onboarding email via Resend:", emailErr);
        }
      }

      res.status(201).json({
        success: true,
        user: newUser,
        tempPassword,
        emailSent,
      });
    } catch (error: any) {
      console.error("[Onboarding] Failed to create user account:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Delete (Fire) an employee account
  app.delete("/api/admin/users/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = req.user as any;
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Only administrators can fire employees." });
      }

      const targetUserId = req.params.id as string;
      if (targetUserId === currentUser.id) {
        return res.status(400).json({ message: "Conflict: You cannot delete/fire your own admin account!" });
      }

      await db.delete(users).where(eq(users.id, targetUserId));

      // Broadcast update to sync user state across all connected interfaces in real-time
      broadcastEvent("users", "delete", { id: targetUserId });

      res.status(200).json({ success: true, message: "Employee account removed successfully." });
    } catch (error: any) {
      console.error("[Onboarding] Failed to delete user account:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Admin: Reset password and resend welcome onboarding email
  app.post("/api/admin/users/:id/resend-welcome", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const currentUser = req.user as any;
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Only administrators can dispatch welcome credentials." });
      }

      const targetUserId = req.params.id as string;
      const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));
      if (!targetUser) {
        return res.status(404).json({ message: "Employee account not found." });
      }

      // Generate a fresh temporary password and update database
      const tempPassword = "CC_Temp_" + crypto.randomBytes(3).toString("hex").toUpperCase();
      const hashedTempPassword = await hashPassword(tempPassword);

      await db
        .update(users)
        .set({ password: hashedTempPassword })
        .where(eq(users.id, targetUserId));

      // Broadcast update
      broadcastEvent("users", "update", targetUser);

      let emailSent = false;
      const resendInfo = await getResendClient();
      if (resendInfo && targetUser.email) {
        try {
          const emailHtml = `
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#ffffff;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden">
              <tr>
                <td style="background:#0A1628;padding:40px;color:#ffffff;text-align:center">
                  <h1 style="margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px">Canvas Cartel Connect</h1>
                  <p style="margin:8px 0 0;font-size:13px;color:#B3B9C6;letter-spacing:0.5px">AI Automation & Digital Solutions</p>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;color:#4A4F5C;line-height:1.6">
                  <p style="margin:0;font-size:16px;font-weight:700;color:#0A1628">Hello ${targetUser.fullName || targetUser.username},</p>
                  <p style="margin:12px 0 0;font-size:14px">Your access credentials for the **Canvas Cartel CRM** system have been re-issued by your administrator.</p>
                  
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:25px 0;background:#F4F6FB;border-radius:8px;padding:20px">
                    <tr>
                      <td style="font-size:13px">
                        <div style="margin-bottom:8px">🔗 <strong>CRM Link:</strong> <a href="https://ccrm.canvascartel.in" style="color:#1E5EFF;font-weight:600;text-decoration:none">ccrm.canvascartel.in</a></div>
                        <div style="margin-bottom:8px">👤 <strong>Username:</strong> <code style="font-family:monospace;background:#E5E7EB;padding:2px 6px;border-radius:4px">${targetUser.username}</code></div>
                        <div>🔑 <strong>Temporary Password:</strong> <code style="font-family:monospace;background:#E5E7EB;padding:2px 6px;border-radius:4px">${tempPassword}</code></div>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0;font-size:13px;color:#E53E3E;font-weight:600">⚠️ IMPORTANT ACTION REQUIRED:</p>
                  <p style="margin:6px 0 0;font-size:13px;color:#6B7280">Please log in immediately using your new temporary password and update it by navigating to your <strong>My Profile</strong> tab inside settings.</p>
                </td>
              </tr>
              <tr>
                <td style="background:#F4F6FB;padding:20px;text-align:center;font-size:12px;color:#8A8F9C;border-top:1px solid #E5E7EB">
                  Canvas Cartel • Gurugram • hello@canvascartel.in
                </td>
              </tr>
            </table>
          `;

          await resendInfo.client.emails.send({
            from: resendInfo.fromEmail,
            to: [targetUser.email],
            subject: "Reissued Credentials - Canvas Cartel CRM",
            html: emailHtml,
          });
          emailSent = true;
          console.log(`[Onboarding] Welcome email re-sent successfully to ${targetUser.email}`);
        } catch (emailErr) {
          console.error("[Onboarding] Failed to send onboarding email via Resend:", emailErr);
        }
      }

      res.status(200).json({
        success: true,
        tempPassword,
        emailSent,
      });
    } catch (error: any) {
      console.error("[Onboarding] Failed to resend onboarding email:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Automatically seed the default Super Admin user on start
  seedAdminUser();
}

export async function seedAdminUser() {
  try {
    const [existing] = await db.select().from(users).where(eq(users.username, "admin"));
    if (!existing) {
      console.log("[Seeder] Creating permanent Super Admin user...");
      const hashedPassword = await hashPassword("CanvasCartelAdmin2026!");

      const modules = [
        "leads", "contacts", "pipeline", "call-logs", "tasks",
        "invoices", "payments", "expenses", "webhooks", "settings"
      ];
      const permissions: Record<string, boolean> = {};
      modules.forEach(m => {
        permissions[m] = true;
      });

      await db.insert(users).values({
        username: "admin",
        password: hashedPassword,
        fullName: "Super Admin",
        email: "hello@canvascartel.in",
        role: "admin",
        permissions: permissions,
        avatar: null,
      });
      console.log("[Seeder] Super Admin created successfully!");
      console.log("[Seeder] Username: admin");
      console.log("[Seeder] Password: CanvasCartelAdmin2026!");
    }
  } catch (error) {
    console.error("[Seeder] Failed to seed Super Admin user:", error);
  }
}

// Authentication middleware to guard API routes
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized: Please log in." });
}
