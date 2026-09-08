# نقشهٔ راه (Plan)

وضعیت محصول در برابر فازهای مشخصات اولیه و کارهای بعدی.

نیازمندی‌ها با وضعیت بندبه‌بند: [`README_REQUIRE.md`](README_REQUIRE.md)  
راه‌اندازی: [`README.md`](README.md)  
جزئیات پیاده‌سازی هر فاز: `docs/PHASE_*.md`

---

## وضعیت کلی

**هستهٔ قابل فروش آماده است:** ثبت‌نام → سازمان → قالب → صدور تکی/انبوه → PDF/HTML → QR → استعلام → تیم → پرداخت → API → وب‌هوک.

آنچه مانده یا **عملیاتی (پروداکشن)** است، یا در مشخصات بوده و هنوز UI/API کامل ندارد، یا **عمداً بعد از MVP** است.

```
Phase 1 Foundation ████████████ انجام
Phase 2 Certificate core ████████████ انجام
Phase 3 PDF ██████████░░ انجام (html در dev؛ weasyprint برای چاپ)
Phase 4 Bulk ████████████ انجام
Phase 5 Email ████████░░░░ انجام ناقص (SMTP/bounce)
Phase 6 Analytics ██████████░░ انجام (geo/device ناقص)
Phase 7 API + Webhooks ██████████░░ انجام (v1 محدود)
Phase 8 Billing ████████████ انجام
Phase 9 White label ██████░░░░░░ لوگو/رنگ انجام؛ دامنه نه
```

---

## فازهای انجام‌شده

| فاز مشخصات | محتوا | سند |
|------------|--------|-----|
| 1 Foundation | سازمان، عضویت، RBAC، JWT، داشبورد، پلن DB، ادمین پلتفرم | `docs/PHASE_1.md` |
| 2 Certificate core | نوع، قالب نسخه‌دار، صدور، توکن، QR، استعلام | `docs/PHASE_2.md` |
| 3 PDF | رندر canvas، دانلود، پیش‌نمایش چاپ | همان |
| 4 Bulk | CSV/Excel، map، validate، صف، ZIP | همان + `docs/PHASE_6.md` |
| 5 Email | قالب ایمیل، ارسال صف‌شده | `docs/PHASE_5.md` |
| 6 Analytics | داشبورد و سری صدور/استعلام | `docs/PHASE_5.md` |
| 7 API | کلید، `/api/v1/`، وب‌هوک HMAC | `docs/PHASE_5.md` |
| 8 Billing | اشتراک، مصرف، Zibal/BitPay | `docs/PHASE_5.md` |
| ۹ (جزئی) | برندینگ لوگو/رنگ؛ designer کامل | `docs/PHASE_6.md` |

شماره‌گذاری فایل‌های `docs/PHASE_*` با شمارهٔ مشخصات یکی نیست (مثلاً PHASE_5 چند فاز مشخصات را پوشش می‌دهد). این جدول مرجع است.

---

## حالا چه کار کنیم (اولویت پیشنهادی)

ترتیب پیشنهادی برای کار بعدی؛ تا وقتی اولویت عوض نشده همین است.

### P0 — آمادهٔ مشتری واقعی (عملیاتی)

بدون این‌ها صدور انبوه و ایمیل در سرور واقعی reliably کار نمی‌کند.

1. **Celery worker + Redis در پروداکشن** — ZIP، ایمیل گواهی، تحویل وب‌هوک. `CELERY_TASK_ALWAYS_EAGER` فقط تست است.
2. **`PDF_PROVIDER=weasyprint`** — فونت فارسی embed و تطبیق با قالب؛ `.env` فعلاً `html` است.
3. **SMTP واقعی** — به‌جای `console.EmailBackend`.
4. **Postgres + ذخیرهٔ فایل** — SQLite فقط برای dev محلی؛ MinIO/Parspack برای فایل.

### P1 — در مشخصات بود، هنوز کامل نیست

| کار | چرا |
|-----|-----|
| **تمدید گواهی** | مدل `previous_certificate` هست؛ API `POST …/renew/` و دکمه در جزئیات گواهی نیست |
| **دامنهٔ اختصاصی / white-label DNS** | `Branding.custom_domain` ذخیره می‌شود؛ routing نیست |
| **Reissue / تصحیح با audit** | صدور جدید ممکن است؛ جریان UI مشخص برای «اشتباه صادر شد» نیست |
| **اشتراک لینک** | واتساپ روی استعلام هست؛ LinkedIn / Telegram / copy به‌صورت محصول کامل نیست |
| **خروجی Excel** | وارد Excel می‌شود؛ خروجی لیست CSV است |
| **ادمین پلتفرم غنی‌تر** | تعلیق/وضعیت هست؛ مدیریت پلن، مصرف، لاگ، قالب سیستم در UI نیست |
| **API v1 bulk و renew** | صدور تکی و revoke هست |

### P2 — عمق محصول

- پر کردن `VerificationEvent` (کشور، دستگاه، مرورگر) و نمودار در analytics
- rate limit و retry غنی‌تر برای ایمیل انبوه؛ وضعیت bounce
- ممیزی i18n (حذف متن فارسی hard-code در پاسخ API)
- پوشش تست هدفمندتر (tenant isolation، شماره یکتا، webhook signature)
- a11y و polish موبایل designer

### P3 — بعد از MVP (عمداً نساز)

- Recipient wallet و پروفایل عمومی `/profile/{username}`
- Open Badges / digital credential
- مارکت‌پلیس قالب
- اتصال Moodle، WordPress، Zapier، Make
- SSO
- لنگر بلاکچین
- SLA / اولویت پشتیبانی به‌عنوان فیچر نرم‌افزاری جدا (الان فقط روی پلن Business نوشته شده)

---

## تصمیم‌های معماری که عوض نمی‌شوند

این‌ها را در کار بعدی دور نزن؛ جزئیات در `docs/ARCHITECTURE.md`.

- Tenant اول است: `Organization` نه «کاربر مدیر».
- سقف پلن در view hard-code نشود؛ از `Plan.capabilities` بخوان.
- نام برند hard-code نشود.
- تاریخ شمسی در دیتابیس ذخیره نشود.
- منطق دامنه به درگاه پرداخت / MinIO / SMTP / WeasyPrint import نکند.
- استعلام عمومی با PK عددی نباشد.
- بلاکچین به MVP اضافه نشود.

---

## معیار «فاز تمام شد»

برای هر کار P0/P1:

- رفتار در UI و API مشخص باشد  
- محدودیت پلن اگر معنا دارد اعمال شود  
- تست یا مسیر دستی در سند فاز نوشته شود  
- `README_REQUIRE.md` وضعیت همان ID را به‌روز کند  

فازهای تاریخی را بازنویسی نکن؛ اگر کار جدیدی ship شد، یا همین فایل را به‌روز کن یا `docs/PHASE_N.md` جدید بساز و اینجا لینک بده.
