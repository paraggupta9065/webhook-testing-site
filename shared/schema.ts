import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const webhooks = pgTable("webhooks", {
  id: text("id").primaryKey(), // UUID
  createdAt: timestamp("created_at").defaultNow().notNull(),
  name: text("name"), // Optional name for the session
});

export const requests = pgTable("requests", {
  id: text("id").primaryKey(),
  webhookId: text("webhook_id").notNull(),
  method: text("method").notNull(),
  path: text("path").notNull(),
  headers: jsonb("headers").notNull(),
  body: jsonb("body"),
  query: jsonb("query"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertWebhookSchema = createInsertSchema(webhooks);
export const insertRequestSchema = createInsertSchema(requests);

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;

export type WebhookRequest = typeof requests.$inferSelect;
export type InsertRequest = z.infer<typeof insertRequestSchema>;

export const WS_EVENTS = {
  NEW_REQUEST: 'new-request',
  TUNNEL_REQUEST: 'tunnel-request',
  JOIN_DASHBOARD: 'join-dashboard',
  REGISTER_TUNNEL: 'register-tunnel',
} as const;
