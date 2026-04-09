import { useEffect, useRef, useState } from "react";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { MapView } from "@/components/Map";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface LiveTrackingMapProps {
  orderId: number;
  driverId: number;
  pickupLocation: { latitude: number; longitude: number; address: string };
  deliveryLocation: { latitude: number; longitude: number; address: string };
}

export function LiveTrackingMap({
  orderId,
  driverId,
  pickupLocation,
  deliveryLocation,
}: LiveTrackingMapProps) {
  const { isConnected, driverLocations, trackDriver, stopTracking } = useLocationTracking();
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Record<string, google.maps.Marker>>({});

  // Start tracking when component mounts
  useEffect(() => {
    if (isConnected) {
      trackDriver(orderId, driverId);
    }

    return () => {
      stopTracking(orderId);
    };
  }, [isConnected, orderId, driverId, trackDriver, stopTracking]);

  // Update map when driver location changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const driverLocation = driverLocations.get(driverId);
    if (!driverLocation) return;

    const map = mapRef.current;
    const { latitude, longitude } = driverLocation;

    // Remove old driver marker
    if (markersRef.current["driver"]) {
      markersRef.current["driver"].setMap(null);
    }

    // Add new driver marker
    const driverMarker = new google.maps.Marker({
      position: { lat: latitude, lng: longitude },
      map: map,
      title: "موقع السائق",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: "#FF6B35",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2,
      } as google.maps.Symbol,
    });

    markersRef.current["driver"] = driverMarker;

    // Center map on driver
    map.setCenter({ lat: latitude, lng: longitude });
  }, [driverLocations, driverId, mapReady]);

  // Add pickup and delivery markers
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const map = mapRef.current;

    // Pickup marker
    if (markersRef.current["pickup"]) {
      markersRef.current["pickup"].setMap(null);
    }
    const pickupMarker = new google.maps.Marker({
      position: { lat: pickupLocation.latitude, lng: pickupLocation.longitude },
      map: map,
      title: "نقطة الاستلام",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#4CAF50",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2,
      } as google.maps.Symbol,
    });
    markersRef.current["pickup"] = pickupMarker;

    // Delivery marker
    if (markersRef.current["delivery"]) {
      markersRef.current["delivery"].setMap(null);
    }
    const deliveryMarker = new google.maps.Marker({
      position: { lat: deliveryLocation.latitude, lng: deliveryLocation.longitude },
      map: map,
      title: "نقطة التسليم",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#2196F3",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2,
      } as google.maps.Symbol,
    });
    markersRef.current["delivery"] = deliveryMarker;
  }, [mapReady, pickupLocation, deliveryLocation]);

  const driverLocation = driverLocations.get(driverId);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">تتبع السائق الحي</h3>
          <div className="flex items-center gap-2">
            {!isConnected && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                جاري الاتصال...
              </Badge>
            )}
            {isConnected && (
              <Badge variant="default" className="bg-green-600">
                متصل
              </Badge>
            )}
          </div>
        </div>

        <div className="bg-gray-100 rounded-lg overflow-hidden h-96">
          <MapView
            onMapReady={(map: google.maps.Map) => {
              mapRef.current = map;
              setMapReady(true);
              // Set initial center
              map.setCenter({
                lat: pickupLocation.latitude,
                lng: pickupLocation.longitude,
              });
              map.setZoom(15);
            }}
          />
        </div>
      </Card>

      {driverLocation && (
        <Card className="p-4">
          <h4 className="font-semibold mb-2">معلومات السائق الحالية</h4>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-gray-600">الموقع:</span>{" "}
              <span className="font-medium">
                {driverLocation.latitude.toFixed(4)}, {driverLocation.longitude.toFixed(4)}
              </span>
            </p>
            <p>
              <span className="text-gray-600">آخر تحديث:</span>{" "}
              <span className="font-medium">
                {new Date(driverLocation.updatedAt).toLocaleTimeString("ar-EG")}
              </span>
            </p>
            <p>
              <span className="text-gray-600">الحالة:</span>{" "}
              <span className="font-medium">
                {driverLocation.isAvailable ? "متاح" : "مشغول"}
              </span>
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
