/**
 * نظام التسعير والعمولات لتطبيق التوصيل
 * 
 * قواعد التسعير:
 * 1. الحد الأدنى: 25 جنيه مصري لأول 3 كم (لجميع الأحياء)
 * 2. بعد 3 كم: 5 جنيه مصري لكل كيلومتر إضافي
 * 3. العمولة: 3 جنيه مصري لكل طلب مكتمل
 * 4. حد المديونية: 30 جنيه مصري (يتم حظر السائق عند الوصول لهذا الحد)
 */

export const FIXED_PRICE = 25; // جنيه مصري لأول 3 كم
export const FIXED_DISTANCE_KM = 3; // المسافة المجانية بالكيلومتر
export const PRICE_PER_KM = 5; // جنيه مصري لكل كيلومتر إضافي
export const COMMISSION_PER_ORDER = 3; // جنيه مصري عمولة لكل طلب مكتمل
export const DEBT_LIMIT = 30; // جنيه مصري - حظر السائق عند الوصول لهذا الحد

/**
 * حساب سعر الطلب بناءً على الحي والمسافة
 * قاعدة التسعير:
 * - الأحياء المحددة: 25 ج.م لأول 3 كم، ثم 5 ج.م لكل كم إضافي
 * - باقي الأحياء: 7 ج.م لكل كيلومتر
 * @param pickupNeighborhood - اسم حي الاستلام
 * @param deliveryNeighborhood - اسم حي التسليم (اختياري)
 * @param distance - المسافة بالكيلومتر (اختياري، للتسعير المتغير)
 * @returns السعر بالجنيه المصري
 */
export function calculateOrderPrice(
  pickupNeighborhood?: string,
  deliveryNeighborhood?: string,
  distance?: number
): number {
  // نظام تسعير موحد: 25 ج.m لأول 3 كم, ثم 5 ج.m لكل كم إضافي
  if (distance && distance > FIXED_DISTANCE_KM) {
    const extraDistance = distance - FIXED_DISTANCE_KM;
    const totalPrice = FIXED_PRICE + (extraDistance * PRICE_PER_KM);
    // Round to 2 decimal places
    return Math.round(totalPrice * 100) / 100;
  }
  
  // الحد الأدنى 25 ج.m لأي مسافة من 0 إلى 3 كم
  return FIXED_PRICE;
}

/**
 * حساب المسافة بين نقطتين باستخدام صيغة Haversine
 * @param lat1 - خط عرض النقطة الأولى
 * @param lon1 - خط طول النقطة الأولى
 * @param lat2 - خط عرض النقطة الثانية
 * @param lon2 - خط طول النقطة الثانية
 * @returns المسافة بالكيلومتر
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // نصف قطر الأرض بالكيلومتر
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * حساب عمولة السائق للطلب المكتمل
 * @returns مبلغ العمولة بالجنيه المصري
 */
export function getCommissionPerOrder(): number {
  return COMMISSION_PER_ORDER;
}

/**
 * التحقق من ما إذا كان السائق يجب حظره
 * @param totalDebt - إجمالي المديونية
 * @returns true إذا كان يجب حظر السائق
 */
export function shouldBlockDriver(totalDebt: number): boolean {
  return totalDebt >= DEBT_LIMIT;
}

/**
 * التحقق من ما إذا كان السائق مستحقاً للحظر (اسم بديل)
 * @param debtAmount - مبلغ المديونية
 * @returns true إذا كان المبلغ يساوي أو يتجاوز حد المديونية
 */
export function shouldSuspendDriver(debtAmount: number): boolean {
  return debtAmount >= DEBT_LIMIT;
}

/**
 * تنسيق السعر للعرض (مع العملة)
 * @param price - السعر بالجنيه المصري
 * @returns السعر المنسق مع العملة
 */
export function formatPrice(price: number): string {
  return `${price.toFixed(2)} ج.م`;
}

/**
 * الحصول على السعر الثابت
 * @returns السعر الثابت بالجنيه المصري
 */
export function getFixedPrice(): number {
  return FIXED_PRICE;
}

/**
 * الحصول على سعر الكيلومتر الواحد
 * @returns سعر الكيلومتر بالجنيه المصري
 */
export function getPricePerKm(): number {
  return PRICE_PER_KM;
}

/**
 * الحصول على حد المديونية
 * @returns حد المديونية بالجنيه المصري
 */
export function getDebtLimit(): number {
  return DEBT_LIMIT;
}
