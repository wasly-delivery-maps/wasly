# دليل النشر - Easy Al Obour (Wasly Delivery App)

## نظرة عامة

تطبيق توصيل ذكي متقدم يوفر منصة متكاملة للعملاء والسائقين والإدارة. يدعم التطبيق تتبع الموقع الفعلي والإشعارات الفورية والتسعير الذكي.

## المتطلبات

### للتطوير المحلي:
- Node.js 22+
- pnpm 10.4.1+
- Git

### للإنتاج:
- Docker و Docker Compose (موصى به)
- أو خادم Linux مع Node.js 22+

## البدء السريع

### 1. التطوير المحلي

```bash
# استنساخ المستودع
git clone https://github.com/abraham157200-ux/easy-al-obour.git
cd easy-al-obour

# تثبيت المتطلبات
pnpm install

# تشغيل في وضع التطوير
pnpm dev
```

الموقع سيكون متاحاً على `http://localhost:3000`

### 2. البناء للإنتاج

```bash
# بناء التطبيق
pnpm build

# تشغيل الإصدار الإنتاجي محلياً
pnpm start
```

## النشر باستخدام Docker

### بناء صورة Docker

```bash
# بناء الصورة
docker build -t easy-al-obour:latest .

# تشغيل الحاوية
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e JWT_SECRET="your-secret-key" \
  easy-al-obour:latest
```

### استخدام Docker Compose

```bash
# بدء الخدمة
docker-compose up -d

# إيقاف الخدمة
docker-compose down

# عرض السجلات
docker-compose logs -f app
```

## متغيرات البيئة

| المتغير | الوصف | مثال |
|--------|-------|------|
| `NODE_ENV` | بيئة التشغيل | `production` أو `development` |
| `PORT` | منفذ الخادم | `3000` |
| `JWT_SECRET` | مفتاح التوقيع (يجب تغييره) | `your-secret-key` |
| `DATABASE_URL` | اتصال قاعدة البيانات (اختياري) | `mysql://user:pass@host/db` |
| `OAUTH_SERVER_URL` | خادم OAuth (اختياري) | `https://oauth.example.com` |

## هيكل المشروع

```
easy-al-obour/
├── client/              # واجهة المستخدم (React)
├── server/              # خادم الويب (Express + tRPC)
├── shared/              # الكود المشترك
├── dist/                # ملفات الإنتاج المُبنية
├── Dockerfile           # تعريف صورة Docker
├── docker-compose.yml   # تكوين Docker Compose
├── package.json         # المتطلبات والسكريبتات
└── vite.config.ts       # تكوين Vite
```

## الميزات الرئيسية

✅ **نظام أدوار ثلاثي**:
- عملاء: طلب التوصيل وتتبع الطلب
- سائقين: قبول الطلبات والتوصيل
- إدارة: إدارة النظام والإحصائيات

✅ **تتبع الموقع الفعلي**:
- تحديث الموقع في الوقت الفعلي عبر WebSocket
- خريطة Google Maps المدمجة

✅ **نظام التسعير الذكي**:
- حساب تلقائي للأسعار بناءً على المسافة
- دعم الخصومات والعروضات

✅ **الإشعارات الفورية**:
- إشعارات Socket.IO للتحديثات الفورية
- تنبيهات حالة الطلب

✅ **المصادقة الآمنة**:
- تسجيل الدخول برقم الهاتف
- تشفير كلمات المرور باستخدام bcrypt

## المتطلبات التقنية

### المكتبات الرئيسية:
- **React 19.2.1** - واجهة المستخدم
- **Express 4.21.2** - خادم الويب
- **tRPC 11.6.0** - API آمن من حيث النوع
- **Socket.IO 4.8.3** - الاتصالات الفورية
- **Drizzle ORM** - إدارة قاعدة البيانات
- **TailwindCSS 4.1.14** - تنسيق الواجهات

## الأداء والأمان

### التحسينات:
- ✅ بناء محسّن مع esbuild
- ✅ تقسيم الأكواد التلقائي
- ✅ ضغط gzip للملفات الثابتة
- ✅ فحص صحة الخادم (Health Check)

### الأمان:
- ✅ تشفير كلمات المرور
- ✅ التحقق من JWT
- ✅ حماية CORS
- ✅ معالجة الأخطاء الآمنة

## استكشاف الأخطاء

### المشكلة: "Failed to create user"
**الحل**: تأكد من أن متغير `DATABASE_URL` غير معرّف لاستخدام قاعدة البيانات في الذاكرة.

### المشكلة: المنفذ 3000 مشغول
**الحل**: غيّر المنفذ باستخدام متغير `PORT`:
```bash
PORT=3001 pnpm dev
```

### المشكلة: أخطاء الاتصال بـ WebSocket
**الحل**: تأكد من أن خادم WebSocket يعمل على نفس المنفذ.

## النسخ الاحتياطي والاستعادة

### نسخ احتياطي من البيانات:
```bash
# إذا كنت تستخدم MySQL
mysqldump -u user -p database > backup.sql
```

### استعادة البيانات:
```bash
# استعادة من النسخة الاحتياطية
mysql -u user -p database < backup.sql
```

## المراقبة والسجلات

### عرض السجلات:
```bash
# في بيئة Docker
docker-compose logs -f app

# في الإنتاج
tail -f /var/log/easy-al-obour/app.log
```

## الدعم والمساهمة

للإبلاغ عن الأخطاء أو المساهمة في المشروع، يرجى زيارة:
https://github.com/abraham157200-ux/easy-al-obour

## الترخيص

هذا المشروع مرخص تحت رخصة MIT.
