import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "./auth";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

const rateLimitStore: RateLimitStore = {};

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach((key) => {
    if (rateLimitStore[key].resetAt < now) {
      delete rateLimitStore[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
}

// Rate limiting middleware factory
export function rateLimit(options: RateLimitOptions) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Determine the key for rate limiting
      // Use user ID if authenticated, otherwise use IP
      const key = req.user?.id || req.ip || "anonymous";
      
      const now = Date.now();
      const resetAt = now + options.windowMs;

      // Initialize or get the current rate limit data
      if (!rateLimitStore[key] || rateLimitStore[key].resetAt < now) {
        rateLimitStore[key] = {
          count: 0,
          resetAt,
        };
      }

      const rateLimit = rateLimitStore[key];
      rateLimit.count++;

      // Set rate limit headers
      res.setHeader("X-RateLimit-Limit", options.maxRequests);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, options.maxRequests - rateLimit.count));
      res.setHeader("X-RateLimit-Reset", new Date(rateLimit.resetAt).toISOString());

      // Check if rate limit exceeded
      if (rateLimit.count > options.maxRequests) {
        res.status(429).json({
          message: options.message || "Too many requests, please try again later",
          retryAfter: Math.ceil((rateLimit.resetAt - now) / 1000),
        });
        return;
      }

      // Handle successful requests
      if (options.skipSuccessfulRequests) {
        res.on("finish", () => {
          if (res.statusCode < 400) {
            rateLimit.count--;
          }
        });
      }

      next();
    } catch (error) {
      console.error("Rate limiting error:", error);
      next();
    }
  };
}

// Preset rate limiters
export const anonymousRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 100,
  message: "Anonymous users are limited to 100 requests per hour",
});

export const freeUserRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 1000,
  message: "Free plan is limited to 1000 requests per day",
});

export const proUserRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 50000,
  message: "Pro plan is limited to 50,000 requests per day",
});

// Dynamic rate limiter based on user plan
export async function dynamicRateLimit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const user = req.user;

  if (!user) {
    // Anonymous user
    await anonymousRateLimit(req, res, next);
    return;
  }

  // Apply rate limit based on plan
  switch (user.plan) {
    case "pro":
    case "enterprise":
      await proUserRateLimit(req, res, next);
      break;
    case "free":
    default:
      await freeUserRateLimit(req, res, next);
      break;
  }
}
