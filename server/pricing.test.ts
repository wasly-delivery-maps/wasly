import { describe, expect, it } from "vitest";
import {
  calculateOrderPrice,
  calculateDistance,
  getCommissionPerOrder,
  shouldBlockDriver,
  shouldSuspendDriver,
  formatPrice,
  getFixedPrice,
  getPricePerKm,
  getDebtLimit,
  FIXED_PRICE,
  FIXED_DISTANCE_KM,
  PRICE_PER_KM,
  COMMISSION_PER_ORDER,
  DEBT_LIMIT,
} from "../shared/pricing";

describe("Pricing System", () => {
  describe("calculateOrderPrice", () => {
    it("should return fixed price for distance <= 3 km", () => {
      const price = calculateOrderPrice("الحي الأول", "الحي الثاني", 2.5);
      expect(price).toBe(FIXED_PRICE);
    });

    it("should return fixed price for distance = 3 km", () => {
      const price = calculateOrderPrice("الحي الأول", "الحي الثاني", 3);
      expect(price).toBe(FIXED_PRICE);
    });

    it("should calculate price correctly for distance > 3 km", () => {
      // 5 km = 25 + (2 * 5) = 35
      const price = calculateOrderPrice("الحي الأول", "الحي الثاني", 5);
      expect(price).toBe(35);
    });

    it("should calculate price correctly for distance > 3 km with decimal", () => {
      // 3.5 km = 25 + (0.5 * 5) = 25 + 2.5 = 27.5
      const price = calculateOrderPrice("الحي الأول", "الحي الثاني", 3.5);
      expect(price).toBe(27.5);
    });

    it("should return default fixed price when no distance provided", () => {
      const price = calculateOrderPrice("الحي الأول", "الحي الثاني");
      expect(price).toBe(FIXED_PRICE);
    });

    it("should return fixed price for 0 distance", () => {
      const price = calculateOrderPrice("الحي الأول", "الحي الثاني", 0);
      expect(price).toBe(FIXED_PRICE);
    });
  });

  describe("calculateDistance", () => {
    it("should calculate distance between two coordinates", () => {
      // Cairo coordinates
      const lat1 = 30.0444;
      const lon1 = 31.2357;
      const lat2 = 30.0555;
      const lon2 = 31.2468;

      const distance = calculateDistance(lat1, lon1, lat2, lon2);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(5); // Should be less than 5 km
    });

    it("should return 0 for same coordinates", () => {
      const distance = calculateDistance(30.0444, 31.2357, 30.0444, 31.2357);
      expect(distance).toBe(0);
    });
  });

  describe("Commission and Debt", () => {
    it("should return correct commission per order", () => {
      expect(getCommissionPerOrder()).toBe(COMMISSION_PER_ORDER);
    });

    it("should not block driver with debt < limit", () => {
      expect(shouldBlockDriver(20)).toBe(false);
    });

    it("should block driver with debt >= limit", () => {
      expect(shouldBlockDriver(DEBT_LIMIT)).toBe(true);
      expect(shouldBlockDriver(DEBT_LIMIT + 10)).toBe(true);
    });

    it("should suspend driver with debt >= limit", () => {
      expect(shouldSuspendDriver(DEBT_LIMIT)).toBe(true);
      expect(shouldSuspendDriver(DEBT_LIMIT - 1)).toBe(false);
    });
  });

  describe("Format and Constants", () => {
    it("should format price correctly", () => {
      expect(formatPrice(25)).toBe("25.00 ج.م");
      expect(formatPrice(35.5)).toBe("35.50 ج.م");
    });

    it("should return correct fixed price", () => {
      expect(getFixedPrice()).toBe(FIXED_PRICE);
    });

    it("should return correct price per km", () => {
      expect(getPricePerKm()).toBe(PRICE_PER_KM);
    });

    it("should return correct debt limit", () => {
      expect(getDebtLimit()).toBe(DEBT_LIMIT);
    });
  });

  describe("Constants", () => {
    it("should have correct constant values", () => {
      expect(FIXED_PRICE).toBe(25);
      expect(FIXED_DISTANCE_KM).toBe(3);
      expect(PRICE_PER_KM).toBe(5);
      expect(COMMISSION_PER_ORDER).toBe(3);
      expect(DEBT_LIMIT).toBe(30);
    });
  });
});
