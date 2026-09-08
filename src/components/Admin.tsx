import { useRef, useState } from "react";
import {
  Copy,
  Download,
  Edit3,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { drugSchema, categories, type DrugRecord } from "../types/types";
import {
  deleteMedication,
  exportDatabaseToJson,
  parseImport,
  replaceRegistry,
  resetToFactorySeed,
  saveMedication,
} from "../services/db";
import { Modal } from "./Modal";
import { conditions, parseThreshold } from "../services/checker";
const blank = (): DrugRecord => ({
  id: crypto.randomUUID(),
  genericName: "",
  brandNamesIran: [],
  therapeuticCategory: "Central Nervous System",
  beersCategories: [],
  recommendation: "",
  rationale: "",
  qualityOfEvidence: "Moderate",
  strengthOfRecommendation: "Strong",
  isStrongAnticholinergic: false,
  isCnsActive: false,
  saferAlternatives: [],
  drugClasses: [],
  drugDrugInteractions: [],
  drugDiseaseInteractions: [],
  lastUpdated: new Date().toISOString().slice(0, 10),
  notes: "",
});
const tableNames = [
  "Table 2 · General avoid",
  "Table 3 · Disease interactions",
  "Table 4 · Use with caution",
  "Table 5 · Drug interactions",
  "Table 6 · Renal adjustment",
];
export function Admin({
  drugs,
  onChange,
  notify,
}: {
  drugs: DrugRecord[];
  onChange: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [query, setQuery] = useState(""),
    [editing, setEditing] = useState<DrugRecord | null>(null),
    [confirmation, setConfirmation] = useState<{
      title: string;
      body: string;
      action: () => Promise<void>;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  async function run(action: () => Promise<void>, message: string) {
    setBusy(true);
    setError("");
    try {
      await action();
      await onChange();
      setConfirmation(null);
      notify(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The operation failed.");
    } finally {
      setBusy(false);
    }
  }
  async function exportJson() {
    try {
      const blob = new Blob([await exportDatabaseToJson()], {
          type: "application/json",
        }),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download =
        "geriapharm-registry-" +
        new Date().toISOString().slice(0, 10) +
        ".json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("Registry exported");
    } catch {
      setError("Export failed. Check device storage.");
    }
  }
  return (
    <>
      <div className="admin-toolbar">
        <div className="search-hero compact">
          <Search size={18} />
          <input
            aria-label="Filter registry"
            placeholder="Filter medications…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button className="button" onClick={() => setEditing(blank())}>
          <Plus size={17} />
          Add medication
        </button>
      </div>
      {error && (
        <div className="notice" role="alert">
          {error}
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Medication / Iranian brands</th>
              <th>Therapeutic category</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {drugs
              .filter((d) =>
                [d.genericName, ...d.brandNamesIran]
                  .join(" ")
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.genericName}</strong>
                    <small>{d.brandNamesIran.join(" · ")}</small>
                  </td>
                  <td>{d.therapeuticCategory}</td>
                  <td>{d.lastUpdated}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="icon-button"
                        aria-label={"Edit " + d.genericName}
                        onClick={() => setEditing(structuredClone(d))}
                      >
                        <Edit3 size={17} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={"Duplicate " + d.genericName}
                        onClick={() =>
                          setEditing({
                            ...structuredClone(d),
                            id: crypto.randomUUID(),
                            genericName: d.genericName + " (copy)",
                          })
                        }
                      >
                        <Copy size={17} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={"Delete " + d.genericName}
                        onClick={() =>
                          setConfirmation({
                            title: "Delete " + d.genericName + "?",
                            body: "This removes the medication from this device’s registry. Export a backup if you need to retain it.",
                            action: () =>
                              run(
                                () => deleteMedication(d.id),
                                "Medication deleted",
                              ),
                          })
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!drugs.some((d) =>
          [d.genericName, ...d.brandNamesIran]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
        ) && <div className="empty">No matching medications</div>}
      </div>
      <section className="panel backup">
        <h2>Backup & restore</h2>
        <p className="help">
          Changes stay on this device. Export JSON to back up or share your
          clinical registry.
        </p>
        <div className="actions">
          <button className="button secondary" onClick={exportJson}>
            <Download size={17} />
            Export JSON
          </button>
          <button
            className="button secondary"
            onClick={() => file.current?.click()}
          >
            <Upload size={17} />
            Import JSON
          </button>
          <button
            className="button secondary"
            onClick={() =>
              setConfirmation({
                title: "Restore the factory dataset?",
                body: "This replaces the entire current registry with the 15 supplied medications. Export a backup first to retain your changes.",
                action: () =>
                  run(resetToFactorySeed, "Factory dataset restored"),
              })
            }
          >
            <RotateCcw size={17} />
            Factory reset
          </button>
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
            try {
              if (f.size > 10 * 1024 * 1024)
                throw new Error("Import must be smaller than 10 MB.");
              const rows = parseImport(await f.text());
              setConfirmation({
                title: "Replace registry with " + rows.length + " medications?",
                body: "The file passed schema validation. Import replaces your entire registry, including deletions. Clinical accuracy has not been validated.",
                action: () =>
                  run(() => replaceRegistry(rows), "Registry imported"),
              });
            } catch (e) {
              setError(e instanceof Error ? e.message : "Invalid JSON backup");
            }
          }}
        />
        <p className="help">
          This local CMS has no account or access control. Anyone using this
          browser profile can edit its registry.
        </p>
      </section>
      {editing && (
        <MedicationForm
          drug={editing}
          drugs={drugs}
          onClose={() => setEditing(null)}
          onSave={async (d) => {
            await saveMedication(d);
            await onChange();
            setEditing(null);
            notify("Medication saved");
          }}
        />
      )}
      {confirmation && (
        <Modal
          title={confirmation.title}
          onClose={() => {
            if (!busy) setConfirmation(null);
          }}
        >
          <div className="detail-body">
            <p>{confirmation.body}</p>
            {error && (
              <p role="alert" className="notice">
                {error}
              </p>
            )}
            <div className="actions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setConfirmation(null)}
              >
                Cancel
              </button>
              <button
                className="button danger"
                disabled={busy}
                onClick={() => void confirmation.action()}
              >
                {busy ? "Saving…" : "Confirm replacement / deletion"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
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
  function add() {
    const value = input.trim();
    if (value && !values.includes(value)) onChange([...values, value]);
    setInput("");
  }
  return (
    <div className="tag-editor">
      <label>
        {label}
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
            placeholder="Type a value, then press Enter"
          />
          <button type="button" className="button secondary" onClick={add}>
            Add
          </button>
        </div>
      </label>
      <div className="tags">
        {values.map((v, i) => (
          <span key={i}>
            {v}
            <button
              type="button"
              aria-label={"Remove " + v}
              onClick={() => onChange(values.filter((_, j) => j !== i))}
            >
              <X size={13} />
            </button>
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
    [busy, setBusy] = useState(false);
  const update = <K extends keyof DrugRecord>(key: K, value: DrugRecord[K]) =>
    setD((old) => ({ ...old, [key]: value }));
  return (
    <Modal
      title={
        drugs.some((m) => m.id === drug.id)
          ? "Edit medication"
          : "Add medication"
      }
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      <form
        className="med-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setBusy(true);
          try {
            const valid = drugSchema.parse({
              ...d,
              lastUpdated: new Date().toISOString().slice(0, 10),
            });
            if (
              valid.renalConsiderations &&
              !parseThreshold(valid.renalConsiderations.threshold)
            )
              throw new Error(
                "Use a supported renal threshold such as CrCl < 30 mL/min, eGFR < 60 mL/min or CrCl 15-50 mL/min.",
              );
            await onSave(valid);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Unable to save medication",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <legend>Basic information</legend>
          <div className="form-grid">
            <label>
              Generic name *
              <input
                required
                value={d.genericName}
                onChange={(e) => update("genericName", e.target.value)}
              />
            </label>
            <label>
              Therapeutic category *
              <input
                required
                list="specialties"
                value={d.therapeuticCategory}
                onChange={(e) => update("therapeuticCategory", e.target.value)}
              />
              <datalist id="specialties">
                {[...new Set(drugs.map((m) => m.therapeuticCategory))].map(
                  (c) => (
                    <option key={c} value={c} />
                  ),
                )}
              </datalist>
            </label>
          </div>
          <TagInput
            label="Iranian brand names"
            values={d.brandNamesIran}
            onChange={(v) => update("brandNamesIran", v)}
          />
          <TagInput
            label="Interaction classes (e.g. SSRIs, Opioids, RAS inhibitors)"
            values={d.drugClasses ?? []}
            onChange={(v) => update("drugClasses", v)}
          />
          <p className="help">
            Explicit class tags allow custom drugs to match interaction targets.
            Unrecognized class names require manual review.
          </p>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>Beers categorization</legend>
          <div className="check-grid">
            {categories.map((c, i) => (
              <label key={c}>
                <input
                  type="checkbox"
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
                {tableNames[i]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>Clinical directives</legend>
          <label>
            Recommendation *
            <textarea
              required
              rows={3}
              value={d.recommendation}
              onChange={(e) => update("recommendation", e.target.value)}
            />
          </label>
          <label>
            Clinical rationale *
            <textarea
              required
              rows={3}
              value={d.rationale}
              onChange={(e) => update("rationale", e.target.value)}
            />
          </label>
          <div className="form-grid">
            <label>
              Quality of evidence
              <select
                value={d.qualityOfEvidence}
                onChange={(e) =>
                  update(
                    "qualityOfEvidence",
                    e.target.value as DrugRecord["qualityOfEvidence"],
                  )
                }
              >
                {["High", "Moderate", "Low"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Strength of recommendation
              <select
                value={d.strengthOfRecommendation}
                onChange={(e) =>
                  update(
                    "strengthOfRecommendation",
                    e.target.value as DrugRecord["strengthOfRecommendation"],
                  )
                }
              >
                <option>Strong</option>
                <option>Weak</option>
              </select>
            </label>
          </div>
          <div className="check-grid">
            <label>
              <input
                type="checkbox"
                checked={d.isStrongAnticholinergic}
                onChange={(e) =>
                  update("isStrongAnticholinergic", e.target.checked)
                }
              />
              Strong anticholinergic
            </label>
            <label>
              <input
                type="checkbox"
                checked={d.isCnsActive}
                onChange={(e) => update("isCnsActive", e.target.checked)}
              />
              CNS-active agent
            </label>
          </div>
          <TagInput
            label="Safer alternatives to consider"
            values={d.saferAlternatives}
            onChange={(v) => update("saferAlternatives", v)}
          />
        </fieldset>
        <fieldset disabled={busy}>
          <legend>Drug–drug interactions</legend>
          <datalist id="drug-targets">
            {drugs.map((m) => (
              <option key={m.id} value={m.genericName} />
            ))}
            {[
              "SSRIs",
              "SNRIs",
              "Benzodiazepines",
              "Opioids",
              "Oral NSAIDs",
              "Gabapentinoids",
              "Loop Diuretics",
              "RAS inhibitors",
              "Anticholinergic agents",
            ].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {d.drugDrugInteractions.map((r, i) => (
            <div className="builder" key={r.id}>
              <div className="builder-heading">
                <h4>Interaction {i + 1}</h4>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={"Remove interaction " + (i + 1)}
                  onClick={() =>
                    update(
                      "drugDrugInteractions",
                      d.drugDrugInteractions.filter((_, j) => i !== j),
                    )
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <div className="form-grid">
                <label>
                  Target drug or class *
                  <input
                    required
                    list="drug-targets"
                    value={r.targetDrugOrClass}
                    onChange={(e) =>
                      update(
                        "drugDrugInteractions",
                        d.drugDrugInteractions.map((x, j) =>
                          i === j
                            ? { ...x, targetDrugOrClass: e.target.value }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Severity
                  <select
                    value={r.severity}
                    onChange={(e) =>
                      update(
                        "drugDrugInteractions",
                        d.drugDrugInteractions.map((x, j) =>
                          i === j
                            ? {
                                ...x,
                                severity: e.target.value as
                                  "Avoid" | "Use with caution",
                              }
                            : x,
                        ),
                      )
                    }
                  >
                    <option>Avoid</option>
                    <option>Use with caution</option>
                  </select>
                </label>
              </div>
              {(["rationale", "clinicalAction"] as const).map((k) => (
                <label key={k}>
                  {k === "rationale" ? "Rationale" : "Clinical action"} *
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
                </label>
              ))}
            </div>
          ))}
          <button
            className="button secondary"
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
            <Plus size={16} />
            Add interaction
          </button>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>Drug–disease interactions</legend>
          <datalist id="disease-options">
            {conditions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {d.drugDiseaseInteractions.map((r, i) => (
            <div className="builder" key={i}>
              <div className="builder-heading">
                <h4>Condition {i + 1}</h4>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={"Remove condition " + (i + 1)}
                  onClick={() =>
                    update(
                      "drugDiseaseInteractions",
                      d.drugDiseaseInteractions.filter((_, j) => i !== j),
                    )
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
              {(["condition", "recommendation", "rationale"] as const).map(
                (k) => (
                  <label key={k}>
                    {k} *
                    <input
                      required
                      list={k === "condition" ? "disease-options" : undefined}
                      value={r[k]}
                      onChange={(e) =>
                        update(
                          "drugDiseaseInteractions",
                          d.drugDiseaseInteractions.map((x, j) =>
                            i === j ? { ...x, [k]: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </label>
                ),
              )}
            </div>
          ))}
          <button
            className="button secondary"
            type="button"
            onClick={() =>
              update("drugDiseaseInteractions", [
                ...d.drugDiseaseInteractions,
                { condition: "", rationale: "", recommendation: "Avoid" },
              ])
            }
          >
            <Plus size={16} />
            Add condition
          </button>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>Renal considerations</legend>
          <label className="inline-check">
            <input
              type="checkbox"
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
            Enable renal rule
          </label>
          {d.renalConsiderations && (
            <>
              <div className="form-grid">
                <label>
                  Threshold *
                  <input
                    required
                    value={d.renalConsiderations.threshold}
                    onChange={(e) =>
                      update("renalConsiderations", {
                        ...d.renalConsiderations!,
                        threshold: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Action
                  <select
                    value={d.renalConsiderations.action}
                    onChange={(e) =>
                      update("renalConsiderations", {
                        ...d.renalConsiderations!,
                        action: e.target.value as "Avoid" | "Dose Reduction",
                      })
                    }
                  >
                    <option>Avoid</option>
                    <option>Dose Reduction</option>
                  </select>
                </label>
              </div>
              {(["guidance", "rationale"] as const).map((k) => (
                <label key={k}>
                  {k === "guidance" ? "Dosing guidance" : "Rationale"} *
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
                </label>
              ))}
            </>
          )}
        </fieldset>
        <label>
          Source / review notes
          <textarea
            rows={3}
            value={d.notes ?? ""}
            onChange={(e) => update("notes", e.target.value)}
          />
        </label>
        {error && (
          <div className="notice" role="alert">
            {error}
          </div>
        )}
        <div className="form-footer">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button" disabled={busy}>
            {busy ? "Saving…" : "Save medication"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
