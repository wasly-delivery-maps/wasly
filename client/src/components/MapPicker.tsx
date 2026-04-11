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

  // إعداد Google Places Autocomplete بكامل مميزاته
  useEffect(() => {
    if (!searchInputRef.current || !mapRef.current) return;

    try {
      // إعداد Autocomplete ليعمل كما في تطبيق خرائط جوجل
      autocompleteRef.current = new google.maps.places.Autocomplete(
        searchInputRef.current,
        {
          componentRestrictions: { country: "eg" }, // تحديد البحث لمصر لزيادة الدقة
          types: ["geocode", "establishment"], // البحث عن العناوين والمحلات التجارية
          fields: ["geometry", "formatted_address", "name", "place_id"],
        }
      );

      // ربط البحث بنطاق الخريطة المعروضة لنتائج أدق
      autocompleteRef.current.bindTo("bounds", mapRef.current);

      // عند اختيار مكان من الاقتراحات
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();
        
        if (!place || !place.geometry || !place.geometry.location) {
          // إذا لم يجد جوجل الموقع في الاقتراحات، نحاول البحث عنه يدوياً كـ Plus Code أو نص عادي
          handleManualSearch(searchInputRef.current?.value || "");
          return;
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || place.name || "موقع محدد";

        updateMapLocation(lat, lng, address);
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

  // دالة لتحديث الموقع على الخريطة والماركر
  const updateMapLocation = (lat: number, lng: number, address: string) => {
    if (mapRef.current) {
      mapRef.current.setCenter({ lat, lng });
      mapRef.current.setZoom(17);
    }

    if (markerRef.current) {
      markerRef.current.map = null;
    }

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

    setSearchValue(address);
    onLocationSelect({ address, latitude: lat, longitude: lng });
    toast.success("تم تحديد الموقع بنجاح");
  };

  // دالة للبحث اليدوي (لدعم Plus Codes والنصوص المباشرة)
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
      } else {
        toast.error("لم يتم العثور على الموقع، يرجى كتابة العنوان بدقة أو استخدام Plus Code");
      }
    });
  };

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

      if (!geocoderRef.current) {
        geocoderRef.current = new google.maps.Geocoder();
      }

      geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
        const address = (status === "OK" && results && results[0]) 
          ? results[0].formatted_address 
          : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        
        updateMapLocation(lat, lng, address);
      });
    });

    return () => {
      if (listenerRef.current) {
        google.maps.event.removeListener(listenerRef.current);
      }
    };
  }, [onLocationSelect]);

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
            placeholder="ابحث عن مكان، محل، أو Plus Code (مثل: 6FP9+CQV)..."
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
          🔍 البحث مدعوم بكامل مميزات خرائط جوجل (الأماكن، المحلات، والأكواد المختصرة)
        </p>
      </div>
    </div>
  );
}
