import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  ChevronRight,
  Database,
  FlaskConical,
  HeartPulse,
  Home,
  Layers,
  Pill,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  Stethoscope,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { getAllMedications, storageMode } from "./services/db";
import type { DrugRecord } from "./types/types";
import { Modal } from "./components/Modal";
const tables = [
  {
    id: "PIM_GENERAL",
    title: "Potentially inappropriate medications",
    short: "General avoid",
    desc: "Medications to avoid in most older adults",
    icon: ShieldAlert,
    color: "orange",
  },
  {
    id: "DRUG_DISEASE",
    title: "Drug–disease interactions",
    short: "Disease interactions",
    desc: "Risks specific to a disease or syndrome",
    icon: HeartPulse,
    color: "purple",
  },
  {
    id: "USE_WITH_CAUTION",
    title: "Use with caution",
    short: "Use with caution",
    desc: "Medications that need closer monitoring",
    icon: Activity,
    color: "amber",
  },
  {
    id: "DRUG_INTERACTION",
    title: "Drug–drug interactions",
    short: "Drug interactions",
    desc: "Potentially harmful medication combinations",
    icon: Layers,
    color: "blue",
  },
  {
    id: "RENAL_ADJUSTMENT",
    title: "Reduced kidney function",
    short: "Renal alerts",
    desc: "Avoidance and dose adjustment considerations",
    icon: FlaskConical,
    color: "teal",
  },
  {
    id: "ANTICHOLINERGIC",
    title: "Strong anticholinergics",
    short: "Anticholinergics",
    desc: "Medications with anticholinergic properties",
    icon: Stethoscope,
    color: "rose",
  },
];
const therapeutic = [
  "All specialties",
  "Cardiovascular & Antithrombotics",
  "Central Nervous System",
  "Pain Medications",
  "Gastrointestinal",
  "Anti-infective",
  "Endocrine",
];
export const risk = (d: DrugRecord) =>
  d.beersCategories.includes("PIM_GENERAL")
    ? "avoid"
    : d.beersCategories.includes("USE_WITH_CAUTION")
      ? "caution"
      : "renal";
export function Badge({ drug }: { drug: DrugRecord }) {
  return (
    <span className={"badge " + risk(drug)}>
      {risk(drug) === "avoid"
        ? "Avoid / conditional"
        : risk(drug) === "caution"
          ? "Use with caution"
          : "Renal alert"}
    </span>
  );
}
function initialList(key: string) {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value)
      ? [...new Set(value.filter((v): v is string => typeof v === "string"))]
      : [];
  } catch {
    return [];
  }
}
export default function App() {
  const [drugs, setDrugs] = useState<DrugRecord[]>([]),
    [view, setView] = useState("Home"),
    [query, setQuery] = useState(""),
    [table, setTable] = useState("All"),
    [specialty, setSpecialty] = useState("All specialties"),
    [detail, setDetail] = useState<DrugRecord | null>(null),
    [bookmarks, setBookmarks] = useState<string[]>(() =>
      initialList("gp-bookmarks"),
    ),
    [regimen, setRegimen] = useState<string[]>(() => initialList("gp-regimen")),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false),
    [online, setOnline] = useState(navigator.onLine),
    [cached, setCached] = useState(false),
    [toast, setToast] = useState("");
  async function reload() {
    try {
      setDrugs(await getAllMedications());
      setLoaded(true);
    } catch {
      setError(
        "The saved registry could not be read. Your stored data has not been overwritten. Check browser storage and reload.",
      );
    }
  }
  useEffect(() => {
    void reload();
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.ready.then(() => setCached(true));
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  function persist(key: string, rows: string[], setter: (r: string[]) => void) {
    try {
      localStorage.setItem(key, JSON.stringify(rows));
      setter(rows);
    } catch {
      setToast("Could not save on this device. Check browser storage.");
    }
  }
  function bookmark(id: string) {
    persist(
      "gp-bookmarks",
      bookmarks.includes(id)
        ? bookmarks.filter((x) => x !== id)
        : [...bookmarks, id],
      setBookmarks,
    );
  }
  function add(id: string) {
    if (!regimen.includes(id))
      persist("gp-regimen", [...regimen, id], setRegimen);
    setToast("Medication added to regimen");
  }
  function navigate(v: string) {
    setView(v);
    setQuery("");
    setTable("All");
    setSpecialty("All specialties");
  }
  const filtered = drugs.filter(
    (d) =>
      (view !== "Bookmarks" || bookmarks.includes(d.id)) &&
      (table === "All" ||
        (table === "ANTICHOLINERGIC"
          ? d.isStrongAnticholinergic
          : d.beersCategories.includes(table as never))) &&
      (specialty === "All specialties" ||
        specialty === d.therapeuticCategory) &&
      [
        d.genericName,
        ...d.brandNamesIran,
        d.therapeuticCategory,
        ...d.drugDiseaseInteractions.map((r) => r.condition),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  const nav = [
    { name: "Home", icon: Home },
    { name: "Search", icon: Search },
    { name: "Regimen check", icon: ShieldCheck },
    { name: "Bookmarks", icon: Bookmark },
    { name: "Admin CMS", icon: Settings2 },
  ];
  return (
    <div className="app">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("Home");
          }}
        >
          <span className="brand-mark">
            <Pill />
          </span>
          <span>
            GeriaPharm<small>GERIATRIC PHARMACOTHERAPY</small>
          </span>
        </a>
        <div className="sidebar-label">CLINICAL WORKSPACE</div>
        <nav>
          {nav.map((n) => (
            <button
              key={n.name}
              className={view === n.name ? "nav-item active" : "nav-item"}
              onClick={() => navigate(n.name)}
            >
              <n.icon size={20} />
              <span>{n.name}</span>
              {n.name === "Regimen check" && regimen.length > 0 && (
                <span className="nav-count">{regimen.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="edition">
            <BookOpen size={21} />
            <div>
              2023 Beers Criteria®<small>Reference edition</small>
            </div>
          </div>
          <p>
            For healthcare professionals
            <br />
            Caring for adults 65 and older
          </p>
          <span className="device-status">
            <span className="dot" />
            {cached ? "Available offline" : "Local-first workspace"}
          </span>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Clinical workspace <ChevronRight size={14} />
            <strong>{view}</strong>
          </div>
          <div className="top-right">
            <span className="connection">
              {online ? <Wifi size={15} /> : <WifiOff size={15} />}{" "}
              {online ? "Online" : "Offline"}
            </span>
            <span className="divider" />
            <span className="avatar">GP</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">GERIATRIC CLINICAL REFERENCE</div>
              <h1>
                {view === "Home"
                  ? "Better-informed prescribing."
                  : view === "Search"
                    ? "Medication library"
                    : view === "Regimen check"
                      ? "Regimen risk checker"
                      : view === "Bookmarks"
                        ? "Your bookmarked medications"
                        : "Clinical registry"}
              </h1>
              <p>
                {view === "Home"
                  ? "A focused medication reference for safer care in older adults."
                  : view === "Search"
                    ? "Find medication guidance, interactions, and alternatives."
                    : view === "Regimen check"
                      ? "Review medications together with the patient’s clinical context."
                      : view === "Bookmarks"
                        ? "Keep frequently consulted guidance close at hand."
                        : "Manage the medication content saved on this device."}
              </p>
            </div>
            <span className="edition-tag">
              AGS BEERS <b>2023</b>
            </span>
          </div>
          {error && (
            <div role="alert" className="notice">
              {error}
              <button onClick={() => location.reload()}>Reload</button>
            </div>
          )}
          {view === "Home" && (
            <>
              <div className="search-hero">
                <Search size={23} />
                <input
                  aria-label="Search medication library"
                  placeholder="Search a medication, Iranian brand, or condition…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button
                  onClick={() => {
                    setView("Search");
                  }}
                  aria-label="Open search"
                >
                  <ArrowRight size={20} />
                </button>
              </div>
              <div className="hero-hints">
                <span>Search by generic or brand name</span>
                <span>
                  <Database size={13} /> {drugs.length} medications in your
                  registry
                </span>
              </div>
              {!query && (
                <>
                  <div className="section-heading">
                    <h2>Explore the criteria</h2>
                    <span>Six ways to review medication risk</span>
                  </div>
                  <div className="category-grid">
                    {tables.map((t, i) => (
                      <button
                        className="category-card"
                        key={t.id}
                        onClick={() => {
                          setView("Search");
                          setTable(t.id);
                        }}
                      >
                        <div className="card-top">
                          <span className={"category-icon " + t.color}>
                            <t.icon size={23} />
                          </span>
                          <span className="table-label">TABLE {i + 2}</span>
                        </div>
                        <h3>{t.title}</h3>
                        <p>{t.desc}</p>
                        <div className="card-bottom">
                          <span>
                            {
                              drugs.filter((d) =>
                                t.id === "ANTICHOLINERGIC"
                                  ? d.isStrongAnticholinergic
                                  : d.beersCategories.includes(t.id as never),
                              ).length
                            }{" "}
                            medications
                          </span>
                          <ArrowRight size={17} />
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="regimen-banner">
                    <span className="banner-icon">
                      <ShieldCheck size={30} />
                    </span>
                    <div>
                      <h2>See the whole regimen.</h2>
                      <p>
                        Check interactions, cumulative burden, and
                        patient-specific risks.
                      </p>
                    </div>
                    <button
                      className="button light"
                      onClick={() => navigate("Regimen check")}
                    >
                      Check a regimen <ArrowRight size={17} />
                    </button>
                  </div>
                </>
              )}
            </>
          )}
          {(["Search", "Bookmarks"].includes(view) ||
            (view === "Home" && query)) && (
            <>
              <div className="search-hero compact">
                <Search size={21} />
                <input
                  aria-label="Search medications"
                  placeholder="Search generic, brand, category, or disease…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
              <div className="filter-row">
                <SlidersHorizontal size={17} />
                <select
                  aria-label="Filter therapeutic specialty"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                >
                  {[
                    ...new Set([
                      ...therapeutic,
                      ...drugs.map((d) => d.therapeuticCategory),
                    ]),
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <select
                  aria-label="Filter Beers category"
                  value={table}
                  onChange={(e) => setTable(e.target.value)}
                >
                  <option value="All">All Beers categories</option>
                  {tables.map((t) => (
                    <option value={t.id} key={t.id}>
                      {t.short}
                    </option>
                  ))}
                </select>
                <span>{filtered.length} results</span>
              </div>
            </>
          )}
          {(view === "Home" || view === "Search" || view === "Bookmarks") && (
            <>
              <div className="section-heading">
                <h2>
                  {view === "Home" && !query
                    ? "Medication quick reference"
                    : "Medications"}{" "}
                  <span className="count">
                    {view === "Home" && !query ? drugs.length : filtered.length}
                  </span>
                </h2>
                {view === "Home" && !query && (
                  <button
                    className="text-button"
                    onClick={() => navigate("Search")}
                  >
                    View all medications <ArrowRight size={16} />
                  </button>
                )}
              </div>
              {!loaded && !error ? (
                <div className="empty">Loading your medication registry…</div>
              ) : filtered.length === 0 ? (
                <div className="empty">
                  <Search />
                  <h3>
                    {view === "Bookmarks"
                      ? "No bookmarked medications"
                      : "No matching medications"}
                  </h3>
                  <p>
                    {view === "Bookmarks"
                      ? "Use the bookmark icon on a medication to save it here."
                      : "Try a different name or clear your filters."}
                  </p>
                </div>
              ) : (
                <div className="medication-grid">
                  {(view === "Home" && !query
                    ? filtered.slice(0, 4)
                    : filtered
                  ).map((d) => (
                    <article className="med-card" key={d.id}>
                      <div className="med-top">
                        <Badge drug={d} />
                        <button
                          className={
                            "icon-button " +
                            (bookmarks.includes(d.id) ? "saved" : "")
                          }
                          aria-label={
                            (bookmarks.includes(d.id)
                              ? "Remove bookmark for "
                              : "Bookmark ") + d.genericName
                          }
                          onClick={() => bookmark(d.id)}
                        >
                          <Bookmark
                            size={19}
                            fill={
                              bookmarks.includes(d.id) ? "currentColor" : "none"
                            }
                          />
                        </button>
                      </div>
                      <button
                        className="med-title"
                        onClick={() => setDetail(d)}
                      >
                        {d.genericName}
                        <ChevronRight size={18} />
                      </button>
                      <p className="brands">
                        {d.brandNamesIran.slice(0, 3).join(" · ")}
                      </p>
                      <div className="med-bottom">
                        <span>{d.therapeuticCategory}</span>
                        <button
                          className="icon-button"
                          aria-label={"Add " + d.genericName + " to regimen"}
                          onClick={() => add(d.id)}
                        >
                          {regimen.includes(d.id) ? (
                            <Check size={18} />
                          ) : (
                            <Plus size={18} />
                          )}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
          {view === "Regimen check" && (
            <Checker
              drugs={drugs}
              ids={regimen}
              setIds={(ids) => persist("gp-regimen", ids, setRegimen)}
              onOpen={setDetail}
            />
          )}
          {view === "Admin CMS" && (
            <Admin drugs={drugs} onChange={reload} notify={setToast} />
          )}
          <footer>
            <span>
              <ShieldCheck size={16} /> Clinical judgment remains essential.
            </span>
            <p>
              15-record starter reference, not the complete criteria. Supplied
              clinical content requires review.{" "}
              <a
                href="https://doi.org/10.1111/jgs.18372"
                target="_blank"
                rel="noreferrer"
              >
                Read the official 2023 AGS publication ↗
              </a>
            </p>
            <small>
              Device-local data · {storageMode} · No patient identifiers
              collected
            </small>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav">
        {nav.map((n) => (
          <button
            key={n.name}
            className={view === n.name ? "active" : ""}
            onClick={() => navigate(n.name)}
          >
            <n.icon size={20} />
            <span>
              {n.name === "Regimen check"
                ? "Regimen"
                : n.name === "Admin CMS"
                  ? "Admin"
                  : n.name}
            </span>
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
        </div>
      )}
      {detail && (
        <Modal title={detail.genericName} onClose={() => setDetail(null)}>
          <div className="detail-body">
            <div className="detail-meta">
              <Badge drug={detail} />
              <span>{detail.therapeuticCategory}</span>
            </div>
            <div className="tags">
              {detail.brandNamesIran.map((b) => (
                <span key={b}>{b}</span>
              ))}
            </div>
            <div className="actions">
              <button
                className="button secondary"
                onClick={() => bookmark(detail.id)}
              >
                <Bookmark size={17} />
                {bookmarks.includes(detail.id) ? "Bookmarked" : "Bookmark"}
              </button>
              <button className="button" onClick={() => add(detail.id)}>
                <Plus size={17} />
                {regimen.includes(detail.id) ? "In regimen" : "Add to regimen"}
              </button>
            </div>
            <section className={"clinical-box " + risk(detail)}>
              <h3>Clinical recommendation</h3>
              <p>{detail.recommendation}</p>
              <h4>Rationale</h4>
              <p>{detail.rationale}</p>
              <div className="tags">
                <span>Evidence: {detail.qualityOfEvidence}</span>
                <span>Recommendation: {detail.strengthOfRecommendation}</span>
              </div>
            </section>
            <section className="clinical-box alternatives">
              <h3>Alternatives to consider</h3>
              <ul>
                {detail.saferAlternatives.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              <small>
                Choice depends on indication, patient factors and local
                availability.
              </small>
            </section>
            <details open>
              <summary>
                Drug–drug interactions{" "}
                <span>{detail.drugDrugInteractions.length}</span>
              </summary>
              {detail.drugDrugInteractions.length ? (
                detail.drugDrugInteractions.map((r) => (
                  <div className="interaction" key={r.id}>
                    <h4>
                      {r.targetDrugOrClass}{" "}
                      <span
                        className={
                          "badge " +
                          (r.severity === "Avoid" ? "avoid" : "caution")
                        }
                      >
                        {r.severity}
                      </span>
                    </h4>
                    <p>{r.rationale}</p>
                    <p>
                      <strong>Action:</strong> {r.clinicalAction}
                    </p>
                  </div>
                ))
              ) : (
                <p>
                  No interactions recorded. This does not establish absence of
                  risk.
                </p>
              )}
            </details>
            <details>
              <summary>
                Drug–disease interactions{" "}
                <span>{detail.drugDiseaseInteractions.length}</span>
              </summary>
              {detail.drugDiseaseInteractions.length ? (
                detail.drugDiseaseInteractions.map((r, i) => (
                  <div className="interaction" key={i}>
                    <h4>
                      {r.condition} · {r.recommendation}
                    </h4>
                    <p>{r.rationale}</p>
                  </div>
                ))
              ) : (
                <p>No disease interactions recorded.</p>
              )}
            </details>
            <details>
              <summary>Renal considerations</summary>
              {detail.renalConsiderations ? (
                <div className="interaction">
                  <h4>
                    {detail.renalConsiderations.threshold} ·{" "}
                    {detail.renalConsiderations.action}
                  </h4>
                  <p>{detail.renalConsiderations.guidance}</p>
                  <p>{detail.renalConsiderations.rationale}</p>
                </div>
              ) : (
                <p>
                  No renal rule recorded. Check indication-specific prescribing
                  information.
                </p>
              )}
            </details>
            {(detail.isCnsActive || detail.isStrongAnticholinergic) && (
              <div className="notice">
                {detail.isStrongAnticholinergic && (
                  <p>Strong anticholinergic: consider cumulative exposure.</p>
                )}
                {detail.isCnsActive && (
                  <p>
                    CNS-active flag in supplied registry: review sedation and
                    falls risk.
                  </p>
                )}
              </div>
            )}
            <p className="muted">{detail.notes}</p>
            <small>Updated {detail.lastUpdated}</small>
          </div>
        </Modal>
      )}
    </div>
  );
}
import { Checker } from "./components/Checker";
import { Admin } from "./components/Admin";
