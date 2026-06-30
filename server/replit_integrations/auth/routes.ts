import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { broadcastEvent } from "../../routes";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await authStorage.getUser(userId);
      
      // Auto-promote first user to admin if database has only one user
      if (user && !user.role) {
        const allUsers = await authStorage.getAllUsers();
        if (allUsers.length <= 1) {
          user = await authStorage.updateUser(userId, { role: "admin" });
        }
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Admin: Get all users
  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const currentUser = await authStorage.getUser(currentUserId);
      const allUsers = await authStorage.getAllUsers();

      // Bootstrap check: allow if no other users, or if current is admin
      const isFirstUser = allUsers.length <= 1;
      const isAdmin = currentUser?.role === "admin";

      if (!isAdmin && !isFirstUser) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin: Update user role & permissions
  app.patch("/api/admin/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const currentUser = await authStorage.getUser(currentUserId);
      
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
      }

      const targetUserId = req.params.id;
      const { role, permissions } = req.body;

      const updatedUser = await authStorage.updateUser(targetUserId, { role, permissions });
      
      // Broadcast real-time user permission sync to all connected clients
      broadcastEvent("users", "update", updatedUser);

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });
}
