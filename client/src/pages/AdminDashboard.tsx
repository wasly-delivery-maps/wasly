import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: usersData } = trpc.users.getAllUsers.useQuery();
  const { data: ordersData } = trpc.orders.getAllOrders.useQuery();

  useEffect(() => {
    if (usersData) setUsers(usersData);
    if (ordersData) setOrders(ordersData);
    setIsLoading(false);
  }, [usersData, ordersData]);

  const handleLogout = async () => {
    try {
      // Logout logic here
      toast.success("تم تسجيل الخروج بنجاح");
    } catch (error) {
      toast.error("خطأ في تسجيل الخروج");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">لوحة تحكم المسؤول</h1>
          <Button onClick={handleLogout} variant="outline">
            تسجيل الخروج
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <h3 className="text-gray-600 text-sm font-medium">إجمالي المستخدمين</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{users.length}</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-gray-600 text-sm font-medium">إجمالي الطلبات</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">{orders.length}</p>
          </Card>
          <Card className="p-6">
            <h3 className="text-gray-600 text-sm font-medium">السائقين النشطين</h3>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              {users.filter((u) => u.role === "driver" && u.isActive).length}
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-gray-600 text-sm font-medium">الطلبات المعلقة</h3>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {orders.filter((o) => o.status === "pending").length}
            </p>
          </Card>
        </div>

        {/* Users Table */}
        <Card className="p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">المستخدمون</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-gray-600">الاسم</th>
                  <th className="px-4 py-2 text-gray-600">الهاتف</th>
                  <th className="px-4 py-2 text-gray-600">الدور</th>
                  <th className="px-4 py-2 text-gray-600">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{user.name}</td>
                    <td className="px-4 py-3">{user.phone}</td>
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {user.role === "admin" ? "مسؤول" : user.role === "driver" ? "سائق" : "عميل"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {user.isActive ? "نشط" : "معطل"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Orders Table */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">الطلبات</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-gray-600">رقم الطلب</th>
                  <th className="px-4 py-2 text-gray-600">العميل</th>
                  <th className="px-4 py-2 text-gray-600">السائق</th>
                  <th className="px-4 py-2 text-gray-600">الحالة</th>
                  <th className="px-4 py-2 text-gray-600">السعر</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">#{order.id}</td>
                    <td className="px-4 py-3">{order.customerId}</td>
                    <td className="px-4 py-3">{order.driverId || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{order.price || "-"} ريال</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
