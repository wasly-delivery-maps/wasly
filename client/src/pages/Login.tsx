import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Login() {
  const [, navigate] = useLocation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data: any) => {
      if (data.success) {
        toast.success("تم تسجيل الدخول بنجاح");
        // Navigate based on role
        if (data.user.role === "admin") {
          navigate("/admin");
        } else if (data.user.role === "driver") {
          navigate("/driver");
        } else {
          navigate("/customer");
        }
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "خطأ في تسجيل الدخول");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await loginMutation.mutateAsync({ phone, password });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4" dir="rtl">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">واسلي</h1>
          <p className="text-gray-600">تطبيق إدارة خدمات التوصيل</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رقم الهاتف
            </label>
            <Input
              type="tel"
              placeholder="01xxxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="text-right"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              كلمة المرور
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="text-right"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "جاري التحميل..." : "تسجيل الدخول"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            ليس لديك حساب؟{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              إنشاء حساب جديد
            </button>
          </p>
        </div>


      </Card>
    </div>
  );
}
