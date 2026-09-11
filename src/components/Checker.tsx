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
    if (typeof raw.serumCreatinine === "number" && raw.serumCreatinine >= 0)
      p.serumCreatinine = raw.serumCreatinine;
    if (typeof raw.CrCl === "number" && raw.CrCl >= 0) p.CrCl = raw.CrCl;
    if (typeof raw.eGFR === "number" && raw.eGFR >= 0) p.eGFR = raw.eGFR;
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
    [copied, setCopied] = useState(false);
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
          groups
            .filter((g) =>
              alerts.some(
                (a) =>
                  a.type === g && (filter === "All" || a.severity === filter),
              ),
            )
            .map((group) => (
              <div className="audit-group" key={group}>
                <h3>
                  {fa(group)}{" "}
                  <span className="count">
                    {number(
                      alerts.filter(
                        (a) =>
                          a.type === group &&
                          (filter === "All" || a.severity === filter),
                      ).length,
                    )}
                  </span>
                </h3>
                {alerts
                  .filter(
                    (a) =>
                      a.type === group &&
                      (filter === "All" || a.severity === filter),
                  )
                  .map((a) => (
                    <article className={"audit-alert " + a.severity} key={a.id}>
                      <div>
                        {a.severity === "info" ? (
                          <Info size={19} />
                        ) : (
                          <AlertTriangle size={19} />
                        )}
                        <h4>{a.title}</h4>
                      </div>
                      <p>{a.detail}</p>
                      {a.action && <p className="audit-action">{a.action}</p>}
                    </article>
                  ))}
              </div>
            ))
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