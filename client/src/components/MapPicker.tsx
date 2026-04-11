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
      // استخدام Nominatim API (OpenStreetMap) للبحث المجاني عن العناوين
      // يدعم البحث بالأسماء، العناوين، وأكواد Plus Codes
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchValue
        )}&countrycodes=eg&addressdetails=1&limit=1`,
        {
          headers: {
            'Accept-Language': 'ar,en',
            'User-Agent': 'WaslyDeliveryApp/1.0'
          }
        }
      );

      const results = await response.json();

      if (!results || results.length === 0) {
        toast.error("لم يتم العثور على الموقع. حاول كتابة اسم المكان بدقة.");
        return;
      }

      const location = results[0];
      const lat = parseFloat(location.lat);
      const lng = parseFloat(location.lon);
      const address = location.display_name;

      // تحديث خريطة جوجل بناءً على نتائج البحث المجانية
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
      console.error("Search error (Nominatim):", error);
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
    // تحديث مركز الخريطة إلى الحي الأول بالعبور
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
        console.log("[MapPicker] Location selected:", location);
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

  // إعداد Google Places Autocomplete
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

      // عند اختيار مكان من الاقتراحات
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place || !place.geometry || !place.geometry.location) {
          toast.error("لم يتم العثور على الموقع");
          return;
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || place.name || "موقع محدد";

        // تحديث الخريطة
        mapRef.current?.setCenter({ lat, lng });
        mapRef.current?.setZoom(17);

        // إزالة marker القديم
        if (markerRef.current) {
          markerRef.current.map = null;
        }

        // إضافة marker جديد
        try {
          markerRef.current = new google.maps.marker.AdvancedMarkerElement({
            map: mapRef.current,
            position: { lat, lng },
            title: address,
          });
        } catch (error) {
          console.error("خطأ في إضافة marker:", error);
        }

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
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
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
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">{title}</p>
      </div>
      
      <MapView
        initialCenter={{ lat: 30.1145, lng: 31.3850 }} // Al-Obour First District (الحي الأول - العبور) coordinates
        initialZoom={16}
        onMapReady={handleMapReady}
        className="h-[400px] rounded-lg border border-border"
      />

      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="ابحث عن عنوان، مكان، أو كود (مثل: 6FP9+CQV)..."
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
          يمكنك البحث باسم المحل، الشارع، أو نسخ كود الموقع من خرائط جوجل
        </p>
      </div>
    </div>
  );
}
