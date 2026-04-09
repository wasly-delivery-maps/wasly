import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Phone, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DriverLocation {
  driverId: number;
  driverName: string;
  phone: string;
  rating: number;
  latitude: number;
  longitude: number;
  vehicleNumber: string;
}

interface DriverTrackerProps {
  driver: DriverLocation;
  pickupLocation?: { latitude: number; longitude: number };
  deliveryLocation?: { latitude: number; longitude: number };
}

export default function DriverTracker({
  driver,
  pickupLocation,
  deliveryLocation,
}: DriverTrackerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [driverMarker, setDriverMarker] = useState<google.maps.Marker | null>(null);
  const [pickupMarker, setPickupMarker] = useState<google.maps.Marker | null>(null);
  const [deliveryMarker, setDeliveryMarker] = useState<google.maps.Marker | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  // تحميل Google Maps API
  useEffect(() => {
    if (!mapRef.current) return;

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    }&libraries=geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      const mapInstance = new google.maps.Map(mapRef.current!, {
        zoom: 14,
        center: {
          lat: driver.latitude,
          lng: driver.longitude,
        },
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: false,
      });

      setMap(mapInstance);

      // إضافة marker للسائق
      const driverMarkerInstance = new google.maps.Marker({
        position: {
          lat: driver.latitude,
          lng: driver.longitude,
        },
        map: mapInstance,
        title: `السائق: ${driver.driverName}`,
        icon: "http://maps.google.com/mapfiles/ms/icons/orange-dot.png",
      });
      setDriverMarker(driverMarkerInstance);

      // إضافة marker لموقع الاستلام
      if (pickupLocation) {
        const pickupMarkerInstance = new google.maps.Marker({
          position: {
            lat: pickupLocation.latitude,
            lng: pickupLocation.longitude,
          },
          map: mapInstance,
          title: "موقع الاستلام",
          icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
        });
        setPickupMarker(pickupMarkerInstance);
      }

      // إضافة marker لموقع التسليم
      if (deliveryLocation) {
        const deliveryMarkerInstance = new google.maps.Marker({
          position: {
            lat: deliveryLocation.latitude,
            lng: deliveryLocation.longitude,
          },
          map: mapInstance,
          title: "موقع التسليم",
          icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
        });
        setDeliveryMarker(deliveryMarkerInstance);
      }

      // حساب المسافة بين السائق والعميل
      if (pickupLocation) {
        const driverPos = new google.maps.LatLng(driver.latitude, driver.longitude);
        const pickupPos = new google.maps.LatLng(
          pickupLocation.latitude,
          pickupLocation.longitude
        );
        const distanceInMeters = google.maps.geometry.spherical.computeDistanceBetween(
          driverPos,
          pickupPos
        );
        const distanceInKm = (distanceInMeters / 1000).toFixed(2);
        setDistance(parseFloat(distanceInKm));
      }
    };

    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [driver, pickupLocation, deliveryLocation]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          تتبع السائق
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Driver Info */}
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-orange-900">{driver.driverName}</p>
              <p className="text-sm text-orange-700">رقم المركبة: {driver.vehicleNumber}</p>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{driver.rating.toFixed(1)}</span>
            </div>
          </div>

          {/* Contact Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => window.location.href = `tel:${driver.phone}`}
          >
            <Phone className="h-4 w-4 mr-2" />
            اتصل بالسائق
          </Button>

          {/* Distance Info */}
          {distance !== null && (
            <div className="p-3 bg-white border border-orange-100 rounded">
              <p className="text-sm text-muted-foreground">المسافة المتبقية</p>
              <p className="text-lg font-semibold text-orange-600">{distance} كم</p>
            </div>
          )}
        </div>

        {/* Map Container */}
        <div
          ref={mapRef}
          className="w-full h-96 rounded-lg border border-border shadow-sm"
        />

        {/* Legend */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>السائق</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>الاستلام</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>التسليم</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
