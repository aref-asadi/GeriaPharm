import type { DrugRecord } from "../../types/types";
import type { Alert } from "../checker";
import { acbScoreFor } from "../checker";
import { drugName } from "../../lib/fa";

/**
 * Multi-dimensional geriatric risk panel: STOPPFall fall-risk-increasing
 * drugs (FRIDs), Anticholinergic Cognitive Burden, polypharmacy and Beers
 * potentially inappropriate medications.
 *
 * Every dimension is reported on its own scale — the panel deliberately
 * performs no cross-scale weighting or composite score.
 */
export interface StopFallClass {
  n: number;
  en: string;
  fa: string;
  /** Primary ATC code(s) of the group (score.md STOPPFall table). */
  atc: string;
  /** Representative drugs from the score.md table. */
  examples: string;
}
/** The 14 STOPPFall fall-risk-increasing-drug groups (Seppala et al., 2021). */
export const STOPPFALL_CLASSES: readonly StopFallClass[] = [
  { n: 1, en: "Benzodiazepines (BZD)", fa: "بنزودیازپین‌ها", atc: "N03AE, N05BA, N05CD", examples: "Alprazolam, Clonazepam, Diazepam, Lorazepam, Oxazepam, Chlordiazepoxide, Midazolam" },
  { n: 2, en: "Benzodiazepine-related drugs (Z-drugs)", fa: "داروهای وابسته به بنزودیازپین (Z-drugها)", atc: "N05CF", examples: "Zolpidem, Zopiclone, Zaleplon" },
  { n: 3, en: "Antipsychotics", fa: "ضدروان‌پریشی‌ها", atc: "N05A", examples: "Haloperidol, Risperidone, Olanzapine, Quetiapine, Clozapine, Aripiprazole, Chlorpromazine" },
  { n: 4, en: "Opioids", fa: "اپیوئیدها", atc: "N02A, R05DA", examples: "Morphine, Fentanyl, Tramadol, Codeine, Methadone" },
  { n: 5, en: "Antidepressants", fa: "ضدافسردها", atc: "N06A, N06CA", examples: "Amitriptyline, Nortriptyline, Imipramine, Fluoxetine, Sertraline, Citalopram, Paroxetine, Duloxetine, Mirtazapine" },
  { n: 6, en: "Anticholinergics", fa: "آنتی‌کولینرژیک‌های قوی", atc: "چندین ATC", examples: "Oxybutynin, Atropine, Hyoscine/Scopolamine, Trihexyphenidyl, Biperiden و سایر داروهای آنتی‌کولینرژیک قوی" },
  { n: 7, en: "Antiepileptics", fa: "ضدتشنج‌ها", atc: "N03, N02BF", examples: "Gabapentin, Pregabalin, Carbamazepine, Phenytoin, Phenobarbital, Levetiracetam" },
  { n: 8, en: "Diuretics", fa: "دیورتیک‌ها", atc: "C03", examples: "Furosemide, Spironolactone, Amiloride, Triamterene" },
  { n: 9, en: "Alpha-blockers used as antihypertensives", fa: "آلفا-بلوکرهای ضدفشار خون", atc: "C02CA", examples: "Prazosin, Doxazosin" },
  { n: 10, en: "Alpha-blockers for prostate hyperplasia", fa: "آلفا-بلوکرهای بزرگی پروستات", atc: "G04CA", examples: "Doxazosin, Terazosin" },
  { n: 11, en: "Centrally acting antihypertensives", fa: "ضدفشار خون‌های اثر مرکزی", atc: "C02A", examples: "Clonidine, Methyldopa, Moxonidine و مشابه" },
  { n: 12, en: "Antihistamines", fa: "آنتی‌هیستامین‌ها", atc: "R06, N07CA02", examples: "Diphenhydramine, Chlorpheniramine, Hydroxyzine, Promethazine, Cyproheptadine و سایر H1-های نسل اول" },
  { n: 13, en: "Vasodilators used in cardiac diseases", fa: "گشادکننده‌های عروقی قلبی", atc: "C01D", examples: "Isosorbide dinitrate/mononitrate, Nitroglycerin و نیترات‌های آلی" },
  { n: 14, en: "Medications for overactive bladder and urge incontinence", fa: "داروهای مثانه بیش‌فعال و بی‌اختیاری ادرار", atc: "G04BD", examples: "Oxybutynin, Tolterodine, Solifenacin, Darifenacin, Fesoterodine, Trospium" },
];
const CLASS_BY_N = new Map(STOPPFALL_CLASSES.map((c) => [c.n, c]));

/** Parses the seed's `stoppFallCategory` ("9,10") into sorted class numbers. */
export function stoppFallClassesFor(d: DrugRecord): number[] {
  if (!d.stoppFallCategory) return [];
  const nums = d.stoppFallCategory
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 14);
  return [...new Set(nums)].sort((a, b) => a - b);
}
export const stoppFallClassMeta = (n: number) => CLASS_BY_N.get(n);

export interface FridMetrics {
  /** FRID_count — number of selected drugs that are fall-risk-increasing. */
  fridCount: number;
  /** FRID_class_count — number of distinct STOPPFall classes covered. */
  fridClassCount: number;
  classesPresent: number[];
  /** Drugs from a subclass with higher fall/harm potential. */
  highRiskCount: number;
  highRiskNames: string[];
}
export function fridMetrics(meds: DrugRecord[]): FridMetrics {
  const classes = new Set<number>();
  const highRiskNames: string[] = [];
  let fridCount = 0;
  for (const d of meds) {
    const cs = stoppFallClassesFor(d);
    if (cs.length) fridCount++;
    for (const c of cs) classes.add(c);
    if (d.isHighRiskSubclass) highRiskNames.push(drugName(d));
  }
  return {
    fridCount,
    fridClassCount: classes.size,
    classesPresent: [...classes].sort((a, b) => a - b),
    highRiskCount: highRiskNames.length,
    highRiskNames,
  };
}

export type PolypharmacyTier = "none" | "polypharmacy" | "high";
export interface PolypharmacyInfo {
  count: number;
  tier: PolypharmacyTier;
  label: string;
  severity: "ok" | "warn" | "danger";
}
/**
 * Polypharmacy bands (Masnoon 2017 / score.md): 0–4 drugs = none,
 * 5–9 = polypharmacy, ≥10 = high/hyperpolypharmacy.
 */
export function polypharmacy(count: number): PolypharmacyInfo {
  if (count >= 10)
    return {
      count,
      tier: "high",
      label: "پلی‌فارمسی شدید / ابرپلی‌فارمسی (≥۱۰ دارو)",
      severity: "danger",
    };
  if (count >= 5)
    return { count, tier: "polypharmacy", label: "پلی‌فارمسی (≥۵ دارو)", severity: "warn" };
  return { count, tier: "none", label: "بدون پلی‌فارمسی (۰ تا ۴ دارو)", severity: "ok" };
}

export interface AcbBand {
  total: number;
  /** The clinically used warning threshold is a cumulative score of 3+. */
  elevated: boolean;
  label: string;
  severity: "ok" | "danger";
}
export function acbBand(total: number): AcbBand {
  return total >= 3
    ? { total, elevated: true, label: "بار آنتی‌کولینرژیک بالا (≥۳)", severity: "danger" }
    : { total, elevated: false, label: "زیر آستانه هشدار (<۳)", severity: "ok" };
}

export interface PanelEvaluation {
  frid: FridMetrics;
  acb: AcbBand & { contributors: { id: string; name: string; score: number }[] };
  polypharmacy: PolypharmacyInfo;
  /** Beers drug-level alerts (PIM_GENERAL + USE_WITH_CAUTION rows). */
  beers: { alertCount: number; avoidCount: number; cautionCount: number };
}
/**
 * Builds the four independent panel dimensions. `alerts` is the output of
 * `evaluateRegimen`/`auditRegimen` so the Beers card counts exactly the
 * alerts shown in the report below the panel.
 */
export function evaluatePanel(meds: DrugRecord[], alerts: Alert[]): PanelEvaluation {
  const contributors = meds
    .map((d) => ({ id: d.id, name: drugName(d), score: acbScoreFor(d) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "fa"));
  const total = contributors.reduce((sum, c) => sum + c.score, 0);
  const beerAlerts = alerts.filter((a) => a.type === "Medication");
  return {
    frid: fridMetrics(meds),
    acb: { ...acbBand(total), contributors },
    polypharmacy: polypharmacy(meds.length),
    beers: {
      alertCount: beerAlerts.length,
      avoidCount: beerAlerts.filter((a) => a.severity === "avoid").length,
      cautionCount: beerAlerts.filter((a) => a.severity === "caution").length,
    },
  };
}

export interface BreakdownRow {
  id: string;
  nameFa: string;
  nameEn: string;
  /** Drug-level ATC, falling back to the primary ATC of its STOPPFall class. */
  atc: string;
  classes: { n: number; fa: string }[];
  acb: number;
  highRisk: boolean;
  flagged: boolean;
}
/** One row per selected drug for the "how it is calculated" breakdown table. */
export function buildBreakdownRows(meds: DrugRecord[]): BreakdownRow[] {
  return meds.map((d) => {
    const ns = stoppFallClassesFor(d);
    const classes = ns.map((n) => ({ n, fa: CLASS_BY_N.get(n)?.fa ?? String(n) }));
    const classAtc = ns.length ? (CLASS_BY_N.get(ns[0])?.atc ?? "—") : "";
    const acb = acbScoreFor(d);
    return {
      id: d.id,
      nameFa: drugName(d),
      nameEn: d.genericName,
      atc: d.atcCode || (classes.length ? classAtc : "—"),
      classes,
      acb,
      highRisk: !!d.isHighRiskSubclass,
      flagged: classes.length > 0 || acb > 0 || !!d.isHighRiskSubclass,
    };
  });
}

/** Scientific references behind the panel (score.md sources). */
export const PANEL_REFERENCES: string[] = [
  "Seppala LJ, Petrovic M, Ryg J, et al. STOPPFall (Screening Tool of Older Persons Prescriptions in older adults with high fall risk): a Delphi study by the EuGMS Task and Finish Group on Fall-Risk-Increasing Drugs. Age Ageing. 2021;50(4):1189-1199. doi:10.1093/ageing/afaa249. PMID: 33349863.",
  "van der Velde N, Seppala LJ, Hartikainen S, et al.; EuGMS Task and Finish Group on Fall-risk-increasing drugs. European position paper on polypharmacy and fall-risk-increasing drugs recommendations in the World Guidelines for Falls Prevention and Management. Eur Geriatr Med. 2023;14(4):649-658. doi:10.1007/s41999-023-00824-8. PMID: 37452999.",
  "Doyle K, Scarlett S, Knight SP, et al. The combined association of STOPPFall medication use and orthostatic blood pressure abnormalities with future falls and fractures in community-dwelling older people. Eur Geriatr Med. 2026;17(3):1229-1241. doi:10.1007/s41999026-01473-3. PMID: 41973352.",
  "Boustani M, Campbell N, Munger S, Maidment I, Fox GC. Impact of anticholinergics on the aging brain: a review and practical application. Aging Health. 2008;4(3):311-320؛ به‌روزرسانی رسمی مقیاس ACB 2012، Regenstrief Institute / Indiana University.",
  "Masnoon N, Shakib S, Kalisch-Ellett L, Caughey GE. What is polypharmacy? A systematic review of definitions. BMC Geriatr. 2017;17:230. doi:10.1186/s12877-017-0621-2. PMID: 29017448.",
  "2023 American Geriatrics Society Beers Criteria® Update Expert Panel. American Geriatrics Society 2023 updated AGS Beers Criteria® for potentially inappropriate medication use in older adults. J Am Geriatr Soc. 2023;71(7):2002-2010.",
  "WHO Collaborating Centre for Drug Statistics Methodology. ATC/DDD Index — کدهای طبقه‌بندی آناتومیک-درمانی-شیمیایی (ATC).",
];
