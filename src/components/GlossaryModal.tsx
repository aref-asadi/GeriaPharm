import { useState, type ReactNode } from "react";
import { BookOpen, X, ChevronDown, ChevronUp, Info } from "lucide-react";
import { glossaryEntries, type GlossaryEntry } from "./glossaryData";

export { glossaryEntries, type GlossaryEntry };

export function AbbrTooltip({
  term,
  children,
}: {
  term: string;
  children: ReactNode;
}) {
  const [show, setShow] = useState(false);
  const entry = glossaryEntries.find(
    (g) => g.term.toLowerCase() === term.toLowerCase(),
  );

  return (
    <span
      className="relative inline-flex items-center gap-1 cursor-help group"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
    >
      <span className="underline decoration-dotted decoration-indigo-400 underline-offset-4">
        {children}
      </span>
      <Info
        size={14}
        className="text-indigo-500 dark:text-indigo-400 inline opacity-70 group-hover:opacity-100 transition"
      />
      {show && entry && (
        <span className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-900 text-white dark:bg-slate-800 border border-slate-700 rounded-2xl shadow-xl text-xs z-50 pointer-events-none leading-relaxed">
          <strong className="block text-indigo-300 font-bold mb-1">
            {entry.term} — {entry.persianTitle}
          </strong>
          {entry.shortDescription}
        </span>
      )}
    </span>
  );
}

export function GlossaryModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("همه");
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = ["همه", "مخفف‌های بالینی", "دسته‌بندی‌های بیرز"];

  const filtered = glossaryEntries.filter((item) => {
    const matchesCat = activeCategory === "همه" || item.category === activeCategory;
    const q = searchTerm.trim().toLowerCase();
    const matchesQuery =
      item.term.toLowerCase().includes(q) ||
      item.persianTitle.toLowerCase().includes(q) ||
      item.shortDescription.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-[#101722] border border-gray-200 dark:border-gray-800 rounded-[32px] sm:rounded-[42px] max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-all text-slate-800 dark:text-slate-100">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800/80 bg-slate-50/50 dark:bg-[#151c28]/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <BookOpen size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                راهنمای اصطلاحات و اختصارات بالینی
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                مفاهیم کلیدی معیارهای بیرز ۲۰۲۳ و اختصارات دارودرمانی سالمندان
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="بستن"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800/80 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جست‌وجوی اختصار یا عنوان…"
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2230] text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
          />
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                  activeCategory === cat
                    ? "bg-[#4541fe] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 divide-y divide-gray-100 dark:divide-gray-800/60">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              موردی مطابق با عبارت جست‌وجو شده یافت نشد.
            </div>
          ) : (
            filtered.map((item) => (
              <div key={item.term} className="pt-3 first:pt-0 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <div
                  className="flex items-start justify-between cursor-pointer select-none"
                  onClick={() => setExpandedTerm(expandedTerm === item.term ? null : item.term)}
                >
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-xs sm:text-sm font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      {item.term}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.persianTitle}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{item.shortDescription}</p>
                    </div>
                  </div>
                  <button className="text-slate-400 mt-1">
                    {expandedTerm === item.term ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
                {expandedTerm === item.term && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-100 dark:bg-[#1a2230] text-xs text-slate-700 dark:text-slate-300">
                    <strong className="text-indigo-600 dark:text-indigo-400 block mb-1">نکات بالینی:</strong>
                    {item.detailedClinicalNotes}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800/80 bg-slate-50 dark:bg-[#151c28]/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-[#4541fe] text-white text-sm font-medium hover:brightness-110 shadow-sm transition"
          >
            متوجه شدم
          </button>
        </div>
      </div>
    </div>
  );
}

