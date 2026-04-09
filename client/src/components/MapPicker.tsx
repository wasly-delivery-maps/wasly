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

    if (!geocoderRef.current) {
      geocoderRef.current = new google.maps.Geocoder();
    }

    try {
      const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoderRef.current?.geocode(
          { address: searchValue, componentRestrictions: { country: "EG" } },
          (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results) {
              resolve(results);
            } else {
              reject(new Error("لم يتم العثور على الموقع"));
            }
          }
        );
      });

      if (results.length === 0) {
        toast.error("لم يتم العثور على الموقع");
        return;
      }

      const location = results[0];
      const lat = location.geometry.location.lat();
      const lng = location.geometry.location.lng();
      const address = location.formatted_address;

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
        } else {
          console.warn("[Maps] Google Maps not available for marker creation");
        }
      } catch (error) {
        console.error("[Maps] خطأ في إضافة marker:", error);
      }

      // استدعاء callback
      const locationData: LocationData = {
        address,
        latitude: lat,
        longitude: lng,
      };
      onLocationSelect(locationData);
      toast.success("تم البحث عن الموقع بنجاح: " + address);
    } catch (error) {
      console.error("خطأ في البحث:", error);
      toast.error("فشل البحث عن الموقع");
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

    // إزالة listener القديم إن وجد
    if (listenerRef.current) {
      google.maps.event.removeListener(listenerRef.current);
    }

    // إضافة listener جديد لحدث الضغط على الخريطة
    listenerRef.current = map.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) {
        console.error("لم يتم الحصول على الإحداثيات");
        return;
      }

      const lat = event.latLng.lat();
      const lng = event.latLng.lng();

      console.log("تم الضغط على الخريطة:", { lat, lng });

      // إزالة marker القديم
      if (markerRef.current) {
        markerRef.current.map = null;
      }

      // إضافة marker جديد باستخدام AdvancedMarkerElement
      try {
        markerRef.current = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat, lng },
          title: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        });
        console.log("تم إضافة marker بنجاح");
      } catch (error) {
        console.error("خطأ في إضافة marker:", error);
        toast.error("فشل في إضافة marker على الخريطة");
        return;
      }

      // تحديث مركز الخريطة
      map.setCenter({ lat, lng });

      // إنشء بيانات الموقع
      const location: LocationData = {
        address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        latitude: lat,
        longitude: lng,
      };

      // استدعاء callback مع البيانات المحددة
      onLocationSelect(location);
      toast.success("تم اختيار الموقع بنجاح");
    });
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
      
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="ابحث عن عنوان أو مكان..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            className="w-full text-right"
            dir="rtl"
          />
          {searchValue.trim() && (
            <Button
              onClick={handleSearch}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4"
              size="sm"
            >
              <Search className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      
      <MapView
        initialCenter={{ lat: 30.1145, lng: 31.3850 }} // Al-Obour First District (الحي الأول - العبور) coordinates
        initialZoom={16}
        onMapReady={handleMapReady}
        className="h-[400px] rounded-lg border border-border"
      />
    </div>
  );
}
