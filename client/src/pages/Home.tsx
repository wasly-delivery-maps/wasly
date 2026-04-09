import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Truck, MapPin, Clock, Star, Zap, Shield } from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect based on role
    if (user?.role === "driver") {
      window.location.href = "/driver/dashboard";
    } else if (user?.role === "admin") {
      window.location.href = "/admin/dashboard";
    } else {
      window.location.href = "/customer/dashboard";
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/10" dir="rtl">
      {/* Hero Section with Gradient Background */}
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-400">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
        </div>

        <div className="container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className="text-white space-y-8">
              <div className="space-y-4">
                <div className="inline-block bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white text-sm font-semibold mb-4">
                  🚀 الخدمة الأسرع في مدينة العبور
                </div>
                <h1 className="text-6xl lg:text-7xl font-bold leading-tight drop-shadow-lg">
                  خدمة توصيل <br /> <span className="bg-gradient-to-r from-yellow-200 to-white bg-clip-text text-transparent">سريعة وموثوقة</span>
                </h1>
                <p className="text-xl text-white/95 leading-relaxed drop-shadow-md">
                  تواصل مع سائقين محترفين واحصل على طرودك في الوقت المحدد بأمان وسرعة. نحن هنا لخدمتك 24/7 بكل احترافية.
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <Link href="/auth">
                  <Button size="lg" className="bg-white text-orange-600 hover:bg-yellow-100 font-bold px-8 shadow-lg hover:shadow-xl transition-all">
                    ابدأ الآن
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-white border-white border-2 hover:bg-white/20 font-bold px-8 shadow-lg"
                >
                  تعرف أكثر
                </Button>
              </div>
            </div>

            {/* Delivery Rider Image */}
            <div className="flex justify-center items-center relative">
              <div className="relative w-full h-96 flex items-center justify-center">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-orange-400/30 to-transparent rounded-full blur-3xl"></div>
                
                {/* Image */}
                <img 
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663447379287/3dBv4SsFHSJkfRF8vck3um/delivery-rider_ca25e1da.jpg"
                  alt="سائق التوصيل"
                  className="w-full h-full object-contain drop-shadow-2xl relative z-10 animate-bounce"
                  style={{animationDuration: '3s'}}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-24 bg-gradient-to-b from-background to-orange-50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
              لماذا تختار وصلي؟
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              نحن نقدم أفضل خدمة توصيل مع أعلى معايير الجودة والأمان والسرعة
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-2xl transition-all hover:scale-105 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
              <CardHeader>
                <div className="bg-gradient-to-br from-orange-400 to-orange-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4 shadow-lg">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl text-orange-900">توصيل سريع</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  احصل على طرودك في غضون ساعات مع سائقينا المحترفين والمدربين على أعلى مستويات الخدمة.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-2xl transition-all hover:scale-105 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardHeader>
                <div className="bg-gradient-to-br from-blue-400 to-blue-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4 shadow-lg">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl text-blue-900">تتبع فوري</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  تتبع طلبك في الوقت الفعلي مع تحديثات موقع GPS المباشرة وإشعارات فورية عند كل تحديث.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-2xl transition-all hover:scale-105 border-green-200 bg-gradient-to-br from-green-50 to-white">
              <CardHeader>
                <div className="bg-gradient-to-br from-green-400 to-green-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4 shadow-lg">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl text-green-900">خدمة 24/7</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  نعمل على مدار الساعة طوال أيام الأسبوع لخدمتك في أي وقت تحتاج إلينا بدون انقطاع.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-2xl transition-all hover:scale-105 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
              <CardHeader>
                <div className="bg-gradient-to-br from-purple-400 to-purple-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4 shadow-lg">
                  <Star className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl text-purple-900">سائقون مقيمون</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  جميع سائقينا معتمدون ومقيمون من العملاء بتقييمات عالية لضمان الموثوقية والأمان.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-2xl transition-all hover:scale-105 border-red-200 bg-gradient-to-br from-red-50 to-white">
              <CardHeader>
                <div className="bg-gradient-to-br from-red-400 to-red-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4 shadow-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl text-red-900">أمان مضمون</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  طرودك آمنة معنا مع تأمين شامل على جميع عمليات التوصيل والتسليم الآمن.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-2xl transition-all hover:scale-105 border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
              <CardHeader>
                <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4 shadow-lg">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-xl text-yellow-900">أسعار عادلة</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  أسعار شفافة وعادلة بدون رسوم مخفية مع خيارات دفع متعددة وآمنة.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section with Gradient */}
      <section className="py-20 bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-400 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="container relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-white text-center">
            <div className="space-y-2">
              <div className="text-6xl font-bold drop-shadow-lg">10K+</div>
              <p className="text-lg text-white/90 font-semibold">عميل سعيد</p>
              <p className="text-sm text-white/75">يثقون بخدماتنا يومياً</p>
            </div>
            <div className="space-y-2">
              <div className="text-6xl font-bold drop-shadow-lg">5K+</div>
              <p className="text-lg text-white/90 font-semibold">سائق محترف</p>
              <p className="text-sm text-white/75">معتمدون وموثوقون</p>
            </div>
            <div className="space-y-2">
              <div className="text-6xl font-bold drop-shadow-lg">100K+</div>
              <p className="text-lg text-white/90 font-semibold">طلب تم توصيله</p>
              <p className="text-sm text-white/75">بنجاح وأمان</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-b from-orange-50 to-background">
        <div className="container text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl font-bold bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
              هل أنت مستعد للبدء؟
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              انضم إلى آلاف العملاء والسائقين الذين يثقون بوصلي لاحتياجاتهم في التوصيل السريع والموثوق. ابدأ رحلتك معنا الآن!
            </p>
          </div>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/auth">
              <Button size="lg" className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 font-bold px-8 shadow-lg hover:shadow-xl transition-all">
                سجل الآن كعميل
              </Button>
            </Link>
            <Link href="/auth">
              <Button size="lg" variant="outline" className="font-bold px-8 border-2 border-orange-600 text-orange-600 hover:bg-orange-50 shadow-lg hover:shadow-xl transition-all">
                انضم كسائق
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-slate-900 to-black text-white py-16">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-3xl mb-4 bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
                وصلي
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                خدمة توصيل سريعة وموثوقة تربط العملاء مع السائقين المحترفين في مدينة العبور والمحافظات المجاورة.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">للعملاء</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-orange-400 transition">تتبع الطلبات</a></li>
                <li><a href="#" className="hover:text-orange-400 transition">الأسعار</a></li>
                <li><a href="#" className="hover:text-orange-400 transition">الأسئلة الشائعة</a></li>
                <li><a href="#" className="hover:text-orange-400 transition">اتصل بنا</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">للسائقين</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-orange-400 transition">انضم الآن</a></li>
                <li><a href="#" className="hover:text-orange-400 transition">كيفية العمل</a></li>
                <li><a href="#" className="hover:text-orange-400 transition">الدعم</a></li>
                <li><a href="#" className="hover:text-orange-400 transition">الشروط والأحكام</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white">تابعنا</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-orange-400 transition">فيسبوك</a></li>
                <li><a href="#" className="hover:text-orange-400 transition">تويتر</a></li>
                <li><a href="#" className="hover:text-orange-400 transition">إنستجرام</a></li>
                <li><a href="#" className="hover:text-orange-400 transition">واتس أب</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8">
            <p className="text-center text-sm text-gray-400">
              © 2026 وصلي - خدمة التوصيل السريعة والموثوقة. جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
