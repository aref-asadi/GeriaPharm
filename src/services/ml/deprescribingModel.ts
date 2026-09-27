import type { DrugRecord } from "../../types/types";

export interface TaperStep {
  week: string;
  targetDose: string;
  clinicalAction: string;
}

export interface DeprescribingProtocol {
  targetDrugId: string;
  targetDrugGeneric: string;
  targetDrugFa: string;
  clinicalRationale: string;
  tableSource: string;
  taperSchedule: TaperStep[];
  monitoringParameters: string[];
  safeAlternativeSuggestions: string[];
}

export function generateDeprescribingProtocols(
  medications: DrugRecord[],
  _selectedConditions: string[] = [],
): DeprescribingProtocol[] {
  const protocols: DeprescribingProtocol[] = [];

  for (const med of medications) {
    const id = med.id.toLowerCase();
    const name = med.genericName.toLowerCase();
    const nameFa = med.genericNameFa || med.genericName;
    const cat = (med.therapeuticCategory || "").toLowerCase();

    // 1. Proton Pump Inhibitors (PPIs)
    if (
      name.includes("omeprazole") ||
      name.includes("pantoprazole") ||
      name.includes("esomeprazole") ||
      name.includes("lansoprazole") ||
      name.includes("rabeprazole")
    ) {
      protocols.push({
        targetDrugId: med.id,
        targetDrugGeneric: med.genericName,
        targetDrugFa: nameFa,
        tableSource: "AGS Beers Criteria 2023 - Table 2",
        clinicalRationale:
          "مصرف مزمن بیش از ۸ هفته بدون اندیکاسیون قطعی ریسک شکستگی استخوان، عفونت کلستریدیوم دیفیسیل و آسیب کلیوی را بالا می‌برد.",
        taperSchedule: [
          {
            week: "هفته ۱ و ۲",
            targetDose: "۵۰٪ دوز پایه روزانه",
            clinicalAction: "مصرف روزانه با نصف دوز قبل از صبحانه",
          },
          {
            week: "هفته ۳ و ۴",
            targetDose: "مصرف یک‌روزدرمیان کمترین دوز درمانی",
            clinicalAction: "جایگزینی آنتی‌اسیدهای ساده یا مسدودکننده H2 در روزهای میانی",
          },
          {
            week: "پس از هفته ۴",
            targetDose: "قطع کامل PPI و تغییر به مصرف عنداللزوم (PRN)",
            clinicalAction: "استفاده موقت از فاموتیدین یا آنتی‌اسید موضعی در صورت سوزش",
          },
        ],
        monitoringParameters: [
          "ترشح اسیدی بازگشتی (Rebound hypersecretion) تا ۲ الی ۴ هفته",
          "بررسی علائم دیس‌پپسی، سوزش سردل و دیسفاژی",
          "پایش سطح منیزیم سرم و ویتامین B12 در مصرف مزمن",
        ],
        safeAlternativeSuggestions: [
          "فاموتیدین ۲۰ میلی‌گرم در صورت نیاز موقت (PRN)",
          "تغییر سبک زندگی و پرهیز از دراز کشیدن پس از غذا",
        ],
      });
    }

    // 2. Benzodiazepines & Z-drugs
    if (
      name.includes("alprazolam") ||
      name.includes("diazepam") ||
      name.includes("lorazepam") ||
      name.includes("clonazepam") ||
      name.includes("oxazepam") ||
      name.includes("chlordiazepoxide") ||
      name.includes("zolpidem") ||
      name.includes("eszopiclone") ||
      name.includes("zopiclone")
    ) {
      protocols.push({
        targetDrugId: med.id,
        targetDrugGeneric: med.genericName,
        targetDrugFa: nameFa,
        tableSource: "AGS Beers Criteria 2023 - Table 2",
        clinicalRationale:
          "بنزودیازپین‌ها و Z-drugs در سالمندان موجب افزایش شدید خطر هذیان، سقوط، شکستگی استخوان و افت شناختی می‌شوند.",
        taperSchedule: [
          {
            week: "هفته ۱ تا ۲",
            targetDose: "کاهش ۲۵٪ از دوز تام شبانه",
            clinicalAction: "تثبیت دوز و بررسی علائم بازگشتی اضطراب یا بی‌خوابی",
          },
          {
            week: "هفته ۳ تا ۴",
            targetDose: "کاهش ۵۰٪ نسبت به دوز پایه اولیه",
            clinicalAction: "آموزش بهداشت خواب و مشاوره شناختی-رفتاری (CBT-I)",
          },
          {
            week: "هفته ۵ تا ۶",
            targetDose: "کاهش ۷۵٪ نسبت به دوز پایه اولیه",
            clinicalAction: "ارزیابی اضطراب، ضربان قلب و فشار خون بیمار",
          },
          {
            week: "هفته ۷ به بعد",
            targetDose: "قطع کامل دارو",
            clinicalAction: "پشتیبانی روانی و پایش کیفیت خواب شبانه",
          },
        ],
        monitoringParameters: [
          "علائم محرومیت بنزودیازپینی (لرزش، بی‌قراری، تعریق و اضطراب حاد)",
          "بی‌خوابی بازگشتی (Rebound insomnia)",
          "هوشیاری روزانه و تعادل حرکتی بیمار",
        ],
        safeAlternativeSuggestions: [
          "ملاتونین خوراکی دوز پایین (۱ تا ۳ میلی‌گرم) قبل خواب",
          "اصول بهداشت خواب شناختی رفتاری (CBT-I)",
          "درمان اضطراب زمینه‌ای با مهارکننده‌های SSRI (مانند سرترالین)",
        ],
      });
    }

    // 3. Sulfonylureas
    if (
      name.includes("glibenclamide") ||
      name.includes("glyburide") ||
      name.includes("glimepiride") ||
      name.includes("chlorpropamide")
    ) {
      protocols.push({
        targetDrugId: med.id,
        targetDrugGeneric: med.genericName,
        targetDrugFa: nameFa,
        tableSource: "AGS Beers Criteria 2023 - Table 2",
        clinicalRationale:
          "سولفونیل‌اوره‌ها (به‌ویژه گلی‌بن‌کلامید و گلی‌مپیرید) خطر هیپوگلیسمی شدید و طولانی‌مدت در سالمندان دارند و در معیارهای ۲۰۲۳ پرهیز شده‌اند.",
        taperSchedule: [
          {
            week: "هفته اول",
            targetDose: "کاهش ۵۰٪ دوز سولفونیل‌اوره",
            clinicalAction: "ثبت روزانه قند خون مویرگی ناشتا و ۲ ساعت پس از غذا (SMBG)",
          },
          {
            week: "هفته دوم",
            targetDose: "قطع کامل داروی پرخطر",
            clinicalAction: "جایگزینی همزمان با مهارکننده DPP-4 یا در صورت اجبار، گلی‌پیزید",
          },
          {
            week: "هفته سوم و چهارم",
            targetDose: "تنظیم دوز داروی جایگزین ایمن",
            clinicalAction: "تثبیت درمان و کنترل پیشگیرانه افت قند خون",
          },
        ],
        monitoringParameters: [
          "پایش قند خون مویرگی (SMBG) صبح ناشتا و پیش از خواب",
          "علائم هیپوگلیسمی (تعریق، لرزش، گیجی، سرگیجه)",
          "اندازه‌گیری HbA1c سه ماه پس از تغییر رژیم",
        ],
        safeAlternativeSuggestions: [
          "مهارکننده‌های DPP-4 (لیناگلیپتین ۵ میلی‌گرم بدون نیاز به تعدیل کلیوی یا سیتاگلیپتین)",
          "در صورت نیاز اجباری به سولفونیل‌اوره: گلی‌پیزید با شروع دوز اندک (۲.۵ میلی‌گرم)",
        ],
      });
    }

    // 4. Aspirin for Primary Prevention
    if (
      id.includes("aspirin-primary") ||
      (name.includes("aspirin") && !name.includes("secondary"))
    ) {
      protocols.push({
        targetDrugId: med.id,
        targetDrugGeneric: med.genericName,
        targetDrugFa: nameFa,
        tableSource: "AGS Beers Criteria 2023 - Table 2",
        clinicalRationale:
          "آسپرین جهت پیشگیری اولیه از حوادث قلبی فاقد سودمندی اثبات‌شده بوده و خطر خونریزی‌های مرگبار داخل جمجمه و گوارش را بالا می‌برد.",
        taperSchedule: [
          {
            week: "هفته اول",
            targetDose: "اطمینان از عدم وجود سابقه قبلی سکته یا استنت قلبی",
            clinicalAction: "قطع مستقیم آسپرین بدون نیاز به کاهش تدریجی دوز",
          },
          {
            week: "هفته دوم تا چهارم",
            targetDose: "تداوم قطع کامل",
            clinicalAction: "پایش فشار خون و بهینه‌سازی درمان چربی با استاتین",
          },
        ],
        monitoringParameters: [
          "فشار خون شریانی و چربی خون",
          "بررسی رفع علائم سوزش گوارشی یا بهبود کم‌خونی فقر آهن",
        ],
        safeAlternativeSuggestions: [
          "اصلاح رژیم غذایی و سبک زندگی سالم",
          "کنترل قاطع فشار خون و درمان با استاتین در صورت اندیکاسیون",
        ],
      });
    }

    // 5. Systemic Estrogens
    if (
      name.includes("estrogen") ||
      name.includes("estradiol") ||
      cat.includes("estrogen")
    ) {
      protocols.push({
        targetDrugId: med.id,
        targetDrugGeneric: med.genericName,
        targetDrugFa: nameFa,
        tableSource: "AGS Beers Criteria 2023 - Table 2",
        clinicalRationale:
          "استروژن‌های سیستمیک در زنان یائسه سالمند با افزایش خطر سرطان پستان، هیپرپلازی اندومتر و ترومبوآمبولی وریدی همراه‌اند.",
        taperSchedule: [
          {
            week: "هفته ۱ تا ۲",
            targetDose: "کاهش ۵۰٪ دوز سیستمیک",
            clinicalAction: "بررسی علائم گرگرفتگی بازگشتی",
          },
          {
            week: "هفته ۳ تا ۴",
            targetDose: "مصرف با حداقل دوز یا یک روز در میان",
            clinicalAction: "آغاز روان‌کننده‌ها یا استروژن موضعی واژینال",
          },
          {
            week: "هفته ۵",
            targetDose: "قطع کامل هورمون سیستمیک",
            clinicalAction: "تداوم مراقبت موضعی در صورت آتروفی مجاری ادراری-تناسلی",
          },
        ],
        monitoringParameters: [
          "خونریزی غیرعادی رحمی یا واژینال",
          "علائم گرگرفتگی و تعریق شبانه",
          "فشار خون و سلامت عروقی",
        ],
        safeAlternativeSuggestions: [
          "کرم یا قرص واژینال استروژن با حداقل دوز مؤثر برای علائم آتروفی",
          "مرطوب‌کننده‌های غیرهورمونی واژن",
        ],
      });
    }

    // 6. Digoxin > 0.125 mg/day
    if (name.includes("digoxin")) {
      protocols.push({
        targetDrugId: med.id,
        targetDrugGeneric: med.genericName,
        targetDrugFa: nameFa,
        tableSource: "AGS Beers Criteria 2023 - Table 2",
        clinicalRationale:
          "دیگوکسین با دوز بیش از ۰.۱۲۵ میلی‌گرم در روز اثربخشی بیشتری نداشته و به دلیل افت کلیرانس کلیوی شدیداً مسمومیت‌زا است.",
        taperSchedule: [
          {
            week: "هفته اول",
            targetDose: "کاهش دوز به ۰.۱۲۵ میلی‌گرم روزانه یا یک‌روزدرمیان (در افت کلیوی)",
            clinicalAction: "نوار قلب (ECG) و کنترل پتاسیم و منیزیم",
          },
          {
            week: "هفته دوم",
            targetDose: "پایش ریتم ضربان قلب در فیبریلاسیون دهلیزی یا نارسایی قلبی",
            clinicalAction: "در صورت امکان تقویت درمان با بتابلوکرهای کاردیوسلکتیو",
          },
        ],
        monitoringParameters: [
          "سطح خونی دیگوکسین (هدف: ۰.۵ تا ۰.۹ ng/mL)",
          "ضربان قلب جهت پرهیز از برادی‌کاردی و بلوک قلبی",
          "پتاسیم و کراتینین سرم",
        ],
        safeAlternativeSuggestions: [
          "بتابلوکرهای کاردیوسلکتیو (بیزوپرولول، متوپرولول)",
        ],
      });
    }

    // 7. Skeletal Muscle Relaxants & Antipsychotics for BPSD
    if (
      name.includes("methocarbamol") ||
      name.includes("baclofen") ||
      name.includes("carisoprodol") ||
      name.includes("chlorzoxazone") ||
      name.includes("tizanidine") ||
      (cat.includes("antipsychotic") && med.beersCategories.includes("DRUG_DISEASE"))
    ) {
      protocols.push({
        targetDrugId: med.id,
        targetDrugGeneric: med.genericName,
        targetDrugFa: nameFa,
        tableSource: "AGS Beers Criteria 2023 - Table 2 & Table 3",
        clinicalRationale:
          "شل‌کننده‌های عضلانی در سالمندان اثربخشی اندکی داشته ولی عوارض آنتی‌کولینرژیک، خواب‌آلودگی، گیجی و خطر سقوط را تشدید می‌کنند.",
        taperSchedule: [
          {
            week: "هفته ۱ تا ۲",
            targetDose: "کاهش ۵۰٪ دوز مصرفی",
            clinicalAction: "آغاز پروتکل‌های مداخله‌ای غیردارویی فیزیکی",
          },
          {
            week: "هفته ۳",
            targetDose: "کاهش به ۲۵٪ دوز یا مصرف منحصراً در اسپاسم‌های حاد",
            clinicalAction: "ارزیابی میزان درد و توانایی حرکتی بیمار",
          },
          {
            week: "هفته ۴",
            targetDose: "قطع کامل دارو",
            clinicalAction: "استفاده از کمپرس گرم/سرد، فیزیوتراپی و اصلاح شرایط حرکتی",
          },
        ],
        monitoringParameters: [
          "بروز دردهای عضلانی بازگشتی",
          "بهبود سطح هوشیاری، تعادل و پیشگیری از سقوط",
        ],
        safeAlternativeSuggestions: [
          "استامینوفن منظم خوراکی (حداکثر ۲ الی ۳ گرم در روز)",
          "ژل‌های موضعی ضددرد (دیکلوفناک موضعی)",
          "مداخلات غیردارویی: فیزیوتراپی، تمرینات کششی سبک",
        ],
      });
    }
  }

  return protocols;
}



