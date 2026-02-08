import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").unique(),
  passwordHash: text("password_hash"),
  name: text("name"),
  plan: text("plan").default("free"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

export const endpoints = sqliteTable("endpoints", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  uniqueSlug: text("unique_slug").notNull().unique(),
  name: text("name"),
  description: text("description"),
  customDomain: text("custom_domain"),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  maxRequests: integer("max_requests").default(100),
  responseStatus: integer("response_status").default(200),
  responseHeaders: text("response_headers"), // JSON as text
  responseBody: text("response_body"),
  forwardUrl: text("forward_url"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

export const requests = sqliteTable("requests", {
  id: text("id").primaryKey(),
  endpointId: text("endpoint_id").notNull(),
  method: text("method").notNull(),
  path: text("path"),
  queryParams: text("query_params"), // JSON as text
  headers: text("headers").notNull(), // JSON as text
  body: text("body"),
  bodySize: integer("body_size"),
  contentType: text("content_type"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: integer("timestamp", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  processingTimeMs: integer("processing_time_ms"),
});

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

export const workspaceMembers = sqliteTable("workspace_members", {
  workspaceId: text("workspace_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").default("member"),
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users);
export const insertEndpointSchema = createInsertSchema(endpoints);
export const insertRequestSchema = createInsertSchema(requests);
export const insertWorkspaceSchema = createInsertSchema(workspaces);
export const insertWorkspaceMemberSchema = createInsertSchema(workspaceMembers);

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Endpoint = typeof endpoints.$inferSelect;
export type InsertEndpoint = z.infer<typeof insertEndpointSchema>;

export type Request = typeof requests.$inferSelect;
export type InsertRequest = z.infer<typeof insertRequestSchema>;

export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;

export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type InsertWorkspaceMember = z.infer<typeof insertWorkspaceMemberSchema>;

// Backward compatibility aliases for frontend
export type Webhook = Endpoint;
export type WebhookRequest = Request;
export type InsertWebhook = InsertEndpoint;
export const webhooks = endpoints;
export const insertWebhookSchema = insertEndpointSchema;

// WebSocket events
export const WS_EVENTS = {
  NEW_REQUEST: 'new-request',
  TUNNEL_REQUEST: 'tunnel-request',
  JOIN_DASHBOARD: 'join-dashboard',
  REGISTER_TUNNEL: 'register-tunnel',
} as const;
