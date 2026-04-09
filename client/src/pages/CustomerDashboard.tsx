import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Plus, LogOut, User, Home, Truck, Clock, DollarSign, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
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
      variant="destructive"
      size="sm"
      onClick={handleCancel}
      disabled={isLoading}
      className="gap-2"
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
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
        return "bg-yellow-100 text-yellow-800 border border-yellow-300";
      case "assigned":
        return "bg-blue-100 text-blue-800 border border-blue-300";
      case "accepted":
        return "bg-green-100 text-green-800 border border-green-300";
      case "in_transit":
        return "bg-purple-100 text-purple-800 border border-purple-300";
      case "arrived":
        return "bg-orange-100 text-orange-800 border border-orange-300";
      case "delivered":
        return "bg-emerald-100 text-emerald-800 border border-emerald-300";
      case "cancelled":
        return "bg-red-100 text-red-800 border border-red-300";
      default:
        return "bg-gray-100 text-gray-800";
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-background" dir="rtl">
      {/* Header with Navigation */}
      <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 text-white py-8 shadow-lg">
        <div className="container">
          <div className="flex justify-between items-start mb-6">
            <div>
              <Link href="/">
                <h1 className="text-4xl font-bold mb-2 hover:text-orange-100 cursor-pointer transition">
                  🚀 وصلي
                </h1>
              </Link>
              <p className="text-white/90">مرحباً، {user.name || "العميل"}! 👋</p>
            </div>
          </div>

          {/* Navigation Bar */}
          <div className="flex gap-2 border-t border-white/20 pt-4 flex-wrap">
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 transition"
              >
                <Home className="h-4 w-4 ml-2" />
                الرئيسية
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 transition"
              onClick={() => navigate("/customer/dashboard")}
            >
              <Truck className="h-4 w-4 ml-2" />
              لوحة التحكم
            </Button>
            <Link href="/customer/profile">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 transition"
              >
                <User className="h-4 w-4 ml-2" />
                الملف الشخصي
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 ml-auto transition"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 ml-2" />
              تسجيل خروج
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-all border-l-4 border-orange-500 bg-gradient-to-br from-orange-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Truck className="h-5 w-5 text-orange-600" />
                الطلبات النشطة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-orange-600">{activeOrdersCount}</div>
              <p className="text-xs text-muted-foreground mt-1">طلبات قيد التنفيذ</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all border-l-4 border-green-500 bg-gradient-to-br from-green-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-600" />
                الطلبات المكتملة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">{completedOrdersCount}</div>
              <p className="text-xs text-muted-foreground mt-1">طلبات تم تسليمها</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all border-l-4 border-blue-500 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                إجمالي الإنفاق
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600">ج.م {totalSpent.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">على جميع الطلبات</p>
            </CardContent>
          </Card>
        </div>

        {/* Create Order Button */}
        <div className="mb-8">
          <Link href="/customer/create-order">
            <Button className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all">
              <Plus className="h-5 w-5 ml-2" />
              إنشاء طلب جديد
            </Button>
          </Link>
        </div>

        {/* Orders Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-6 bg-gradient-to-r from-orange-100 to-yellow-100">
            <TabsTrigger value="active" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
              الطلبات النشطة ({activeOrdersCount})
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
              الطلبات المكتملة ({completedOrdersCount})
            </TabsTrigger>
          </TabsList>

          {/* Active Orders */}
          <TabsContent value="active" className="space-y-4">
            {orders
              .filter((o) => !["delivered", "cancelled"].includes(o.status))
              .map((order) => (
                <Card key={order.id} className="hover:shadow-xl transition-all border-2 border-orange-200 bg-gradient-to-br from-white to-orange-50">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-xl text-orange-900">الطلب #{order.id}</h3>
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-orange-600">ج.م {order.price?.toFixed(2) || "0.00"}</div>
                          <p className="text-sm text-muted-foreground">{order.distance?.toFixed(1) || "0"} كم</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-orange-100">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-5 w-5 mt-1 text-orange-600 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground font-semibold">📍 موقع الاستلام</p>
                            <p className="font-medium text-sm text-gray-900">{order.pickupLocation?.address || "بدون عنوان"}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-5 w-5 mt-1 text-blue-600 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground font-semibold">📍 موقع التسليم</p>
                            <p className="font-medium text-sm text-gray-900">{order.deliveryLocation?.address || "بدون عنوان"}</p>
                          </div>
                        </div>
                      </div>

                      {/* عرض بيانات السائق إذا تم قبول الطلب */}
                      {(order.status === "accepted" || order.status === "in_transit" || order.status === "arrived") && order.assignedDriver && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-300">
                          <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                            <User className="h-5 w-5 text-green-600" />
                            بيانات السائق
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">الاسم:</span>
                              <span className="font-semibold text-green-900">{order.assignedDriver.name || "غير متوفر"}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">رقم الهاتف:</span>
                              <a href={`tel:${order.assignedDriver.phone}`} className="font-semibold text-green-600 hover:text-green-700 underline">
                                {order.assignedDriver.phone || "غير متوفر"}
                              </a>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t border-orange-200 flex gap-2 justify-end">
                        {!["in_transit", "arrived", "delivered", "cancelled"].includes(order.status) && (
                          <CancelOrderButton orderId={order.id} onSuccess={() => ordersQuery.refetch()} />
                        )}
                      </div>

                      <div className="pt-2 border-t border-orange-200">
                        <p className="text-sm text-muted-foreground">
                          ⏱️ الوقت المتوقع: {order.estimatedTime || "30"} دقيقة
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            {activeOrdersCount === 0 && (
              <Card className="border-2 border-dashed border-orange-300 bg-orange-50">
                <CardContent className="pt-6 text-center">
                  <Truck className="h-12 w-12 text-orange-300 mx-auto mb-3" />
                  <p className="text-muted-foreground font-semibold">لا توجد طلبات نشطة حالياً</p>
                  <p className="text-sm text-muted-foreground mt-1">ابدأ بإنشاء طلب جديد!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Completed Orders */}
          <TabsContent value="completed" className="space-y-4">
            {orders
              .filter((o) => ["delivered", "cancelled"].includes(o.status))
              .map((order) => (
                <Card key={order.id} className="hover:shadow-xl transition-all border-2 border-emerald-200 bg-gradient-to-br from-white to-emerald-50">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-xl text-emerald-900">الطلب #{order.id}</h3>
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-emerald-600">ج.م {order.price?.toFixed(2) || "0.00"}</div>
                          <p className="text-sm text-muted-foreground">{order.distance?.toFixed(1) || "0"} كم</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-emerald-100">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-5 w-5 mt-1 text-orange-600 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground font-semibold">📍 موقع الاستلام</p>
                            <p className="font-medium text-sm text-gray-900">{order.pickupLocation?.address || "بدون عنوان"}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-5 w-5 mt-1 text-blue-600 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground font-semibold">📍 موقع التسليم</p>
                            <p className="font-medium text-sm text-gray-900">{order.deliveryLocation?.address || "بدون عنوان"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            {completedOrdersCount === 0 && (
              <Card className="border-2 border-dashed border-emerald-300 bg-emerald-50">
                <CardContent className="pt-6 text-center">
                  <Clock className="h-12 w-12 text-emerald-300 mx-auto mb-3" />
                  <p className="text-muted-foreground font-semibold">لم تكمل أي طلبات بعد</p>
                  <p className="text-sm text-muted-foreground mt-1">ابدأ بإنشاء طلب جديد!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
