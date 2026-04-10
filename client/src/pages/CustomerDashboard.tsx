import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Plus, LogOut, User, Home, Truck, Clock, DollarSign, X, Phone, Calendar, ChevronRight, Package, Map as MapIcon, Search, Bell, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Cancel Order Button Component
function CancelOrderButton({ orderId, onSuccess }: { orderId: number; onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const cancelMutation = trpc.orders.cancelOrder.useMutation();

  const handleCancel = async () => {
    if (!window.confirm("هل أنت متأكد من إلغاء هذا الطلب؟")) {
      return;
    }

    try {
      setIsLoading(true);
      await cancelMutation.mutateAsync({ orderId });
      toast.success("تم إلغاء الطلب بنجاح");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "فشل إلغاء الطلب");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCancel}
      disabled={isLoading}
      className="gap-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all duration-300 rounded-xl px-4 font-bold text-xs"
    >
      <X className="h-3.5 w-3.5" />
      {isLoading ? "جاري الإلغاء..." : "إلغاء الطلب"}
    </Button>
  );
}

export default function CustomerDashboard() {
  const { user, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const ordersQuery = trpc.orders.getCustomerOrders.useQuery(undefined, {
    refetchInterval: 5000, // تحديث تلقائي كل 5 ثوانٍ لضمان ظهور الطلبات الجديدة
  });

  const orders = useMemo(() => ordersQuery.data || [], [ordersQuery.data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full border-4 border-orange-100 border-t-orange-600 animate-spin"></div>
          <p className="text-slate-900 font-black animate-pulse">وصلي...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast.success("تم تسجيل الخروج بنجاح");
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string, color: string, icon: any }> = {
      pending: { label: "قيد الانتظار", color: "bg-amber-50 text-amber-600 border-amber-100", icon: Clock },
      assigned: { label: "تم الإسناد", color: "bg-blue-50 text-blue-600 border-blue-100", icon: User },
      accepted: { label: "تم القبول", color: "bg-indigo-50 text-indigo-600 border-indigo-100", icon: CheckCircle2 },
      in_transit: { label: "في الطريق", color: "bg-purple-50 text-purple-600 border-purple-100", icon: Truck },
      arrived: { label: "وصل السائق", color: "bg-orange-50 text-orange-600 border-orange-100", icon: MapPin },
      delivered: { label: "تم التسليم", color: "bg-emerald-50 text-emerald-600 border-emerald-100", icon: Package },
      cancelled: { label: "ملغى", color: "bg-rose-50 text-rose-600 border-rose-100", icon: X },
    };
    return statusMap[status] || { label: status, color: "bg-slate-50 text-slate-600", icon: Package };
  };

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const completedOrders = orders.filter((o) => ["delivered", "cancelled"].includes(o.status));
  const totalSpent = orders.reduce((sum, o) => sum + (o.price || 0), 0);

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#1A1C1E] font-sans selection:bg-orange-100 selection:text-orange-900" dir="rtl">
      {/* Global Navigation */}
      <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/">
              <div className="flex items-center gap-2.5 cursor-pointer group">
                <div className="bg-orange-600 p-2.5 rounded-2xl shadow-lg shadow-orange-200 group-hover:scale-110 transition-all duration-500">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-black tracking-tighter text-[#1A1C1E]">وصلي</span>
              </div>
            </Link>
            
            <nav className="hidden lg:flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" className="text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-2xl px-5 font-bold">
                  الرئيسية
                </Button>
              </Link>
              <Button variant="ghost" className="text-orange-600 bg-orange-50 rounded-2xl px-5 font-bold">
                لوحة التحكم
              </Button>
              <Link href="/customer/profile">
                <Button variant="ghost" className="text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-2xl px-5 font-bold">
                  الملف الشخصي
                </Button>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end ml-3">
              <span className="text-sm font-black text-[#1A1C1E]">{user.name}</span>
              <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Premium Customer</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
              <User className="h-6 w-6" />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-6xl">
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-4xl font-black text-[#1A1C1E] mb-3 tracking-tight">أهلاً بك، {user.name.split(' ')[0]} 👋</h2>
            <p className="text-slate-500 font-medium">كل طلباتك وتحركاتك في مكان واحد، بتصميم عالمي.</p>
          </motion.div>
          
          <Link href="/customer/create-order">
            <Button className="bg-orange-600 hover:bg-orange-700 text-white font-black px-10 py-7 rounded-[2rem] shadow-2xl shadow-orange-200 hover:shadow-orange-300 transition-all duration-500 group active:scale-95">
              <Plus className="h-6 w-6 ml-3 group-hover:rotate-90 transition-transform duration-500" />
              اطلب الآن
            </Button>
          </Link>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {[
            { label: "طلبات نشطة", value: activeOrders.length, icon: Truck, color: "orange" },
            { label: "طلبات مكتملة", value: completedOrders.length, icon: CheckCircle2, color: "emerald" },
            { label: "إجمالي الإنفاق", value: `ج.م ${totalSpent.toLocaleString()}`, icon: DollarSign, color: "blue" }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden group hover:shadow-xl transition-all duration-500">
                <CardContent className="p-8 flex items-center gap-6">
                  <div className={`bg-${stat.color}-50 p-5 rounded-3xl group-hover:scale-110 transition-transform duration-500`}>
                    <stat.icon className={`h-8 w-8 text-${stat.color}-600`} />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-[#1A1C1E] mb-1">{stat.value}</div>
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Orders Section */}
        <Tabs defaultValue="active" className="w-full">
          <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
            <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl h-14">
              <TabsTrigger value="active" className="rounded-xl px-8 h-full data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm font-black transition-all">
                النشطة ({activeOrders.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="rounded-xl px-8 h-full data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-sm font-black transition-all">
                المكتملة ({completedOrders.length})
              </TabsTrigger>
            </TabsList>
            
            <div className="hidden md:flex items-center gap-2 text-slate-400">
              <Search className="h-5 w-5" />
              <span className="text-sm font-bold">بحث في الطلبات</span>
            </div>
          </div>

          <TabsContent value="active" className="outline-none">
            <AnimatePresence mode="wait">
              {activeOrders.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {activeOrders.map((order) => {
                    const status = getStatusInfo(order.status);
                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                      >
                        <Card className="border-none shadow-sm hover:shadow-xl transition-all duration-500 bg-white rounded-[3rem] overflow-hidden group">
                          <CardContent className="p-0">
                            <div className="flex flex-col lg:flex-row">
                              {/* Status Sidebar */}
                              <div className={`lg:w-64 p-10 flex flex-col items-center justify-center text-center border-b lg:border-b-0 lg:border-l border-slate-50 ${status.color.split(' ')[0]}`}>
                                <div className="bg-white/80 backdrop-blur-sm p-5 rounded-[2rem] mb-6 shadow-sm group-hover:scale-110 transition-transform duration-500">
                                  <status.icon className={`h-10 w-10 ${status.color.split(' ')[1]}`} />
                                </div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">رقم الطلب</div>
                                <div className="text-3xl font-black text-[#1A1C1E] mb-4">#{order.id}</div>
                                <Badge className={`${status.color} border-none font-black px-6 py-2 rounded-full text-[10px] uppercase tracking-widest`}>
                                  {status.label}
                                </Badge>
                              </div>

                              {/* Main Content */}
                              <div className="flex-1 p-10 flex flex-col justify-between">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                                  <div className="space-y-8 relative">
                                    <div className="absolute right-4 top-4 bottom-4 w-0.5 bg-slate-100 border-dashed border-l" />
                                    <div className="flex items-start gap-5 relative z-10">
                                      <div className="h-10 w-10 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0 border border-orange-100">
                                        <div className="h-2.5 w-2.5 rounded-full bg-orange-600" />
                                      </div>
                                      <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">نقطة الاستلام</div>
                                        <div className="text-sm font-black text-[#1A1C1E] line-clamp-1">{order.pickupLocation?.address}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-5 relative z-10">
                                      <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100">
                                        <MapPin className="h-5 w-5 text-blue-600" />
                                      </div>
                                      <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">وجهة التسليم</div>
                                        <div className="text-sm font-black text-[#1A1C1E] line-clamp-1">{order.deliveryLocation?.address}</div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end justify-center gap-4">
                                    <div className="text-5xl font-black text-orange-600 tracking-tighter">
                                      <span className="text-sm font-black ml-2 uppercase">ج.م</span>
                                      {order.price?.toLocaleString()}
                                    </div>
                                    <div className="flex items-center gap-6">
                                      <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                                        <Truck className="h-4 w-4" /> {order.distance?.toFixed(1)} KM
                                      </div>
                                      <div className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                                        <Clock className="h-4 w-4" /> {order.estimatedTime || "30"} MIN
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-slate-50">
                                  {order.assignedDriver ? (
                                    <div className="flex items-center gap-4 bg-slate-50/50 p-3 rounded-[2rem] pr-6 w-full sm:w-auto border border-slate-100">
                                      <div className="text-right">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">السائق الموكل</div>
                                        <div className="text-sm font-black text-[#1A1C1E]">{order.assignedDriver.name}</div>
                                      </div>
                                      <a href={`tel:${order.assignedDriver.phone}`} className="bg-white h-12 w-12 rounded-2xl shadow-sm flex items-center justify-center text-orange-600 hover:bg-orange-600 hover:text-white transition-all duration-500">
                                        <Phone className="h-5 w-5" />
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3 text-amber-600 bg-amber-50/50 px-6 py-3 rounded-full border border-amber-100 animate-pulse">
                                      <div className="h-2 w-2 rounded-full bg-amber-600" />
                                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">جاري البحث عن سائق...</span>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                                    {!["in_transit", "arrived", "delivered", "cancelled"].includes(order.status) && (
                                      <CancelOrderButton orderId={order.id} onSuccess={() => ordersQuery.refetch()} />
                                    )}
                                    <Button variant="ghost" className="text-[#1A1C1E] font-black text-xs uppercase tracking-widest hover:bg-slate-50 rounded-xl px-6 group">
                                      التفاصيل <ChevronRight className="h-4 w-4 mr-2 group-hover:-translate-x-2 transition-transform duration-500" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100"
                >
                  <div className="bg-slate-50 h-24 w-24 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8">
                    <Package className="h-12 w-12 text-slate-200" />
                  </div>
                  <h3 className="text-2xl font-black text-[#1A1C1E] mb-3">لا توجد طلبات نشطة</h3>
                  <p className="text-slate-400 font-medium mb-10">ابدأ الآن واطلب أول شحنة لك بكل سهولة.</p>
                  <Link href="/customer/create-order">
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white font-black px-12 py-6 rounded-2xl shadow-xl shadow-orange-100 transition-all active:scale-95">
                      اطلب الآن
                    </Button>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="completed" className="outline-none">
            <AnimatePresence mode="wait">
              {completedOrders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {completedOrders.map((order) => {
                    const status = getStatusInfo(order.status);
                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Card className="border-none shadow-sm hover:shadow-lg transition-all duration-500 bg-white rounded-[2.5rem] overflow-hidden group">
                          <CardContent className="p-8">
                            <div className="flex justify-between items-start mb-8">
                              <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">الطلب #{order.id}</div>
                                <Badge className={`${status.color} border-none font-black px-4 py-1 rounded-full text-[9px] uppercase tracking-widest`}>
                                  {status.label}
                                </Badge>
                              </div>
                              <div className="text-3xl font-black text-[#1A1C1E]">
                                <span className="text-xs font-black ml-2 uppercase">ج.م</span>
                                {order.price?.toLocaleString()}
                              </div>
                            </div>
                            
                            <div className="space-y-4 mb-8">
                              <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                                <MapPin className="h-4 w-4 text-orange-600" />
                                <span className="line-clamp-1">{order.deliveryLocation?.address}</span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <Calendar className="h-4 w-4" />
                                {new Date(order.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </div>
                            </div>

                            <Button variant="outline" className="w-full rounded-2xl border-slate-100 text-slate-900 font-black text-xs uppercase tracking-widest h-14 hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all duration-500">
                              إعادة الطلب
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100">
                  <Clock className="h-16 w-16 text-slate-100 mx-auto mb-6" />
                  <h3 className="text-xl font-black text-slate-300">سجل الطلبات فارغ</h3>
                </div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </main>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden fixed bottom-8 left-6 right-6 z-50">
        <div className="bg-[#1A1C1E]/95 backdrop-blur-2xl rounded-[2.5rem] p-3 shadow-2xl border border-white/10 flex justify-around items-center">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white/40 hover:text-white hover:bg-white/10 rounded-2xl h-14 w-14">
              <Home className="h-7 w-7" />
            </Button>
          </Link>
          <div className="relative">
            <Button variant="ghost" size="icon" className="text-orange-500 bg-white/10 rounded-2xl h-14 w-14">
              <Package className="h-7 w-7" />
            </Button>
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-orange-600 rounded-full border-2 border-[#1A1C1E] flex items-center justify-center text-[8px] font-black text-white">
              {activeOrders.length}
            </div>
          </div>
          <Link href="/customer/profile">
            <Button variant="ghost" size="icon" className="text-white/40 hover:text-white hover:bg-white/10 rounded-2xl h-14 w-14">
              <User className="h-7 w-7" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
