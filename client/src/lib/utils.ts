import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * تطبيع رقم الهاتف إلى صيغة E.164
 * يدعم الأرقام المحلية المصرية والأرقام الدولية
 * 
 * أمثلة:
 * - "01032809502" -> "+201032809502"
 * - "1032809502" -> "+201032809502"
 * - "+201032809502" -> "+201032809502"
 * - "+966501234567" -> "+966501234567"
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";

  // إزالة جميع المسافات والشرطات والأقواس
  let normalized = phone.replace(/[\s\-\(\)]/g, "");

  // إذا كان يبدأ بـ 00 (صيغة دولية بدون +)
  if (normalized.startsWith("00")) {
    normalized = "+" + normalized.substring(2);
  }

  // إذا كان يبدأ بـ 0 (رقم محلي مصري)
  if (normalized.startsWith("0") && !normalized.startsWith("+")) {
    // افترض أنه رقم مصري وأضف رمز الدولة +20
    normalized = "+20" + normalized.substring(1);
  }

  // إذا لم يبدأ بـ + ولم يكن يحتوي على رمز دولة، افترض أنه مصري
  if (!normalized.startsWith("+")) {
    normalized = "+20" + normalized;
  }

  return normalized;
}

/**
 * التحقق من صحة رقم الهاتف بعد التطبيع
 */
export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  // يجب أن يكون الرقم بصيغة E.164 وطوله بين 10-15 رقم
  return /^\+\d{10,15}$/.test(normalized);
}

/**
 * الحصول على رقم الهاتف بصيغة E.164
 */
export function getE164PhoneNumber(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  if (isValidPhoneNumber(phone)) {
    return normalized;
  }
  return "";
}
