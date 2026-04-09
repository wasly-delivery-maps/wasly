import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createAuthContext(userId: number = 1, role: "customer" | "driver" | "admin" = "customer"): {
  ctx: TrpcContext;
} {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `phone-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    phone: `0100000000${userId}`,
    loginMethod: "phone",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Authentication Flow", () => {
  describe("Registration", () => {
    it("should validate phone number format", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.auth.register({
          phone: "123", // Too short
          password: "password123",
          name: "Test User",
          role: "customer",
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("should validate password strength", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.auth.register({
          phone: "01234567890",
          password: "123", // Too short
          name: "Test User",
          role: "customer",
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("should validate name length", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.auth.register({
          phone: "01234567890",
          password: "password123",
          name: "A", // Too short
          role: "customer",
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("should validate email format if provided", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.auth.register({
          phone: "01234567890",
          password: "password123",
          name: "Test User",
          email: "invalid-email",
          role: "customer",
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("should accept valid registration data", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.register({
        phone: "01234567890",
        password: "password123",
        name: "Test User",
        email: "test@example.com",
        role: "customer",
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.phone).toBe("01234567890");
      expect(result.user.name).toBe("Test User");
      expect(result.user.role).toBe("customer");
    });
  });

  describe("Login", () => {
    it("should validate phone number format on login", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.auth.login({
          phone: "123",
          password: "password123",
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("should validate password on login", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.auth.login({
          phone: "01234567890",
          password: "123",
        });
        expect.fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("should reject login with non-existent user", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.auth.login({
          phone: "01999999999",
          password: "password123",
        });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });
  });

  describe("Logout", () => {
    it("should allow authenticated user to logout", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.logout();

      expect(result.success).toBe(true);
    });

    it("should allow public user to logout (no-op)", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.logout();

      expect(result.success).toBe(true);
    });
  });

  describe("Get Current User", () => {
    it("should return current authenticated user", async () => {
      const { ctx } = createAuthContext(1, "customer");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.me();

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.role).toBe("customer");
    });

    it("should return null for unauthenticated user", async () => {
      const { ctx } = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.me();

      expect(result).toBeNull();
    });
  });
});

describe("Form Validation", () => {
  it("should validate user profile update", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.users.updateProfile({
        name: "A", // Too short
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
    }
  });

  it("should validate email in profile update", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.users.updateProfile({
        email: "invalid-email",
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
    }
  });

  it("should validate phone in profile update", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.users.updateProfile({
        phone: "123", // Too short
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
    }
  });
});

describe("Role-Based Access Control", () => {
  it("should prevent non-drivers from updating location", async () => {
    const { ctx } = createAuthContext(1, "customer");
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.location.updateDriverLocation({
        latitude: 30.0444,
        longitude: 31.2357,
      });
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should prevent non-admins from accessing admin endpoints", async () => {
    const { ctx } = createAuthContext(1, "customer");
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.users.getAllUsers();
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should allow admins to access admin endpoints", async () => {
    const { ctx } = createAuthContext(1, "admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.getAllUsers();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should prevent non-customers from creating orders", async () => {
    const { ctx } = createAuthContext(1, "driver");
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.orders.createOrder({
        pickupLocation: {
          address: "Test Pickup",
          latitude: 30.0444,
          longitude: 31.2357,
        },
        deliveryLocation: {
          address: "Test Delivery",
          latitude: 30.0555,
          longitude: 31.2468,
        },
      });
      expect.fail("Should have thrown FORBIDDEN error");
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });
});
