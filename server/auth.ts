import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";
import { promisify } from "util";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { broadcastEvent } from "./routes";

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

export function setupAuth(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    pool: pool,
    createTableIfMissing: false, // Will automatically create sessions table in PostgreSQL!
    tableName: "sessions",
    ttl: sessionTtl / 1000,
  });

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "canvas_cartel_crm_fallback_secret",
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
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
      res.json({ success: true, message: "Logged out successfully" });
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
