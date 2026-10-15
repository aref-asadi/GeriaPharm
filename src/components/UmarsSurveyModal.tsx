import { useState } from "react";
import { X, ClipboardList, CheckCircle2, Download, Trash2, Send } from "lucide-react";
import { UMARS_SECTIONS, ALL_QUESTIONS, type SurveySection } from "../data/umarsQuestions";

interface SurveySubmission {
  id: string;
  createdAt: string;
  answers: Record<string, number>;
}

const STORAGE_KEY = "gp-umars-submissions";

function loadSubmissions(): SurveySubmission[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveSubmission(answers: Record<string, number>) {
  try {
    const subs = loadSubmissions();
    const newSub: SurveySubmission = {
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
      answers,
    };
    subs.push(newSub);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
  } catch {
    /* storage unavailable */
  }
}

interface SurveyFormProps {
  isAdmin: boolean;
  submissions: SurveySubmission[];
  answers: Record<string, number>;
  answeredCount: number;
  totalCount: number;
  progressPercent: number;
  activeSectionId: string;
  activeSection: SurveySection;
  onSectionChange: (id: string) => void;
  onOptionChange: (qId: string, val: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onExport: () => void;
  onClear: () => void;
}

function SurveyForm({ isAdmin, submissions, answers, answeredCount, totalCount, progressPercent,
  activeSectionId, activeSection, onSectionChange, onOptionChange, onSubmit, onExport, onClear }: SurveyFormProps) {
  return (
    <>
      {isAdmin && (
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="inline-block px-2 py-0.5 rounded-lg bg-indigo-500 text-white text-[11px] font-bold mb-1">پنل مدیریت</span>
            <h4 className="font-bold text-sm">{submissions.length} پاسخ ثبت‌شده</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">خروجی کامل نظرسنجی در اختیار شماست.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onExport} disabled={submissions.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-medium transition">
              <Download size={14} /><span>خروجی JSON</span>
            </button>
            <button type="button" onClick={onClear} disabled={submissions.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium transition"
              title="پاک کردن همه داده‌ها">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{answeredCount} از {totalCount} سوال پاسخ داده شده</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {UMARS_SECTIONS.map((sec) => {
          const secAnswered = sec.questions.filter((q) => answers[q.id] !== undefined).length;
          const isComplete = secAnswered === sec.questions.length;
          const isActive = sec.id === activeSectionId;
          return (
            <button key={sec.id} type="button" onClick={() => onSectionChange(sec.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition border flex-shrink-0 ${isActive ? "bg-indigo-600 text-white border-indigo-600 shadow-md" : "bg-slate-50 dark:bg-[#151c28] text-slate-700 dark:text-slate-300 border-gray-200 dark:border-gray-800 hover:border-indigo-300"}`}>
              <span>بخش {sec.id}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? "bg-white/20 text-white" : isComplete ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}>{secAnswered}/{sec.questions.length}</span>
            </button>
          );
        })}
      </div>
      <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-[#151c28]/60 border border-gray-100 dark:border-gray-800">
        <h3 className="font-bold text-sm text-indigo-600 dark:text-indigo-400">{activeSection.title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{activeSection.subtitle}</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        {activeSection.questions.map((q) => (
          <div key={q.id} className="p-4 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151c28] space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 block mb-0.5">سوال {q.number} — {q.title}</span>
                <h4 className="font-semibold text-sm leading-relaxed">{q.text}</h4>
              </div>
              {answers[q.id] !== undefined && (
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">✓</span>
              )}
            </div>
            <div className="space-y-2">
              {q.options.map((opt) => {
                const isSelected = answers[q.id] === opt.value;
                return (
                  <label key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition text-xs sm:text-sm ${isSelected ? "border-indigo-500 bg-indigo-500/10 text-indigo-900 dark:text-indigo-200 font-medium" : "border-gray-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"}`}>
                    <input type="radio" name={q.id} value={opt.value} checked={isSelected}
                      onChange={() => onOptionChange(q.id, opt.value)}
                      className="mt-0.5 w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-700 flex-shrink-0" />
                    <span className="leading-relaxed">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {answeredCount === totalCount
              ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">همه سوالات پاسخ داده شده‌اند.</span>
              : <span>{totalCount - answeredCount} سوال بی‌پاسخ مانده</span>
            }
          </p>
          <div className="flex gap-2">
            {activeSectionId !== UMARS_SECTIONS[UMARS_SECTIONS.length - 1].id && (
              <button type="button"
                onClick={() => { const idx = UMARS_SECTIONS.findIndex(s => s.id === activeSectionId); if (idx < UMARS_SECTIONS.length - 1) onSectionChange(UMARS_SECTIONS[idx + 1].id); }}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm transition">
                بخش بعدی ←
              </button>
            )}
            <button type="submit" disabled={answeredCount === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm transition shadow-lg shadow-indigo-500/20">
              <Send size={15} /><span>ثبت نهایی</span>
            </button>
          </div>
        </div>
      </form>
    </>
  );
}


export function UmarsSurveyModal({
  isOpen,
  onClose,
  isAdmin,
}: {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}) {
  const [activeSectionId, setActiveSectionId] = useState(UMARS_SECTIONS[0].id);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submissions, setSubmissions] = useState<SurveySubmission[]>(loadSubmissions);

  if (!isOpen) return null;

  const activeSection = UMARS_SECTIONS.find((s) => s.id === activeSectionId) || UMARS_SECTIONS[0];
  const answeredCount = Object.keys(answers).length;
  const totalCount = ALL_QUESTIONS.length;
  const progressPercent = Math.round((answeredCount / totalCount) * 100);

  const handleExportJson = () => {
    const subs = loadSubmissions();
    const blob = new Blob([JSON.stringify(subs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `umars-survey-responses-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearSubmissions = () => {
    if (window.confirm("آیا از پاک کردن تمامی پاسخ‌های ذخیره‌شده اطمینان دارید؟")) {
      localStorage.removeItem(STORAGE_KEY);
      setSubmissions([]);
    }
  };

  const handleOptionChange = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answeredCount === 0) return;
    saveSubmission(answers);
    setSubmissions(loadSubmissions());
    setSubmitted(true);
  };

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
              <h2 className="text-base sm:text-xl font-bold tracking-tight truncate">ارزیابی کیفیت اپلیکیشن (UMARS)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">پرسشنامه استاندارد ارزیابی موبایل اپلیکیشن‌ها</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex-shrink-0"
            aria-label="بستن">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-5">
          {submitted ? (
            <div className="py-12 text-center space-y-4 max-w-sm mx-auto">
              <div className="w-16 h-16 bg-emerald-500/15 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={34} />
              </div>
              <h3 className="text-xl font-bold">از بازخورد ارزشمند شما سپاسگزاریم!</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                پاسخ‌های شما با موفقیت ثبت شد و به بهبود کیفیت سامانه کمک می‌کند.
              </p>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <button type="button"
                  onClick={() => { setSubmitted(false); setAnswers({}); setActiveSectionId(UMARS_SECTIONS[0].id); }}
                  className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition">
                  ثبت بازخورد جدید
                </button>
                <button type="button" onClick={onClose}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm transition">
                  بازگشت به برنامه
                </button>
              </div>
            </div>
          ) : (
            <SurveyForm
              isAdmin={isAdmin}
              submissions={submissions}
              answers={answers}
              answeredCount={answeredCount}
              totalCount={totalCount}
              progressPercent={progressPercent}
              activeSectionId={activeSectionId}
              activeSection={activeSection}
              onSectionChange={setActiveSectionId}
              onOptionChange={handleOptionChange}
              onSubmit={handleSubmit}
              onExport={handleExportJson}
              onClear={handleClearSubmissions}
            />
          )}
        </div>
      </div>
    </div>
  );
}
