import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";
const REFRESH_TOKEN_EXPIRES_IN = "30d";

export interface AuthRequest extends Request {
  user?: User;
}

// Generate JWT token
export function generateToken(userId: string, type: "access" | "refresh" = "access"): string {
  const expiresIn = type === "access" ? JWT_EXPIRES_IN : REFRESH_TOKEN_EXPIRES_IN;
  return jwt.sign({ userId, type }, JWT_SECRET, { expiresIn });
}

// Verify JWT token
export function verifyToken(token: string): { userId: string; type: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; type: string };
  } catch (error) {
    return null;
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// Compare password
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// Authentication middleware
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "No token provided" });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || decoded.type !== "access") {
      res.status(401).json({ message: "Invalid token" });
      return;
    }

    const user = await storage.getUser(decoded.userId);

    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Authentication failed" });
  }
}

// Optional authentication (doesn't fail if no token)
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      if (decoded && decoded.type === "access") {
        const user = await storage.getUser(decoded.userId);
        if (user) {
          req.user = user;
        }
      }
    }
    
    next();
  } catch (error) {
    next();
  }
}

// API key authentication
export async function authenticateApiKey(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers["x-api-key"] as string;
    
    if (!apiKey) {
      res.status(401).json({ message: "No API key provided" });
      return;
    }

    // TODO: Implement API key validation from database
    // For now, just pass through
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid API key" });
  }
}
