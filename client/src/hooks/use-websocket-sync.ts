import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useWebSocketSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeoutId: any = null;
    let reconnectDelay = 1000;
    let isDisposed = false;

    function connect() {
      if (isDisposed) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      console.log(`[WebSocket] Connecting to ${wsUrl}...`);
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WebSocket] Connected!");
        reconnectDelay = 1000; // Reset reconnect delay
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[WebSocket] Received real-time update event:", data);

          if (data && data.entity) {
            // Invalidate query cache for the affected entity
            const queryKey = `/api/${data.entity}`;
            console.log(`[WebSocket] Invalidating React Query queries for key: [${queryKey}]`);
            queryClient.invalidateQueries({ queryKey: [queryKey] });

            // Also invalidate some dependent keys to keep UI coherent
            if (data.entity === "leads") {
              queryClient.invalidateQueries({ queryKey: ["/api/deals"] });
              queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
            } else if (data.entity === "deals") {
              queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
              queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
            } else if (data.entity === "payments" || data.entity === "invoices") {
              queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
              queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
              queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
            } else if (data.entity === "expenses") {
              queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
            } else if (data.entity === "users") {
              queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
              queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
            }
          }
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error);
        }
      };

      ws.onclose = () => {
        console.log(`[WebSocket] Connection closed. Reconnecting in ${reconnectDelay}ms...`);
        ws = null;
        if (!isDisposed) {
          reconnectTimeoutId = setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 2, 30000); // Exponential backoff up to 30s
            connect();
          }, reconnectDelay);
        }
      };

      ws.onerror = (err) => {
        console.error("[WebSocket] Error:", err);
      };
    }

    connect();

    return () => {
      isDisposed = true;
      if (ws) {
        ws.close();
      }
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
      }
    };
  }, [queryClient]);
}
