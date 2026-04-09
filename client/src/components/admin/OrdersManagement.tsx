import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Trash2, Search } from "lucide-react";

interface Order {
  id: number;
  status: string;
  customerId: number;
  driverId?: number;
  price: number;
  createdAt: Date;
  customerName?: string;
  driverName?: string;
}

export function OrdersManagement({ orders: initialOrders }: { orders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [ordersWithNames, setOrdersWithNames] = useState<Order[]>([]);
  
  const usersQuery = trpc.users.getAllUsers.useQuery();
  const deleteOrderMutation = trpc.admin.deleteOrder.useMutation();
  
  useEffect(() => {
    if (usersQuery.data && orders.length > 0) {
      const usersMap = new Map(usersQuery.data.map((u: any) => [u.id, u.name]));
      const enrichedOrders = orders.map((order) => ({
        ...order,
        customerName: usersMap.get(order.customerId) || `عميل #${order.customerId}`,
        driverName: order.driverId ? usersMap.get(order.driverId) || `سائق #${order.driverId}` : "غير مسند",
      }));
      setOrdersWithNames(enrichedOrders);
    }
  }, [usersQuery.data, orders]);

  const filteredOrders = ordersWithNames.filter((order) => {
    const matchesSearch = order.id.toString().includes(searchTerm) || 
                         order.customerName?.includes(searchTerm) || 
                         order.driverName?.includes(searchTerm);
    const matchesStatus = selectedStatus === "all" || order.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleDeleteOrder = async (orderId: number) => {
    if (!confirm(`هل أنت متأكد من حذف الطلب #${orderId}؟ هذا الإجراء لا يمكن التراجع عنه.`))
      return;

    try {
      await deleteOrderMutation.mutateAsync({ orderId });
      setOrders(orders.filter((o) => o.id !== orderId));
      toast.success(`تم حذف الطلب #${orderId} بنجاح`);
    } catch (error) {
      toast.error("فشل في حذف الطلب");
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>إدارة الطلبات</span>
          <span className="text-sm font-normal text-muted-foreground">
            {filteredOrders.length} من {orders.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="ابحث عن رقم الطلب أو الاسم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">جميع الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="assigned">مسند</option>
            <option value="accepted">مقبول</option>
            <option value="in_delivery">قيد التسليم</option>
            <option value="delivered">مسلم</option>
            <option value="cancelled">ملغى</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-right py-3 px-4 font-semibold">رقم الطلب</th>
                <th className="text-right py-3 px-4 font-semibold">العميل</th>
                <th className="text-right py-3 px-4 font-semibold">السائق</th>
                <th className="text-right py-3 px-4 font-semibold">السعر</th>
                <th className="text-right py-3 px-4 font-semibold">الحالة</th>
                <th className="text-right py-3 px-4 font-semibold">التاريخ</th>
                <th className="text-right py-3 px-4 font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    لا توجد نتائج
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold">#{order.id}</td>
                    <td className="py-3 px-4 text-sm font-medium">{order.customerName}</td>
                    <td className="py-3 px-4 text-sm font-medium">{order.driverName}</td>
                    <td className="py-3 px-4 font-semibold">ج.م {order.price.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {new Date(order.createdAt).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteOrder(order.id)}
                        disabled={deleteOrderMutation.isPending}
                        className="gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        حذف
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
