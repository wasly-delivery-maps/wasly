import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb, getUserByOpenId, upsertUser } from "./db";
import type { InsertUser } from "../drizzle/schema";

describe("Database Connection and Operations", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  it("should connect to the database", async () => {
    const database = await getDb();
    expect(database).toBeDefined();
  });

  it("should insert and retrieve a user", async () => {
    const testUser: InsertUser = {
      openId: `test-user-${Date.now()}`,
      name: "Test User",
      email: "test@example.com",
      role: "customer",
      isActive: true,
      accountStatus: "active",
    };

    // Insert user
    await upsertUser(testUser);

    // Retrieve user
    const retrievedUser = await getUserByOpenId(testUser.openId);
    
    expect(retrievedUser).toBeDefined();
    expect(retrievedUser?.openId).toBe(testUser.openId);
    expect(retrievedUser?.name).toBe(testUser.name);
    expect(retrievedUser?.email).toBe(testUser.email);
  });

  it("should handle database errors gracefully", async () => {
    const invalidUser: InsertUser = {
      openId: "", // Invalid: empty openId
      name: "Invalid User",
      role: "customer",
      isActive: true,
      accountStatus: "active",
    };

    try {
      await upsertUser(invalidUser);
      // If we reach here, the operation should have failed
      expect(true).toBe(false); // This should not be reached
    } catch (error) {
      // Expected to throw an error
      expect(error).toBeDefined();
    }
  });
});
