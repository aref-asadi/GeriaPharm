import { useState } from "react";
import { X, ClipboardList, CheckCircle2, Download, Trash2, Send } from "lucide-react";
import { UMARS_SECTIONS, ALL_QUESTIONS } from "../data/umarsQuestions";

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-[#101722] border border-gray-200 dark:border-gray-800 rounded-[32px] sm:rounded-[42px] max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-all text-slate-800 dark:text-slate-100">
        {/* Header content and main structure... */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800/80 bg-slate-50/50 dark:bg-[#151c28]/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ClipboardList size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">ارزیابی و نظرسنجی کیفیت اپلیکیشن (UMARS)</h2>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <X size={20} />
          </button>
        </div>
        {/* Further sections omitted for brevity in thought process */}
      </div>
    </div>
  );
}
