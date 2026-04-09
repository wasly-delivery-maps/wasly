import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowRight, Mail, Phone, MapPin, Star, Truck, LogOut, Home, HelpCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";

export default function DriverProfile() {
  const { user, loading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const ordersQuery = trpc.orders.getDriverOrders.useQuery();
  const updateProfileMutation = trpc.users.updateProfile.useMutation();

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

  const handleSaveProfile = async () => {
    try {
      await updateProfileMutation.mutateAsync(editData);
      toast.success("تم تحديث البيانات بنجاح");
      setIsEditing(false);
    } catch (error) {
      toast.error("فشل في تحديث البيانات");
    }
  };

  const orders = ordersQuery.data || [];
  const completedOrders = orders.filter((o) => o.status === "delivered").length;
  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
  const totalEarnings = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + (o.price || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-background" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 text-white py-8 shadow-lg">
        <div className="container">
          <div className="flex justify-between items-start">
            <Link href="/driver/dashboard">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <ArrowRight className="h-4 w-4 ml-2" />
                العودة
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">الملف الشخصي</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                    <span className="text-4xl">🚗</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{editData.name || "السائق"}</h2>
                    <Badge className={`mt-2 ${
                      user?.accountStatus === "active"
                        ? "bg-green-500 text-white"
                        : user?.accountStatus === "suspended"
                        ? "bg-yellow-500 text-white"
                        : "bg-red-500 text-white"
                    }`}>
                      {user?.accountStatus === "active"
                        ? "نشط"
                        : user?.accountStatus === "suspended"
                        ? "معلق"
                        : "موقوف"}
                    </Badge>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="mt-6 space-y-3 border-t pt-6">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-orange-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                      <a href={`tel:${editData.phone}`} className="font-medium text-blue-600 hover:underline">
                        {editData.phone}
                      </a>
                    </div>
                  </div>
                  {editData.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-orange-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                        <a href={`mailto:${editData.email}`} className="font-medium text-blue-600 hover:underline">
                          {editData.email}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Edit Button */}
                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="w-full mt-6 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white"
                  >
                    تعديل البيانات
                  </Button>
                ) : (
                  <div className="space-y-3 mt-6">
                    <Input
                      placeholder="الاسم"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="text-right"
                    />
                    <Input
                      placeholder="البريد الإلكتروني"
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      className="text-right"
                    />
                    <Input
                      placeholder="رقم الهاتف"
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      className="text-right"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveProfile}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                      </Button>
                      <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1">
                        إلغاء
                      </Button>
                    </div>
                  </div>
                )}

                {/* Logout Button */}
                <Button
                  variant="outline"
                  className="w-full mt-3 border-red-300 text-red-600 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 ml-2" />
                  تسجيل خروج
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Statistics & Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-blue-500 bg-gradient-to-br from-blue-50 to-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-600" />
                    الطلبات النشطة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{activeOrders}</div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-green-500 bg-gradient-to-br from-green-50 to-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Star className="h-5 w-5 text-green-600" />
                    المكتملة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{completedOrders}</div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-yellow-500 bg-gradient-to-br from-yellow-50 to-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <span className="text-lg">💰</span>
                    الأرباح
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">ج.م {totalEarnings.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-red-500 bg-gradient-to-br from-red-50 to-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <span className="text-lg">📊</span>
                    العمولات المستحقة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">ج.م {parseFloat((user?.pendingCommission || "0").toString()).toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-2">3 جنيه لكل طلب</p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Card */}
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-purple-600" />
                  الأداء
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">معدل الإنجاز</span>
                    <span className="text-sm font-bold text-purple-600">
                      {completedOrders + activeOrders > 0
                        ? Math.round((completedOrders / (completedOrders + activeOrders)) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-purple-400 h-2 rounded-full transition-all"
                      style={{
                        width: `${
                          completedOrders + activeOrders > 0
                            ? (completedOrders / (completedOrders + activeOrders)) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
                    <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">متوسط التقييم</p>
                    <p className="text-2xl font-bold text-yellow-500">4.8 ⭐</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support Center Card */}
            <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-red-600" />
                  مركز المساعدة والدعم
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-700">
                  هل تواجه أي مشاكل أو لديك استفسارات؟ تواصل معنا الآن!
                </p>
                <div className="bg-white p-4 rounded-lg border border-red-100">
                  <div className="flex items-center gap-3">
                    <Phone className="h-6 w-6 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">رقم الدعم الفني</p>
                      <div className="flex gap-3 items-center">
                        <a href="tel:01557564373" className="text-lg font-bold text-red-600 hover:underline">
                          01557564373
                        </a>
                        <a href="https://wa.me/201557564373" target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:underline font-medium">
                          واتس آب
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  متاح 24/7 للإجابة على جميع استفساراتك
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
