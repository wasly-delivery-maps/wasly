import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { MapPin, Phone, Navigation, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface OrderTrackingProps {
  orderId: number;
  driverId: number;
  driverPhone?: string;
  driverName?: string;
  pickupLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
  deliveryLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };
}

/**
 * OrderTracking Component
 * Displays real-time driver location on map for customers
 * Updates every 5-10 seconds via tRPC polling
 */
export function OrderTracking({
  orderId,
  driverId,
  driverPhone,
  driverName,
  pickupLocation,
  deliveryLocation,
}: OrderTrackingProps) {
  const { user } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [polyline, setPolyline] = useState<google.maps.Polyline | null>(null);
  const [driverMarker, setDriverMarker] = useState<google.maps.Marker | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Polling for driver location
  const { data: driverLocation, isLoading: isLoadingLocation } = trpc.location.getDriverLocation.useQuery(
    { driverId },
    {
      refetchInterval: 10000, // Poll every 10 seconds
      enabled: user?.role === "customer",
    }
  );

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || isMapLoaded) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Google Maps API key not found");
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (!mapRef.current) return;

      const mapInstance = new google.maps.Map(mapRef.current, {
        zoom: 14,
        center: {
          lat: pickupLocation.latitude,
          lng: pickupLocation.longitude,
        },
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: false,
      });

      setMap(mapInstance);
      setIsMapLoaded(true);

      // Create pickup marker (green)
      const pickupMarker = new google.maps.Marker({
        position: {
          lat: pickupLocation.latitude,
          lng: pickupLocation.longitude,
        },
        map: mapInstance,
        title: "موقع الاستلام",
        icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
      });

      // Create delivery marker (red)
      const deliveryMarker = new google.maps.Marker({
        position: {
          lat: deliveryLocation.latitude,
          lng: deliveryLocation.longitude,
        },
        map: mapInstance,
        title: "موقع التسليم",
        icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
      });

      setMarkers([pickupMarker, deliveryMarker]);

      // Draw polyline
      const polylineInstance = new google.maps.Polyline({
        path: [
          {
            lat: pickupLocation.latitude,
            lng: pickupLocation.longitude,
          },
          {
            lat: deliveryLocation.latitude,
            lng: deliveryLocation.longitude,
          },
        ],
        geodesic: true,
        strokeColor: "#FF7A00",
        strokeOpacity: 0.7,
        strokeWeight: 3,
        map: mapInstance,
      });

      setPolyline(polylineInstance);
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [pickupLocation, deliveryLocation]);

  // Update driver marker when location changes
  useEffect(() => {
    if (!map || !driverLocation || !isMapLoaded) return;

    const driverPos = {
      lat: driverLocation.latitude || 0,
      lng: driverLocation.longitude || 0,
    };

    // Remove old driver marker
    if (driverMarker) {
      driverMarker.setMap(null);
    }

    // Create new driver marker (blue)
    const newDriverMarker = new google.maps.Marker({
      position: driverPos,
      map,
      title: "موقع السائق",
      icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    });

    setDriverMarker(newDriverMarker);

    // Calculate distance from driver to delivery
    if (driverLocation.latitude && driverLocation.longitude) {
      const dist = calculateDistance(
        driverLocation.latitude,
        driverLocation.longitude,
        deliveryLocation.latitude,
        deliveryLocation.longitude
      );
      setDistance(dist);
    }

    // Fit bounds to show all markers
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(
      new google.maps.LatLng(pickupLocation.latitude, pickupLocation.longitude)
    );
    bounds.extend(
      new google.maps.LatLng(deliveryLocation.latitude, deliveryLocation.longitude)
    );
    bounds.extend(driverPos);
    map.fitBounds(bounds);
  }, [driverLocation, map, isMapLoaded, driverMarker, pickupLocation, deliveryLocation]);

  const handleCallDriver = () => {
    if (driverPhone) {
      window.location.href = `tel:${driverPhone}`;
    }
  };

  const handleOpenInMaps = () => {
    if (driverLocation?.latitude && driverLocation?.longitude) {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${driverLocation.latitude},${driverLocation.longitude}`;
      window.open(mapsUrl, "_blank");
    }
  };

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div
        ref={mapRef}
        className="w-full h-96 rounded-lg border border-gray-200 shadow-md bg-gray-100"
      />

      {/* Driver Info Card */}
      {driverName && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Navigation className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{driverName}</p>
                <p className="text-sm text-gray-600">السائق</p>
              </div>
            </div>
            {driverPhone && (
              <Button
                onClick={handleCallDriver}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Phone className="h-4 w-4" />
                اتصال
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Location Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pickup Location */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-600 font-medium">موقع الاستلام</p>
              <p className="text-sm text-gray-900 mt-1">{pickupLocation.address}</p>
            </div>
          </div>
        </div>

        {/* Delivery Location */}
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-red-600 mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-600 font-medium">موقع التسليم</p>
              <p className="text-sm text-gray-900 mt-1">{deliveryLocation.address}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Driver Location Status */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          {isLoadingLocation ? (
            <Loader2 className="h-5 w-5 text-blue-600 mt-1 animate-spin flex-shrink-0" />
          ) : driverLocation?.latitude && driverLocation?.longitude ? (
            <Navigation className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-1 flex-shrink-0" />
          )}

          <div className="flex-1">
            <p className="text-sm text-gray-600 font-medium">موقع السائق الحالي</p>

            {isLoadingLocation ? (
              <p className="text-sm text-gray-900 mt-1">جاري تحديث الموقع...</p>
            ) : driverLocation?.latitude && driverLocation?.longitude ? (
              <>
                <p className="text-sm text-gray-900 mt-1">
                  الإحداثيات: {driverLocation.latitude.toFixed(4)},
                  {driverLocation.longitude.toFixed(4)}
                </p>
                {distance !== null && (
                  <p className="text-xs text-gray-600 mt-1">
                    المسافة إلى موقع التسليم: {distance.toFixed(1)} كم
                  </p>
                )}
                <Button
                  onClick={handleOpenInMaps}
                  variant="link"
                  size="sm"
                  className="mt-2 p-0 h-auto"
                >
                  فتح في خرائط جوجل →
                </Button>
              </>
            ) : (
              <p className="text-sm text-yellow-700 mt-1">الموقع غير متاح حالياً</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
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
