// Generates src/data/seed.beers2023.json — the single canonical Beers 2023 seed.
// Source of truth: translated data.md (Tables 2–6, Table 7 flags, Box 1),
// cross-checked against datalab-output-nihms-1965107.pdf.md (English article).
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
const DATA = "d:/Work/Code/Repositories/GeriaPharm/src/data/";
const OLD = ["seed.fa.json", "seed-extra.json", "seed-extra-2.json", "seed-extra-3.json"];
const old = OLD.flatMap((f) => JSON.parse(readFileSync(DATA + f, "utf8")));
const byOld = new Map(old.map((r) => [r.id, r]));
const LAST = "2026-11-11";
const NOTE =
  "بر اساس معیارهای بیرز ۲۰۲۳ انجمن سالمندان آمریکا (AGS). ترجمه و داده بالینی پیش از استفاده بالینی نیازمند بازبینی تخصصی است.";
const SIADH_NOTE =
  "معیار جدول ۴: با شروع یا تغییر دوز، سدیم خون بابت احتمال ترشح نامناسب هورمون ضدادراری (SIADH) و هیپوناترمی پایش شود.";
const BOX1 =
  "نکته کادر ۱: هنگام انتخاب میان DOACها و تعیین دوز، عملکرد کلیه (جدول ۶)، اندیکاسیون و وزن بیمار به‌طور ویژه مد نظر قرار گیرد.";
// ---- Row-level Persian text (Tables 2–6) ----
const R = {
  antihist: {
    rec: "از مصرف آنتی‌هیستامین‌های نسل اول در سالمندان پرهیز شود؛ برای آلرژی نسل دوم و برای بی‌خوابی راهکارهای غیردارویی انتخاب شود. (استفاده از دیفن‌هیدرامین در درمان حاد واکنش‌های آلرژیک شدید بلامانع است).",
    rat: "خاصیت آنتی‌کولینرژیک بسیار قوی؛ کلیرانس با افزایش سن کاهش می‌یابد؛ در استفاده به‌عنوان خواب‌آور تحمل دارویی ایجاد می‌شود؛ خطر گیجی، خشکی دهان، یبوست و سمیت آنتی‌کولینرژیک بالاست. بار تجمعی آنتی‌کولینرژیک با افزایش خطر سقوط، دلیریوم و زوال عقل همراه است.",
    ev: "Moderate", st: "Strong",
    alts: ["لوراتادین یا ستریزین برای آلرژی", "ملاتونین و درمان شناختی-رفتاری برای بی‌خوابی"],
  },
  nitro: {
    rec: "در افراد با کلیرانس کراتینین کمتر از ۳۰ میلی‌لیتر در دقیقه یا جهت سرکوب طولانی‌مدت عفونت پرهیز شود.",
    rat: "پتانسیل مسمومیت ریوی، سمیت کبدی و نوروپاتی محیطی، به‌ویژه در مصرف طولانی‌مدت؛ جایگزین‌های ایمن‌تری موجود است.",
    ev: "Low", st: "Strong", alts: ["فورازولیدون", "سفالوسپورین‌های نسل سوم بر عفونت ادراری غیرپیچیده"],
  },
  aspirin: {
    rec: "از شروع آسپرین برای پیشگیری اولیه قلبی-عروقی خودداری شود؛ در مصرف‌کنندگان قبلی قطع دارو (deprescribing) ارزیابی شود. (در پیشگیری ثانویه با سابقه بیماری قلبی عروقی مصرف مجاز است).",
    rat: "خطر خونریزی عمده در سالمندان افزایش چشمگیر می‌یابد؛ مطالعات نشان‌دهنده عدم فایده خالص و احتمال آسیب هنگام شروع در سالمندان هستند.",
    ev: "High", st: "Strong", alts: ["در پیشگیری ثانویه: کلوپیدوگرل", "کنترل عوامل خطر قلبی-عروقی بدون آسپرین"],
  },
  warfarin: {
    rec: "از شروع وارفارین به‌عنوان درمان خط اول برای ترومبوآمبولی وریدی (VTE) یا فیبریلاسیون دهلیزی غیردریچه‌ای خودداری شود، مگر آنکه DOACها منع مصرف داشته باشند یا موانع جدی دسترسی وجود داشته باشد. در مصرف‌کنندگان قدیمی با INR کنترل‌شده و پایدار (بیش از ۷۰٪ زمان در دامنه درمانی) ادامه دارو ممکن است منطقی باشد.",
    rat: "خطر بالاتر خونریزی عمده (به‌ویژه داخل جمجمه‌ای) و اثربخشی برابر یا کمتر نسبت به DOACها.",
    ev: "High", st: "Strong", alts: ["آپیکسابان", "دابیگاتران"],
  },
  rivaroxaban: {
    rec: "از مصرف ریواروکسابان برای درمان طولانی‌مدت فیبریلاسیون دهلیزی غیردریچه‌ای یا VTE به نفع گزینه‌های ایمن‌تر (به‌ویژه آپیکسابان) پرهیز شود.",
    rat: "در دوزهای درمانی خطر بالاتر خونریزی عمده و گوارشی در سالمندان نسبت به سایر DOACها.",
    ev: "Moderate", st: "Strong", alts: ["آپیکسابان؛ دوز بر اساس اندیکاسیون، سن، وزن و عملکرد کلیه"],
  },
  dipyridamole: {
    rec: "پرهیز شود. (فرم وریدی در تست‌های استرس قلب قابل استفاده است).",
    rat: "احتمال افت فشار خون وضعیتی؛ گزینه‌های مؤثرتری وجود دارد.",
    ev: "Moderate", st: "Strong", alts: ["کلوپیدوگرل یا آسپرین کم‌دوز در ضدپلاکتی"],
  },
  alpha1: {
    rec: "از مصرف به‌عنوان داروی ضد فشار خون پرهیز شود.",
    rat: "خطر بالای افت فشار خون ارتوستاتیک و حوادث ناشی از آن؛ برای درمان روتین فشار خون توصیه نمی‌شوند.",
    ev: "Moderate", st: "Strong", alts: ["تیازیدها یا مهارکننده‌های کانال کلسیم دی‌هیدروپیریدینی کم‌اثر"],
  },
  centralAlpha: {
    rec: "از مصرف کلونیدین به‌عنوان خط اول و سایر آگونیست‌های آلفای مرکزی در فشار خون پرهیز شود.",
    rat: "خطر بالای عوارض سیستم عصبی مرکزی، برادی‌کاردی و افت فشار خون ارتوستاتیک.",
    ev: "Low", st: "Strong", alts: ["تیازیدها یا مهارکننده‌های کانال کلسیم"],
  },
  nifedipine: {
    rec: "پرهیز شود.", rat: "پتانسیل افت شدید فشار خون و خطر بروز ایسکمی میوکارد.",
    ev: "High", st: "Strong", alts: ["نیفدیپین با رهش کنترل‌شده یا آملودیپین"],
  },
  amiodarone: {
    rec: "به‌عنوان درمان خط اول فیبریلاسیون دهلیزی پرهیز شود، مگر در بیماران با نارسایی قلبی هم‌زمان یا هیپرتروفی بطن چپ شدید.",
    rat: "در حفظ ریتم سینوسی مؤثر است اما سمیت بیشتری نسبت به سایر ضدآریتمی‌ها دارد.",
    ev: "High", st: "Strong", alts: ["کنترل ضربان با دیلتیازم یا وراپامیل (در صورت فقدان نارسایی قلبی)"],
  },
  dronedarone: {
    rec: "در فیبریلاسیون دهلیزی دائمی یا نارسایی قلبی شدید پرهیز شود؛ در کسر تخلیه‌ای کاهش‌یافته با علائم خفیف با احتیاط مصرف شود.",
    rat: "پیامدهای بالینی بدتر در فیبریلاسیون دهلیزی دائمی یا نارسایی قلبی شدید و اخیراً دکمپانسه‌شده.",
    ev: "High", st: "Strong", alts: ["کنترل ضربان", "آمیودارون در صورت اندیکاسیون"],
  },
  digoxin: {
    rec: "به‌عنوان خط اول فیبریلاسیون دهلیزی یا نارسایی قلبی پرهیز شود؛ در صورت مصرف در نارسایی قلبی از دوزهای بیش از ۰٫۱۲۵ میلی‌گرم در روز خودداری شود.",
    rat: "در فیبریلاسیون دهلیزی خط اول نیست؛ در نارسایی قلبی با کسر تخلیه‌ای کاهش‌یافته دوزهای بالاتر سود بیشتری نداشته و مسمومیت ایجاد می‌کنند. شواهد: فیبریلاسیون دهلیزی متوسط، نارسایی قلبی پایین و دوز بالاتر از ۰٫۱۲۵ متوسط؛ توصیه قوی.",
    ev: "Moderate", st: "Strong", alts: ["کنترل ضربان با دیلتیازم (در صورت فقدان HFrEF)"],
  },
  tca: {
    rec: "پرهیز شود.",
    rat: "شدیداً آنتی‌کولینرژیک، خواب‌آور و عامل افت فشار ارتوستاتیک. (ایمنی دوکسپین با دوز کمتر از ۶ میلی‌گرم در روز مشابه دارونما است).",
    ev: "High", st: "Strong", alts: ["سرترالین یا سیتالوپرام (با احتیاط پایش هیپوناترمی)", "در بی‌خوابی: ملاتونین"],
  },
  antiparkinsonAc: {
    rec: "پرهیز شود.",
    rat: "برای پیشگیری یا درمان عوارض خارج هرمی ناشی از آنتی‌پسیکوتیک‌ها توصیه نمی‌شوند؛ گزینه‌های بهتری برای پارکینسون در دسترس است.",
    ev: "Moderate", st: "Strong", alts: ["آمانتادین", "مهارکننده‌های MAO-B"],
  },
  antipsych: {
    rec: "از مصرف برای کنترل اختلالات رفتاری دمانس یا دلیریوم پرهیز شود، مگر پس از شکست اقدامات غیردارویی و در صورت خطر آسیب به خود یا دیگران. (موارد تأییدشده FDA نظیر اسکیزوفرنیا، اختلال دوقطبی و روان‌پریشی پارکینسون مستثنی هستند).",
    rat: "افزایش خطر سکته مغزی، زوال شناختی و مرگ‌ومیر در افراد مبتلا به دمانس.",
    ev: "Moderate", st: "Strong", alts: ["اقدامات غیردارویی رفتاری", "در پارکینسون: کوئتیاپین یا پیماوانسرین"],
  },
  barb: {
    rec: "پرهیز شود.",
    rat: "وابستگی فیزیکی شدید، تحمل نسبت به اثرات خواب‌آوری و خطر بالای بیش‌مصرفی در دوزهای پایین.",
    ev: "High", st: "Strong", alts: ["ملاتونین برای بی‌خوابی"],
  },
  benzo: {
    rec: "پرهیز شود.",
    rat: "افزایش خطر اختلالات شناختی، دلیریوم، زمین‌خوردن، شکستگی، تصادفات رانندگی و وابستگی فیزیکی شدید. مصرف هم‌زمان با اوپیوئیدها خطر دپرسیون تنفسی، کما و مرگ دارد. (در اختلالات تشنجی، ترک الکل، اختلال رفتار خواب REM و اضطراب فراگیر شدید ممکن است مناسب باشد).",
    ev: "Moderate", st: "Strong", alts: ["ملاتونین", "در اضطراب: درمان شناختی-رفتاری"],
  },
  zdrug: {
    rec: "پرهیز شود.",
    rat: "عوارض مشابه بنزودیازپین‌ها (سقوط، شکستگی، دلیریوم، تصادف) با بهبود حداقلی در مدت زمان و تأخیر به خواب رفتن.",
    ev: "Moderate", st: "Strong", alts: ["ملاتونین و درمان شناختی-رفتاری بی‌خوابی"],
  },
  meprobamate: { rec: "پرهیز شود.", rat: "نرخ بالای وابستگی فیزیکی؛ اثر تسکینی و خواب‌آوری بسیار شدید.", ev: "Moderate", st: "Strong", alts: ["ملاتونین", "در اضطراب: درمان شناختی-رفتاری"] },
  ergoloid: { rec: "پرهیز شود.", rat: "عدم اثربخشی بالینی.", ev: "High", st: "Strong", alts: [] },
  androgen: {
    rec: "پرهیز شود، مگر برای هیپوگنادیسم بالینی قطعی و علامت‌دار.",
    rat: "پتانسیل عوارض قلبی؛ خطرات احتمالی در مردان مبتلا به سرطان پروستات.",
    ev: "Moderate", st: "Weak", alts: ["ارزیابی علل قابل درمان هیپوگنادیسم"],
  },
  estrogen: {
    rec: "از شروع استروژن‌های سیستمیک (خوراکی یا پوستی) پرهیز شود؛ در مصرف‌کنندگان فعلی قطع دارو ارزیابی شود. استروژن موضعی واژینال کم‌دوز مجاز است.",
    rat: "شواهد سرطان‌زایی (سینه و اندومتر)؛ عدم محافظت قلبی یا شناختی؛ افزایش خطر سکته مغزی، ترومبوز و دمانس در شروع پس از ۶۰ سالگی. استروژن واژینال برای خشکی و عفونت ادراری در دوز پایین ایمن و مؤثر است. شواهد: خوراکی/پوستی بالا و کرم واژینال متوسط؛ قدرت توصیه: خوراکی/پوستی قوی و واژینال ضعیف.",
    ev: "High", st: "Strong", alts: ["استروژن واژینال کم‌دوز", "در گرگرفتگی: مهارکننده‌های انتخابی بازجذب سروتونین"],
  },
  insulin: {
    rec: "پرهیز شود (این توصیه شامل رژیم‌های دارای انسولین پایه نمی‌شود).",
    rat: "خطر بالای هیپوگلیسمی بدون بهبود در کنترل قند خون در درازمدت.",
    ev: "Moderate", st: "Strong", alts: ["رژیم‌های انسولین پایه‌دار"],
  },
  su: {
    rec: "به‌عنوان خط اول یا دوم درمان مونوتراپی یا ترکیبی پرهیز شود؛ در صورت لزوم مصرف، نوع کوتاه‌اثر (گلی‌پیزید) بر انواع طولانی‌اثر ارجح است.",
    rat: "خطر بالای حوادث قلبی-عروقی، مرگ ناشی از تمام علل و هیپوگلیسمی در مقایسه با سایر داروها؛ انواع طولانی‌اثر خطر هیپوگلیسمی طولانی‌مدت‌تری دارند. شواهد: حوادث قلبی/مرگ متوسط، هیپوگلیسمی بالا و سکته ایسکمیک پایین؛ توصیه قوی.",
    ev: "Moderate", st: "Strong", alts: ["داغلیفلوزین یا سیتاگلیپتین", "متفورمین در صورت عملکرد کلیه کافی"],
  },
  desiccatedThyroid: { rec: "پرهیز شود.", rat: "نگرانی از عوارض قلبی؛ جایگزین‌های ایمن‌تر موجود است.", ev: "Low", st: "Strong", alts: ["لووتیروکسین"] },
  megestrol: { rec: "پرهیز شود.", rat: "تأثیر ناچیز بر وزن؛ افزایش خطر حوادث ترومبوتیک و احتمالاً مرگ در سالمندان.", ev: "Moderate", st: "Strong", alts: ["ارزیابی و درمان علل برگشت‌پذیر کاهش وزن"] },
  gh: {
    rec: "پرهیز شود، به استثنای افراد با کمبود قطعی هورمون رشد با علت شناخته‌شده.",
    rat: "اثر اندک بر ترکیب بدنی؛ همراه با ادم، درد مفاصل، سندرم تونل کارپ، ژنیکوماستی و اختلال قند خون ناشتا.",
    ev: "High", st: "Strong", alts: [],
  },
  ppi: {
    rec: "از مصرف زمان‌بندی‌شده بیش از ۸ هفته پرهیز شود، مگر در بیماران پرخطر (مصرف مزمن کورتون یا NSAID، مری بارت، ازوفاژیت اروزیو و...).",
    rat: "خطر عفونت کلستریدیوم دیفیسیل، پنومونی، بدخیمی‌های گوارشی، کاهش تراکم استخوان و شکستگی. شواهد: کلستریدیوم و شکستگی بالا؛ پنومونی و بدخیمی متوسط؛ توصیه قوی.",
    ev: "Moderate", st: "Strong", alts: ["قطع تدریجی و «on-demand»", "ضداسید یا میزوپروستول در صورت نیاز"],
  },
  metoclopramide: {
    rec: "پرهیز شود، مگر در گاستروپارزی که دوره درمان نباید از ۱۲ هفته فراتر رود.",
    rat: "ایجاد عوارض خارج هرمی، از جمله تاردیودیسکینزی، به‌ویژه در سالمندان شکننده و در مصرف طولانی.",
    ev: "Moderate", st: "Strong", alts: ["متوکلوپرامید فقط کوتاه‌مدت", "در تهوع: اوندانسترون"],
  },
  antispasmodic: {
    rec: "پرهیز شود.", rat: "اثرات آنتی‌کولینرژیک بالا و اثربخشی نامشخص.",
    ev: "Moderate", st: "Strong", alts: ["در اسپاسم گوارشی: اسپاسمولیتیک‌های غیرآنتی‌کولینرژیک"],
  },
  mineralOil: { rec: "پرهیز شود.", rat: "پتانسیل آسپیراسیون ریوی و عوارض جانبی؛ گزینه‌های ایمن‌تر موجود است.", ev: "Moderate", st: "Strong", alts: ["ملاتیل‌سولفات، لاکتولوز یا فیبرهای غذایی"] },
  desmopressin: {
    rec: "جهت درمان شب‌ادراری یا پرادراری شبانه پرهیز شود.",
    rat: "خطر بالای هیپوناترمی شدید؛ وجود درمان‌های ایمن‌تر برای شب‌ادراری.",
    ev: "Moderate", st: "Strong", alts: ["محدودیت مایعات شبانه", "اتموپتید در صورت دسترسی"],
  },
  nsaid: {
    rec: "از مصرف مزمن پرهیز شود، مگر عدم اثربخشی سایر گزینه‌ها و همراهی با داروی محافظ دستگاه گوارش (PPI یا میزوپروستول). از مصرف کوتاه‌مدت برنامه‌ریزی‌شده همراه با کورتیکواستروئید، ضدانعقاد یا ضدپلاکت نیز پرهیز شود.",
    rat: "افزایش خطر خونریزی گوارشی یا زخم پپتیک در سالمندان (به‌ویژه بالای ۷۵ سال یا مصرف‌کنندگان کورتیکواستروئید، ضدانعقاد یا ضدپلاکت)، افزایش فشار خون و نارسایی کلیوی.",
    ev: "Moderate", st: "Strong", alts: ["استامینوفن", "دوکسی‌سایکلین یا گاباپنتین (در درد نوروپاتیک)"],
  },
  nsaidHard: {
    rec: "پرهیز شود.",
    rat: "در میان NSAIDها ایندومتاسین بیشترین عوارض جانبی از جمله عوارض CNS را دارد؛ کتورولاک خطر بسیار بالای آسیب حاد کلیه و خونریزی گوارشی دارد.",
    ev: "Moderate", st: "Strong", alts: ["استامینوفن", "سایر NSAIDها با احتیاط و کمترین دوز مؤثر"],
  },
  meperidine: { rec: "پرهیز شود.", rat: "در دوزهای متداول خوراکی مؤثر نیست؛ خطر بالای سمیت عصبی از جمله دلیریوم.", ev: "Moderate", st: "Strong", alts: ["مورفین", "هیدرومورفون"] },
  mrs: {
    rec: "پرهیز شود.",
    rat: "تحمل ضعیف به‌علت اثرات آنتی‌کولینرژیک، تسکین‌بخشی شدید و افزایش خطر شکستگی؛ اثربخشی آن‌ها در دوزهای قابل‌تحمل در سالمندان مورد تردید است. (این معیار شامل باکلوفن و تیزانیدین که برای اسپاستیسیتی به کار می‌روند نمی‌شود).",
    ev: "Moderate", st: "Strong", alts: ["فیزیوتراپی", "باکلوفن یا تیزانیدین در اسپاستیسیتی"],
  },
  dabigatran4: {
    rec: "در ترجیح دابیگاتران نسبت به سایر DOACها (به‌ویژه آپیکسابان) برای درمان طولانی‌مدت احتیاط شود.",
    rat: "افزایش خطر خونریزی گوارشی نسبت به وارفارین و افزایش خطر خونریزی عمده و گوارشی در مقایسه با آپیکسابان.",
    ev: "Moderate", st: "Strong", alts: ["آپیکسابان"],
  },
  prasugrelTicagrelor: {
    rec: "با احتیاط مصرف شود، به‌ویژه در سنین ۷۵ سال و بالاتر؛ در صورت مصرف پراسوگرل دوز کمتر (۵ میلی‌گرم) در نظر گرفته شود.",
    rat: "هر دو دارو خطر خونریزی عمده را در مقایسه با کلوپیدوگرل در افراد بالای ۷۵ سال افزایش می‌دهند، هرچند ممکن است فواید قلبی خاصی داشته باشند.",
    ev: "Moderate", st: "Strong", alts: ["کلوپیدوگرل"],
  },
  siadh: {
    rec: "با احتیاط مصرف شود؛ سدیم خون در زمان شروع یا تغییر دوز پایش گردد.",
    rat: "پتانسیل القا یا تشدید ترشح نامناسب هورمون ضدادراری (SIADH) یا هیپوناترمی.",
    ev: "Moderate", st: "Strong", alts: [],
  },
  dmq: {
    rec: "با احتیاط مصرف شود (این هشدار شامل درمان اثر پسودوبولبار نمی‌شود).",
    rat: "اثربخشی محدود در علائم رفتاری دمانس؛ افزایش خطر سقوط و تداخلات دارویی مهم.",
    ev: "Moderate", st: "Strong", alts: [],
  },
  cotrim4: {
    rec: "در بیماران مصرف‌کننده مهارکننده‌های ACE، ARBها یا ARNI با نارسایی کلیوی با احتیاط مصرف شود.",
    rat: "افزایش خطر هیپرکالمی در مصرف هم‌زمان با مهارکننده‌های ACE، ARBها یا ARNI در صورت کاهش کلیرانس کراتینین.",
    ev: "Low", st: "Strong", alts: ["سفالوسپورین‌های نسل سوم", "نیتروفورانتوئین در CrCl بالای ۳۰"],
  },
  sglt2: {
    rec: "با احتیاط مصرف شود؛ علائم عفونت ادراری و اسیدوز پایش گردد.",
    rat: "افزایش خطر عفونت‌های ادراری-تناسلی (به‌ویژه در ماه اول و در زنان) و خطر کتواسیدوز دیابتی با قند خون طبیعی (euglycemic DKA).",
    ev: "Moderate", st: "Weak", alts: [],
  },
  corticosteroid: {
    rec: "با احتیاط مصرف شود؛ در صورت ضرورت با کمترین دوز و کوتاه‌ترین مدت مصرف گردد.",
    rat: "القا یا تشدید دلیریوم حاد در سالمندان (جدول ۳: کورتیکواستروئیدهای خوراکی و تزریقی)؛ عوارض متابولیک و افزایش خطر عفونت.",
    ev: "Moderate", st: "Strong", alts: [],
  },
  ras: {
    rec: "با احتیاط مصرف شود؛ پتاسیم سرم و عملکرد کلیه پایش گردد.",
    rat: "هیپرکالمی در مصرف هم‌زمان با دیورتیک‌های نگهدارنده پتاسیم یا سایر مهارکننده‌های سیستم رینین-آنژیوتانسین در بیماری مزمن کلیوی (جدول ۵).",
    ev: "Moderate", st: "Strong", alts: [],
  },
  opioid: {
    rec: "با احتیاط مصرف شود؛ کمترین دوز مؤثر و کوتاه‌ترین مدت استفاده شود.",
    rat: "اوپیوئیدها خطر دلیریوم، سقوط، شکستگی، یبوست و بیش‌مصرفی را در سالمندان بالا می‌برند؛ مصرف هم‌زمان با بنزودیازپین‌ها یا گاباپنتینوئیدها پرهیز شود (جدول ۵).",
    ev: "Moderate", st: "Strong", alts: ["در درد مزمن: درمان‌های غیردارویی و استامینوفن"],
  },
};

// ---- Table 3 disease-interaction texts ----
const C = {
  hf: { condition: "Heart Failure", rationale: "القای احتباس مایعات و تشدید نارسایی قلبی؛ افزایش مرگ‌ومیر در برخی داروها (سیلوستازول و دروندارون)؛ نگرانی طولانی شدن فاصله QT (دکسترومتورفان-کینیدین)." },
  syncope: { condition: "Syncope", rationale: "مسدودکننده‌های آلفا، سه‌حلقه‌ای‌ها و آنتی‌پسیکوتیک‌ها خطر افت فشار خون ارتوستاتیک را بالا می‌برند؛ مهارکننده‌های استیل‌کولین‌استراز باعث برادی‌کاردی می‌شوند.", recommendation: "در سالمندانی که علت سنکوپ ممکن است برادی‌کاردی یا افت فشار خون ارتوستاتیک باشد، پرهیز شود." },
  delirium: { condition: "Delirium", rationale: "القا یا تشدید دلیریوم حاد.", recommendation: "پرهیز شود." },
  dementia: { condition: "Dementia", rationale: "عوارض جانبی شدید سیستم عصبی مرکزی؛ در آنتی‌پسیکوتیک‌ها افزایش خطر سکته مغزی، زوال سریع‌تر شناختی و مرگ.", recommendation: "پرهیز شود." },
  falls: { condition: "History of Falls or Fractures", rationale: "ایجاد آتاکسی، اختلال روانی-حرکتی، سنکوپ و سقوط مجدد؛ حتی بنزودیازپین‌های کوتاه‌اثر ایمن‌تر از طولانی‌اثرها نیستند. (ضد تشنج‌ها برای تشنج و اختلالات خلقی و اوپیوئیدها برای کنترل درد حاد شدید مستثنی هستند.)", recommendation: "پرهیز شود، مگر آنکه جایگزین ایمن‌تری نباشد." },
  parkinson: { condition: "Parkinson Disease", rationale: "آنتاگونیست‌های گیرنده دوپامین باعث بدتر شدن شدید علائم پارکینسون می‌شوند.", recommendation: "پرهیز شود." },
  pud: { condition: "Peptic Ulcer Disease", rationale: "تشدید زخم‌های موجود یا ایجاد زخم‌های جدید و خونریزی.", recommendation: "پرهیز شود، مگر آنکه داروی محافظت‌کننده معده (PPI یا میزوپروستول) هم‌زمان مصرف گردد." },
  incontinence: { condition: "Urinary Incontinence in Women", rationale: "تشدید بی‌اختیاری ادراری (آلفا بلوکرها) و عدم اثربخشی بالینی (استروژن خوراکی).", recommendation: "در زنان پرهیز شود." },
  bph: { condition: "BPH / LUTS in men", rationale: "کاهش جریان ادرار و القای احتباس حاد ادراری.", recommendation: "در مردان پرهیز شود." },
  osteoporosis: { condition: "Osteoporosis", rationale: "کورتیکواستروئیدهای سیستمیک (خوراکی یا تزریقی) باعث از دست رفتن تراکم استخوان و افزایش خطر شکستگی می‌شوند.", recommendation: "در زنان و مردان مبتلا به پوکی استخوان پرهیز شود." },
  hypotension: { condition: "Symptomatic Hypotension", rationale: "آنتی‌پسیکوتیک‌ها، مسدودکننده‌های آلفا-۱ و ضدافسرده‌های سه‌حلقه‌ای خطر افت فشار خون علامت‌دار را بالا می‌برند.", recommendation: "در بیماران مبتلا به افت فشار خون علامت‌دار پرهیز شود." },
};
// ---- Table 5 drug–drug interaction texts ----
const DDI = {
  ras: { target: "RAS inhibitors (ACEIs, ARBs, ARNIs) or Potassium-sparing diuretics (Amiloride, Triamterene, Spironolactone)", severity: "Avoid", rationale: "افزایش شدید خطر هیپرکالمی (در بیماران با بیماری مزمن کلیوی).", action: "از مصرف هم‌زمان روتین دو یا چند دارو در بیماران با بیماری مزمن کلیوی (مرحله ۳a به بالا) پرهیز شود؛ پتاسیم سرم و عملکرد کلیه پایش شود." },
  opioidBenzo: { target: "Benzodiazepines", severity: "Avoid", rationale: "افزایش خطر بیش‌مصرفی، دپرسیون تنفسی و مرگ.", action: "از مصرف هم‌زمان پرهیز شود؛ جایگزین‌های غیردارویی یا غیربنزودیازپینی در نظر گرفته شود." },
  opioidGaba: { target: "Gabapentinoids (Gabapentin, Pregabalin)", severity: "Avoid", rationale: "افزایش خطر تسکین شدید، تضعیف تنفس و مرگ.", action: "مگر در مرحله انتقال درمانی (transition) یا کاهش دوز اوپیوئید، از مصرف هم‌زمان پرهیز شود." },
  alpha1Loop: { target: "Loop Diuretics (Furosemide, Bumetanide, Torsemide)", severity: "Avoid", rationale: "افزایش خطر بی‌اختیاری ادراری در زنان سالمند.", action: "در زنان سالمند پرهیز شود مگر با ضرورت بالینی؛ پتاسیم سرم پایش شود." },
  warfarinMacrolide: { target: "Macrolides (Erythromycin, Clarithromycin)", severity: "Avoid", rationale: "مهار متابولیسم وارفارین و افزایش شدید خطر خونریزی.", action: "تا حد امکان پرهیز شود؛ در صورت مصرف، INR و علائم خونریزی پایش شود." },
  warfarinCotrim: { target: "Cotrimoxazole", severity: "Avoid", rationale: "مهار متابولیسم وارفارین و افزایش شدید خطر خونریزی.", action: "تا حد امکان پرهیز شود؛ INR دقیقاً پایش شود." },
};
// ---- Table 6 renal rows (parseable grammar: value = threshold only) ----
const NSAID_RENAL = { threshold: "CrCl < 30 mL/min", action: "Avoid", guidance: "در CrCl کمتر از ۳۰ میلی‌لیتر در دقیقه از مصرف پرهیز شود (جدول ۶: خطر آسیب حاد کلیه).", rationale: "NSAIDها باعث کاهش فیلتراسیون و آسیب حاد کلیه می‌شوند." };
// ---- Membership sets ----
const NSAIDS = ["ibuprofen", "naproxen", "diclofenac", "meloxicam", "piroxicam", "indomethacin", "ketorolac", "etodolac", "flurbiprofen", "nabumetone", "oxaprozin", "sulindac", "diflunisal"];
const BENZOS = ["alprazolam", "chlordiazepoxide", "clonazepam", "clorazepate", "diazepam", "estazolam", "lorazepam", "midazolam", "oxazepam", "temazepam", "triazolam"];
const ZDRUGS = ["eszopiclone", "zaleplon", "zolpidem"];
const ANTIPSY = ["haloperidol", "olanzapine", "quetiapine", "risperidone", "aripiprazole", "chlorpromazine", "clozapine", "perphenazine", "fluphenazine", "brexpiprazole", "cariprazine", "paliperidone", "pimavanserin", "ziprasidone"];
const BLADDER_AC = ["darifenacin", "fesoterodine", "flavoxate", "oxybutynin", "solifenacin", "tolterodine", "trospium"];
const TCA_IDS = ["amitriptyline", "amoxapine", "clomipramine", "desipramine", "doxepin", "imipramine", "nortriptyline", "paroxetine"];
const OPIOIDS = ["tramadol", "morphine", "methadone", "meperidine", "codeine", "fentanyl"];
const ANTICONV = ["phenobarbital", "primidone", "carbamazepine", "phenytoin", "oxcarbazepine", "levetiracetam", "gabapentin", "pregabalin"];
// Table 7 strongly anticholinergic drugs (isStrongAnticholinergic = true)
const T7AC = [...TCA_IDS, "prochlorperazine", "promethazine", "brompheniramine", "chlorpheniramine", "cyproheptadine", "dimenhydrinate", "diphenhydramine-oral", "doxylamine", "hydroxyzine", "meclizine", "triprolidine", "clemastine", ...BLADDER_AC, "benztropine", "trihexyphenidyl", "chlorpromazine", "clozapine", "olanzapine", "perphenazine", "atropine", "clidinium-c", "dicyclomine", "hyoscine", "scopolamine", "homatropine", "cyclobenzaprine", "orphenadrine"];
const BPH_SET = T7AC.filter((x) => !BLADDER_AC.includes(x));
const DELIRIUM = [...new Set([...T7AC, ...BENZOS, ...ZDRUGS, ...ANTIPSY, ...OPIOIDS, "prednisone", "methylprednisolone", "cimetidine", "famotidine", "nizatidine"])];
const DEMENTIA = [...new Set([...T7AC, ...ANTIPSY, ...BENZOS, ...ZDRUGS])];
const FALLS = [...new Set([...T7AC, ...ANTIPSY, ...BENZOS, ...ZDRUGS, ...OPIOIDS, ...ANTICONV, "fluoxetine", "sertraline", "citalopram", "duloxetine"])];
const SYNCOPE = ["donepezil", "galantamine", "rivastigmine", "prazosin", "doxazosin", "terazosin", "amitriptyline", "imipramine", "doxepin", "clomipramine", "chlorpromazine", "olanzapine"];
const HF = [...new Set(["cilostazol", "dextromethorphan-quinidine", "diltiazem", "verapamil", "dronedarone", "pioglitazone", ...NSAIDS, "celecoxib"])];
const PARKINSON = ["metoclopramide", "promethazine", "prochlorperazine", ...ANTIPSY.filter((x) => !["clozapine", "pimavanserin", "quetiapine"].includes(x))];
const PUD = [...NSAIDS, "aspirin-primary-prevention"];
const INCONT = ["prazosin", "doxazosin", "terazosin", "estrogens-systemic"];
const OSTEOPOROSIS = ["prednisone", "methylprednisolone"];
const HYPOTENSION = [...new Set([...ANTIPSY, "prazosin", "doxazosin", "terazosin", "phenoxybenzamine", ...TCA_IDS])];
// Table 4 SIADH group — SIADH monitoring note appended to rationale
const SIADH_CAUTION = ["mirtazapine", "carbamazepine", "oxcarbazepine", "furosemide", "spironolactone", "triamterene", "amiloride", "tramadol", "duloxetine", "fluoxetine", "sertraline", "citalopram", "paroxetine", ...TCA_IDS, ...ANTIPSY];
// Table 4 own-row drugs (get USE_WITH_CAUTION category)
const T4_DRUGS = ["dabigatran", "prasugrel", "ticagrelor", "mirtazapine", "carbamazepine", "oxcarbazepine", "furosemide", "dapagliflozin", "empagliflozin", "canagliflozin", "ertugliflozin", "tramadol", "duloxetine", "cotrimoxazole", "dextromethorphan-quinidine", "fluoxetine", "sertraline", "citalopram", "paroxetine"];

// ---- New records added for drugs named in the tables but missing from prior seeds ----
// opts: row = key in R (row-level text), cat = therapeuticCategory, cls = drugClasses,
// cns = isCnsActive, brands, fa fallback handled per drug.
const NEW_DEFS = [
  ["triazolam", "Triazolam", "تریازولام", { row: "benzo", cat: "Central Nervous System", cls: ["Benzodiazepines"], cns: true }],
  ["meprobamate", "Meprobamate", "مپروبامات", { row: "meprobamate", cat: "Central Nervous System", cns: true }],
  ["ergoloid-mesylates", "Ergoloid Mesylates", "ارگولوئید مسیلات", { row: "ergoloid", cat: "Central Nervous System" }],
  ["fluphenazine", "Fluphenazine", "فلوفنازین", { row: "antipsych", cat: "Central Nervous System", cls: ["Antipsychotics"], cns: true }],
  ["brexpiprazole", "Brexpiprazole", "برکسیپرازول", { row: "antipsych", cat: "Central Nervous System", cls: ["Antipsychotics"], cns: true }],
  ["cariprazine", "Cariprazine", "کاریپرازین", { row: "antipsych", cat: "Central Nervous System", cls: ["Antipsychotics"], cns: true }],
  ["paliperidone", "Paliperidone", "پالی‌پریدون", { row: "antipsych", cat: "Central Nervous System", cls: ["Antipsychotics"], cns: true }],
  ["pimavanserin", "Pimavanserin", "پیماوانسرین", { row: "antipsych", cat: "Central Nervous System", cls: ["Antipsychotics"], cns: true }],
  ["ziprasidone", "Ziprasidone", "زیپرازیدون", { row: "antipsych", cat: "Central Nervous System", cls: ["Antipsychotics"], cns: true }],
  ["rabeprazole", "Rabeprazole", "رابه‌پرازول", { row: "ppi", cat: "Gastrointestinal", cls: ["Proton-pump inhibitors"], brands: ["Aciphex"] }],
  ["dexlansoprazole", "Dexlansoprazole", "دکسلانزوپرازول", { row: "ppi", cat: "Gastrointestinal", cls: ["Proton-pump inhibitors"], brands: ["Dexilant"] }],
  ["prednisone", "Prednisone", "پردنیزون", { row: "corticosteroid", cat: "Endocrine", cls: ["Corticosteroids"] }],
  ["methylprednisolone", "Methylprednisolone", "متیل‌پردنیزولون", { row: "corticosteroid", cat: "Endocrine", cls: ["Corticosteroids"] }],
  ["mirtazapine", "Mirtazapine", "میرتازاپین", { row: "siadh", cat: "Central Nervous System", cls: ["Antidepressants"], cns: true }],
  ["canagliflozin", "Canagliflozin", "کاناگلیفلوزین", { row: "sglt2", cat: "Endocrine", cls: ["SGLT2 inhibitors"] }],
  ["ertugliflozin", "Ertugliflozin", "ارتوگلیفلوزین", { row: "sglt2", cat: "Endocrine", cls: ["SGLT2 inhibitors"] }],
  ["codeine", "Codeine", "کدئین", { row: "opioid", cat: "Pain Medications", cls: ["Opioids"], cns: true }],
  ["fentanyl", "Fentanyl", "فنتانیل", { row: "opioid", cat: "Pain Medications", cls: ["Opioids"], cns: true }],
  ["furosemide", "Furosemide", "فوروسماید", { row: "siadh", cat: "Cardiovascular & Antithrombotics", cls: ["Loop Diuretics"], brands: ["Lasix"] }],
  ["lisinopril", "Lisinopril", "لیسینوپریل", { row: "ras", cat: "Cardiovascular \u0026 Antithrombotics", cls: ["RAS inhibitors"], ev: "Moderate", st: "Strong", brands: ["Zestril", "Prinivil"], note: "جدول ۵: در مهارکننده‌های RAS با دیورتیک نگهدارنده پتاسیم یا سایر مهارکننده‌های RAS خطر هیپرکالمی در بیماری مزمن کلیوی (مرحله ۳a به بالا) بالاست؛ پتاسیم و عملکرد کلیه پایش شود." }],
  ["enalapril", "Enalapril", "انالاپریل", { row: "ras", cat: "Cardiovascular \u0026 Antithrombotics", cls: ["RAS inhibitors"], ev: "Moderate", st: "Strong", brands: ["Renitec"], note: "جدول ۵: در مهارکننده‌های RAS با دیورتیک نگهدارنده پتاسیم یا سایر مهارکننده‌های RAS خطر هیپرکالمی در بیماری مزمن کلیوی (مرحله ۳a به بالا) بالاست؛ پتاسیم و عملکرد کلیه پایش شود." }],
  ["ramipril", "Ramipril", "رامی‌پریل", { row: "ras", cat: "Cardiovascular \u0026 Antithrombotics", cls: ["RAS inhibitors"], ev: "Moderate", st: "Strong", brands: ["Triatec"], note: "جدول ۵: در مهارکننده‌های RAS با دیورتیک نگهدارنده پتاسیم یا سایر مهارکننده‌های RAS خطر هیپرکالمی در بیماری مزمن کلیوی (مرحله ۳a به بالا) بالاست؛ پتاسیم و عملکرد کلیه پایش شود." }],
  ["losartan", "Losartan", "لوزارتان", { row: "ras", cat: "Cardiovascular \u0026 Antithrombotics", cls: ["RAS inhibitors"], ev: "Moderate", st: "Strong", brands: ["Cozaar"], note: "جدول ۵: در مهارکننده‌های RAS با دیورتیک نگهدارنده پتاسیم یا سایر مهارکننده‌های RAS خطر هیپرکالمی در بیماری مزمن کلیوی (مرحله ۳a به بالا) بالاست؛ پتاسیم و عملکرد کلیه پایش شود." }],
  ["valsartan", "Valsartan", "والسارتان", { row: "ras", cat: "Cardiovascular \u0026 Antithrombotics", cls: ["RAS inhibitors"], ev: "Moderate", st: "Strong", brands: ["Diovan"], note: "جدول ۵: در مهارکننده‌های RAS با دیورتیک نگهدارنده پتاسیم یا سایر مهارکننده‌های RAS خطر هیپرکالمی در بیماری مزمن کلیوی (مرحله ۳a به بالا) بالاست؛ پتاسیم و عملکرد کلیه پایش شود." }],
  ["candesartan", "Candesartan", "کاندسارتن", { row: "ras", cat: "Cardiovascular \u0026 Antithrombotics", cls: ["RAS inhibitors"], ev: "Moderate", st: "Strong", brands: ["Atacand"], note: "جدول ۵: در مهارکننده‌های RAS با دیورتیک نگهدارنده پتاسیم یا سایر مهارکننده‌های RAS خطر هیپرکالمی در بیماری مزمن کلیوی (مرحله ۳a به بالا) بالاست؛ پتاسیم و عملکرد کلیه پایش شود." }],
];



const renal = (threshold, action, guidance, rationale) => ({ threshold, action, guidance, rationale });


// ---- Existing drugs from prior seeds, mapped to their guideline table row ----
const D = (id, en, fa, row, extra = {}) => [id, en, fa, { row, ...extra }];
const OLD_DEFS = [
  // Table 2 — antihistamines
  D("brompheniramine", "Brompheniramine", "برومفنیرامین", "antihist"),
  D("chlorpheniramine", "Chlorpheniramine", "کلرفنیرامین", "antihist"),
  D("clemastine", "Clemastine", "کلماستین", "antihist"),
  D("diphenhydramine-oral", "Diphenhydramine (Oral)", "دیفن‌هیدرامین خوراکی", "antihist"),
  D("doxylamine", "Doxylamine", "دوکسیلامین", "antihist"),
  D("hydroxyzine", "Hydroxyzine", "هیدروکسی‌زین", "antihist"),
  D("meclizine", "Meclizine", "مکلیزین", "antihist"),
  D("promethazine", "Promethazine", "پرومتازین", "antihist"),
  D("triprolidine", "Triprolidine", "تری‌پولیدین", "antihist"),
  D("cyproheptadine", "Cyproheptadine", "سیپروهپتادین", "antihist"),
  D("dimenhydrinate", "Dimenhydrinate", "دیمن‌هیدرینات", "antihist"),
  // Table 2 — nitrofurantoin, aspirin, antithrombotics
  D("nitrofurantoin", "Nitrofurantoin", "نیتروفورانتوئین", "nitro"),
  D("aspirin-primary-prevention", "Aspirin (Primary Prevention)", "آسپرین (پیشگیری اولیه)", "aspirin"),
  D("warfarin", "Warfarin", "وارفارین", "warfarin"),
  D("rivaroxaban", "Rivaroxaban", "ریواروکسابان", "rivaroxaban"),
  D("dipyridamole-short-acting", "Dipyridamole (Short-Acting)", "دیپیریدامول (کم‌اثر/سریع)", "dipyridamole"),
  // Table 2 — alpha-1 blockers, central alpha-2 agonists, nifedipine
  D("doxazosin", "Doxazosin", "دوکسازوسین", "alpha1"),
  D("prazosin", "Prazosin", "پرازوسین", "alpha1"),
  D("terazosin", "Terazosin", "ترازوسین", "alpha1"),
  D("phenoxybenzamine", "Phenoxybenzamine", "فنوکسی‌بنزامین", "alpha1"),
  D("clonidine", "Clonidine", "کلونیدین", "centralAlpha"),
  D("guanfacine", "Guanfacine", "گوانفاسین", "centralAlpha"),
  D("nifedipine-ir", "Nifedipine (Immediate-Release)", "نیفدیپین (رهاش فوری)", "nifedipine"),
  // Table 2 — antiarrhythmics, digoxin
  D("amiodarone", "Amiodarone", "آمیودارون", "amiodarone"),
  D("dronedarone", "Dronedarone", "دروندارون", "dronedarone"),
  D("digoxin", "Digoxin", "دیگوکسین", "digoxin"),
  // Table 2 — TCAs
  D("amitriptyline", "Amitriptyline", "آمی‌تریپتیلین", "tca"),
  D("amoxapine", "Amoxapine", "آموکساپین", "tca"),
  D("clomipramine", "Clomipramine", "کلومی‌پرامین", "tca"),
  D("desipramine", "Desipramine", "دزی‌پرامین", "tca"),
  D("doxepin", "Doxepin", "دوکسپین", "tca"),
  D("imipramine", "Imipramine", "ایمی‌پرامین", "tca"),
  D("nortriptyline", "Nortriptyline", "نورتریپتیلین", "tca"),
  D("paroxetine", "Paroxetine", "پاروکستین", "tca"),
  // Table 2 — antiparkinsonian anticholinergics
  D("benztropine", "Benztropine", "بنزتروپین", "antiparkinsonAc"),
  D("trihexyphenidyl", "Trihexyphenidyl", "تری‌هگزی‌فنیدیل", "antiparkinsonAc"),
  // Table 2 — antipsychotics (dose-independent row)
  D("haloperidol", "Haloperidol", "هالوپریدول", "antipsych"),
  D("olanzapine", "Olanzapine", "اولانزاپین", "antipsych"),
  D("quetiapine", "Quetiapine", "کوئتیاپین", "antipsych"),
  D("risperidone", "Risperidone", "ریسپریدون", "antipsych"),
  D("aripiprazole", "Aripiprazole", "آریپیپرازول", "antipsych"),
  D("chlorpromazine", "Chlorpromazine", "کلرپرومازین", "antipsych"),
  D("clozapine", "Clozapine", "کلوزاپین", "antipsych"),
  D("perphenazine", "Perphenazine", "پرفنازین", "antipsych"),
  // Table 2 — barbiturates, benzodiazepines, Z-drugs, meprobamate, ergoloid
  D("butabarbital", "Butabarbital", "بوتاباربیتال", "barb"),
  D("phenobarbital", "Phenobarbital", "فنوباربیتال", "barb"),
  D("primidone", "Primidone", "پریمیدون", "barb"),
  D("alprazolam", "Alprazolam", "آلپرازولام", "benzo"),
  D("chlordiazepoxide", "Chlordiazepoxide", "کلردیازپوکسید", "benzo"),
  D("clonazepam", "Clonazepam", "کلونازپام", "benzo"),
  D("clorazepate", "Clorazepate", "کلرازپات", "benzo"),
  D("diazepam", "Diazepam", "دیازپام", "benzo"),
  D("estazolam", "Estazolam", "استازولام", "benzo"),
  D("lorazepam", "Lorazepam", "لورازپام", "benzo"),
  D("midazolam", "Midazolam", "میدازولام", "benzo"),
  D("oxazepam", "Oxazepam", "اکسازپام", "benzo"),
  D("temazepam", "Temazepam", "تمازپام", "benzo"),
  D("eszopiclone", "Eszopiclone", "ازوپیکلون", "zdrug"),
  D("zaleplon", "Zaleplon", "زالپلون", "zdrug"),
  D("zolpidem", "Zolpidem", "زولپیدم", "zdrug"),
  // Table 2 — hormones
  D("testosterone", "Testosterone", "تستوسترون", "androgen"),
  D("methyltestosterone", "Methyltestosterone", "متیل‌تستوسترون", "androgen"),
  D("estrogens-systemic", "Estrogens (Systemic)", "استروژن سیستمیک", "estrogen"),
  D("insulin-sliding-scale", "Insulin (Sliding Scale)", "انسولین (رژیم لغزنده)", "insulin"),
  D("gliclazide", "Gliclazide", "گلی‌کلازید", "su"),
  D("glipizide", "Glipizide", "گلی‌پیزید", "su"),
  D("glimepiride", "Glimepiride", "گلیمپیرید", "su"),
  D("glibenclamide-glyburide", "Glibenclamide (Glyburide)", "گلی‌بن‌کلامید (گلی‌براید)", "su"),
  D("desiccated-thyroid", "Desiccated Thyroid", "تیروئید خشک‌شده", "desiccatedThyroid"),
  D("megestrol", "Megestrol", "مژسترول", "megestrol"),
  D("growth-hormone", "Growth Hormone", "هورمون رشد", "gh"),
  // Table 2 — PPIs, GI agents
  D("omeprazole", "Omeprazole", "امپرازول", "ppi"),
  D("pantoprazole", "Pantoprazole", "پانتوپرازول", "ppi"),
  D("lansoprazole", "Lansoprazole", "لانزوپرازول", "ppi"),
  D("esomeprazole", "Esomeprazole", "اس‌امپرازول", "ppi"),
  D("metoclopramide", "Metoclopramide", "متوکلوپرامید", "metoclopramide"),
  D("atropine", "Atropine", "آتروپین", "antispasmodic"),
  D("clidinium-c", "Clidinium-CHD", "کلیدینیوم-سی", "antispasmodic"),
  D("dicyclomine", "Dicyclomine", "دی‌سیکلومین", "antispasmodic"),
  D("hyoscine", "Hyoscine (Hyoscyamine)", "هیوسین (هیوسیامین)", "antispasmodic"),
  D("scopolamine", "Scopolamine", "اسکوپولامین", "antispasmodic", { cat: "Gastrointestinal" }),
  D("mineral-oil", "Mineral Oil", "روغن معدنی", "mineralOil"),
  D("desmopressin", "Desmopressin", "دسموپرسین", "desmopressin"),
  // Table 2 — NSAIDs (nonselective row) / COX-2
  D("ibuprofen", "Ibuprofen", "ایبوپروفن", "nsaid"),
  D("naproxen", "Naproxen", "ناپروکسن", "nsaid"),
  D("diclofenac", "Diclofenac", "دیکلوفناک", "nsaid"),
  D("meloxicam", "Meloxicam", "ملوکسیکام", "nsaid"),
  D("piroxicam", "Piroxicam", "پیروکسیکام", "nsaid"),
  D("etodolac", "Etodolac", "اتودولاک", "nsaid"),
  D("flurbiprofen", "Flurbiprofen", "فلوربیپروفن", "nsaid"),
  D("nabumetone", "Nabumetone", "نابومتون", "nsaid"),
  D("oxaprozin", "Oxaprozin", "اکساپروزین", "nsaid"),
  D("sulindac", "Sulindac", "سولینداک", "nsaid"),
  D("diflunisal", "Diflunisal", "دیفلونیزال", "nsaid"),
  D("indomethacin", "Indomethacin", "ایندومتاسین", "nsaidHard"),
  D("ketorolac", "Ketorolac", "کتورولاک", "nsaidHard"),
  D("celecoxib", "Celecoxib", "سلکوکسیب", "nsaid"),
  // Table 2 — meperidine, muscle relaxants
  D("meperidine", "Meperidine (Pethidine)", "مپریدین (پتیدین)", "meperidine"),
  D("carisoprodol", "Carisoprodol", "کاریسوپرودول", "mrs"),
  D("chlorzoxazone", "Chlorzoxazone", "کلرزوکزون", "mrs"),
  D("cyclobenzaprine", "Cyclobenzaprine", "سیکلوبنزپرین", "mrs"),
  D("metaxalone", "Metaxalone", "متاکزالون", "mrs"),
  D("methocarbamol", "Methocarbamol", "متاکاربامول", "mrs"),
  D("orphenadrine", "Orphenadrine", "اورفنادرین", "mrs"),
  // Table 3-only rows (not PIM at record level)
  D("cilostazol", "Cilostazol", "سیلوستازول", { rec: "در نارسایی قلبی شدید (کلاس III) پرهیز شود.", rat: "افزایش خطر مرگومیر قلبی در نارسایی قلبی شدید (جدول ۳).", ev: "Moderate", st: "Weak", alts: ["در صورت نبود نارسایی قلبی شدید با احتیاط"] }),
  D("dextromethorphan-quinidine", "Dextromethorphan-Quinidine", "دکسترومتورفان-کینیدین", "dmq"),
  D("diltiazem", "Diltiazem", "دیلتیازم", { rec: "در نارسایی قلبی با کسر تخلیه‌ای کاهش‌یافته (HFrEF) پرهیز شود.", rat: "افزایش خطر مرگومیر قلبی در نارسایی قلبی با کسر تخلیه‌ای کاهش‌یافته (جدول ۳).", ev: "High", st: "Strong", alts: ["بتابلاکرها (در صورت عدم منع)"] }),
  D("verapamil", "Verapamil", "وراپامیل", { rec: "در نارسایی قلبی با کسر تخلیه‌ای کاهش‌یافته (HFrEF) پرهیز شود.", rat: "افزایش خطر مرگومیر قلبی در نارسایی قلبی با کسر تخلیه‌ای کاهش‌یافته (جدول ۳).", ev: "High", st: "Strong", alts: ["بتابلاکرها (در صورت عدم منع)"] }),
  D("pioglitazone", "Pioglitazone", "پیوگلیتازون", { rec: "در نارسایی قلبی و احتباس مایعات پرهیز شود.", rat: "احتباس مایعات و بدتر شدن نارسایی قلبی (جدول ۳: پیوگلیتازون با تشدید نارسایی قلبی همراه است).", ev: "High", st: "Strong", alts: ["انسولین"] }),
  D("donepezil", "Donepezil", "دنپزیل", { rec: "در سالمندان با سابقه سنکوپ پرهیز شود.", rat: "مهارکننده‌های استیل‌کولین‌استراز باعث برادی‌کاردی و سنکوپ می‌شوند (جدول ۳).", ev: "Moderate", st: "Strong", alts: [] }),
  D("galantamine", "Galantamine", "گالانتامین", { rec: "در سالمندان با سابقه سنکوپ پرهیز شود.", rat: "مهارکننده‌های استیل‌کولین‌استراز باعث برادی‌کاردی و سنکوپ می‌شوند (جدول ۳).", ev: "Moderate", st: "Strong", alts: [] }),
  D("rivastigmine", "Rivastigmine", "ریواستیگمین", { rec: "در سالمندان با سابقه سنکوپ پرهیز شود.", rat: "مهارکننده‌های استیل‌کولین‌استراز باعث برادی‌کاردی و سنکوپ می‌شوند (جدول ۳).", ev: "Moderate", st: "Strong", alts: [] }),
  D("cimetidine", "Cimetidine", "سایمتیدین", { rec: "پرهیز شود؛ در صورت نیاز از فاموتیدین با کمترین دوز و کوتاه‌ترین مدت استفاده شود.", rat: "القا یا تشدید دلیریوم و کاهش کلیرانس با افزایش سن (جدول ۳).", ev: "Moderate", st: "Strong", alts: ["فاموتیدین"] }),
  D("famotidine", "Famotidine", "فاموتیدین", { rec: "با احتیاط مصرف شود؛ در صورت امکان از PPI با دوره کوتاه درمانی استفاده شود.", rat: "القا یا تشدید دلیریوم (جدول ۳)؛ در مقایسه با سایر داروهای ضدترشح کمترین خطر متابولیک را دارد.", ev: "Moderate", st: "Strong", alts: [] }),
  D("nizatidine", "Nizatidine", "نیزاتیدین", { rec: "پرهیز شود؛ در صورت نیاز از فاموتیدین با کمترین دوز و کوتاه‌ترین مدت استفاده شود.", rat: "القا یا تشدید دلیریوم و کاهش کلیرانس با افزایش سن (جدول ۳).", ev: "Moderate", st: "Strong", alts: ["فاموتیدین"] }),
  D("prochlorperazine", "Prochlorperazine", "پروکلرپرازین", { rec: "پرهیز شود؛ در تهوع از اوندانسترون استفاده شود.", rat: "آنتی‌کولینرژیک شدید (جدول ۷)؛ خطر تاردیودیسکینزی و دلیریوم؛ در پارکینسون علائم را بدتر می‌کند (جدول ۳).", ev: "Moderate", st: "Strong", alts: ["اوندانسترون"] }),
  D("homatropine", "Homatropine", "هوماتروپین", "antispasmodic"),


  // Table 3/5/6/T7 rows — record-level text as inline row objects
  ...["colchicine", "probenecid", "levetiracetam", "edoxaban", "enoxaparin", "fondaparinux", "dofetilide", "baclofen", "gabapentin", "pregabalin", "spironolactone", "triamterene", "amiloride"].map((id) => [id, null, null, { row: { rec: "در اختلال عملکرد کلیه دوز تعدیل شود یا از مصرف پرهیز شود (جدول ۶).", rat: "تجمع دارو یا متابولیت‌های فعال در اختلال کلیوی و افزایش خطر عوارض دوز-وابسته.", ev: "Moderate", st: "Strong", alts: [] } }]),
  D("lithium", "Lithium", "لیتیم", { rec: "با احتیاط مصرف شود؛ دوز و غلاظت سرم پایش گردد.", rat: "مصرف هم‌زمان با مهارکننده‌های RAS یا دیورتیک‌های لوپ خطر مسمومیت لیتیم و اختلالات الکترولیتی را بالا می‌برد (جدول ۵).", ev: "Moderate", st: "Strong", alts: [] }),
  D("phenytoin", "Phenytoin", "فنی‌توئین", { rec: "با احتیاط مصرف شود؛ غلاظت سرم و علائم مسمومیت پایش گردد.", rat: "کوتریموکسازول متابولیسم فنی‌توئین را مهار می‌کند و خطر مسمومیت را بالا می‌برد؛ افزایش دوز فنی‌توئین ممکن است باعث خونریزی شود (جدول ۵).", ev: "Moderate", st: "Strong", alts: [] }),
  D("theophylline", "Theophylline", "تئوفیلین", { rec: "با احتیاط مصرف شود؛ غلاظت سرم پایش گردد.", rat: "پنجره درمانی باریک؛ مصرف هم‌زمان سایمتیدین و سیپروفلوکساسین غلاظت تئوفیلین را بالا می‌برد (جدول ۵).", ev: "Moderate", st: "Strong", alts: [] }),
  D("morphine", "Morphine", "مورفین", "opioid"),
  D("methadone", "Methadone", "متادون", "opioid"),
  // Table 4 rows
  D("dapagliflozin", "Dapagliflozin", "داپاگلیفلوزین", "sglt2"),
  D("empagliflozin", "Empagliflozin", "امپاگلیفلوزین", "sglt2"),
  D("tramadol", "Tramadol", "ترامادول", "siadh"),
  D("carbamazepine", "Carbamazepine", "کاربامازپین", "siadh"),
  D("oxcarbazepine", "Oxcarbazepine", "اکسکاربازپین", "siadh"),
  D("fluoxetine", "Fluoxetine", "فلوکستین", "siadh"),
  D("sertraline", "Sertraline", "سرترالین", "siadh"),
  D("citalopram", "Citalopram", "سیتالوپرام", "siadh"),
  D("duloxetine", "Duloxetine", "دولوکستین", "siadh"),
  D("cotrimoxazole", "Cotrimoxazole (Trimethoprim-Sulfamethoxazole)", "کوتریموکسازول", "cotrim4"),
  D("dabigatran", "Dabigatran", "دابیگاتران", "dabigatran4"),
  D("prasugrel", "Prasugrel", "پراسوگرل", "prasugrelTicagrelor"),
  D("ticagrelor", "Ticagrelor", "تیکاگرلور", "prasugrelTicagrelor"),
  // Table 3 bladder anticholinergics (strong-AC flag + condition entries)
  ...BLADDER_AC.map((id) => [id, null, null, { row: { rec: "با احتیاط مصرف شود؛ بار آنتی‌کولینرژیک تجمعی و خطر دلیریوم را در نظر بگیرید.", rat: "به‌شدت آنتی‌کولینرژیک (جدول ۷)؛ در سالمندان خطر دلیریوم و سقوط را بالا می‌برد؛ در BPH ممنوعیت ندارد اما در مردان محتیط باشید.", ev: "Moderate", st: "Strong", alts: ["میرابگرون", "داروهای غیردارویی"] } }]),
  // Special — comparator anticoagulant (outside the Beers list)
  D("apixaban", "Apixaban", "آپیکسابان", { rec: "به‌عنوان گزینه ارجح برای ریواروکسابان و وارفارین در مناسب‌های انتخابی قابل استفاده است؛ دوز بر اساس سن، وزن و عملکرد کلیه تعیین شود.", rat: "خارج از فهرست معیارهای بیرز ۲۰۲۳ (حذف معیار کلیوی آپیکسابان از جدول ۶، جدول ۸)؛ به‌عنوان جایگزین ایمن‌تر ذخیره شده است.", ev: "Moderate", st: "Strong", alts: [] }),
  // Legacy context record — kept for warfarin/QT DDI checking (not a Beers table row)
  D("ciprofloxacin", "Ciprofloxacin", "سیپروفلوکساسین", {
    rec: "با احتیاط مصرف شود؛ در نارسایی کلیه دوز را تنظیم کنید و در صورت وجود گزینه، آنتی‌بیوتیک کم‌خطرتر را جایگزین کنید.",
    rat: "خطر عوارض تاندون و نوروپاتی، طول QTc و تداخل با وارفارین؛ در نارسایی کلیه تجمع دارو.",
    ev: "Moderate", st: "Strong", alts: ["سفالوسپورین یا آنتی‌بیوتیک متناسب با کشت"], cats: ["USE_WITH_CAUTION"],
  }),
];

// ---- Table 2 membership: any drug whose row is a Table 2 row ----
const T2_ROWS = ["antihist", "nitro", "aspirin", "warfarin", "rivaroxaban", "dipyridamole", "alpha1", "centralAlpha", "nifedipine", "amiodarone", "dronedarone", "digoxin", "tca", "antiparkinsonAc", "antipsych", "barb", "benzo", "zdrug", "meprobamate", "ergoloid", "androgen", "estrogen", "insulin", "su", "desiccatedThyroid", "megestrol", "gh", "ppi", "metoclopramide", "antispasmodic", "mineralOil", "desmopressin", "nsaid", "nsaidHard", "meperidine", "mrs"];
// Footnote exceptions: COX-2 celecoxib is not in the Table 2 NSAID row;
// homatropine appears only in the Table 7 anticholinergic list.
const T2_NOT = new Set(["celecoxib", "homatropine"]);
// Table 6 renal overrides (exact rows from translated data.md Table 6)
const RENAL_OVERRIDE = {
  ...Object.fromEntries(NSAIDS.map((x) => [x, NSAID_RENAL])),
  celecoxib: NSAID_RENAL,
  cotrimoxazole: renal("CrCl < 30 mL/min", "Dose Reduction", "در CrCl ۱۵ تا ۲۹ میلی‌لیتر در دقیقه دوز کاهش یابد؛ در کمتر از ۱۵ از مصرف پرهیز شود (جدول ۶).", "افزایش خطر عوارض هماتولوژیک و گوارشی در اختلال کلیوی."),
  dofetilide: renal("CrCl < 60 mL/min", "Dose Reduction", "در CrCl ۲۰ تا ۵۹ دوز کاهش یابد؛ در کمتر از ۲۰ از مصرف پرهیز شود (جدول ۶).", "مسمومیت با دوفتیلید (تهوع، سرگیجه، آریتمی) در اختلال کلیوی."),
  duloxetine: renal("CrCl < 30 mL/min", "Avoid", "در CrCl کمتر از ۳۰ از مصرف پرهیز شود (جدول ۶).", "افزایش عوارض گوارشی (تهوع، اسهال) و خطر سمیت در اختلال کلیوی شدید."),
};
const BOX1_IDS = new Set(["warfarin", "rivaroxaban", "dabigatran", "apixaban", "edoxaban"]);
const cat = (condition, rationale, recommendation) => ({ condition, rationale, recommendation });

// ---- Geriatric risk panel reference data (score.md) ----
// Legacy therapeutic-category spellings canonicalized so the "گروه درمانی"
// dropdown never shows near-duplicate entries.
const CAT_ALIAS = {
  "Cardiovascular and Antithrombotics": "Cardiovascular & Antithrombotics",
};
// Anticholinergic Cognitive Burden weight per drug (Boustani 2008 / official
// Regenstrief 2012 lists translated in score.md). Only score.md-listed drugs
// carry a value; everything else falls back at read time.
const ACB_BY_ID = {
  // 1 — possible / mild anticholinergic effect
  alprazolam: 1, aripiprazole: 1, cimetidine: 1, "clidinium-c": 1, clorazepate: 1,
  codeine: 1, colchicine: 1, diazepam: 1, digoxin: 1, "dipyridamole-short-acting": 1,
  fentanyl: 1, furosemide: 1, haloperidol: 1, morphine: 1, "nifedipine-ir": 1,
  paliperidone: 1, prednisone: 1, risperidone: 1, theophylline: 1, triamterene: 1,
  warfarin: 1,
  // 2 — moderate anticholinergic effect
  carbamazepine: 2, cyclobenzaprine: 2, cyproheptadine: 2, meperidine: 2,
  oxcarbazepine: 2,
  // 3 — strong, clinically relevant anticholinergic effect
  amitriptyline: 3, amoxapine: 3, atropine: 3, benztropine: 3, brompheniramine: 3,
  chlorpheniramine: 3, chlorpromazine: 3, clemastine: 3, clomipramine: 3, clozapine: 3,
  darifenacin: 3, desipramine: 3, dicyclomine: 3, dimenhydrinate: 3,
  "diphenhydramine-oral": 3, doxepin: 3, doxylamine: 3, fesoterodine: 3,
  flavoxate: 3, hydroxyzine: 3, hyoscine: 3, imipramine: 3, meclizine: 3,
  methocarbamol: 3, nortriptyline: 3, olanzapine: 3, orphenadrine: 3,
  oxybutynin: 3, paroxetine: 3, perphenazine: 3, promethazine: 3, quetiapine: 3,
  scopolamine: 3, solifenacin: 3, tolterodine: 3, trihexyphenidyl: 3, trospium: 3,
};
// Subclasses with higher fall/harm potential than their group peers
// (long-acting BZD, strong opioids, loop diuretics, α-blockers, …).
// Anticholinergics scoring ACB 3 are added automatically below.
const HIGH_RISK_IDS = new Set([
  "diazepam", "clonazepam", "chlordiazepoxide", "clorazepate",
  "morphine", "fentanyl", "methadone", "meperidine",
  "phenobarbital", "primidone",
  "furosemide",
  "prazosin", "doxazosin", "terazosin", "phenoxybenzamine",
  "cyproheptadine", "triprolidine",
]);
// STOPPFall fall-risk-increasing drug classes (Seppala 2021, score.md table):
// drug id → comma-separated class numbers 1–14. Drugs listed in two groups
// keep both (doxazosin 9+10, oxybutynin 6+14) exactly as in the source table.
const STOPPFALL_BY_ID = {
  // 1 — Benzodiazepines
  alprazolam: "1", chlordiazepoxide: "1", clonazepam: "1", clorazepate: "1",
  diazepam: "1", estazolam: "1", lorazepam: "1", midazolam: "1", oxazepam: "1",
  temazepam: "1", triazolam: "1",
  // 2 — Benzodiazepine-related drugs (Z-drugs)
  eszopiclone: "2", zaleplon: "2", zolpidem: "2",
  // 3 — Antipsychotics
  aripiprazole: "3", brexpiprazole: "3", cariprazine: "3", chlorpromazine: "3",
  clozapine: "3", fluphenazine: "3", haloperidol: "3", olanzapine: "3",
  paliperidone: "3", perphenazine: "3", pimavanserin: "3", quetiapine: "3",
  risperidone: "3", ziprasidone: "3",
  // 4 — Opioids
  codeine: "4", fentanyl: "4", meperidine: "4", methadone: "4", morphine: "4",
  tramadol: "4",
  // 5 — Antidepressants
  amitriptyline: "5", amoxapine: "5", clomipramine: "5", citalopram: "5",
  desipramine: "5", doxepin: "5", duloxetine: "5", fluoxetine: "5",
  imipramine: "5", mirtazapine: "5", nortriptyline: "5", paroxetine: "5",
  sertraline: "5",
  // 6 — Anticholinergics: strong-AC drugs outside groups 3/5/12/14
  atropine: "6", benztropine: "6", "clidinium-c": "6", cyclobenzaprine: "6",
  dicyclomine: "6", homatropine: "6", hyoscine: "6", orphenadrine: "6",
  prochlorperazine: "6", scopolamine: "6", trihexyphenidyl: "6",
  // 7 — Antiepileptics
  carbamazepine: "7", gabapentin: "7", levetiracetam: "7", oxcarbazepine: "7",
  phenobarbital: "7", phenytoin: "7", pregabalin: "7", primidone: "7",
  // 8 — Diuretics
  amiloride: "8", furosemide: "8", spironolactone: "8", triamterene: "8",
  // 9 — α-blockers as antihypertensives · 10 — α-blockers for prostate hyperplasia
  prazosin: "9", doxazosin: "9,10", terazosin: "10",
  // 11 — Centrally acting antihypertensives
  clonidine: "11", guanfacine: "11",
  // 12 — Antihistamines
  brompheniramine: "12", chlorpheniramine: "12", clemastine: "12",
  cyproheptadine: "12", dimenhydrinate: "12", "diphenhydramine-oral": "12",
  doxylamine: "12", hydroxyzine: "12", meclizine: "12", promethazine: "12",
  triprolidine: "12",
  // 13 — Cardiac vasodilators (no organic nitrate is present in this registry)
  // 14 — Medications for overactive bladder / urge incontinence
  darifenacin: "14", fesoterodine: "14", flavoxate: "14", oxybutynin: "6,14",
  solifenacin: "14", tolterodine: "14", trospium: "14",
};
// Drug-level ATC codes shown in the panel breakdown table. First block comes
// from the score.md ACB tables; the second is standard, unambiguous codes for
// other registry drugs. Drugs without an entry fall back to their STOPPFall
// class ATC in the UI.
const ATC_BY_ID = {
  // — score.md ACB tables (drug-level codes) —
  alprazolam: "N05BA12", aripiprazole: "N05AX12", cimetidine: "A02BA01",
  "clidinium-c": "A03CA02", clorazepate: "N05BA05", codeine: "N02AA59",
  colchicine: "M04AC01", diazepam: "N05BA01", digoxin: "C01AA05",
  "dipyridamole-short-acting": "B01AC07", fentanyl: "N02AB03",
  furosemide: "C03CA01", haloperidol: "N05AD01", morphine: "N02AA01",
  "nifedipine-ir": "C08CA05", paliperidone: "N05AX13", prednisone: "H02AB07",
  risperidone: "N05AX08", theophylline: "R03DA04", triamterene: "C03DB02",
  warfarin: "B01AA03",
  carbamazepine: "N03AF01", cyclobenzaprine: "M03BX08", cyproheptadine: "R06AX02",
  meperidine: "N02AB02", oxcarbazepine: "N03AF02",
  amitriptyline: "N06AA09", amoxapine: "N06AA17", atropine: "A03BA01",
  benztropine: "N04AC01", brompheniramine: "R06AB01", chlorpheniramine: "R06AB04",
  chlorpromazine: "N05AA01", clemastine: "R06AA04", clomipramine: "N06AA04",
  clozapine: "N05AH02", darifenacin: "G04BD10", desipramine: "N06AA01",
  dicyclomine: "A03AA07", dimenhydrinate: "R06AA11", "diphenhydramine-oral": "R06AA02",
  doxepin: "N06AA12", doxylamine: "R06AA09", fesoterodine: "G04BD11",
  flavoxate: "G04BD02", hydroxyzine: "N05BB01", hyoscine: "A03BA03",
  imipramine: "N06AA02", meclizine: "R06AE05", methocarbamol: "M03BA03",
  nortriptyline: "N06AA10", olanzapine: "N05AH03", orphenadrine: "M03BC01",
  oxybutynin: "G04BD04", paroxetine: "N06AB05", perphenazine: "N05AB03",
  promethazine: "R06AD02", quetiapine: "N05AH04", scopolamine: "A04AD01",
  solifenacin: "G04BD08", tolterodine: "G04BD07", trihexyphenidyl: "N04AA01",
  trospium: "G04BD09",
  // — other standard, unambiguous ATC codes —
  "aspirin-primary-prevention": "B01AC06", rivaroxaban: "B01AF01",
  apixaban: "B01AF02", dabigatran: "B01AE07", edoxaban: "B01AF03",
  enoxaparin: "B01AB05", fondaparinux: "B01AB07",
  lisinopril: "C09AA03", enalapril: "C09AA02", ramipril: "C09AA05",
  losartan: "C09CA01", valsartan: "C09CA03", candesartan: "C09CA06",
  spironolactone: "C03DA01", amiloride: "C03DB01",
  prazosin: "C02CA01", doxazosin: "G04CA02", terazosin: "G04CA03",
  clonidine: "C02AC01",
  amiodarone: "C01BD01", verapamil: "C08DA01", diltiazem: "C08DB01",
  omeprazole: "A02BC01", pantoprazole: "A02BC02", lansoprazole: "A02BC03",
  esomeprazole: "A02BC05", rabeprazole: "A02BC04", metoclopramide: "A03FA01",
  ibuprofen: "M01AE01", naproxen: "M01AE02", diclofenac: "M01AB05",
  meloxicam: "M01AC06", piroxicam: "M01AC01", indomethacin: "M01AB01",
  celecoxib: "M01AH01",
  tramadol: "N02AX02", methadone: "N02AF01",
  sertraline: "N06AB06", fluoxetine: "N06AB03", citalopram: "N06AB04",
  duloxetine: "N06AX21", mirtazapine: "N06AX11",
  donepezil: "N06DA02", rivastigmine: "N06DA03", galantamine: "N06DA04",
  levetiracetam: "N03AX14", gabapentin: "N03AX12", pregabalin: "N03AX16",
  phenytoin: "N03AA02",
  nitrofurantoin: "J01XE01", cotrimoxazole: "J01EE01", ciprofloxacin: "J01MA02",
  methylprednisolone: "H02AB04",
  pioglitazone: "A10BG01", gliclazide: "A10BB09", glipizide: "A10BB07",
  glimepiride: "A10BB12", "glibenclamide-glyburide": "A10BB01",
  dapagliflozin: "A10BK01", empagliflozin: "A10BK02", canagliflozin: "A10BK03",
  ertugliflozin: "A10BK04",
  "growth-hormone": "H01AC01", desmopressin: "H01BA02",
  famotidine: "A02BA03", nizatidine: "A02BA04", probenecid: "M04AB01",
  clonazepam: "N05AE01", lorazepam: "N05BA06", midazolam: "N05CD08",
  zolpidem: "N05CF02", zaleplon: "N05CF03",
};
const mk = (id, en, faName, opts) => {
  const o = byOld.get(id);
  const acbScore = ACB_BY_ID[id],
    stoppFallCategory = STOPPFALL_BY_ID[id],
    atcCode = ATC_BY_ID[id],
    isHighRiskSubclass = HIGH_RISK_IDS.has(id) || acbScore === 3;
  const rowKey = typeof opts.row === "string" ? opts.row : null;
  const row = typeof opts.row === "string" ? R[opts.row] : opts.row;
  if (!row) throw new Error("missing row for " + id);
  const isPim = !!rowKey && T2_ROWS.includes(rowKey) && !T2_NOT.has(id);
  // ---- Disease interactions (Tables 3/4 SIADH handled in rationale) ----
  const diseases = [];
  if (HF.includes(id)) {
    let rec = "در نارسایی قلبی پرهیز شود.";
    if (id === "diltiazem" || id === "verapamil")
      rec = "در نارسایی قلبی با کسر تخلیه‌ای کاهش‌یافته (HFrEF) پرهیز شود.";
    else if (NSAIDS.includes(id) || id === "celecoxib")
      rec = "در نارسایی قلبی بدون علامت با احتیاط مصرف شود؛ در بیماران علامت‌دار پرهیز شود.";
    diseases.push(cat(C.hf.condition, C.hf.rationale, rec));
  }
  if (SYNCOPE.includes(id)) diseases.push(cat(C.syncope.condition, C.syncope.rationale, C.syncope.recommendation));
  if (DELIRIUM.includes(id)) {
    let rec = C.delirium.recommendation;
    if (ANTIPSY.includes(id)) rec = "برای مشکلات رفتاری دلیریوم پرهیز شود، مگر در شرایط اضطراری آسیب به خود یا دیگران.";
    else if (id === "prednisone" || id === "methylprednisolone") rec = "در صورت اجبار با کمترین دوز و کوتاه‌ترین مدت مصرف شود.";
    else if (OPIOIDS.includes(id)) rec = "در درد از رویکردهای غیردارویی برای به حداقل رساندن مصرف اوپیوئید استفاده شود؛ پرهیز شود.";
    diseases.push(cat(C.delirium.condition, C.delirium.rationale, rec));
  }
  if (DEMENTIA.includes(id))
    diseases.push(cat(C.dementia.condition, C.dementia.rationale, ANTIPSY.includes(id) ? "مگر در صورت شکست اقدامات غیردارویی و وجود خطر آسیب به خود یا دیگران، پرهیز شود." : C.dementia.recommendation));
  if (FALLS.includes(id)) diseases.push(cat(C.falls.condition, C.falls.rationale, C.falls.recommendation));
  if (PARKINSON.includes(id)) diseases.push(cat(C.parkinson.condition, C.parkinson.rationale, C.parkinson.recommendation));
  if (PUD.includes(id)) diseases.push(cat(C.pud.condition, C.pud.rationale, C.pud.recommendation));
  if (INCONT.includes(id)) diseases.push(cat(C.incontinence.condition, C.incontinence.rationale, C.incontinence.recommendation));
  if (BPH_SET.includes(id)) diseases.push(cat(C.bph.condition, C.bph.rationale, C.bph.recommendation));
  if (OSTEOPOROSIS.includes(id)) diseases.push(cat(C.osteoporosis.condition, C.osteoporosis.rationale, C.osteoporosis.recommendation));
  if (HYPOTENSION.includes(id)) diseases.push(cat(C.hypotension.condition, C.hypotension.rationale, C.hypotension.recommendation));
  // ---- Drug-drug interactions: harvest old + add Table 5 rows ----
  const ddis = [...(o?.drugDrugInteractions ?? [])];
  const addDdi = (e) => {
    if (!ddis.some((x) => (x.targetDrugOrClass ?? "").includes(e.target.slice(0, 18))))
      ddis.push({ id: `${id}-ddi-${ddis.length}`, targetDrugOrClass: e.target, severity: e.severity, rationale: e.rationale, clinicalAction: e.action });
  };
  if (["lisinopril", "enalapril", "ramipril", "losartan", "valsartan", "candesartan", "spironolactone", "triamterene", "amiloride"].includes(id)) addDdi(DDI.ras);
  if (OPIOIDS.includes(id)) { addDdi(DDI.opioidBenzo); addDdi(DDI.opioidGaba); }
  if (["doxazosin", "prazosin", "terazosin", "phenoxybenzamine"].includes(id)) addDdi(DDI.alpha1Loop);
  if (id === "warfarin") { addDdi(DDI.warfarinMacrolide); addDdi(DDI.warfarinCotrim); }
  if (id === "phenytoin")
    for (const d of ddis)
      if (/cotrimoxazole|sulfamethoxazole|trimethoprim/i.test(d.targetDrugOrClass ?? ""))
        d.targetDrugOrClass = "Cotrimoxazole (Trimethoprim-Sulfamethoxazole)";
  // ---- Final record ----
  const cats = [];
  if (isPim) cats.push("PIM_GENERAL");
  else if (T4_DRUGS.includes(id)) cats.push("USE_WITH_CAUTION");
  if (ddis.length) cats.push("DRUG_INTERACTION");
  const renalRow = RENAL_OVERRIDE[id] ?? o?.renalConsiderations;
  if (renalRow) cats.push("RENAL_ADJUSTMENT");
  if (diseases.length) cats.push("DRUG_DISEASE");
  for (const c of opts.cats ?? row.cats ?? []) if (!cats.includes(c)) cats.push(c);
  const notes = [
    NOTE,
    BOX1_IDS.has(id) ? BOX1 : "",
    id === "glipizide" ? "گلی‌پیزید نسبت به سایر سولفونیل‌اوره‌ها در سالمندان ارجح است." : "",
    id === "doxepin" ? "دوز کمتر از ۶ میلی‌گرم در روز دوکسپین خواب‌آور آنتی‌کولینرژیک اندکی دارد و ایمنی آن مشابه دارونماست." : "",
    id === "aspirin-primary-prevention" ? "جدول ۲: مصرف مزمن آسپرین با دوز بیش از ۳۲۵ میلی‌گرم در روز به‌عنوان NSAID در سالمندان پرهیز شود." : "",
  ].filter(Boolean).join(" ");
  return {
    id,
    genericName: en ?? o?.genericName,
    genericNameFa: o?.genericNameFa ?? faName,
    brandNamesIran: o?.brandNamesIran?.length ? o.brandNamesIran : (opts.brands ?? []),
    therapeuticCategory:
      CAT_ALIAS[o?.therapeuticCategory ?? opts.cat] ??
      (o?.therapeuticCategory ?? opts.cat),
    beersCategories: cats,
    recommendation: row.rec,
    rationale: [row.rat, SIADH_CAUTION.includes(id) ? SIADH_NOTE : ""].filter(Boolean).join(" "),
    qualityOfEvidence: opts.ev ?? row.ev,
    strengthOfRecommendation: opts.st ?? row.st,
    isStrongAnticholinergic: T7AC.includes(id),
    isCnsActive: (o?.isCnsActive ?? false) || !!opts.cns,
    ...(o?.isAvailableInIran !== undefined ? { isAvailableInIran: o.isAvailableInIran } : {}),
    ...(acbScore !== undefined ? { acbScore } : {}),
    ...(stoppFallCategory ? { stoppFallCategory } : {}),
    isHighRiskSubclass,
    ...(atcCode ? { atcCode } : {}),
    saferAlternatives: row.alts?.length ? row.alts : (o?.saferAlternatives?.length ? o.saferAlternatives : []),
    drugClasses: o?.drugClasses?.length ? o.drugClasses : (opts.cls ?? []),
    drugDrugInteractions: ddis,
    drugDiseaseInteractions: diseases,
    ...(renalRow ? { renalConsiderations: renalRow } : {}),
    notes,
    lastUpdated: LAST,
  };
};

// ---- Build & validate ----
const ALL = [...OLD_DEFS, ...NEW_DEFS];
const dupDef = ALL.map((x) => x[0]).filter((x, i, a) => a.indexOf(x) !== i);
if (dupDef.length) throw new Error("duplicate definitions: " + dupDef.join(", "));
const built = ALL.map(([id, en, faName, opts]) => mk(id, en, faName, opts));
const covered = new Set(built.map((x) => x.id));
const missing = old.filter((r) => !covered.has(r.id)).map((r) => r.id);
if (missing.length) throw new Error("old ids not covered by definitions: " + missing.join(", "));
const warfarinRec = built.find((x) => x.id === "warfarin");
const records = [warfarinRec, ...built.filter((x) => x.id !== "warfarin")];
// The geriatric-panel tables must only reference real registry ids.
const knownIds = new Set(records.map((r) => r.id));
for (const src of [ACB_BY_ID, STOPPFALL_BY_ID, ATC_BY_ID])
  for (const k of Object.keys(src))
    if (!knownIds.has(k)) throw new Error("panel table references unknown id: " + k);
for (const k of HIGH_RISK_IDS)
  if (!knownIds.has(k)) throw new Error("high-risk table references unknown id: " + k);

const idRe = /^[a-zA-Z0-9_-]+$/;
const evOk = new Set(["High", "Moderate", "Low"]);
const stOk = new Set(["Strong", "Weak"]);
const catOk = new Set(["PIM_GENERAL", "DRUG_DISEASE", "USE_WITH_CAUTION", "DRUG_INTERACTION", "RENAL_ADJUSTMENT"]);
const condOk = new Set(Object.values(C).map((c) => c.condition));
const thrOk = /^(CrCl|eGFR)\s*(<|<=|≤|>|>=|≥)\s*(\d+(?:\.\d+)?)\s*mL\/min(?:\/1\.73\s*m[²2])?$/i;
const sevOk = new Set(["Avoid", "Use with caution"]);
const actOk = new Set(["Avoid", "Dose Reduction"]);
const fatal = [];
const noBrands = [];
for (const r of records) {
  const at = (m) => fatal.push(r.id + ": " + m);
  if (!idRe.test(r.id)) at("bad id");
  for (const k of ["genericName", "genericNameFa", "therapeuticCategory", "recommendation", "rationale", "lastUpdated"])
    if (!r[k]) at("empty " + k);
  if (!r.brandNamesIran.length) noBrands.push(r.id);
  if (!evOk.has(r.qualityOfEvidence)) at("bad evidence: " + r.qualityOfEvidence);
  if (!stOk.has(r.strengthOfRecommendation)) at("bad strength: " + r.strengthOfRecommendation);
  if (!r.beersCategories.length) at("no categories");
  for (const c of r.beersCategories) if (!catOk.has(c)) at("bad category " + c);
  for (const d of r.drugDiseaseInteractions) {
    if (!condOk.has(d.condition)) at("unknown condition " + d.condition);
    if (!d.rationale || !d.recommendation) at("empty disease entry");
  }
  for (const d of r.drugDrugInteractions) {
    if (!d.id || !idRe.test(d.id)) at("bad ddi id " + d.id);
    if (!d.targetDrugOrClass) at("ddi missing target");
    if (!sevOk.has(d.severity)) at("bad ddi severity " + d.severity);
    if (!d.rationale || !d.clinicalAction) at("ddi missing text");
  }
  if (r.renalConsiderations) {
    if (!thrOk.test(r.renalConsiderations.threshold)) at("bad renal threshold: " + r.renalConsiderations.threshold);
    if (!actOk.has(r.renalConsiderations.action)) at("bad renal action " + r.renalConsiderations.action);
  }
}
const dupIds = records.map((r) => r.id).filter((x, i, a) => a.indexOf(x) !== i);
if (dupIds.length) fatal.push("duplicate ids: " + dupIds.join(", "));
if (records[0].genericNameFa !== "وارفارین") fatal.push("first record must be warfarin");
if (fatal.length) {
  console.error("FATAL:\n" + fatal.join("\n"));
  process.exit(1);
}
writeFileSync(DATA + "seed.beers2023.json", JSON.stringify(records, null, 2) + "\n", "utf8");
const n = (fn) => records.filter(fn).length;
console.log("records:", records.length);
console.log("PIM_GENERAL:", n((r) => r.beersCategories.includes("PIM_GENERAL")));
console.log("USE_WITH_CAUTION:", n((r) => r.beersCategories.includes("USE_WITH_CAUTION")));
console.log("DRUG_INTERACTION:", n((r) => r.beersCategories.includes("DRUG_INTERACTION")));
console.log("RENAL_ADJUSTMENT:", n((r) => r.beersCategories.includes("RENAL_ADJUSTMENT")));
console.log("DRUG_DISEASE:", n((r) => r.beersCategories.includes("DRUG_DISEASE")));
console.log("strong-AC:", n((r) => r.isStrongAnticholinergic), "| CNS:", n((r) => r.isCnsActive));
console.log("disease entries:", records.reduce((s, r) => s + r.drugDiseaseInteractions.length, 0));
console.log("ddi entries:", records.reduce((s, r) => s + r.drugDrugInteractions.length, 0));
console.log("renal rows:", n((r) => !!r.renalConsiderations));
console.log("brands missing:", noBrands.join(", ") || "none");
console.log(
  "panel: ACB-scored",
  n((r) => r.acbScore !== undefined),
  "| FRIDs",
  n((r) => r.stoppFallCategory),
  "| high-risk subclass",
  n((r) => r.isHighRiskSubclass),
  "| ATC codes",
  n((r) => r.atcCode),
);



