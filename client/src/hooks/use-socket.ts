import { useEffect, useState } from "react";
import io, { Socket } from "socket.io-client";
import { WS_EVENTS, type WebhookRequest } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { storeRequest } from "@/lib/localStorage";

export function useSocket(webhookId: string | undefined) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!webhookId) return;

    // Connect to the same host
    const socketInstance = io(window.location.origin);

    socketInstance.on("connect", () => {
      setConnected(true);
      console.log("[WS] Connected");
      
      // Join the room for this webhook
      socketInstance.emit(WS_EVENTS.JOIN_DASHBOARD, webhookId);
    });

    socketInstance.on("disconnect", () => {
      setConnected(false);
      console.log("[WS] Disconnected");
    });

    // Handle new requests in real-time
    socketInstance.on(WS_EVENTS.NEW_REQUEST, (newRequest: WebhookRequest) => {
      console.log("[WS] New Request received", newRequest);
      
      // Store in localStorage
      storeRequest(webhookId, newRequest);
      
      // Optimistically update the query cache
      queryClient.setQueryData(
        [api.webhooks.listRequests.path, webhookId],
        (oldData: WebhookRequest[] | undefined) => {
          if (!oldData) return [newRequest];
          // Add to beginning of list
          return [newRequest, ...oldData];
        }
      );
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [webhookId, queryClient]);

  return { socket, connected };
}
