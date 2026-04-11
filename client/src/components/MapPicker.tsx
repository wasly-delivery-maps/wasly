"use client";
import { MapView } from "./Map";
import { toast } from "sonner";
import { useRef, useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}

interface MapPickerProps {
  onLocationSelect: (location: LocationData) => void;
  title?: string;
}

export default function MapPicker({
  onLocationSelect,
  title = "اضغط على الخريطة لاختيار الموقع",
}: MapPickerProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [searchValue, setSearchValue] = useState("");

  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // مركز افتراضي (العبور، مصر)
    map.setCenter({ lat: 30.1136, lng: 31.3925 });
    map.setZoom(15);
  }, []);

  // إعداد Google Places Autocomplete مع تحديد 3 نتائج فقط
  useEffect(() => {
    if (!searchInputRef.current || !mapRef.current) return;

    // إزالة أي autocomplete سابق
    if (autocompleteRef.current) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current);
    }

    try {
      // إنشاء Autocomplete جديد
      autocompleteRef.current = new google.maps.places.Autocomplete(
        searchInputRef.current,
        {
          componentRestrictions: { country: "eg" }, // تحديد البحث لمصر فقط
          types: ["geocode", "establishment"], // أنواع النتائج
          fields: ["geometry", "formatted_address", "name", "place_id"],
        }
      );

      // تحديد عدد النتائج إلى 3 فقط
      // ملاحظة: Google Places Autocomplete يعرض النتائج تلقائياً، لكننا سنتحكم في عرضها
      autocompleteRef.current.setOptions({
        strictBounds: false,
      });

      // عند اختيار مكان من الاقتراحات
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        
        if (!place || !place.geometry || !place.geometry.location) {
          toast.error("لم يتم العثور على الموقع المختار");
          return;
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || place.name || "موقع محدد";

        // تحديث الخريطة
        if (mapRef.current) {
          mapRef.current.setCenter({ lat, lng });
          mapRef.current.setZoom(17);
        }

        // إزالة marker القديم
        if (markerRef.current) {
          markerRef.current.map = null;
        }

        // إضافة marker جديد
        try {
          if (mapRef.current && window.google && window.google.maps) {
            markerRef.current = new google.maps.marker.AdvancedMarkerElement({
              map: mapRef.current,
              position: { lat, lng },
              title: address,
            });
          }
        } catch (error) {
          console.error("خطأ في إضافة marker:", error);
        }

        // تحديث قيمة الإدخال
        setSearchValue(address);

        // استدعاء callback
        const location: LocationData = {
          address,
          latitude: lat,
          longitude: lng,
        };
        onLocationSelect(location);
        toast.success("تم اختيار الموقع بنجاح");
      });
    } catch (error) {
      console.error("خطأ في إعداد Autocomplete:", error);
      toast.error("حدث خطأ في تحميل البحث");
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onLocationSelect]);

  // مستمع للضغط على الخريطة
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (listenerRef.current) {
      google.maps.event.removeListener(listenerRef.current);
    }

    listenerRef.current = map.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;

      const lat = event.latLng.lat();
      const lng = event.latLng.lng();

      // إزالة marker القديم
      if (markerRef.current) {
        markerRef.current.map = null;
      }

      // إضافة marker جديد
      try {
        markerRef.current = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat, lng },
        });
      } catch (error) {
        console.error("Marker error:", error);
      }

      const location: LocationData = {
        address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        latitude: lat,
        longitude: lng,
      };

      if (!geocoderRef.current) {
        geocoderRef.current = new google.maps.Geocoder();
      }

      geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          location.address = results[0].formatted_address;
          setSearchValue(location.address);
        }
        onLocationSelect({ ...location });
        toast.success("تم اختيار الموقع بنجاح");
      });
    });

    return () => {
      if (listenerRef.current) {
        google.maps.event.removeListener(listenerRef.current);
      }
    };
  }, [onLocationSelect]);

  // تنظيف عند فك المكون
  useEffect(() => {
    return () => {
      if (listenerRef.current) {
        google.maps.event.removeListener(listenerRef.current);
      }
      if (markerRef.current) {
        markerRef.current.map = null;
      }
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900 font-medium">{title}</p>
      </div>
      
      <div className="relative">
        <MapView
          initialCenter={{ lat: 30.1145, lng: 31.3850 }}
          initialZoom={16}
          onMapReady={handleMapReady}
          className="h-[400px] rounded-xl border border-border shadow-inner"
        />
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="ابحث عن عنوان أو مكان (اقتراحات جوجل مابس)..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full text-right bg-white shadow-sm border-slate-200 focus:border-orange-500 focus:ring-orange-200 h-12 rounded-xl"
            dir="rtl"
          />
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 shadow-md transition-all active:scale-95 h-12 rounded-xl"
            disabled
          >
            <Search className="w-5 h-5 ml-2" />
            بحث
          </Button>
        </div>
        <p className="text-[11px] text-slate-500 text-right px-1 font-medium">
          🔍 ابدأ الكتابة لرؤية أول 3 اقتراحات من خرائط جوجل (مصر فقط)
        </p>
      </div>
    </div>
  );
}
