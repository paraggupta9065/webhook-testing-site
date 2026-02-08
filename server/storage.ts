import { db } from "./db";
import { users, endpoints, requests, type User, type InsertUser, type Endpoint, type Request, type InsertEndpoint, type InsertRequest } from "@shared/schema";
import { randomUUID } from "crypto";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Endpoint methods
  createEndpoint(endpoint?: Partial<InsertEndpoint>): Promise<Endpoint>;
  getEndpoint(id: string): Promise<Endpoint | undefined>;
  getEndpointBySlug(slug: string): Promise<Endpoint | undefined>;
  updateEndpointResponse(id: string, response: { responseStatus?: number; responseHeaders?: any; responseBody?: string }): Promise<Endpoint | undefined>;
  createRequest(request: Omit<InsertRequest, 'id' | 'timestamp'>): Promise<Request>;
  getRequests(endpointId: string): Promise<Request[]>;
  deleteRequests(endpointId: string): Promise<void>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const user: User = { 
      id,
      email: insertUser.email,
      username: insertUser.username || null,
      passwordHash: insertUser.passwordHash || null,
      name: insertUser.name || null,
      plan: insertUser.plan || "free",
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(users).values(user);
    return user;
  }

  async createEndpoint(endpoint?: Partial<InsertEndpoint>): Promise<Endpoint> {
    const id = randomUUID();
    const uniqueSlug = randomUUID().split('-')[0]; // Use first segment as slug
    const now = new Date();
    
    const newEndpoint: Endpoint = {
      id,
      userId: endpoint?.userId || null,
      uniqueSlug,
      name: endpoint?.name || null,
      description: endpoint?.description || null,
      customDomain: endpoint?.customDomain || null,
      expiresAt: endpoint?.expiresAt || null,
      maxRequests: endpoint?.maxRequests || 100,
      responseStatus: endpoint?.responseStatus || 200,
      responseHeaders: endpoint?.responseHeaders ? JSON.stringify(endpoint.responseHeaders) : null,
      responseBody: endpoint?.responseBody || null,
      forwardUrl: endpoint?.forwardUrl || null,
      isActive: endpoint?.isActive !== undefined ? endpoint.isActive : true,
      createdAt: now,
      updatedAt: now,
    };
    
    await db.insert(endpoints).values(newEndpoint);
    return newEndpoint;
  }

  async getEndpoint(id: string): Promise<Endpoint | undefined> {
    const result = await db.select().from(endpoints).where(eq(endpoints.id, id)).limit(1);
    return result[0];
  }

  async getEndpointBySlug(slug: string): Promise<Endpoint | undefined> {
    const result = await db.select().from(endpoints).where(eq(endpoints.uniqueSlug, slug)).limit(1);
    return result[0];
  }

  async updateEndpointResponse(
    id: string,
    response: { responseStatus?: number; responseHeaders?: any; responseBody?: string }
  ): Promise<Endpoint | undefined> {
    const endpoint = await this.getEndpoint(id);
    if (!endpoint) return undefined;

    const updates: Partial<Endpoint> = {
      updatedAt: new Date(),
    };
    
    if (response.responseStatus !== undefined) updates.responseStatus = response.responseStatus;
    if (response.responseHeaders !== undefined) updates.responseHeaders = JSON.stringify(response.responseHeaders);
    if (response.responseBody !== undefined) updates.responseBody = response.responseBody;

    await db.update(endpoints).set(updates).where(eq(endpoints.id, id));
    
    return { ...endpoint, ...updates };
  }

  async createRequest(insertRequest: Omit<InsertRequest, 'id' | 'timestamp'>): Promise<Request> {
    const id = randomUUID();
    const now = new Date();
    
    const request: Request = {
      id,
      endpointId: insertRequest.endpointId,
      method: insertRequest.method,
      path: insertRequest.path || null,
      timestamp: now,
      queryParams: insertRequest.queryParams ? JSON.stringify(insertRequest.queryParams) : null,
      headers: typeof insertRequest.headers === 'string' ? insertRequest.headers : JSON.stringify(insertRequest.headers),
      body: insertRequest.body || null,
      bodySize: insertRequest.bodySize || null,
      contentType: insertRequest.contentType || null,
      ipAddress: insertRequest.ipAddress || null,
      userAgent: insertRequest.userAgent || null,
      processingTimeMs: insertRequest.processingTimeMs || null,
    };
    
    await db.insert(requests).values(request);
    return request;
  }

  async getRequests(endpointId: string): Promise<Request[]> {
    return await db.select()
      .from(requests)
      .where(eq(requests.endpointId, endpointId))
      .orderBy(desc(requests.timestamp))
      .limit(100);
  }

  async deleteRequests(endpointId: string): Promise<void> {
    await db.delete(requests).where(eq(requests.endpointId, endpointId));
  }
}

export const storage = new DbStorage();
