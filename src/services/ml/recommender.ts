import type { DrugRecord } from "../../types/types";

export interface DrugSubstitutionRecommendation {
  flaggedDrugId: string;
  flaggedDrugName: string;
  flaggedDrugFa: string;
  recommendedAlternatives: {
    genericName: string;
    genericNameFa: string;
    category: string;
    evidenceRationale: string;
    clinicalDosingNotes?: string;
  }[];
}

export function recommendDrugSubstitutions(
  medications: DrugRecord[],
): DrugSubstitutionRecommendation[] {
  const recommendations: DrugSubstitutionRecommendation[] = [];

  for (const med of medications) {
    const name = med.genericName.toLowerCase();
    const nameFa = med.genericNameFa || med.genericName;

    // 1. Rivaroxaban / Warfarin -> Apixaban
    if (name.includes("rivaroxaban") || name.includes("warfarin")) {
      recommendations.push({
        flaggedDrugId: med.id,
        flaggedDrugName: med.genericName,
        flaggedDrugFa: nameFa,
        recommendedAlternatives: [
          {
            genericName: "Apixaban",
            genericNameFa: "آپیکسابان (Eliquis)",
            category: "ضدانعقاد خوراکی مستقیم (DOAC)",
            evidenceRationale:
              "بر اساس معیارهای ۲۰۲۳ بیرز، آپیکسابان نسبت به وارفارین و ریواروکسابان ایمنی بالاتری دارد و نرخ خونریزی گوارشی و عمده در سالمندان با آن کمتر است.",
            clinicalDosingNotes:
              "دوز ۵ میلی‌گرم دوبار در روز؛ در صورت ۲ معیار از ۳ معیار (سن ≥ ۸۰، وزن ≤ ۶۰، کراتینین ≥ ۱.۵) دوز به ۲.۵ میلی‌گرم تعدیل گردد.",
          },
        ],
      });
    }

    // 2. Glibenclamide / Glimepiride -> Glipizide or DPP-4i
    if (
      name.includes("glibenclamide") ||
      name.includes("glyburide") ||
      name.includes("glimepiride")
    ) {
      recommendations.push({
        flaggedDrugId: med.id,
        flaggedDrugName: med.genericName,
        flaggedDrugFa: nameFa,
        recommendedAlternatives: [
          {
            genericName: "Linagliptin / Sitagliptin",
            genericNameFa: "لیناگلیپتین یا سیتاگلیپتین (DPP-4i)",
            category: "ضددیابت مدرن بدون خطر افت قند خون",
            evidenceRationale:
              "مهارکننده‌های DPP-4 ریسک هیپوگلیسمی ندارند و لیناگلیپتین حتی در نارسایی شدید کلیوی نیاز به تعدیل دوز ندارد.",
            clinicalDosingNotes: "لیناگلیپتین ۵ میلی‌گرم روزانه خوراکی.",
          },
          {
            genericName: "Glipizide",
            genericNameFa: "گلی‌پیزید",
            category: "سولفونیل‌اوره کوتاه‌اثر",
            evidenceRationale:
              "در صورت الزام به سولفونیل‌اوره، گلی‌پیزید به دلیل نیمه‌عمر کوتاه‌تر نسبت به گلی‌بن‌کلامید ترجیح داده می‌شود.",
            clinicalDosingNotes: "شروع با ۲.۵ تا ۵ میلی‌گرم قبل از صبحانه.",
          },
        ],
      });
    }


    // 3. Amitriptyline / Doxepin / Paroxetine -> Sertraline / Escitalopram
    if (
      name.includes("amitriptyline") ||
      name.includes("doxepin") ||
      name.includes("paroxetine") ||
      name.includes("imipramine") ||
      name.includes("clomipramine")
    ) {
      recommendations.push({
        flaggedDrugId: med.id,
        flaggedDrugName: med.genericName,
        flaggedDrugFa: nameFa,
        recommendedAlternatives: [
          {
            genericName: "Sertraline",
            genericNameFa: "سرترالین (Zoloft)",
            category: "مهارکننده بازجذب سروتونین (SSRI)",
            evidenceRationale:
              "حداقل بار آنتی‌کولینرژیک، کمترین افت فشار خون وضعیتی و ایمنی قلبی اثبات‌شده در سالمندان در مقایسه با ضد‌افسردگی‌های سه‌حلقه‌ای.",
            clinicalDosingNotes:
              "شروع با ۲۵ میلی‌گرم روزانه و افزایش تدریجی تا ۵۰ الی ۱۰۰ میلی‌گرم.",
          },
          {
            genericName: "Escitalopram",
            genericNameFa: "اس‌سیتالوپرام (Cipralex)",
            category: "مهارکننده بازجذب سروتونین (SSRI)",
            evidenceRationale:
              "پروفایل تداخل دارویی ناچیز و فقدان اثرات آنتی‌کولینرژیک تضعیف‌کننده حافظه.",
            clinicalDosingNotes:
              "شروع با ۵ میلی‌گرم روزانه در سالمندان (حداکثر ۱۰ میلی‌گرم).",
          },
        ],
      });
    }

    // 4. Oral Indomethacin / Ketorolac / High-dose NSAIDs -> Topical NSAIDs / Acetaminophen
    if (
      name.includes("indomethacin") ||
      name.includes("ketorolac") ||
      name.includes("piroxicam") ||
      name.includes("naproxen") ||
      name.includes("ibuprofen") ||
      name.includes("diclofenac")
    ) {
      recommendations.push({
        flaggedDrugId: med.id,
        flaggedDrugName: med.genericName,
        flaggedDrugFa: nameFa,
        recommendedAlternatives: [
          {
            genericName: "Topical Diclofenac",
            genericNameFa: "ژل موضعی دیکلوفناک (Voltaren)",
            category: "ضدالتهاب غیرکورتونی موضعی",
            evidenceRationale:
              "اثربخشی موضعی معادل NSAID خوراکی با جذب سیستمیک کمتر از ۵٪ و حفظ ایمنی گوارشی و کلیوی.",
            clinicalDosingNotes: "مالیدن ۲ تا ۴ گرم روی موضع روزانه ۳ تا ۴ بار.",
          },
          {
            genericName: "Acetaminophen",
            genericNameFa: "استامینوفن خوراکی",
            category: "مسکن غیراپیوئیدی",
            evidenceRationale:
              "خط اول تسکین دردهای آرتروز بدون سمیت کلیوی، بدون زخم معده و بدون افزایش فشار خون.",
            clinicalDosingNotes:
              "۵۰۰ تا ۱۰۰۰ میلی‌گرم هر ۶ تا ۸ ساعت (سقف روزانه سالمندان حداکثر ۲ تا ۳ گرم).",
          },
        ],
      });
    }

    // 5. Oxybutynin -> Mirabegron / Bladder training
    if (name.includes("oxybutynin") || name.includes("tolterodine")) {
      recommendations.push({
        flaggedDrugId: med.id,
        flaggedDrugName: med.genericName,
        flaggedDrugFa: nameFa,
        recommendedAlternatives: [
          {
            genericName: "Mirabegron",
            genericNameFa: "میرابگرون (Betmiga)",
            category: "آگونیست گیرنده بتا-۳ آدرنرژیک",
            evidenceRationale:
              "فاقد هرگونه اثر آنتی‌کولینرژیک؛ عدم ایجاد خشکی دهان، احتباس ادرار، یبوست یا تضعیف حافظه.",
            clinicalDosingNotes: "۲۵ تا ۵۰ میلی‌گرم روزانه؛ پایش دوره‌ای فشار خون توصیه می‌شود.",
          },
          {
            genericName: "Behavioral Bladder Training",
            genericNameFa: "تمرینات کگل و بازآموزی رفتاری مثانه",
            category: "مداخله غیردارویی",
            evidenceRationale:
              "خط اول درمان بی‌اختیاری فوریتی ادرار در طب سالمندان با اثربخشی پایدار و بدون عوارض جانبی.",
          },
        ],
      });
    }

    // 6. Zolpidem / Diazepam -> Melatonin / CBT-I
    if (
      name.includes("zolpidem") ||
      name.includes("eszopiclone") ||
      name.includes("zopiclone") ||
      name.includes("temazepam") ||
      name.includes("triazolam")
    ) {
      recommendations.push({
        flaggedDrugId: med.id,
        flaggedDrugName: med.genericName,
        flaggedDrugFa: nameFa,
        recommendedAlternatives: [
          {
            genericName: "Melatonin (Low-Dose)",
            genericNameFa: "ملاتونین خوراکی دوز پایین (۱ تا ۳ میلی‌گرم)",
            category: "تنظیم‌کننده چرخه خواب",
            evidenceRationale:
              "جایگزین فیزیولوژیک بدون افت تعادل، بدون فراموشی و بدون وابستگی جسمی.",
            clinicalDosingNotes: "۱ تا ۳ میلی‌گرم ۳۰ تا ۶۰ دقیقه قبل از خواب.",
          },
          {
            genericName: "CBT-I",
            genericNameFa: "مشاوره شناختی-رفتاری بی‌خوابی و بهداشت خواب",
            category: "درمان استاندارد طلایی غیردارویی",
            evidenceRationale:
              "استاندارد طلایی خط اول درمان بی‌خوابی با اثربخشی ماندگار بدون تداخلات دارویی.",
          },
        ],
      });
    }
  }

  return recommendations;
}

