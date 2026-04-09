import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  orders,
  driversAvailability,
  notifications,
  driverLocations,
  InsertUser,
  User,
  Order,
  InsertOrder,
  DriverAvailability,
  Notification,
  InsertNotification,
  DriverLocation,
  InsertDriverLocation,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// User functions
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "phone", "password", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (user.isActive !== undefined) {
      values.isActive = user.isActive;
      updateSet.isActive = user.isActive;
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users);
}

export async function getAllDrivers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).where(eq(users.role, "driver"));
}

export async function updateUserProfile(
  userId: number,
  data: { name?: string; email?: string; phone?: string }
) {
  const db = await getDb();
  if (!db) return undefined;

  const updateData: Record<string, any> = {};
  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email;
  if (data.phone) updateData.phone = data.phone;

  if (Object.keys(updateData).length === 0) return undefined;

  await db.update(users).set(updateData).where(eq(users.id, userId));
  return await getUserById(userId);
}

export async function updateUserLocation(userId: number, latitude: number, longitude: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ latitude: latitude.toString() as any, longitude: longitude.toString() as any }).where(eq(users.id, userId));
}

// Order functions
export async function createOrder(order: InsertOrder) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(orders).values(order);
  return result;
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getOrdersByCustomerId(customerId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(orders).where(eq(orders.customerId, customerId));
}

export async function getOrdersByDriverId(driverId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(orders).where(eq(orders.driverId, driverId));
}

export async function getAllOrders() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(orders);
}

export async function updateOrderStatus(orderId: number, status: string) {
  const db = await getDb();
  if (!db) return;

  await db.update(orders).set({ status: status as any }).where(eq(orders.id, orderId));
}

export async function assignOrderToDriver(orderId: number, driverId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(orders).set({ driverId, status: "assigned" }).where(eq(orders.id, orderId));
}

// Driver Availability functions
export async function updateDriverLocation(driverId: number, latitude: number, longitude: number) {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(driversAvailability)
    .where(eq(driversAvailability.driverId, driverId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(driversAvailability)
      .set({ latitude: latitude.toString() as any, longitude: longitude.toString() as any })
      .where(eq(driversAvailability.driverId, driverId));
  } else {
    await db.insert(driversAvailability).values({
      driverId,
      latitude: latitude.toString() as any,
      longitude: longitude.toString() as any,
      isAvailable: true,
    });
  }
}

export async function getAvailableDrivers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(driversAvailability).where(eq(driversAvailability.isAvailable, true));
}

// Notification functions
export async function createNotification(notification: InsertNotification) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(notifications).values(notification);
  return result;
}

export async function getNotificationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(notifications).where(eq(notifications.userId, userId));
}

export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(notifications).set({ isRead: true, readAt: new Date() }).where(eq(notifications.id, notificationId));
}

// Driver Location tracking
export async function recordDriverLocation(location: InsertDriverLocation) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(driverLocations).values(location);
  return result;
}

export async function getLatestDriverLocation(driverId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(driverLocations)
    .where(eq(driverLocations.driverId, driverId))
    .orderBy((t) => t.createdAt)
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}
