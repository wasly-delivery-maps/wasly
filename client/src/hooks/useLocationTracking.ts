import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface DriverLocation {
  driverId: number;
  latitude: number;
  longitude: number;
  isAvailable: boolean;
  currentOrderId?: number;
  updatedAt: Date;
}

export function useLocationTracking() {
  const socketRef = useRef<Socket | null>(null);
  const [driverLocations, setDriverLocations] = useState<Map<number, DriverLocation>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize Socket.IO connection
    const socket = io(window.location.origin, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[WebSocket] Connected to server");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[WebSocket] Disconnected from server");
      setIsConnected(false);
    });

    socket.on("driver:location-updated", (location: DriverLocation) => {
      console.log("[WebSocket] Driver location updated:", location);
      setDriverLocations((prev) => {
        const newMap = new Map(prev);
        newMap.set(location.driverId, location);
        return newMap;
      });
    });

    socket.on("error", (error) => {
      console.error("[WebSocket] Error:", error);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Driver joins location tracking
  const joinAsDriver = (driverId: number) => {
    if (socketRef.current) {
      socketRef.current.emit("driver:join", { driverId });
    }
  };

  // Customer starts tracking driver
  const trackDriver = (orderId: number, driverId: number) => {
    if (socketRef.current) {
      socketRef.current.emit("customer:track-driver", { orderId, driverId });
    }
  };

  // Customer stops tracking driver
  const stopTracking = (orderId: number) => {
    if (socketRef.current) {
      socketRef.current.emit("customer:stop-tracking", { orderId });
    }
  };

  // Admin joins dashboard
  const joinAdminDashboard = () => {
    if (socketRef.current) {
      socketRef.current.emit("admin:join-dashboard");
    }
  };

  // Update driver location
  const updateLocation = (latitude: number, longitude: number, orderId?: number) => {
    if (socketRef.current) {
      socketRef.current.emit("driver:update-location", {
        latitude,
        longitude,
        orderId,
      });
    }
  };

  return {
    isConnected,
    driverLocations,
    joinAsDriver,
    trackDriver,
    stopTracking,
    joinAdminDashboard,
    updateLocation,
  };
}
