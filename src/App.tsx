import { Choice } from "./components/ui/Choice";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  Database,
  FlaskConical,
  HeartPulse,
  Home,
  Layers,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  ShieldAlert,
  Stethoscope,
  WifiOff,
  Menu,
  X,
} from "lucide-react";
import { getAllMedications } from "./services/db";
import {
  syncRegistry,
  cacheRegistry,
  getSession,
  logout,
  type Registry,
  type Session,
} from "./services/api";
import type { DrugRecord } from "./types/types";
import { Modal } from "./components/Modal";
import { Checker } from "./components/Checker";
import { Login } from "./components/Login";
import {
  Button,
  IconButton,
  SearchField,
  MedicationCard,
  EmptyState,
  Notice,
  RiskBadge,
  risk,
} from "./components/ui/Primitives";
import { tables, fa, number, date, drugName, matchesSearch } from "./lib/fa";
import { useRegisterSW } from "virtual:pwa-register/react";
const Admin = lazy(() =>
  import("./components/Admin").then((m) => ({ default: m.Admin })),
);
const icons = [
  ShieldAlert,
  HeartPulse,
  Activity,
  Layers,
  FlaskConical,
  Stethoscope,
];
const nav = [
  { id: "home", label: "خانه", icon: Home },
  { id: "library", label: "مرجع داروها", icon: Search },
  { id: "regimen", label: "بررسی نسخه", icon: ShieldCheck },
  { id: "bookmarks", label: "نشانک‌ها", icon: Bookmark },
  { id: "admin", label: "مدیریت", icon: Settings2 },
];
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
function currentPage() {
  const page = location.hash.slice(1);
  return nav.some((n) => n.id === page) ? page : "home";
}
export default function App() {
  const [drugs, setDrugs] = useState<DrugRecord[]>([]),
    [page, setPage] = useState(currentPage),
    [query, setQuery] = useState(""),
    [table, setTable] = useState("All"),
    [specialty, setSpecialty] = useState("All"),
    [detail, setDetail] = useState<DrugRecord | null>(null),
    [bookmarks, setBookmarks] = useState(() => initialList("gp-bookmarks")),
    [regimen, setRegimen] = useState(() => initialList("gp-regimen")),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false),
    [online, setOnline] = useState(navigator.onLine),
    [synced, setSynced] = useState(false),
    [syncing, setSyncing] = useState(false),
    [toast, setToast] = useState(""),
    [session, setSession] = useState<Session>({ user: null }),
    [authLoading, setAuthLoading] = useState(true),
    [lastSync, setLastSync] = useState(""),
    [mobileOpen, setMobileOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  async function acceptRegistry(r: Registry) {
    setDrugs(r.medications);
    setLoaded(true);
    setSynced(true);
    setLastSync(r.updatedAt);
    if (!(await cacheRegistry(r.medications)))
      setToast(
        "داده سرور دریافت شد، اما ذخیره آفلاین ممکن نبود. فضای مرورگر را بررسی کنید.",
      );
  }
  async function refresh() {
    setSyncing(true);
    try {
      await acceptRegistry(await syncRegistry());
      setError("");
    } catch {
      setSynced(false);
      setToast("سرور در دسترس نیست؛ نسخه ذخیره‌شده نمایش داده می‌شود.");
    } finally {
      setSyncing(false);
    }
  }
  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const rows = await getAllMedications();
        if (mounted) {
          setDrugs(rows);
          setLoaded(true);
        }
      } catch {
        if (mounted)
          setError(
            "خواندن داده ذخیره‌شده ممکن نبود. برای بازیابی از سرور، همگام‌سازی کنید.",
          );
      }
      if (mounted) await refresh();
    })();
    void getSession()
      .then((s) => {
        if (mounted) setSession(s);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setAuthLoading(false);
      });
    const onOnline = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) {
        void refresh();
        void getSession()
          .then(setSession)
          .catch(() => setSession({ user: null }));
      }
    };
    const expired = () => {
      setSession({ user: null });
      setToast("نشست مدیریت پایان یافت. دوباره وارد شوید.");
    };
    const route = () => {
      setPage(currentPage());
      setQuery("");
      setTable("All");
      setSpecialty("All");
      setDetail(null);
      setMobileOpen(false);
    };
    window.addEventListener("hashchange", route);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOnline);
    window.addEventListener("gp-session-expired", expired);
    return () => {
      mounted = false;
      window.removeEventListener("hashchange", route);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOnline);
      window.removeEventListener("gp-session-expired", expired);
    };
  }, []);
  useEffect(() => {
    if (!session.expiresAt) return;
    const t = setTimeout(
      () => setSession({ user: null }),
      Math.max(0, session.expiresAt - Date.now()),
    );
    return () => clearTimeout(t);
  }, [session.expiresAt]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  function navigate(id: string) {
    if (page === id) {
      setQuery("");
      setTable("All");
      setSpecialty("All");
    } else location.hash = id;
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function persist(
    key: string,
    rows: string[],
    setter: (rows: string[]) => void,
  ) {
    try {
      localStorage.setItem(key, JSON.stringify(rows));
      setter(rows);
    } catch {
      setToast("ذخیره روی این دستگاه انجام نشد. فضای مرورگر را بررسی کنید.");
    }
  }
  const bookmark = (id: string) =>
    persist(
      "gp-bookmarks",
      bookmarks.includes(id)
        ? bookmarks.filter((x) => x !== id)
        : [...bookmarks, id],
      setBookmarks,
    );
  function add(id: string) {
    if (!regimen.includes(id)) {
      persist("gp-regimen", [...regimen, id], setRegimen);
      setToast("دارو به نسخه افزوده شد.");
    }
  }
  async function signOut() {
    try {
      await logout();
      setSession({ user: null });
      setToast("از حساب مدیریت خارج شدید.");
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  const filtered = drugs.filter(
    (d) =>
      (page !== "bookmarks" || bookmarks.includes(d.id)) &&
      (table === "All" ||
        (table === "ANTICHOLINERGIC"
          ? d.isStrongAnticholinergic
          : d.beersCategories.includes(table as never))) &&
      (specialty === "All" || d.therapeuticCategory === specialty) &&
      matchesSearch(d, query),
  );
  const titles: Record<string, [string, string]> = {
    home: [
      "نسخه‌ای آگاهانه‌تر، مراقبتی ایمن‌تر.",
      "مرجع کاربردی دارودرمانی سالمندان؛ همراه شما در تصمیم‌های بالینی.",
    ],
    library: [
      "مرجع داروها",
      "توصیه‌ها، تداخل‌ها و گزینه‌های جایگزین را در یک نگاه مرور کنید.",
    ],
    regimen: [
      "بررسی ایمنی نسخه",
      "داروها را در کنار بیماری‌های زمینه‌ای و عملکرد کلیه ارزیابی کنید.",
    ],
    bookmarks: [
      "نشانک‌های شما",
      "راهنماهایی که برای مراجعه سریع کنار گذاشته‌اید.",
    ],
    admin: [
      "مدیریت اطلاعات بالینی",
      "فهرست مشترک داروها، پشتیبان‌گیری و کنترل تغییرات.",
    ],
  };
  return (
    <div className="app">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          heading.current?.focus();
        }}
      >
        رفتن به محتوای اصلی
      </a>
      {mobileOpen && (
        <button
          className="nav-scrim"
          aria-label="بستن فهرست"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={"sidebar " + (mobileOpen ? "is-open" : "")}>
        <a className="brand" href="#home">
          <span className="brand-mark">
            <Pill size={26} />
          </span>
          <div>
            <strong>جریافارم</strong>
            <small>GERIAPHARM</small>
          </div>
        </a>
        <div className="sidebar-label">فضای کار بالینی</div>
        <nav aria-label="ناوبری اصلی">
          {nav.map((n) => (
            <button
              key={n.id}
              aria-current={page === n.id ? "page" : undefined}
              className={"nav-item " + (page === n.id ? "active" : "")}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={21} />
              <span>{n.label}</span>
              {n.id === "regimen" && regimen.length > 0 && (
                <span className="nav-count">{number(regimen.length)}</span>
              )}
              {page === n.id && <ChevronLeft className="nav-arrow" size={15} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="edition">
            <BookOpen size={22} />
            <div>
              معیارهای بیرز ۲۰۲۳<small>نسخه مرجع انجمن سالمندان آمریکا</small>
            </div>
          </div>
          <p>
            برای متخصصان سلامت
            <br />
            در مراقبت از افراد ۶۵ سال و بیشتر
          </p>
          <div className="device-status">
            <span className="status-dot" />
            {offlineReady ? "مطالعه آفلاین آماده است" : "مرجع دارویی همراه شما"}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <IconButton
              label="باز کردن فهرست"
              className="menu-button"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <Menu size={22} />
            </IconButton>
            <span>فضای کار بالینی</span>
            <ChevronLeft size={15} />
            <strong>{nav.find((n) => n.id === page)?.label}</strong>
          </div>
          <div className="top-right">
            <button
              className="sync-status"
              onClick={() => void refresh()}
              disabled={syncing}
              title={
                lastSync
                  ? "آخرین تغییر فهرست: " + date(lastSync)
                  : "دریافت آخرین نسخه فهرست"
              }
            >
              {!online ? (
                <WifiOff size={16} />
              ) : (
                <RefreshCw size={15} className={syncing ? "spin" : ""} />
              )}
              <span>
                {syncing
                  ? "در حال همگام‌سازی"
                  : !online
                    ? "حالت آفلاین"
                    : synced
                      ? "متصل به سرور"
                      : "نسخه ذخیره‌شده"}
              </span>
            </button>
            <span
              className="avatar"
              title={session.user ? "مدیر وارد شده" : "کاربر مرجع"}
            >
              {session.user ? "مد" : "ج‌ف"}
            </span>
          </div>
        </header>
        <main id="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">دانش دارویی، در خدمت سالمندی</div>
              <h1 ref={heading} tabIndex={-1}>
                {titles[page][0]}
              </h1>
              <p>{titles[page][1]}</p>
            </div>
            <span className="edition-tag">
              معیارهای بیرز <b>۲۰۲۳</b>
            </span>
          </div>
          {error && (
            <Notice tone="error">
              {error}
              <Button variant="ghost" onClick={() => void refresh()}>
                همگام‌سازی
              </Button>
            </Notice>
          )}
          {!online && (
            <Notice tone="info">
              در حالت آفلاین، اطلاعات ذخیره‌شده روی همین دستگاه نمایش داده
              می‌شود.
            </Notice>
          )}
          {needRefresh && (
            <Notice tone="info">
              نسخه جدید برنامه آماده است. قبل از به‌روزرسانی، ویرایش‌های باز را
              ذخیره کنید.
              <div className="actions">
                <Button onClick={() => void updateServiceWorker(true)}>
                  به‌روزرسانی برنامه
                </Button>
                <Button variant="ghost" onClick={() => setNeedRefresh(false)}>
                  بعداً
                </Button>
              </div>
            </Notice>
          )}
          {page === "home" && (
            <>
              <SearchField
                value={query}
                onChange={setQuery}
                label="جست‌وجوی سریع دارو"
              />
              <div className="search-hints">
                <span>جست‌وجو با نام فارسی، ژنریک یا برند</span>
                <span>
                  <Database size={14} />
                  {number(drugs.length)} دارو در فهرست
                </span>
              </div>
              {!query && (
                <>
                  <div className="section-heading">
                    <h2>مرور معیارهای بیرز</h2>
                    <span>شش مسیر برای بررسی خطر داروها</span>
                  </div>
                  <div className="category-grid">
                    {tables.map((t, i) => {
                      const Icon = icons[i];
                      return (
                        <button
                          className="category-card"
                          key={t.id}
                          onClick={() => {
                            history.pushState(null, "", "#library");
                            setPage("library");
                            setTable(t.id);
                            setQuery("");
                          }}
                        >
                          <div className="card-top">
                            <span className={"category-icon " + t.color}>
                              <Icon size={25} />
                            </span>
                            <span className="table-label">
                              جدول {number(i + 2)}
                            </span>
                          </div>
                          <h3>{t.title}</h3>
                          <p>{t.description}</p>
                          <div className="card-bottom">
                            <span>
                              {number(
                                drugs.filter((d) =>
                                  t.id === "ANTICHOLINERGIC"
                                    ? d.isStrongAnticholinergic
                                    : d.beersCategories.includes(t.id as never),
                                ).length,
                              )}{" "}
                              دارو
                            </span>
                            <ArrowLeft size={18} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="regimen-banner">
                    <span className="banner-icon">
                      <ShieldCheck size={33} />
                    </span>
                    <div>
                      <h2>نسخه را یک‌جا ببینید.</h2>
                      <p>
                        تداخل‌ها، بار تجمعی داروها و خطرهای مرتبط با شرایط بیمار
                        را بررسی کنید.
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => navigate("regimen")}
                    >
                      بررسی یک نسخه <ArrowLeft size={17} />
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
          {["library", "bookmarks"].includes(page) && (
            <>
              <SearchField value={query} onChange={setQuery} />
              <div className="filter-row">
                <label className="sr-only" htmlFor="specialty">
                  گروه درمانی
                </label>
                <Choice
                  id="specialty"
                  label="گروه درمانی"
                  value={specialty}
                  onChange={setSpecialty}
                  options={[
                    { value: "All", label: "همه گروه‌های درمانی" },
                    ...[
                      ...new Set(drugs.map((d) => d.therapeuticCategory)),
                    ].map((c) => ({ value: c, label: fa(c) })),
                  ]}
                />
                <label className="sr-only" htmlFor="beers">
                  دسته معیار بیرز
                </label>
                <Choice
                  id="beers"
                  label="دسته معیار بیرز"
                  value={table}
                  onChange={setTable}
                  options={[
                    { value: "All", label: "همه معیارها" },
                    ...tables.map((t) => ({ value: t.id, label: t.short })),
                  ]}
                />
                {(specialty !== "All" || table !== "All") && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSpecialty("All");
                      setTable("All");
                    }}
                  >
                    پاک کردن فیلترها
                  </Button>
                )}
                <span>{number(filtered.length)} نتیجه</span>
              </div>
            </>
          )}
          {["home", "library", "bookmarks"].includes(page) && (
            <>
              <div className="section-heading">
                <h2>
                  {page === "home" && !query
                    ? "دسترسی سریع به داروها"
                    : "فهرست داروها"}{" "}
                  <span className="count">{number(filtered.length)}</span>
                </h2>
                {page === "home" && !query && (
                  <Button variant="ghost" onClick={() => navigate("library")}>
                    مشاهده همه داروها <ArrowLeft size={16} />
                  </Button>
                )}
              </div>
              {!loaded && !error ? (
                <div className="loading-state" role="status">
                  در حال دریافت فهرست داروها…
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  heading={
                    page === "bookmarks"
                      ? "هنوز دارویی نشانک‌گذاری نکرده‌اید"
                      : "نتیجه‌ای پیدا نشد"
                  }
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => {
                        navigate("library");
                        setQuery("");
                      }}
                    >
                      مرور همه داروها
                    </Button>
                  }
                >
                  {page === "bookmarks"
                    ? "با لمس نشانک هر دارو، آن را برای مراجعه بعدی ذخیره کنید."
                    : "املای نام دارو را بررسی کنید یا فیلترها را تغییر دهید."}
                </EmptyState>
              ) : (
                <div className="medication-grid">
                  {(page === "home" && !query
                    ? filtered.slice(0, 4)
                    : filtered
                  ).map((d) => (
                    <MedicationCard
                      key={d.id}
                      drug={d}
                      saved={bookmarks.includes(d.id)}
                      inRegimen={regimen.includes(d.id)}
                      onOpen={() => setDetail(d)}
                      onBookmark={() => bookmark(d.id)}
                      onAdd={() => add(d.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
          {page === "regimen" && (
            <Checker
              drugs={drugs}
              ids={regimen}
              setIds={(ids) => persist("gp-regimen", ids, setRegimen)}
              onOpen={setDetail}
            />
          )}
          {page === "admin" &&
            (authLoading ? (
              <div className="loading-state">در حال بررسی دسترسی…</div>
            ) : !session.user ? (
              <Login
                onBack={() => navigate("home")}
                onLogin={(s) => {
                  setSession(s);
                  void refresh();
                  setToast("به پنل مدیریت خوش آمدید.");
                }}
              />
            ) : (
              <Suspense
                fallback={
                  <div className="loading-state">در حال آماده‌سازی پنل…</div>
                }
              >
                <Admin
                  drugs={drugs}
                  onRegistry={(r) => void acceptRegistry(r)}
                  notify={setToast}
                  email={session.user.email}
                  onLogout={() => void signOut()}
                  onPasswordChanged={() => {
                    setSession({ user: null });
                    setToast("رمز عبور تغییر کرد. با رمز جدید وارد شوید.");
                  }}
                  onSync={refresh}
                  online={online}
                />
              </Suspense>
            ))}
          <footer>
            <span>
              <ShieldCheck size={17} />
              همراه تصمیم بالینی؛ نه جایگزین قضاوت متخصص
            </span>
            <p>
              این فهرست اولیه، همه داروها و تداخل‌های معیارهای بیرز را پوشش
              نمی‌دهد. محتوای بالینی نیازمند بازبینی متخصص است.
            </p>
            <div>
              <a
                href="https://doi.org/10.1111/jgs.18372"
                target="_blank"
                rel="noreferrer"
              >
                مطالعه منبع رسمی AGS ↗
              </a>
              <span>اطلاعات هویتی بیمار دریافت نمی‌شود.</span>
            </div>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="ناوبری تلفن همراه">
        {nav.map((n) => (
          <button
            key={n.id}
            aria-current={page === n.id ? "page" : undefined}
            className={page === n.id ? "active" : ""}
            onClick={() => navigate(n.id)}
          >
            <n.icon size={21} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <Check size={19} />
          {toast}
          <IconButton label="بستن پیام" onClick={() => setToast("")}>
            <X size={16} />
          </IconButton>
        </div>
      )}
      {detail && (
        <Modal title={drugName(detail)} onClose={() => setDetail(null)}>
          <div className="modal-body">
            <div className="detail-meta">
              <RiskBadge drug={detail} />
              <span>{fa(detail.therapeuticCategory)}</span>
            </div>
            <p className="detail-generic" dir="ltr">
              {detail.genericName}
            </p>
            <div className="tags">
              {detail.brandNamesIran.map((b) => (
                <span dir="auto" key={b}>
                  {b}
                </span>
              ))}
            </div>
            <div className="actions">
              <Button variant="secondary" onClick={() => bookmark(detail.id)}>
                <Bookmark size={17} />
                {bookmarks.includes(detail.id) ? "حذف نشانک" : "نشانک‌گذاری"}
              </Button>
              <Button
                disabled={regimen.includes(detail.id)}
                onClick={() => add(detail.id)}
              >
                <Plus size={17} />
                {regimen.includes(detail.id)
                  ? "در نسخه موجود است"
                  : "افزودن به نسخه"}
              </Button>
            </div>
            <section className={"clinical-box " + risk(detail)}>
              <h3>توصیه بالینی</h3>
              <p>{detail.recommendation}</p>
              <h4>دلیل توصیه</h4>
              <p>{detail.rationale}</p>
              <div className="evidence-tags">
                <span>
                  کیفیت شواهد: <b>{fa(detail.qualityOfEvidence)}</b>
                </span>
                <span>
                  قدرت توصیه: <b>{fa(detail.strengthOfRecommendation)}</b>
                </span>
              </div>
            </section>
            <section className="clinical-box alternatives">
              <h3>گزینه‌های جایگزین قابل بررسی</h3>
              <ul>
                {detail.saferAlternatives.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              <small>
                انتخاب درمان به اندیکاسیون، شرایط بیمار و دسترسی دارویی بستگی
                دارد.
              </small>
            </section>
            <details open>
              <summary>
                تداخل‌های دارویی{" "}
                <span>{number(detail.drugDrugInteractions.length)}</span>
              </summary>
              {detail.drugDrugInteractions.length ? (
                detail.drugDrugInteractions.map((r) => (
                  <div className="interaction" key={r.id}>
                    <h4>{fa(r.targetDrugOrClass)}</h4>
                    <span
                      className={
                        "badge " +
                        (r.severity === "Avoid" ? "avoid" : "caution")
                      }
                    >
                      {fa(r.severity)}
                    </span>
                    <p>{r.rationale}</p>
                    <p>
                      <strong>اقدام بالینی: </strong>
                      {r.clinicalAction}
                    </p>
                  </div>
                ))
              ) : (
                <p>تداخلی ثبت نشده است؛ این به معنای نبود خطر نیست.</p>
              )}
            </details>
            <details>
              <summary>
                تداخل با بیماری{" "}
                <span>{number(detail.drugDiseaseInteractions.length)}</span>
              </summary>
              {detail.drugDiseaseInteractions.length ? (
                detail.drugDiseaseInteractions.map((r, i) => (
                  <div className="interaction" key={i}>
                    <h4>
                      {fa(r.condition)} · {fa(r.recommendation)}
                    </h4>
                    <p>{r.rationale}</p>
                  </div>
                ))
              ) : (
                <p>تداخل با بیماری در این رکورد ثبت نشده است.</p>
              )}
            </details>
            <details>
              <summary>ملاحظات عملکرد کلیه</summary>
              {detail.renalConsiderations ? (
                <div className="interaction">
                  <h4>
                    <bdi>{detail.renalConsiderations.threshold}</bdi> ·{" "}
                    {fa(detail.renalConsiderations.action)}
                  </h4>
                  <p>{detail.renalConsiderations.guidance}</p>
                  <p>{detail.renalConsiderations.rationale}</p>
                </div>
              ) : (
                <p>
                  قاعده کلیوی ثبت نشده است؛ اطلاعات تجویز را متناسب با
                  اندیکاسیون بررسی کنید.
                </p>
              )}
            </details>
            {(detail.isCnsActive || detail.isStrongAnticholinergic) && (
              <Notice tone="warning">
                {detail.isStrongAnticholinergic && (
                  <p>آنتی‌کولینرژیک قوی؛ مواجهه تجمعی بیمار را بررسی کنید.</p>
                )}
                {detail.isCnsActive && (
                  <p>
                    فعال بر سیستم عصبی مرکزی؛ خطر خواب‌آلودگی و سقوط را بررسی
                    کنید.
                  </p>
                )}
              </Notice>
            )}
            <p className="source-note">{detail.notes}</p>
            <small className="muted">
              آخرین ویرایش: {date(detail.lastUpdated)}
            </small>
          </div>
        </Modal>
      )}
    </div>
  );
}
