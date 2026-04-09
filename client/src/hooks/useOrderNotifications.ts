import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import type { OrderNotificationData } from '@/components/OrderNotification';

const sendSystemNotification = (order: OrderNotificationData) => {
  if (!('Notification' in window)) {
    console.log('[Notification] Browser does not support notifications');
    return;
  }

  if (Notification.permission === 'granted') {
    const notification = new Notification('طلب جديد! 🎉', {
      body: `من: ${order.pickupLocation}\nإلى: ${order.deliveryLocation}\nالأجرة: ${order.fare} ج.م`,
      icon: '/wasly-icon.png',
      badge: '/wasly-badge.png',
      tag: `order-${order.id}`,
      requireInteraction: true,
    });

    // Add vibration if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};

export function useOrderNotifications() {
  const { user } = useAuth();
  const [currentOrder, setCurrentOrder] = useState<OrderNotificationData | null>(null);
  const [isNotificationVisible, setIsNotificationVisible] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('[Notification] Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      console.log('[Notification] Permission already granted');
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('[Notification] Permission denied by user');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('[Notification] Permission result:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('[Notification] Error requesting permission:', error);
      return false;
    }
  }, []);

  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      console.warn('[ServiceWorker] Not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });
      console.log('[ServiceWorker] Registered successfully');

      // Subscribe to push notifications
      try {
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription && process.env.VITE_VAPID_PUBLIC_KEY) {
          const newSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.VITE_VAPID_PUBLIC_KEY,
          });
          console.log('[ServiceWorker] Subscribed to push notifications');
        }
      } catch (subError) {
        console.warn('[ServiceWorker] Push subscription failed:', subError);
      }

      return true;
    } catch (error) {
      console.error('[ServiceWorker] Registration failed:', error);
      return false;
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!user || user.role !== 'driver') {
      console.log('[WebSocket] User is not a driver');
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws`;
      
      console.log('[WebSocket] Connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WebSocket] Connected successfully');
        reconnectAttemptsRef.current = 0;

        // Send driver connection message
        ws.send(
          JSON.stringify({
            type: 'driver_connect',
            driverId: user.id,
          })
        );

        // Start heartbeat to keep connection alive
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Send ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'new_order') {
            const orderData: OrderNotificationData = {
              id: data.orderId,
              pickupLocation: data.pickupLocation,
              deliveryLocation: data.deliveryLocation,
              estimatedTime: data.estimatedTime || 15,
              fare: data.fare || 0,
              customerName: data.customerName,
              customerPhone: data.customerPhone,
            };

            console.log('[WebSocket] New order received:', orderData);
            setCurrentOrder(orderData);
            setIsNotificationVisible(true);

            // Send system notification
            sendSystemNotification(orderData);

            // Auto-hide after 30 seconds if not accepted
            setTimeout(() => {
              setIsNotificationVisible(false);
            }, 30000);
          } else if (data.type === 'pong') {
            console.log('[WebSocket] Pong received - connection alive');
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        wsRef.current = null;

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delayMs = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
          console.log(`[WebSocket] Reconnecting in ${delayMs}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delayMs);
        } else {
          console.error('[WebSocket] Max reconnection attempts reached');
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
    }
  }, [user]);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const dismissNotification = useCallback(() => {
    setIsNotificationVisible(false);
    setCurrentOrder(null);
  }, []);

  const acceptOrder = useCallback((orderId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Sending accept_order for:', orderId);
      wsRef.current.send(
        JSON.stringify({
          type: 'accept_order',
          orderId,
          driverId: user?.id,
        })
      );
    } else {
      console.warn('[WebSocket] WebSocket not connected, cannot send accept_order');
    }

    dismissNotification();
  }, [user?.id, dismissNotification]);

  useEffect(() => {
    const initializeNotifications = async () => {
      if (user && user.role === 'driver') {
        console.log('[Notifications] Initializing for driver:', user.id);

        // Request notification permission
        await requestNotificationPermission();

        // Register Service Worker
        await registerServiceWorker();

        // Connect WebSocket
        connectWebSocket();
      }
    };

    initializeNotifications();

    return () => {
      disconnectWebSocket();
    };
  }, [user, connectWebSocket, disconnectWebSocket, requestNotificationPermission, registerServiceWorker]);

  return {
    currentOrder,
    isNotificationVisible,
    dismissNotification,
    acceptOrder,
    requestNotificationPermission,
  };
}
