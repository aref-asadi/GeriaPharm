import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  ClipboardList,
  CheckCircle2,
  Download,
  Trash2,
  Send,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";
import {
  ALL_QUESTIONS,
  DEMOGRAPHICS_SECTION,
  FIRST_STEP,
  STORAGE_KEY,
  SURVEY_SECTIONS,
  TOTAL_QUESTIONS,
  answerLabel,
  buildSubmission,
  findStep,
  isNumberQuestion,
  isValidAnswer,
  missingDemographics,
  umarsScore,
  type SurveyQuestion,
  type SurveyStep,
} from "../data/umarsQuestions";
import type { SurveySubmissionPayload } from "../types/types";
import {
  fetchSurveyResponses,
  resetSurveyResponses,
  submitSurveyResponse,
  surveyCsvUrl,
} from "../services/api";
import { number as faNumber, toLatinDigits } from "../lib/fa";

/** One locally stored response: the payload plus its delivery state. */
type StoredResponse = SurveySubmissionPayload & { id: string; synced: boolean };

const AUTO_ADVANCE_MS = 300;

function loadStored(): StoredResponse[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as StoredResponse[]) : [];
  } catch {
    return [];
  }
}

function saveStored(rows: StoredResponse[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* storage unavailable; the server copy stays authoritative */
  }
}

function newId() {
  return typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

interface QuestionCardProps {
  question: SurveyQuestion;
  value: number | string | undefined;
  draft: string;
  error: string;
  headingId: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onChoice: (value: number | string) => void;
  onDraft: (value: string) => void;
  onAdvance: () => void;
}

/** Renders exactly one question: a Likert radio group or the numeric age field. */
function QuestionCard({
  question,
  value,
  draft,
  error,
  headingId,
  headingRef,
  onChoice,
  onDraft,
  onAdvance,
}: QuestionCardProps) {
  const answered = isValidAnswer(question, value);
  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151c28] space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 block mb-0.5">
            {question.number
              ? `سوال ${faNumber(question.number)} — ${question.title}`
              : question.title}
          </span>
          <h4
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="font-semibold text-sm sm:text-base leading-relaxed outline-none"
          >
            {question.text}
          </h4>
        </div>
        {answered && (
          <span
            aria-hidden="true"
            className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs"
          >
            ✓
          </span>
        )}
      </div>
      {isNumberQuestion(question) ? (
        <div className="space-y-2">
          <label htmlFor={`${question.id}-input`} className="sr-only">
            {question.title}
          </label>
          <input
            id={`${question.id}-input`}
            type="text"
            inputMode="numeric"
            dir="ltr"
            autoComplete="off"
            value={draft}
            placeholder={question.placeholder}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${question.id}-error` : undefined}
            onChange={(event) => onDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onAdvance();
              }
            }}
            className="w-32 sm:w-40 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-[#101722] text-center text-lg font-bold tracking-widest outline-none focus:border-indigo-500 dark:focus:border-indigo-400"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            بازه مجاز: {faNumber(question.min)} تا {faNumber(question.max)} سال — برای
            ادامه کلید Enter را بزنید.
          </p>
          {error && (
            <p
              id={`${question.id}-error`}
              role="alert"
              className="text-xs font-medium text-rose-600 dark:text-rose-400"
            >
              {error}
            </p>
          )}
        </div>
      ) : (
        <div role="radiogroup" aria-labelledby={headingId} className="space-y-2">
          {question.options.map((option) => {
            const isSelected = value === option.value;
            return (
              <label
                key={String(option.value)}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition text-xs sm:text-sm ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-900 dark:text-indigo-200 font-medium"
                    : "border-gray-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={String(option.value)}
                  checked={isSelected}
                  onChange={() => onChoice(option.value)}
                  className="mt-0.5 w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-700 flex-shrink-0"
                />
                <span className="leading-relaxed">{option.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SectionChipsProps {
  activeSectionId: string;
  answers: Record<string, number | string>;
  chipRefs: React.RefObject<Record<string, HTMLButtonElement | null>>;
  onSelect: (sectionId: string) => void;
}

/** Auto-scrolling section strip; the active chip stays fully in view. */
function SectionChips({
  activeSectionId,
  answers,
  chipRefs,
  onSelect,
}: SectionChipsProps) {
  return (
    <div
      role="tablist"
      aria-label="بخش‌های پرسشنامه"
      className="flex gap-2 overflow-x-auto pb-1 scroll-px-2"
      style={{ scrollbarWidth: "none", scrollSnapType: "x proximity" }}
    >
      {SURVEY_SECTIONS.map((section) => {
        const answered = section.questions.filter((question) =>
          isValidAnswer(question, answers[question.id]),
        ).length;
        const complete = answered === section.questions.length;
        const isActive = section.id === activeSectionId;
        return (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            ref={(node) => {
              chipRefs.current[section.id] = node;
            }}
            onClick={() => onSelect(section.id)}
            style={{ scrollSnapAlign: "start" }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition border flex-shrink-0 ${
              isActive
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                : "bg-slate-50 dark:bg-[#151c28] text-slate-700 dark:text-slate-300 border-gray-200 dark:border-gray-800 hover:border-indigo-300"
            }`}
          >
            <span>
              {section.id.length === 1
                ? `بخش ${section.id}: ${section.label}`
                : section.label}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                isActive
                  ? "bg-white/20 text-white"
                  : complete
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-500"
              }`}
            >
              {faNumber(answered)}/{faNumber(section.questions.length)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface AdminSurveyPanelProps {
  serverCount: number | null;
  pendingCount: number;
  localCount: number;
  busy: boolean;
  onRefresh: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onExportLocal: () => void;
  onClear: () => void;
}

function AdminSurveyPanel({
  serverCount,
  pendingCount,
  localCount,
  busy,
  onRefresh,
  onExportJson,
  onExportCsv,
  onExportLocal,
  onClear,
}: AdminSurveyPanelProps) {
  const secondary =
    "flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border border-indigo-500/20 disabled:opacity-50 text-slate-700 dark:text-slate-200 text-xs font-medium transition";
  return (
    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="inline-block px-2 py-0.5 rounded-lg bg-indigo-500 text-white text-[11px] font-bold mb-1">
            پنل مدیریت
          </span>
          <h4 className="font-bold text-sm">
            {serverCount === null
              ? "در حال دریافت آمار سرور…"
              : `${faNumber(serverCount)} پاسخ روی سرور ثبت شده است`}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {faNumber(localCount)} پاسخ در این مرورگر · {faNumber(pendingCount)} مورد در
            انتظار ارسال
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={busy}
          className={secondary}
          title="به‌روزرسانی آمار سرور"
        >
          <RefreshCw size={14} className={busy ? "animate-spin" : undefined} />
          <span>به‌روزرسانی</span>
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onExportJson}
          disabled={busy || !serverCount}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium transition"
        >
          <Download size={14} />
          <span>خروجی JSON</span>
        </button>
        <button
          type="button"
          onClick={onExportCsv}
          disabled={busy || !serverCount}
          className={secondary}
        >
          <FileSpreadsheet size={14} />
          <span>خروجی CSV (اکسل)</span>
        </button>
        <button
          type="button"
          onClick={onExportLocal}
          disabled={localCount === 0}
          className={secondary}
        >
          <Download size={14} />
          <span>نسخه محلی</span>
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={busy || (serverCount === 0 && localCount === 0)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-50 text-rose-600 dark:text-rose-400 text-xs font-medium transition"
          title="پاک کردن همه پاسخ‌ها"
        >
          <Trash2 size={14} />
          <span>پاک کردن همه</span>
        </button>
      </div>
    </div>
  );
}


interface SuccessPanelProps {
  delivered: boolean;
  summary: string;
  score: { answered: number; total: number; mean: number };
  onNew: () => void;
  onClose: () => void;
}

function SuccessPanel({
  delivered,
  summary,
  score,
  onNew,
  onClose,
}: SuccessPanelProps) {
  return (
    <div className="py-10 text-center space-y-4 max-w-md mx-auto">
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
          delivered
            ? "bg-emerald-500/15 text-emerald-500"
            : "bg-amber-500/15 text-amber-500"
        }`}
      >
        {delivered ? <CheckCircle2 size={34} /> : <CloudOff size={32} />}
      </div>
      <h3 className="text-xl font-bold">از بازخورد ارزشمند شما سپاسگزاریم!</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        {delivered
          ? "پاسخ‌های شما با موفقیت روی سرور ثبت شد و به بهبود کیفیت سامانه کمک می‌کند."
          : "پاسخ شما در همین مرورگر ذخیره شد و به‌محض برقراری اتصال، به‌طور خودکار برای سرور ارسال می‌شود."}
      </p>
      {summary && (
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {summary}
        </p>
      )}
      {score.answered > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          میانگین امتیاز UMARS شما: {faNumber(Number(score.mean.toFixed(2)))} — بر
          پایه {faNumber(score.answered)} پرسش پاسخ‌داده‌شده
        </p>
      )}
      <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={onNew}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition"
        >
          ثبت بازخورد جدید
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm transition"
        >
          بازگشت به برنامه
        </button>
      </div>
    </div>
  );
}

export function UmarsSurveyModal({
  isOpen,
  onClose,
  isAdmin,
  online,
}: {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  online: boolean;
}) {
  const [step, setStep] = useState<SurveyStep>(FIRST_STEP);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [stored, setStored] = useState<StoredResponse[]>([]);
  const [lastId, setLastId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [serverCount, setServerCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [reduceMotion, setReduceMotion] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const advanceRef = useRef<number | null>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const section =
    SURVEY_SECTIONS.find((item) => item.id === step.sectionId) ??
    SURVEY_SECTIONS[0];
  const question = section.questions[step.index] ?? section.questions[0];
  const numberQuestion = isNumberQuestion(question) ? question : null;
  const nextStep = findStep(step, 1);
  const previousStep = findStep(step, -1);
  const answeredCount = useMemo(
    () =>
      ALL_QUESTIONS.filter((item) => isValidAnswer(item, answers[item.id]))
        .length,
    [answers],
  );
  const score = useMemo(() => umarsScore(answers), [answers]);
  const missing = missingDemographics(answers);
  const progressPercent = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);
  const pendingCount = stored.filter((row) => !row.synced).length;
  const delivered = stored.some((row) => row.id === lastId && row.synced);
  const demographicsSummary = DEMOGRAPHICS_SECTION.questions
    .map((item) => `${item.title}: ${answerLabel(item, answers[item.id])}`)
    .join(" · ");
  const ageError =
    numberQuestion &&
    drafts[numberQuestion.id] &&
    !isValidAnswer(numberQuestion, answers[numberQuestion.id])
      ? `سن باید عددی بین ${faNumber(numberQuestion.min)} و ${faNumber(numberQuestion.max)} سال باشد.`
      : "";
  const headingId = `survey-question-${question.id}`;
  const canAdvance =
    Boolean(nextStep) &&
    (!numberQuestion ||
      isValidAnswer(numberQuestion, answers[numberQuestion.id]));

  const refreshCount = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const result = await fetchSurveyResponses();
      setServerCount(result.count);
    } catch (error) {
      setNotice(messageOf(error, "دریافت آمار سرور ناموفق بود."));
    }
  }, [isAdmin]);

  /** Sends every locally queued response; failures stay queued for the next try. */
  const flushQueue = useCallback(async () => {
    const queued = loadStored().filter((row) => !row.synced);
    if (!queued.length || !online) return;
    setBusy(true);
    let failed = false;
    for (const row of queued) {
      const payload: SurveySubmissionPayload = {
        id: row.id,
        createdAt: row.createdAt,
        demographics: row.demographics,
        answers: row.answers,
      };
      try {
        await submitSurveyResponse(payload);
        const next = loadStored().map((item) =>
          item.id === row.id ? { ...item, synced: true } : item,
        );
        saveStored(next);
        setStored(next);
      } catch {
        failed = true;
      }
    }
    setBusy(false);
    setNotice(
      failed ? "ارسال برخی پاسخ‌ها ناموفق بود؛ به‌زودی دوباره تلاش می‌شود." : "",
    );
  }, [online]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(query.matches);
    const onChange = (event: MediaQueryListEvent) =>
      setReduceMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    setStored(loadStored());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (advanceRef.current !== null) {
      window.clearTimeout(advanceRef.current);
      advanceRef.current = null;
    }
    bodyRef.current?.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
    headingRef.current?.focus({ preventScroll: true });
    chipRefs.current[step.sectionId]?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "start",
    });
  }, [isOpen, step.sectionId, step.index, reduceMotion]);

  useEffect(() => {
    if (!isOpen || !isAdmin) return;
    void refreshCount();
  }, [isOpen, isAdmin, refreshCount]);

  useEffect(() => {
    if (!online) return;
    void flushQueue();
  }, [online, flushQueue]);

  useEffect(
    () => () => {
      if (advanceRef.current !== null) window.clearTimeout(advanceRef.current);
    },
    [],
  );

  function clearAdvance() {
    if (advanceRef.current !== null) {
      window.clearTimeout(advanceRef.current);
      advanceRef.current = null;
    }
  }

  const goNext = useCallback(() => {
    if (nextStep) setStep(nextStep);
  }, [nextStep]);

  const scheduleAdvance = useCallback(() => {
    clearAdvance();
    advanceRef.current = window.setTimeout(() => {
      advanceRef.current = null;
      goNext();
    }, AUTO_ADVANCE_MS);
  }, [goNext]);

  const handleChoice = (value: number | string) => {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    setFormError("");
    if (!numberQuestion) scheduleAdvance();
  };

  const handleDraft = (raw: string) => {
    if (!numberQuestion) return;
    const cleaned = toLatinDigits(raw)
      .replace(/[^0-9]/g, "")
      .slice(0, 3);
    setDrafts((prev) => ({ ...prev, [numberQuestion.id]: cleaned }));
    setAnswers((prev) => {
      const next = { ...prev };
      const numeric = cleaned === "" ? Number.NaN : Number(cleaned);
      if (
        !Number.isInteger(numeric) ||
        numeric < numberQuestion.min ||
        numeric > numberQuestion.max
      )
        delete next[numberQuestion.id];
      else next[numberQuestion.id] = numeric;
      return next;
    });
    setFormError("");
  };

  const goPrevious = () => {
    if (previousStep) setStep(previousStep);
  };

  const selectSection = (sectionId: string) => {
    clearAdvance();
    setStep({ sectionId, index: 0 });
  };

  const advanceOrWarn = () => {
    if (
      numberQuestion &&
      !isValidAnswer(numberQuestion, answers[numberQuestion.id])
    ) {
      setFormError(
        `سن باید عددی بین ${faNumber(numberQuestion.min)} و ${faNumber(numberQuestion.max)} سال باشد.`,
      );
      return;
    }
    goNext();
  };

  const handleNewResponse = () => {
    clearAdvance();
    setAnswers({});
    setDrafts({});
    setFormError("");
    setNotice("");
    setSubmitted(false);
    setStep(FIRST_STEP);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = buildSubmission(answers, newId(), new Date().toISOString());
    if (!payload) {
      setFormError(
        `برای ثبت نهایی این پرسش‌ها را کامل کنید: ${missing
          .map((item) => item.title)
          .join("، ")}`,
      );
      setStep(FIRST_STEP);
      return;
    }
    if (Object.keys(payload.answers).length === 0) {
      setFormError("دست‌کم به یکی از پرسش‌های ارزیابی UMARS پاسخ دهید.");
      return;
    }
    const record: StoredResponse = {
      ...payload,
      id: payload.id ?? newId(),
      synced: false,
    };
    const next = [...loadStored().filter((row) => row.id !== record.id), record];
    saveStored(next);
    setStored(next);
    setLastId(record.id);
    setFormError("");
    setSubmitted(true);
    if (online) void flushQueue();
    else
      setNotice("ارتباط با سرور برقرار نیست؛ پاسخ شما پس از برقراری اتصال ارسال می‌شود.");
  };

  const exportServerJson = async () => {
    setBusy(true);
    try {
      const result = await fetchSurveyResponses();
      setServerCount(result.count);
      downloadJson(
        result,
        `geriapharm-umars-${new Date().toISOString().slice(0, 10)}.json`,
      );
      setNotice("");
    } catch (error) {
      setNotice(messageOf(error, "دریافت خروجی سرور ناموفق بود."));
    } finally {
      setBusy(false);
    }
  };

  const exportServerCsv = () => {
    const anchor = document.createElement("a");
    anchor.href = surveyCsvUrl;
    anchor.click();
  };

  const exportLocalJson = () => {
    downloadJson(
      { exportedAt: new Date().toISOString(), responses: loadStored() },
      `umars-local-${new Date().toISOString().slice(0, 10)}.json`,
    );
  };

  const clearAllResponses = async () => {
    if (
      !window.confirm(
        "آیا از پاک کردن تمامی پاسخ‌های ذخیره‌شده روی سرور و در این مرورگر اطمینان دارید؟ این کار بازگشت‌پذیر نیست.",
      )
    )
      return;
    setBusy(true);
    try {
      const result = await resetSurveyResponses();
      localStorage.removeItem(STORAGE_KEY);
      setStored([]);
      setServerCount(0);
      setNotice(`${faNumber(result.removed)} پاسخ از سرور پاک شد.`);
    } catch (error) {
      setNotice(messageOf(error, "پاک کردن پاسخ‌ها ناموفق بود."));
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="ارزیابی UMARS"
    >
      <div className="bg-white dark:bg-[#101722] border border-gray-200 dark:border-gray-800 rounded-[28px] sm:rounded-[42px] max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 bg-slate-50/50 dark:bg-[#151c28]/40 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <ClipboardList size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold tracking-tight truncate">
                ارزیابی کیفیت اپلیکیشن (UMARS)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
                پرسشنامه استاندارد ارزیابی موبایل اپلیکیشن‌ها
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex-shrink-0"
            aria-label="بستن"
          >
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            <SuccessPanel
              delivered={delivered}
              summary={demographicsSummary}
              score={score}
              onNew={handleNewResponse}
              onClose={onClose}
            />
            {isAdmin && (
              <AdminSurveyPanel
                serverCount={serverCount}
                pendingCount={pendingCount}
                localCount={stored.length}
                busy={busy}
                onRefresh={refreshCount}
                onExportJson={exportServerJson}
                onExportCsv={exportServerCsv}
                onExportLocal={exportLocalJson}
                onClear={clearAllResponses}
              />
            )}
            {notice && (
              <p
                role="status"
                className="text-xs text-center font-medium text-amber-600 dark:text-amber-400"
              >
                {notice}
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div
              ref={bodyRef}
              className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-5"
            >
              {isAdmin && (
                <AdminSurveyPanel
                  serverCount={serverCount}
                  pendingCount={pendingCount}
                  localCount={stored.length}
                  busy={busy}
                  onRefresh={refreshCount}
                  onExportJson={exportServerJson}
                  onExportCsv={exportServerCsv}
                  onExportLocal={exportLocalJson}
                  onClear={clearAllResponses}
                />
              )}
              {notice && (
                <p
                  role="status"
                  className="text-xs font-medium text-amber-600 dark:text-amber-400"
                >
                  {notice}
                </p>
              )}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {faNumber(answeredCount)} از {faNumber(TOTAL_QUESTIONS)} پرسش
                    پاسخ داده شده
                  </span>
                  <span>{faNumber(progressPercent)}٪</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <SectionChips
                activeSectionId={step.sectionId}
                answers={answers}
                chipRefs={chipRefs}
                onSelect={selectSection}
              />
              <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-[#151c28]/60 border border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                  {section.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {section.subtitle}
                </p>
              </div>
              <QuestionCard
                question={question}
                value={answers[question.id]}
                draft={drafts[question.id] ?? ""}
                error={ageError}
                headingId={headingId}
                headingRef={headingRef}
                onChoice={handleChoice}
                onDraft={handleDraft}
                onAdvance={advanceOrWarn}
              />
              {formError && (
                <p
                  role="alert"
                  className="text-xs font-medium text-rose-600 dark:text-rose-400"
                >
                  {formError}
                </p>
              )}
            </div>
            <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 bg-slate-50/60 dark:bg-[#151c28]/40 p-3 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p
                  className="text-xs text-slate-500 dark:text-slate-400"
                  aria-live="polite"
                >
                  {section.label} · پرسش {faNumber(step.index + 1)} از{" "}
                  {faNumber(section.questions.length)}
                </p>
                <p className="text-xs hidden sm:block">
                  {answeredCount === TOTAL_QUESTIONS ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      همه پرسش‌ها پاسخ داده شده‌اند.
                    </span>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400">
                      {faNumber(TOTAL_QUESTIONS - answeredCount)} پرسش بی‌پاسخ
                      مانده
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={goPrevious}
                  disabled={!previousStep}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 font-medium text-sm transition"
                >
                  <ChevronRight size={15} />
                  <span>قبلی</span>
                </button>
                {nextStep && (
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canAdvance}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 font-medium text-sm transition"
                  >
                    <span>بعدی</span>
                    <ChevronLeft size={15} />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={answeredCount === 0 || busy}
                  className="sm:ms-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm transition shadow-lg shadow-indigo-500/20"
                >
                  <Send size={15} />
                  <span>ثبت نهایی</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

