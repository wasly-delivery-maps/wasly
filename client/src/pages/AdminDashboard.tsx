import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Users, Truck, ShoppingBag, TrendingUp, LogOut, BarChart3, User, Home, Download } from "lucide-react";
import { toast } from "sonner";
import { UsersManagement } from "@/components/admin/UsersManagement";
import { OrdersManagement } from "@/components/admin/OrdersManagement";
import { CommissionsManagement } from "@/components/admin/CommissionsManagement";
import { Input } from "@/components/ui/input";

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const statsQuery = trpc.admin.getStatistics.useQuery();
  const usersQuery = trpc.admin.getAllUsers.useQuery();
  const ordersQuery = trpc.admin.getAllOrders.useQuery();
  const reportQuery = trpc.admin.getReportData.useQuery(
    {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    },
    { enabled: false }
  );

  useEffect(() => {
    if (statsQuery.data) {
      setStats(statsQuery.data);
    }
  }, [statsQuery.data]);

  useEffect(() => {
    if (usersQuery.data) {
      setUsers(usersQuery.data);
    }
  }, [usersQuery.data]);

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

  if (!user || user.role !== "admin") {
    navigate("/");
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast.success("تم تسجيل الخروج بنجاح");
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const result = await reportQuery.refetch();
      if (result.data) {
        const { drivers, orders: reportOrders, statistics } = result.data;
        
        const csvContent = [
          ['الإحصائيات'],
          ['إجمالي الطلبات', statistics.totalOrders],
          ['الطلبات المكتملة', statistics.completedOrders],
          [],
          ['السائقون'],
          ['الاسم', 'الهاتف', 'الحالة', 'عدد الطلبات'],
          ...drivers.map(d => [d.name, d.phone, d.accountStatus, d.totalOrders]),
        ];
        
        const csvString = csvContent.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `تقرير_wasly_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("تم تصدير التقرير بنجاح");
      }
    } catch (error) {
      toast.error("فشل في تصدير التقرير");
    } finally {
      setIsExporting(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "مسؤول";
      case "driver":
        return "سائق";
      case "customer":
        return "عميل";
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "driver":
        return "bg-blue-100 text-blue-800";
      case "customer":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "قيد الانتظار",
      assigned: "مسند",
      accepted: "مقبول",
      in_delivery: "قيد التسليم",
      delivered: "مسلم",
      cancelled: "ملغى",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "assigned":
        return "bg-blue-100 text-blue-800";
      case "accepted":
        return "bg-blue-100 text-blue-800";
      case "in_delivery":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === "delivered").length;
  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
  const totalDrivers = users.filter((u) => u.role === "driver").length;
  const totalCustomers = users.filter((u) => u.role === "customer").length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-background" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 text-white py-8 shadow-lg">
        <div className="container">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 flex items-center gap-2"
                onClick={() => navigate("/")}
                title="الصفحة الرئيسية"
              >
                <Home className="h-5 w-5" />
                <span className="hidden sm:inline">الرئيسية</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 flex items-center gap-2"
                onClick={() => navigate("/admin/profile")}
                title="الملف الشخصي"
              >
                <User className="h-5 w-5" />
                <span className="hidden sm:inline">الملف الشخصي</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 flex items-center gap-2"
                onClick={handleLogout}
                title="تسجيل الخروج"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">خروج</span>
              </Button>
              </div>
            </div>
            <div className="text-center flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold mb-1">لوحة التحكم</h1>
              <p className="text-white/90 text-sm sm:text-base">إدارة النظام والمستخدمين والطلبات</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="font-semibold">{user.name || "المسؤول"}</p>
                <p className="text-xs text-white/80">مسؤول النظام</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-gradient-to-b from-orange-50 to-transparent py-6 border-b border-orange-200">
        <div className="container">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">من التاريخ</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">إلى التاريخ</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "جاري التصدير..." : "تصدير التقرير"}
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="border-l-4 border-blue-500 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                إجمالي المستخدمين
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{users.length}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-green-500 bg-gradient-to-br from-green-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Truck className="h-5 w-5 text-green-600" />
                السائقون
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{totalDrivers}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-purple-500 bg-gradient-to-br from-purple-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                العملاء
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{totalCustomers}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-orange-500 bg-gradient-to-br from-orange-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-orange-600" />
                إجمالي الطلبات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{totalOrders}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-yellow-500 bg-gradient-to-br from-yellow-50 to-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
                معدل الإنجاز
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="users">إدارة المستخدمين</TabsTrigger>
            <TabsTrigger value="orders">إدارة الطلبات</TabsTrigger>
            <TabsTrigger value="commissions">إدارة العمولات</TabsTrigger>
            <TabsTrigger value="analytics">التحليلات</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
                <CardHeader>
                  <CardTitle className="text-lg">الطلبات المكتملة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-green-600 mb-2">{completedOrders}</div>
                  <p className="text-sm text-muted-foreground">
                    {totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0}% من الطلبات
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                <CardHeader>
                  <CardTitle className="text-lg">الطلبات النشطة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-blue-600 mb-2">{activeOrders}</div>
                  <p className="text-sm text-muted-foreground">
                    {totalOrders > 0 ? Math.round((activeOrders / totalOrders) * 100) : 0}% من الطلبات
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white">
                <CardHeader>
                  <CardTitle className="text-lg">الطلبات الملغاة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-red-600 mb-2">
                    {orders.filter((o) => o.status === "cancelled").length}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {totalOrders > 0
                      ? Math.round(
                          (orders.filter((o) => o.status === "cancelled").length / totalOrders) * 100
                        )
                      : 0}
                    % من الطلبات
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <UsersManagement users={users} />
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <OrdersManagement orders={orders} />
          </TabsContent>

          {/* Commissions Tab */}
          <TabsContent value="commissions">
            <CommissionsManagement drivers={users.filter((u) => u.role === "driver")} />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    توزيع المستخدمين
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">السائقون</span>
                        <span className="text-sm font-bold">{totalDrivers}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${users.length > 0 ? (totalDrivers / users.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">العملاء</span>
                        <span className="text-sm font-bold">{totalCustomers}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${users.length > 0 ? (totalCustomers / users.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    حالة الطلبات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">مكتملة</span>
                        <span className="text-sm font-bold">{completedOrders}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">نشطة</span>
                        <span className="text-sm font-bold">{activeOrders}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${totalOrders > 0 ? (activeOrders / totalOrders) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
