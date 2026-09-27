import type { DrugRecord } from "../../types/types";
import { type PatientProfile, cockcroftGault } from "../checker";

export type RiskTier = "کم‌خطر" | "متوسط" | "پرخطر" | "بحرانی";
export type RiskColor = "emerald" | "amber" | "rose" | "purple";

export interface RiskEvaluationResult {
  score: number;
  tier: RiskTier;
  color: RiskColor;
  drivers: string[];
  rawBreakdown: {
    polypharmacyPenalty: number;
    pimBurdenPenalty: number;
    anticholinergicPenalty: number;
    cnsPolypharmacyPenalty: number;
    drugDiseasePenalty: number;
    renalMismatchPenalty: number;
    ageModifier: number;
  };
}

const cnsDrugClasses = [
  "antipsychotics",
  "anticonvulsants",
  "benzodiazepines",
  "zdrugs",
  "opioids",
  "antidepressants",
  "ssris",
  "snris",
  "muscle relaxants",
  "tricyclic antidepressants",
];

export function isCnsActiveDrug(med: DrugRecord): boolean {
  if (med.isCnsActive) return true;
  const cat = med.therapeuticCategory?.toLowerCase() || "";
  const name = med.genericName.toLowerCase();
  const classes = (med.drugClasses || []).map((c) => c.toLowerCase());
  return (
    cat.includes("central nervous system") ||
    cat.includes("cns") ||
    cat.includes("psychiatric") ||
    classes.some((c) => cnsDrugClasses.some((target) => c.includes(target))) ||
    name.includes("tramadol") ||
    name.includes("morphine") ||
    name.includes("gabapentin") ||
    name.includes("pregabalin") ||
    name.includes("baclofen")
  );
}

export function evaluateAdverseDrugReactionRisk(
  medications: DrugRecord[],
  selectedConditions: string[] = [],
  profile: PatientProfile = {},
): RiskEvaluationResult {
  const drivers: string[] = [];
  let polypharmacyPenalty = 0;
  const drugCount = medications.length;
  if (drugCount > 4) {
    const excess = drugCount - 4;
    polypharmacyPenalty += excess * 5;
    if (drugCount >= 10) {
      polypharmacyPenalty += 15;
      drivers.push(
        `پلی‌فارماسی حاد و شدید (${drugCount} دارو) ریسک عوارض و تداخلات را تشدید می‌کند (+${polypharmacyPenalty} نمره).`,
      );
    } else {
      drivers.push(
        `تعداد داروها (${drugCount} قلم) فراتر از آستانه استاندارد سالمندی است (+${polypharmacyPenalty} نمره).`,
      );
    }
  }

  let pimBurdenPenalty = 0;
  let pimAvoidCount = 0;
  let pimConditionalCount = 0;

  for (const med of medications) {
    if (med.beersCategories.includes("PIM_GENERAL")) {
      const rec = (med.recommendation || "").toLowerCase();
      const isConditional =
        rec.includes("duration") ||
        rec.includes("weeks") ||
        rec.includes("h2-receptor") ||
        rec.includes("exception") ||
        rec.includes("if ");

      if (isConditional) {
        pimBurdenPenalty += 6;
        pimConditionalCount++;
      } else {
        pimBurdenPenalty += 12;
        pimAvoidCount++;
      }
    }
  }

  if (pimAvoidCount > 0 || pimConditionalCount > 0) {
    drivers.push(
      `داروهای نامناسب بیرز (PIM جدول ۲): ${pimAvoidCount} پرهیز و ${pimConditionalCount} مشروط (+${pimBurdenPenalty} نمره).`,
    );
  }

  let anticholinergicPenalty = 0;
  const strongAnticholinergics = medications.filter(
    (m) => m.isStrongAnticholinergic,
  );
  if (strongAnticholinergics.length > 0) {
    anticholinergicPenalty += strongAnticholinergics.length * 10;
    if (strongAnticholinergics.length >= 2) {
      anticholinergicPenalty += 20;
      drivers.push(
        `هم‌افزایی آنتی‌کولینرژیک (جدول ۷): مصرف همزمان ${strongAnticholinergics.length} داروی قوی با خطر هذیان و یبوست (+${anticholinergicPenalty} نمره).`,
      );
    } else {
      drivers.push(
        `داروی آنتی‌کولینرژیک قوی (${strongAnticholinergics[0].genericNameFa || strongAnticholinergics[0].genericName}) (+${anticholinergicPenalty} نمره).`,
      );
    }
  }

  let cnsPolypharmacyPenalty = 0;
  const cnsMedList = medications.filter(isCnsActiveDrug);
  if (cnsMedList.length >= 3) {
    cnsPolypharmacyPenalty = 25;
    drivers.push(
      `پلی‌فارماسی CNS (جدول ۵): تجویز همزمان ${cnsMedList.length} داروی فعال بر اعصاب با خطر سقوط و شکستگی (+۲۵ نمره).`,
    );
  }

  let drugDiseasePenalty = 0;
  const conflictDetails: string[] = [];
  const normalizedConditions = selectedConditions.map((c) =>
    c.toLowerCase().trim(),
  );

  for (const med of medications) {
    for (const ddi of med.drugDiseaseInteractions || []) {
      const condName = ddi.condition.toLowerCase();
      const matched = normalizedConditions.some(
        (sc) =>
          sc.includes(condName) ||
          condName.includes(sc) ||
          (condName.includes("heart failure") && sc.includes("heart failure")) ||
          (condName.includes("delirium") && sc.includes("delirium")) ||
          (condName.includes("dementia") && sc.includes("dementia")) ||
          (condName.includes("fall") && sc.includes("fall")) ||
          (condName.includes("parkinson") && sc.includes("parkinson")) ||
          (condName.includes("syncope") && sc.includes("syncope")),
      );
      if (matched) {
        drugDiseasePenalty += 15;
        conflictDetails.push(
          `${med.genericNameFa || med.genericName} در "${ddi.condition}"`,
        );
      }
    }
  }

  if (drugDiseasePenalty > 0) {
    drivers.push(
      `تضاد دارویی با بیماری زمینه (جدول ۳): ${conflictDetails.join("، ")} (+${drugDiseasePenalty} نمره).`,
    );
  }

  let renalMismatchPenalty = 0;
  const calculatedCrCl = cockcroftGault(profile);
  const effectiveCrCl = profile.CrCl ?? calculatedCrCl;

  if (effectiveCrCl !== undefined) {
    for (const med of medications) {
      if (med.renalConsiderations) {
        const thresholdMatch =
          med.renalConsiderations.threshold.match(/\d+(\.\d+)?/);
        const thresholdVal = thresholdMatch
          ? parseFloat(thresholdMatch[0])
          : null;
        if (thresholdVal !== null && effectiveCrCl < thresholdVal) {
          renalMismatchPenalty += 15;
          drivers.push(
            `نیاز به تعدیل دوز کلیوی (جدول ۶): داروی ${med.genericNameFa || med.genericName} برای کلیرانس ${Math.round(effectiveCrCl)} (+15 نمره).`,
          );
        }
      }
    }
  }

  let ageModifier = 0;
  const age = profile.age ?? 0;
  if (age >= 85) {
    ageModifier = 10;
    drivers.push(`سالمندی بسیار پیشرفته (سن ${age} سال) (+۱۰ نمره).`);
  } else if (age >= 75) {
    ageModifier = 5;
    drivers.push(`سن سالمندی (${age} سال) به عنوان عامل خطر (+۵ نمره).`);
  }

  const rawSum =
    polypharmacyPenalty +
    pimBurdenPenalty +
    anticholinergicPenalty +
    cnsPolypharmacyPenalty +
    drugDiseasePenalty +
    renalMismatchPenalty +
    ageModifier;

  let score = 0;
  if (rawSum <= 0) {
    score = 0;
  } else if (rawSum <= 25) {
    score = Math.round((rawSum / 25) * 30);
  } else if (rawSum <= 65) {
    score = Math.round(30 + ((rawSum - 25) / 40) * 40);
  } else {
    score = Math.min(100, Math.round(70 + ((rawSum - 65) / 50) * 30));
  }

  if (drivers.length === 0) {
    drivers.push("رژیم دارویی فعلی منطبق بر معیارهای پایه‌ای احتیاط بیرز است.");
  }

  let tier: RiskTier = "کم‌خطر";
  let color: RiskColor = "emerald";

  if (score >= 75) {
    tier = "بحرانی";
    color = "purple";
  } else if (score >= 50) {
    tier = "پرخطر";
    color = "rose";
  } else if (score >= 25) {
    tier = "متوسط";
    color = "amber";
  } else {
    tier = "کم‌خطر";
    color = "emerald";
  }

  return {
    score,
    tier,
    color,
    drivers,
    rawBreakdown: {
      polypharmacyPenalty,
      pimBurdenPenalty,
      anticholinergicPenalty,
      cnsPolypharmacyPenalty,
      drugDiseasePenalty,
      renalMismatchPenalty,
      ageModifier,
    },
  };
}


