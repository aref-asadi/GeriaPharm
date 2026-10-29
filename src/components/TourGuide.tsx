import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Compass } from "lucide-react";

const TOUR_KEY = "gp-tour-done";

interface TourStep {
  selector: string;
  title: string;
  description: string;
}

const STEPS: TourStep[] = [
  { selector: '[data-tour="home-link"]', title: "خانه", description: "از صفحه خانه به مرور سریع داروها و آغاز کار در سامانه دسترسی دارید." },
  { selector: '[data-tour="library-link"]', title: "مرجع داروها", description: "پایگاه داروهای سالمندی را جستجو کنید، بر اساس گروه درمانی فیلتر کنید و داروها را بر اساس سطح ریسک مرور کنید." },
  { selector: '[data-tour="regimen-link"]', title: "بررسی نسخه", description: "داروهای بیمار را وارد کنید تا تداخل‌ها، هشدارهای بیرز، ریسک ADR، بار آنتی‌کولینرژیک و راهبردهای قطع تدریجی ارزیابی شوند." },
  { selector: '[data-tour="bookmarks-link"]', title: "نشانک‌ها", description: "داروهای مهم را با نشانک ذخیره کنید و برای مراجعه سریع‌تر بعدی در بخش نشانک‌ها ببینید." },
  { selector: '[data-tour="sync-btn"]', title: "همگام‌سازی", description: "با این گزینه آخرین فهرست دارویی و تغییرات سامانه را از سرور دریافت کنید و اطلاعات آفلاین را به‌روز نگه دارید." },
  { selector: '[data-tour="glossary-btn"]', title: "راهنمای اصطلاحات", description: "معنی اختصارات تخصصی مانند PIM، ACB، FRID، STOPPFall، DOAC و سایر واژه‌های بالینی را در فرهنگ‌نامه ببینید." },
  { selector: '[data-tour="survey-btn"]', title: "ارزیابی UMARS", description: "پرسش‌نامه استاندارد UMARS را تکمیل کنید تا رضایت و کیفیت تجربه استفاده از رژیم دارویی سنجیده شود." },
];

/** Mobile controls use distinct selectors but contain the same guidance as desktop. */
const MOBILE_STEPS: TourStep[] = [
  { selector: '[data-tour="mobile-home-link"]', title: "خانه", description: "از صفحه خانه به مرور سریع داروها و آغاز کار در سامانه دسترسی دارید." },
  { selector: '[data-tour="mobile-library-link"]', title: "مرجع داروها", description: "پایگاه داروهای سالمندی را جستجو کنید، بر اساس گروه درمانی فیلتر کنید و داروها را بر اساس سطح ریسک مرور کنید." },
  { selector: '[data-tour="mobile-regimen-link"]', title: "بررسی نسخه", description: "داروهای بیمار را وارد کنید تا تداخل‌ها، هشدارهای بیرز، ریسک ADR، بار آنتی‌کولینرژیک و راهبردهای قطع تدریجی ارزیابی شوند." },
  { selector: '[data-tour="mobile-bookmarks-link"]', title: "نشانک‌ها", description: "داروهای مهم را با نشانک ذخیره کنید و برای مراجعه سریع‌تر بعدی در بخش نشانک‌ها ببینید." },
  { selector: '[data-tour="mobile-sync-btn"]', title: "همگام‌سازی", description: "با این گزینه آخرین فهرست دارویی و تغییرات سامانه را از سرور دریافت کنید و اطلاعات آفلاین را به‌روز نگه دارید." },
  { selector: '[data-tour="mobile-glossary-btn"]', title: "راهنمای اصطلاحات", description: "معنی اختصارات تخصصی مانند PIM، ACB، FRID، STOPPFall، DOAC و سایر واژه‌های بالینی را در فرهنگ‌نامه ببینید." },
  { selector: '[data-tour="mobile-survey-btn"]', title: "ارزیابی UMARS", description: "پرسش‌نامه استاندارد UMARS را تکمیل کنید تا رضایت و کیفیت تجربه استفاده از رژیم دارویی سنجیده شود." },
];

/** Map a tour target to the page it lives on, so the guide can navigate there first. */
const TOUR_PAGE_MAP: Record<string, string> = {
  "regimen-link": "regimen",
  "bookmarks-link": "bookmarks",
  "library-link": "library",
  "mobile-regimen-link": "regimen",
  "mobile-bookmarks-link": "bookmarks",
  "mobile-library-link": "library",
  "mobile-home-link": "home",
  "mobile-menu-button": "home",
  "ai-cdss": "regimen",
  "mobile-ai-cdss": "regimen",
};

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Returns true if the user has already completed the tour. */
export function tourIsDone(): boolean {
  try {
    return Boolean(localStorage.getItem(TOUR_KEY));
  } catch {
    return false;
  }
}

export function TourGuide({
  open,
  onClose,
  navigateTo,
  isMobile = false,
  setMobileMenuOpen,
}: {
  open: boolean;
  onClose: () => void;
  navigateTo?: (id: string) => void;
  isMobile?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const allSteps = isMobile ? MOBILE_STEPS : STEPS;
  const current = allSteps[step];
  const total = allSteps.length;

  const locate = useCallback(() => {
    if (isMobile && setMobileMenuOpen) {
      const keepMenuOpen =
        current.selector.includes("mobile-survey-btn") ||
        current.selector.includes("mobile-glossary-btn") ||
        current.selector.includes("mobile-sync-btn");
      setMobileMenuOpen(keepMenuOpen);
    }

    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(current.selector);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        setTimeout(() => {
          const r = el.getBoundingClientRect();
          setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        }, 350);
      } else if (navigateTo) {
        const tourId = current.selector.match(/data-tour="([^"]+)"/)?.[1];
        const pageId = tourId ? TOUR_PAGE_MAP[tourId] : undefined;
        if (pageId) {
          navigateTo(pageId);
          setTimeout(() => {
            const retry = document.querySelector<HTMLElement>(current.selector);
            if (retry) {
              retry.scrollIntoView({ behavior: "smooth", block: "nearest" });
              setTimeout(() => {
                const r = retry.getBoundingClientRect();
                setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
              }, 350);
            }
          }, 700);
          return;
        }
        setTargetRect(null);
      } else {
        setTargetRect(null);
      }
    }, 350);
  }, [current.selector, navigateTo, isMobile, setMobileMenuOpen]);

  useEffect(() => {
    if (open) locate();
  }, [open, locate]);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  function next() {
    if (step < total - 1) setStep((s) => s + 1);
    else finish();
  }

  function prev() {
    if (step > 0) setStep((s) => s - 1);
  }

  function finish() {
    try { localStorage.setItem(TOUR_KEY, "1"); } catch { /* unavailable */ }
    onClose();
  }

  if (!open) return null;

  const DESKTOP_W = 340;
  const MOBILE_BP = 640;
  const PAD = 14;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const viewportIsNarrow = vw < MOBILE_BP;
  const tooltipW = viewportIsNarrow ? Math.min(vw - PAD * 2, DESKTOP_W) : DESKTOP_W;
  // Mobile needs more vertical room for wrapped Persian/Arabic text.
  const tooltipH = viewportIsNarrow ? 320 : 220;

  let tooltipStyle: React.CSSProperties;

  if (targetRect) {
    const spaceBelow = vh - targetRect.top - targetRect.height;
    const spaceAbove = targetRect.top;
    let top: number;
    if (spaceBelow >= tooltipH + PAD) {
      top = targetRect.top + targetRect.height + PAD;
    } else if (spaceAbove >= tooltipH + PAD) {
      top = targetRect.top - tooltipH - PAD;
    } else {
      top = Math.max(PAD, vh / 2 - tooltipH / 2);
    }
    let left = targetRect.left + targetRect.width / 2 - tooltipW / 2;
    left = Math.max(PAD, Math.min(left, vw - tooltipW - PAD));
    tooltipStyle = {
      top,
      left,
      width: tooltipW,
      maxHeight: vh - PAD * 2,
      overflowY: "auto",
    };
  } else {
    tooltipStyle = {
      top: Math.max(PAD, vh / 2 - tooltipH / 2),
      left: Math.max(PAD, vw / 2 - tooltipW / 2),
      width: tooltipW,
      maxHeight: vh - PAD * 2,
      overflowY: "auto",
    };
  }

  return (
    <>
      {targetRect ? (() => {
        const rect = targetRect;
        const paneStyle = (style: React.CSSProperties): React.CSSProperties => ({
          position: "fixed",
          zIndex: 9998,
          background: "rgba(16,23,34,0.65)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          ...style,
        });
        return (
          <>
            <div aria-hidden="true" onClick={finish} style={paneStyle({ top: 0, left: 0, right: 0, height: Math.max(0, rect.top - 5) })} />
            <div aria-hidden="true" onClick={finish} style={paneStyle({ top: rect.top - 5, left: 0, width: Math.max(0, rect.left - 5), height: rect.height + 10 })} />
            <div aria-hidden="true" onClick={finish} style={paneStyle({ top: rect.top - 5, left: rect.left + rect.width + 5, right: 0, height: rect.height + 10 })} />
            <div aria-hidden="true" onClick={finish} style={paneStyle({ top: rect.top + rect.height + 5, left: 0, right: 0, bottom: 0 })} />
          </>
        );
      })() : (
        <div
          className="fixed inset-0 z-[9998]"
          style={{ background: "rgba(16,23,34,0.65)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}
          onClick={finish}
          aria-hidden="true"
        />
      )}

      {targetRect && (
        <div
          className="fixed z-[9999] rounded-2xl pointer-events-none"
          aria-hidden="true"
          style={{
            top: targetRect.top - 5,
            left: targetRect.left - 5,
            width: targetRect.width + 10,
            height: targetRect.height + 10,
            boxShadow:
              "0 0 0 4px #4541fe, 0 0 0 8px rgba(69,65,254,0.20), 0 0 40px rgba(69,65,254,0.15)",
          }}
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`راهنمای سامانه — مرحله ${step + 1} از ${total}`}
        className="fixed z-[10000] rounded-[28px] bg-white dark:bg-[#101722] border border-indigo-100 dark:border-indigo-900/50 p-5 shadow-2xl"
        style={tooltipStyle}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Compass size={15} className="text-[#4541fe] shrink-0" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              راهنمای سامانه · {step + 1} از {total}
            </span>
          </div>
          <button
            type="button"
            onClick={finish}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            aria-label="بستن راهنما"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 mb-3" aria-hidden="true">
          {allSteps.map((_, i) => (
            <span
              key={i}
              className={`rounded-full transition-all duration-200 ${
                i === step
                  ? "w-5 h-2 bg-[#4541fe]"
                  : i < step
                    ? "w-2 h-2 bg-[#4541fe]/40"
                    : "w-2 h-2 bg-slate-200 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>

        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-2">
          {current.title}
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
          {current.description}
        </p>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={finish}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            رد کردن
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              disabled={step === 0}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRight size={13} aria-hidden />
              قبلی
            </button>
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-[#4541fe] hover:bg-[#3733db] text-white transition-colors"
            >
              {step === total - 1 ? "پایان" : "بعدی"}
              {step < total - 1 && <ChevronLeft size={13} aria-hidden />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
