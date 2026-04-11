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

  // دالة تحديث الموقع بناءً على المنطق المرجعي (AdvancedMarkerElement + setCenter)
  const updateMapLocation = useCallback((lat: number, lng: number, address: string) => {
    if (!mapRef.current) return;

    // 1. تحديث مركز الخريطة كما في الكود المرجعي (السطر 169)
    mapRef.current.setCenter({ lat, lng });
    mapRef.current.setZoom(17);

    // 2. إزالة الماركر القديم
    if (markerRef.current) {
      markerRef.current.map = null;
    }

    // 3. إضافة ماركر جديد باستخدام AdvancedMarkerElement كما في المرجع (الأسطر 126-130)
    try {
      if (window.google && window.google.maps && window.google.maps.marker) {
        markerRef.current = new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current,
          position: { lat, lng },
          title: address,
        });
      }
    } catch (error) {
      console.error("خطأ في إضافة marker:", error);
    }

    // 4. تحديث حالة البحث واستدعاء الـ callback
    setSearchValue(address);
    onLocationSelect({ address, latitude: lat, longitude: lng });
  }, [onLocationSelect]);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // الموقع الافتراضي (العبور، مصر)
    map.setCenter({ lat: 30.1136, lng: 31.3925 });
    map.setZoom(15);
  }, []);

  // تفعيل Google Places Autocomplete بكامل مميزاته (كما في تطبيق جوجل ماب)
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

      // ربط الاقتراحات بنطاق الخريطة لنتائج أدق
      autocompleteRef.current.bindTo("bounds", mapRef.current);

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        
        if (!place || !place.geometry || !place.geometry.location) {
          // محاولة البحث اليدوي إذا لم يتم اختيار اقتراح (لدعم Plus Codes)
          const query = searchInputRef.current?.value || "";
          if (query) handleManualSearch(query);
          return;
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || place.name || "موقع محدد";

        updateMapLocation(lat, lng, address);
        toast.success("تم تحديد الموقع بنجاح");
      });
    } catch (error) {
      console.error("Autocomplete error:", error);
    }

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [updateMapLocation]);

  // دالة البحث اليدوي لدعم Plus Codes والنصوص المباشرة
  const handleManualSearch = async (query: string) => {
    if (!query.trim()) return;

    if (!geocoderRef.current) {
      geocoderRef.current = new google.maps.Geocoder();
    }

    geocoderRef.current.geocode({ address: query, componentRestrictions: { country: 'eg' } }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const lat = results[0].geometry.location.lat();
        const lng = results[0].geometry.location.lng();
        const address = results[0].formatted_address;
        updateMapLocation(lat, lng, address);
        toast.success("تم العثور على الموقع");
      } else {
        toast.error("لم يتم العثور على الموقع، يرجى التأكد من العنوان");
      }
    });
  };

  // مستمع للضغط على الخريطة كما في الكود المرجعي (الأسطر 62-71)
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

      if (!geocoderRef.current) {
        geocoderRef.current = new google.maps.Geocoder();
      }

      geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
        const address = (status === "OK" && results && results[0]) 
          ? results[0].formatted_address 
          : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        
        updateMapLocation(lat, lng, address);
        toast.success("تم اختيار الموقع");
      });
    });

    return () => {
      if (listenerRef.current) {
        google.maps.event.removeListener(listenerRef.current);
      }
    };
  }, [updateMapLocation]);

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
            placeholder="ابحث عن مكان، محل، أو Plus Code..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleManualSearch(searchValue);
              }
            }}
            className="w-full text-right bg-white shadow-sm border-slate-200 focus:border-orange-500 focus:ring-orange-200 h-12 rounded-xl"
            dir="rtl"
          />
          <Button
            onClick={() => handleManualSearch(searchValue)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 shadow-md transition-all active:scale-95 h-12 rounded-xl"
          >
            <Search className="w-5 h-5 ml-2" />
            بحث
          </Button>
        </div>
        <p className="text-[11px] text-slate-500 text-right px-1 font-medium">
          🔍 البحث مدعوم بكامل مميزات خرائط جوجل كما في تطبيقك الأصلي
        </p>
      </div>
    </div>
  );
}
