# تعليمات التثبيت - Easy Al Obour

## المتطلبات الأساسية

### للتطوير:
- **Node.js**: الإصدار 22 أو أحدث
- **pnpm**: الإصدار 10.4.1 أو أحدث
- **Git**: لاستنساخ المستودع

### للإنتاج:
- **Docker**: الإصدار 20.10 أو أحدث
- **Docker Compose**: الإصدار 2.0 أو أحدث
- أو **خادم Linux** مع Node.js 22+

## التثبيت المحلي للتطوير

### الخطوة 1: استنساخ المستودع

```bash
git clone https://github.com/abraham157200-ux/easy-al-obour.git
cd easy-al-obour
```

### الخطوة 2: تثبيت المتطلبات

```bash
# تثبيت pnpm إذا لم يكن مثبتاً
npm install -g pnpm@10.4.1

# تثبيت المتطلبات
pnpm install
```

### الخطوة 3: إعداد متغيرات البيئة

```bash
# نسخ ملف المثال
cp .env.example .env

# تحرير الملف وتحديث القيم (اختياري)
nano .env
```

### الخطوة 4: تشغيل التطبيق

```bash
# تشغيل في وضع التطوير
pnpm dev

# سيكون متاحاً على http://localhost:3000
```

## التثبيت باستخدام Docker

### الخطوة 1: بناء صورة Docker

```bash
docker build -t easy-al-obour:latest .
```

### الخطوة 2: تشغيل الحاوية

```bash
docker run -d \
  --name easy-al-obour \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e JWT_SECRET="your-secret-key" \
  easy-al-obour:latest
```

### الخطوة 3: التحقق من الحالة

```bash
# عرض السجلات
docker logs easy-al-obour

# التحقق من صحة الخادم
curl http://localhost:3000/health
```

## التثبيت باستخدام Docker Compose

### الخطوة 1: إعداد متغيرات البيئة

```bash
# نسخ ملف المثال
cp .env.example .env.production

# تحرير الملف وتحديث القيم
nano .env.production
```

### الخطوة 2: بدء الخدمات

```bash
# بدء باستخدام docker-compose.yml (بدون قاعدة بيانات)
docker-compose up -d

# أو بدء مع قاعدة بيانات MySQL
docker-compose -f docker-compose.prod.yml up -d
```

### الخطوة 3: التحقق من الحالة

```bash
# عرض حالة الخدمات
docker-compose ps

# عرض السجلات
docker-compose logs -f app

# التحقق من صحة الخادم
curl http://localhost:3000/health
```

## النشر على خادم Linux

### المتطلبات:
- Ubuntu 20.04 أو أحدث
- Node.js 22+
- pnpm 10.4.1+

### الخطوات:

```bash
# 1. تحديث النظام
sudo apt update && sudo apt upgrade -y

# 2. تثبيت Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 3. تثبيت pnpm
npm install -g pnpm@10.4.1

# 4. استنساخ المستودع
cd /opt
sudo git clone https://github.com/abraham157200-ux/easy-al-obour.git
cd easy-al-obour

# 5. تثبيت المتطلبات
pnpm install

# 6. بناء التطبيق
pnpm build

# 7. إنشاء ملف systemd service
sudo tee /etc/systemd/system/easy-al-obour.service > /dev/null <<EOF
[Unit]
Description=Easy Al Obour Delivery App
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/easy-al-obour
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/local/bin/node /opt/easy-al-obour/dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 8. تفعيل الخدمة
sudo systemctl daemon-reload
sudo systemctl enable easy-al-obour
sudo systemctl start easy-al-obour

# 9. التحقق من الحالة
sudo systemctl status easy-al-obour
```

## النشر على Heroku

### المتطلبات:
- حساب Heroku
- Heroku CLI مثبت

### الخطوات:

```bash
# 1. تسجيل الدخول
heroku login

# 2. إنشاء تطبيق جديد
heroku create easy-al-obour

# 3. تعيين buildpack
heroku buildpacks:set heroku/nodejs

# 4. إضافة متغيرات البيئة
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET="your-secret-key"

# 5. نشر التطبيق
git push heroku main

# 6. عرض السجلات
heroku logs --tail
```

## النشر على AWS

### استخدام Elastic Beanstalk:

```bash
# 1. تثبيت EB CLI
pip install awsebcli

# 2. تهيئة التطبيق
eb init -p node.js-22 easy-al-obour

# 3. إنشاء بيئة
eb create easy-al-obour-env

# 4. نشر التطبيق
eb deploy

# 5. فتح التطبيق
eb open
```

## استكشاف الأخطاء

### المشكلة: "pnpm: command not found"
```bash
npm install -g pnpm@10.4.1
```

### المشكلة: "Port 3000 is already in use"
```bash
# تغيير المنفذ
PORT=3001 pnpm dev
```

### المشكلة: "Cannot find module"
```bash
# إعادة تثبيت المتطلبات
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### المشكلة: "Failed to build"
```bash
# تنظيف والبناء من جديد
pnpm build --force
```

## الأوامر المفيدة

```bash
# التطوير
pnpm dev              # تشغيل في وضع التطوير
pnpm build            # بناء للإنتاج
pnpm start            # تشغيل الإصدار الإنتاجي
pnpm check            # فحص الأخطاء
pnpm format           # تنسيق الكود
pnpm test             # تشغيل الاختبارات

# قاعدة البيانات
pnpm db:push          # نقل التغييرات إلى قاعدة البيانات
```

## الأمان

### نصائح مهمة:
1. **غيّر `JWT_SECRET`** إلى قيمة عشوائية قوية في الإنتاج
2. **استخدم HTTPS** في الإنتاج
3. **حدّث المتطلبات** بانتظام: `pnpm update`
4. **استخدم متغيرات البيئة** للمعلومات الحساسة
5. **راقب السجلات** للأنشطة المريبة

## الدعم

للمساعدة والدعم:
- 📧 البريد الإلكتروني: support@example.com
- 🐛 الإبلاغ عن الأخطاء: https://github.com/abraham157200-ux/easy-al-obour/issues
- 💬 المناقشات: https://github.com/abraham157200-ux/easy-al-obour/discussions
