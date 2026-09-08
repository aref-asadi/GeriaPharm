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
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
  ],
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
    new RegExp(`(?:^| )${base}(?: |$)`).test(t) ||
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
export function auditRegimen(
  input: DrugRecord[],
  selectedConditions: string[],
  renal: { CrCl?: number; eGFR?: number },
): Alert[] {
  const drugs = [...new Map(input.map((d) => [d.id, d])).values()],
    alerts: Alert[] = [];
  const push = (a: Alert) => alerts.push(a);
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
        title: d.genericName,
        detail: d.recommendation,
        action: d.rationale,
      });
    for (const [i, r] of d.drugDiseaseInteractions.entries())
      if (
        selectedConditions.some(
          (c) => diseaseKey(c) === diseaseKey(r.condition),
        )
      )
        push({
          id: d.id + "disease" + i,
          type: "Disease",
          severity: r.recommendation.toLowerCase().includes("avoid")
            ? "avoid"
            : "caution",
          title: d.genericName + " · " + r.condition,
          detail: r.rationale,
          action: r.recommendation,
        });
    const r = d.renalConsiderations;
    if (r) {
      const rule = parseThreshold(r.threshold),
        value = rule ? renal[rule.metric as "CrCl" | "eGFR"] : undefined;
      if (!rule || value === undefined || !Number.isFinite(value) || value < 0)
        push({
          id: d.id + "renal-review",
          type: "Review needed",
          severity: "info",
          title: d.genericName + " · renal assessment incomplete",
          detail: rule
            ? "Enter " + rule.metric + " to assess " + r.threshold + "."
            : "Unrecognized threshold: " + r.threshold + ". Review manually.",
        });
      else if (rule.test(value))
        push({
          id: d.id + "renal",
          type: "Renal",
          severity: r.action === "Avoid" ? "avoid" : "caution",
          title: d.genericName + " · " + r.threshold,
          detail: r.guidance,
          action: r.rationale,
        });
    }
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
            "Concurrent CNS depressants can increase sedation and respiratory depression.",
          clinicalAction:
            "Review combination and indication, including any supervised transition or opioid-reduction plan.",
        });
      if (ca.includes("ras inhibitors") && cb.includes("ras inhibitors"))
        push({
          id: a.id + b.id + "ras",
          type: "Review needed",
          severity: "caution",
          title: a.genericName + " + " + b.genericName,
          detail:
            "Dual renin–angiotensin system blockade: review indication, kidney disease status, potassium and renal function.",
        });
      if (rules.length)
        push({
          id: a.id + b.id + "ddi",
          type: "Interaction",
          severity: rules.some((r) => r.severity === "Avoid")
            ? "avoid"
            : "caution",
          title: a.genericName + " + " + b.genericName,
          detail: [...new Set(rules.map((r) => r.rationale))].join(" "),
          action: [...new Set(rules.map((r) => r.clinicalAction))].join(" "),
        });
    }
  const anti = drugs.filter((d) => d.isStrongAnticholinergic),
    cns = drugs.filter((d) => d.isCnsActive);
  if (anti.length >= 2)
    push({
      id: "anti",
      type: "Cumulative load",
      severity: "avoid",
      title: "High anticholinergic burden · " + anti.length + " medications",
      detail: anti.map((d) => d.genericName).join(", "),
      action:
        "Review cumulative anticholinergic exposure and minimize concurrent use.",
    });
  if (cns.length >= 3)
    push({
      id: "cns",
      type: "Cumulative load",
      severity: "avoid",
      title: "CNS cumulative load · " + cns.length + " medications",
      detail: cns.map((d) => d.genericName).join(", "),
      action:
        "Review sedation, falls and fracture risk. Counts use registry flags; verify drug classes against Table 5.",
    });
  return alerts;
}
