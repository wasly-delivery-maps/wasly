import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { MapPin, AlertCircle, CheckCircle2 } from "lucide-react";

interface DriverLocationUpdaterProps {
  orderId?: number;
  updateInterval?: number; // milliseconds, default 10 seconds
  enabled?: boolean;
}

/**
 * DriverLocationUpdater Component
 * Automatically updates driver location every 5-10 seconds
 * Sends location via tRPC to backend
 * Broadcasts via WebSocket to customers
 */
export function DriverLocationUpdater({
  orderId,
  updateInterval = 10000, // 10 seconds default
  enabled = true,
}: DriverLocationUpdaterProps) {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const updateLocationMutation = trpc.location.updateDriverLocation.useMutation();

  // Request location permission on mount
  useEffect(() => {
    if (!enabled || !user || user.role !== "driver") return;

    const requestLocationPermission = async () => {
      try {
        if ("geolocation" in navigator) {
          // Request permission
          const permission = await navigator.permissions.query({
            name: "geolocation",
          });

          if (permission.state === "denied") {
            setLocationError("تم رفض الوصول إلى الموقع. يرجى السماح بالوصول في إعدادات المتصفح.");
            return;
          }

          if (permission.state === "granted") {
            startTracking();
          } else {
            // state === 'prompt' - will ask on first geolocation call
            startTracking();
          }
        } else {
          setLocationError("المتصفح لا يدعم خدمة تحديد الموقع");
        }
      } catch (error) {
        console.error("Error requesting location permission:", error);
      }
    };

    requestLocationPermission();

    return () => {
      stopTracking();
    };
  }, [enabled, user]);

  const startTracking = () => {
    if (!("geolocation" in navigator)) {
      setLocationError("المتصفح لا يدعم خدمة تحديد الموقع");
      return;
    }

    setIsTracking(true);
    setLocationError(null);

    // Watch position with high accuracy
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        lastLocationRef.current = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocationError(null);
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errorMessage = "خطأ في الحصول على الموقع";

        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "تم رفض الوصول إلى الموقع";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "الموقع غير متاح حالياً";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "انتهت مهلة الحصول على الموقع";
        }

        setLocationError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    // Set up periodic location update
    updateTimerRef.current = setInterval(() => {
      if (lastLocationRef.current) {
        updateLocationMutation.mutate({
          latitude: lastLocationRef.current.latitude,
          longitude: lastLocationRef.current.longitude,
          orderId,
        });
        setLastUpdateTime(new Date());
      }
    }, updateInterval);
  };

  const stopTracking = () => {
    setIsTracking(false);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
      updateTimerRef.current = null;
    }
  };

  const toggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  if (!user || user.role !== "driver") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">تتبع الموقع</h3>
        </div>
        <button
          onClick={toggleTracking}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            isTracking
              ? "bg-red-100 text-red-700 hover:bg-red-200"
              : "bg-green-100 text-green-700 hover:bg-green-200"
          }`}
        >
          {isTracking ? "إيقاف" : "بدء"}
        </button>
      </div>

      {/* Status */}
      <div className="space-y-2">
        {/* Tracking Status */}
        <div className="flex items-center gap-2 text-sm">
          {isTracking ? (
            <>
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-700 font-medium">جاري التتبع</span>
            </>
          ) : (
            <>
              <div className="h-2 w-2 bg-gray-400 rounded-full" />
              <span className="text-gray-600">التتبع متوقف</span>
            </>
          )}
        </div>

        {/* Last Update Time */}
        {lastUpdateTime && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>آخر تحديث: {lastUpdateTime.toLocaleTimeString("ar-EG")}</span>
          </div>
        )}

        {/* Location Error */}
        {locationError && (
          <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{locationError}</span>
          </div>
        )}

        {/* Update Status */}
        {updateLocationMutation.isPending && (
          <div className="text-xs text-blue-600">جاري إرسال الموقع...</div>
        )}

        {updateLocationMutation.isError && (
          <div className="text-xs text-red-600">خطأ في إرسال الموقع</div>
        )}
      </div>

      {/* Current Location Info */}
      {lastLocationRef.current && (
        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
          <p>
            الإحداثيات: {lastLocationRef.current.latitude.toFixed(4)},
            {lastLocationRef.current.longitude.toFixed(4)}
          </p>
        </div>
      )}
    </div>
  );
}
