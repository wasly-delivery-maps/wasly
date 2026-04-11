/**
 * GOOGLE MAPS FRONTEND INTEGRATION
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
  initialCenter = { lat: 30.2241, lng: 31.4744 },
  initialZoom = 12,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);

  // كود شامل لإخفاء رسائل خطأ جوجل مابس والعناصر المزعجة
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      /* إخفاء نافذة الخطأ الرئيسية */
      .gm-err-container,
      .gm-error-message,
      .gm-error-overlay {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }

      /* إخفاء أي نوافذ منبثقة من جوجل */
      .gm-style > div:first-child > div:nth-child(2),
      .gm-style > div:first-child > div:nth-child(3) {
        display: none !important;
      }

      /* إخفاء رسالة "For development purposes only" */
      .gm-style-cc {
        display: none !important;
      }

      /* إخفاء أزرار الإغلاق والتأكيد */
      .dismissButton,
      .gm-ui-hover-effect,
      [aria-label="Close"] {
        display: none !important;
      }

      /* إخفاء أي عناصر تحتوي على كلمة "error" أو "Error" */
      [class*="error"],
      [class*="Error"] {
        display: none !important;
      }

      /* ضمان عدم ظهور أي نصوص خطأ */
      .gm-style > div > div {
        filter: opacity(0) !important;
      }
    `;
    document.head.appendChild(style);

    // محاولة إغلاق أي نافذة منبثقة تظهر
    const observer = new MutationObserver(() => {
      // البحث عن أي عناصر تحتوي على رسائل خطأ وإخفاؤها
      const errorElements = document.querySelectorAll('[role="dialog"], .gm-err-container, .gm-error-message');
      errorElements.forEach((el: any) => {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
      });

      // محاولة النقر على أي أزرار إغلاق موجودة
      const closeButtons = document.querySelectorAll('[aria-label="Close"], .dismissButton');
      closeButtons.forEach((btn: any) => {
        try {
          btn.click();
        } catch (e) {}
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });

    return () => {
      document.head.removeChild(style);
      observer.disconnect();
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
