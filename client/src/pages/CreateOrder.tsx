import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, ArrowRight, Loader2, ChevronLeft, Navigation, Info, DollarSign, Truck, CheckCircle2, X } from "lucide-react";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import MapPicker from "@/components/MapPicker";
import { formatPrice } from "@shared/pricing";
import { motion, AnimatePresence } from "framer-motion";

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
  const [step, setStep] = useState<'pickup' | 'delivery' | 'confirm'>('pickup');
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);

  const createOrderMutation = trpc.orders.createOrder.useMutation();

  // حساب المسافة والسعر تلقائياً عند اختيار الموقعين
  useEffect(() => {
    if (pickupLocation && deliveryLocation) {
      calculatePrice();
    }
  }, [pickupLocation, deliveryLocation]);

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
              totalDistance += leg.distance.value;
            }
          }
        }
        return totalDistance / 1000;
      }
      throw new Error('No route found');
    } catch (error) {
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

  const calculatePrice = async () => {
    if (!pickupLocation || !deliveryLocation) return;
    
    try {
      const distance = await calculateDistanceViaGoogle(
        pickupLocation.latitude,
        pickupLocation.longitude,
        deliveryLocation.latitude,
        deliveryLocation.longitude
      );
      
      setCalculatedDistance(distance);
      const price = distance <= 3 ? 25 : 25 + (distance - 3) * 5;
      setEstimatedPrice(price);
    } catch (error) {
      console.error("Price calculation error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-12 w-12 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "customer") {
    navigate("/");
    return null;
  }

  const handleCreateOrder = async () => {
    if (!pickupLocation || !deliveryLocation || !estimatedPrice) {
      toast.error("يرجى إكمال بيانات الطلب أولاً");
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
      toast.success("🚀 تم إرسال طلبك بنجاح! جاري البحث عن سائق...");
      navigate("/customer/dashboard");
    } catch (error) {
      toast.error("فشل في إنشاء الطلب، يرجى المحاولة مرة أخرى");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden" dir="rtl">
      {/* Header Navigation */}
      <div className="absolute top-6 left-6 right-6 z-50 flex justify-between items-center pointer-events-none">
        <Button
          variant="white"
          size="icon"
          className="rounded-2xl shadow-xl pointer-events-auto bg-white hover:bg-slate-50 text-slate-900 h-12 w-12"
          onClick={() => {
            if (step === 'delivery') setStep('pickup');
            else if (step === 'confirm') setStep('delivery');
            else navigate("/customer/dashboard");
          }}
        >
          <ChevronLeft className="h-6 w-6 rotate-180" />
        </Button>
        
        <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-2 rounded-2xl shadow-2xl pointer-events-auto flex items-center gap-3 border border-white/10">
          <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-sm font-black tracking-tight">وصلي • طلب جديد</span>
        </div>
      </div>

      {/* Full Screen Map Container */}
      <div className="flex-1 relative">
        <MapPicker
          onLocationSelect={(location) => {
            if (step === 'pickup') setPickupLocation(location);
            else if (step === 'delivery') setDeliveryLocation(location);
          }}
          title={step === 'pickup' ? "حدد موقع الاستلام" : "حدد وجهة التسليم"}
        />

        {/* Floating Interaction Cards */}
        <div className="absolute bottom-8 left-6 right-6 z-50 flex flex-col gap-4 pointer-events-none">
          <AnimatePresence mode="wait">
            {step === 'pickup' && (
              <motion.div
                key="pickup-card"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="pointer-events-auto"
              >
                <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm rounded-[2.5rem] overflow-hidden">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="bg-orange-100 p-4 rounded-2xl">
                        <MapPin className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900">من أين نستلم؟</h3>
                        <p className="text-slate-500 text-sm">حدد موقعك الحالي أو مكان الاستلام</p>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                      <p className="text-sm font-bold text-slate-700 line-clamp-1">
                        {pickupLocation?.address || "اضغط على الخريطة لتحديد الموقع"}
                      </p>
                    </div>

                    <Button 
                      disabled={!pickupLocation}
                      onClick={() => setStep('delivery')}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white h-16 rounded-2xl text-lg font-black shadow-lg shadow-orange-200 transition-all active:scale-95"
                    >
                      تأكيد موقع الاستلام <ArrowRight className="mr-2 h-5 w-5 rotate-180" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 'delivery' && (
              <motion.div
                key="delivery-card"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="pointer-events-auto"
              >
                <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-sm rounded-[2.5rem] overflow-hidden">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="bg-blue-100 p-4 rounded-2xl">
                        <Navigation className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900">إلى أين نذهب؟</h3>
                        <p className="text-slate-500 text-sm">حدد وجهة التسليم النهائية</p>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                      <p className="text-sm font-bold text-slate-700 line-clamp-1">
                        {deliveryLocation?.address || "اضغط على الخريطة لتحديد الوجهة"}
                      </p>
                    </div>

                    <Button 
                      disabled={!deliveryLocation}
                      onClick={() => setStep('confirm')}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white h-16 rounded-2xl text-lg font-black shadow-lg transition-all active:scale-95"
                    >
                      تأكيد الوجهة <ArrowRight className="mr-2 h-5 w-5 rotate-180" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 'confirm' && (
              <motion.div
                key="confirm-card"
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="pointer-events-auto"
              >
                <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden">
                  <CardContent className="p-8">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-slate-900">ملخص الطلب</h3>
                      <div className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl font-black text-xl">
                        {estimatedPrice ? `ج.م ${estimatedPrice}` : "..."}
                      </div>
                    </div>

                    <div className="space-y-4 mb-8">
                      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-slate-400 uppercase">الاستلام</p>
                          <p className="text-sm font-bold text-slate-700 truncate">{pickupLocation?.address}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Navigation className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-slate-400 uppercase">التسليم</p>
                          <p className="text-sm font-bold text-slate-700 truncate">{deliveryLocation?.address}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                          <Truck className="h-5 w-5 text-slate-400" />
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">المسافة</p>
                            <p className="text-sm font-bold text-slate-700">{calculatedDistance?.toFixed(1)} كم</p>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                          <Info className="h-5 w-5 text-slate-400" />
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">الدفع</p>
                            <p className="text-sm font-bold text-slate-700">نقدي</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-black text-slate-400 mr-2">ملاحظات إضافية (اختياري)</Label>
                        <Textarea 
                          placeholder="مثلاً: رقم الشقة، علامة مميزة، أو تفاصيل الشحنة..."
                          className="rounded-2xl border-slate-100 bg-slate-50 focus:ring-orange-500 min-h-[80px] resize-none"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>
                    </div>

                    <Button 
                      disabled={isSubmitting}
                      onClick={handleCreateOrder}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white h-16 rounded-2xl text-xl font-black shadow-xl shadow-orange-200 transition-all active:scale-95 group relative overflow-hidden"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <>
                          <span className="relative z-10">تأكيد وطلب الآن</span>
                          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
