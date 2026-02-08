import type { Express } from "express";
import { storage } from "./storage";
import { 
  generateToken, 
  verifyToken, 
  hashPassword, 
  comparePassword,
  authenticate,
  type AuthRequest 
} from "./auth";
import { z } from "zod";
import { randomUUID } from "crypto";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export function registerAuthRoutes(app: Express): void {
  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        id: randomUUID(),
        email,
        passwordHash,
        name: name || null,
        username: null,
        plan: "free",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Generate tokens
      const accessToken = generateToken(user.id, "access");
      const refreshToken = generateToken(user.id, "refresh");

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const isValid = await comparePassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate tokens
      const accessToken = generateToken(user.id, "access");
      const refreshToken = generateToken(user.id, "refresh");

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Refresh token
  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token required" });
      }

      const decoded = verifyToken(refreshToken);
      if (!decoded || decoded.type !== "refresh") {
        return res.status(401).json({ message: "Invalid refresh token" });
      }

      const user = await storage.getUser(decoded.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Generate new tokens
      const accessToken = generateToken(user.id, "access");
      const newRefreshToken = generateToken(user.id, "refresh");

      res.json({
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(500).json({ message: "Token refresh failed" });
    }
  });

  // Get current user profile
  app.get("/api/user/profile", authenticate, async (req: AuthRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        plan: user.plan,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Update user profile
  app.patch("/api/user/profile", authenticate, async (req: AuthRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { name, username } = req.body;

      // TODO: Implement user update in storage
      res.json({
        message: "Profile update not yet implemented",
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Get user usage statistics
  app.get("/api/user/usage", authenticate, async (req: AuthRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // TODO: Implement usage statistics
      res.json({
        totalEndpoints: 0,
        totalRequests: 0,
        requestsThisMonth: 0,
        plan: user.plan,
        limits: {
          endpoints: user.plan === "pro" ? 100 : 10,
          requestsPerDay: user.plan === "pro" ? 50000 : 1000,
        },
      });
    } catch (error) {
      console.error("Usage fetch error:", error);
      res.status(500).json({ message: "Failed to fetch usage" });
    }
  });
}
