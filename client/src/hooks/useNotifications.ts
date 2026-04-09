import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export interface Notification {
  type: string;
  title: string;
  message: string;
  orderId?: number;
  driverId?: number;
  timestamp: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Request notification permission from browser
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.log("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  };

  // Send browser notification
  const sendBrowserNotification = (title: string, options?: NotificationOptions) => {
    if (Notification.permission === "granted") {
      new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        ...options,
      });
    }
  };

  // Show toast notification
  const showToastNotification = (
    title: string,
    message: string,
    type: "success" | "error" | "info" | "warning" = "info"
  ) => {
    toast[type](message, {
      description: title,
    });
  };

  // Start polling for new orders
  const startPolling = (
    callback: () => void,
    intervalMs: number = 5000
  ) => {
    // Clear existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Set new interval
    pollingIntervalRef.current = setInterval(() => {
      callback();
    }, intervalMs);
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!user) return;

    // Connect to SSE endpoint
    const eventSource = new EventSource(`/api/notifications/subscribe?userId=${user.id}`);

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log("[Notifications] Connected to notification stream");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "connected") {
          console.log("[Notifications]", data.message);
          return;
        }

        // Add new notification
        setNotifications((prev) => [
          {
            ...data,
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ]);

        // Send browser notification for new orders
        if (data.type === "new_order") {
          sendBrowserNotification(data.title, {
            body: data.message,
            tag: "new-order",
            requireInteraction: true,
          });
          showToastNotification(data.title, data.message, "info");
        }

        // Auto-remove notification after 5 seconds
        setTimeout(() => {
          setNotifications((prev) => prev.slice(0, -1));
        }, 5000);
      } catch (error) {
        console.error("[Notifications] Error parsing notification:", error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      console.error("[Notifications] Connection error");
      eventSource.close();
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return {
    notifications,
    isConnected,
    requestNotificationPermission,
    sendBrowserNotification,
    showToastNotification,
    startPolling,
    stopPolling,
  };
}
