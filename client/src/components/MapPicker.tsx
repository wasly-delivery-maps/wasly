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

  const handleSearch = useCallback(async () => {
    if (!searchValue.trim() || !mapRef.current) {
      toast.error("يرجى كتابة عنوان للبحث");
      return;
    }

    try {
      // استخدام Photon API (المرتبطة ببيانات Maps.me/OpenStreetMap) للبحث
      // Photon تتميز بسرعة البحث ودعمها لبيانات الخرائط المفتوحة التي يستخدمها Maps.me
      let query = searchValue;
      if (!query.toLowerCase().includes("مصر") && !query.toLowerCase().includes("egypt")) {
        query += " مصر";
      }

      // تحديد نطاق البحث حول مصر لزيادة الدقة
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=ar`
      );

      const data = await response.json();
      let results = data.features;

      if (!results || results.length === 0) {
        // محاولة ثانية بدون إضافات إذا فشل البحث الأول
        const fallbackResponse = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(searchValue)}&limit=5&lang=ar`
        );
        const fallbackData = await fallbackResponse.json();
        results = fallbackData.features;
      }

      if (!results || results.length === 0) {
        toast.error("لم يتم العثور على الموقع. حاول كتابة اسم المكان أو الشارع بوضوح.");
        return;
      }

      // اختيار النتيجة الأكثر صلة
      const bestMatch = results[0];
      const [lng, lat] = bestMatch.geometry.coordinates;
      
      // بناء العنوان من خصائص النتيجة
      const props = bestMatch.properties;
      const addressParts = [
        props.name,
        props.street,
        props.district,
        props.city,
        props.state
      ].filter(Boolean);
      
      const address = addressParts.length > 0 ? addressParts.join(", ") : searchValue;

      // تحديث خريطة جوجل بناءً على نتائج البحث
      if (mapRef.current) {
        mapRef.current.setCenter({ lat, lng });
        mapRef.current.setZoom(17);
      }

      // إزالة marker القديم من خريطة جوجل
      if (markerRef.current) {
        markerRef.current.map = null;
      }

      // إضافة marker جديد على خريطة جوجل
      try {
        if (mapRef.current && window.google && window.google.maps) {
          markerRef.current = new google.maps.marker.AdvancedMarkerElement({
            map: mapRef.current,
            position: { lat, lng },
            title: address,
          });
        }
      } catch (error) {
        console.error("[Maps] Error adding marker to Google Map:", error);
      }

      // استدعاء callback لتحديث بيانات الطلب
      const locationData: LocationData = {
        address,
        latitude: lat,
        longitude: lng,
      };
      onLocationSelect(locationData);
      toast.success("تم العثور على الموقع بنجاح");
    } catch (error) {
      console.error("Search error (Photon/Maps.me):", error);
      toast.error("فشل البحث عن الموقع. يرجى المحاولة مرة أخرى.");
    }
  }, [searchValue, onLocationSelect, mapRef]);

  // تهيئة Geocoder عند تحميل الخريطة
  useEffect(() => {
    if (mapRef.current && !geocoderRef.current) {
      geocoderRef.current = new google.maps.Geocoder();
    }
  }, []);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // تحديث مركز الخريطة إلى الحي الأول بالعبور كمركز افتراضي للتطبيق في مصر
    map.setCenter({ lat: 30.1136, lng: 31.3925 });
    map.setZoom(15);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // إزالة listener القديم إن وجد
    if (listenerRef.current) {
      google.maps.event.removeListener(listenerRef.current);
    }

    // إضافة listener جديد لحدث الضغط على الخريطة
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

  // إعداد Google Places Autocomplete كخيار إضافي مدمج مع الخريطة
  useEffect(() => {
    if (!searchInputRef.current || !mapRef.current) return;

    try {
      autocompleteRef.current = new google.maps.places.Autocomplete(
        searchInputRef.current,
        {
          componentRestrictions: { country: "eg" },
          types: ["geocode", "establishment"],
          fields: ["geometry", "formatted_address", "name"],
        }
      );

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place || !place.geometry || !place.geometry.location) {
          return;
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || place.name || "موقع محدد";

        mapRef.current?.setCenter({ lat, lng });
        mapRef.current?.setZoom(17);

        if (markerRef.current) {
          markerRef.current.map = null;
        }

        try {
          markerRef.current = new google.maps.marker.AdvancedMarkerElement({
            map: mapRef.current,
            position: { lat, lng },
            title: address,
          });
        } catch (error) {
          console.error("خطأ في إضافة marker:", error);
        }

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
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onLocationSelect]);

  useEffect(() => {
    return () => {
      if (listenerRef.current) {
        google.maps.event.removeListener(listenerRef.current);
      }
      if (markerRef.current) {
        markerRef.current.map = null;
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">{title}</p>
      </div>
      
      <MapView
        initialCenter={{ lat: 30.1145, lng: 31.3850 }}
        initialZoom={16}
        onMapReady={handleMapReady}
        className="h-[400px] rounded-lg border border-border"
      />

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="ابحث عن عنوان أو مكان (قاعدة بيانات Maps.me)..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            className="w-full text-right bg-white shadow-sm border-slate-200 focus:border-orange-500 focus:ring-orange-200"
            dir="rtl"
          />
          <Button
            onClick={handleSearch}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 shadow-md transition-all active:scale-95"
            size="sm"
          >
            <Search className="w-4 h-4 ml-2" />
            بحث
          </Button>
        </div>
        <p className="text-[10px] text-slate-400 text-right px-1">
          البحث الآن مدعوم ببيانات خرائط مصر التفصيلية (Maps.me)
        </p>
      </div>
    </div>
  );
}
