import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { MapPin, Plus, LogOut, User, Truck, Clock, DollarSign, X, Phone, Calendar, ChevronRight, Package, Search, CheckCircle2, Loader2, TrendingUp, Award, Zap, Navigation, Info } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Cancel Order Button Component
function CancelOrderButton({ orderId, onSuccess }: { orderId: number; onSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const cancelMutation = trpc.orders.cancelOrder.useMutation();

  const handleCancel = async () => {
    if (!window.confirm("هل أنت متأكد من إلغاء هذا الطلب؟")) return;
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
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCancel}
        disabled={isLoading}
        className="text-rose-500 hover:bg-rose-50 font-bold text-xs rounded-lg transition-all"
      >
        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3.5 w-3.5 ml-1" />}
        إلغاء الطلب
      </Button>
    </motion.div>
  );
}

export default function CustomerDashboard() {
  const { user, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const ordersQuery = trpc.orders.getCustomerOrders.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const orderDetailsQuery = trpc.orders.getOrderDetails.useQuery(
    { orderId: selectedOrderId as number },
    { enabled: !!selectedOrderId && isDetailsOpen }
  );

  const orders = useMemo(() => ordersQuery.data || [], [ordersQuery.data]);

  const handleShowDetails = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsDetailsOpen(true);
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900 font-sans" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-4"
            whileHover={{ scale: 1.05 }}
          >
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <motion.div 
                  className="bg-gradient-to-br from-orange-500 to-orange-600 p-2 rounded-lg shadow-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <Truck className="h-5 w-5 text-white" />
                </motion.div>
                <span className="text-xl font-black bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">وصلي</span>
              </div>
            </Link>
          </motion.div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-bold text-slate-900">{user.name}</span>
              <motion.span 
                className="text-[10px] font-bold text-orange-600 uppercase tracking-widest"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ⭐ عميل مميز
              </motion.span>
            </div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href="/customer/profile">
                <Button variant="ghost" size="icon" className="rounded-full bg-gradient-to-br from-slate-100 to-slate-50 h-10 w-10 hover:from-orange-100 hover:to-orange-50 transition-all">
                  <User className="h-5 w-5 text-slate-600" />
                </Button>
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout} 
                className="text-rose-500 hover:bg-rose-50 rounded-full h-10 w-10 transition-all"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Welcome & Action */}
          <motion.div 
            className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
            variants={itemVariants}
          >
            <div className="space-y-2">
              <motion.h2 
                className="text-4xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                أهلاً بك، {user.name.split(' ')[0]} 👋
              </motion.h2>
              <p className="text-slate-500 font-medium text-lg">تتبع طلباتك وتحركاتك بكل سهولة وسرعة</p>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href="/customer/create-order">
                <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black px-8 py-6 rounded-xl shadow-lg shadow-orange-200 transition-all">
                  <Plus className="h-5 w-5 ml-2" />
                  اطلب الآن
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            variants={containerVariants}
          >
            {[
              { label: "طلبات نشطة", value: activeOrders.length, icon: Zap, color: "from-orange-500 to-orange-600", bg: "bg-orange-50" },
              { label: "طلبات مكتملة", value: completedOrders.length, icon: CheckCircle2, color: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50" },
              { label: "إجمالي الإنفاق", value: `ج.م ${totalSpent.toLocaleString()}`, icon: TrendingUp, color: "from-blue-500 to-blue-600", bg: "bg-blue-50" }
            ].map((stat, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all">
                  <CardContent className="p-6 flex items-center gap-4">
                    <motion.div 
                      className={`bg-gradient-to-br ${stat.color} p-3 rounded-xl text-white shadow-lg`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <stat.icon className="h-6 w-6" />
                    </motion.div>
                    <div>
                      <div className="text-2xl font-black text-slate-900">{stat.value}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* Orders Tabs */}
          <motion.div
            variants={itemVariants}
          >
            <Tabs defaultValue="active" className="w-full">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <TabsList className="bg-gradient-to-r from-slate-100 to-slate-50 p-1 rounded-xl mb-6 shadow-sm">
                  <TabsTrigger 
                    value="active" 
                    className="rounded-lg px-6 font-bold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-md transition-all"
                  >
                    النشطة ({activeOrders.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="completed" 
                    className="rounded-lg px-6 font-bold data-[state=active]:bg-white data-[state=active]:text-orange-600 data-[state=active]:shadow-md transition-all"
                  >
                    المكتملة ({completedOrders.length})
                  </TabsTrigger>
                </TabsList>
              </motion.div>

              <TabsContent value="active">
                <AnimatePresence>
                  <motion.div 
                    className="space-y-4"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {activeOrders.length > 0 ? (
                      activeOrders.map((order, idx) => {
                        const status = getStatusInfo(order.status);
                        return (
                          <motion.div
                            key={order.id}
                            variants={itemVariants}
                            whileHover={{ scale: 1.02, y: -5 }}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                          >
                            <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all">
                              <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                  <div className="flex-1 space-y-4">
                                    <div className="flex items-center justify-between md:justify-start gap-4">
                                      <span className="text-sm font-black text-slate-900">طلب #{order.id}</span>
                                      <motion.div
                                        whileHover={{ scale: 1.1 }}
                                      >
                                        <Badge className={`${status.color} border-none font-bold px-3 py-1 rounded-full text-[10px]`}>
                                          {status.label}
                                        </Badge>
                                      </motion.div>
                                    </div>
                                    <div className="space-y-3">
                                      <div className="flex items-start gap-3">
                                        <motion.div 
                                          className="h-2 w-2 rounded-full bg-orange-600 mt-1.5 flex-shrink-0"
                                          animate={{ scale: [1, 1.5, 1] }}
                                          transition={{ duration: 2, repeat: Infinity }}
                                        />
                                        <p className="text-sm font-medium text-slate-600 line-clamp-1">{order.pickupLocation?.address}</p>
                                      </div>
                                      <div className="flex items-start gap-3">
                                        <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm font-medium text-slate-600 line-clamp-1">{order.deliveryLocation?.address}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                                    <motion.div 
                                      className="text-2xl font-black bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent"
                                      animate={{ scale: [1, 1.05, 1] }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                    >
                                      ج.م {order.price}
                                    </motion.div>
                                    <div className="flex items-center gap-2">
                                      {!["in_transit", "arrived", "delivered", "cancelled"].includes(order.status) && (
                                        <CancelOrderButton orderId={order.id} onSuccess={() => ordersQuery.refetch()} />
                                      )}
                                      <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          onClick={() => handleShowDetails(order.id)}
                                          className="rounded-lg font-bold text-xs border-orange-200 text-orange-600 hover:bg-orange-50 transition-all"
                                        >
                                          التفاصيل
                                        </Button>
                                      </motion.div>
                                    </div>
                                  </div>
                                </div>
                                {order.assignedDriver && (
                                  <motion.div 
                                    className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between bg-gradient-to-r from-orange-50 to-transparent p-3 rounded-lg"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <motion.div 
                                        className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold"
                                        whileHover={{ scale: 1.1 }}
                                      >
                                        {order.assignedDriver.name.charAt(0)}
                                      </motion.div>
                                      <span className="text-xs font-bold text-slate-700">{order.assignedDriver.name}</span>
                                    </div>
                                    <motion.a 
                                      href={`tel:${order.assignedDriver.phone}`} 
                                      className="text-orange-600 bg-white border border-orange-200 p-2 rounded-lg hover:bg-orange-50 transition-all"
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <Phone className="h-4 w-4" />
                                    </motion.a>
                                  </motion.div>
                                )}
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })
                    ) : (
                      <motion.div 
                        className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <motion.div
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Package className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                        </motion.div>
                        <p className="text-slate-400 font-bold">لا توجد طلبات نشطة حالياً</p>
                        <p className="text-slate-300 text-sm mt-2">ابدأ بإنشاء طلب جديد الآن</p>
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="completed">
                <AnimatePresence>
                  <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {completedOrders.length > 0 ? (
                      completedOrders.map((order, idx) => {
                        const status = getStatusInfo(order.status);
                        return (
                          <motion.div
                            key={order.id}
                            variants={itemVariants}
                            whileHover={{ scale: 1.05, y: -5 }}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                          >
                            <Card className="border-none shadow-md bg-white rounded-2xl hover:shadow-lg transition-all">
                              <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                  <div>
                                    <p className="text-xs font-bold text-slate-400 mb-1">الطلب #{order.id}</p>
                                    <motion.div
                                      whileHover={{ scale: 1.1 }}
                                    >
                                      <Badge className={`${status.color} border-none font-bold px-2 py-0.5 rounded-full text-[9px]`}>
                                        {status.label}
                                      </Badge>
                                    </motion.div>
                                  </div>
                                  <div className="text-xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">ج.م {order.price}</div>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-4">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                                </div>
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Button 
                                    variant="outline" 
                                    className="w-full rounded-xl font-bold text-xs h-10 border-orange-200 text-orange-600 hover:bg-orange-50 transition-all"
                                  >
                                    إعادة الطلب
                                  </Button>
                                </motion.div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })
                    ) : (
                      <motion.div 
                        className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <motion.div
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Award className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                        </motion.div>
                        <p className="text-slate-400 font-bold">سجل الطلبات فارغ</p>
                        <p className="text-slate-300 text-sm mt-2">لم تقم بأي طلبات بعد</p>
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </main>

      {/* Order Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl" dir="rtl">
          <DialogHeader className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-500" />
                تفاصيل الطلب #{selectedOrderId}
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-400 font-medium">
              معلومات كاملة عن حالة وموقع طلبك
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {orderDetailsQuery.isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
                <p className="text-slate-500 font-bold">جاري تحميل البيانات...</p>
              </div>
            ) : orderDetailsQuery.data ? (
              <>
                {/* Status Section */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${getStatusInfo(orderDetailsQuery.data.status).color.split(' ')[0]}`}>
                      {(() => {
                        const Icon = getStatusInfo(orderDetailsQuery.data.status).icon;
                        return <Icon className="h-5 w-5" />;
                      })()}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الحالة الحالية</p>
                      <p className="text-sm font-black text-slate-900">{getStatusInfo(orderDetailsQuery.data.status).label}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">التكلفة</p>
                    <p className="text-lg font-black text-orange-600">ج.م {orderDetailsQuery.data.price}</p>
                  </div>
                </div>

                {/* Locations */}
                <div className="space-y-4 relative">
                  <div className="absolute right-[19px] top-8 bottom-8 w-0.5 bg-dashed border-r-2 border-slate-100 border-dashed" />
                  
                  <div className="flex items-start gap-4 relative z-10">
                    <div className="h-10 w-10 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0 text-white shadow-lg shadow-orange-100">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="flex-1 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">نقطة الاستلام</p>
                      <p className="text-sm font-bold text-slate-700">{orderDetailsQuery.data.pickupLocation.address}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 relative z-10">
                    <div className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0 text-white shadow-lg shadow-blue-100">
                      <Navigation className="h-5 w-5" />
                    </div>
                    <div className="flex-1 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">وجهة التسليم</p>
                      <p className="text-sm font-bold text-slate-700">{orderDetailsQuery.data.deliveryLocation.address}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase">المسافة</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700">{orderDetailsQuery.data.distance.toFixed(1)} كم</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-[10px] font-black text-slate-400 uppercase">الوقت المتوقع</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700">{orderDetailsQuery.data.estimatedTime} دقيقة</p>
                  </div>
                </div>

                {/* Notes */}
                {orderDetailsQuery.data.notes && (
                  <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-4 w-4 text-orange-500" />
                      <span className="text-xs font-black text-orange-600">ملاحظات الطلب</span>
                    </div>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">
                      {orderDetailsQuery.data.notes}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="py-10 text-center">
                <p className="text-rose-500 font-bold">فشل في تحميل تفاصيل الطلب</p>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100">
            <Button 
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black h-12 rounded-xl shadow-lg transition-all"
              onClick={() => setIsDetailsOpen(false)}
            >
              إغلاق النافذة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
