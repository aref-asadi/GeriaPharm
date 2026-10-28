import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Compass } from "lucide-react";

const TOUR_KEY = "gp-tour-done";

interface TourStep {
  selector: string;
  title: string;
  description: string;
}

const STEPS: TourStep[] = [
  {
    selector: '[data-tour="nav"]',
    title: "Ù†Ø§ÙˆØ¨Ø±ÛŒ Ø§ØµÙ„ÛŒ",
    description:
      "Ø§Ø² Ø§ÛŒÙ† Ù†ÙˆØ§Ø± Ø¨Ø±Ø§ÛŒ Ø¬Ø§Ø¨Ù‡â€ŒØ¬Ø§ÛŒÛŒ Ø¨ÛŒÙ† Ø¨Ø®Ø´â€ŒÙ‡Ø§ÛŒ Ø³Ø§Ù…Ø§Ù†Ù‡ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ú©Ù†ÛŒØ¯: Ø®Ø§Ù†Ù‡ØŒ Ù…Ø±Ø¬Ø¹ Ø¯Ø§Ø±ÙˆÙ‡Ø§ØŒ Ø¨Ø±Ø±Ø³ÛŒ Ù†Ø³Ø®Ù‡ØŒ Ù†Ø´Ø§Ù†Ú©â€ŒÙ‡Ø§ Ùˆ Ù…Ø¯ÛŒØ±ÛŒØª.",
  },
  {
    selector: '[data-tour="library-link"]',
    title: "Ù…Ø±Ø¬Ø¹ Ø¯Ø§Ø±ÙˆÙ‡Ø§",
    description:
      "Ù¾Ø§ÛŒÚ¯Ø§Ù‡ Ú©Ø§Ù…Ù„ Ø¯Ø§Ø±ÙˆÙ‡Ø§ÛŒ Ø³Ø§Ù„Ù…Ù†Ø¯ÛŒ Ø¨Ø± Ø§Ø³Ø§Ø³ Ù…Ø¹ÛŒØ§Ø±Ù‡Ø§ÛŒ Ø¨ÛŒØ±Ø² Û²Û°Û²Û³. Ø¬Ø³ØªØ¬ÙˆØŒ ÙÛŒÙ„ØªØ± Ø¨Ø± Ø§Ø³Ø§Ø³ Ú¯Ø±ÙˆÙ‡ Ø¯Ø±Ù…Ø§Ù†ÛŒ Ùˆ Ù…Ø±ØªØ¨â€ŒØ³Ø§Ø²ÛŒ Ø¨Ø± Ø§Ø³Ø§Ø³ Ø³Ø·Ø­ Ø®Ø·Ø± Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ø§Ø³Øª.",
  },
  {
    selector: '[data-tour="regimen-link"]',
    title: "Ø¨Ø±Ø±Ø³ÛŒ Ù†Ø³Ø®Ù‡",
    description:
      "Ø¯Ø§Ø±ÙˆÙ‡Ø§ÛŒ Ø¨ÛŒÙ…Ø§Ø± Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯. Ø³Ø§Ù…Ø§Ù†Ù‡ ØªØ¯Ø§Ø®Ù„â€ŒÙ‡Ø§ØŒ Ù‡Ø´Ø¯Ø§Ø±Ù‡Ø§ÛŒ Ø¨ÛŒØ±Ø²ØŒ Ø±ÛŒØ³Ú© ADRØŒ Ø¨Ø§Ø± Ø¢Ù†ØªÛŒâ€ŒÚ©ÙˆÙ„ÛŒÙ†Ø±Ú˜ÛŒÚ© Ùˆ Ù¾Ø±ÙˆØªÚ©Ù„ Ù‚Ø·Ø¹ ØªØ¯Ø±ÛŒØ¬ÛŒ Ø±Ø§ Ø¨Ù„Ø§Ø¯Ø±Ù†Ú¯ Ù…Ø­Ø§Ø³Ø¨Ù‡ Ù…ÛŒâ€ŒÚ©Ù†Ø¯.",
  },
  {
    selector: '[data-tour="ai-cdss"]',
    title: "Ù…ÙˆØªÙˆØ± Ù‡ÙˆØ´ Ù…ØµÙ†ÙˆØ¹ÛŒ (Edge AI CDSS)",
    description:
      "Ù¾Ø³ Ø§Ø² Ø§ÙØ²ÙˆØ¯Ù† Ø¯Ø§Ø±Ùˆ Ø¨Ù‡ Ù†Ø³Ø®Ù‡ØŒ Ø§ÛŒÙ† Ù¾Ù†Ù„ Ø§Ù…ØªÛŒØ§Ø² Ø±ÛŒØ³Ú© ADRØŒ Ù¾Ø±ÙˆØªÚ©Ù„â€ŒÙ‡Ø§ÛŒ Deprescribing Ùˆ Ù¾ÛŒØ´Ù†Ù‡Ø§Ø¯Ù‡Ø§ÛŒ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ† Ø§ÛŒÙ…Ù†â€ŒØªØ± Ø¨Ø± Ù¾Ø§ÛŒÙ‡ Ø´ÙˆØ§Ù‡Ø¯ Ø¨ÛŒØ±Ø² Û²Û°Û²Û³ Ø±Ø§ Ù†Ø´Ø§Ù† Ù…ÛŒâ€ŒØ¯Ù‡Ø¯.",
  },
  {
    selector: '[data-tour="bookmarks-link"]',
    title: "Ù†Ø´Ø§Ù†Ú©â€ŒÙ‡Ø§",
    description:
      "Ø¨Ø§ Ù„Ù…Ø³ Ø¢ÛŒÚ©ÙˆÙ† Ù†Ø´Ø§Ù†Ú© Ø±ÙˆÛŒ Ù‡Ø± Ø¯Ø§Ø±ÙˆØŒ Ø¢Ù† Ø±Ø§ Ø°Ø®ÛŒØ±Ù‡ Ú©Ù†ÛŒØ¯. Ø¯Ø± Ø§ÛŒÙ† Ø¨Ø®Ø´ Ø¨Ù‡ Ø¯Ø§Ø±ÙˆÙ‡Ø§ÛŒ Ø°Ø®ÛŒØ±Ù‡â€ŒØ´Ø¯Ù‡ Ø¯Ø³ØªØ±Ø³ÛŒ Ø³Ø±ÛŒØ¹ Ø®ÙˆØ§Ù‡ÛŒØ¯ Ø¯Ø§Ø´Øª.",
  },
  {
    selector: '[data-tour="survey-btn"]',
    title: "Ø§Ø±Ø²ÛŒØ§Ø¨ÛŒ UMARS",
    description:
      "Ù¾Ø±Ø³Ø´â€ŒÙ†Ø§Ù…Ù‡ Ø§Ø³ØªØ§Ù†Ø¯Ø§Ø±Ø¯ UMARS Ø¨Ø±Ø§ÛŒ Ø³Ù†Ø¬Ø´ Ø±Ø¶Ø§ÛŒØª Ø§Ø² Ø±Ú˜ÛŒÙ… Ø¯Ø§Ø±ÙˆÛŒÛŒ. Ù¾Ø§Ø³Ø®â€ŒÙ‡Ø§ Ø¨Ù‡ ØµÙˆØ±Øª Ù†Ø§Ø´Ù†Ø§Ø³ Ø«Ø¨Øª Ù…ÛŒâ€ŒØ´ÙˆÙ†Ø¯.",
  },
  {
    selector: '[data-tour="glossary-btn"]',
    title: "Ø±Ø§Ù‡Ù†Ù…Ø§ÛŒ Ø§ØµØ·Ù„Ø§Ø­Ø§Øª",
    description:
      "Ù…Ø¹Ù†ÛŒ Ø§Ø®ØªØµØ§Ø±Ø§Øª ØªØ®ØµØµÛŒ Ù…Ø§Ù†Ù†Ø¯ PIMØŒ ACBØŒ FRIDØŒ STOPPFallØŒ DOAC Ùˆ Ø³Ø§ÛŒØ± Ù…ÙˆØ§Ø±Ø¯ Ø±Ø§ Ø¯Ø± Ø§ÛŒÙ† ÙØ±Ù‡Ù†Ú¯â€ŒÙ†Ø§Ù…Ù‡ Ø¨Ø§Ù„ÛŒÙ†ÛŒ Ø¨ÛŒØ§Ø¨ÛŒØ¯.",
  },
];

/** Condensed mobile guide: core steps that fit small screens and the hamburger menu. */
const MOBILE_STEPS: TourStep[] = [
  {
    selector: '[data-tour="nav"]',
    title: "Ù†Ø§ÙˆØ¨Ø±ÛŒ Ø§ØµÙ„ÛŒ",
    description:
      "Ø§Ø² Ù†ÙˆØ§Ø± Ú©Ù†Ø§Ø±ÛŒ Ø¨Ø±Ø§ÛŒ Ø¬Ø§Ø¨Ù‡â€ŒØ¬Ø§ÛŒÛŒ Ø¨ÛŒÙ† Ø¨Ø®Ø´â€ŒÙ‡Ø§ÛŒ Ø³Ø§Ù…Ø§Ù†Ù‡ Ø§Ø³ØªÙØ§Ø¯Ù‡ Ú©Ù†ÛŒØ¯.",
  },
  {
    selector: '[data-tour="regimen-link"]',
    title: "Ø¨Ø±Ø±Ø³ÛŒ Ù†Ø³Ø®Ù‡",
    description:
      "Ø¯Ø§Ø±ÙˆÙ‡Ø§ÛŒ Ø¨ÛŒÙ…Ø§Ø± Ø±Ø§ ÙˆØ§Ø±Ø¯ Ú©Ù†ÛŒØ¯. ØªØ¯Ø§Ø®Ù„â€ŒÙ‡Ø§ØŒ Ø±ÛŒØ³Ú© ADR Ùˆ Ù¾Ø±ÙˆØªÚ©Ù„ Ù‚Ø·Ø¹ ØªØ¯Ø±ÛŒØ¬ÛŒ Ù…Ø­Ø§Ø³Ø¨Ù‡ Ù…ÛŒâ€ŒØ´ÙˆØ¯.",
  },
  {
    selector: '[data-tour="ai-cdss"]',
    title: "Ù…ÙˆØªÙˆØ± Ù‡ÙˆØ´ Ù…ØµÙ†ÙˆØ¹ÛŒ",
    description:
      "Ø±ÛŒØ³Ú© ADRØŒ Ù¾Ø±ÙˆØªÚ©Ù„â€ŒÙ‡Ø§ÛŒ Deprescribing Ùˆ Ø¬Ø§ÛŒÚ¯Ø²ÛŒÙ†â€ŒÙ‡Ø§ÛŒ Ø§ÛŒÙ…Ù†â€ŒØªØ± Ø±Ø§ Ù†Ø´Ø§Ù† Ù…ÛŒâ€ŒØ¯Ù‡Ø¯.",
  },
  {
    selector: '[data-tour="bookmarks-link"]',
    title: "Ù†Ø´Ø§Ù†Ú©â€ŒÙ‡Ø§",
    description:
      "Ø¯Ø§Ø±ÙˆÙ‡Ø§ÛŒ Ù…ÙˆØ±Ø¯ Ø¹Ù„Ø§Ù‚Ù‡ Ø±Ø§ Ø¨Ø§ Ø¢ÛŒÚ©ÙˆÙ† Ù†Ø´Ø§Ù†Ú© Ø°Ø®ÛŒØ±Ù‡ Ùˆ Ø¨Ù‡ Ø¢Ù†â€ŒÙ‡Ø§ Ø¯Ø³ØªØ±Ø³ÛŒ Ø³Ø±ÛŒØ¹ Ø¯Ø§Ø´ØªÙ‡ Ø¨Ø§Ø´ÛŒØ¯.",
  },
];

/** Map a tour target to the page it lives on, so the guide can navigate there first. */
const TOUR_PAGE_MAP: Record<string, string> = {
  "regimen-link": "regimen",
  "bookmarks-link": "bookmarks",
  "library-link": "library",
  "ai-cdss": "regimen",
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
}: {
  open: boolean;
  onClose: () => void;
  navigateTo?: (id: string) => void;
  isMobile?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const allSteps = isMobile ? MOBILE_STEPS : STEPS;
  const current = allSteps[step];
  const total = allSteps.length;

  const locate = useCallback(() => {
    const el = document.querySelector<HTMLElement>(current.selector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }, 350);
    } else if (navigateTo) {
      const pageId = TOUR_PAGE_MAP[current.selector];
      if (pageId) {
        navigateTo(pageId);
        return;
      }
      setTargetRect(null);
    } else {
      setTargetRect(null);
    }
  }, [current.selector, navigateTo]);

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
      <div
        className="fixed inset-0 z-[9998]"
        style={{
          background: "rgba(16,23,34,0.65)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          ...(targetRect
            ? {
                maskImage: `radial-gradient(circle at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px, transparent ${Math.max(targetRect.width, targetRect.height) / 2 + 12}px, black ${Math.max(targetRect.width, targetRect.height) / 2 + 14}px)`,
                WebkitMaskImage: `radial-gradient(circle at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px, transparent ${Math.max(targetRect.width, targetRect.height) / 2 + 12}px, black ${Math.max(targetRect.width, targetRect.height) / 2 + 14}px)`,
                maskPosition: "0 0",
                WebkitMaskPosition: "0 0",
              }
            : {}),
        }}
        onClick={finish}
        aria-hidden="true"
      />

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
        aria-label={`Ø±Ø§Ù‡Ù†Ù…Ø§ÛŒ Ø³Ø§Ù…Ø§Ù†Ù‡ â€” Ù…Ø±Ø­Ù„Ù‡ ${step + 1} Ø§Ø² ${total}`}
        className="fixed z-[10000] rounded-[28px] bg-white dark:bg-[#101722] border border-indigo-100 dark:border-indigo-900/50 p-5 shadow-2xl"
        style={tooltipStyle}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Compass size={15} className="text-[#4541fe] shrink-0" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Ø±Ø§Ù‡Ù†Ù…Ø§ÛŒ Ø³Ø§Ù…Ø§Ù†Ù‡ Â· {step + 1} Ø§Ø² {total}
            </span>
          </div>
          <button
            type="button"
            onClick={finish}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            aria-label="Ø¨Ø³ØªÙ† Ø±Ø§Ù‡Ù†Ù…Ø§"
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
            Ø±Ø¯ Ú©Ø±Ø¯Ù†
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              disabled={step === 0}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRight size={13} aria-hidden />
              Ù‚Ø¨Ù„ÛŒ
            </button>
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-[#4541fe] hover:bg-[#3733db] text-white transition-colors"
            >
              {step === total - 1 ? "Ù¾Ø§ÛŒØ§Ù†" : "Ø¨Ø¹Ø¯ÛŒ"}
              {step < total - 1 && <ChevronLeft size={13} aria-hidden />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

