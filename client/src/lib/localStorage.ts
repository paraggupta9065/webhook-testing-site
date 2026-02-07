import { type WebhookRequest } from "@shared/schema";

const STORAGE_PREFIX = "testwebhook_";
const MAX_REQUESTS_PER_WEBHOOK = 100; // Limit to prevent localStorage from growing too large

/**
 * Get all stored requests for a specific webhook ID (Test Webhook)
 */
export function getStoredRequests(webhookId: string): WebhookRequest[] {
  try {
    const key = `${STORAGE_PREFIX}${webhookId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return [];
  }
}

/**
 * Store a new request for a webhook (Test Webhook)
 */
export function storeRequest(webhookId: string, request: WebhookRequest): void {
  try {
    const key = `${STORAGE_PREFIX}${webhookId}`;
    const existing = getStoredRequests(webhookId);
    
    // Add new request at the beginning and limit total count
    const updated = [request, ...existing].slice(0, MAX_REQUESTS_PER_WEBHOOK);
    
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (error) {
    console.error("Error writing to localStorage:", error);
  }
}

/**
 * Clear all stored requests for a webhook (Test Webhook)
 */
export function clearStoredRequests(webhookId: string): void {
  try {
    const key = `${STORAGE_PREFIX}${webhookId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Error clearing localStorage:", error);
  }
}

/**
 * Get all webhook IDs that have stored requests (Test Webhook)
 */
export function getAllStoredWebhookIds(): string[] {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keys.push(key.replace(STORAGE_PREFIX, ""));
      }
    }
    return keys;
  } catch (error) {
    console.error("Error reading localStorage keys:", error);
    return [];
  }
}

/**
 * Clear all stored webhook data (for cleanup, Test Webhook)
 */
export function clearAllStoredWebhooks(): void {
  try {
    const webhookIds = getAllStoredWebhookIds();
    webhookIds.forEach(id => clearStoredRequests(id));
  } catch (error) {
    console.error("Error clearing all webhooks:", error);
  }
}
