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
export function MedicationCard({
  drug,
  saved,
  inRegimen,
  onOpen,
  onBookmark,
  onAdd,
}: {
  drug: DrugRecord;
  saved: boolean;
  inRegimen: boolean;
  onOpen: () => void;
  onBookmark: () => void;
  onAdd: () => void;
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
        <Button variant="ghost" onClick={onAdd} disabled={inRegimen}>
          {inRegimen ? "افزوده شد" : "افزودن به نسخه +"}
        </Button>
      </div>
    </article>
  );
}
