import 'dotenv/config';
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import net from "net";
import { Server as SocketIOServer } from "socket.io";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { setupLocationTracking } from "./locationTracking";
import { setupOrderNotifications } from "./orderNotifications";
import { registerSSEConnection, sendNotificationToUser } from "../notifications";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Log environment status
  console.log("[Environment] DATABASE_URL:", process.env.DATABASE_URL ? "configured" : "not configured");
  console.log("[Environment] Using in-memory database mode");
  
  const app = express();
  const server = createServer(app);
  
  // Initialize Socket.IO for real-time location tracking
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });
  
  // Setup location tracking
  setupLocationTracking(io);
  
  // Setup order notifications
  setupOrderNotifications(io);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  // Authentication routes
  registerAuthRoutes(app);
  
  // Health check endpoint for Railway/Docker
  app.get("/health", (req, res) => {
    res.status(200).json({ ok: true, timestamp: new Date().toISOString() });
  });
  
  // SSE Notifications endpoint
  app.get("/api/notifications/subscribe/:userId", (req, res) => {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }
    registerSSEConnection(userId, res);
  });
  
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  
  // Store io instance for use in routers
  (app as any).io = io;
  (app as any).sendNotificationToUser = sendNotificationToUser;

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`WebSocket server initialized on port ${port}`);
  });
}

startServer().catch(console.error);

export { SocketIOServer };
