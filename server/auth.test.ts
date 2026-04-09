import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as db from "./db";
import { updateDriverCommission, markCommissionAsPaid } from "./db";
import bcrypt from "bcryptjs";

describe("Authentication and Orders", () => {
  beforeEach(async () => {
    // Clean up test data before each test
  });

  afterEach(async () => {
    // Clean up test data after each test
  });

  describe("User Registration", () => {
    it("should create a new user with phone and password", async () => {
      const testPhone = "+966501234567";
      const testPassword = "testPassword123";
      const hashedPassword = await bcrypt.hash(testPassword, 10);

      await db.upsertUser({
        phone: testPhone,
        password: hashedPassword,
        name: "Test User",
        email: "test@example.com",
        role: "customer",
        isActive: true,
      });

      const user = await db.getUserByPhone(testPhone);
      expect(user).toBeDefined();
      expect(user?.phone).toBe(testPhone);
      expect(user?.name).toBe("Test User");
      expect(user?.role).toBe("customer");
      expect(user?.isActive).toBe(true);
    });

    it("should hash passwords correctly", async () => {
      const password = "securePassword123";
      const hashedPassword = await bcrypt.hash(password, 10);

      const isValid = await bcrypt.compare(password, hashedPassword);
      expect(isValid).toBe(true);

      const isInvalid = await bcrypt.compare("wrongPassword", hashedPassword);
      expect(isInvalid).toBe(false);
    });
  });

  describe("User Login", () => {
    it("should retrieve user by phone", async () => {
      const testPhone = "+966509876543";
      const hashedPassword = await bcrypt.hash("password123", 10);

      await db.upsertUser({
        phone: testPhone,
        password: hashedPassword,
        name: "Login Test User",
        role: "driver",
        isActive: true,
      });

      const user = await db.getUserByPhone(testPhone);
      expect(user).toBeDefined();
      expect(user?.phone).toBe(testPhone);
      expect(user?.role).toBe("driver");
    });

    it("should return undefined for non-existent phone", async () => {
      const user = await db.getUserByPhone("+966500000000");
      expect(user).toBeUndefined();
    });
  });

  describe("Order Management", () => {
    it("should create a new order", async () => {
      // Create a customer first
      const customerPhone = "+966501111111";
      const hashedPassword = await bcrypt.hash("password123", 10);

      await db.upsertUser({
        phone: customerPhone,
        password: hashedPassword,
        name: "Customer",
        role: "customer",
        isActive: true,
      });

      const customer = await db.getUserByPhone(customerPhone);
      expect(customer).toBeDefined();

      if (customer) {
        const pickupLocation = {
          address: "123 Main St",
          latitude: 24.7136,
          longitude: 46.6753,
        };

        const deliveryLocation = {
          address: "456 Oak Ave",
          latitude: 24.7500,
          longitude: 46.7000,
        };

        const result = await db.createOrder({
          customerId: customer.id,
          pickupLocation,
          deliveryLocation,
          price: 50,
          distance: 5.2,
          estimatedTime: 30,
          notes: "Handle with care",
          status: "pending",
        });

        expect(result).toBeDefined();
      }
    });

    it("should calculate distance correctly", () => {
      // Simple distance calculation test
      const lat1 = 24.7136;
      const lon1 = 46.6753;
      const lat2 = 24.7500;
      const lon2 = 46.7000;

      const R = 6371; // Earth's radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(100); // Should be reasonable distance
    });
  });

  describe("Driver Management", () => {
    it("should get all drivers", async () => {
      // Create a driver
      const driverPhone = "+966502222222";
      const hashedPassword = await bcrypt.hash("password123", 10);

      await db.upsertUser({
        phone: driverPhone,
        password: hashedPassword,
        name: "Driver",
        role: "driver",
        isActive: true,
      });

      const drivers = await db.getAllDrivers();
      expect(drivers.length).toBeGreaterThan(0);
      expect(drivers.some((d) => d.phone === driverPhone)).toBe(true);
    });

    it("should update driver location", async () => {
      const driverPhone = "+966503333333";
      const hashedPassword = await bcrypt.hash("password123", 10);

      await db.upsertUser({
        phone: driverPhone,
        password: hashedPassword,
        name: "Driver Location Test",
        role: "driver",
        isActive: true,
      });

      const driver = await db.getUserByPhone(driverPhone);
      expect(driver).toBeDefined();

      if (driver) {
        await db.updateDriverLocation(driver.id, 24.7136, 46.6753);

        const availability = await db.getDriverAvailability(driver.id);
        expect(availability).toBeDefined();
        expect(availability?.isAvailable).toBe(true);
      }
    });
  });

  describe("User Roles", () => {
    it("should support customer role", async () => {
      const phone = "+966504444444";
      const hashedPassword = await bcrypt.hash("password123", 10);

      await db.upsertUser({
        phone,
        password: hashedPassword,
        role: "customer",
        isActive: true,
      });

      const user = await db.getUserByPhone(phone);
      expect(user?.role).toBe("customer");
    });

    it("should support driver role", async () => {
      const phone = "+966505555555";
      const hashedPassword = await bcrypt.hash("password123", 10);

      await db.upsertUser({
        phone,
        password: hashedPassword,
        role: "driver",
        isActive: true,
      });

      const user = await db.getUserByPhone(phone);
      expect(user?.role).toBe("driver");
    });

    it("should support admin role", async () => {
      const phone = "+966506666666";
      const hashedPassword = await bcrypt.hash("password123", 10);

      await db.upsertUser({
        phone,
        password: hashedPassword,
        role: "admin",
        isActive: true,
      });

      const user = await db.getUserByPhone(phone);
      expect(user?.role).toBe("admin");
    });
  });

  describe("Commission System", () => {
    it("should add pending commission to driver", async () => {
      const driverPhone = `+966599999${Date.now().toString().slice(-3)}`;
      const hashedPassword = await bcrypt.hash("password123", 10);

      await db.upsertUser({
        phone: driverPhone,
        password: hashedPassword,
        name: "Commission Test Driver",
        role: "driver",
        isActive: true,
      });

      const driver = await db.getUserByPhone(driverPhone);
      expect(driver).toBeDefined();

      if (driver) {
        const updated = await updateDriverCommission(driver.id, 25);
        expect(parseFloat(updated?.pendingCommission?.toString() || "0")).toBe(25);
        expect(updated?.accountStatus).toBe("active");
      }
    });

    it("should suspend driver when commission reaches 30", async () => {
      const driverPhone = `+966598888${Date.now().toString().slice(-3)}`;
      const hashedPassword = await bcrypt.hash("password123", 10);

      await db.upsertUser({
        phone: driverPhone,
        password: hashedPassword,
        name: "Suspension Test Driver",
        role: "driver",
        isActive: true,
      });

      const driver = await db.getUserByPhone(driverPhone);
      expect(driver).toBeDefined();

      if (driver) {
        await updateDriverCommission(driver.id, 20);
        const updated = await updateDriverCommission(driver.id, 11);
        expect(parseFloat(updated?.pendingCommission?.toString() || "0")).toBe(31);
        expect(updated?.accountStatus).toBe("disabled");
      }
    });

    it("should mark commission as paid and resume account", async () => {
      const driverPhone = `+966597777${Date.now().toString().slice(-3)}`;
      const hashedPassword = await bcrypt.hash("password123", 10);

      await db.upsertUser({
        phone: driverPhone,
        password: hashedPassword,
        name: "Payment Test Driver",
        role: "driver",
        isActive: true,
      });

      const driver = await db.getUserByPhone(driverPhone);
      expect(driver).toBeDefined();

      if (driver) {
        await updateDriverCommission(driver.id, 50);
        const updated = await markCommissionAsPaid(driver.id, 50);
        expect(parseFloat(updated?.pendingCommission?.toString() || "0")).toBe(0);
        expect(parseFloat(updated?.paidCommission?.toString() || "0")).toBe(50);
        expect(updated?.accountStatus).toBe("active");
      }
    });
  });
});
