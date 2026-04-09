import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { formatPrice } from "@shared/pricing";

interface CommissionCardProps {
  pendingCommission: number;
  paidCommission: number;
  accountStatus: string;
  suspensionReason?: string | null;
}

export function CommissionCard({
  pendingCommission,
  paidCommission,
  accountStatus,
  suspensionReason,
}: CommissionCardProps) {
  const pendingAmount = parseFloat(pendingCommission?.toString() || "0");
  const paidAmount = parseFloat(paidCommission?.toString() || "0");
  const totalCommission = pendingAmount + paidAmount;
  const suspensionThreshold = 30;
  const warningThreshold = 20;
  const isNearSuspension = pendingAmount >= warningThreshold && pendingAmount < suspensionThreshold;
  const isSuspended = accountStatus === "disabled" || accountStatus === "suspended";
  const isActive = accountStatus === "active";

  return (
    <div className="space-y-4">
      {/* Main Commission Card */}
      <Card className={`border-l-4 ${isSuspended ? "border-red-500 bg-red-50" : isNearSuspension ? "border-yellow-500 bg-yellow-50" : "border-blue-500 bg-blue-50"}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              العمولات والحالة
            </span>
            <Badge className={isSuspended ? "bg-red-600" : isActive ? "bg-green-600" : "bg-yellow-600"}>
              {isSuspended ? "موقوف" : isActive ? "نشط" : "في الانتظار"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Commission Breakdown */}
          <div className="bg-white p-4 rounded-lg border border-blue-200">
            <p className="text-xs text-muted-foreground mb-1">العمولات المستحقة</p>
            <p className="text-2xl font-bold text-blue-600">{formatPrice(pendingAmount)}</p>
            <p className="text-xs text-muted-foreground mt-1">بانتظار السداد</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">العمولات المستحقة</span>
              <span className="text-xs text-muted-foreground">{pendingAmount.toFixed(2)} / {suspensionThreshold} ج.م</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isSuspended ? "bg-red-600" : isNearSuspension ? "bg-yellow-500" : "bg-blue-600"
                }`}
                style={{ width: `${Math.min((pendingAmount / suspensionThreshold) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Status Messages */}
          {isSuspended && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-4 flex gap-3">
              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">حسابك موقوف مؤقتاً</p>
                <p className="text-sm text-red-800 mt-1">
                  {suspensionReason || "العمولات المستحقة بلغت 30 جنيه أو أكثر"}
                </p>
                <p className="text-sm text-red-700 mt-2 font-medium">
                  📱 لتفعيل حسابك: أرسل تحويل فودافون كاش إلى 01032809502 ثم أرسل سكرين الإيصال على واتس على نفس الرقم
                </p>
              </div>
            </div>
          )}

          {isNearSuspension && !isSuspended && (
            <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-900">تنبيه: عمولات مستحقة</p>
                <p className="text-sm text-yellow-800 mt-1">
                  لديك {formatPrice(pendingAmount)} عمولات مستحقة. عند الوصول إلى 30 جنيه سيتم إيقاف حسابك تلقائياً.
                </p>
                <p className="text-sm text-yellow-700 mt-2">
                  المتبقي: {formatPrice(suspensionThreshold - pendingAmount)} فقط
                </p>
              </div>
            </div>
          )}

          {isActive && pendingAmount === 0 && (
            <div className="bg-green-100 border border-green-300 rounded-lg p-4 flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900">حسابك نشط وجاهز</p>
                <p className="text-sm text-green-800 mt-1">
                  لا توجد عمولات مستحقة. يمكنك استقبال الطلبات الجديدة بدون مشاكل.
                </p>
              </div>
            </div>
          )}

          {isActive && pendingAmount > 0 && !isNearSuspension && (
            <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 flex gap-3">
              <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">حسابك نشط</p>
                <p className="text-sm text-blue-800 mt-1">
                  لديك {formatPrice(pendingAmount)} عمولات مستحقة. يمكنك الاستمرار في استقبال الطلبات.
                </p>
              </div>
            </div>
          )}

          {/* Payment Instructions */}
          {(isSuspended || isNearSuspension) && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-900 mb-2">📋 خطوات السداد:</p>
              <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                <li>افتح تطبيق فودافون كاش</li>
                <li>اختر "تحويل أموال"</li>
                <li>أدخل الرقم: <span className="font-mono font-bold">01032809502</span></li>
                <li>أدخل المبلغ المستحق: {formatPrice(pendingAmount)}</li>
                <li>أكمل التحويل وخذ سكرين للإيصال</li>
                <li>أرسل السكرين على واتس: <span className="font-mono font-bold">01032809502</span></li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
