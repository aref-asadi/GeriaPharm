import { useState } from "react";
import {
  Activity,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  Info,
} from "lucide-react";
import type { DrugRecord } from "../types/types";
import { auditRegimen, conditions } from "../services/checker";
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
    [egfr, setEgfr] = useState("");
  const meds = ids
      .map((id) => drugs.find((d) => d.id === id))
      .filter((d): d is DrugRecord => !!d),
    missing = ids.length - meds.length;
  const alerts = auditRegimen(meds, selected, {
    CrCl: crcl === "" ? undefined : Number(crcl),
    eGFR: egfr === "" ? undefined : Number(egfr),
  });
  const groups = [...new Set(alerts.map((a) => a.type))];
  return (
    <div className="checker-grid">
      <div>
        <section className="panel">
          <div className="panel-heading">
            <h2>
              Patient regimen <span className="count">{meds.length}</span>
            </h2>
            {ids.length > 0 && (
              <button className="text-button" onClick={() => setIds([])}>
                Clear list
              </button>
            )}
          </div>
          <p className="help">Select medications from your local registry.</p>
          <div className="search-hero compact">
            <Search size={18} />
            <input
              aria-label="Find medication for regimen"
              placeholder="Find a medication…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {query && (
            <div className="picker-results">
              {drugs
                .filter(
                  (d) =>
                    !ids.includes(d.id) &&
                    [d.genericName, ...d.brandNamesIran]
                      .join(" ")
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                )
                .map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setIds([...ids, d.id]);
                      setQuery("");
                    }}
                  >
                    {d.genericName}
                    <Plus size={17} />
                  </button>
                ))}
              {!drugs.some(
                (d) =>
                  !ids.includes(d.id) &&
                  [d.genericName, ...d.brandNamesIran]
                    .join(" ")
                    .toLowerCase()
                    .includes(query.toLowerCase()),
              ) && (
                <p className="help">
                  No matching medication. Add missing medicines through Admin
                  CMS before reviewing.
                </p>
              )}
            </div>
          )}
          <div className="selected-meds">
            {meds.map((d) => (
              <div className="selected-med" key={d.id}>
                <span className="small-pill">
                  <Activity size={17} />
                </span>
                <button onClick={() => onOpen(d)}>{d.genericName}</button>
                <button
                  className="icon-button"
                  aria-label={"Remove " + d.genericName}
                  onClick={() => setIds(ids.filter((id) => id !== d.id))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {!meds.length && (
              <p className="help">
                Your regimen is empty. Search above or add medications from the
                library.
              </p>
            )}
          </div>
          {missing > 0 && (
            <div className="notice">
              {missing} saved medication(s) no longer exist in the registry.{" "}
              <button
                className="text-button"
                onClick={() => setIds(meds.map((d) => d.id))}
              >
                Remove unavailable entries
              </button>
            </div>
          )}
        </section>
        <section className="panel">
          <h2>Clinical context</h2>
          <p className="help">Select relevant conditions for this review.</p>
          <div className="condition-list">
            {conditions.map((c) => (
              <label key={c}>
                <input
                  type="checkbox"
                  checked={selected.includes(c)}
                  onChange={() =>
                    setSelected(
                      selected.includes(c)
                        ? selected.filter((x) => x !== c)
                        : [...selected, c],
                    )
                  }
                />
                <span>{c}</span>
              </label>
            ))}
          </div>
          <h3 className="renal-heading">
            Kidney function <span className="muted">Optional</span>
          </h3>
          <div className="form-grid">
            <label>
              CrCl · mL/min
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 45"
                value={crcl}
                onChange={(e) => setCrcl(e.target.value)}
              />
            </label>
            <label>
              eGFR · mL/min/1.73 m²
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 60"
                value={egfr}
                onChange={(e) => setEgfr(e.target.value)}
              />
            </label>
          </div>
          <p className="help">
            Enter each measure separately. CrCl and eGFR are not
            interchangeable. No patient identifiers or clinical context are
            saved.
          </p>
        </section>
      </div>
      <section className="audit">
        <div className="panel-heading">
          <h2>
            <ShieldCheck size={22} /> Clinical safety audit
          </h2>
          <span className="live-tag">LIVE REVIEW</span>
        </div>
        <div className="audit-stats">
          <div>
            <b>{alerts.filter((a) => a.severity === "avoid").length}</b>
            <span>Avoid / review</span>
          </div>
          <div>
            <b>{alerts.filter((a) => a.severity === "caution").length}</b>
            <span>Caution</span>
          </div>
          <div>
            <b>{alerts.filter((a) => a.type === "Review needed").length}</b>
            <span>Incomplete checks</span>
          </div>
        </div>
        <p className="help">
          Screening of {meds.length} registered medication(s). Results reflect
          the supplied registry, not a complete interaction database.
        </p>
        {!meds.length ? (
          <div className="empty">
            <ShieldCheck size={32} />
            <h3>Build a regimen to begin</h3>
            <p>
              Alerts appear here as you add medications and patient context.
            </p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="clinical-box alternatives">
            <h3>No recorded alerts triggered</h3>
            <p>
              This is not a confirmation of safety. Review missing medicines,
              indications, doses and unrecorded interactions.
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div className="audit-group" key={group}>
              <h3>
                {group}{" "}
                <span className="count">
                  {alerts.filter((a) => a.type === group).length}
                </span>
              </h3>
              {alerts
                .filter((a) => a.type === group)
                .map((a) => (
                  <article className={"audit-alert " + a.severity} key={a.id}>
                    <div>
                      {a.severity === "info" ? (
                        <Info size={18} />
                      ) : (
                        <AlertTriangle size={18} />
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
      </section>
    </div>
  );
}
