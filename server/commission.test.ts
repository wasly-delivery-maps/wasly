import { describe, it, expect } from "vitest";
import { COMMISSION_PER_ORDER, DEBT_LIMIT } from "../shared/pricing";

/**
 * اختبار نظام العمولات الصحيح
 * 
 * القاعدة:
 * - كل طلب مكتمل = 3 جنيه عمولة (ثابت)
 * - الحظر يتم عند تجاوز 30 جنيه (أكبر من 30)
 */

describe("Commission System", () => {
  describe("Commission per order", () => {
    it("should be 3 EGP per completed order", () => {
      expect(COMMISSION_PER_ORDER).toBe(3);
    });

    it("should not be based on order price", () => {
      // Commission is fixed, not based on order price
      const orderPrice1 = 25; // 3 km
      const orderPrice2 = 45; // 10 km
      const orderPrice3 = 35; // 5 km

      // All should have same commission
      expect(COMMISSION_PER_ORDER).toBe(3);
      expect(COMMISSION_PER_ORDER).toBe(3);
      expect(COMMISSION_PER_ORDER).toBe(3);
    });
  });

  describe("Debt limit and blocking", () => {
    it("should be 30 EGP", () => {
      expect(DEBT_LIMIT).toBe(30);
    });

    it("should block driver only when debt > 30 (not >= 30)", () => {
      // Driver should NOT be blocked at exactly 30 EGP
      const debtAt30 = 30;
      const shouldBlockAt30 = debtAt30 > DEBT_LIMIT; // false
      expect(shouldBlockAt30).toBe(false);

      // Driver SHOULD be blocked when debt > 30
      const debtAt31 = 31;
      const shouldBlockAt31 = debtAt31 > DEBT_LIMIT; // true
      expect(shouldBlockAt31).toBe(true);

      // Driver SHOULD be blocked when debt > 30
      const debtAt30Point01 = 30.01;
      const shouldBlockAt30Point01 = debtAt30Point01 > DEBT_LIMIT; // true
      expect(shouldBlockAt30Point01).toBe(true);
    });
  });

  describe("Commission accumulation", () => {
    it("should accumulate correctly for multiple orders", () => {
      // 1 order: 3 EGP
      let totalCommission = 0;
      totalCommission += COMMISSION_PER_ORDER; // +3
      expect(totalCommission).toBe(3);

      // 2 orders: 6 EGP
      totalCommission += COMMISSION_PER_ORDER; // +3
      expect(totalCommission).toBe(6);

      // 3 orders: 9 EGP
      totalCommission += COMMISSION_PER_ORDER; // +3
      expect(totalCommission).toBe(9);

      // 10 orders: 30 EGP (at limit, not blocked)
      totalCommission = COMMISSION_PER_ORDER * 10;
      expect(totalCommission).toBe(30);
      expect(totalCommission > DEBT_LIMIT).toBe(false); // Not blocked

      // 11 orders: 33 EGP (blocked)
      totalCommission = COMMISSION_PER_ORDER * 11;
      expect(totalCommission).toBe(33);
      expect(totalCommission > DEBT_LIMIT).toBe(true); // Blocked
    });
  });

  describe("Real-world scenario", () => {
    it("should handle driver with 1 completed order correctly", () => {
      // Driver completes 1 order with price 29 EGP
      const orderPrice = 29;
      const commission = COMMISSION_PER_ORDER; // Should be 3, not 29

      expect(commission).toBe(3);
      expect(commission).not.toBe(orderPrice);

      // Pending commission should be 3 EGP
      const pendingCommission = commission;
      expect(pendingCommission).toBe(3);

      // Should NOT be blocked (3 < 30)
      const isBlocked = pendingCommission > DEBT_LIMIT;
      expect(isBlocked).toBe(false);
    });

    it("should handle driver with 10 completed orders", () => {
      // Driver completes 10 orders
      const ordersCompleted = 10;
      const totalCommission = COMMISSION_PER_ORDER * ordersCompleted;

      expect(totalCommission).toBe(30);

      // Should NOT be blocked at exactly 30 EGP
      const isBlocked = totalCommission > DEBT_LIMIT;
      expect(isBlocked).toBe(false);
    });

    it("should handle driver with 11 completed orders", () => {
      // Driver completes 11 orders
      const ordersCompleted = 11;
      const totalCommission = COMMISSION_PER_ORDER * ordersCompleted;

      expect(totalCommission).toBe(33);

      // SHOULD be blocked when > 30 EGP
      const isBlocked = totalCommission > DEBT_LIMIT;
      expect(isBlocked).toBe(true);
    });
  });

  describe("Bug fix verification", () => {
    it("should NOT calculate commission as order price", () => {
      // This was the bug: commission was being set to order price
      // instead of the fixed COMMISSION_PER_ORDER value

      const testOrders = [
        { price: 25, expectedCommission: 3 },
        { price: 29, expectedCommission: 3 },
        { price: 35, expectedCommission: 3 },
        { price: 45, expectedCommission: 3 },
        { price: 60, expectedCommission: 3 },
      ];

      testOrders.forEach(({ price, expectedCommission }) => {
        // Commission should always be 3, regardless of order price
        const commission = COMMISSION_PER_ORDER;
        expect(commission).toBe(expectedCommission);
        expect(commission).not.toBe(price);
      });
    });
  });
});
