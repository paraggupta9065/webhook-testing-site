import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Webhook, type WebhookRequest } from "@shared/schema";

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
      if (!res.ok) throw new Error("Failed to fetch requests");
      return api.webhooks.listRequests.responses[200].parse(await res.json());
    },
    enabled: !!webhookId,
    refetchInterval: false, // We'll use websockets for updates
  });
}
