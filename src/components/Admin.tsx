import { Choice } from "./ui/Choice";
import { Checkbox } from "./ui/Checkbox";
import { useRef, useState, useEffect, type ReactNode } from "react";
import {
  Copy,
  Download,
  Edit3,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  X,
  History,
  KeyRound,
  LogOut,
} from "lucide-react";
import { drugSchema, categories, type DrugRecord } from "../types/types";
import { parseImport } from "../services/db";
import { seedData } from "../data/seedData";
import {
  saveMedication,
  deleteMedication,
  replaceServerRegistry,
  resetServerRegistry,
  request,
  type Registry,
} from "../services/api";
import { Modal } from "./Modal";
import { conditions, parseThreshold } from "../services/checker";
import {
  fa,
  date,
  drugName,
  number,
  matchesSearch,
  tables,
  canonicalLabel,
} from "../lib/fa";
import {
  Button,
  IconButton,
  SearchField,
  Notice,
  EmptyState,
} from "./ui/Primitives";
const blank = (): DrugRecord => ({
  id: crypto.randomUUID(),
  genericName: "",
  genericNameFa: "",
  brandNamesIran: [],
  therapeuticCategory: "Central Nervous System",
  beersCategories: [],
  recommendation: "",
  rationale: "",
  qualityOfEvidence: "Moderate",
  strengthOfRecommendation: "Strong",
   isStrongAnticholinergic: false,
  isCnsActive: false,
  isAvailableInIran: true,
  saferAlternatives: [],
  drugClasses: [],
  drugDrugInteractions: [],
  drugDiseaseInteractions: [],
  lastUpdated: new Date().toISOString().slice(0, 10),
  notes: "",
});
export function Admin({
  drugs,
  onRegistry,
  notify,
  onLogout,
  onPasswordChanged,
  email,
  onSync,
  online,
}: {
  drugs: DrugRecord[];
  onRegistry: (r: Registry) => void;
  notify: (s: string) => void;
  onLogout: () => void;
  onPasswordChanged: () => void;
  email: string;
  onSync: () => Promise<void>;
  online: boolean;
}) {
  const [query, setQuery] = useState(""),
    [editing, setEditing] = useState<DrugRecord | null>(null),
    [confirm, setConfirm] = useState<{
      title: string;
      description: string;
      action: () => Promise<Registry>;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [account, setAccount] = useState(false),
    [history, setHistory] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const filtered = drugs.filter((d) => matchesSearch(d, query));
  async function perform(action: () => Promise<Registry>) {
    setBusy(true);
    setError("");
    try {
      onRegistry(await action());
      setConfirm(null);
      notify("تغییرات در سرور ذخیره شد.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function exportJson() {
    setError("");
    try {
      const backup = await request("/admin/export");
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `geriapharm-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("فایل پشتیبان دریافت شد.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="admin-session">
        <div>
          <span className="status-dot" />
          ورود به‌عنوان مدیر <bdi>{email}</bdi>
        </div>
        <div className="actions">
          <Button variant="ghost" onClick={() => setHistory(true)}>
            <History size={17} />
            تاریخچه
          </Button>
          <Button variant="ghost" onClick={() => setAccount(true)}>
            <KeyRound size={17} />
            تغییر رمز
          </Button>
          <Button variant="ghost" onClick={onLogout}>
            <LogOut size={17} />
            خروج
          </Button>
        </div>
      </div>
      {!online && (
        <Notice tone="warning">
          ارتباط قطع است. مطالعه ممکن است؛ برای ویرایش، به اینترنت متصل شوید.
        </Notice>
      )}
      {error && (
        <Notice tone="error">
          {error}{" "}
          <Button
            variant="ghost"
            onClick={async () => {
              await onSync();
              setError("");
            }}
          >
            همگام‌سازی مجدد
          </Button>
        </Notice>
      )}
      <div className="admin-toolbar">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="جست‌وجو در فهرست مدیریت…"
        />
        <Button disabled={!online} onClick={() => setEditing(blank())}>
          <Plus size={18} />
          افزودن دارو
        </Button>
      </div>
      <div className="table-wrap">
        <table>
          <caption className="sr-only">فهرست داروهای قابل مدیریت</caption>
          <thead>
            <tr>
              <th>دارو و برندهای ایران</th>
              <th>گروه درمانی</th>
              <th>آخرین ویرایش</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id}>
                <td>
                  <strong>{drugName(d)}</strong>
                  <small dir="ltr">{d.genericName}</small>
                  <small dir="auto">{d.brandNamesIran.join(" · ")}</small>
                </td>
                <td>{fa(d.therapeuticCategory)}</td>
                <td className="nowrap">{date(d.lastUpdated)}</td>
                <td>
                  <div className="table-actions">
                    <IconButton
                      label={"ویرایش " + drugName(d)}
                      disabled={!online}
                      onClick={() => setEditing(structuredClone(d))}
                    >
                      <Edit3 size={18} />
                    </IconButton>
                    <IconButton
                      label={"تکثیر " + drugName(d)}
                      disabled={!online}
                      onClick={() =>
                        setEditing({
                          ...structuredClone(d),
                          id: crypto.randomUUID(),
                          genericName: d.genericName + " (copy)",
                          genericNameFa: drugName(d) + " (رونوشت)",
                        })
                      }
                    >
                      <Copy size={18} />
                    </IconButton>
                    <IconButton
                      label={"حذف " + drugName(d)}
                      disabled={!online}
                      onClick={() => {
                        setError("");
                        setConfirm({
                          title: "حذف " + drugName(d) + "؟",
                          description:
                            "این دارو از فهرست مشترک سرور حذف می‌شود. در صورت نیاز، ابتدا پشتیبان بگیرید.",
                          action: () => deleteMedication(d.id),
                        });
                      }}
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <EmptyState heading="دارویی پیدا نشد">
            نام دیگری جست‌وجو کنید یا داروی جدیدی بیفزایید.
          </EmptyState>
        )}
      </div>
      <section className="panel backup-panel">
        <div>
          <h2>پشتیبان‌گیری و بازیابی</h2>
          <p className="help">
            فهرست بالینی روی سرور ذخیره می‌شود. پیش از جایگزینی داده‌ها، یک
            پشتیبان دریافت کنید.
          </p>
        </div>
        <div className="actions">
          <Button variant="secondary" disabled={!online} onClick={exportJson}>
            <Download size={17} />
            دریافت پشتیبان
          </Button>
          <Button
            variant="secondary"
            disabled={!online}
            onClick={() => file.current?.click()}
          >
            <Upload size={17} />
            درون‌ریزی JSON
          </Button>
          <Button
            variant="ghost"
            disabled={!online}
            onClick={() => {
              setError("");
              setConfirm({
              title: "بازگشت به فهرست اولیه؟",
              description:
                  "همه تغییرات فهرست مشترک با " +
                  number(seedData.length) +
                  " داروی اولیه فارسی جایگزین می‌شود. این کار بدون پشتیبان قابل بازگشت نیست.",
                action: resetServerRegistry,
              });
            }}
          >
            <RotateCcw size={17} />
            بازنشانی فهرست
          </Button>
        </div>
        <input
          ref={file}
          type="file"
          hidden
          accept="application/json,.json"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setError("");
            try {
              if (f.size > 4 * 1024 * 1024)
                throw new Error("حداکثر حجم فایل ۴ مگابایت است.");
              const rows = parseImport(await f.text());
              setConfirm({
                title: "جایگزینی فهرست با " + number(rows.length) + " دارو؟",
                description:
                  "ساختار فایل معتبر است. با تأیید شما، کل فهرست مشترک جایگزین می‌شود. اعتبارسنجی ساختار به معنای تأیید بالینی محتوا نیست.",
                action: () => replaceServerRegistry(rows),
              });
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      </section>
      {editing && (
        <MedicationForm
          drug={editing}
          drugs={drugs}
          onClose={() => setEditing(null)}
          onSave={async (d) => {
            onRegistry(await saveMedication(d));
            setEditing(null);
            notify("دارو ذخیره شد.");
          }}
        />
      )}
      {confirm && (
        <Modal
          title={confirm.title}
          onClose={() => {
            if (!busy) setConfirm(null);
          }}
        >
          <div className="modal-body">
            <p>{confirm.description}</p>
            {error && <Notice tone="error">{error}</Notice>}
            <div className="modal-actions">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setConfirm(null)}
              >
                انصراف
              </Button>
              <Button
                variant="danger"
                busy={busy}
                onClick={() => void perform(confirm.action)}
              >
                تأیید تغییرات
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {account && (
        <PasswordModal
          onClose={() => setAccount(false)}
          onDone={onPasswordChanged}
        />
      )}{" "}
      {history && <AuditHistory onClose={() => setHistory(false)} />}
    </>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      {label}
      {children}
    </label>
  );
}
function TagInput({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  };
  return (
    <div className="tag-editor">
      <Field label={label}>
        <div className="tag-entry">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="بنویسید و افزودن یا Enter را بزنید"
          />
          <Button variant="secondary" type="button" onClick={add}>
            افزودن
          </Button>
        </div>
      </Field>
      <div className="tags">
        {values.map((v, i) => (
          <span key={i}>
            <bdi>{v}</bdi>
            <IconButton
              type="button"
              label={"حذف " + v}
              onClick={() => onChange(values.filter((_, j) => i !== j))}
            >
              <X size={14} />
            </IconButton>
          </span>
        ))}
      </div>
    </div>
  );
}
function MedicationForm({
  drug,
  drugs,
  onClose,
  onSave,
}: {
  drug: DrugRecord;
  drugs: DrugRecord[];
  onClose: () => void;
  onSave: (d: DrugRecord) => Promise<void>;
}) {
  const [d, setD] = useState(drug),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [discard, setDiscard] = useState(false);
  const update = <K extends keyof DrugRecord>(key: K, value: DrugRecord[K]) => {
    setDirty(true);
    setD((old) => ({ ...old, [key]: value }));
  };
  const close = () => {
    if (busy) return;
    if (dirty) setDiscard(true);
    else onClose();
  };
  return (
    <Modal
      title={
        drugs.some((m) => m.id === drug.id)
          ? "ویرایش " + drugName(drug)
          : "افزودن داروی جدید"
      }
      onClose={close}
      wide
    >
      <form
        className="med-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setBusy(true);
          try {
            const parsed = drugSchema.safeParse(d);
            if (!parsed.success)
              throw new Error("فیلدهای الزامی و قالب اطلاعات را بررسی کنید.");
            if (
              d.renalConsiderations &&
              !parseThreshold(d.renalConsiderations.threshold)
            )
              throw new Error(
                "آستانه کلیوی را به شکل CrCl < 30 mL/min یا eGFR < 60 mL/min وارد کنید.",
              );
            await onSave(parsed.data);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <legend>اطلاعات پایه</legend>
          <div className="form-grid">
            <Field label="نام فارسی دارو">
              <input
                value={d.genericNameFa ?? ""}
                onChange={(e) => update("genericNameFa", e.target.value)}
              />
            </Field>
            <Field label="نام ژنریک انگلیسی *">
              <input
                dir="ltr"
                required
                value={d.genericName}
                onChange={(e) => update("genericName", e.target.value)}
              />
            </Field>
          </div>
          <Field label="گروه درمانی *">
            <Choice
              editable
              required
              disabled={busy}
              label="گروه درمانی"
              value={d.therapeuticCategory}
              onChange={(v) => update("therapeuticCategory", canonicalLabel(v))}
              options={[
                ...new Set(drugs.map((m) => m.therapeuticCategory)),
              ].map((c) => ({ value: c, label: fa(c) }))}
              placeholder="گروه را انتخاب کنید یا بنویسید…"
            />
          </Field>
          <TagInput
            label="برندهای موجود در ایران"
            values={d.brandNamesIran}
            onChange={(v) => update("brandNamesIran", v)}
          />
          <TagInput
            label="کلاس‌های تداخل (مانند SSRIs یا Opioids)"
            values={d.drugClasses ?? []}
            onChange={(v) => update("drugClasses", v)}
          />
          <p className="help">
            نام علمی کلاس را انگلیسی وارد کنید؛ کلاس‌های ناشناخته نیاز به بررسی
            دستی دارند.
          </p>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>دسته‌بندی معیارهای بیرز</legend>
          <div className="check-grid">
            {categories.map((c, i) => (
              <label key={c}>
                <Checkbox
                  checked={d.beersCategories.includes(c)}
                  onChange={() =>
                    update(
                      "beersCategories",
                      d.beersCategories.includes(c)
                        ? d.beersCategories.filter((x) => x !== c)
                        : [...d.beersCategories, c],
                    )
                  }
                />
                {"جدول " + number(i + 2) + " · " + tables[i].short}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>راهنمای بالینی</legend>
          <Field label="توصیه بالینی *">
            <textarea
              required
              rows={3}
              value={d.recommendation}
              onChange={(e) => update("recommendation", e.target.value)}
            />
          </Field>
          <Field label="دلیل و شواهد بالینی *">
            <textarea
              required
              rows={3}
              value={d.rationale}
              onChange={(e) => update("rationale", e.target.value)}
            />
          </Field>
          <div className="form-grid">
            <Field label="کیفیت شواهد">
              <Choice
                disabled={busy}
                label="کیفیت شواهد"
                value={d.qualityOfEvidence}
                onChange={(v) =>
                  update(
                    "qualityOfEvidence",
                    v as DrugRecord["qualityOfEvidence"],
                  )
                }
                options={["High", "Moderate", "Low"].map((v) => ({
                  value: v,
                  label: fa(v),
                }))}
              />
            </Field>
            <Field label="قدرت توصیه">
              <Choice
                disabled={busy}
                label="قدرت توصیه"
                value={d.strengthOfRecommendation}
                onChange={(v) =>
                  update(
                    "strengthOfRecommendation",
                    v as DrugRecord["strengthOfRecommendation"],
                  )
                }
                options={["Strong", "Weak"].map((v) => ({
                  value: v,
                  label: fa(v),
                }))}
              />
            </Field>
          </div>
          <div className="check-grid">
            <label>
              <Checkbox
                checked={d.isStrongAnticholinergic}
                onChange={(e) =>
                  update("isStrongAnticholinergic", e.target.checked)
                }
              />
              آنتی‌کولینرژیک قوی
            </label>
            <label>
              <Checkbox
                checked={d.isCnsActive}
                onChange={(e) => update("isCnsActive", e.target.checked)}
              />
              فعال بر سیستم عصبی مرکزی (جدول ۵)
            </label>
            <label>
              <Checkbox
                checked={d.isAvailableInIran !== false}
                onChange={(e) =>
                  update("isAvailableInIran", e.target.checked)
                }
              />
              موجود در فهرست دارویی ایران
            </label>
          </div>
          <TagInput
            label="گزینه‌های جایگزین قابل بررسی"
            values={d.saferAlternatives}
            onChange={(v) => update("saferAlternatives", v)}
          />
        </fieldset>
        <fieldset disabled={busy}>
          <legend>تداخل‌های دارویی</legend>

          {d.drugDrugInteractions.map((r, i) => (
            <div className="builder" key={r.id}>
              <div className="builder-heading">
                <h4>تداخل {number(i + 1)}</h4>
                <IconButton
                  type="button"
                  label={"حذف تداخل " + number(i + 1)}
                  onClick={() =>
                    update(
                      "drugDrugInteractions",
                      d.drugDrugInteractions.filter((_, j) => i !== j),
                    )
                  }
                >
                  <Trash2 size={17} />
                </IconButton>
              </div>
              <div className="form-grid">
                <Field label="نام دارو یا کلاس هدف *">
                  <Choice
                    editable
                    required
                    disabled={busy}
                    label="نام دارو یا کلاس هدف"
                    value={r.targetDrugOrClass}
                    onChange={(v) =>
                      update(
                        "drugDrugInteractions",
                        d.drugDrugInteractions.map((x, j) =>
                          i === j
                            ? { ...x, targetDrugOrClass: canonicalLabel(v) }
                            : x,
                        ),
                      )
                    }
                    options={[
                      ...drugs.map((m) => ({
                        value: m.genericName,
                        label: drugName(m),
                        description: m.genericName,
                      })),
                      ...[
                        "SSRIs",
                        "SNRIs",
                        "Benzodiazepines",
                        "Opioids",
                        "Oral NSAIDs",
                        "Gabapentinoids",
                        "Loop Diuretics",
                        "RAS inhibitors",
                        "Anticholinergic agents",
                      ].map((c) => ({
                        value: c,
                        label: fa(c),
                        description: c,
                      })),
                    ]}
                    placeholder="دارو یا کلاس دارویی را جست‌وجو کنید…"
                  />
                </Field>
                <Field label="شدت تداخل">
                  <Choice
                    disabled={busy}
                    label="شدت تداخل"
                    value={r.severity}
                    onChange={(v) =>
                      update(
                        "drugDrugInteractions",
                        d.drugDrugInteractions.map((x, j) =>
                          i === j
                            ? {
                                ...x,
                                severity: v as "Avoid" | "Use with caution",
                              }
                            : x,
                        ),
                      )
                    }
                    options={["Avoid", "Use with caution"].map((v) => ({
                      value: v,
                      label: fa(v),
                    }))}
                  />
                </Field>
              </div>
              {(["rationale", "clinicalAction"] as const).map((k) => (
                <Field
                  key={k}
                  label={k === "rationale" ? "دلیل تداخل *" : "اقدام بالینی *"}
                >
                  <textarea
                    required
                    value={r[k]}
                    onChange={(e) =>
                      update(
                        "drugDrugInteractions",
                        d.drugDrugInteractions.map((x, j) =>
                          i === j ? { ...x, [k]: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </Field>
              ))}
            </div>
          ))}
          <Button
            variant="secondary"
            type="button"
            onClick={() =>
              update("drugDrugInteractions", [
                ...d.drugDrugInteractions,
                {
                  id: crypto.randomUUID(),
                  targetDrugOrClass: "",
                  severity: "Avoid",
                  rationale: "",
                  clinicalAction: "",
                },
              ])
            }
          >
            <Plus size={17} />
            افزودن تداخل
          </Button>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>تداخل با بیماری</legend>

          {d.drugDiseaseInteractions.map((r, i) => (
            <div className="builder" key={i}>
              <div className="builder-heading">
                <h4>بیماری {number(i + 1)}</h4>
                <IconButton
                  type="button"
                  label={"حذف بیماری " + number(i + 1)}
                  onClick={() =>
                    update(
                      "drugDiseaseInteractions",
                      d.drugDiseaseInteractions.filter((_, j) => i !== j),
                    )
                  }
                >
                  <Trash2 size={17} />
                </IconButton>
              </div>
              {(["condition", "recommendation", "rationale"] as const).map(
                (k) => (
                  <Field
                    key={k}
                    label={
                      k === "condition"
                        ? "بیماری یا سندرم *"
                        : k === "recommendation"
                          ? "توصیه *"
                          : "دلیل بالینی *"
                    }
                  >
                    {k === "condition" ? (
                      <Choice
                        editable
                        required
                        disabled={busy}
                        label="بیماری یا سندرم"
                        value={r.condition}
                        onChange={(v) =>
                          update(
                            "drugDiseaseInteractions",
                            d.drugDiseaseInteractions.map((x, j) =>
                              i === j
                                ? { ...x, condition: canonicalLabel(v) }
                                : x,
                            ),
                          )
                        }
                        options={conditions.map((c) => ({
                          value: c,
                          label: fa(c),
                        }))}
                        placeholder="بیماری را انتخاب کنید یا بنویسید…"
                      />
                    ) : (
                      <input
                        required
                        value={k === "rationale" ? r[k] : fa(r[k])}
                        onChange={(e) =>
                          update(
                            "drugDiseaseInteractions",
                            d.drugDiseaseInteractions.map((x, j) =>
                              i === j ? { ...x, [k]: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    )}
                  </Field>
                ),
              )}
            </div>
          ))}
          <Button
            variant="secondary"
            type="button"
            onClick={() =>
              update("drugDiseaseInteractions", [
                ...d.drugDiseaseInteractions,
                {
                  condition: "",
                  rationale: "",
                  recommendation: "پرهیز از مصرف",
                },
              ])
            }
          >
            <Plus size={17} />
            افزودن بیماری
          </Button>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>تنظیم دوز کلیوی</legend>
          <label className="inline-check">
            <Checkbox
              variant="switch"
              checked={!!d.renalConsiderations}
              onChange={(e) =>
                update(
                  "renalConsiderations",
                  e.target.checked
                    ? {
                        threshold: "CrCl < 30 mL/min",
                        action: "Avoid",
                        guidance: "",
                        rationale: "",
                      }
                    : undefined,
                )
              }
            />
            این دارو قاعده کلیوی دارد
          </label>
          {d.renalConsiderations && (
            <>
              <div className="form-grid">
                <Field label="آستانه عملکرد کلیه *">
                  <input
                    required
                    dir="ltr"
                    value={d.renalConsiderations.threshold}
                    onChange={(e) =>
                      update("renalConsiderations", {
                        ...d.renalConsiderations!,
                        threshold: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="اقدام">
                  <Choice
                    disabled={busy}
                    label="اقدام کلیوی"
                    value={d.renalConsiderations.action}
                    onChange={(v) =>
                      update("renalConsiderations", {
                        ...d.renalConsiderations!,
                        action: v as "Avoid" | "Dose Reduction",
                      })
                    }
                    options={["Avoid", "Dose Reduction"].map((v) => ({
                      value: v,
                      label: fa(v),
                    }))}
                  />
                </Field>
              </div>
              {(["guidance", "rationale"] as const).map((k) => (
                <Field
                  key={k}
                  label={
                    k === "guidance" ? "راهنمای تنظیم دوز *" : "دلیل بالینی *"
                  }
                >
                  <textarea
                    required
                    value={d.renalConsiderations![k]}
                    onChange={(e) =>
                      update("renalConsiderations", {
                        ...d.renalConsiderations!,
                        [k]: e.target.value,
                      })
                    }
                  />
                </Field>
              ))}
            </>
          )}
        </fieldset>
        <Field label="یادداشت و منبع بازبینی">
          <textarea
            rows={3}
            value={d.notes ?? ""}
            onChange={(e) => update("notes", e.target.value)}
          />
        </Field>
        {error && <Notice tone="error">{error}</Notice>}
        {discard && (
          <Notice tone="warning">
            تغییرات ذخیره نشده است. از بستن فرم مطمئن هستید؟
            <div className="actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDiscard(false)}
              >
                ادامه ویرایش
              </Button>
              <Button type="button" variant="danger" onClick={onClose}>
                بستن بدون ذخیره
              </Button>
            </div>
          </Notice>
        )}
        <div className="form-footer">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={close}
          >
            انصراف
          </Button>
          <Button busy={busy} type="submit">
            ذخیره دارو
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function PasswordModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [current, setCurrent] = useState(""),
    [next, setNext] = useState(""),
    [repeat, setRepeat] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal
      title="تغییر رمز عبور مدیر"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        className="modal-body"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          if (next !== repeat) {
            setError("تکرار رمز عبور یکسان نیست.");
            return;
          }
          setBusy(true);
          try {
            await request("/auth/password", {
              method: "POST",
              body: JSON.stringify({
                currentPassword: current,
                newPassword: next,
              }),
            });
            onDone();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="help">
          پس از تغییر رمز، همه نشست‌های قبلی بسته می‌شوند. دوباره با رمز جدید
          وارد شوید.
        </p>
        <Field label="رمز فعلی">
          <input
            type="password"
            dir="ltr"
            required
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
        <Field label="رمز جدید؛ حداقل ۱۲ نویسه">
          <input
            type="password"
            dir="ltr"
            required
            minLength={12}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </Field>
        <Field label="تکرار رمز جدید">
          <input
            type="password"
            dir="ltr"
            required
            minLength={12}
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
          />
        </Field>
        {error && <Notice tone="error">{error}</Notice>}
        <Button busy={busy}>ذخیره رمز جدید</Button>
      </form>
    </Modal>
  );
}
function AuditHistory({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<
      | {
          id: number;
          actor: string;
          action: string;
          target: string;
          created_at: string;
        }[]
      | null
    >(null),
    [error, setError] = useState("");
  useEffect(() => {
    request<typeof rows>("/admin/audit")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <Modal title="تاریخچه فعالیت مدیران" onClose={onClose} wide>
      <div className="modal-body">
        {error ? (
          <Notice tone="error">{error}</Notice>
        ) : !rows ? (
          <p>در حال دریافت تاریخچه…</p>
        ) : (
          <div className="audit-history">
            {rows.map((r) => (
              <div key={r.id}>
                <span className="history-marker" />
                <div>
                  <strong>{fa(r.action)}</strong>
                  <p>
                    <bdi>{r.actor}</bdi>
                    {r.target && (
                      <>
                        {" "}
                        · <bdi>{r.target}</bdi>
                      </>
                    )}
                  </p>
                </div>
                <time>{date(r.created_at)}</time>
              </div>
            ))}
            {!rows.length && <EmptyState heading="فعالیتی ثبت نشده است" />}
          </div>
        )}
      </div>
    </Modal>
  );
}
