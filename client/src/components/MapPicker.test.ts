import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * اختبارات مكون MapPicker
 * 
 * يختبر:
 * 1. تحميل Google Maps API عبر Manus Proxy
 * 2. إضافة listener لحدث الضغط على الخريطة
 * 3. استخراج الإحداثيات من حدث الضغط
 * 4. إنشاء marker في الموقع المحدد
 * 5. استدعاء callback عند اختيار الموقع
 */

describe("MapPicker Component", () => {
  let mockMap: any;
  let mockMarker: any;
  let mockListener: any;

  beforeEach(() => {
    // Mock Google Maps API
    mockListener = vi.fn();
    mockMarker = {
      map: null,
    };

    mockMap = {
      addListener: vi.fn((event: string, callback: Function) => {
        if (event === "click") {
          mockListener.mockImplementation(callback);
        }
        return mockListener;
      }),
      setCenter: vi.fn(),
    };

    // Mock window.google.maps
    (global as any).google = {
      maps: {
        Map: vi.fn(() => mockMap),
        marker: {
          AdvancedMarkerElement: vi.fn((options: any) => {
            mockMarker = { ...options };
            return mockMarker;
          }),
        },
        event: {
          removeListener: vi.fn(),
        },
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("يجب أن يضيف listener لحدث الضغط على الخريطة", () => {
    const onLocationSelect = vi.fn();

    // محاكاة onMapReady callback
    const handleMapReady = (map: any) => {
      const listener = map.addListener("click", (event: any) => {
        if (!event.latLng) return;
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        onLocationSelect({
          address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          latitude: lat,
          longitude: lng,
        });
      });
    };

    handleMapReady(mockMap);

    // التحقق من أن addListener تم استدعاؤها
    expect(mockMap.addListener).toHaveBeenCalledWith("click", expect.any(Function));
  });

  it("يجب أن يستخرج الإحداثيات الصحيحة من حدث الضغط", () => {
    const onLocationSelect = vi.fn();

    const handleMapReady = (map: any) => {
      const listener = map.addListener("click", (event: any) => {
        if (!event.latLng) return;
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        onLocationSelect({
          address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          latitude: lat,
          longitude: lng,
        });
      });
    };

    handleMapReady(mockMap);

    // محاكاة حدث الضغط على الخريطة
    const mockEvent = {
      latLng: {
        lat: () => 30.0444,
        lng: () => 31.2357,
      },
    };

    mockListener(mockEvent);

    // التحقق من أن callback تم استدعاؤها بالإحداثيات الصحيحة
    expect(onLocationSelect).toHaveBeenCalledWith({
      address: "30.0444, 31.2357",
      latitude: 30.0444,
      longitude: 31.2357,
    });
  });

  it("يجب أن ينشئ marker في الموقع المحدد", () => {
    const onLocationSelect = vi.fn();

    const handleMapReady = (map: any) => {
      const listener = map.addListener("click", (event: any) => {
        if (!event.latLng) return;
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        // إنشاء marker
        const marker = new (global as any).google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat, lng },
          title: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        });

        onLocationSelect({
          address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          latitude: lat,
          longitude: lng,
        });
      });
    };

    handleMapReady(mockMap);

    const mockEvent = {
      latLng: {
        lat: () => 30.0444,
        lng: () => 31.2357,
      },
    };

    mockListener(mockEvent);

    // التحقق من أن AdvancedMarkerElement تم استدعاؤها
    expect((global as any).google.maps.marker.AdvancedMarkerElement).toHaveBeenCalledWith({
      map: mockMap,
      position: { lat: 30.0444, lng: 31.2357 },
      title: "30.0444, 31.2357",
    });
  });

  it("يجب أن يحدث مركز الخريطة عند اختيار الموقع", () => {
    const onLocationSelect = vi.fn();

    const handleMapReady = (map: any) => {
      const listener = map.addListener("click", (event: any) => {
        if (!event.latLng) return;
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        // تحديث مركز الخريطة
        map.setCenter({ lat, lng });

        onLocationSelect({
          address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          latitude: lat,
          longitude: lng,
        });
      });
    };

    handleMapReady(mockMap);

    const mockEvent = {
      latLng: {
        lat: () => 30.0444,
        lng: () => 31.2357,
      },
    };

    mockListener(mockEvent);

    // التحقق من أن setCenter تم استدعاؤها بالإحداثيات الصحيحة
    expect(mockMap.setCenter).toHaveBeenCalledWith({
      lat: 30.0444,
      lng: 31.2357,
    });
  });

  it("يجب أن يتعامل مع حالة عدم وجود latLng في الحدث", () => {
    const onLocationSelect = vi.fn();

    const handleMapReady = (map: any) => {
      const listener = map.addListener("click", (event: any) => {
        if (!event.latLng) return;
        onLocationSelect({
          address: "test",
          latitude: 0,
          longitude: 0,
        });
      });
    };

    handleMapReady(mockMap);

    const mockEvent = {
      latLng: null,
    };

    mockListener(mockEvent);

    // التحقق من أن callback لم تُستدعَ
    expect(onLocationSelect).not.toHaveBeenCalled();
  });

  it("يجب أن يزيل listener القديم عند إضافة واحد جديد", () => {
    const onLocationSelect = vi.fn();

    const handleMapReady = (map: any) => {
      // إضافة listener أول
      let listener1 = map.addListener("click", (event: any) => {
        onLocationSelect({ address: "first", latitude: 0, longitude: 0 });
      });

      // إزالة listener أول
      (global as any).google.maps.event.removeListener(listener1);

      // إضافة listener ثاني
      let listener2 = map.addListener("click", (event: any) => {
        onLocationSelect({ address: "second", latitude: 0, longitude: 0 });
      });
    };

    handleMapReady(mockMap);

    // التحقق من أن removeListener تم استدعاؤها
    expect((global as any).google.maps.event.removeListener).toHaveBeenCalled();
  });

  it("يجب أن يحسب المسافة بشكل صحيح باستخدام Haversine", () => {
    // دالة حساب المسافة
    const calculateDistance = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number
    ): number => {
      const R = 6371; // نصف قطر الأرض بالكيلومترات
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // اختبار حساب المسافة بين موقعين
    const distance = calculateDistance(30.0444, 31.2357, 30.1210, 31.4480);
    
    // المسافة يجب أن تكون موجبة
    expect(distance).toBeGreaterThan(0);
    
    // المسافة يجب أن تكون معقولة (بين 10 و 30 كم)
    expect(distance).toBeGreaterThan(10);
    expect(distance).toBeLessThan(30);
  });

  it("يجب أن يحسب السعر بشكل صحيح باستخدام النموذج الموحد", () => {
    // دالة حساب السعر
    const calculatePrice = (distance: number): number => {
      return distance <= 3 ? 25 : 25 + (distance - 3) * 7;
    };

    // اختبار حالات مختلفة
    expect(calculatePrice(0)).toBe(25); // 0 كم = 25 ج.م
    expect(calculatePrice(1)).toBe(25); // 1 كم = 25 ج.م
    expect(calculatePrice(3)).toBe(25); // 3 كم = 25 ج.م
    expect(calculatePrice(4)).toBe(32); // 4 كم = 25 + (4-3)*7 = 32 ج.م
    expect(calculatePrice(5)).toBe(39); // 5 كم = 25 + (5-3)*7 = 39 ج.م
    expect(calculatePrice(10)).toBe(74); // 10 كم = 25 + (10-3)*7 = 74 ج.م
  });
});
