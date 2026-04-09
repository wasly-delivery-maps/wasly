import { Response } from "express";
import webpush from "web-push";
import { getDb, getAllUsers } from "./db";
import { pushSubscriptions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// Configure web push with VAPID keys
const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:support@wasly.app",
    vapidPublicKey,
    vapidPrivateKey
  );
}

// Store active SSE connections
const activeConnections = new Map<number, Response>();

/**
 * Register an SSE connection for a user
 */
export function registerSSEConnection(userId: number, res: Response) {
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Send initial connection message
  res.write('data: {"type":"connected","message":"Connected to notifications"}\n\n');

  // Store connection
  activeConnections.set(userId, res);

  // Handle client disconnect
  res.on("close", () => {
    activeConnections.delete(userId);
  });

  res.on("error", () => {
    activeConnections.delete(userId);
  });
}

/**
 * Send notification to a specific user
 */
export function sendNotificationToUser(userId: number, notification: any) {
  const connection = activeConnections.get(userId);
  if (connection && !connection.writableEnded) {
    connection.write(`data: ${JSON.stringify(notification)}\n\n`);
  }
}

/**
 * Send notification to multiple users
 */
export function sendNotificationToUsers(userIds: number[], notification: any) {
  userIds.forEach((userId) => {
    sendNotificationToUser(userId, notification);
  });
}

/**
 * Broadcast notification to all drivers
 */
export function broadcastToAllDrivers(notification: any) {
  activeConnections.forEach((connection, userId) => {
    if (!connection.writableEnded) {
      connection.write(`data: ${JSON.stringify(notification)}\n\n`);
    }
  });
}

/**
 * Close a user's connection
 */
export function closeUserConnection(userId: number) {
  const connection = activeConnections.get(userId);
  if (connection && !connection.writableEnded) {
    connection.end();
  }
  activeConnections.delete(userId);
}

/**
 * Get active connections count (for debugging)
 */
export function getActiveConnectionsCount() {
  return activeConnections.size;
}

/**
 * Save push subscription to database
 */
export async function savePushSubscription(
  userId: number,
  subscription: any
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Notifications] Database not available");
    return;
  }

  try {
    // Check if subscription already exists
    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
      .limit(1);

    if (existing.length > 0) {
      // Update existing subscription
      await db
        .update(pushSubscriptions)
        .set({
          keys: subscription.keys,
          updatedAt: new Date(),
        })
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
      console.log(`[Notifications] Updated subscription for user ${userId}`);
    } else {
      // Insert new subscription
      await db.insert(pushSubscriptions).values({
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      });
      console.log(`[Notifications] Saved subscription for user ${userId}`);
    }
  } catch (error) {
    console.error("[Notifications] Failed to save subscription:", error);
  }
}

/**
 * Remove push subscription from database
 */
export async function removePushSubscription(endpoint: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Notifications] Database not available");
    return;
  }

  try {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
    console.log(`[Notifications] Removed subscription for endpoint ${endpoint}`);
  } catch (error) {
    console.error("[Notifications] Failed to remove subscription:", error);
  }
}

/**
 * Send push notification to a specific user
 */
export async function sendPushNotificationToUser(
  userId: number,
  notification: {
    title: string;
    body: string;
    orderId?: number;
    url?: string;
    tag?: string;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Notifications] Database not available");
    return;
  }

  try {
    // Get all subscriptions for the user
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    for (const sub of subscriptions) {
      try {
        const subscription = {
          endpoint: sub.endpoint,
          keys: sub.keys as any,
        };

        await webpush.sendNotification(
          subscription,
          JSON.stringify(notification)
        );
      } catch (error: any) {
        if (error.statusCode === 410) {
          // Subscription expired, remove it
          await removePushSubscription(sub.endpoint);
        } else {
          console.error(
            "[Notifications] Failed to send notification:",
            error.message
          );
        }
      }
    }
  } catch (error) {
    console.error(
      "[Notifications] Failed to send notification to user:",
      error
    );
  }
}

/**
 * Send notification to all drivers with new order
 */
export async function notifyDriversOfNewOrder(
  orderId: number,
  pickupLocation: string,
  dropoffLocation: string
): Promise<void> {
  try {
    // Get all active drivers using Drizzle ORM
    const allUsers = await getAllUsers();
    const drivers = allUsers.filter(
      (u: any) => u.role === "driver" && u.accountStatus === "active"
    );

    const notification = {
      title: "طلب توصيل جديد! 🚗",
      body: `من ${pickupLocation} إلى ${dropoffLocation}`,
      orderId,
      url: `/driver/orders/${orderId}`,
      tag: `order-${orderId}`,
    };

    // Send notification to all drivers
    for (const driver of drivers) {
      await sendPushNotificationToUser(driver.id, notification);
    }

    console.log(
      `[Notifications] Sent notification to ${drivers.length} drivers`
    );
  } catch (error) {
    console.error("[Notifications] Failed to notify drivers:", error);
  }
}

/**
 * Get VAPID public key for frontend
 */
export function getVapidPublicKey(): string {
  return vapidPublicKey;
}

/**
 * Check if push notifications are configured
 */
export function isPushNotificationsConfigured(): boolean {
  return !!(vapidPublicKey && vapidPrivateKey);
}
