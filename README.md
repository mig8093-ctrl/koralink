# KoraLink MVP (خماسي 5+حارس)

## المتطلبات
- Node.js 18+ (يفضّل 20)
- حساب على Supabase

## 1) إنشاء مشروع Supabase
1. أنشئ مشروع جديد.
2. من Settings → API خذ:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2) إنشاء الجداول (SQL)
افتح Supabase → SQL Editor → New Query
وانسخ محتوى الملف: `supabase/schema.sql`

## 3) إعداد البيئة وتشغيل المشروع
```bash
npm install
cp .env.example .env.local
# عدّل القيم داخل .env.local
npm run dev
```

افتح: http://localhost:3000

## تسجيل الدخول
النسخة الحالية تستخدم Email OTP (Magic Link).


## PWA (Install as an app)

- This project includes a PWA manifest + icons.
- Service worker is enabled in production builds (disabled in dev).
