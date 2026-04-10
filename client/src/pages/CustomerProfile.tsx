import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ArrowRight, Mail, Phone, MapPin, Truck, LogOut, Home, ShoppingBag, 
  HelpCircle, User, Settings, ShieldCheck, ChevronLeft, Camera, 
  Edit3, Save, X, MessageCircle, Loader2, Star, TrendingUp, Award,
  Zap, CheckCircle2
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function CustomerProfile() {
  const { user, loading, logout, refresh } = useAuth();
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [editData, setEditData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  const ordersQuery = trpc.orders.getCustomerOrders.useQuery();
  const updateProfileMutation = trpc.users.updateProfile.useMutation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-12 w-12 text-orange-600" />
        </motion.div>
      </div>
    );
  }

  if (!user || user.role !== "customer") {
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
      toast.success("تم تحديث البيانات بنجاح ✨");
      setIsEditing(false);
    } catch (error) {
      toast.error("فشل في تحديث البيانات");
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف وحجمه
    if (!file.type.startsWith('image/')) {
      toast.error("يرجى اختيار ملف صورة صالح");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)");
      return;
    }

    setUploading(true);
    const toastId = toast.loading("جاري رفع الصورة...");

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          await updateProfileMutation.mutateAsync({
            ...editData,
            avatarUrl: base64String
          });
          await refresh(); // تحديث بيانات المستخدم في الحالة العامة
          toast.success("تم تحديث الصورة الشخصية بنجاح", { id: toastId });
        } catch (err) {
          console.error("Upload error:", err);
          toast.error("فشل في حفظ الصورة على الخادم", { id: toastId });
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("حدث خطأ أثناء معالجة الصورة", { id: toastId });
      setUploading(false);
    }
  };

  const orders = ordersQuery.data || [];
  const completedOrders = orders.filter((o) => o.status === "delivered").length;
  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
  const totalSpent = orders.reduce((sum, o) => sum + (o.price || 0), 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 text-slate-900 font-sans" dir="rtl">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
      />

      {/* Dynamic Header */}
      <motion.div 
        className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white pt-12 pb-32 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Animated Background Elements */}
        <motion.div 
          className="absolute top-0 right-0 w-96 h-96 bg-orange-600/20 rounded-full -mr-48 -mt-48 blur-3xl"
          animate={{ 
            x: [0, 30, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full -ml-32 -mb-32 blur-3xl"
          animate={{ 
            x: [0, -30, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div 
            className="flex justify-between items-center mb-12"
            variants={itemVariants}
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl h-12 w-12 transition-all"
                onClick={() => navigate("/customer/dashboard")}
              >
                <ChevronLeft className="h-6 w-6 rotate-180" />
              </Button>
            </motion.div>
            <motion.h1 
              className="text-2xl font-black tracking-widest uppercase bg-gradient-to-r from-white to-orange-200 bg-clip-text text-transparent"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              ملفي الشخصي
            </motion.h1>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white/60 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl h-12 w-12 transition-all"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>

          <motion.div 
            className="flex flex-col md:flex-row items-center gap-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Avatar Section */}
            <motion.div 
              className="relative group"
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
            >
              <motion.div 
                className="h-32 w-32 rounded-3xl bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 p-1 shadow-2xl shadow-orange-900/50"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <div className="h-full w-full rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden relative">
                  {user.avatarUrl ? (
                    <img 
                      src={user.avatarUrl} 
                      alt={user.name} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <User className="h-16 w-16 text-orange-500" />
                    </motion.div>
                  )}
                  
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
              </motion.div>
              
              <motion.button 
                onClick={handleImageClick}
                disabled={uploading}
                className="absolute -bottom-2 -right-2 h-10 w-10 bg-white rounded-xl flex items-center justify-center text-slate-900 shadow-xl cursor-pointer hover:scale-110 transition-all z-30"
                whileHover={{ scale: 1.2, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
              >
                <Camera className="h-5 w-5" />
              </motion.button>
            </motion.div>
            
            {/* User Info */}
            <motion.div 
              className="text-center md:text-right space-y-4"
              variants={itemVariants}
            >
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <motion.h2 
                  className="text-4xl font-black bg-gradient-to-r from-white to-orange-200 bg-clip-text text-transparent"
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  {user.name}
                </motion.h2>
                <motion.div
                  animate={{ rotate: [0, 20, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <ShieldCheck className="h-6 w-6 text-orange-400" />
                </motion.div>
              </div>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                >
                  <Badge className="bg-orange-600/30 text-orange-200 border border-orange-400/50 px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest">
                    ⭐ عضو مميز
                  </Badge>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                >
                  <Badge className="bg-white/10 text-white/70 border border-white/20 px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest">
                    ID: #{user.id}
                  </Badge>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="container mx-auto px-6 -mt-20 pb-20 relative z-20">
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          
          {/* Stats Sidebar */}
          <motion.div 
            className="lg:col-span-4 space-y-6"
            variants={containerVariants}
          >
            {/* Stats Card */}
            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <Card className="border-none shadow-lg bg-white rounded-3xl overflow-hidden hover:shadow-xl transition-all">
                <CardContent className="p-8">
                  <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-3">
                    <motion.div
                      className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <ShoppingBag className="h-5 w-5" />
                    </motion.div>
                    ملخص النشاط
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: "طلبات نشطة", value: activeOrders, icon: Zap, color: "from-orange-500 to-orange-600" },
                      { label: "طلبات مكتملة", value: completedOrders, icon: CheckCircle2, color: "from-emerald-500 to-emerald-600" },
                      { label: "إجمالي الإنفاق", value: `ج.م ${totalSpent.toLocaleString()}`, icon: TrendingUp, color: "from-blue-500 to-blue-600" }
                    ].map((stat, i) => (
                      <motion.div 
                        key={i}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-2xl border border-slate-200/50 hover:border-orange-200/50 transition-all"
                        whileHover={{ x: 5 }}
                      >
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                        <motion.span 
                          className={`text-xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          {stat.value}
                        </motion.span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Support Card */}
            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.05, y: -5 }}
            >
              <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-3xl overflow-hidden hover:shadow-xl transition-all group">
                <CardContent className="p-8 relative">
                  <motion.div 
                    className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                  <h3 className="text-lg font-black mb-4 flex items-center gap-3 relative z-10">
                    <HelpCircle className="h-5 w-5" />
                    تحتاج مساعدة؟
                  </h3>
                  <p className="text-white/80 text-sm font-medium mb-6 leading-relaxed relative z-10">
                    فريق الدعم الفني متاح دائماً لخدمتك وحل جميع استفساراتك.
                  </p>
                  <div className="space-y-3 relative z-10">
                    <motion.a 
                      href="tel:01557564373" 
                      className="flex items-center justify-between bg-white/15 hover:bg-white/25 p-4 rounded-2xl transition-all border border-white/20"
                      whileHover={{ scale: 1.05, x: 5 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="font-black text-sm">اتصل بنا</span>
                      <Phone className="h-5 w-5" />
                    </motion.a>
                    <motion.a 
                      href="https://wa.me/201557564373" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center justify-between bg-emerald-500 hover:bg-emerald-600 p-4 rounded-2xl transition-all shadow-lg"
                      whileHover={{ scale: 1.05, x: 5 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="font-black text-sm">واتساب</span>
                      <MessageCircle className="h-5 w-5" />
                    </motion.a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Edit Profile Section */}
          <motion.div 
            className="lg:col-span-8"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
          >
            <Card className="border-none shadow-lg bg-white rounded-3xl overflow-hidden hover:shadow-xl transition-all h-full">
              <CardContent className="p-10">
                <div className="flex justify-between items-center mb-12">
                  <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4">
                    <motion.div
                      className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <Settings className="h-5 w-5" />
                    </motion.div>
                    إعدادات الحساب
                  </h3>
                  {!isEditing && (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button 
                        onClick={() => setIsEditing(true)}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black px-6 rounded-xl transition-all shadow-lg"
                      >
                        <Edit3 className="h-4 w-4 ml-2" /> تعديل
                      </Button>
                    </motion.div>
                  )}
                </div>

                <motion.div 
                  className="space-y-8"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Name Field */}
                    <motion.div 
                      className="space-y-3"
                      variants={itemVariants}
                    >
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">الاسم الكامل</label>
                      <div className="relative group">
                        <User className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                        <Input 
                          disabled={!isEditing}
                          value={editData.name}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          className="h-14 pr-12 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 font-bold text-slate-700 disabled:opacity-100 transition-all"
                        />
                      </div>
                    </motion.div>

                    {/* Phone Field */}
                    <motion.div 
                      className="space-y-3"
                      variants={itemVariants}
                    >
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">رقم الهاتف</label>
                      <div className="relative group">
                        <Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                        <Input 
                          disabled={!isEditing}
                          value={editData.phone}
                          onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                          className="h-14 pr-12 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 font-bold text-slate-700 disabled:opacity-100 transition-all"
                        />
                      </div>
                    </motion.div>
                  </div>

                  {/* Email Field */}
                  <motion.div 
                    className="space-y-3"
                    variants={itemVariants}
                  >
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">البريد الإلكتروني</label>
                    <div className="relative group">
                      <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                      <Input 
                        disabled={!isEditing}
                        type="email"
                        value={editData.email}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        className="h-14 pr-12 rounded-xl border-2 border-slate-200 bg-slate-50/50 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 font-bold text-slate-700 disabled:opacity-100 transition-all"
                      />
                    </div>
                  </motion.div>

                  {/* Action Buttons */}
                  <AnimatePresence>
                    {isEditing && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="flex gap-4 pt-8"
                      >
                        <motion.div
                          className="flex-1"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button 
                            onClick={handleSaveProfile}
                            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white h-14 rounded-xl font-black text-lg shadow-lg hover:shadow-xl transition-all"
                            disabled={updateProfileMutation.isPending}
                          >
                            {updateProfileMutation.isPending ? (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin ml-2" />
                                جاري الحفظ...
                              </>
                            ) : (
                              <>
                                <Save className="h-5 w-5 ml-2" />
                                حفظ التغييرات
                              </>
                            )}
                          </Button>
                        </motion.div>
                        <motion.div
                          className="flex-1"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button 
                            onClick={() => setIsEditing(false)} 
                            variant="outline" 
                            className="w-full h-14 rounded-xl border-2 border-slate-200 text-slate-600 font-black text-lg hover:bg-slate-50 transition-all"
                          >
                            <X className="h-5 w-5 ml-2" /> إلغاء
                          </Button>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Security Info */}
                <motion.div 
                  className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-2xl border border-blue-200/50"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex items-start gap-4">
                    <motion.div
                      className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white flex-shrink-0"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <ShieldCheck className="h-5 w-5" />
                    </motion.div>
                    <div>
                      <h4 className="font-black text-slate-900 mb-2">الأمان والخصوصية</h4>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        بياناتك الشخصية محمية ومشفرة بالكامل. نحن لا نشارك معلوماتك مع أي طرف ثالث دون موافقتك الصريحة. يمكنك دائماً طلب حذف حسابك من خلال التواصل مع الدعم الفني.
                      </p>
                    </div>
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
