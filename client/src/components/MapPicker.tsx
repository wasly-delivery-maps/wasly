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

interface PhotonResult {
  properties: {
    name: string;
    address?: string;
    city?: string;
    country?: string;
  };
  geometry: {
    coordinates: [number, number];
  };
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
  const [suggestions, setSuggestions] = useState<PhotonResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // الإحداثيات الأساسية للعبور والقاهرة
  const OBOUR_CENTER = { lat: 30.1136, lng: 31.3925 };
  const CAIRO_CENTER = { lat: 30.0444, lng: 31.2357 };

  // البحث عبر Photon API (Maps.me) مع تركيز على العبور والقاهرة
  const searchPhoton = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 1) {
      setSuggestions([]);
      return;
    }

    try {
      // البحث مع تركيز على العبور (lon, lat)
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lon=${OBOUR_CENTER.lng}&lat=${OBOUR_CENTER.lat}&limit=10&lang=ar`
      );

      if (!response.ok) throw new Error("فشل البحث");

      const data = await response.json();
      const results = data.features || [];
      
      // ترتيب النتائج: الأقرب للعبور أولاً
      const sorted = results.sort((a: PhotonResult, b: PhotonResult) => {
        const distA = Math.abs(a.geometry.coordinates[0] - OBOUR_CENTER.lng) + 
                      Math.abs(a.geometry.coordinates[1] - OBOUR_CENTER.lat);
        const distB = Math.abs(b.geometry.coordinates[0] - OBOUR_CENTER.lng) + 
                      Math.abs(b.geometry.coordinates[1] - OBOUR_CENTER.lat);
        return distA - distB;
      });

      setSuggestions(sorted.slice(0, 8)); // عرض أول 8 نتائج
      setShowSuggestions(true);
    } catch (error) {
      console.error("[Photon] خطأ في البحث:", error);
      setSuggestions([]);
    }
  }, []);

  // معالجة تغيير النص في خانة البحث
  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);
      if (value.trim()) {
        searchPhoton(value);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    },
    [searchPhoton]
  );

  // تحديث الخريطة والموقع
  const updateMapLocation = useCallback(
    (lat: number, lng: number, address: string) => {
      if (!mapRef.current) return;

      console.log("[Map] تحديث الموقع:", { lat, lng, address });

      // تحديث مركز الخريطة
      mapRef.current.setCenter({ lat, lng });
      mapRef.current.setZoom(17);

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
        console.error("[Marker] خطأ في إضافة marker:", error);
      }

      // تحديث حالة البحث
      setSearchValue(address);
      setSuggestions([]);
      setShowSuggestions(false);

      // استدعاء callback
      const locationData: LocationData = {
        address,
        latitude: lat,
        longitude: lng,
      };
      onLocationSelect(locationData);
      toast.success("تم اختيار الموقع: " + address);
    },
    [onLocationSelect]
  );

  // البحث اليدوي
  const handleSearch = useCallback(async () => {
    if (!searchValue.trim() || !mapRef.current) {
      toast.error("يرجى كتابة عنوان للبحث");
      return;
    }

    setIsSearching(true);

    try {
      // البحث عبر Photon API
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(searchValue)}&lon=${OBOUR_CENTER.lng}&lat=${OBOUR_CENTER.lat}&limit=1&lang=ar`
      );

      if (!response.ok) throw new Error("فشل البحث");

      const data = await response.json();
      const results = data.features || [];

      if (results.length === 0) {
        toast.error("لم يتم العثور على الموقع");
        setIsSearching(false);
        return;
      }

      const result = results[0];
      const [lng, lat] = result.geometry.coordinates;
      const address = result.properties.name || "موقع محدد";

      updateMapLocation(lat, lng, address);
    } catch (error) {
      console.error("[Search] خطأ في البحث:", error);
      toast.error("فشل البحث عن الموقع");
    } finally {
      setIsSearching(false);
    }
  }, [searchValue, updateMapLocation]);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    console.log("[Map] تم تحميل الخريطة بنجاح");

    // تحديث مركز الخريطة إلى الحي الأول بالعبور
    map.setCenter(OBOUR_CENTER);
    map.setZoom(15);

    // إزالة listener القديم إن وجد
    if (listenerRef.current) {
      google.maps.event.removeListener(listenerRef.current);
    }

    // إضافة listener جديد لحدث الضغط على الخريطة
    listenerRef.current = map.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) {
        console.error("[Map] لم يتم الحصول على الإحداثيات");
        return;
      }

      const lat = event.latLng.lat();
      const lng = event.latLng.lng();

      console.log("[Map Click] تم الضغط على الخريطة:", { lat, lng });

      // الحصول على العنوان من الإحداثيات (Reverse Geocoding)
      if (!geocoderRef.current) {
        geocoderRef.current = new google.maps.Geocoder();
      }

      geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
        const address =
          status === google.maps.GeocoderStatus.OK && results && results[0]
            ? results[0].formatted_address
            : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        updateMapLocation(lat, lng, address);
      });
    });
  }, []);

  // معالجة اختيار اقتراح
  const handleSelectSuggestion = useCallback(
    (result: PhotonResult) => {
      const [lng, lat] = result.geometry.coordinates;
      const address = result.properties.name || "موقع محدد";

      updateMapLocation(lat, lng, address);
    },
    [updateMapLocation]
  );

  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">{title}</p>
      </div>

      <MapView
        initialCenter={OBOUR_CENTER}
        initialZoom={15}
        onMapReady={handleMapReady}
        className="h-[400px] rounded-lg border border-border"
      />

      <div className="space-y-3">
        <div className="relative">
          <div className="flex gap-2">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="ابحث عن عنوان أو مكان..."
              value={searchValue}
              onChange={handleSearchInputChange}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              className="w-full text-right"
              dir="rtl"
              disabled={isSearching}
            />
            {searchValue.trim() && (
              <Button
                onClick={handleSearch}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4"
                size="sm"
                disabled={isSearching}
              >
                <Search className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* قائمة الاقتراحات */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
              {suggestions.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectSuggestion(result)}
                  className="w-full text-right px-4 py-3 hover:bg-orange-50 border-b last:border-b-0 transition-colors"
                >
                  <div className="font-semibold text-sm text-gray-900">
                    {result.properties.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {result.properties.city && `${result.properties.city}, `}
                    {result.properties.address}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 text-right px-1">
          🗺️ البحث يعتمد على بيانات Maps.me (مجاني وموثوق) مع تركيز على العبور والقاهرة
        </p>
      </div>
    </div>
  );
}
