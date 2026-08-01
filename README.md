<div align="center">

# 📚 المكتبة الشاملة الإباضية

**Al-Maktaba Al-Shamela — تطبيق سطح مكتب حديث للمكتبة الشاملة الإباضية**

[![GitHub Release](https://img.shields.io/github/v/release/8u9i/shamela-modern?style=flat-square&label=الإصدار&color=E99E39)](https://github.com/8u9i/shamela-modern/releases)
[![Platform](https://img.shields.io/badge/منصة-ويندوز%20%7C%20ماك%20%7C%20لينكس-162e24?style=flat-square)]()
[![Build Status](https://img.shields.io/github/actions/workflow/status/8u9i/shamela-modern/release.yml?style=flat-square&label=CI&color=2a4a3a)](https://github.com/8u9i/shamela-modern/actions)
[![License](https://img.shields.io/badge/الرخصة-MIT-07130e?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?style=flat-square&logo=typescript&logoColor=white)]()
[![Electron](https://img.shields.io/badge/Electron-43-47848F?style=flat-square&logo=electron&logoColor=white)]()
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)]()

**⬇ [حمّل أحدث إصدار](https://github.com/8u9i/shamela-modern/releases/latest)**

</div>

---

> ⚠️ **تنبيه:** هذا المشروع **غير رسمي** ولا يمثل فريق المكتبة الشاملة الإباضية. المطور ليس عضواً في الفريق. هذا تطوير شخصي مستقل لواجهة حديثة للمكتبة باستخدام بياناتها المتاحة.  
> *This is not an official project. The developer is not affiliated with the library team.*

---

## ✨ المميزات

| | |
|---|---|
| 📖 **أكثر من 2700 كتاب** | مكتبة إباضية كاملة في التفسير، الحديث، الفقه، العقيدة، التاريخ، والأدب |
| 🔍 **بحث نصي كامل** | ابحث في 688,000+ صفحة بشكل فوري مع إبراز النتائج |
| 📄 **قارئ PDF** | اقرأ الكتب المصورة مباشرة داخل التطبيق |
| ⬇️ **تنزيل PDF دفعة واحدة** | حمّل جميع نسخ PDF (2,010 ملفاً) مرة واحدة للاستخدام الكامل بدون إنترنت، مع الاستئناف بعد إعادة التشغيل |
| 🔄 **تحديث تلقائي** | يتحقق من تحديثات التطبيق ويُثبّتها من الداخل |
| 📡 **تحديث المحتوى** | يحمل الكتب الجديدة من خادم التحديثات |
| 🔖 **علامات وملاحظات** | احفظ تقدمك وأضف ملاحظاتك على الكتب |
| 🛠 **خدمات دمج المؤلفين** | أداة لإصلاح التكرارات في قاعدة البيانات |
| 🌙 **تصميم عتيق** | واجهة pixel-art داكنة مريحة للعين |
| 🌐 **بدون إنترنت** | كل شيء يعمل محلياً بعد التثبيت — بما فيها الخطوط والـ PDF بعد تنزيلها |

---

## ⬇ التحميل السريع

| النظام | الملف | الحجم التقريبي |
|--------|-------|:-------:|
| 🪟 ويندوز | [`Al-Maktaba-Al-Shamela-Setup-*.exe`](https://github.com/8u9i/shamela-modern/releases/latest) | ~80 MB |
| 🍎 ماك (Apple Silicon) | [`Al-Maktaba-Al-Shamela-*-arm64.dmg`](https://github.com/8u9i/shamela-modern/releases/latest) | ~100 MB |
| 🐧 لينكس (AppImage) | [`Al-Maktaba-Al-Shamela-*.AppImage`](https://github.com/8u9i/shamela-modern/releases/latest) | ~110 MB |
| 🐧 لينكس (deb) | [`Al-Maktaba-Al-Shamela-*.deb`](https://github.com/8u9i/shamela-modern/releases/latest) | ~76 MB |

> 💡 أسماء الملفات تتضمن رقم الإصدار — اختر أحدث إصدار من صفحة الإصدارات. بعد تثبيت الإصدار الأول، سيتحقق التطبيق تلقائياً من التحديثات الجديدة ويقوم بتحديث نفسه.

---

## 📥 قاعدة البيانات

قاعدة البيانات تُبنى **تلقائياً عند أول تشغيل** عبر API الموقع الرسمي (eshamila.net) — لا حاجة لتحميل ملف قاعدة بيانات يدوياً. يحتاج التثبيت الأول إلى اتصال بالإنترنت لتحميل الكتب، ثم يعمل التطبيق محلياً بالكامل.

بعد أول تشغيل، تُخزن قاعدة البيانات في مجلد بيانات التطبيق:

| النظام | المسار |
|--------|-------|
| 🪟 ويندوز | `%APPDATA%/Al-Maktaba Al-Shamela/data/` |
| 🍎 ماك | `~/Library/Application Support/Al-Maktaba Al-Shamela/data/` |
| 🐧 لينكس | `~/.config/Al-Maktaba Al-Shamela/data/` |

---

## 🖼 صور من البرنامج

<div align="center">
  <table>
    <tr>
      <td><img src="https://i.pinimg.com/vwebp/474x/0c/7a/be/0c7abeda6b928eff2031af59716cfed9.webp" alt="الواجهة الرئيسية" width="400"/><br/><sub>شاشة البداية</sub></td>
      <td><img src="https://i.pinimg.com/474x/b6/7f/48/b67f4841d6493a4fb9e7dc71063e0d2a.jpg" alt="قارئ الكتب" width="400"/><br/><sub>قارئ الكتب</sub></td>
    </tr>
  </table>
</div>

---

## 🛠 طريقة التثبيت

<details>
<summary>🪟 ويندوز</summary>

1. حمّل ملف `.exe` من صفحة الإصدارات
2. انقر نقراً مزدوجاً على الملف — المثبت سيعمل تلقائياً
3. سيتم إنشاء اختصار على سطح المكتب وقائمة ابدأ
4. شغّل التطبيق من الاختصار

</details>

<details>
<summary>🍎 ماك</summary>

1. حمّل ملف `.dmg` من صفحة الإصدارات
2. افتح الملف واسحب التطبيق إلى مجلد `Applications`
3. عند التشغيل الأول، قد تحتاج إلى فتحه عبر: **زر يمين → فتح**
4. سيظهر التطبيق في Launchpad

</details>

<details>
<summary>🐧 لينكس</summary>

**طريقة AppImage:**
```bash
chmod +x Al-Maktaba-Al-Shamela-*.AppImage
./Al-Maktaba-Al-Shamela-*.AppImage
```

**طريقة deb (أوبونتو/ديبيان):**
```bash
sudo dpkg -i shamela-modern_*_amd64.deb
```

</details>

---

## 🧰 المتطلبات

| | الحد الأدنى |
|--|:-----------:|
| **نظام التشغيل** | ويندوز 10+ / ماك 11+ (Apple Silicon) / أوبونتو 20.04+ |
| **الذاكرة** | 2 GB RAM |
| **المساحة** | 3 GB (تشمل قاعدة البيانات 2.1 GB) |
| **المعالج** | ثنائي النواة 2.0 GHz |
| **الإنترنت** | مطلوب فقط للتحديثات (اختياري) |

---

## 🏗 البناء من المصدر

```bash
# 1. استنساخ المستودع
git clone https://github.com/8u9i/shamela-modern.git
cd shamela-modern

# 2. تثبيت الاعتماديات
npm install

# 3. إعادة بناء better-sqlite3 لإلكترون
npx electron-rebuild -f -w better-sqlite3

# 4. بناء الواجهة
npm run build

# 5. تعبئة لمنصتك
npm run package:win       # ويندوز
npm run package:mac       # ماك
npm run package:linux     # لينكس
npm run package:all       # جميع المنصات
```

### 🧪 تشغيل وضع التطوير

```bash
npm run dev
```

### ✅ تشغيل الاختبارات

```bash
npm run e2e          # بناء + اختبارات
npm run e2e:dev      # اختبارات فقط (دون بناء)
npm run check:size   # التحقق من حجم الحزمة (الميزانية)
```

### 📦 الإصدار الكامل (مع قاعدة البيانات)

```bash
npm run package:full  # يتطلب data/shamela.db
```

---

## 🏗 هيكل المشروع

```
shamela-modern/
├── electron/          # كود الإلكترون (main process)
│   ├── main.js        # النقطة الرئيسية و IPC handlers
│   ├── preload.js     # واجهة الربط مع الواجهة
│   ├── autoUpdater.js # تحديث التطبيق التلقائي
│   ├── update.js      # تحديث محتوى الكتب
│   ├── pdfDownloader.js # تنزيل كتب PDF دفعة واحدة
│   ├── windowState.js # حفظ حالة النافذة
│   └── searchIndex.js # فهرس البحث FTS5
├── src/               # واجهة React
│   ├── components/    # مكونات الواجهة
│   ├── lib/           # أدوات مساعدة
│   ├── styles/        # أنماط CSS
│   └── types/         # تعريفات TypeScript
├── assets/            # أيقونات التطبيق
├── data/              # قواعد البيانات (مستثناة من git)
├── scripts/           # سكربتات مساعدة
├── e2e/               # اختبارات Playwright
└── .github/           # CI/CD
```

---

## 🧱 التقنيات المستخدمة

| التقنية | الغرض |
|---------|-------|
| [Electron 43](https://www.electronjs.org/) | إطار التطبيق |
| [React 19](https://react.dev/) | واجهة المستخدم |
| [TypeScript 7.0](https://www.typescriptlang.org/) | لغة البرمجة |
| [Tailwind CSS 4](https://tailwindcss.com/) | التنسيق |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | قاعدة البيانات |
| [electron-updater](https://github.com/electron-userland/electron-builder) | التحديث التلقائي |
| [electron-builder](https://www.electron.build/) | التعبئة والتوزيع |
| [Vite 8](https://vitejs.dev/) | بناء الواجهة |
| [Playwright](https://playwright.dev/) | اختبارات E2E |

---

## 🤝 المساهمة

نرحب بمساهماتكم! يمكنكم:

- فتح **Issue** للإبلاغ عن مشكلة أو اقتراح ميزة
- فتح **Pull Request** لإضافة تحسين أو إصلاح
- المساعدة في ترجمة الواجهة أو تحسينها

---

## 📜 الرخصة

هذا المشروع مرخص تحت [MIT License](LICENSE).

بيانات المكتبة من [eshamila.net](https://eshamila.net). الواجهة الحديثة مطورة من الصفر.

---

<div align="center">
  <sub>مبني بـ ❤️ لخدمة التراث الإباضي</sub>
  <br/>
  <a href="https://eshamila.net">eshamila.net</a> •
  <a href="https://github.com/8u9i/shamela-modern/releases">الإصدارات</a> •
  <a href="https://github.com/8u9i/shamela-modern/issues">المشكلات</a>
</div>
