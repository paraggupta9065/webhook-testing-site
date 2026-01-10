import { users, type User, type InsertUser, type Webhook, type WebhookRequest, type InsertWebhook, type InsertRequest } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // HookTest methods
  createWebhook(name?: string): Promise<Webhook>;
  getWebhook(id: string): Promise<Webhook | undefined>;
  createRequest(request: InsertRequest): Promise<WebhookRequest>;
  getRequests(webhookId: string): Promise<WebhookRequest[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private webhooks: Map<string, Webhook>;
  private requests: Map<string, WebhookRequest[]>;

  constructor() {
    this.users = new Map();
    this.webhooks = new Map();
    this.requests = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createWebhook(name?: string): Promise<Webhook> {
    const id = randomUUID();
    const webhook: Webhook = {
      id,
      name: name || null,
      createdAt: new Date(),
    };
    this.webhooks.set(id, webhook);
    this.requests.set(id, []);
    return webhook;
  }

  async getWebhook(id: string): Promise<Webhook | undefined> {
    return this.webhooks.get(id);
  }

  async createRequest(insertRequest: InsertRequest): Promise<WebhookRequest> {
    const id = randomUUID();
    const request: WebhookRequest = {
      ...insertRequest,
      id,
      timestamp: new Date(),
    };
    const webhookRequests = this.requests.get(request.webhookId) || [];
    // Store latest first or last? Usually push and reverse on read, or unshift.
    // Let's unshift to keep newest at 0, or push and sort.
    webhookRequests.unshift(request);
    this.requests.set(request.webhookId, webhookRequests);
    return request;
  }

  async getRequests(webhookId: string): Promise<WebhookRequest[]> {
    return this.requests.get(webhookId) || [];
  }
}

export const storage = new MemStorage();
