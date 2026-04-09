import { Server as SocketIOServer, Socket } from "socket.io";
import { getDb } from "../db";
import { driversAvailability } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

interface LocationUpdate {
  driverId: number;
  latitude: number;
  longitude: number;
  orderId?: number;
}

interface DriverLocation {
  driverId: number;
  latitude: number;
  longitude: number;
  isAvailable: boolean;
  currentOrderId?: number;
  updatedAt: Date;
}

// Store active driver connections
const activeDrivers = new Map<number, Socket>();

export function setupLocationTracking(io: SocketIOServer) {
  io.on("connection", (socket: Socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Driver joins location tracking
    socket.on("driver:join", async (data: { driverId: number }) => {
      try {
        const { driverId } = data;
        console.log(`[Location] Driver ${driverId} joined location tracking`);

        // Store driver connection
        activeDrivers.set(driverId, socket);
        socket.join(`driver:${driverId}`);
        socket.join("drivers:all");

        // Emit confirmation
        socket.emit("driver:joined", { success: true, driverId });
      } catch (error) {
        console.error("[Location] Error in driver:join:", error);
        socket.emit("error", { message: "Failed to join location tracking" });
      }
    });

    // Customer joins to track specific driver
    socket.on("customer:track-driver", (data: { orderId: number; driverId: number }) => {
      try {
        const { orderId, driverId } = data;
        console.log(`[Location] Customer tracking driver ${driverId} for order ${orderId}`);

        // Join room for this order
        socket.join(`order:${orderId}`);
        socket.emit("tracking:started", { orderId, driverId });
      } catch (error) {
        console.error("[Location] Error in customer:track-driver:", error);
        socket.emit("error", { message: "Failed to start tracking" });
      }
    });

    // Driver updates location
    socket.on("driver:update-location", async (data: LocationUpdate) => {
      try {
        const { driverId, latitude, longitude, orderId } = data;

        // Validate coordinates
        if (typeof latitude !== "number" || typeof longitude !== "number") {
          socket.emit("error", { message: "Invalid coordinates" });
          return;
        }

        // Update database
        const db = await getDb();
        if (db) {
          await db
            .update(driversAvailability)
            .set({
              latitude: latitude.toString(),
              longitude: longitude.toString(),
              currentOrderId: orderId || null,
              updatedAt: new Date(),
            })
            .where(eq(driversAvailability.driverId, driverId));
        }

        // Broadcast location to all connected clients
        const locationData: DriverLocation = {
          driverId,
          latitude,
          longitude,
          isAvailable: true,
          currentOrderId: orderId,
          updatedAt: new Date(),
        };

        // Broadcast to all clients tracking this driver
        if (orderId) {
          io.to(`order:${orderId}`).emit("driver:location-updated", locationData);
        }

        // Also broadcast to admin dashboard
        io.to("admin:dashboard").emit("driver:location-updated", locationData);

        console.log(`[Location] Driver ${driverId} location updated: ${latitude}, ${longitude}`);
      } catch (error) {
        console.error("[Location] Error updating location:", error);
        socket.emit("error", { message: "Failed to update location" });
      }
    });

    // Customer leaves tracking
    socket.on("customer:stop-tracking", (data: { orderId: number }) => {
      try {
        const { orderId } = data;
        console.log(`[Location] Customer stopped tracking order ${orderId}`);
        socket.leave(`order:${orderId}`);
        socket.emit("tracking:stopped", { orderId });
      } catch (error) {
        console.error("[Location] Error in customer:stop-tracking:", error);
      }
    });

    // Admin joins dashboard
    socket.on("admin:join-dashboard", () => {
      try {
        console.log(`[Location] Admin joined dashboard`);
        socket.join("admin:dashboard");

        // Send current active drivers
        const activeDriversList: number[] = [];
        activeDrivers.forEach((_, driverId) => {
          activeDriversList.push(driverId);
        });
        socket.emit("admin:active-drivers", { drivers: activeDriversList });
      } catch (error) {
        console.error("[Location] Error in admin:join-dashboard:", error);
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);

      // Remove driver from active list
      activeDrivers.forEach((driverSocket, driverId) => {
        if (driverSocket.id === socket.id) {
          activeDrivers.delete(driverId);
          console.log(`[Location] Driver ${driverId} disconnected`);
        }
      });
    });

    // Error handling
    socket.on("error", (error) => {
      console.error(`[WebSocket] Socket error: ${error}`);
    });
  });

  console.log("[WebSocket] Location tracking initialized");
}

// Helper function to get active drivers
export function getActiveDrivers(): number[] {
  const drivers: number[] = [];
  activeDrivers.forEach((_, driverId) => {
    drivers.push(driverId);
  });
  return drivers;
}

// Helper function to broadcast to specific order
export function broadcastToOrder(io: SocketIOServer, orderId: number, event: string, data: any) {
  io.to(`order:${orderId}`).emit(event, data);
}

// Helper function to broadcast to admin
export function broadcastToAdmin(io: SocketIOServer, event: string, data: any) {
  io.to("admin:dashboard").emit(event, data);
}
