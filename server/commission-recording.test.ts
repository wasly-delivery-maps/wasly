import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";
import { COMMISSION_PER_ORDER, DEBT_LIMIT } from "../shared/pricing";
import bcrypt from "bcryptjs";

/**
 * اختبار شامل: التأكد من أن العمولة 3 جنيه تُسجل بشكل صحيح عند إنهاء الطلب
 */
describe("Commission Recording on Order Completion", () => {
  let driverId: number;
  const driverPhone = "+966501032809502";
  const driverPassword = "123456";

  beforeAll(async () => {
    // إنشاء سائق للاختبار
    const hashedPassword = await bcrypt.hash(driverPassword, 10);
    await db.upsertUser({
      phone: driverPhone,
      password: hashedPassword,
      name: "Test Driver - Commission",
      role: "driver",
      isActive: true,
    });

    const driver = await db.getUserByPhone(driverPhone);
    if (driver) {
      driverId = driver.id;
    }
  });

  describe("Single Order Completion", () => {
    it("should record exactly 3 EGP commission after order completion", async () => {
      // الحالة الأولية: لا توجد عمولات مستحقة
      let driver = await db.getUserById(driverId);
      const initialCommission = parseFloat(driver?.pendingCommission?.toString() || "0");
      console.log(`✓ العمولات المستحقة الأولية: ${initialCommission} جنيه`);

      // محاكاة إنهاء طلب
      await db.updateDriverCommission(driverId, COMMISSION_PER_ORDER);

      // التحقق من أن العمولة = 3 جنيه
      driver = await db.getUserById(driverId);
      const newCommission = parseFloat(driver?.pendingCommission?.toString() || "0");
      console.log(`✓ العمولات المستحقة بعد إنهاء طلب واحد: ${newCommission} جنيه`);

      expect(newCommission).toBe(initialCommission + COMMISSION_PER_ORDER);
      expect(COMMISSION_PER_ORDER).toBe(3);
      expect(newCommission).toBe(3);
    });
  });

  describe("Multiple Orders Completion", () => {
    it("should accumulate 3 EGP per completed order", async () => {
      // إنهاء 5 طلبات إضافية
      for (let i = 0; i < 5; i++) {
        await db.updateDriverCommission(driverId, COMMISSION_PER_ORDER);
      }

      // التحقق من التراكم: 3 + (5 * 3) = 18 جنيه
      const driver = await db.getUserById(driverId);
      const totalCommission = parseFloat(driver?.pendingCommission?.toString() || "0");
      console.log(`✓ العمولات المستحقة بعد 6 طلبات: ${totalCommission} جنيه`);

      expect(totalCommission).toBe(18); // 6 طلبات × 3 جنيه
    });
  });

  describe("Debt Limit and Account Blocking", () => {
    it("should NOT block account at exactly 30 EGP", async () => {
      // إضافة عمولات حتى نصل إلى 30 جنيه (4 طلبات إضافية)
      for (let i = 0; i < 4; i++) {
        await db.updateDriverCommission(driverId, COMMISSION_PER_ORDER);
      }

      const driver = await db.getUserById(driverId);
      const totalCommission = parseFloat(driver?.pendingCommission?.toString() || "0");
      console.log(`✓ العمولات المستحقة عند الحد: ${totalCommission} جنيه`);
      console.log(`✓ حالة الحساب: ${driver?.accountStatus}`);

      expect(totalCommission).toBe(30); // 10 طلبات × 3 جنيه
      expect(driver?.accountStatus).toBe("active"); // لا يتم الحظر عند 30
    });

    it("should block account when exceeding 30 EGP", async () => {
      // إضافة طلب واحد أكثر (يتجاوز 30)
      await db.updateDriverCommission(driverId, COMMISSION_PER_ORDER);

      const driver = await db.getUserById(driverId);
      const totalCommission = parseFloat(driver?.pendingCommission?.toString() || "0");
      console.log(`✓ العمولات المستحقة بعد التجاوز: ${totalCommission} جنيه`);
      console.log(`✓ حالة الحساب: ${driver?.accountStatus}`);

      expect(totalCommission).toBe(33); // 11 طلب × 3 جنيه
      expect(driver?.accountStatus).toBe("disabled"); // يتم الحظر عند > 30
    });
  });

  describe("Commission Payment", () => {
    it("should deduct commission correctly when paying", async () => {
      // الحالة الحالية: 33 جنيه عمولات مستحقة
      let driver = await db.getUserById(driverId);
      let pendingBefore = parseFloat(driver?.pendingCommission?.toString() || "0");
      let paidBefore = parseFloat(driver?.paidCommission?.toString() || "0");
      console.log(`✓ العمولات المستحقة قبل الدفع: ${pendingBefore} جنيه`);
      console.log(`✓ العمولات المدفوعة قبل الدفع: ${paidBefore} جنيه`);

      // دفع 15 جنيه
      await db.markCommissionAsPaid(driverId, 15);

      driver = await db.getUserById(driverId);
      const pendingAfter = parseFloat(driver?.pendingCommission?.toString() || "0");
      const paidAfter = parseFloat(driver?.paidCommission?.toString() || "0");
      console.log(`✓ العمولات المستحقة بعد الدفع: ${pendingAfter} جنيه`);
      console.log(`✓ العمولات المدفوعة بعد الدفع: ${paidAfter} جنيه`);

      expect(pendingAfter).toBe(pendingBefore - 15);
      expect(paidAfter).toBe(paidBefore + 15);
    });

    it("should resume account when commission drops below 30 EGP", async () => {
      // دفع المتبقي لتنخفض العمولات عن 30
      await db.markCommissionAsPaid(driverId, 18); // 33 - 15 = 18

      const driver = await db.getUserById(driverId);
      const pendingAfter = parseFloat(driver?.pendingCommission?.toString() || "0");
      console.log(`✓ العمولات المستحقة بعد الدفع الكامل: ${pendingAfter} جنيه`);
      console.log(`✓ حالة الحساب: ${driver?.accountStatus}`);

      expect(pendingAfter).toBe(0);
      expect(driver?.accountStatus).toBe("active"); // يتم تفعيل الحساب
    });
  });

  describe("Verification Summary", () => {
    it("should verify final state", async () => {
      const driver = await db.getUserById(driverId);
      console.log("\n=== ملخص الاختبار ===");
      console.log(`✓ رقم السائق: ${driverId}`);
      console.log(`✓ الهاتف: ${driver?.phone}`);
      console.log(`✓ العمولات المستحقة: ${driver?.pendingCommission} جنيه`);
      console.log(`✓ إجمالي العمولات المدفوعة: ${driver?.paidCommission} جنيه`);
      console.log(`✓ حالة الحساب: ${driver?.accountStatus}`);
      console.log(`✓ قيمة العمولة لكل طلب: ${COMMISSION_PER_ORDER} جنيه`);
      console.log(`✓ حد المديونية: ${DEBT_LIMIT} جنيه`);
      console.log("===================\n");

      expect(COMMISSION_PER_ORDER).toBe(3);
      expect(DEBT_LIMIT).toBe(30);
    });
  });
});
