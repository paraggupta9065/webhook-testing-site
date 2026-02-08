import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { WS_EVENTS } from "@shared/schema";
import { z } from "zod";
import { authenticate, optionalAuth, type AuthRequest } from "./auth";
import { dynamicRateLimit, anonymousRateLimit } from "./rateLimit";
import { registerAuthRoutes } from "./authRoutes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: "*", // Allow all for MVP CLI access
    },
  });

  io.on("connection", (socket) => {
    socket.on(WS_EVENTS.JOIN_DASHBOARD, (endpointId) => {
      socket.join(`dashboard:${endpointId}`);
    });

    socket.on(WS_EVENTS.REGISTER_TUNNEL, (endpointId) => {
      socket.join(`tunnel:${endpointId}`);
    });
  });

  // Register authentication routes
  registerAuthRoutes(app);

  // API Routes - Endpoints Management
  // Create endpoint (optional auth - can be anonymous or authenticated)
  app.post(api.webhooks.create.path, optionalAuth, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      const endpoint = await storage.createEndpoint({
        ...req.body,
        userId,
      });
      res.status(201).json(endpoint);
    } catch (error) {
      console.error("Error creating endpoint:", error);
      res.status(500).json({ message: "Failed to create endpoint" });
    }
  });

  // List user's endpoints (authenticated)
  app.get("/api/endpoints", authenticate, async (req: AuthRequest, res) => {
    try {
      // TODO: Implement list user endpoints in storage
      res.json([]);
    } catch (error) {
      console.error("Error listing endpoints:", error);
      res.status(500).json({ message: "Failed to list endpoints" });
    }
  });

  app.get(api.webhooks.get.path, async (req, res) => {
    try {
      const endpoint = await storage.getEndpoint(req.params.id);
      if (!endpoint) {
        return res.status(404).json({ message: "Endpoint not found" });
      }
      res.json(endpoint);
    } catch (error) {
      console.error("Error fetching endpoint:", error);
      res.status(500).json({ message: "Failed to fetch endpoint" });
    }
  });

  app.get(api.webhooks.listRequests.path, async (req, res) => {
    try {
      const requests = await storage.getRequests(req.params.id);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching requests:", error);
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  // Update endpoint (authenticated, owner only)
  app.patch("/api/endpoints/:id", authenticate, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const endpoint = await storage.getEndpoint(id);
      
      if (!endpoint) {
        return res.status(404).json({ message: "Endpoint not found" });
      }

      // Check ownership
      if (endpoint.userId && endpoint.userId !== req.user?.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // TODO: Implement full endpoint update
      res.json({ message: "Endpoint update not fully implemented" });
    } catch (error) {
      console.error("Error updating endpoint:", error);
      res.status(500).json({ message: "Failed to update endpoint" });
    }
  });

  // Delete endpoint (authenticated, owner only)
  app.delete("/api/endpoints/:id", authenticate, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const endpoint = await storage.getEndpoint(id);
      
      if (!endpoint) {
        return res.status(404).json({ message: "Endpoint not found" });
      }

      // Check ownership
      if (endpoint.userId && endpoint.userId !== req.user?.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // TODO: Implement endpoint deletion
      res.json({ message: "Endpoint deletion not fully implemented" });
    } catch (error) {
      console.error("Error deleting endpoint:", error);
      res.status(500).json({ message: "Failed to delete endpoint" });
    }
  });

  // Update endpoint response configuration
  app.patch("/api/webhooks/:id/response", async (req, res) => {
    try {
      const { id } = req.params;
      const { responseStatus, responseHeaders, responseBody } = req.body;

      const endpoint = await storage.getEndpoint(id);
      if (!endpoint) {
        return res.status(404).json({ message: "Endpoint not found" });
      }

      const updated = await storage.updateEndpointResponse(id, {
        responseStatus: responseStatus ? parseInt(responseStatus, 10) : undefined,
        responseHeaders,
        responseBody,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating endpoint response:", error);
      res.status(500).json({ message: "Failed to update endpoint response" });
    }
  });

  // Clear endpoint history
  app.delete("/api/webhooks/:id/requests", async (req, res) => {
    try {
      const { id } = req.params;
      const endpoint = await storage.getEndpoint(id);
      
      if (!endpoint) {
        return res.status(404).json({ message: "Endpoint not found" });
      }

      await storage.deleteRequests(id);
      res.json({ message: "History cleared" });
    } catch (error) {
      console.error("Error clearing history:", error);
      res.status(500).json({ message: "Failed to clear history" });
    }
  });

  // Webhook Ingestion Route with rate limiting
  // Route `ALL /webhook/:slug` - Changed from :id to :slug for URL slug
  app.all("/webhook/:slug", anonymousRateLimit, async (req, res) => {
    const startTime = Date.now();
    const slug = req.params.slug;
    
    try {
      const endpoint = await storage.getEndpointBySlug(slug);

      if (!endpoint || !endpoint.isActive) {
        return res.status(404).send("Endpoint not found or inactive");
      }

      // Capture request details
      const requestData = {
        endpointId: endpoint.id,
        method: req.method,
        path: req.originalUrl,
        headers: JSON.stringify(req.headers),
        body: req.body ? JSON.stringify(req.body) : null,
        queryParams: JSON.stringify(req.query),
        contentType: req.get("content-type") || null,
        ipAddress: req.ip || null,
        userAgent: req.get("user-agent") || null,
        bodySize: req.body ? JSON.stringify(req.body).length : 0,
        processingTimeMs: null, // Will be set after processing
      };

      const savedRequest = await storage.createRequest(requestData);
      
      // Update processing time
      savedRequest.processingTimeMs = Date.now() - startTime;

      // Emit to dashboard
      io.to(`dashboard:${endpoint.id}`).emit(WS_EVENTS.NEW_REQUEST, savedRequest);

      // Emit to tunnel
      io.to(`tunnel:${endpoint.id}`).emit(WS_EVENTS.TUNNEL_REQUEST, savedRequest);

      // Send configured response
      const statusCode = endpoint.responseStatus || 200;
      const responseHeaders = endpoint.responseHeaders 
        ? JSON.parse(endpoint.responseHeaders) 
        : {};
      const responseBody = endpoint.responseBody || "OK";

      // Set custom headers
      Object.entries(responseHeaders).forEach(([key, value]) => {
        res.setHeader(key, value as string);
      });

      res.status(statusCode).send(responseBody);
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).send("Internal server error");
    }
  });

  return httpServer;
}
