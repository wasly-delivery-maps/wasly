import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Plus, LogOut, User, Truck, Clock, DollarSign, X, Phone, Calendar, ChevronRight, Package, Search, CheckCircle2, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useMemo } from "react";
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
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCancel}
      disabled={isLoading}
      className="text-rose-500 hover:bg-rose-50 font-bold text-xs"
    >
      {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3.5 w-3.5 ml-1" />}
      إلغاء الطلب
    </Button>
  );
}

export default function CustomerDashboard() {
  const { user, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const ordersQuery = trpc.orders.getCustomerOrders.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const orders = useMemo(() => ordersQuery.data || [], [ordersQuery.data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 text-orange-600 animate-spin" />
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="bg-orange-600 p-1.5 rounded-lg">
                  <Truck className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-black text-slate-900">وصلي</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-bold text-slate-900">{user.name}</span>
              <span className="text-[10px] font-bold text-orange-600 uppercase">عميل مميز</span>
            </div>
            <Link href="/customer/profile">
              <Button variant="ghost" size="icon" className="rounded-full bg-slate-100 h-10 w-10">
                <User className="h-5 w-5 text-slate-600" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-rose-500 hover:bg-rose-50 rounded-full h-10 w-10">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Welcome & Action */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">أهلاً بك، {user.name.split(' ')[0]} 👋</h2>
            <p className="text-slate-500 font-medium">تتبع طلباتك وتحركاتك بكل سهولة.</p>
          </div>
          <Link href="/customer/create-order">
            <Button className="bg-orange-600 hover:bg-orange-700 text-white font-black px-8 py-6 rounded-2xl shadow-lg shadow-orange-100 transition-all active:scale-95">
              <Plus className="h-5 w-5 ml-2" />
              اطلب الآن
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { label: "طلبات نشطة", value: activeOrders.length, icon: Truck, color: "text-orange-600", bg: "bg-orange-50" },
            { label: "طلبات مكتملة", value: completedOrders.length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "إجمالي الإنفاق", value: `ج.م ${totalSpent.toLocaleString()}`, icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" }
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-sm bg-white rounded-2xl">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`${stat.bg} p-3 rounded-xl`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900">{stat.value}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Orders Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="bg-slate-100 p-1 rounded-xl mb-6">
            <TabsTrigger value="active" className="rounded-lg px-6 font-bold data-[state=active]:bg-white data-[state=active]:text-orange-600">
              النشطة ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-lg px-6 font-bold data-[state=active]:bg-white data-[state=active]:text-orange-600">
              المكتملة ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <div className="space-y-4">
              {activeOrders.length > 0 ? (
                activeOrders.map((order) => {
                  const status = getStatusInfo(order.status);
                  return (
                    <Card key={order.id} className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between md:justify-start gap-4">
                              <span className="text-sm font-black text-slate-900">طلب #{order.id}</span>
                              <Badge className={`${status.color} border-none font-bold px-3 py-1 rounded-full text-[10px]`}>
                                {status.label}
                              </Badge>
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <div className="h-2 w-2 rounded-full bg-orange-600 mt-1.5 flex-shrink-0" />
                                <p className="text-sm font-medium text-slate-600 line-clamp-1">{order.pickupLocation?.address}</p>
                              </div>
                              <div className="flex items-start gap-3">
                                <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                <p className="text-sm font-medium text-slate-600 line-clamp-1">{order.deliveryLocation?.address}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                            <div className="text-2xl font-black text-orange-600">ج.م {order.price}</div>
                            <div className="flex items-center gap-2">
                              {!["in_transit", "arrived", "delivered", "cancelled"].includes(order.status) && (
                                <CancelOrderButton orderId={order.id} onSuccess={() => ordersQuery.refetch()} />
                              )}
                              <Button variant="outline" size="sm" className="rounded-lg font-bold text-xs">التفاصيل</Button>
                            </div>
                          </div>
                        </div>
                        {order.assignedDriver && (
                          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                <User className="h-4 w-4 text-slate-400" />
                              </div>
                              <span className="text-xs font-bold text-slate-700">{order.assignedDriver.name}</span>
                            </div>
                            <a href={`tel:${order.assignedDriver.phone}`} className="text-orange-600 bg-orange-50 p-2 rounded-lg hover:bg-orange-100 transition-colors">
                              <Phone className="h-4 w-4" />
                            </a>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
                  <Package className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold">لا توجد طلبات نشطة حالياً</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedOrders.length > 0 ? (
                completedOrders.map((order) => {
                  const status = getStatusInfo(order.status);
                  return (
                    <Card key={order.id} className="border-none shadow-sm bg-white rounded-2xl">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-xs font-bold text-slate-400 mb-1">الطلب #{order.id}</p>
                            <Badge className={`${status.color} border-none font-bold px-2 py-0.5 rounded-full text-[9px]`}>
                              {status.label}
                            </Badge>
                          </div>
                          <div className="text-xl font-black text-slate-900">ج.م {order.price}</div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-4">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                        </div>
                        <Button variant="outline" className="w-full rounded-xl font-bold text-xs h-10">إعادة الطلب</Button>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100">
                  <p className="text-slate-400 font-bold">سجل الطلبات فارغ</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
