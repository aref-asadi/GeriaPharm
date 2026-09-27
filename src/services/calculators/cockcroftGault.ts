export interface RenalCalculationInputs {
  sex?: "male" | "female";
  age?: number; // years
  weight?: number; // kg (Actual Weight)
  height?: number; // cm
  serumCreatinine?: number; // mg/dL
  preferActualWeightOverIbw?: boolean;
}

export interface RenalCalculationResult {
  bmi?: number;
  bmiCategory?: "کم‌وزن" | "نرمال" | "اضافه‌وزن" | "چاق";
  bmiCategoryColor?: string;
  ibw?: number; // kg
  adjBw?: number; // kg
  isObese?: boolean;
  weightUsedForCrCl?: number;
  weightUsedLabel?: "وزن واقعی" | "وزن ایده‌آل (IBW)" | "وزن تعدیل‌شده (AdjBW)";
  crcl?: number; // mL/min
  steps: {
    title: string;
    formula: string;
    calculation: string;
  }[];
}

export function calculateRenalMetrics(
  inputs: RenalCalculationInputs,
): RenalCalculationResult {
  const {
    sex,
    age,
    weight,
    height,
    serumCreatinine,
    preferActualWeightOverIbw,
  } = inputs;

  const steps: RenalCalculationResult["steps"] = [];

  // 1. BMI Calculation
  let bmi: number | undefined;
  let bmiCategory: RenalCalculationResult["bmiCategory"];
  let bmiCategoryColor: string | undefined;

  if (weight && height && weight > 0 && height > 0) {
    const heightInMeters = height / 100;
    bmi = Number((weight / (heightInMeters * heightInMeters)).toFixed(1));

    if (bmi < 18.5) {
      bmiCategory = "کم‌وزن";
      bmiCategoryColor = "text-amber-500 bg-amber-50 dark:bg-amber-950/40";
    } else if (bmi <= 24.9) {
      bmiCategory = "نرمال";
      bmiCategoryColor = "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40";
    } else if (bmi <= 29.9) {
      bmiCategory = "اضافه‌وزن";
      bmiCategoryColor = "text-amber-600 bg-amber-50 dark:bg-amber-950/40";
    } else {
      bmiCategory = "چاق";
      bmiCategoryColor = "text-rose-600 bg-rose-50 dark:bg-rose-950/40";
    }

    steps.push({
      title: "شاخص توده بدنی (BMI)",
      formula: "BMI = Weight (kg) / (Height (m))²",
      calculation: `${weight} / (${heightInMeters.toFixed(2)})² = ${bmi} kg/m² (${bmiCategory})`,
    });
  }

  // 2. Ideal Body Weight (IBW)
  // Male: 50 + 0.905 * (height in cm - 152.4)
  // Female: 45.5 + 0.905 * (height in cm - 152.4)
  let ibw: number | undefined;
  if (sex && height && height > 0) {
    const base = sex === "female" ? 45.5 : 50.0;
    const diff = height - 152.4;
    ibw = Number((base + 0.905 * diff).toFixed(1));
    steps.push({
      title: "وزن ایده‌آل بدن (IBW - Devine Modified)",
      formula:
        sex === "female"
          ? "IBW = 45.5 + 0.905 × (Height - 152.4)"
          : "IBW = 50.0 + 0.905 × (Height - 152.4)",
      calculation: `${base} + 0.905 × (${height} - 152.4) = ${ibw} kg`,
    });
  }

  // 3. Adjusted Body Weight (AdjBW) & Weight Selection for CrCl
  let adjBw: number | undefined;
  let isObese = false;
  let weightUsedForCrCl: number | undefined;
  let weightUsedLabel: RenalCalculationResult["weightUsedLabel"];

  if (weight && weight > 0) {
    if (ibw && ibw > 0) {
      const ratio = weight / ibw;
      if (ratio > 1.2) {
        // Actual Weight > 120% IBW
        isObese = true;
        adjBw = Number((ibw + 0.4 * (weight - ibw)).toFixed(1));
        weightUsedForCrCl = adjBw;
        weightUsedLabel = "وزن تعدیل‌شده (AdjBW)";

        steps.push({
          title: "وزن تعدیل‌شده بدن (AdjBW)",
          formula: "AdjBW = IBW + 0.4 × (Actual Weight - IBW)",
          calculation: `${ibw} + 0.4 × (${weight} - ${ibw}) = ${adjBw} kg (وزن واقعی > ۱۲۰٪ IBW)`,
        });
      } else if (weight < ibw) {
        // Actual Weight < IBW -> Use Actual Weight
        weightUsedForCrCl = weight;
        weightUsedLabel = "وزن واقعی";
        steps.push({
          title: "انتخاب وزن جهت محاسبه کلیرانس",
          formula: "وزن واقعی کمتر از IBW است",
          calculation: `استفاده از وزن واقعی (${weight} kg) جهت جلوگیری از بیش‌تخمین کلیرانس کلیوی`,
        });
      } else {
        // Between 100% and 120% of IBW
        if (preferActualWeightOverIbw) {
          weightUsedForCrCl = weight;
          weightUsedLabel = "وزن واقعی";
        } else {
          weightUsedForCrCl = ibw;
          weightUsedLabel = "وزن ایده‌آل (IBW)";
        }
        steps.push({
          title: "انتخاب وزن جهت محاسبه کلیرانس",
          formula: "وزن واقعی بین ۱۰۰٪ تا ۱۲۰٪ وزن ایده‌آل است",
          calculation: `استفاده از ${weightUsedLabel} (${weightUsedForCrCl} kg)`,
        });
      }
    } else {
      weightUsedForCrCl = weight;
      weightUsedLabel = "وزن واقعی";
    }
  }

  // 4. Cockcroft-Gault Creatinine Clearance (CrCl)
  // CrCl = ((140 - Age) * Weight) / (72 * SCr) * (0.85 if Female)
  let crcl: number | undefined;
  if (
    age &&
    age > 0 &&
    serumCreatinine &&
    serumCreatinine > 0 &&
    weightUsedForCrCl &&
    weightUsedForCrCl > 0
  ) {
    const genderFactor = sex === "female" ? 0.85 : 1.0;
    const rawCrCl =
      ((140 - age) * weightUsedForCrCl * genderFactor) /
      (72 * serumCreatinine);
    crcl = Number(rawCrCl.toFixed(1));

    steps.push({
      title: "فرمول کلیرانس کراتینین کاکرافت-گالت (Cockcroft-Gault CrCl)",
      formula:
        sex === "female"
          ? "CrCl = [((140 - Age) × Weight) / (72 × SCr)] × 0.85"
          : "CrCl = ((140 - Age) × Weight) / (72 × SCr)",
      calculation: `[((140 - ${age}) × ${weightUsedForCrCl}) / (72 × ${serumCreatinine})]${sex === "female" ? " × 0.85" : ""} = ${crcl} mL/min`,
    });
  }

  return {
    bmi,
    bmiCategory,
    bmiCategoryColor,
    ibw,
    adjBw,
    isObese,
    weightUsedForCrCl,
    weightUsedLabel,
    crcl,
    steps,
  };
}
