import { useNotifications } from "@/hooks/useNotifications";
import { Bell, X } from "lucide-react";
import { useState } from "react";

export function NotificationCenter() {
  const { notifications, isConnected } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Notification Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full bg-white shadow-lg hover:shadow-xl transition-shadow"
      >
        <Bell className="h-6 w-6 text-orange-600" />
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {notifications.length}
          </span>
        )}
        {isConnected && (
          <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="absolute top-12 right-0 w-80 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p>لا توجد إشعارات جديدة</p>
            </div>
          ) : (
            notifications.map((notif, idx) => (
              <div
                key={idx}
                className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{notif.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notif.timestamp).toLocaleTimeString("ar-EG")}
                    </p>
                  </div>
                  {notif.type === "new_order" && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                      طلب جديد
                    </span>
                  )}
                  {notif.type === "order_accepted" && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      مقبول
                    </span>
                  )}
                  {notif.type === "order_delivered" && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      تم التسليم
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
