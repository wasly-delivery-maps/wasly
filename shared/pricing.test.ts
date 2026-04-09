import { describe, it, expect } from "vitest";
import {
  calculateOrderPrice,
  calculateDistance,
  formatPrice,
  getCommissionPerOrder,
  shouldBlockDriver,
  shouldSuspendDriver,
  getFixedPrice,
  getPricePerKm,
  getDebtLimit,
} from "./pricing";

describe("Pricing System", () => {
  describe("calculateOrderPrice - Unified Pricing System", () => {
    it("should return fixed price (25) for distance up to 3km", () => {
      const price = calculateOrderPrice("أي حي", undefined, 1);
      expect(price).toBe(25);
    });

    it("should return fixed price (25) for exactly 3km", () => {
      const price = calculateOrderPrice("أي حي", undefined, 3);
      expect(price).toBe(25);
    });

    it("should calculate distance-based price for distance over 3km", () => {
      // 10 km: 25 + (10-3)*5 = 25 + 35 = 60
      const price = calculateOrderPrice("أي حي", undefined, 10);
      expect(price).toBe(60);
    });

    it("should calculate price correctly for 5km distance", () => {
      // 5 km: 25 + (5-3)*5 = 25 + 10 = 35
      const price = calculateOrderPrice("أي حي", undefined, 5);
      expect(price).toBe(35);
    });

    it("should round up distance-based price", () => {
      // 3.5 km: 25 + (3.5-3)*5 = 25 + 2.5 = 27.5 -> 28
      const price = calculateOrderPrice("أي حي", undefined, 3.5);
      expect(price).toBe(28);
    });

    it("should return fixed price when no distance provided", () => {
      const price = calculateOrderPrice("أي حي");
      expect(price).toBe(25);
    });

    it("should work with any neighborhood name", () => {
      const price1 = calculateOrderPrice("الحي الأول", undefined, 2);
      const price2 = calculateOrderPrice("حي آخر", undefined, 2);
      const price3 = calculateOrderPrice("أي مكان", undefined, 2);
      expect(price1).toBe(25);
      expect(price2).toBe(25);
      expect(price3).toBe(25);
    });

    it("should calculate price for 15km correctly", () => {
      // 15 km: 25 + (15-3)*5 = 25 + 60 = 85
      const price = calculateOrderPrice("أي حي", undefined, 15);
      expect(price).toBe(85);
    });
  });

  describe("calculateDistance", () => {
    it("should calculate distance between two coordinates", () => {
      // Cairo to Giza (approximately 20 km)
      const distance = calculateDistance(30.0444, 31.2357, 30.0131, 31.4898);
      expect(distance).toBeGreaterThan(15);
      expect(distance).toBeLessThan(25);
    });

    it("should return 0 for same coordinates", () => {
      const distance = calculateDistance(30.1, 31.1, 30.1, 31.1);
      expect(distance).toBe(0);
    });

    it("should return positive distance", () => {
      const distance = calculateDistance(30.0, 31.0, 30.1, 31.1);
      expect(distance).toBeGreaterThan(0);
    });
  });

  describe("formatPrice", () => {
    it("should format price with EGP currency", () => {
      const formatted = formatPrice(25);
      expect(formatted).toBe("25.00 ج.م");
    });

    it("should format decimal prices", () => {
      const formatted = formatPrice(25.5);
      expect(formatted).toBe("25.50 ج.م");
    });

    it("should format zero price", () => {
      const formatted = formatPrice(0);
      expect(formatted).toBe("0.00 ج.م");
    });
  });

  describe("Commission Functions", () => {
    it("getCommissionPerOrder should return 3", () => {
      const commission = getCommissionPerOrder();
      expect(commission).toBe(3);
    });

    it("getFixedPrice should return 25", () => {
      const price = getFixedPrice();
      expect(price).toBe(25);
    });

    it("getPricePerKm should return 5", () => {
      const pricePerKm = getPricePerKm();
      expect(pricePerKm).toBe(5);
    });

    it("getDebtLimit should return 30", () => {
      const limit = getDebtLimit();
      expect(limit).toBe(30);
    });
  });

  describe("Driver Blocking Functions", () => {
    it("shouldBlockDriver should return false when debt is below limit", () => {
      const result = shouldBlockDriver(29);
      expect(result).toBe(false);
    });

    it("shouldBlockDriver should return true when debt equals limit", () => {
      const result = shouldBlockDriver(30);
      expect(result).toBe(true);
    });

    it("shouldBlockDriver should return true when debt exceeds limit", () => {
      const result = shouldBlockDriver(60);
      expect(result).toBe(true);
    });

    it("shouldSuspendDriver should return false when debt is below limit", () => {
      const result = shouldSuspendDriver(29);
      expect(result).toBe(false);
    });

    it("shouldSuspendDriver should return true when debt equals limit", () => {
      const result = shouldSuspendDriver(30);
      expect(result).toBe(true);
    });

    it("shouldSuspendDriver should return true when debt exceeds limit", () => {
      const result = shouldSuspendDriver(60);
      expect(result).toBe(true);
    });
  });

  describe("Integration Tests", () => {
    it("should calculate correct debt after multiple orders", () => {
      let debt = 0;
      const commission = getCommissionPerOrder();

      // Simulate 10 completed orders
      for (let i = 0; i < 10; i++) {
        debt += commission;
      }

      expect(debt).toBe(30);
      expect(shouldBlockDriver(debt)).toBe(true);
    });

    it("should block driver after 10 orders (10 * 3 = 30 >= 30)", () => {
      let debt = 0;
      const commission = getCommissionPerOrder();

      // Simulate 11 completed orders (11 * 3 = 33 >= 30)
      for (let i = 0; i < 11; i++) {
        debt += commission;
      }

      expect(debt).toBe(33);
      expect(shouldBlockDriver(debt)).toBe(true);
    });

    it("should calculate correct total price for unified pricing", () => {
      // Test 2km distance (within 3km limit)
      const shortDistance = calculateOrderPrice("أي حي", undefined, 2);
      expect(shortDistance).toBe(25);

      // Test 10km distance (beyond 3km limit)
      // 25 + (10-3)*5 = 25 + 35 = 60
      const longDistance = calculateOrderPrice("أي حي", undefined, 10);
      expect(longDistance).toBe(60);
    });

    it("should calculate price correctly for various distances", () => {
      // Test cases for unified pricing (5 ج.م per km)
      expect(calculateOrderPrice("أي حي", undefined, 1)).toBe(25);
      expect(calculateOrderPrice("أي حي", undefined, 3)).toBe(25);
      expect(calculateOrderPrice("أي حي", undefined, 4)).toBe(30); // 25 + 1*5
      expect(calculateOrderPrice("أي حي", undefined, 5)).toBe(35); // 25 + 2*5
      expect(calculateOrderPrice("أي حي", undefined, 10)).toBe(60); // 25 + 7*5
    });
  });
});
