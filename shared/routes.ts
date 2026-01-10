import { z } from 'zod';
import { insertWebhookSchema, webhooks, requests } from './schema';

export const errorSchemas = {
  notFound: z.object({ message: z.string() }),
  validation: z.object({ message: z.string() }),
};

export const api = {
  webhooks: {
    create: {
      method: 'POST' as const,
      path: '/api/webhooks',
      input: z.object({}).optional(),
      responses: {
        201: z.custom<typeof webhooks.$inferSelect>(),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/webhooks/:id',
      responses: {
        200: z.custom<typeof webhooks.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    listRequests: {
      method: 'GET' as const,
      path: '/api/webhooks/:id/requests',
      responses: {
        200: z.array(z.custom<typeof requests.$inferSelect>()),
        404: errorSchemas.notFound,
      },
    },
    // The actual ingestion endpoint (handled specially in server/routes.ts, but noted here for completeness if needed)
    ingest: {
      method: 'ALL' as const,
      path: '/webhook/:id',
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
