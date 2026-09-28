import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import {
  LoaderCircle,
  Search,
  X,
  Bookmark,
  ShieldAlert,
  Info,
  CheckCircle2,
  Check,
  Plus,
} from "lucide-react";
import { drugName, fa } from "../../lib/fa";
import type { DrugRecord } from "../../types/types";
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger" | "ghost";
    busy?: boolean;
  }
>(
  (
    { variant = "primary", busy, children, className = "", disabled, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      {...props}
      disabled={disabled || busy}
      className={`button ${variant} ${className}`}
      aria-busy={busy}
    >
      {busy && <LoaderCircle className="spin" size={17} />} {children}
    </button>
  ),
);
export function IconButton({
  label,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      className={`icon-button ${props.className ?? ""}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
export function SearchField({
  value,
  onChange,
  placeholder = "جست‌وجوی نام دارو، برند یا بیماری…",
  label = "جست‌وجو",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  value: string;
  onChange: (s: string) => void;
  label?: string;
}) {
  return (
    <div className="search-field">
      <Search size={21} />
      <input
        {...props}
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <IconButton label="پاک کردن جست‌وجو" onClick={() => onChange("")}>
          <X size={18} />
        </IconButton>
      )}
    </div>
  );
}
export function EmptyState({
  icon,
  heading,
  children,
  action,
}: {
  icon?: ReactNode;
  heading: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon ?? <Search size={30} />}</span>
      <h3>{heading}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "warning" | "error" | "success";
}) {
  return (
    <div
      className={"notice " + tone}
      role={tone === "error" ? "alert" : "status"}
    >
      {tone === "error" ? <ShieldAlert size={20} /> : <Info size={20} />}
      <div>{children}</div>
    </div>
  );
}
export const risk = (d: DrugRecord) =>
  d.beersCategories.includes("PIM_GENERAL")
    ? "avoid"
    : d.beersCategories.includes("USE_WITH_CAUTION")
      ? "caution"
      : "renal";
export function RiskBadge({ drug }: { drug: DrugRecord }) {
  const r = risk(drug);
  return (
    <span className={"badge " + r}>
      <span />
      {r === "avoid"
        ? "پرهیز / مصرف مشروط"
        : r === "caution"
          ? "مصرف با احتیاط"
          : "بررسی عملکرد کلیه"}
    </span>
  );
}
/**
 * Prescription add/remove toggle. Adds the drug while it is outside the
 * regimen and removes it again (with a clear destructive hover state) once it
 * has been added, so the same control works from any list.
 */
export function RegimenToggle({
  inRegimen,
  drugNameFa,
  onAdd,
  onRemove,
}: {
  inRegimen: boolean;
  drugNameFa: string;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      className={"regimen-toggle " + (inRegimen ? "added" : "available")}
      aria-pressed={inRegimen}
      aria-label={
        inRegimen
          ? "حذف " + drugNameFa + " از نسخه"
          : "افزودن " + drugNameFa + " به نسخه"
      }
      title={inRegimen ? "حذف از نسخه" : "افزودن به نسخه"}
      onClick={inRegimen ? onRemove : onAdd}
    >
      {inRegimen ? (
        <>
          <span className="regimen-toggle-default">
            <Check size={15} aria-hidden />
            افزوده شد
          </span>
          <span className="regimen-toggle-hover">
            <X size={15} aria-hidden />
            حذف از نسخه
          </span>
        </>
      ) : (
        <>
          افزودن به نسخه
          <Plus size={15} aria-hidden />
        </>
      )}
    </button>
  );
}
export function MedicationCard({
  drug,
  saved,
  inRegimen,
  onOpen,
  onBookmark,
  onAdd,
  onRemove,
}: {
  drug: DrugRecord;
  saved: boolean;
  inRegimen: boolean;
  onOpen: () => void;
  onBookmark: () => void;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="med-card">
      <div className="med-top">
        <RiskBadge drug={drug} />
        <IconButton
          label={(saved ? "حذف نشانک " : "نشانک‌گذاری ") + drugName(drug)}
          aria-pressed={saved}
          onClick={onBookmark}
          className={saved ? "saved" : ""}
        >
          <Bookmark size={20} fill={saved ? "currentColor" : "none"} />
        </IconButton>
      </div>
      <button className="med-title" onClick={onOpen}>
        {drugName(drug)}
      </button>
      <p className="latin-name" dir="ltr">
        {drug.genericName}
      </p>
      <p className="med-brands" dir="auto">
        {drug.brandNamesIran.slice(0, 3).join(" · ")}
      </p>
      {drug.isAvailableInIran !== false && (
        <span className="chip-iran" title="این دارو در فهرست دارویی ایران موجود است">
          <CheckCircle2 size={13} />
          موجود در ایران
        </span>
      )}
      <div className="med-bottom">
        <span>{fa(drug.therapeuticCategory)}</span>
        <RegimenToggle
          inRegimen={inRegimen}
          drugNameFa={drugName(drug)}
          onAdd={onAdd}
          onRemove={onRemove}
        />
      </div>
    </article>
  );
}

export function MedicationListItem({
  drug,
  saved,
  inRegimen,
  onOpen,
  onBookmark,
  onAdd,
  onRemove,
}: {
  drug: DrugRecord;
  saved: boolean;
  inRegimen: boolean;
  onOpen: () => void;
  onBookmark: () => void;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="med-card med-list-row flex flex-col md:flex-row md:items-center justify-between p-4 md:p-5 gap-3 hover:shadow-md transition">
      <div className="flex-1 min-w-0 flex items-start gap-3.5">
        <div className="pt-0.5">
          <RiskBadge drug={drug} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="med-title text-base sm:text-lg font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-right cursor-pointer"
              onClick={onOpen}
            >
              {drugName(drug)}
            </button>
            <span className="text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-400 font-mono" dir="ltr">
              ({drug.genericName})
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-500 dark:text-slate-400">
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {fa(drug.therapeuticCategory)}
            </span>
            {drug.brandNamesIran.length > 0 && (
              <span className="truncate max-w-[280px]" dir="auto" title={drug.brandNamesIran.join(" · ")}>
                برندها: {drug.brandNamesIran.slice(0, 3).join(" · ")}
              </span>
            )}
            {drug.isAvailableInIran !== false && (
              <span className="chip-iran inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 size={12} />
                موجود در ایران
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 dark:border-slate-800">
        <RegimenToggle
          inRegimen={inRegimen}
          drugNameFa={drugName(drug)}
          onAdd={onAdd}
          onRemove={onRemove}
        />
        <IconButton
          label={(saved ? "حذف نشانک " : "نشانک‌گذاری ") + drugName(drug)}
          aria-pressed={saved}
          onClick={onBookmark}
          className={saved ? "saved text-amber-500" : "text-slate-400"}
        >
          <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
        </IconButton>
      </div>
    </article>
  );
}

