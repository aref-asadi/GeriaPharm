import { drugName, fa, labels, normalizeFa, number } from "../lib/fa";
import type { DrugRecord } from "../types/types";
export const conditions = [
  "Heart Failure",
  "Dementia",
  "Delirium",
  "History of Falls or Fractures",
  "Parkinson Disease",
  "Peptic Ulcer Disease",
  "Urinary Incontinence in Women",
  "BPH / LUTS in men",
  "Syncope",
];
export interface PatientProfile {
  age?: number;
  sex?: "male" | "female";
  weight?: number;
  serumCreatinine?: number;
  CrCl?: number;
  eGFR?: number;
}
export interface RegimenStats {
  totalDrugs: number;
  pimCount: number;
  acbScore: number;
  cnsCount: number;
}
/**
 * Cockcroft–Gault creatinine clearance (mL/min).
 * Explicit CrCl input always takes precedence over the calculated value.
 */
export function cockcroftGault(profile: PatientProfile) {
  const { age, sex, weight, serumCreatinine } = profile;
  if (
    !age ||
    !weight ||
    !serumCreatinine ||
    age <= 0 ||
    weight <= 0 ||
    serumCreatinine <= 0
  )
    return undefined;
  const factor = sex === "female" ? 0.85 : 1;
  return ((140 - age) * weight * factor) / (72 * serumCreatinine);
}
const normalize = (s: string) => {
  const canonical =
    Object.entries(labels).find(
      ([, v]) => normalizeFa(v) === normalizeFa(s),
    )?.[0] ?? s;
  return canonical
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
};
const classMembers: Record<string, string[]> = {
  ssris: [
    "sertraline",
    "fluoxetine",
    "citalopram",
    "escitalopram",
    "paroxetine",
    "fluvoxamine",
  ],
  snris: ["duloxetine", "venlafaxine", "desvenlafaxine"],
  benzodiazepines: [
    "alprazolam",
    "lorazepam",
    "diazepam",
    "clonazepam",
    "oxazepam",
    "temazepam",
    "chlordiazepoxide",
  ],
  zdrugs: ["zolpidem", "eszopiclone", "zopiclone"],
  opioids: [
    "tramadol",
    "morphine",
    "oxycodone",
    "codeine",
    "fentanyl",
    "buprenorphine",
    "methadone",
  ],
  gabapentinoids: ["gabapentin", "pregabalin"],
  "oral nsaids": [
    "indomethacin",
    "ibuprofen",
    "naproxen",
    "diclofenac",
    "meloxicam",
    "celecoxib",
    "piroxicam",
    "ketorolac",
  ],
  "loop diuretics": ["furosemide", "bumetanide", "torsemide"],
  anticoagulants: [
    "warfarin",
    "rivaroxaban",
    "apixaban",
    "dabigatran",
    "edoxaban",
    "heparin",
  ],
  doacs: ["rivaroxaban", "apixaban", "dabigatran", "edoxaban"],
  "ras inhibitors": [
    "lisinopril",
    "enalapril",
    "ramipril",
    "losartan",
    "valsartan",
    "candesartan",
    "aliskiren",
  ],
  sulfonylureas: [
    "glibenclamide",
    "glyburide",
    "glimepiride",
    "gliclazide",
    "glipizide",
    "chlorpropamide",
  ],
  antipsychotics: [
    "haloperidol",
    "olanzapine",
    "quetiapine",
    "risperidone",
    "clozapine",
    "aripiprazole",
    "thioridazine",
    "trifluoperazine",
  ],
  anticonvulsants: [
    "phenobarbital",
    "primidone",
    "carbamazepine",
    "phenytoin",
    "valproate",
    "levetiracetam",
    "gabapentin",
    "pregabalin",
  ],
  "muscle relaxants": [
    "methocarbamol",
    "carisoprodol",
    "chlorzoxazone",
    "baclofen",
    "tizanidine",
  ],
  "antiplatelet agents": ["aspirin", "clopidogrel", "prasugrel", "ticagrelor"],
};
export function classesFor(d: DrugRecord) {
  const name = normalize(d.genericName);
  return [
    ...(d.drugClasses ?? []).map(normalize),
    ...Object.entries(classMembers)
      .filter(([, v]) => v.some((n) => name.split(" ").includes(n)))
      .map(([k]) => k),
  ];
}
export function matchesTarget(target: string, d: DrugRecord) {
  const t = normalize(target),
    name = normalize(d.genericName);
  if (/3 cns|three cns/.test(t)) return false;
  if (t.includes("anticholinergic") && d.isStrongAnticholinergic) return true;
  const base = name.split(" ")[0];
  return (
    (!!base && new RegExp(`(?:^| )${base}(?: |$)`).test(t)) ||
    classesFor(d).some((c) => t.includes(c)) ||
    d.brandNamesIran.some((b) => normalize(b) === t)
  );
}
function diseaseKey(s: string) {
  const n = normalize(s);
  if (/bph|prostatic|luts/.test(n)) return "bph";
  if (/dementia|cognitive/.test(n)) return "dementia";
  if (/falls|fracture/.test(n)) return "falls";
  if (/incontinence/.test(n)) return "incontinence";
  if (/parkinson/.test(n)) return "parkinson";
  return n;
}
export function parseThreshold(value: string) {
  const m = value.match(
    /^(CrCl|eGFR)\s*(<|<=|≤|>|>=|≥)\s*(\d+(?:\.\d+)?)\s*mL\/min(?:\/1\.73\s*m[²2])?$/i,
  );
  if (m)
    return {
      metric: m[1].toLowerCase() === "crcl" ? "CrCl" : "eGFR",
      test: (v: number) =>
        m[2] === "<"
          ? v < +m[3]
          : m[2] === ">"
            ? v > +m[3]
            : ["<=", "≤"].includes(m[2])
              ? v <= +m[3]
              : v >= +m[3],
    };
  const range = value.match(/^(CrCl|eGFR)\s*(\d+)\s*[-–]\s*(\d+)\s*mL\/min$/i);
  if (range)
    return {
      metric: range[1].toLowerCase() === "crcl" ? "CrCl" : "eGFR",
      test: (v: number) => v >= +range[2] && v <= +range[3],
    };
  return null;
}
export interface Alert {
  id: string;
  type:
    | "Medication"
    | "Interaction"
    | "Disease"
    | "Renal"
    | "Cumulative load"
    | "Review needed";
  severity: "avoid" | "caution" | "info";
  title: string;
  detail: string;
  action?: string;
}
/**
 * Anticholinergic Cognitive Burden (ACB) weight per drug, based on the
 * published Boustani scale and its widely used updates. Drugs absent from
 * the map fall back to the record's anticholinergic flag (weight 2).
 */
const acbMap: Record<string, 1 | 2 | 3> = {
  // Score 3 — strong
  amitriptyline: 3,
  imipramine: 3,
  hydroxyzine: 3,
  chlorpheniramine: 3,
  cyproheptadine: 3,
  promethazine: 3,
  diphenhydramine: 3,
  olanzapine: 3,
  clozapine: 3,
  thioridazine: 3,
  chlorpromazine: 3,
  atropine: 3,
  hyoscine: 3,
  scopolamine: 3,
  oxybutynin: 3,
  benztropine: 3,
  cyclobenzaprine: 3,
  tizanidine: 3,
  dicyclomine: 3,
  clidinium: 3,
  // Score 2 — moderate
  nortriptyline: 2,
  doxepin: 2,
  paroxetine: 2,
  quetiapine: 2,
  baclofen: 2,
  methocarbamol: 1,
  // Score 1 — mild
  alprazolam: 1,
  diazepam: 1,
  citalopram: 1,
  escitalopram: 1,
  trazodone: 1,
  venlafaxine: 1,
  haloperidol: 1,
  risperidone: 1,
  famotidine: 1,
  furosemide: 1,
  triamterene: 1,
  digoxin: 1,
  warfarin: 1,
  nifedipine: 1,
  codeine: 1,
  morphine: 1,
  fentanyl: 1,
  colchicine: 1,
  aspirin: 1,
  metoprolol: 1,
  atenolol: 1,
  prednisone: 1,
  theophylline: 1,
};
export function acbScoreFor(d: DrugRecord): number {
  const name = normalize(d.genericName);
  const base = name.split(" ")[0];
  const mapped = acbMap[base] ?? acbMap[name];
  if (mapped) return mapped;
  return d.isStrongAnticholinergic ? 2 : 0;
}
const cnsClasses = new Set([
  "benzodiazepines",
  "zdrugs",
  "opioids",
  "gabapentinoids",
  "anticonvulsants",
  "antipsychotics",
  "muscle relaxants",
  "ssris",
  "snris",
]);
export function cnsActiveFor(d: DrugRecord) {
  return d.isCnsActive || classesFor(d).some((c) => cnsClasses.has(c));
}
/** High-risk combination for age ≥ 75 (Beers Table 4). */
const age75Caution = ["dabigatran", "prasugrel", "ticagrelor"];
export function evaluateRegimen(
  input: DrugRecord[],
  selectedConditions: string[],
  profile: PatientProfile = {},
): { alerts: Alert[]; stats: RegimenStats } {
  const alerts = auditRegimen(input, selectedConditions, profile);
  const drugs = [...new Map(input.map((d) => [d.id, d])).values()];
  const flagged = new Set(
    alerts
      .filter(
        (a) =>
          a.severity === "avoid" &&
          (a.type === "Medication" || a.type === "Disease"),
      )
      .map((a) => a.id),
  );
  const pimCount = drugs.filter((d) =>
    [...flagged].some((id) => id.startsWith(d.id)),
  ).length;
  const acbScore = drugs.reduce((sum, d) => sum + acbScoreFor(d), 0);
  const cnsCount = drugs.filter(cnsActiveFor).length;
  return {
    alerts,
    stats: {
      totalDrugs: drugs.length,
      pimCount,
      acbScore,
      cnsCount,
    },
  };
}
export function auditRegimen(
  input: DrugRecord[],
  selectedConditions: string[],
  profile: PatientProfile = {},
): Alert[] {
  const drugs = [...new Map(input.map((d) => [d.id, d])).values()],
    alerts: Alert[] = [];
  const push = (a: Alert) => alerts.push(a);
  // Effective renal clearance: explicit entry wins; otherwise Cockcroft–Gault.
  const computedCrCl = cockcroftGault(profile);
  const renal: { CrCl?: number; eGFR?: number } = {
    CrCl: profile.CrCl ?? computedCrCl,
    eGFR: profile.eGFR,
  };
  const computed = profile.CrCl === undefined && computedCrCl !== undefined;
  for (const d of drugs) {
    if (
      d.beersCategories.includes("PIM_GENERAL") ||
      d.beersCategories.includes("USE_WITH_CAUTION")
    )
      push({
        id: d.id + "pim",
        type: "Medication",
        severity: d.beersCategories.includes("PIM_GENERAL")
          ? "avoid"
          : "caution",
        title: drugName(d),
        detail: d.recommendation,
        action: d.rationale,
      });
    for (const [i, r] of d.drugDiseaseInteractions.entries()) {
      const key = diseaseKey(r.condition);
      // Sex-specific rules: BPH/LUTS applies to men only.
      if (key === "bph" && profile.sex === "female") continue;
      if (selectedConditions.some((c) => diseaseKey(c) === key))
        push({
          id: d.id + "disease" + i,
          type: "Disease",
          severity: /avoid|پرهیز/.test(r.recommendation.toLowerCase())
            ? "avoid"
            : "caution",
          title: drugName(d) + " · " + fa(r.condition),
          detail: r.rationale,
          action: r.recommendation,
        });
    }
    const r = d.renalConsiderations;
    if (r) {
      const rule = parseThreshold(r.threshold),
        value = rule ? renal[rule.metric as "CrCl" | "eGFR"] : undefined;
      if (!rule || value === undefined || !Number.isFinite(value) || value < 0)
        push({
          id: d.id + "renal-review",
          type: "Review needed",
          severity: "info",
          title: drugName(d) + " · ارزیابی کلیوی کامل نیست",
          detail: rule
            ? "برای بررسی آستانه " +
              r.threshold +
              "، مقدار " +
              rule.metric +
              " را وارد کنید."
            : "آستانه ناشناخته است: " + r.threshold + "؛ بررسی دستی لازم است.",
        });
      else if (rule.test(value))
        push({
          id: d.id + "renal",
          type: "Renal",
          severity: r.action === "Avoid" ? "avoid" : "caution",
          title: drugName(d) + " · " + r.threshold,
          detail: r.guidance,
          action: r.rationale,
        });
    }
    // Age-domain alerts (Beers applies to adults 65+; risk rises at 75+).
    if (profile.age !== undefined && profile.age > 0 && profile.age < 65)
      push({
        id: d.id + "age-domain",
        type: "Review needed",
        severity: "info",
        title: drugName(d) + " · سن کمتر از ۶۵ سال",
        detail:
          "معیارهای بیرز برای بزرگسالان ۶۵ سال و بیشتر تدوین شده است؛ نتیجه این بررسی برای این بیمار فقط جنبه کمکی دارد.",
      });
  }
  if (drugs.length && profile.age !== undefined && profile.age >= 75) {
    const risky = drugs.filter((d) => {
      const base = normalize(d.genericName).split(" ")[0];
      return age75Caution.includes(base);
    });
    if (risky.length)
      push({
        id: "age75",
        type: "Review needed",
        severity: "caution",
        title:
          "سن ۷۵ سال و بیشتر · " +
          risky.map(drugName).join("، "),
        detail:
          "در سالمندان بسیار مسن، دابیگاتران و داروهای ضدپلاکتی مانند پراسوگرل و تیکاگرلور با خطر خونریزی بیشتری همراه‌اند؛ در صورت وجود گزینه، آپیکسابان یا کلوپیدوگرل ارجح است.",
        action: "لزوم درمان، دوز و انتخاب دارو را با توجه به سن بازبینی کنید.",
      });
  }
  for (let i = 0; i < drugs.length; i++)
    for (let j = i + 1; j < drugs.length; j++) {
      const a = drugs[i],
        b = drugs[j];
      const rules = [
        ...a.drugDrugInteractions.filter((r) =>
          matchesTarget(r.targetDrugOrClass, b),
        ),
        ...b.drugDrugInteractions.filter((r) =>
          matchesTarget(r.targetDrugOrClass, a),
        ),
      ];
      const ca = classesFor(a),
        cb = classesFor(b);
      if (
        (ca.includes("opioids") &&
          (cb.includes("benzodiazepines") || cb.includes("gabapentinoids"))) ||
        (cb.includes("opioids") &&
          (ca.includes("benzodiazepines") || ca.includes("gabapentinoids")))
      )
        rules.push({
          id: "cns",
          severity: "Avoid",
          targetDrugOrClass: "CNS depressants",
          rationale:
            "همراهی داروهای تضعیف‌کننده سیستم عصبی مرکزی می‌تواند خواب‌آلودگی و سرکوب تنفسی را افزایش دهد.",
          clinicalAction:
            "ترکیب و اندیکاسیون را بررسی کنید؛ تغییر درمان یا کاهش اپیوئید باید تحت نظر باشد.",
        });
      if (ca.includes("ras inhibitors") && cb.includes("ras inhibitors"))
        push({
          id: a.id + b.id + "ras",
          type: "Review needed",
          severity: "caution",
          title: drugName(a) + " + " + drugName(b),
          detail:
            "مهار دوگانه سامانه رنین–آنژیوتانسین: اندیکاسیون، بیماری کلیوی، پتاسیم و عملکرد کلیه را بررسی کنید.",
        });
      if (rules.length)
        push({
          id: a.id + b.id + "ddi",
          type: "Interaction",
          severity: rules.some((r) => r.severity === "Avoid")
            ? "avoid"
            : "caution",
          title: drugName(a) + " + " + drugName(b),
          detail: [...new Set(rules.map((r) => r.rationale))].join(" "),
          action: [...new Set(rules.map((r) => r.clinicalAction))].join(" "),
        });
    }
  const anti = drugs.filter((d) => d.isStrongAnticholinergic),
    cns = drugs.filter(cnsActiveFor);
  if (anti.length >= 2)
    push({
      id: "anti",
      type: "Cumulative load",
      severity: "avoid",
      title: "بار آنتی‌کولینرژیک بالا · " + number(anti.length) + " دارو",
      detail: anti.map(drugName).join("، "),
      action:
        "مواجهه تجمعی با آنتی‌کولینرژیک‌ها را بررسی و مصرف هم‌زمان را به حداقل برسانید.",
    });
  if (cns.length >= 3)
    push({
      id: "cns",
      type: "Cumulative load",
      severity: "avoid",
      title: "بار تجمعی سیستم عصبی مرکزی · " + number(cns.length) + " دارو",
      detail: cns.map(drugName).join("، "),
      action:
        "خطر خواب‌آلودگی، سقوط و شکستگی را بررسی کنید. شمارش بر اساس پرچم‌های فهرست است؛ کلاس‌ها را با جدول ۵ تطبیق دهید.",
    });
  if (computed)
    push({
      id: "cg-note",
      type: "Review needed",
      severity: "info",
      title: "کلیرانس کراتینین با فرمول کوکرافت–گالت برآورد شد",
      detail:
        "مقدار CrCl از سن، وزن، جنسیت و کراتینین سرم محاسبه شد. در بیماران با تغییر حاد عملکرد کلیه یا وزن غیرمعمول، اندازه‌گیری مستقل CrCl ارجح است.",
    });
  return alerts;
}