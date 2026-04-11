/**
 * GOOGLE MAPS FRONTEND INTEGRATION - ESSENTIAL GUIDE
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map; // Store to control map from parent anytime, google map itself is in charge of the re-rendering, not react state.
 * </MapView>
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_FRONTEND_FORGE_API_KEY;

function loadMapScript() {
  return new Promise(resolve => {
    if (window.google && window.google.maps) {
      resolve(null);
      return;
    }
    const script = document.createElement("script");
    const isProxy = !import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const baseUrl = isProxy 
      ? `${import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev"}/v1/maps/proxy/maps/api/js`
      : "https://maps.googleapis.com/maps/api/js";
    
    script.src = `${baseUrl}?key=${API_KEY}&v=quarterly&libraries=marker,places,geocoding,geometry,routes`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      if (window.google && window.google.maps) {
        console.log("[Maps] Google Maps API loaded successfully");
        resolve(null);
      } else {
        console.error("[Maps] Google object not found after script load");
        resolve(null);
      }
    };
    script.onerror = () => {
      console.error("[Maps] Failed to load Google Maps script");
      resolve(null);
    };
    document.head.appendChild(script);
  });
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 30.2241, lng: 31.4744 }, // Al-Obour, Egypt
  initialZoom = 12,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);

  // كود لإخفاء رسائل الخطأ الخاصة بجوجل مابس
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      /* إخفاء نافذة الخطأ المنبثقة من جوجل */
      .gm-err-container {
        display: none !important;
      }
      /* إخفاء تراكب "For development purposes only" */
      .gm-style > div:first-child > div:nth-child(2) {
        display: none !important;
      }
      .gm-style-cc {
        display: none !important;
      }
      /* إخفاء زر "OK" في رسالة الخطأ */
      .dismissButton {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    // محاولة إغلاق أي نافذة منبثقة تظهر تلقائياً
    const interval = setInterval(() => {
      const dismissButtons = document.querySelectorAll('.dismissButton');
      dismissButtons.forEach((btn: any) => btn.click());
    }, 1000);

    return () => {
      document.head.removeChild(style);
      clearInterval(interval);
    };
  }, []);

  const init = usePersistFn(async () => {
    await loadMapScript();
    if (!mapContainer.current) return;
    
    if (!map.current && window.google && window.google.maps) {
      map.current = new window.google.maps.Map(mapContainer.current, {
        zoom: initialZoom,
        center: initialCenter,
        mapTypeControl: false,
        fullscreenControl: false,
        zoomControl: true,
        streetViewControl: false,
        mapId: "DEMO_MAP_ID",
      });
      if (onMapReady) {
        onMapReady(map.current);
      }
    }
  });

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div ref={mapContainer} className={cn("w-full h-[500px] rounded-lg overflow-hidden border border-border relative", className)} />
  );
}
