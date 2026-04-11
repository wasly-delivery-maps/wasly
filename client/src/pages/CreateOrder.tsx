import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, ArrowRight, Loader2, ChevronLeft, Navigation, Info, DollarSign, Truck, CheckCircle2, X, Zap, Route } from "lucide-react";
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

  // التحقق من وجود بيانات طلب مكرر في الرابط
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const repeatData = params.get('repeat');
    if (repeatData) {
      try {
        const data = JSON.parse(decodeURIComponent(repeatData));
        if (data.pickup) setPickupLocation(data.pickup);
        if (data.delivery) setDeliveryLocation(data.delivery);
        if (data.notes) setNotes(data.notes);
        // إذا تم توفير الموقعين، انتقل مباشرة لخطوة التأكيد
        if (data.pickup && data.delivery) {
          setStep('confirm');
          toast.info("تم استعادة بيانات الطلب السابق");
        }
      } catch (e) {
        console.error("Error parsing repeat data:", e);
      }
    }
  }, []);
  
  useEffect(() => {
    console.log("[CreateOrder] Step:", step);
    console.log("[CreateOrder] Pickup:", pickupLocation);
    console.log("[CreateOrder] Delivery:", deliveryLocation);
  }, [step, pickupLocation, deliveryLocation]);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-12 w-12 text-orange-600" />
        </motion.div>
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

  const stepIndicator = {
    pickup: 1,
    delivery: 2,
    confirm: 3
  };

  const currentStep = stepIndicator[step];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex flex-col relative overflow-hidden" dir="rtl">
      {/* Animated Background Elements */}
      <motion.div 
        className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"
        animate={{ 
          x: [0, 30, 0],
          y: [0, -30, 0],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div 
        className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
        animate={{ 
          x: [0, -30, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      {/* Header Navigation */}
      <motion.div 
        className="absolute top-6 left-6 right-6 z-50 flex justify-between items-center pointer-events-none"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="pointer-events-auto"
        >
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl shadow-lg pointer-events-auto bg-white hover:bg-slate-50 text-slate-900 h-12 w-12 border border-slate-200"
            onClick={() => {
              if (step === 'delivery') {
                setDeliveryLocation(null);
                setStep('pickup');
              }
              else if (step === 'confirm') setStep('delivery');
              else navigate("/customer/dashboard");
            }}
          >
            <ChevronLeft className="h-6 w-6 rotate-180" />
          </Button>
        </motion.div>
        
        <motion.div 
          className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-3 rounded-xl shadow-2xl pointer-events-auto flex items-center gap-3 border border-white/10 backdrop-blur-md"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="وصلي" className="h-5 w-5 rounded-full object-contain bg-white p-0.5" />
            <span className="text-sm font-black tracking-tight">وصلي • طلب جديد</span>
          </div>
        </motion.div>

        {/* Step Indicator */}
        <motion.div 
          className="bg-white/80 backdrop-blur-md px-6 py-3 rounded-xl shadow-lg pointer-events-auto flex items-center gap-3 border border-slate-200"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((num) => (
              <motion.div
                key={num}
                className={`h-8 w-8 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                  num === currentStep 
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg' 
                    : num < currentStep 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-slate-200 text-slate-600'
                }`}
                animate={num === currentStep ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {num < currentStep ? <CheckCircle2 className="h-4 w-4" /> : num}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>

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
                initial={{ y: 100, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 100, opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="pointer-events-auto"
              >
                <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-md rounded-3xl overflow-hidden hover:shadow-3xl transition-all">
                  <CardContent className="p-8">
                    <motion.div 
                      className="flex items-center gap-4 mb-6"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <motion.div 
                        className="bg-gradient-to-br from-orange-100 to-orange-50 p-4 rounded-2xl"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        <MapPin className="h-6 w-6 text-orange-600" />
                      </motion.div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900">من أين نستلم؟</h3>
                        <p className="text-slate-500 text-sm font-medium">حدد موقعك الحالي أو مكان الاستلام</p>
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className="bg-gradient-to-r from-slate-50 to-slate-100/50 p-4 rounded-2xl border-2 border-slate-200/50 mb-6"
                      whileHover={{ borderColor: '#f97316' }}
                    >
                      <p className="text-sm font-bold text-slate-700 line-clamp-2">
                        {pickupLocation?.address || "اضغط على الخريطة لتحديد الموقع"}
                      </p>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button 
                        disabled={!pickupLocation || !pickupLocation.latitude}
                        onClick={() => setStep('delivery')}
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white h-14 rounded-2xl text-base font-black shadow-lg hover:shadow-xl transition-all"
                      >
                        تأكيد موقع الاستلام
                        <motion.div
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="ml-2"
                        >
                          <ArrowRight className="h-5 w-5 rotate-180" />
                        </motion.div>
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 'delivery' && (
              <motion.div
                key="delivery-card"
                initial={{ y: 100, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 100, opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="pointer-events-auto"
              >
                <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-md rounded-3xl overflow-hidden hover:shadow-3xl transition-all">
                  <CardContent className="p-8">
                    <motion.div 
                      className="flex items-center gap-4 mb-6"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <motion.div 
                        className="bg-gradient-to-br from-blue-100 to-blue-50 p-4 rounded-2xl"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        <Navigation className="h-6 w-6 text-blue-600" />
                      </motion.div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900">إلى أين نذهب؟</h3>
                        <p className="text-slate-500 text-sm font-medium">حدد وجهة التسليم النهائية</p>
                      </div>
                    </motion.div>
                    
                    <motion.div 
                      className="bg-gradient-to-r from-slate-50 to-slate-100/50 p-4 rounded-2xl border-2 border-slate-200/50 mb-6"
                      whileHover={{ borderColor: '#2563eb' }}
                    >
                      <p className="text-sm font-bold text-slate-700 line-clamp-2">
                        {deliveryLocation ? deliveryLocation.address : "اضغط على الخريطة لتحديد الوجهة"}
                      </p>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button 
                        disabled={!deliveryLocation || !deliveryLocation.latitude}
                        onClick={() => setStep('confirm')}
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white h-14 rounded-2xl text-base font-black shadow-lg hover:shadow-xl transition-all"
                      >
                        تأكيد الوجهة
                        <motion.div
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="ml-2"
                        >
                          <ArrowRight className="h-5 w-5 rotate-180" />
                        </motion.div>
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 'confirm' && (
              <motion.div
                key="confirm-card"
                initial={{ y: 100, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 100, opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="pointer-events-auto max-h-96 overflow-y-auto"
              >
                <Card className="border-none shadow-2xl bg-white rounded-3xl overflow-hidden hover:shadow-3xl transition-all">
                  <CardContent className="p-8">
                    <motion.div 
                      className="flex justify-between items-center mb-8"
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <h3 className="text-2xl font-black text-slate-900">ملخص الطلب</h3>
                      <motion.div 
                        className="bg-gradient-to-r from-orange-100 to-orange-50 text-orange-600 px-4 py-2 rounded-xl font-black text-xl border border-orange-200"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {estimatedPrice ? `ج.م ${estimatedPrice}` : "..."}
                      </motion.div>
                    </motion.div>

                    <motion.div 
                      className="space-y-4 mb-8"
                      variants={{
                        hidden: { opacity: 0 },
                        visible: {
                          opacity: 1,
                          transition: {
                            staggerChildren: 0.1,
                          },
                        },
                      }}
                      initial="hidden"
                      animate="visible"
                    >
                      {/* Pickup Location */}
                      <motion.div 
                        className="flex items-center gap-4 p-4 bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-2xl border-2 border-orange-200/50 hover:border-orange-300 transition-all"
                        whileHover={{ scale: 1.02, x: 5 }}
                        variants={{
                          hidden: { opacity: 0, x: -20 },
                          visible: { opacity: 1, x: 0 },
                        }}
                      >
                        <motion.div 
                          className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0 text-white"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                        >
                          <MapPin className="h-5 w-5" />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">الاستلام</p>
                          <p className="text-sm font-bold text-slate-700 truncate">{pickupLocation?.address}</p>
                        </div>
                      </motion.div>

                      {/* Delivery Location */}
                      <motion.div 
                        className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-2xl border-2 border-blue-200/50 hover:border-blue-300 transition-all"
                        whileHover={{ scale: 1.02, x: 5 }}
                        variants={{
                          hidden: { opacity: 0, x: -20 },
                          visible: { opacity: 1, x: 0 },
                        }}
                      >
                        <motion.div 
                          className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0 text-white"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                        >
                          <Navigation className="h-5 w-5" />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">التسليم</p>
                          <p className="text-sm font-bold text-slate-700 truncate">{deliveryLocation?.address}</p>
                        </div>
                      </motion.div>

                      {/* Distance and Payment */}
                      <div className="grid grid-cols-2 gap-4">
                        <motion.div 
                          className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-slate-200/50 flex items-center gap-3 hover:border-slate-300 transition-all"
                          whileHover={{ scale: 1.05 }}
                          variants={{
                            hidden: { opacity: 0, scale: 0.9 },
                            visible: { opacity: 1, scale: 1 },
                          }}
                        >
                          <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Route className="h-5 w-5 text-slate-600" />
                          </motion.div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase">المسافة</p>
                            <p className="text-sm font-bold text-slate-700">{calculatedDistance?.toFixed(1)} كم</p>
                          </div>
                        </motion.div>
                        <motion.div 
                          className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-slate-200/50 flex items-center gap-3 hover:border-slate-300 transition-all"
                          whileHover={{ scale: 1.05 }}
                          variants={{
                            hidden: { opacity: 0, scale: 0.9 },
                            visible: { opacity: 1, scale: 1 },
                          }}
                        >
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <DollarSign className="h-5 w-5 text-slate-600" />
                          </motion.div>
                          <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase">الدفع</p>
                            <p className="text-sm font-bold text-slate-700">نقدي</p>
                          </div>
                        </motion.div>
                      </div>

                      {/* Notes */}
                      <motion.div 
                        className="space-y-2"
                        variants={{
                          hidden: { opacity: 0, y: 20 },
                          visible: { opacity: 1, y: 0 },
                        }}
                      >
                        <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">ملاحظات إضافية (اختياري)</Label>
                        <Textarea 
                          placeholder="مثلاً: رقم الشقة، علامة مميزة، أو تفاصيل الشحنة..."
                          className="rounded-2xl border-2 border-slate-200 bg-slate-50 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 min-h-[80px] resize-none font-medium"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </motion.div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button 
                        disabled={isSubmitting}
                        onClick={handleCreateOrder}
                        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white h-14 rounded-2xl text-lg font-black shadow-xl hover:shadow-2xl transition-all group relative overflow-hidden"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin ml-2" />
                            جاري المعالجة...
                          </>
                        ) : (
                          <>
                            <Zap className="h-5 w-5 ml-2" />
                            تأكيد وطلب الآن
                          </>
                        )}
                        <motion.div 
                          className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" 
                        />
                      </Button>
                    </motion.div>
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
