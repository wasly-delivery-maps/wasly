import { useEffect, useState } from "react";
import { AlertCircle, Bell, TrendingDown, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface CommissionNotification {
  type: "warning" | "suspended" | "resumed";
  title: string;
  message: string;
  amount?: number;
  timestamp: Date;
}

export function CommissionNotifications({ userId }: { userId?: number }) {
  const [notifications, setNotifications] = useState<CommissionNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Connect to SSE for real-time notifications
    const eventSource = new EventSource(`/api/notifications/subscribe/${userId}`);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "commission_warning") {
          const notification: CommissionNotification = {
            type: "warning",
            title: "⚠️ تنبيه: عمولات مستحقة",
            message: `لديك ج.م ${data.amount?.toFixed(2)} عمولات مستحقة. المتبقي: ج.م ${(30 - data.amount).toFixed(2)} فقط قبل إيقاف الحساب`,
            amount: data.amount,
            timestamp: new Date(),
          };
          setNotifications((prev) => [notification, ...prev].slice(0, 5));
          toast.warning(notification.message);
        } else if (data.type === "commission_suspended") {
          const notification: CommissionNotification = {
            type: "suspended",
            title: "❌ تم إيقاف الحساب",
            message: `تم إيقاف حسابك بسبب عمولات مستحقة بقيمة ج.م ${data.amount?.toFixed(2)}. يرجى تسديد العمولات لتفعيل حسابك`,
            amount: data.amount,
            timestamp: new Date(),
          };
          setNotifications((prev) => [notification, ...prev].slice(0, 5));
          toast.error(notification.message);
        } else if (data.type === "commission_resumed") {
          const notification: CommissionNotification = {
            type: "resumed",
            title: "✅ تم تفعيل الحساب",
            message: "تم تفعيل حسابك بنجاح. يمكنك الآن استقبال الطلبات الجديدة",
            timestamp: new Date(),
          };
          setNotifications((prev) => [notification, ...prev].slice(0, 5));
          toast.success(notification.message);
        }
      } catch (error) {
        console.error("Failed to parse notification:", error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [userId]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {notifications.map((notif, index) => (
        <Card
          key={index}
          className={`border-l-4 ${
            notif.type === "warning"
              ? "border-yellow-500 bg-yellow-50"
              : notif.type === "suspended"
              ? "border-red-500 bg-red-50"
              : "border-green-500 bg-green-50"
          }`}
        >
          <CardContent className="pt-4 flex gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {notif.type === "warning" && (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              {notif.type === "suspended" && (
                <Bell className="h-5 w-5 text-red-600" />
              )}
              {notif.type === "resumed" && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </div>
            <div className="flex-1">
              <p
                className={`font-semibold ${
                  notif.type === "warning"
                    ? "text-yellow-900"
                    : notif.type === "suspended"
                    ? "text-red-900"
                    : "text-green-900"
                }`}
              >
                {notif.title}
              </p>
              <p
                className={`text-sm mt-1 ${
                  notif.type === "warning"
                    ? "text-yellow-800"
                    : notif.type === "suspended"
                    ? "text-red-800"
                    : "text-green-800"
                }`}
              >
                {notif.message}
              </p>
              <p className="text-xs mt-2 opacity-70">
                {notif.timestamp.toLocaleTimeString("ar-EG")}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
