import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Phone, Lock, Mail, User, Truck } from "lucide-react";
import { normalizePhoneNumber } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

export default function Auth() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Login state
  const [loginData, setLoginData] = useState({
    phone: "",
    password: "",
  });

  // Register state
  const [registerData, setRegisterData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    role: "customer",
  });

  // tRPC mutations
  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  useEffect(() => {
    try {
      sessionStorage.removeItem("auth_form_data");
      sessionStorage.removeItem("register_form_data");
    } catch (e) {
      console.warn("SessionStorage access warning:", e);
    }
  }, []);

  const handleLoginChange = (field: string, value: string) => {
    setLoginData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRegisterChange = (field: string, value: string) => {
    setRegisterData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.phone.trim()) {
      toast.error("يرجى إدخال رقم الهاتف");
      return;
    }

    if (!loginData.password.trim()) {
      toast.error("يرجى إدخال كلمة المرور");
      return;
    }

    setIsLoading(true);

    try {
      const normalizedPhone = normalizePhoneNumber(loginData.phone);
      
      const result = await loginMutation.mutateAsync({
        phone: normalizedPhone,
        password: loginData.password,
      });

      toast.success("مرحباً بك! تم تسجيل الدخول بنجاح");

      setLoginData({ phone: "", password: "" });

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

    if (!registerData.name.trim()) {
      toast.error("يرجى إدخال الاسم الكامل");
      return;
    }

    if (registerData.name.trim().length < 2) {
      toast.error("الاسم يجب أن يكون حرفين على الأقل");
      return;
    }

    if (!registerData.phone.trim()) {
      toast.error("يرجى إدخال رقم الهاتف");
      return;
    }

    if (!registerData.password.trim()) {
      toast.error("يرجى إدخال كلمة المرور");
      return;
    }

    if (registerData.password.length < 8) {
      toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }

    setIsLoading(true);

    try {
      const normalizedPhone = normalizePhoneNumber(registerData.phone);
      
      const result = await registerMutation.mutateAsync({
        phone: normalizedPhone,
        password: registerData.password,
        name: registerData.name,
        email: registerData.email || undefined,
        role: registerData.role as "customer" | "driver",
      });

      toast.success("مرحباً! تم إنشاء حسابك بنجاح");

      setRegisterData({
        name: "",
        phone: "",
        email: "",
        password: "",
        role: "customer",
      });

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

  const isLoginPending = loginMutation.isPending || isLoading;
  const isRegisterPending = registerMutation.isPending || isLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-400 flex items-center justify-center p-4" dir="rtl">
      {/* Background decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left side - Branding */}
          <div className="hidden md:flex flex-col justify-center space-y-6 text-white">
            <div className="space-y-4">
              <div className="text-5xl font-bold">وصلي</div>
              <div className="text-xl font-light opacity-90">خدمة توصيل ذكية وموثوقة</div>
            </div>

            <div className="space-y-4 pt-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold">توصيل سريع</div>
                  <div className="text-sm opacity-75">احصل على طرودك في غضون ساعات</div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold">آمان مضمون</div>
                  <div className="text-sm opacity-75">طرودك آمنة معنا مع تأمين شامل</div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold">دعم 24/7</div>
                  <div className="text-sm opacity-75">نحن هنا لخدمتك في أي وقت</div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/20">
              <div className="text-sm opacity-75">
                انضم إلى آلاف العملاء والسائقين الذين يثقون بوصلي
              </div>
            </div>
          </div>

          {/* Right side - Auth Card */}
          <Card className="w-full shadow-2xl border-0 overflow-hidden">
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* Tab Headers */}
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-b">
                  <TabsList className="w-full h-auto p-0 bg-transparent rounded-none grid grid-cols-2">
                    <TabsTrigger 
                      value="login" 
                      disabled={isLoading}
                      className="rounded-none py-4 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 font-semibold"
                    >
                      دخول
                    </TabsTrigger>
                    <TabsTrigger 
                      value="register" 
                      disabled={isLoading}
                      className="rounded-none py-4 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-orange-500 data-[state=active]:text-orange-600 font-semibold"
                    >
                      إنشاء حساب
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Login Tab */}
                <TabsContent value="login" className="p-8 space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">أهلاً بعودتك</h2>
                    <p className="text-gray-500">سجل الدخول للوصول إلى حسابك</p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-5">
                    {/* Phone Input */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">رقم الهاتف</label>
                      <div className="relative">
                        <Phone className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
                        <Input
                          type="tel"
                          placeholder="01032809502"
                          value={loginData.phone}
                          onChange={(e) => handleLoginChange("phone", e.target.value)}
                          disabled={isLoginPending}
                          required
                          autoComplete="tel"
                          className="pr-10 py-6 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                      <p className="text-xs text-gray-500">صيغة محلية (01...) أو دولية (+20...)</p>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">كلمة المرور</label>
                      <div className="relative">
                        <Lock className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
                        <Input
                          type={showLoginPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={loginData.password}
                          onChange={(e) => handleLoginChange("password", e.target.value)}
                          disabled={isLoginPending}
                          required
                          autoComplete="current-password"
                          className="pr-10 py-6 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute left-3 top-3.5 text-gray-400 hover:text-gray-600"
                        >
                          {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button 
                      type="submit" 
                      className="w-full py-6 text-base font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-all duration-200"
                      disabled={isLoginPending}
                    >
                      {isLoginPending && <Loader2 className="ml-2 h-5 w-5 animate-spin" />}
                      {isLoginPending ? "جاري الدخول..." : "دخول"}
                    </Button>
                  </form>
                </TabsContent>

                {/* Register Tab */}
                <TabsContent value="register" className="p-8 space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">إنشاء حساب جديد</h2>
                    <p className="text-gray-500">انضم إلى وصلي واستمتع بخدمة التوصيل الأفضل</p>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-5">
                    {/* Account Type */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">نوع الحساب</label>
                      <Select 
                        value={registerData.role} 
                        onValueChange={(value) => handleRegisterChange("role", value)}
                        disabled={isRegisterPending}
                      >
                        <SelectTrigger className="py-6 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500">
                          <SelectValue placeholder="اختر نوع الحساب" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">عميل - أطلب التوصيل</SelectItem>
                          <SelectItem value="driver">سائق - وفر خدمة التوصيل</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Full Name */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">الاسم الكامل</label>
                      <div className="relative">
                        <User className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="أحمد محمد علي"
                          value={registerData.name}
                          onChange={(e) => handleRegisterChange("name", e.target.value)}
                          disabled={isRegisterPending}
                          required
                          autoComplete="name"
                          className="pr-10 py-6 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">رقم الهاتف</label>
                      <div className="relative">
                        <Phone className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
                        <Input
                          type="tel"
                          placeholder="01032809502"
                          value={registerData.phone}
                          onChange={(e) => handleRegisterChange("phone", e.target.value)}
                          disabled={isRegisterPending}
                          required
                          autoComplete="tel"
                          className="pr-10 py-6 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">البريد الإلكتروني (اختياري)</label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
                        <Input
                          type="email"
                          placeholder="ahmed@example.com"
                          value={registerData.email}
                          onChange={(e) => handleRegisterChange("email", e.target.value)}
                          disabled={isRegisterPending}
                          autoComplete="email"
                          className="pr-10 py-6 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">كلمة المرور</label>
                      <div className="relative">
                        <Lock className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
                        <Input
                          type={showRegisterPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={registerData.password}
                          onChange={(e) => handleRegisterChange("password", e.target.value)}
                          disabled={isRegisterPending}
                          required
                          autoComplete="new-password"
                          className="pr-10 py-6 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          className="absolute left-3 top-3.5 text-gray-400 hover:text-gray-600"
                        >
                          {showRegisterPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">8 أحرف على الأقل (حروف، أرقام، رموز)</p>
                    </div>

                    {/* Submit Button */}
                    <Button 
                      type="submit" 
                      className="w-full py-6 text-base font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-all duration-200"
                      disabled={isRegisterPending}
                    >
                      {isRegisterPending && <Loader2 className="ml-2 h-5 w-5 animate-spin" />}
                      {isRegisterPending ? "جاري الإنشاء..." : "إنشاء حساب"}
                    </Button>

                    {/* Terms */}
                    <p className="text-xs text-gray-500 text-center">
                      بالتسجيل، أنت توافق على <a href="#" className="text-orange-600 hover:underline">شروط الخدمة</a> و<a href="#" className="text-orange-600 hover:underline">سياسة الخصوصية</a>
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
