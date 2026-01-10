import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { WS_EVENTS } from "@shared/schema";
import { z } from "zod";

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
    socket.on(WS_EVENTS.JOIN_DASHBOARD, (webhookId) => {
      socket.join(`dashboard:${webhookId}`);
    });

    socket.on(WS_EVENTS.REGISTER_TUNNEL, (webhookId) => {
      socket.join(`tunnel:${webhookId}`);
    });
  });

  // API Routes
  app.post(api.webhooks.create.path, async (req, res) => {
    const webhook = await storage.createWebhook();
    res.status(201).json(webhook);
  });

  app.get(api.webhooks.get.path, async (req, res) => {
    const webhook = await storage.getWebhook(req.params.id);
    if (!webhook) {
      return res.status(404).json({ message: "Webhook not found" });
    }
    res.json(webhook);
  });

  app.get(api.webhooks.listRequests.path, async (req, res) => {
    const requests = await storage.getRequests(req.params.id);
    res.json(requests);
  });

  // Ingestion Route
  // Route `ALL /webhook/:uuid`
  app.all("/webhook/:id", async (req, res) => {
    const webhookId = req.params.id;
    const webhook = await storage.getWebhook(webhookId);

    if (!webhook) {
      return res.status(404).send("Webhook not found");
    }

    // Capture request details
    const requestData = {
      webhookId,
      method: req.method,
      path: req.originalUrl, // or req.path, but originalUrl includes query if we want
      headers: req.headers as Record<string, any>,
      body: req.body,
      query: req.query as Record<string, any>,
    };

    const savedRequest = await storage.createRequest(requestData);

    // Emit to dashboard
    io.to(`dashboard:${webhookId}`).emit(WS_EVENTS.NEW_REQUEST, savedRequest);

    // Emit to tunnel
    io.to(`tunnel:${webhookId}`).emit(WS_EVENTS.TUNNEL_REQUEST, savedRequest);

    res.status(200).send("OK");
  });

  return httpServer;
}
