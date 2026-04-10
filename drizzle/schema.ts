import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  datetime,
  json,
} from "drizzle-orm/mysql-core";
import { unique } from "drizzle-orm/mysql-core";

/**
 * Users table - Core user data for customers, drivers, and admins
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).unique(),
  password: varchar("password", { length: 255 }),
  name: varchar("name", { length: 100 }),
  email: varchar("email", { length: 255 }),
  role: mysqlEnum("role", ["customer", "driver", "admin"]).default("customer").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  totalCommission: decimal("totalCommission", { precision: 10, scale: 2 }).default("0").notNull(),
  totalDebt: decimal("totalDebt", { precision: 10, scale: 2 }).default("0").notNull(),
  isBlocked: boolean("isBlocked").default(false).notNull(),
  // عمولات السائق والحالة
  pendingCommission: decimal("pendingCommission", { precision: 10, scale: 2 }).default("0").notNull(), // عمولات مستحقة لم تدفع
  paidCommission: decimal("paidCommission", { precision: 10, scale: 2 }).default("0").notNull(), // عمولات مدفوعة
  accountStatus: mysqlEnum("accountStatus", ["active", "suspended", "disabled"]).default("active").notNull(), // حالة الحساب
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  avatarUrl: text("avatarUrl"),
});

/**
 * Orders table - Delivery orders
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  driverId: int("driverId"),
  pickupLocation: json("pickupLocation").notNull(), // { address, latitude, longitude }
  deliveryLocation: json("deliveryLocation").notNull(), // { address, latitude, longitude }
  status: mysqlEnum("status", [
    "pending",
    "assigned",
    "accepted",
    "in_transit",
    "arrived",
    "delivered",
    "cancelled",
  ])
    .default("pending")
    .notNull(),
  price: decimal("price", { precision: 10, scale: 2 }),
  distance: decimal("distance", { precision: 10, scale: 2 }), // in kilometers
  estimatedTime: int("estimatedTime"), // in minutes
  notes: text("notes"),
  rating: int("rating"), // 1-5 stars
  ratingComment: text("ratingComment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  deliveredAt: timestamp("deliveredAt"),
});

/**
 * Driver Availability - Track driver location and availability
 */
export const driversAvailability = mysqlTable("drivers_availability", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull().unique(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  currentOrderId: int("currentOrderId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Notifications table - System notifications for users
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: mysqlEnum("type", [
    "order_assigned",
    "order_accepted",
    "order_in_transit",
    "order_arrived",
    "order_delivered",
    "order_cancelled",
    "new_order_available",
    "system",
  ])
    .default("system")
    .notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
});

/**
 * Order History - Track order status changes
 */
export const orderHistory = mysqlTable("order_history", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  changedBy: int("changedBy"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Driver Locations table - Real-time location tracking for drivers
 */
export const driverLocations = mysqlTable("driver_locations", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull(),
  orderId: int("orderId"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: decimal("accuracy", { precision: 10, scale: 2 }), // GPS accuracy in meters
  speed: decimal("speed", { precision: 10, scale: 2 }), // Speed in km/h
  heading: decimal("heading", { precision: 10, scale: 2 }), // Direction in degrees
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Push Subscriptions table - Web push notification subscriptions
 */
export const pushSubscriptions = mysqlTable(
  "push_subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    endpoint: varchar("endpoint", { length: 500 }).notNull(),
    keys: json("keys").notNull(), // { p256dh, auth }
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    endpointUnique: unique("endpoint_unique").on(table.endpoint),
  })
);

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export type DriverAvailability = typeof driversAvailability.$inferSelect;
export type InsertDriverAvailability = typeof driversAvailability.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export type OrderHistory = typeof orderHistory.$inferSelect;
export type InsertOrderHistory = typeof orderHistory.$inferInsert;

export type DriverLocation = typeof driverLocations.$inferSelect;
export type InsertDriverLocation = typeof driverLocations.$inferInsert;

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;
