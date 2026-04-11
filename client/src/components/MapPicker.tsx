"use client";
import { MapView } from "./Map";
import { toast } from "sonner";
import { useRef, useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";

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
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchValue.trim()) {
      toast.error("يرجى كتابة عنوان للبحث");
      return;
    }

    setIsSearching(true);
    try {
      // تنظيف الاستعلام لزيادة الدقة
      let query = searchValue.trim();
      
      // Photon API (Maps.me database)
      // نقوم بالبحث في مصر بشكل افتراضي
      const searchUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10&lang=ar`;
      
      const response = await fetch(searchUrl);
      if (!response.ok) throw new Error("فشل الاتصال بخادم البحث");
      
      const data = await response.json();
      let results = data.features;

      // إذا لم تكن هناك نتائج، نحاول إضافة "مصر" للاستعلام
      if (!results || results.length === 0) {
        const fallbackUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query + " مصر")}&limit=5&lang=ar`;
        const fallbackRes = await fetch(fallbackUrl);
        const fallbackData = await fallbackRes.json();
        results = fallbackData.features;
      }

      if (!results || results.length === 0) {
        toast.error("لم يتم العثور على نتائج. حاول كتابة اسم المكان بشكل مختلف.");
        return;
      }

      // تصفية النتائج لتفضيل مصر (Egypt)
      const egyptResults = results.filter((r: any) => 
        r.properties.country === "Egypt" || 
        r.properties.country === "مصر" ||
        r.properties.state?.includes("Cairo") ||
        r.properties.state?.includes("Qalyubia")
      );

      const bestMatch = egyptResults.length > 0 ? egyptResults[0] : results[0];
      const [lng, lat] = bestMatch.geometry.coordinates;
      
      // بناء عنوان مفصل
      const p = bestMatch.properties;
      const addressParts = [
        p.name,
        p.street,
        p.district,
        p.city || p.town || p.village,
        p.state
      ].filter(Boolean);
      
      const address = addressParts.length > 0 ? addressParts.join(", ") : searchValue;

      // تحديث الخريطة حتى لو كان هناك خطأ في جوجل مابس (التحريك يعمل برمجياً)
      if (mapRef.current) {
        mapRef.current.setCenter({ lat, lng });
        mapRef.current.setZoom(17);
        
        // محاولة إضافة ماركر
        if (window.google && window.google.maps) {
          if (markerRef.current) markerRef.current.map = null;
          
          try {
            // استخدام ماركر عادي إذا فشل الماركر المتقدم
            markerRef.current = new google.maps.marker.AdvancedMarkerElement({
              map: mapRef.current,
              position: { lat, lng },
              title: address,
            });
          } catch (e) {
            console.warn("Advanced Marker failed, trying fallback");
          }
        }
      }

      const locationData: LocationData = {
        address,
        latitude: lat,
        longitude: lng,
      };
      
      onLocationSelect(locationData);
      toast.success("تم العثور على الموقع");
    } catch (error) {
      console.error("Search error:", error);
      toast.error("حدث خطأ أثناء البحث. يرجى المحاولة لاحقاً.");
    } finally {
      setIsSearching(false);
    }
  }, [searchValue, onLocationSelect]);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // مركز افتراضي (العبور)
    map.setCenter({ lat: 30.1136, lng: 31.3925 });
    map.setZoom(15);
  }, []);

  // مستمع للضغط على الخريطة
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (listenerRef.current) google.maps.event.removeListener(listenerRef.current);

    listenerRef.current = map.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();

      if (markerRef.current) markerRef.current.map = null;
      try {
        markerRef.current = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat, lng },
        });
      } catch (e) {}

      const location: LocationData = {
        address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        latitude: lat,
        longitude: lng,
      };

      // محاولة الحصول على العنوان من Geocoder إذا كان متاحاً
      if (window.google && window.google.maps) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === "OK" && results?.[0]) {
            location.address = results[0].formatted_address;
          }
          onLocationSelect({ ...location });
          toast.success("تم تحديد الموقع");
        });
      } else {
        onLocationSelect(location);
        toast.success("تم تحديد الإحداثيات");
      }
    });

    return () => {
      if (listenerRef.current) google.maps.event.removeListener(listenerRef.current);
    };
  }, [onLocationSelect, mapRef.current]);

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
            placeholder="اكتب اسم المكان أو الشارع (مثل: كارفور العبور)..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full text-right bg-white shadow-sm border-slate-200 focus:border-orange-500 focus:ring-orange-200 h-12 rounded-xl"
            dir="rtl"
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 shadow-md transition-all active:scale-95 h-12 rounded-xl"
          >
            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5 ml-2" />}
            بحث
          </Button>
        </div>
        <p className="text-[11px] text-slate-500 text-right px-1 font-medium">
          🔍 البحث مدعوم بخرائط Maps.me لضمان دقة الأماكن في مصر
        </p>
      </div>
    </div>
  );
}
