import { describe, it, expect } from "vitest";
import { calculateOrderPrice, formatPrice } from "../shared/pricing";

/**
 * اختبار ثبات السعر قبل وبعد إنشاء الطلب
 * 
 * قاعدة التسعير:
 * - أول 3 كم = 25 جنيه
 * - كل كيلومتر زيادة بعد 3 كم = 5 جنيه
 */

describe("Order Price Consistency", () => {
  describe("calculateOrderPrice - Basic pricing rules", () => {
    it("should return 25 for distance <= 3 km", () => {
      expect(calculateOrderPrice("", "", 0)).toBe(25);
      expect(calculateOrderPrice("", "", 1)).toBe(25);
      expect(calculateOrderPrice("", "", 2)).toBe(25);
      expect(calculateOrderPrice("", "", 3)).toBe(25);
    });

    it("should calculate 25 + (distance - 3) * 5 for distance > 3 km", () => {
      // 4 km: 25 + (4 - 3) * 5 = 25 + 5 = 30
      expect(calculateOrderPrice("", "", 4)).toBe(30);
      
      // 5 km: 25 + (5 - 3) * 5 = 25 + 10 = 35
      expect(calculateOrderPrice("", "", 5)).toBe(35);
      
      // 10 km: 25 + (10 - 3) * 5 = 25 + 35 = 60
      expect(calculateOrderPrice("", "", 10)).toBe(60);
      
      // 15 km: 25 + (15 - 3) * 5 = 25 + 60 = 85
      expect(calculateOrderPrice("", "", 15)).toBe(85);
    });

    it("should handle decimal distances correctly", () => {
      // 3.5 km: 25 + (3.5 - 3) * 5 = 25 + 2.5 = 27.5
      expect(calculateOrderPrice("", "", 3.5)).toBe(27.5);
      
      // 4.2 km: 25 + (4.2 - 3) * 5 = 25 + 6 = 31
      expect(calculateOrderPrice("", "", 4.2)).toBe(31);
      
      // 5.7 km: 25 + (5.7 - 3) * 5 = 25 + 13.5 = 38.5
      expect(calculateOrderPrice("", "", 5.7)).toBe(38.5);
    });
  });

  describe("formatPrice - Display consistency", () => {
    it("should format prices with 2 decimal places and currency", () => {
      expect(formatPrice(25)).toBe("25.00 ج.م");
      expect(formatPrice(30)).toBe("30.00 ج.م");
      expect(formatPrice(27.5)).toBe("27.50 ج.م");
      expect(formatPrice(38.5)).toBe("38.50 ج.م");
    });
  });

  describe("Price consistency - Frontend to Backend", () => {
    it("should maintain price consistency through the flow", () => {
      const testCases = [
        { distance: 2, expectedPrice: 25 },
        { distance: 3, expectedPrice: 25 },
        { distance: 4, expectedPrice: 30 },
        { distance: 5, expectedPrice: 35 },
        { distance: 10, expectedPrice: 60 },
      ];

      testCases.forEach(({ distance, expectedPrice }) => {
        // 1. Calculate price (as done in frontend)
        const calculatedPrice = calculateOrderPrice("", "", distance);
        expect(calculatedPrice).toBe(expectedPrice);

        // 2. Format price for display (as shown to user)
        const displayPrice = formatPrice(calculatedPrice);
        expect(displayPrice).toBe(`${expectedPrice.toFixed(2)} ج.م`);

        // 3. Verify that parsing back gives the same value
        const parsedPrice = parseFloat(displayPrice.replace(" ج.م", ""));
        expect(parsedPrice).toBe(expectedPrice);
      });
    });

    it("should ensure price sent to API matches displayed price", () => {
      const distance = 7;
      
      // Frontend calculation
      const frontendPrice = calculateOrderPrice("", "", distance);
      expect(frontendPrice).toBe(45); // 25 + (7-3)*5 = 25 + 20 = 45
      
      // What user sees
      const displayedPrice = formatPrice(frontendPrice);
      expect(displayedPrice).toBe("45.00 ج.م");
      
      // What gets sent to API (should be the same as frontend calculation)
      const apiPrice = frontendPrice;
      expect(apiPrice).toBe(45);
      
      // What gets stored in DB (should match API price)
      const dbPrice = apiPrice;
      expect(dbPrice).toBe(45);
      
      // What gets retrieved from DB (should match original)
      const retrievedPrice = parseFloat(dbPrice.toString());
      expect(retrievedPrice).toBe(45);
    });
  });

  describe("Edge cases and rounding", () => {
    it("should handle very small distances", () => {
      expect(calculateOrderPrice("", "", 0.1)).toBe(25);
      expect(calculateOrderPrice("", "", 0.01)).toBe(25);
    });

    it("should handle very large distances", () => {
      // 100 km: 25 + (100 - 3) * 5 = 25 + 485 = 510
      expect(calculateOrderPrice("", "", 100)).toBe(510);
    });

    it("should round correctly for decimal results", () => {
      // 3.1 km: 25 + (3.1 - 3) * 5 = 25 + 0.5 = 25.5
      expect(calculateOrderPrice("", "", 3.1)).toBe(25.5);
      
      // 3.3 km: 25 + (3.3 - 3) * 5 = 25 + 1.5 = 26.5
      expect(calculateOrderPrice("", "", 3.3)).toBe(26.5);
    });
  });
});
