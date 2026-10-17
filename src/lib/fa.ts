import type { DrugRecord } from "../types/types";
export const number = (n: number) => new Intl.NumberFormat("fa-IR").format(n);
const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
/** Converts Persian/Arabic digits typed or pasted by the user into ASCII digits. */
export const toLatinDigits = (value: string) =>
  value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persian = persianDigits.indexOf(digit);
    return String(persian >= 0 ? persian : arabicDigits.indexOf(digit));
  });
export const date = (s: string) => {
  try {
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(
      new Date(s),
    );
  } catch {
    return s;
  }
};
export const drugName = (d: DrugRecord) => d.genericNameFa || d.genericName;
export const normalizeFa = (s: string) =>
  s
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200f\u200e]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
export const labels: Record<string, string> = {
  "Cardiovascular & Antithrombotics": "قلب‌وعروق و ضدانعقادها",
  "Central Nervous System": "سیستم عصبی مرکزی",
  "Pain Medications": "داروهای درد",
  "Gastrointestinal": "گوارش",
  "Anti-infective": "ضدعفونت",
  "Endocrine": "غدد و متابولیسم",
  "Heart Failure": "نارسایی قلبی",
  "Dementia": "دمانس",
  "Dementia / Cognitive Impairment": "دمانس / اختلال شناختی",
  "Delirium": "دلیریوم",
  "History of Falls or Fractures": "سابقه سقوط یا شکستگی",
  "Parkinson Disease": "بیماری پارکینسون",
  "Peptic Ulcer Disease": "زخم گوارشی",
  "Urinary Incontinence in Women": "بی‌اختیاری ادرار در زنان",
  "BPH / LUTS in men": "بزرگی پروستات / علائم ادراری در مردان",
  "Benign Prostatic Hyperplasia (BPH) / LUTS": "بزرگی پروستات / علائم ادراری",
  "Syncope": "سنکوپ",
  "Osteoporosis": "پوکی استخوان",
  "Symptomatic Hypotension": "افت فشار خون علامت‌دار",
  "High": "بالا",
  "Moderate": "متوسط",
  "Low": "پایین",
  "Strong": "قوی",
  "Weak": "ضعیف",
  "Avoid": "پرهیز از مصرف",
  "Use with caution": "مصرف با احتیاط",
  "Dose Reduction": "کاهش دوز",
  "Medication": "خطرات هر دارو",
  "Interaction": "تداخل‌های دارویی",
  "Disease": "تداخل با بیماری",
  "Renal": "هشدارهای کلیوی",
  "Cumulative load": "بار تجمعی داروها",
  "Review needed": "نیازمند بررسی",
  "SSRIs": "مهارکننده‌های انتخابی بازجذب سروتونین (SSRI)",
  "SNRIs": "مهارکننده‌های بازجذب سروتونین و نورآدرنالین (SNRI)",
  "Benzodiazepines": "بنزودیازپین‌ها",
  "Opioids": "اپیوئیدها",
  "Gabapentinoids": "گاباپنتینوئیدها",
  "Oral NSAIDs": "ضدالتهاب‌های غیراستروئیدی خوراکی",
  "Loop Diuretics": "دیورتیک‌های لوپ",
  "RAS inhibitors": "مهارکننده‌های سامانه رنین–آنژیوتانسین",
  "Anticholinergic agents": "داروهای آنتی‌کولینرژیک",
  "SSRIs (e.g., Sertraline, Fluoxetine, Citalopram)":
    "داروهای SSRI؛ مانند سرترالین، فلوکستین و سیتالوپرام",
  "Ciprofloxacin": "سیپروفلوکساسین",
  "Amiodarone": "آمیودارون",
  "Anticoagulants (Warfarin, DOACs, Heparin)":
    "ضدانعقادها؛ وارفارین، ضدانعقادهای خوراکی مستقیم و هپارین",
  "Opioids (Tramadol, Methadone, Morphine, Codeine)":
    "اپیوئیدها؛ ترامادول، متادون، مورفین و کدئین",
  "Any combination of ≥3 CNS-active agents":
    "همراهی سه یا چند داروی فعال بر سیستم عصبی مرکزی",
  "Anticholinergic agents (Table 7)": "داروهای آنتی‌کولینرژیک (جدول ۷)",
  "≥3 CNS-active drugs": "سه یا چند داروی فعال بر سیستم عصبی مرکزی",
  "Loop Diuretics (Furosemide)": "دیورتیک‌های لوپ؛ مانند فوروزماید",
  "Benzodiazepines or Opioids": "بنزودیازپین‌ها یا اپیوئیدها",
  "SSRIs / SNRIs": "داروهای SSRI یا SNRI",
  "save_medication": "ذخیره دارو",
  "delete_medication": "حذف دارو",
  "import_registry": "درون‌ریزی فهرست",
  "reset_registry": "بازنشانی فهرست",
  "login": "ورود مدیر",
  "logout": "خروج مدیر",
  "login_failed": "ورود ناموفق",
  "password_changed": "تغییر رمز عبور",
  "reset_survey": "بازنشانی نظرسنجی",
};
export const fa = (key: string) => labels[key] ?? key;
export const tables = [
  {
    id: "PIM_GENERAL",
    title: "داروهای نامناسب در سالمندی",
    short: "داروهای نامناسب در سالمندی",
    description: "توصیه‌های مستقل از بیماری زمینه‌ای",
    color: "orange",
  },
  {
    id: "DRUG_DISEASE",
    title: "تداخل دارو و بیماری",
    short: "تداخل دارو و بیماری",
    description: "ملاحظات مربوط به بیماری‌ها و سندرم‌ها",
    color: "purple",
  },
  {
    id: "USE_WITH_CAUTION",
    title: "داروهای نیازمند احتیاط",
    short: "داروهای نیازمند احتیاط",
    description: "درمان‌هایی که پایش بیشتری نیاز دارند",
    color: "amber",
  },
  {
    id: "DRUG_INTERACTION",
    title: "تداخل‌های دارویی",
    short: "تداخل‌های دارویی",
    description: "بررسی ترکیب‌های دارویی پرخطر",
    color: "blue",
  },
  {
    id: "RENAL_ADJUSTMENT",
    title: "هشدار کلیوی",
    short: "هشدار کلیوی",
    description: "پرهیز یا تنظیم دوز با توجه به عملکرد کلیه",
    color: "teal",
  },
  {
    id: "ANTICHOLINERGIC",
    title: "آنتی‌کولینرژیک‌های قوی",
    short: "آنتی‌کولینرژیک",
    description: "مرور داروهای دارای اثر آنتی‌کولینرژیک",
    color: "rose",
  },
];
export function matchesSearch(d: DrugRecord, q: string) {
  return normalizeFa(
    [
      d.genericName,
      d.genericNameFa,
      ...d.brandNamesIran,
      fa(d.therapeuticCategory),
      d.therapeuticCategory,
      ...d.drugDiseaseInteractions.map((r) => fa(r.condition)),
    ].join(" "),
  ).includes(normalizeFa(q));
}

export const canonicalLabel = (value: string) =>
  Object.entries(labels).find(
    ([, v]) => normalizeFa(v) === normalizeFa(value),
  )?.[0] ?? value;
