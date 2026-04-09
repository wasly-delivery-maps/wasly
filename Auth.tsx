import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { normalizePhoneNumber } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

export default function Auth() {
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  // Login state
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerRole, setRegisterRole] = useState("customer");

  // tRPC mutations
  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // تطبيع رقم الهاتف
      const normalizedPhone = normalizePhoneNumber(loginPhone);
      
      const result = await loginMutation.mutateAsync({
        phone: normalizedPhone,
        password: loginPassword,
      });

      toast.success("تم تسجيل الدخول بنجاح!");

      // Redirect based on role
      if (result.user?.role === "driver") {
        navigate("/driver/dashboard");
      } else if (result.user?.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/customer/dashboard");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage = error?.message || "فشل تسجيل الدخول. يرجى التحقق من البيانات والمحاولة مرة أخرى.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // تطبيع رقم الهاتف
      const normalizedPhone = normalizePhoneNumber(registerPhone);
      
      // Validation
      if (!registerName || registerName.trim().length < 2) {
        toast.error("الاسم الكامل مطلوب (حد أدنى حرفين)");
        setIsLoading(false);
        return;
      }

      if (!registerPassword || registerPassword.length < 8) {
        toast.error("كلمة المرور مطلوبة (حد أدنى 8 أحرف)");
        setIsLoading(false);
        return;
      }

      const result = await registerMutation.mutateAsync({
        phone: normalizedPhone,
        password: registerPassword,
        name: registerName,
        email: registerEmail || undefined,
        role: registerRole as "customer" | "driver",
      });

      toast.success("تم التسجيل بنجاح!");

      // Redirect based on role
      if (result.user?.role === "driver") {
        navigate("/driver/dashboard");
      } else if (result.user?.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/customer/dashboard");
      }
    } catch (error: any) {
      console.error("Register error:", error);
      const errorMessage = error?.message || "فشل التسجيل. يرجى التحقق من البيانات والمحاولة مرة أخرى.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="hero-section min-h-screen flex items-center justify-center py-12 px-4" dir="rtl">
      <div className="absolute inset-0 bg-black/30 z-0"></div>
      <Card className="w-full max-w-md relative z-10 shadow-2xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-center">وصلي للتوصيل</CardTitle>
          <CardDescription className="text-center">
            خدمة توصيل سريعة وموثوقة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">دخول</TabsTrigger>
              <TabsTrigger value="register">تسجيل</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">رقم الهاتف</label>
                  <Input
                    type="tel"
                    placeholder="01032809502 أو +201032809502"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value)}
                    disabled={isLoading || loginMutation.isPending}
                    required
                  />
                  <p className="text-xs text-gray-500">يمكنك إدخال الرقم بصيغة محلية (01...) أو دولية (+20...)</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">كلمة المرور</label>
                  <Input
                    type="password"
                    placeholder="أدخل كلمة المرور"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={isLoading || loginMutation.isPending}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || loginMutation.isPending}
                >
                  {(isLoading || loginMutation.isPending) && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  دخول
                </Button>
              </form>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register" className="space-y-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">نوع الحساب</label>
                  <Select value={registerRole} onValueChange={setRegisterRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">عميل</SelectItem>
                      <SelectItem value="driver">سائق</SelectItem>
                      {/* Admin role is restricted and can only be assigned by system */}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">الاسم الكامل</label>
                  <Input
                    type="text"
                    placeholder="أحمد محمد"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    disabled={isLoading || registerMutation.isPending}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">رقم الهاتف</label>
                  <Input
                    type="tel"
                    placeholder="01032809502 أو +201032809502"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    disabled={isLoading || registerMutation.isPending}
                    required
                  />
                  <p className="text-xs text-gray-500">يمكنك إدخال الرقم بصيغة محلية (01...) أو دولية (+20...)</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">البريد الإلكتروني</label>
                  <Input
                    type="email"
                    placeholder="ahmed@example.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    disabled={isLoading || registerMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">كلمة المرور</label>
                  <Input
                    type="password"
                    placeholder="أنشئ كلمة مرور قوية"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    disabled={isLoading || registerMutation.isPending}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || registerMutation.isPending}
                >
                  {(isLoading || registerMutation.isPending) && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  تسجيل
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
