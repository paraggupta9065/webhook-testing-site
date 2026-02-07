import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Webhook, type WebhookRequest } from "@shared/schema";
import { getStoredRequests, clearStoredRequests } from "@/lib/localStorage";

// GET /api/webhooks/:id
export function useWebhook(id: string) {
  return useQuery({
    queryKey: [api.webhooks.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.webhooks.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch webhook");
      return api.webhooks.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

// POST /api/webhooks
export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.webhooks.create.path, {
        method: api.webhooks.create.method,
      });
      if (!res.ok) throw new Error("Failed to create webhook session");
      return api.webhooks.create.responses[201].parse(await res.json());
    },
    onSuccess: (data) => {
      // Pre-seed the cache for the newly created webhook
      queryClient.setQueryData([api.webhooks.get.path, data.id], data);
    },
  });
}

// GET /api/webhooks/:id/requests
export function useWebhookRequests(webhookId: string) {
  return useQuery({
    queryKey: [api.webhooks.listRequests.path, webhookId],
    queryFn: async () => {
      const url = buildUrl(api.webhooks.listRequests.path, { id: webhookId });
      const res = await fetch(url);
      
      // Load from localStorage
      const storedRequests = getStoredRequests(webhookId);
      
      if (!res.ok) {
        // If server request fails, use localStorage data
        console.log("Using stored requests from localStorage");
        return storedRequests;
      }
      
      const serverRequests = api.webhooks.listRequests.responses[200].parse(await res.json());
      
      // Merge server requests with stored requests (remove duplicates based on id)
      const merged = [...serverRequests];
      const serverIds = new Set(serverRequests.map(r => r.id));
      
      storedRequests.forEach(req => {
        if (!serverIds.has(req.id)) {
          merged.push(req);
        }
      });
      
      // Sort by timestamp (newest first)
      merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return merged;
    },
    enabled: !!webhookId,
    refetchInterval: false, // We'll use websockets for updates
  });
}

// Clear webhook history
export function useClearWebhookHistory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (webhookId: string) => {
      clearStoredRequests(webhookId);
      return webhookId;
    },
    onSuccess: (webhookId) => {
      // Update query cache to empty array
      queryClient.setQueryData([api.webhooks.listRequests.path, webhookId], []);
    },
  });
}

// Update webhook response configuration
export function useUpdateWebhookResponse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      webhookId, 
      config 
    }: { 
      webhookId: string; 
      config: { responseStatus: string; responseHeaders: any; responseBody: string } 
    }) => {
      const res = await fetch(`/api/webhooks/${webhookId}/response`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed to update webhook response");
      return res.json();
    },
    onSuccess: (data, variables) => {
      // Update cache with new webhook data
      queryClient.setQueryData([api.webhooks.get.path, variables.webhookId], data);
    },
  });
}
