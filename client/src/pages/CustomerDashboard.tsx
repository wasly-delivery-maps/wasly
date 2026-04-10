import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Plus, LogOut, User, Home, Truck, Clock, DollarSign, X, Phone, Calendar, ChevronRight, Package, Map as MapIcon } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
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
      variant="outline"
      size="sm"
      onClick={handleCancel}
      disabled={isLoading}
      className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 transition-all duration-300 rounded-full px-4"
    >
      <X className="h-4 w-4" />
      {isLoading ? "جاري الإلغاء..." : "إلغاء الطلب"}
    </Button>
  );
}

export default function CustomerDashboard() {
  const { user, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [orders, setOrders] = useState<any[]>([]);
  const ordersQuery = trpc.orders.getCustomerOrders.useQuery();

  useEffect(() => {
    if (ordersQuery.data) {
      setOrders(ordersQuery.data);
    }
  }, [ordersQuery.data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-orange-100 border-t-orange-600 animate-spin"></div>
          <div className="mt-4 text-orange-600 font-medium animate-pulse text-center">جاري التحميل...</div>
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "assigned":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "accepted":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "in_transit":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "arrived":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "delivered":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "cancelled":
        return "bg-rose-100 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: "قيد الانتظار",
      assigned: "تم الإسناد",
      accepted: "تم القبول",
      in_transit: "في الطريق",
      arrived: "وصل السائق",
      delivered: "تم التسليم",
      cancelled: "ملغى",
    };
    return labels[status] || status;
  };

  const activeOrdersCount = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
  const completedOrdersCount = orders.filter((o) => ["delivered", "cancelled"].includes(o.status)).length;
  const totalSpent = orders.reduce((sum, o) => sum + (o.price || 0), 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans" dir="rtl">
      {/* Modern Sidebar/Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer group">
                <div className="bg-orange-600 p-2 rounded-xl group-hover:rotate-12 transition-transform duration-300">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-black tracking-tighter text-slate-900">وصلي</span>
              </div>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/">
                <Button variant="ghost" className="text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-full px-4">
                  <Home className="h-4 w-4 ml-2" /> الرئيسية
                </Button>
              </Link>
              <Button variant="ghost" className="text-orange-600 bg-orange-50 rounded-full px-4">
                <Package className="h-4 w-4 ml-2" /> لوحة التحكم
              </Button>
              <Link href="/customer/profile">
                <Button variant="ghost" className="text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-full px-4">
                  <User className="h-4 w-4 ml-2" /> الملف الشخصي
                </Button>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end ml-2">
              <span className="text-sm font-bold text-slate-900">{user.name}</span>
              <span className="text-xs text-slate-500">عميل مميز ✨</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-10"
        >
          <h2 className="text-3xl font-black text-slate-900 mb-2">مرحباً بك مجدداً، {user.name.split(' ')[0]}! 👋</h2>
          <p className="text-slate-500">إليك نظرة سريعة على نشاطاتك وطلباتك الحالية.</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10"
        >
          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500"></div>
              <CardContent className="p-6 relative">
                <div className="bg-orange-100 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                  <Truck className="h-6 w-6 text-orange-600" />
                </div>
                <div className="text-3xl font-black text-slate-900 mb-1">{activeOrdersCount}</div>
                <div className="text-sm font-medium text-slate-500">طلبات نشطة الآن</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500"></div>
              <CardContent className="p-6 relative">
                <div className="bg-emerald-100 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="text-3xl font-black text-slate-900 mb-1">{completedOrdersCount}</div>
                <div className="text-sm font-medium text-slate-500">طلبات مكتملة</div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500"></div>
              <CardContent className="p-6 relative">
                <div className="bg-blue-100 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-3xl font-black text-slate-900 mb-1">ج.م {totalSpent.toLocaleString()}</div>
                <div className="text-sm font-medium text-slate-500">إجمالي المدفوعات</div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
          <Link href="/customer/create-order">
            <Button className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 py-6 rounded-2xl shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all duration-300 group">
              <Plus className="h-5 w-5 ml-2 group-hover:rotate-90 transition-transform duration-300" />
              إنشاء طلب جديد
            </Button>
          </Link>
          
          <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-100 flex gap-1 w-full sm:w-auto">
            <Tabs defaultValue="active" className="w-full sm:w-auto">
              <TabsList className="bg-transparent h-10 gap-1">
                <TabsTrigger value="active" className="rounded-xl px-6 data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all duration-300">
                  النشطة
                </TabsTrigger>
                <TabsTrigger value="completed" className="rounded-xl px-6 data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all duration-300">
                  المكتملة
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Orders List */}
        <Tabs defaultValue="active" className="w-full">
          <TabsContent value="active" className="mt-0 outline-none">
            <AnimatePresence mode="wait">
              {orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length > 0 ? (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 gap-4"
                >
                  {orders
                    .filter((o) => !["delivered", "cancelled"].includes(o.status))
                    .map((order) => (
                      <motion.div key={order.id} variants={itemVariants}>
                        <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 bg-white overflow-hidden group">
                          <CardContent className="p-0">
                            <div className="flex flex-col lg:flex-row">
                              {/* Order Status Side */}
                              <div className={`lg:w-48 p-6 flex flex-col items-center justify-center text-center border-b lg:border-b-0 lg:border-l border-slate-100 ${getStatusColor(order.status).split(' ')[0]}`}>
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">رقم الطلب</div>
                                <div className="text-2xl font-black text-slate-900 mb-3">#{order.id}</div>
                                <Badge variant="outline" className={`${getStatusColor(order.status)} border-none font-bold px-4 py-1 rounded-full`}>
                                  {getStatusLabel(order.status)}
                                </Badge>
                              </div>

                              {/* Order Details Main */}
                              <div className="flex-1 p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                  <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                      <div className="bg-orange-50 p-2 rounded-lg mt-1">
                                        <MapPin className="h-4 w-4 text-orange-600" />
                                      </div>
                                      <div>
                                        <div className="text-xs font-bold text-slate-400 mb-1">نقطة الاستلام</div>
                                        <div className="text-sm font-bold text-slate-700 line-clamp-1">{order.pickupLocation?.address || "عنوان غير محدد"}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                      <div className="bg-blue-50 p-2 rounded-lg mt-1">
                                        <MapIcon className="h-4 w-4 text-blue-600" />
                                      </div>
                                      <div>
                                        <div className="text-xs font-bold text-slate-400 mb-1">وجهة التسليم</div>
                                        <div className="text-sm font-bold text-slate-700 line-clamp-1">{order.deliveryLocation?.address || "عنوان غير محدد"}</div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-row md:flex-col justify-between md:justify-center items-center md:items-end gap-2">
                                    <div className="text-3xl font-black text-orange-600">
                                      <span className="text-sm font-bold ml-1">ج.م</span>
                                      {order.price?.toLocaleString() || "0"}
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                                      <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> {order.distance?.toFixed(1) || "0"} كم</span>
                                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {order.estimatedTime || "30"} دقيقة</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Driver Info & Actions */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-50">
                                  {order.assignedDriver ? (
                                    <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl w-full sm:w-auto">
                                      <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                                        {order.assignedDriver.name?.[0] || "S"}
                                      </div>
                                      <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">السائق الموكل</div>
                                        <div className="text-sm font-bold text-slate-700">{order.assignedDriver.name}</div>
                                      </div>
                                      <a href={`tel:${order.assignedDriver.phone}`} className="mr-auto sm:mr-4 bg-white p-2 rounded-xl shadow-sm hover:text-orange-600 transition-colors">
                                        <Phone className="h-4 w-4" />
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="text-xs font-bold text-amber-600 bg-amber-50 px-4 py-2 rounded-full animate-pulse">
                                      🔍 جاري البحث عن أقرب سائق...
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                    {!["in_transit", "arrived", "delivered", "cancelled"].includes(order.status) && (
                                      <CancelOrderButton orderId={order.id} onSuccess={() => ordersQuery.refetch()} />
                                    )}
                                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-orange-600 rounded-full group">
                                      التفاصيل <ChevronRight className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200"
                >
                  <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Package className="h-10 w-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">لا توجد طلبات نشطة</h3>
                  <p className="text-slate-500 mb-8">ابدأ الآن واطلب أول شحنة لك بكل سهولة.</p>
                  <Link href="/customer/create-order">
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 rounded-xl">
                      اطلب الآن
                    </Button>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="completed" className="mt-0 outline-none">
            <AnimatePresence mode="wait">
              {orders.filter((o) => ["delivered", "cancelled"].includes(o.status)).length > 0 ? (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {orders
                    .filter((o) => ["delivered", "cancelled"].includes(o.status))
                    .map((order) => (
                      <motion.div key={order.id} variants={itemVariants}>
                        <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 bg-white group">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <div className="text-xs font-bold text-slate-400 mb-1">الطلب #{order.id}</div>
                                <Badge className={`${getStatusColor(order.status)} border-none font-bold rounded-full`}>
                                  {getStatusLabel(order.status)}
                                </Badge>
                              </div>
                              <div className="text-xl font-black text-slate-900">
                                <span className="text-xs font-bold ml-1">ج.م</span>
                                {order.price?.toLocaleString()}
                              </div>
                            </div>
                            
                            <div className="space-y-3 mb-4">
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <MapPin className="h-3 w-3 text-orange-600" />
                                <span className="line-clamp-1">{order.deliveryLocation?.address}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <Calendar className="h-3 w-3" />
                                {new Date(order.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}
                              </div>
                            </div>

                            <Button variant="outline" className="w-full rounded-xl border-slate-100 text-slate-600 hover:bg-slate-50 hover:text-orange-600 transition-all">
                              إعادة الطلب
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200"
                >
                  <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="h-10 w-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">سجل الطلبات فارغ</h3>
                  <p className="text-slate-500">الطلبات التي تكتمل ستظهر هنا لاحقاً.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </main>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden fixed bottom-6 left-4 right-4 z-50">
        <div className="bg-slate-900/90 backdrop-blur-lg rounded-3xl p-2 shadow-2xl border border-white/10 flex justify-around items-center">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 rounded-2xl h-12 w-12">
              <Home className="h-6 w-6" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="text-orange-500 bg-white/10 rounded-2xl h-12 w-12">
            <Package className="h-6 w-6" />
          </Button>
          <Link href="/customer/profile">
            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 rounded-2xl h-12 w-12">
              <User className="h-6 w-6" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
