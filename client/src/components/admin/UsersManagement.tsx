import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Trash2, Power, RotateCcw, Search } from "lucide-react";

interface User {
  id: number;
  name?: string;
  phone: string;
  email?: string;
  role: string;
  accountStatus?: string;
  pendingCommission?: number;
  isActive?: boolean;
}

export function UsersManagement({ users: initialUsers }: { users: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");

  const deleteUserMutation = trpc.admin.deleteUser.useMutation();
  const toggleAccountStatusMutation = trpc.admin.updateAccountStatus.useMutation();

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.includes(searchTerm) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`هل أنت متأكد من حذف المستخدم "${userName}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
      return;
    }

    try {
      await deleteUserMutation.mutateAsync({ userId });
      setUsers(users.filter((u) => u.id !== userId));
      toast.success(`تم حذف المستخدم "${userName}" بنجاح`);
    } catch (error) {
      toast.error("فشل في حذف المستخدم");
    }
  };

  const handleToggleAccountStatus = async (userId: number, currentStatus: string, userName: string) => {
    const newStatus = currentStatus === "active" ? "disabled" : "active";
    const action = newStatus === "active" ? "تفعيل" : "إيقاف";

    if (!confirm(`هل تريد ${action} حساب "${userName}"؟`)) {
      return;
    }

    try {
      await toggleAccountStatusMutation.mutateAsync({
        userId,
        status: newStatus,
      });
      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, accountStatus: newStatus } : u
        )
      );
      toast.success(`تم ${action} حساب "${userName}" بنجاح`);
    } catch (error) {
      toast.error(`فشل في ${action} حساب المستخدم`);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "مسؤول",
      driver: "سائق",
      customer: "عميل",
    };
    return labels[role] || role;
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

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "disabled":
        return "bg-red-100 text-red-800";
      case "suspended":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status?: string) => {
    const labels: Record<string, string> = {
      active: "نشط",
      disabled: "موقوف",
      suspended: "معلق",
    };
    return labels[status || "active"] || "نشط";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>إدارة المستخدمين</span>
          <span className="text-sm font-normal text-muted-foreground">
            {filteredUsers.length} من {users.length}
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
                placeholder="ابحث عن الاسم أو الهاتف أو البريد..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">جميع الأدوار</option>
            <option value="admin">مسؤولون</option>
            <option value="driver">سائقون</option>
            <option value="customer">عملاء</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-right py-3 px-4 font-semibold">الاسم</th>
                <th className="text-right py-3 px-4 font-semibold">الهاتف</th>
                <th className="text-right py-3 px-4 font-semibold">البريد</th>
                <th className="text-right py-3 px-4 font-semibold">النوع</th>
                <th className="text-right py-3 px-4 font-semibold">الحالة</th>
                <th className="text-right py-3 px-4 font-semibold">العمولات</th>
                <th className="text-right py-3 px-4 font-semibold">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    لا توجد نتائج
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{user.name || "بدون اسم"}</td>
                    <td className="py-3 px-4 font-mono text-sm">{user.phone}</td>
                    <td className="py-3 px-4 text-sm">{user.email || "-"}</td>
                    <td className="py-3 px-4">
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(user.accountStatus)}>
                        {getStatusLabel(user.accountStatus)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {user.role === "driver" && user.pendingCommission ? (
                        <span className="font-semibold text-orange-600">
                          ج.م {parseFloat(user.pendingCommission.toString()).toFixed(2)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {user.role === "driver" && (
                          <Button
                            size="sm"
                            variant={user.accountStatus === "active" ? "outline" : "default"}
                            onClick={() =>
                              handleToggleAccountStatus(
                                user.id,
                                user.accountStatus || "active",
                                user.name || user.phone
                              )
                            }
                            disabled={deleteUserMutation.isPending || toggleAccountStatusMutation.isPending}
                            className="gap-1"
                          >
                            {user.accountStatus === "active" ? (
                              <>
                                <Power className="h-3 w-3" />
                                إيقاف
                              </>
                            ) : (
                              <>
                                <RotateCcw className="h-3 w-3" />
                                تفعيل
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteUser(user.id, user.name || user.phone)}
                          disabled={deleteUserMutation.isPending || toggleAccountStatusMutation.isPending}
                          className="gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          حذف
                        </Button>
                      </div>
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
