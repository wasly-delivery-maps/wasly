import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, Search, Clock, DollarSign, Users, TrendingUp, Bell } from "lucide-react";

interface Driver {
  id: number;
  name?: string;
  phone: string;
  accountStatus: string;
  suspensionReason?: string;
  suspendedAt?: Date;
  pendingCommission: number;
  paidCommission?: number;
}

export function CommissionsManagement({ drivers: initialDrivers }: { drivers: Driver[] }) {
  const [drivers, setDrivers] = useState(initialDrivers);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState("pending");

  const updateAccountStatusMutation = trpc.admin.updateAccountStatus.useMutation();
  const notifyOwnerMutation = trpc.system.notifyOwner.useMutation();

  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch =
      driver.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone.includes(searchTerm);
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "suspended" && driver.accountStatus !== "active") ||
      (selectedStatus === "warning" && typeof driver.pendingCommission === "number" && driver.pendingCommission >= 20 && driver.pendingCommission < 30) ||
      (selectedStatus === "active" && driver.accountStatus === "active");
    return matchesSearch && matchesStatus;
  });

  const sortedDrivers = [...filteredDrivers].sort((a, b) => {
    if (sortBy === "pending") {
      return (typeof b.pendingCommission === "number" ? b.pendingCommission : 0) - 
             (typeof a.pendingCommission === "number" ? a.pendingCommission : 0);
    } else if (sortBy === "name") {
      return (a.name || "").localeCompare(b.name || "");
    }
    return 0;
  });

  const handleResumeAccount = async (driverId: number, driverName: string) => {
    if (!confirm(`هل تريد تفعيل حساب "${driverName}" بعد التأكد من سداده للعمولات؟`)) {
      return;
    }

    try {
      await updateAccountStatusMutation.mutateAsync({
        userId: driverId,
        status: "active",
        reason: undefined,
      });
      setDrivers(
        drivers.map((d) =>
          d.id === driverId
            ? { ...d, accountStatus: "active", suspensionReason: undefined, pendingCommission: 0 }
            : d
        )
      );
      toast.success(`تم تفعيل حساب "${driverName}" بنجاح`);
    } catch (error) {
      toast.error("فشل في تفعيل حساب السائق");
    }
  };

  const handleSendNotification = async (driverId: number, driverName: string, pendingAmount: number) => {
    try {
      await notifyOwnerMutation.mutateAsync({
        title: `تنبيه: السائق ${driverName}`,
        content: `السائق ${driverName} (${drivers.find(d => d.id === driverId)?.phone}) لديه عمولات مستحقة بقيمة ج.م ${pendingAmount.toFixed(2)}`,
      });
      toast.success("تم إرسال التنبيه بنجاح");
    } catch (error) {
      toast.error("فشل في إرسال التنبيه");
    }
  };

  const suspendedDrivers = drivers.filter((d) => d.accountStatus !== "active");
  const activeDrivers = drivers.filter((d) => d.accountStatus === "active");
  const totalPendingCommissions = drivers.reduce(
    (sum, d) => sum + (typeof d.pendingCommission === "number" ? d.pendingCommission : 0),
    0
  );
  const totalPaidCommissions = drivers.reduce(
    (sum, d) => sum + (typeof d.paidCommission === "number" ? d.paidCommission : 0),
    0
  );
  const driversNearSuspension = drivers.filter(
    (d) => typeof d.pendingCommission === "number" && d.pendingCommission >= 20 && d.pendingCommission < 30
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-red-500 bg-gradient-to-br from-red-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              موقوفون
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{suspendedDrivers.length}</div>
            <p className="text-xs text-muted-foreground mt-2">بسبب عمولات مستحقة</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-yellow-500 bg-gradient-to-br from-yellow-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              قريبون من الإيقاف
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{driversNearSuspension.length}</div>
            <p className="text-xs text-muted-foreground mt-2">بين 20-30 ج.م</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-orange-500 bg-gradient-to-br from-orange-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-600" />
              إجمالي المستحق
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">ج.م {(totalPendingCommissions || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-2">من جميع السائقين</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-green-500 bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              نشطون
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{activeDrivers.length}</div>
            <p className="text-xs text-muted-foreground mt-2">بدون مشاكل</p>
          </CardContent>
        </Card>
      </div>

      {/* Commissions Management Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              إدارة العمولات والحسابات
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {sortedDrivers.length} من {drivers.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters and Sort */}
          <div className="flex gap-4 flex-wrap items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">البحث</label>
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="ابحث عن الاسم أو الهاتف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الحالة</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">جميع السائقين</option>
                <option value="suspended">موقوفون</option>
                <option value="warning">تحذير</option>
                <option value="active">نشطون</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الترتيب</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="pending">الأعلى عمولات أولاً</option>
                <option value="name">الاسم (أبجدي)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-right py-3 px-4 font-semibold">الاسم</th>
                  <th className="text-right py-3 px-4 font-semibold">الهاتف</th>
                  <th className="text-right py-3 px-4 font-semibold">الحالة</th>
                  <th className="text-right py-3 px-4 font-semibold">المستحق</th>
                  <th className="text-right py-3 px-4 font-semibold">المدفوع</th>
                  <th className="text-right py-3 px-4 font-semibold">تاريخ الإيقاف</th>
                  <th className="text-right py-3 px-4 font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {sortedDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      لا توجد نتائج
                    </td>
                  </tr>
                ) : (
                  sortedDrivers.map((driver) => {
                    const pendingAmount = typeof driver.pendingCommission === "number" ? driver.pendingCommission : 0;
                    const isNearSuspension = pendingAmount >= 20 && pendingAmount < 30;
                    const isSuspended = driver.accountStatus === "disabled" || driver.accountStatus === "suspended";

                    return (
                      <tr key={driver.id} className={`border-b hover:bg-gray-50 ${isSuspended ? "bg-red-50" : isNearSuspension ? "bg-yellow-50" : ""}`}>
                        <td className="py-3 px-4 font-medium">{driver.name || "بدون اسم"}</td>
                        <td className="py-3 px-4 font-mono text-xs">{driver.phone}</td>
                        <td className="py-3 px-4">
                          <Badge
                            className={
                              driver.accountStatus === "active"
                                ? "bg-green-100 text-green-800"
                                : isNearSuspension
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {driver.accountStatus === "active" ? "نشط" : isNearSuspension ? "تحذير" : "موقوف"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-orange-600">ج.م {pendingAmount.toFixed(2)}</span>
                            {isNearSuspension && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                {(30 - pendingAmount).toFixed(2)} متبقي
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-green-600">
                            ج.م {(typeof driver.paidCommission === "number" ? driver.paidCommission : 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {driver.suspendedAt
                            ? new Date(driver.suspendedAt).toLocaleDateString("ar-EG")
                            : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {driver.accountStatus !== "active" && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleResumeAccount(driver.id, driver.name || driver.phone)}
                                disabled={updateAccountStatusMutation.isPending}
                                className="gap-1 bg-green-600 hover:bg-green-700 text-xs"
                              >
                                <CheckCircle className="h-3 w-3" />
                                تفعيل
                              </Button>
                            )}
                            {(isSuspended || isNearSuspension) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendNotification(driver.id, driver.name || driver.phone, pendingAmount)}
                                disabled={notifyOwnerMutation.isPending}
                                className="gap-1 text-xs"
                              >
                                <Bell className="h-3 w-3" />
                                تنبيه
                              </Button>
                            )}
                            {driver.accountStatus === "active" && !isNearSuspension && (
                              <span className="text-xs text-green-600 py-2">✓ نشط</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
