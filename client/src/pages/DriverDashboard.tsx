import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, LogOut, User, Home, Truck, Clock, DollarSign, Phone, Mail, Navigation, AlertCircle } from "lucide-react";
import { formatPrice } from "@shared/pricing";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";
import { COOKIE_NAME } from "@shared/const";
import { useNotifications } from "@/hooks/useNotifications";
import { CommissionCard } from "@/components/CommissionCard";
import { OrderNotification } from "@/components/OrderNotification";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import { RouteModal } from "@/components/RouteModal";

export default function DriverDashboard() {
  const { startPolling, stopPolling, requestNotificationPermission, sendBrowserNotification, showToastNotification } = useNotifications();
  const { user, loading, logout } = useAuth();
  const {
    currentOrder,
    isNotificationVisible,
    dismissNotification,
    acceptOrder,
  } = useOrderNotifications();
  const [, navigate] = useLocation();
  const [orders, setOrders] = useState<any[]>([]);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("active");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [selectedOrderForRoute, setSelectedOrderForRoute] = useState<any>(null);

  const ordersQuery = trpc.orders.getDriverOrders.useQuery();
  const availableQuery = trpc.orders.getAvailableOrders.useQuery();
  const updateStatusMutation = trpc.orders.updateOrderStatus.useMutation();
  const completeOrderMutation = trpc.orders.completeOrder.useMutation();
  const acceptOrderMutation = trpc.orders.acceptOrder.useMutation();
  const rejectOrderMutation = trpc.orders.rejectOrder.useMutation();
  const updateLocationMutation = trpc.location.updateDriverLocation.useMutation({
    onError: (error) => {
      console.error("Location update error:", error);
      // Don't show error toast for location updates - they happen frequently
      // and the location is updated even if there's a network issue
    },
  });
  // Component to display customer details for each order
  const CustomerOrderDetails = ({ orderId }: { orderId: number }) => {
    const customerQuery = trpc.orders.getOrderWithCustomer.useQuery(
      { orderId },
      { enabled: !!orderId }
    );

    if (customerQuery.isLoading) {
      return <div className="text-sm text-muted-foreground">جاري التحميل...</div>;
    }

    if (!customerQuery.data) {
      return null;
    }

    return (
      <div className="bg-blue-50 p-4 rounded-lg mb-4 space-y-2">
        <h4 className="font-semibold text-blue-900">بيانات العميل</h4>
        <p className="text-sm"><strong>الاسم:</strong> {customerQuery.data.customer?.name || "غير معروف"}</p>
        <p className="text-sm"><strong>الهاتف:</strong> {customerQuery.data.customer?.phone || "لا يوجد"}</p>
        <p className="text-sm"><strong>البريد:</strong> {customerQuery.data.customer?.email || "لا يوجد"}</p>
        {customerQuery.data.notes && (
          <div className="bg-yellow-100 p-2 rounded mt-2 border-l-4 border-yellow-500">
            <p className="text-sm"><strong>ملاحظات:</strong> {customerQuery.data.notes}</p>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (ordersQuery.data) {
      setOrders(ordersQuery.data);
    }
  }, [ordersQuery.data]);

  useEffect(() => {
    if (availableQuery.data) {
      setAvailableOrders(availableQuery.data);
    }
  }, [availableQuery.data]);

  // Track driver location using Geolocation API
  useEffect(() => {
    if (!user || user.role !== "driver") return;

    // Get initial location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setDriverLocation({ latitude, longitude });
          // Send location to server (silently, don't show errors)
          updateLocationMutation.mutate({ latitude, longitude });
        },
        (error) => {
          console.warn("Geolocation error:", error);
          toast.error("فشل في الحصول على موقعك. يرجى تفعيل خدمة الموقع.");
        }
      );

      // Watch position for real-time updates
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setDriverLocation({ latitude, longitude });
          // Send location to server (silently, don't show errors)
          updateLocationMutation.mutate({ latitude, longitude });
        },
        (error) => {
          console.warn("Geolocation watch error:", error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [user]);

  // Setup polling for new orders
  useEffect(() => {
    if (!user || user.role !== "driver") return;

    // Request notification permission from browser
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        console.log('[Driver] Browser notification permission:', permission);
      });
    }

    // Request notification permission from custom hook
    requestNotificationPermission();

    // Start polling for new orders every 5 seconds
    startPolling(() => {
      availableQuery.refetch();
    }, 5000);

    return () => {
      stopPolling();
    };
  }, [user, startPolling, stopPolling, requestNotificationPermission, availableQuery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 to-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!user || user.role !== "driver") {
    navigate("/auth");
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast.success("تم تسجيل الخروج بنجاح");
  };

  const handleAcceptOrder = async (orderId: number) => {
    try {
      // Update order status to "accepted" to start delivery
      await updateStatusMutation.mutateAsync({
        orderId,
        status: "accepted",
      });
      toast.success("تم قبول الطلب وبدء التوصيل!");
      // Remove from available orders
      setAvailableOrders(availableOrders.filter(order => order.id !== orderId));
      // Refresh active orders
      ordersQuery.refetch();
    } catch (error) {
      toast.error("فشل في قبول الطلب");
    }
  };

  const handleRejectOrder = (orderId: number) => {
    // Remove the order from local state only (no API call)
    setAvailableOrders(availableOrders.filter(order => order.id !== orderId));
    toast.success("تم حذف الطلب من قائمتك");
  };

  const handleUpdateStatus = async (orderId: number, status: string) => {
    try {
      if (status === "delivered") {
        const result = await completeOrderMutation.mutateAsync({
          orderId,
          paymentConfirmation: undefined,
        });
        
        if (result.isSuspended) {
          toast.error(result.message);
        } else {
          toast.success(result.message);
        }
      } else {
        await updateStatusMutation.mutateAsync({
          orderId,
          status: status as any,
        });
        toast.success("تم تحديث حالة الطلب!");
      }
      ordersQuery.refetch();
    } catch (error) {
      toast.error("فشل في تحديث حالة الطلب");
    }
  };

  const openGoogleMaps = (order: any, type: string) => {
    try {
      // Use real driver location if available, otherwise use default
      const currentLocation = driverLocation 
        ? `${driverLocation.latitude},${driverLocation.longitude}`
        : "30.1200,31.4500";
      
      if (type === "delivery") {
        const pickup = `${order.pickupLocation.latitude},${order.pickupLocation.longitude}`;
        const destination = `${order.deliveryLocation.latitude},${order.deliveryLocation.longitude}`;
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation}&destination=${destination}&waypoints=${pickup}&travelmode=driving`;
        window.open(mapsUrl, "_blank");
        toast.success("تم فتح الخرائط مع المسار الكامل!");
      } else if (type === "pickup") {
        const pickup = `${order.pickupLocation.latitude},${order.pickupLocation.longitude}`;
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation}&destination=${pickup}&travelmode=driving`;
        window.open(mapsUrl, "_blank");
        toast.success("تم فتح موقع الاستلام!");
      }
    } catch (error) {
      toast.error("فشل في فتح الخرائط");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "accepted":
        return "bg-green-100 text-green-800 border-green-300";
      case "in_transit":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "arrived":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "delivered":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      assigned: "معين",
      accepted: "مقبول",
      in_transit: "في الطريق",
      arrived: "وصل",
      delivered: "تم التسليم",
    };
    return labels[status] || status;
  };

  const activeOrdersCount = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
  const completedTodayCount = orders.filter((o) => o.status === "delivered").length;
  const totalEarnings = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + (o.price || 0), 0);

  // Get commission data from user
  const pendingCommission = user?.pendingCommission ? parseFloat(user.pendingCommission.toString()) : 0;
  const paidCommission = user?.paidCommission ? parseFloat(user.paidCommission.toString()) : 0;
  const accountStatus = user?.accountStatus || "active";

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
              <p className="text-white/90">مرحباً، {user.name || "السائق"}! 👋</p>
              {driverLocation && (
                <p className="text-white/70 text-sm mt-1">
                  📍 موقعك الحالي: {driverLocation.latitude.toFixed(4)}, {driverLocation.longitude.toFixed(4)}
                </p>
              )}
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
              onClick={() => navigate("/driver/dashboard")}
            >
              <Truck className="h-4 w-4 ml-2" />
              لوحة التحكم
            </Button>
            <Link href="/driver/profile">
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
        {/* Commission Card - Show if there are pending commissions or account is suspended */}
        {(pendingCommission > 0 || accountStatus !== "active") && (
          <div className="mb-8">
            <CommissionCard
              pendingCommission={pendingCommission}
              paidCommission={paidCommission}
              accountStatus={accountStatus}
            />
          </div>
        )}

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
                المكتملة اليوم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">{completedTodayCount}</div>
              <p className="text-xs text-muted-foreground mt-1">طلبات تم تسليمها</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all border-l-4 border-blue-500 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                الأرباح اليوم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600">ج.م {totalEarnings.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">إجمالي الأرباح</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-gradient-to-r from-orange-100 to-yellow-100">
            <TabsTrigger value="active" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
              الطلبات النشطة ({activeOrdersCount})
            </TabsTrigger>
            <TabsTrigger value="available" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
              الطلبات المتاحة ({availableOrders.length})
            </TabsTrigger>
          </TabsList>

          {/* Active Orders Tab */}
          <TabsContent value="active" className="space-y-4">
            {orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">لا توجد طلبات نشطة حالياً</p>
                </CardContent>
              </Card>
            ) : (
              orders
                .filter((o) => !["delivered", "cancelled"].includes(o.status))
                .map((order) => (
                  <Card key={order.id} className="hover:shadow-md transition-all border-l-4 border-orange-500">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">طلب #{order.id}</h3>
                          <Badge className={`mt-2 ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-orange-600">{formatPrice(order.price || 0)}</p>
                          <p className="text-sm text-muted-foreground">{order.distance || 0} كم</p>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <CustomerOrderDetails orderId={order.id} />

                      {/* Locations */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-green-50 p-3 rounded">
                          <p className="text-xs text-muted-foreground">موقع الاستلام</p>
                          <p className="text-sm font-semibold text-green-700">{order.pickupLocation?.address}</p>
                        </div>
                        <div className="bg-red-50 p-3 rounded">
                          <p className="text-xs text-muted-foreground">موقع التسليم</p>
                          <p className="text-sm font-semibold text-red-700">{order.deliveryLocation?.address}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-wrap">
                        {order.status === "accepted" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openGoogleMaps(order, "pickup")}
                              className="flex-1"
                            >
                              <Navigation className="h-4 w-4 ml-2" />
                              موقع الاستلام
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openGoogleMaps(order, "delivery")}
                              className="flex-1 bg-orange-600 hover:bg-orange-700"
                            >
                              <Navigation className="h-4 w-4 ml-2" />
                              المسار الكامل
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(order.id, "in_transit")}
                              className="flex-1"
                            >
                              في الطريق
                            </Button>
                          </>
                        )}
                        {order.status === "in_transit" && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(order.id, "arrived")}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                          >
                            وصلت
                          </Button>
                        )}
                        {order.status === "arrived" && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(order.id, "delivered")}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            تم التسليم
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </TabsContent>

          {/* Available Orders Tab */}
          <TabsContent value="available" className="space-y-4">
            {availableOrders.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">لا توجد طلبات متاحة حالياً</p>
                </CardContent>
              </Card>
            ) : (
              availableOrders.map((order) => (
                <Card key={order.id} className="hover:shadow-md transition-all border-l-4 border-green-500">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">طلب جديد #{order.id}</h3>
                        <Badge className="mt-2 bg-green-100 text-green-800">متاح</Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">{formatPrice(order.price || 0)}</p>
                        <p className="text-sm text-muted-foreground">{order.distance || 0} كم</p>
                      </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="bg-yellow-50 p-3 rounded mb-4 border-l-4 border-yellow-500">
                        <p className="text-xs text-muted-foreground font-semibold">ملاحظات العميل:</p>
                        <p className="text-sm text-yellow-900 mt-1">{order.notes}</p>
                      </div>
                    )}

                    {/* Locations */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-green-50 p-3 rounded">
                        <p className="text-xs text-muted-foreground">موقع الاستلام</p>
                        <p className="text-sm font-semibold text-green-700">{order.pickupLocation?.address}</p>
                      </div>
                      <div className="bg-red-50 p-3 rounded">
                        <p className="text-xs text-muted-foreground">موقع التسليم</p>
                        <p className="text-sm font-semibold text-red-700">{order.deliveryLocation?.address}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 w-full">
                      {accountStatus === "active" ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleAcceptOrder(order.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            disabled={acceptOrderMutation.isPending}
                          >
                            قبول الطلب
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrderForRoute(order);
                              setShowRouteModal(true);
                            }}
                            className="flex-1"
                          >
                            <Navigation className="h-4 w-4 ml-2" />
                            المسار
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectOrder(order.id)}
                            className="flex-1"
                            disabled={rejectOrderMutation.isPending}
                          >
                            الغاء
                          </Button>
                        </>
                      ) : (
                        <div className="w-full bg-red-100 border border-red-300 rounded-lg p-3 flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-red-800">
                              حسابك موقوف
                            </p>
                            <p className="text-xs text-red-700">
                              يرجى سداد العمولات المستحقة ({pendingCommission.toFixed(2)} ج.م) لتفعيل الحساب
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Order Notification */}
        <OrderNotification
          order={currentOrder}
          onDismiss={dismissNotification}
          onAccept={acceptOrder}
          isVisible={isNotificationVisible}
        />

        {/* Route Modal */}
        {selectedOrderForRoute && (
          <RouteModal
            isOpen={showRouteModal}
            onClose={() => {
              setShowRouteModal(false);
              setSelectedOrderForRoute(null);
            }}
            pickupLocation={{
              address: selectedOrderForRoute.pickupLocation?.address || "Pickup Location",
              latitude: selectedOrderForRoute.pickupLocation?.latitude || 0,
              longitude: selectedOrderForRoute.pickupLocation?.longitude || 0,
            }}
            deliveryLocation={{
              address: selectedOrderForRoute.deliveryLocation?.address || "Delivery Location",
              latitude: selectedOrderForRoute.deliveryLocation?.latitude || 0,
              longitude: selectedOrderForRoute.deliveryLocation?.longitude || 0,
            }}
            orderId={selectedOrderForRoute.id}
          />
        )}
      </div>
    </div>
  );
}
