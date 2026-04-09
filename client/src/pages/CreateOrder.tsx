import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import MapPicker from "@/components/MapPicker";
import { calculateOrderPrice, formatPrice } from "@shared/pricing";

interface LocationData {
  address: string;
  latitude: number;
  longitude: number;
}

export default function CreateOrder() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [pickupLocation, setPickupLocation] = useState<LocationData | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<LocationData | null>(null);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPickupMap, setShowPickupMap] = useState(false);
  const [showDeliveryMap, setShowDeliveryMap] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);
  const [distanceCalculationMethod, setDistanceCalculationMethod] = useState<'direct' | 'route'>('route');
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);

  const createOrderMutation = trpc.orders.createOrder.useMutation();

  // حساب المسافة باستخدام Google Maps Directions API
  const calculateDistanceViaGoogle = async (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): Promise<number> => {
    try {
      const directionsService = new window.google.maps.DirectionsService();
      const result = await directionsService.route({
        origin: { lat: lat1, lng: lon1 },
        destination: { lat: lat2, lng: lon2 },
        travelMode: window.google.maps.TravelMode.DRIVING,
      });

      if (result.routes && result.routes.length > 0) {
        const route = result.routes[0];
        let totalDistance = 0;
        if (route.legs) {
          for (const leg of route.legs) {
            if (leg.distance) {
              totalDistance += leg.distance.value; // المسافة بالمتر
            }
          }
        }
        return totalDistance / 1000; // تحويل إلى كيلومتر
      }
      throw new Error('No route found');
    } catch (error) {
      console.error('Error calculating distance:', error);
      // في حالة الخطأ، استخدم صيغة Haversine كبديل
      const R = 6371;
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
    }
  };

  // حساب المسافة المباشرة (Haversine)
  const calculateDirectDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
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

  // حساب السعر عند اختيار الموقع
  const handleCalculatePrice = async () => {
    if (!pickupLocation || !deliveryLocation) {
      toast.error("يرجى اختيار موقع الاستلام والتسليم");
      return;
    }

    setIsCalculatingPrice(true);
    try {
      let distance: number;
      
      if (distanceCalculationMethod === 'direct') {
        // استخدام المسافة المباشرة
        distance = calculateDirectDistance(
          pickupLocation.latitude,
          pickupLocation.longitude,
          deliveryLocation.latitude,
          deliveryLocation.longitude
        );
      } else {
        // استخدام Google Maps
        distance = await calculateDistanceViaGoogle(
          pickupLocation.latitude,
          pickupLocation.longitude,
          deliveryLocation.latitude,
          deliveryLocation.longitude
        );
      }
      
      setCalculatedDistance(distance);
      // استخدام النموذج الموحد: 25 ج.م لأول 3 كم + 5 ج.م/كم إضافي
      const price = distance <= 3 ? 25 : 25 + (distance - 3) * 5;
      setEstimatedPrice(price);
      toast.success(`تم حساب السعر: ${formatPrice(price)} (المسافة: ${distance.toFixed(2)} كم)`);
    } catch (error) {
      toast.error("فشل في حساب السعر");
    } finally {
      setIsCalculatingPrice(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || user.role !== "customer") {
    navigate("/");
    return null;
  }

  const handleCreateOrder = async () => {
    if (!pickupLocation || !deliveryLocation) {
      toast.error("يرجى اختيار موقع الاستلام والتسليم");
      return;
    }

    if (!estimatedPrice) {
      toast.error("يرجى حساب السعر أولاً");
      return;
    }

    setIsSubmitting(true);
    try {
      await createOrderMutation.mutateAsync({
        pickupLocation: {
          address: pickupLocation.address,
          neighborhood: "الموقع المحدد",
          latitude: pickupLocation.latitude,
          longitude: pickupLocation.longitude,
        },
        deliveryLocation: {
          address: deliveryLocation.address,
          neighborhood: "الموقع المحدد",
          latitude: deliveryLocation.latitude,
          longitude: deliveryLocation.longitude,
        },
        price: estimatedPrice,
        notes: notes || undefined,
      });
      toast.success("تم إنشاء الطلب بنجاح");
      navigate("/customer/dashboard");
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("فشل في إنشاء الطلب");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="gradient-warm text-white py-8">
        <div className="container">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={() => navigate("/customer/dashboard")}
            >
              ← العودة
            </Button>
          </div>
          <h1 className="text-4xl font-bold mb-2">إنشاء طلب توصيل جديد</h1>
          <p className="text-white/90">اختر موقع الاستلام والتسليم لإنشاء طلبك</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Location Selection */}
          <div className="space-y-6">
            {/* Pickup Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  موقع الاستلام
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {showPickupMap ? (
                  <>
                    <MapPicker
                      onLocationSelect={(location) => {
                        setPickupLocation(location);
                        setShowPickupMap(false);
                      }}
                      title="اضغط على الخريطة لاختيار موقع الاستلام"
                    />
                  </>
                ) : (
                  <>
                    {pickupLocation ? (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-muted-foreground">تم اختيار الموقع</p>
                        <p className="font-semibold text-green-700">{pickupLocation.address}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {pickupLocation.latitude.toFixed(4)}, {pickupLocation.longitude.toFixed(4)}
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-sm text-muted-foreground">لم يتم اختيار موقع بعد</p>
                      </div>
                    )}
                    <Button
                      onClick={() => setShowPickupMap(true)}
                      className="w-full"
                      variant={pickupLocation ? "outline" : "default"}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      {pickupLocation ? "تغيير الموقع" : "اختيار الموقع من الخريطة"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Delivery Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-secondary" />
                  موقع التسليم
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {showDeliveryMap ? (
                  <>
                    <MapPicker
                      onLocationSelect={(location) => {
                        setDeliveryLocation(location);
                        setShowDeliveryMap(false);
                      }}
                      title="اضغط على الخريطة لاختيار موقع التسليم"
                    />
                  </>
                ) : (
                  <>
                    {deliveryLocation ? (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-muted-foreground">تم اختيار الموقع</p>
                        <p className="font-semibold text-green-700">{deliveryLocation.address}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {deliveryLocation.latitude.toFixed(4)}, {deliveryLocation.longitude.toFixed(4)}
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-sm text-muted-foreground">لم يتم اختيار موقع بعد</p>
                      </div>
                    )}
                    <Button
                      onClick={() => setShowDeliveryMap(true)}
                      className="w-full"
                      variant={deliveryLocation ? "outline" : "default"}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      {deliveryLocation ? "تغيير الموقع" : "اختيار الموقع من الخريطة"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Order Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>تفاصيل الطلب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="notes">ملاحظات إضافية (اختياري)</Label>
                  <Textarea
                    id="notes"
                    placeholder="أضف أي ملاحظات أو تعليمات خاصة للسائق..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2"
                    rows={4}
                  />
                </div>

                {/* Distance Calculation Method */}
                {pickupLocation && deliveryLocation && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardHeader>
                      <CardTitle className="text-sm">طريقة حساب المسافة</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-amber-100">
                          <input
                            type="radio"
                            name="distance-method"
                            value="route"
                            checked={distanceCalculationMethod === 'route'}
                            onChange={(e) => setDistanceCalculationMethod(e.target.value as 'route' | 'direct')}
                            className="w-4 h-4"
                          />
                          <span className="flex-1">
                            <span className="font-medium">عبر الطريق (Google Maps)</span>
                            <p className="text-xs text-muted-foreground">حساب دقيق بناءً على الطرق الفعلية</p>
                          </span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-amber-100">
                          <input
                            type="radio"
                            name="distance-method"
                            value="direct"
                            checked={distanceCalculationMethod === 'direct'}
                            onChange={(e) => setDistanceCalculationMethod(e.target.value as 'route' | 'direct')}
                            className="w-4 h-4"
                          />
                          <span className="flex-1">
                            <span className="font-medium">مسافة مباشرة (خط مستقيم)</span>
                            <p className="text-xs text-muted-foreground">حساب سريع بناءً على الإحداثيات</p>
                          </span>
                        </label>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Route Summary */}
                {pickupLocation && deliveryLocation && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                    <h3 className="font-semibold text-blue-900">ملخص الطلب</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">من:</p>
                        <p className="font-medium">{pickupLocation.address}</p>
                      </div>
                      <div className="flex justify-center py-2">
                        <ArrowRight className="h-4 w-4 text-primary rotate-180" />
                      </div>
                      <div>
                        <p className="text-muted-foreground">إلى:</p>
                        <p className="font-medium">{deliveryLocation.address}</p>
                      </div>
                      {estimatedPrice && (
                        <div className="pt-2 border-t border-blue-200 mt-3">
                          <p className="text-muted-foreground">السعر المتوقع:</p>
                          <p className="font-bold text-lg text-blue-900">{formatPrice(estimatedPrice)}</p>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={handleCalculatePrice}
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      disabled={isCalculatingPrice}
                    >
                      {isCalculatingPrice ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          جاري حساب السعر...
                        </>
                      ) : (
                        "حساب السعر"
                      )}
                    </Button>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  onClick={handleCreateOrder}
                  disabled={!pickupLocation || !deliveryLocation || isSubmitting}
                  className="w-full h-12 text-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      جاري إنشاء الطلب...
                    </>
                  ) : (
                    "إنشاء الطلب"
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate("/customer/dashboard")}
                  className="w-full"
                >
                  إلغاء
                </Button>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">معلومات مهمة</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>✓ سيتم إسناد الطلب لأقرب سائق متاح</p>
                <p>✓ ستتلقى إشعار عند قبول السائق للطلب</p>
                <p>✓ يمكنك تتبع موقع السائق في الوقت الفعلي</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
