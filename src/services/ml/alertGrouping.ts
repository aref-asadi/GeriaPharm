import type { Alert } from "../checker";
import type { DrugRecord } from "../../types/types";
import { fa, drugName } from "../../lib/fa";
import type { PrioritizedAlert } from "./alertRanking";

/** The five Beers table buckets rendered as accordions in the checker. */
export type BeersGroupId = "table2" | "table3" | "table4" | "table5" | "table6";

export interface BeersGroupMeta {
  id: BeersGroupId;
  testId: string;
  title: string;
  subtitle: string;
  /** Tailwind classes for the group accent chip. */
  accent: string;
  defaultOpen: boolean;
}

export const BEERS_GROUPS: BeersGroupMeta[] = [
  {
    id: "table2",
    testId: "beers-table2",
    title: "خطرات و هشدارهای عمومی داروها",
    subtitle: "جدول ۲ · داروهای نامناسب مستقل از بیماری",
    accent: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    defaultOpen: true,
  },
  {
    id: "table3",
    testId: "beers-table3",
    title: "تداخل دارو با بیماری‌ها",
    subtitle: "جدول ۳ · تشدید بیماری‌های زمینه‌ای",
    accent:
      "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
    defaultOpen: false,
  },
  {
    id: "table5",
    testId: "beers-table5",
    title: "تداخل‌های مهم دارو–دارو",
    subtitle: "جدول ۵ · ترکیب‌های پرخطر و بار تجمعی",
    accent:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    defaultOpen: false,
  },
  {
    id: "table6",
    testId: "beers-table6",
    title: "هشدارهای تنظیم دوز بر اساس کلیه",
    subtitle: "جدول ۶ · آستانه‌های CrCl و eGFR",
    accent: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    defaultOpen: false,
  },
  {
    id: "table4",
    testId: "beers-table4",
    title: "داروهای نیازمند احتیاط",
    subtitle: "جدول ۴ · مصرف با پایش دقیق",
    accent:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    defaultOpen: false,
  },
];

const table6Types: Alert["type"][] = ["Renal", "Review needed"];
const table5Types: Alert["type"][] = ["Interaction", "Cumulative load"];

function isAgeDomainNote(alert: Alert) {
  return alert.id.endsWith("age-domain");
}

/**
 * Routes every clinical alert to the Beers table it originates from.
 * "Medication" alerts are split by the drug's own category so that Table 4
 * (use with caution) stays separate from Table 2 (avoid).
 */
export function groupAlerts(
  alerts: PrioritizedAlert[],
  medications: DrugRecord[],
): Record<BeersGroupId, PrioritizedAlert[]> {
  const buckets: Record<BeersGroupId, PrioritizedAlert[]> = {
    table2: [],
    table3: [],
    table4: [],
    table5: [],
    table6: [],
  };
  const byId = new Map(medications.map((d) => [d.id, d]));

  for (const alert of alerts) {
    if (alert.type === "Medication") {
      const drug = byId.get(alert.id.replace(/pim$/, ""));
      const onlyCaution =
        !!drug &&
        drug.beersCategories.includes("USE_WITH_CAUTION") &&
        !drug.beersCategories.includes("PIM_GENERAL");
      buckets[onlyCaution ? "table4" : "table2"].push(alert);
      continue;
    }
    if (alert.type === "Disease") {
      buckets.table3.push(alert);
      continue;
    }
    if (table5Types.includes(alert.type)) {
      buckets.table5.push(alert);
      continue;
    }
    if (table6Types.includes(alert.type)) {
      buckets[isAgeDomainNote(alert) ? "table2" : "table6"].push(alert);
      continue;
    }
    buckets.table2.push(alert);
  }

  return buckets;
}

export interface BeersDrugRow {
  id: string;
  nameFa: string;
  nameEn: string;
  badgeFa: string;
  tone: "avoid" | "caution";
  recommendation: string;
  rationale: string;
  quality: string;
  strength: string;
}

function toRow(drug: DrugRecord): BeersDrugRow {
  const pim = drug.beersCategories.includes("PIM_GENERAL");
  return {
    id: drug.id,
    nameFa: drugName(drug),
    nameEn: drug.genericName,
    badgeFa: pim ? "پرهیز" : "مصرف با احتیاط",
    tone: pim ? "avoid" : "caution",
    recommendation: drug.recommendation,
    rationale: drug.rationale,
    quality: "شواهد: " + fa(drug.qualityOfEvidence),
    strength: "توصیه: " + fa(drug.strengthOfRecommendation),
  };
}

/** Table 2 summary rows: drugs that must be avoided regardless of diagnosis. */
export function buildPimRows(medications: DrugRecord[]): BeersDrugRow[] {
  return medications
    .filter((d) => d.beersCategories.includes("PIM_GENERAL"))
    .map(toRow);
}

/** Table 4 summary rows: drugs that require monitoring rather than avoidance. */
export function buildCautionRows(medications: DrugRecord[]): BeersDrugRow[] {
  return medications
    .filter(
      (d) =>
        d.beersCategories.includes("USE_WITH_CAUTION") &&
        !d.beersCategories.includes("PIM_GENERAL"),
    )
    .map(toRow);
}
