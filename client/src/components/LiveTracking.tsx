import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation } from "lucide-react";

interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

interface LiveTrackingProps {
  pickupLocation: Location;
  deliveryLocation: Location;
  driverLocation?: Location;
  estimatedTime?: number;
  distance?: number;
}

export function LiveTracking({
  pickupLocation,
  deliveryLocation,
  driverLocation,
  estimatedTime,
  distance,
}: LiveTrackingProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [polyline, setPolyline] = useState<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Google Maps API key not found");
      return;
    }

    // Load Google Maps script
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // Create map
      const mapInstance = new google.maps.Map(mapRef.current!, {
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

      // Create markers
      const pickupMarker = new google.maps.Marker({
        position: {
          lat: pickupLocation.latitude,
          lng: pickupLocation.longitude,
        },
        map: mapInstance,
        title: "موقع الاستلام",
        icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
      });

      const deliveryMarker = new google.maps.Marker({
        position: {
          lat: deliveryLocation.latitude,
          lng: deliveryLocation.longitude,
        },
        map: mapInstance,
        title: "موقع التسليم",
        icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
      });

      const newMarkers = [pickupMarker, deliveryMarker];

      // Add driver marker if available
      if (driverLocation) {
        const driverMarker = new google.maps.Marker({
          position: {
            lat: driverLocation.latitude,
            lng: driverLocation.longitude,
          },
          map: mapInstance,
          title: "موقع السائق",
          icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        });
        newMarkers.push(driverMarker);
      }

      setMarkers(newMarkers);

      // Draw polyline from pickup to delivery
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

      // Fit bounds to show all markers
      const bounds = new google.maps.LatLngBounds();
      newMarkers.forEach((marker) => {
        bounds.extend(marker.getPosition()!);
      });
      mapInstance.fitBounds(bounds);
    };

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [pickupLocation, deliveryLocation, driverLocation]);

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div
        ref={mapRef}
        className="w-full h-96 rounded-lg border border-gray-200 shadow-md"
      />

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* Estimated Time & Distance */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <Navigation className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-600 font-medium">الوقت المقدر</p>
              <p className="text-sm text-gray-900 mt-1">
                {estimatedTime ? `${estimatedTime} دقيقة` : "جاري الحساب"}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {distance ? `${distance.toFixed(1)} كم` : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Driver Location (if available) */}
      {driverLocation && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <Navigation className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-600 font-medium">موقع السائق الحالي</p>
              <p className="text-sm text-gray-900 mt-1">{driverLocation.address}</p>
              <p className="text-xs text-gray-600 mt-1">
                تحديث فوري: {new Date().toLocaleTimeString("ar-EG")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
