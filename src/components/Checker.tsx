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
} from "lucide-react";
import type { DrugRecord } from "../types/types";
import { auditRegimen, conditions } from "../services/checker";
import { fa, number, drugName, matchesSearch } from "../lib/fa";
import {
  Button,
  IconButton,
  SearchField,
  Notice,
  EmptyState,
} from "./ui/Primitives";
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
    [crcl, setCrcl] = useState(""),
    [egfr, setEgfr] = useState(""),
    [clear, setClear] = useState(false),
    [filter, setFilter] = useState("All");
  const meds = ids
      .map((id) => drugs.find((d) => d.id === id))
      .filter((d): d is DrugRecord => !!d),
    missing = ids.length - meds.length;
  const alerts = auditRegimen(meds, selected, {
    CrCl: crcl === "" ? undefined : Number(crcl),
    eGFR: egfr === "" ? undefined : Number(egfr),
  });
  const groups = [...new Set(alerts.map((a) => a.type))];
  const matches = drugs.filter(
    (d) => !ids.includes(d.id) && matchesSearch(d, query),
  );
  const searchRef = useRef<HTMLDivElement>(null);
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
            <h3>عملکرد کلیه</h3>
            <span className="muted">اختیاری</span>
          </div>
          <div className="form-grid">
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
                  value={crcl}
                  onChange={(e) => setCrcl(e.target.value)}
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
                  value={egfr}
                  onChange={(e) => setEgfr(e.target.value)}
                />
                <span dir="ltr">mL/min/1.73m²</span>
              </div>
            </label>
          </div>
          {((crcl !== "" && Number(crcl) < 0) ||
            (egfr !== "" && Number(egfr) < 0)) && (
            <Notice tone="error">عملکرد کلیه نمی‌تواند منفی باشد.</Notice>
          )}
          <p className="help">
            CrCl و eGFR جایگزین یکدیگر نیستند. شرایط بیمار و مقادیر کلیوی فقط در
            همین مرور نگه داشته می‌شوند.
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
        {meds.length > 0 &&
          alerts.length > 0 &&
          !alerts.some((a) => filter === "All" || a.severity === filter) && (
            <EmptyState heading="هشداری در این سطح وجود ندارد" />
          )}
      </section>
    </div>
  );
}
