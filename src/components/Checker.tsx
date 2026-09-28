import { Checkbox } from "./ui/Checkbox";
import { useState, useRef } from "react";
import {
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  Info,
  Pill,
  Printer,
  Copy,
  Check,
  ListChecks,
} from "lucide-react";
import type { DrugRecord } from "../types/types";
import {
  auditRegimen,
  conditions,
  evaluateRegimen,
  cockcroftGault,
  type PatientProfile,
} from "../services/checker";
import { calculateRenalMetrics } from "../services/calculators/cockcroftGault";
import { evaluateAdverseDrugReactionRisk } from "../services/ml/riskModel";
import { generateDeprescribingProtocols } from "../services/ml/deprescribingModel";
import { recommendDrugSubstitutions } from "../services/ml/recommender";
import { prioritizeAlerts } from "../services/ml/alertRanking";
import {
  groupAlerts,
  BEERS_GROUPS,
  type BeersGroupId,
} from "../services/ml/alertGrouping";
import {
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Flame,
  ArrowRightLeft,
  CalendarCheck,
  ShieldAlert,
} from "lucide-react";

import { fa, number, drugName, matchesSearch } from "../lib/fa";
import {
  Button,
  IconButton,
  SearchField,
  Notice,
  EmptyState,
} from "./ui/Primitives";
const profileKey = "gp-profile";
function loadProfile(): PatientProfile {
  try {
    const raw = JSON.parse(localStorage.getItem(profileKey) || "{}");
    const p: PatientProfile = {};
    if (typeof raw.age === "number" && raw.age >= 0) p.age = raw.age;
    if (raw.sex === "male" || raw.sex === "female") p.sex = raw.sex;
    if (typeof raw.weight === "number" && raw.weight >= 0) p.weight = raw.weight;
    if (typeof raw.height === "number" && raw.height >= 0) p.height = raw.height;
    if (typeof raw.serumCreatinine === "number" && raw.serumCreatinine >= 0)
      p.serumCreatinine = raw.serumCreatinine;
    if (typeof raw.CrCl === "number" && raw.CrCl >= 0) p.CrCl = raw.CrCl;
    if (typeof raw.eGFR === "number" && raw.eGFR >= 0) p.eGFR = raw.eGFR;
    if (typeof raw.preferActualWeightOverIbw === "boolean")
      p.preferActualWeightOverIbw = raw.preferActualWeightOverIbw;
    return p;
  } catch {
    return {};
  }
}
export function Checker({
  drugs,
  ids,
  setIds,
  onOpen,
}: {
  drugs: DrugRecord[];
  ids: string[];
  setIds: (ids: string[]) => void;
  onOpen: (d: DrugRecord) => void;
}) {
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [profile, setProfile] = useState<PatientProfile>(loadProfile),
    [clear, setClear] = useState(false),
    [filter, setFilter] = useState("All"),
    [copied, setCopied] = useState(false),
    [showFormulaDetails, setShowFormulaDetails] = useState(false);

  const meds = ids
      .map((id) => drugs.find((d) => d.id === id))
      .filter((d): d is DrugRecord => !!d),
    missing = ids.length - meds.length;
  const { alerts, stats } = evaluateRegimen(meds, selected, profile);
  const groups = [...new Set(alerts.map((a) => a.type))];
  const matches = drugs.filter(
    (d) => !ids.includes(d.id) && matchesSearch(d, query),
  );
  const searchRef = useRef<HTMLDivElement>(null);
  function update(patch: Partial<PatientProfile>) {
    const next = { ...profile, ...patch };
    for (const k of Object.keys(next) as (keyof PatientProfile)[])
      if (next[k] === undefined) delete next[k];
    setProfile(next);
    try {
      localStorage.setItem(profileKey, JSON.stringify(next));
    } catch {
      /* keep session-only */
    }
  }
  const num = (k: keyof PatientProfile) =>
    profile[k] === undefined ? "" : String(profile[k]);
  const onNum = (k: keyof PatientProfile) => (v: string) =>
    update({ [k]: v === "" ? undefined : Number(v) } as Partial<PatientProfile>);
  const cg = cockcroftGault(profile);
  // Module 1 & 2 ML + Pharmacokinetic engines
  const renalCalculations = calculateRenalMetrics({
    sex: profile.sex,
    age: profile.age,
    weight: profile.weight,
    height: profile.height,
    serumCreatinine: profile.serumCreatinine,
    preferActualWeightOverIbw: profile.preferActualWeightOverIbw,
  });

  const adrRisk = evaluateAdverseDrugReactionRisk(meds, selected, profile);
  const deprescribingProtocols = generateDeprescribingProtocols(meds, selected);
  const drugSubstitutions = recommendDrugSubstitutions(meds);
  const prioritizedAlertList = prioritizeAlerts(alerts);
  const beersAlertGroups = groupAlerts(prioritizedAlertList, meds);
  const [openBeersGroups, setOpenBeersGroups] = useState<Record<string, boolean>>({
    table2: true,
    table3: true,
    table5: true,
    table6: true,
    table4: true,
  });
  const toggleBeersGroup = (id: BeersGroupId) => {
    setOpenBeersGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const alertText = () => {
    const lines = [
      "خلاصه پرونده دارویی سالمند — گریافارم",
      "معیارهای بیرز ۲۰۲۳",
      "",
      `تعداد داروها: ${number(stats.totalDrugs)}`,
      `داروهای نامناسب (PIM): ${number(stats.pimCount)}`,
      `بار آنتی‌کولینرژیک (ACB): ${number(stats.acbScore)}`,
      `داروهای فعال بر CNS: ${number(stats.cnsCount)}`,
      "",
    ];
    for (const a of alerts) {
      lines.push(
        `[${a.severity === "avoid" ? "پرهیز" : a.severity === "caution" ? "احتیاط" : "بررسی"}] ${a.title}`,
      );
      lines.push(a.detail);
      if (a.action) lines.push("اقدام: " + a.action);
      lines.push("");
    }
    if (!alerts.length) lines.push("هشدار فعالی در قواعد ثبت‌شده یافت نشد.");
    return lines.join("\n");
  };
  async function copySummary() {
    try {
      await navigator.clipboard.writeText(alertText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <div className="checker-grid">
      <div className="checker-inputs">
        <section className="panel">
          <div className="panel-heading">
            <h2>
              داروهای نسخه <span className="count">{number(meds.length)}</span>
            </h2>
            {ids.length > 0 && (
              <Button variant="ghost" onClick={() => setClear(true)}>
                پاک کردن
              </Button>
            )}
          </div>
          <p className="help">داروهای بیمار را از فهرست مرجع انتخاب کنید.</p>
          <div ref={searchRef}>
            <SearchField
              value={query}
              onChange={setQuery}
              label="جست‌وجوی دارو برای نسخه"
              placeholder="نام دارو را جست‌وجو کنید…"
              onKeyDown={(e) => {
                if (e.key === "Escape") setQuery("");
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  searchRef.current
                    ?.querySelector<HTMLButtonElement>(".picker-results button")
                    ?.focus();
                }
              }}
            />
            {query && (
              <div className="picker-results" aria-label="نتایج جست‌وجوی دارو">
                {matches.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setIds([...ids, d.id]);
                      setQuery("");
                      searchRef.current?.querySelector("input")?.focus();
                    }}
                  >
                    <span>
                      {drugName(d)}
                      <small dir="ltr">{d.genericName}</small>
                    </span>
                    <Plus size={19} />
                  </button>
                ))}
                {matches.length === 0 && (
                  <p className="help">
                    دارویی پیدا نشد. داروهای خارج از فهرست باید ابتدا توسط مدیر
                    ثبت شوند.
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="selected-meds">
            {meds.map((d, i) => (
              <div className="selected-med" key={d.id}>
                <span className="med-index">{number(i + 1)}</span>
                <button className="selected-name" onClick={() => onOpen(d)}>
                  {drugName(d)}
                  <small dir="ltr">{d.genericName}</small>
                </button>
                <IconButton
                  label={"حذف " + drugName(d) + " از نسخه"}
                  onClick={() => setIds(ids.filter((id) => id !== d.id))}
                >
                  <Trash2 size={17} />
                </IconButton>
              </div>
            ))}
            {!meds.length && (
              <div className="regimen-empty">
                <Pill size={23} />
                <p>اولین دارو را اضافه کنید.</p>
              </div>
            )}
          </div>
          {clear && (
            <Notice tone="warning">
              همه داروهای این نسخه پاک شوند؟
              <div className="actions">
                <Button
                  variant="danger"
                  onClick={() => {
                    setIds([]);
                    setClear(false);
                  }}
                >
                  پاک کردن نسخه
                </Button>
                <Button variant="ghost" onClick={() => setClear(false)}>
                  انصراف
                </Button>
              </div>
            </Notice>
          )}
          {missing > 0 && (
            <Notice tone="warning">
              {number(missing)} داروی ذخیره‌شده دیگر در فهرست وجود ندارد.
              <Button
                variant="ghost"
                onClick={() => setIds(meds.map((d) => d.id))}
              >
                حذف موارد ناموجود
              </Button>
            </Notice>
          )}
        </section>
        <section className="panel">
          <h2>شرایط بالینی بیمار</h2>
          <p className="help">بیماری‌ها و عوامل خطر مرتبط را انتخاب کنید.</p>
          <div className="condition-list">
            {conditions.map((c) => (
              <label className={selected.includes(c) ? "checked" : ""} key={c}>
                <Checkbox
                  checked={selected.includes(c)}
                  onChange={() =>
                    setSelected(
                      selected.includes(c)
                        ? selected.filter((x) => x !== c)
                        : [...selected, c],
                    )
                  }
                />
                <span>{fa(c)}</span>
              </label>
            ))}
          </div>
          <div className="renal-heading">
            <h3>سن، جنسیت و عملکرد کلیه</h3>
            <span className="muted">اختیاری</span>
          </div>
          <div className="form-grid">
            <label className="field">
              سن (سال)
              <div className="unit-input">
                <input
                  aria-label="سن بیمار"
                  type="number"
                  min="0"
                  max="130"
                  step="1"
                  dir="ltr"
                  placeholder="72"
                  value={num("age")}
                  onChange={(e) => onNum("age")(e.target.value)}
                />
                <span dir="ltr">yr</span>
              </div>
            </label>
            <div className="field">
              جنسیت
              <div
                className="theme-toggle"
                role="group"
                aria-label="جنسیت بیمار"
                style={{ marginTop: 8 }}
              >
                <button
                  type="button"
                  aria-pressed={profile.sex !== "female"}
                  onClick={() => update({ sex: "male" })}
                >
                  <span className="sr-only">مرد</span>
                  <span aria-hidden style={{ fontSize: 13, padding: "0 6px" }}>
                    مرد
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={profile.sex === "female"}
                  onClick={() => update({ sex: "female" })}
                >
                  <span className="sr-only">زن</span>
                  <span aria-hidden style={{ fontSize: 13, padding: "0 6px" }}>
                    زن
                  </span>
                </button>
              </div>
            </div>
            <label className="field">
              قد (سانتی‌متر)
              <div className="unit-input">
                <input
                  aria-label="قد بیمار"
                  type="number"
                  min="0"
                  max="250"
                  step="any"
                  dir="ltr"
                  placeholder="170"
                  value={num("height")}
                  onChange={(e) => onNum("height")(e.target.value)}
                />
                <span dir="ltr">cm</span>
              </div>
            </label>

            <label className="field">
              وزن (کیلوگرم)
              <div className="unit-input">
                <input
                  aria-label="وزن بیمار"
                  type="number"
                  min="0"
                  step="any"
                  dir="ltr"
                  placeholder="70"
                  value={num("weight")}
                  onChange={(e) => onNum("weight")(e.target.value)}
                />
                <span dir="ltr">kg</span>
              </div>
            </label>
            <label className="field">
              کراتینین سرم
              <div className="unit-input">
                <input
                  aria-label="کراتینین سرم"
                  type="number"
                  min="0"
                  step="any"
                  dir="ltr"
                  placeholder="1.2"
                  value={num("serumCreatinine")}
                  onChange={(e) => onNum("serumCreatinine")(e.target.value)}
                />
                <span dir="ltr">mg/dL</span>
              </div>
            </label>
            <label className="field">
              کلیرانس کراتینین · CrCl
              <div className="unit-input">
                <input
                  aria-label="کلیرانس کراتینین"
                  type="number"
                  min="0"
                  step="any"
                  dir="ltr"
                  placeholder="45"
                  value={num("CrCl")}
                  onChange={(e) => onNum("CrCl")(e.target.value)}
                />
                <span dir="ltr">mL/min</span>
              </div>
            </label>
            <label className="field">
              نرخ فیلتراسیون · eGFR
              <div className="unit-input">
                <input
                  aria-label="نرخ فیلتراسیون کلیه"
                  type="number"
                  min="0"
                  step="any"
                  dir="ltr"
                  placeholder="60"
                  value={num("eGFR")}
                  onChange={(e) => onNum("eGFR")(e.target.value)}
                />
                <span dir="ltr">mL/min/1.73m²</span>
              </div>
            </label>
          </div>
          {cg !== undefined && (
            <Notice tone="info">
              CrCl برآوردی کوکرافت–گالت: <bdi dir="ltr">{cg.toFixed(1)}</bdi>{" "}
              mL/min
              {profile.CrCl !== undefined
                ? " (مقدار دستی شما اولویت دارد)"
                : " — محاسبه‌شده از سن، وزن، جنسیت و کراتینین"}
            </Notice>
          )}
          {/* Module 2.2: Dedicated Compact Clinical Calculator Summary Box */}
          {(renalCalculations.bmi !== undefined ||
            renalCalculations.ibw !== undefined ||
            renalCalculations.crcl !== undefined) && (
            <div className="mt-4 p-4 rounded-3xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs sm:text-sm">
              <div className="flex items-center justify-between font-bold text-indigo-950 dark:text-indigo-200 mb-2">
                <span>محاسبات فارماکوکینتیک بالینی</span>
                {renalCalculations.crcl !== undefined && (
                  <span className="font-mono text-base px-2.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-xs">
                    CrCl: {renalCalculations.crcl} mL/min
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {renalCalculations.bmi !== undefined && (
                  <span className={`px-2.5 py-1 rounded-full font-medium ${renalCalculations.bmiCategoryColor}`}>
                    BMI: {renalCalculations.bmi} ({renalCalculations.bmiCategory})
                  </span>
                )}
                {renalCalculations.ibw !== undefined && (
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    وزن ایده‌آل (IBW): {renalCalculations.ibw} kg
                  </span>
                )}
                {renalCalculations.adjBw !== undefined && (
                  <span className="px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300">
                    وزن تعدیل‌شده (AdjBW): {renalCalculations.adjBw} kg
                  </span>
                )}
                {renalCalculations.weightUsedLabel && (
                  <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                    مبنای محاسبه CrCl: {renalCalculations.weightUsedLabel}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowFormulaDetails(!showFormulaDetails)}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                {showFormulaDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                مشاهده فرمول و جزئیات گام‌به‌گام محاسبه
              </button>

              {showFormulaDetails && (
                <div className="mt-3 p-3 rounded-2xl bg-white dark:bg-[#101722] border border-indigo-100 dark:border-indigo-900/60 space-y-2 text-xs">
                  {renalCalculations.steps.map((st, idx) => (
                    <div key={idx} className="pb-2 border-b last:border-0 border-slate-100 dark:border-slate-800">
                      <strong className="block text-slate-800 dark:text-slate-200">{st.title}:</strong>
                      <code className="text-[11px] text-indigo-600 dark:text-indigo-400 block font-mono" dir="ltr">
                        {st.formula}
                      </code>
                      <span className="text-slate-600 dark:text-slate-400 block mt-0.5">{st.calculation}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {((profile.CrCl ?? -1) < 0 ||
            (profile.eGFR ?? -1) < 0 ||
            (profile.age ?? -1) < 0 ||
            (profile.weight ?? -1) < 0 ||
            (profile.serumCreatinine ?? -1) < 0) && (
            <Notice tone="error">
              مقادیر سن، وزن، کراتینین و عملکرد کلیه نمی‌توانند منفی باشند.
            </Notice>
          )}
          <p className="help">
            اگر سن، وزن، جنسیت و کراتینین را وارد کنید، CrCl به‌طور خودکار محاسبه
            می‌شود. CrCl و eGFR جایگزین یکدیگر نیستند. اطلاعات بیمار فقط روی همین
            دستگاه ذخیره می‌شود.
          </p>
        </section>
      </div>
      <section className="audit">
        <div className="panel-heading">
          <h2>
            <ShieldCheck size={23} />
            گزارش ایمنی نسخه
          </h2>
          <span className="live-tag">
            <span className="status-dot" />
            بررسی زنده
          </span>
        </div>
        <div className="print-header">
          <h1>خلاصه پرونده دارویی سالمند</h1>
          <p>
            گریافارم · معیارهای بیرز ۲۰۲۳ · تهیه‌شده در{" "}
            {new Intl.DateTimeFormat("fa-IR", { dateStyle: "long" }).format(
              new Date(),
            )}
          </p>
        </div>
        {meds.length > 0 && (
          <div className="stats-grid">
            <div className="stat-tile">
              <b>{number(stats.totalDrugs)}</b>
              <span>کل داروها</span>
            </div>
            <div
              className={
                "stat-tile " + (stats.pimCount > 0 ? "tone-danger" : "")
              }
            >
              <b>{number(stats.pimCount)}</b>
              <span>داروی نامناسب (PIM)</span>
            </div>
            <div
              className={"stat-tile " + (stats.acbScore >= 3 ? "tone-warn" : "")}
            >
              <b>{number(stats.acbScore)}</b>
              <span>بار آنتی‌کولینرژیک</span>
            </div>
            <div
              className={"stat-tile " + (stats.cnsCount >= 3 ? "tone-info" : "")}
            >
              <b>{number(stats.cnsCount)}</b>
              <span>داروی فعال بر CNS</span>
            </div>
          </div>
        )}
        {/* MODULE 1: Local Edge AI CDSS Decision Support Panel */}
        {meds.length > 0 && (
          <div className="edge-ai-cdss-panel mb-6 p-6 rounded-[36px] bg-white dark:bg-[#101722] border border-indigo-100 dark:border-indigo-900/50 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-[#4541fe] flex items-center justify-center">
                  <BrainCircuit size={22} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    تحلیل هوشمند بالینی (Edge AI CDSS)
                  </h3>
                  <p className="text-xs text-slate-500">
                    موتور هوش مصنوعی تعبیه‌شده آفلاین بر اساس معیارهای بیرز ۲۰۲۳
                  </p>
                </div>
              </div>
              <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800">
                پردازش لبه‌ای ۱۰۰٪ آفلاین
              </span>
            </div>

            {/* 1.1 ADR Multi-Factor Risk Stratification Gauge */}
            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 flex flex-col md:flex-row gap-5 items-center">
              <div className="flex flex-col items-center justify-center min-w-[130px] p-3 rounded-2xl bg-white dark:bg-[#101722] shadow-xs border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-500 mb-1">امتیاز ریسک ADR</span>
                <span
                  className={`text-3xl font-extrabold font-mono ${
                    adrRisk.tier === "بحرانی"
                      ? "text-purple-600 dark:text-purple-400"
                      : adrRisk.tier === "پرخطر"
                        ? "text-rose-600 dark:text-rose-400"
                        : adrRisk.tier === "متوسط"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {adrRisk.score}/۱۰۰
                </span>
                <span
                  className={`mt-1 text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    adrRisk.tier === "بحرانی"
                      ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                      : adrRisk.tier === "پرخطر"
                        ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                        : adrRisk.tier === "متوسط"
                          ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                          : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  سطح: {adrRisk.tier}
                </span>
              </div>
              <div className="flex-1 space-y-1.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong className="text-slate-900 dark:text-white block font-bold">
                  عوامل کلیدی تشدیدکننده ریسک ناخواسته دارویی:
                </strong>
                <ul className="list-disc list-inside space-y-1">
                  {adrRisk.drivers.map((d: string, idx: number) => (
                    <li key={idx}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>
            {/* 1.2 Deprescribing & Tapering Protocols */}
            {deprescribingProtocols.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <CalendarCheck size={18} className="text-[#4541fe]" />
                  <span>پروتکل‌های هوشمند کاهش تدریجی و قطع دارو (Deprescribing Roadmap)</span>
                </div>
                <div className="grid gap-3">
                  {deprescribingProtocols.map((proto) => (
                    <div
                      key={proto.targetDrugId}
                      className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 text-xs space-y-3"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <strong className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
                          هدف قطع: {proto.targetDrugFa} ({proto.targetDrugGeneric})
                        </strong>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 font-mono">
                          {proto.tableSource}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {proto.clinicalRationale}
                      </p>

                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-200/60 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300">
                              <th className="p-2 rounded-r-xl">زمان‌بندی</th>
                              <th className="p-2">دوز هدف</th>
                              <th className="p-2 rounded-l-xl">اقدام بالینی</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {proto.taperSchedule.map((step, sIdx) => (
                              <tr key={sIdx} className="hover:bg-white dark:hover:bg-slate-800/40">
                                <td className="p-2 font-bold text-[#4541fe]">{step.week}</td>
                                <td className="p-2 font-medium">{step.targetDose}</td>
                                <td className="p-2 text-slate-600 dark:text-slate-400">{step.clinicalAction}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="p-2.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 text-amber-900 dark:text-amber-200">
                        <strong>پارامترهای پایش بالینی:</strong> {proto.monitoringParameters.join(" · ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 1.3 Local Vector/Similarity Drug Substitutions */}
            {drugSubstitutions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <ArrowRightLeft size={18} className="text-[#fe0f83]" />
                  <span>پیشنهادهای جایگزینی ایمن‌تر (Drug Substitutions)</span>
                </div>
                <div className="grid gap-3">
                  {drugSubstitutions.map((sub) => (
                    <div
                      key={sub.flaggedDrugId}
                      className="p-4 rounded-3xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 text-xs space-y-2"
                    >
                      <div className="font-bold text-slate-900 dark:text-white">
                        داروی پرخطر شناسایی‌شده: <span className="text-rose-600 font-mono">{sub.flaggedDrugFa} ({sub.flaggedDrugName})</span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2 mt-2">
                        {sub.recommendedAlternatives.map((alt, aIdx) => (
                          <div
                            key={aIdx}
                            className="p-3 rounded-2xl bg-white dark:bg-[#101722] border border-slate-200 dark:border-slate-800 space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                ✓ {alt.genericNameFa}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
                                {alt.category}
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                              {alt.evidenceRationale}
                            </p>
                            {alt.clinicalDosingNotes && (
                              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium pt-1 border-t border-slate-100 dark:border-slate-800">
                                نکته دوز: {alt.clinicalDosingNotes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        <div className="audit-stats">
          <button
            className={filter === "avoid" ? "selected" : ""}
            onClick={() => setFilter(filter === "avoid" ? "All" : "avoid")}
          >
            <b>{number(alerts.filter((a) => a.severity === "avoid").length)}</b>
            <span>پرهیز / بازبینی</span>
          </button>
          <button
            className={filter === "caution" ? "selected" : ""}
            onClick={() => setFilter(filter === "caution" ? "All" : "caution")}
          >
            <b>
              {number(alerts.filter((a) => a.severity === "caution").length)}
            </b>
            <span>نیازمند احتیاط</span>
          </button>
          <button
            className={filter === "info" ? "selected" : ""}
            onClick={() => setFilter(filter === "info" ? "All" : "info")}
          >
            <b>{number(alerts.filter((a) => a.severity === "info").length)}</b>
            <span>بررسی ناکامل</span>
          </button>
        </div>
        {meds.length > 0 && (
          <div className="actions print-hide">
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={17} />
              چاپ خلاصه
            </Button>
            <Button variant="secondary" onClick={() => void copySummary()}>
              {copied ? <Check size={17} /> : <Copy size={17} />}
              {copied ? "کپی شد" : "کپی خلاصه مشاوره"}
            </Button>
          </div>
        )}
        <p className="help">
          ارزیابی {number(meds.length)} داروی ثبت‌شده بر اساس قواعد موجود؛ این
          فهرست، پایگاه جامع تداخل‌ها نیست.
        </p>
        {filter !== "All" && (
          <Button variant="ghost" onClick={() => setFilter("All")}>
            نمایش همه هشدارها
          </Button>
        )}
        {!meds.length ? (
          <EmptyState
            icon={<ShieldCheck size={34} />}
            heading="بررسی را با یک دارو شروع کنید"
          >
            با افزودن داروها و شرایط بیمار، نتیجه همین‌جا نمایش داده می‌شود.
          </EmptyState>
        ) : alerts.length === 0 ? (
          <Notice tone="success">
            هشداری در قواعد ثبت‌شده فعال نشد. این نتیجه تأیید ایمنی نسخه نیست؛
            داروهای ثبت‌نشده، دوز، مدت مصرف و اندیکاسیون را بررسی کنید.
          </Notice>
        ) : (
          <div className="space-y-4">
            {BEERS_GROUPS.map((meta) => {
              const groupAlertsList = (beersAlertGroups[meta.id] || []).filter(
                (a) => filter === "All" || a.severity === filter,
              );
              if (groupAlertsList.length === 0) return null;
              const isOpen = openBeersGroups[meta.id] ?? true;
              return (
                <div
                  key={meta.id}
                  data-testid={meta.testId}
                  className="audit-group rounded-3xl bg-white dark:bg-[#101722] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => toggleBeersGroup(meta.id)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100/70 dark:hover:bg-slate-900/70 transition-colors text-right cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold ${meta.accent}`}
                      >
                        {meta.subtitle.split(" · ")[0]}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {meta.title}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {meta.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="count bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs px-2 py-0.5 rounded-full font-bold">
                        {number(groupAlertsList.length)}
                      </span>
                      {isOpen ? (
                        <ChevronUp size={18} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={18} className="text-slate-400" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="p-4 space-y-3">
                      {groupAlertsList.map((a) => (
                        <article
                          className={"audit-alert " + a.severity}
                          key={a.id}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              {a.severity === "info" ? (
                                <Info size={19} />
                              ) : (
                                <AlertTriangle size={19} />
                              )}
                              <h4>{a.title}</h4>
                            </div>
                            <span
                              className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${a.priorityBadge.bgClass} ${a.priorityBadge.textClass} ${a.priorityBadge.borderClass}`}
                            >
                              {a.priorityBadge.labelFa}
                            </span>
                          </div>
                          <p>{a.detail}</p>
                          {a.action && (
                            <p className="audit-action">{a.action}</p>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {meds.length > 0 && alerts.some((a) => a.severity === "avoid") && (
          <div className="deprescribe">
            <h3>
              <ListChecks size={20} />
              راهنمای اقدام و کاهش تدریجی (Deprescribing)
            </h3>
            <ol>
              {alerts
                .filter((a) => a.severity === "avoid")
                .slice(0, 6)
                .map((a) => (
                  <li key={"dep" + a.id}>
                    <strong>{a.title}:</strong>{" "}
                    {a.action ?? a.detail}
                  </li>
                ))}
              <li>
                قطع داروهای پرخطر به‌صورت یک‌به‌یک و تدریجی انجام شود؛ پس از هر
                تغییر، پاسخ بیمار و نیاز مجدد به درمان بازبینی شود.
              </li>
            </ol>
          </div>
        )}
        {meds.length > 0 &&
          alerts.length > 0 &&
          !alerts.some((a) => filter === "All" || a.severity === filter) && (
            <EmptyState heading="هشداری در این سطح وجود ندارد" />
          )}
      </section>
    </div>
  );
}