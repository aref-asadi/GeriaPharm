import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { normalizeFa, number } from "../../lib/fa";
export interface ChoiceOption {
  value: string;
  label: string;
  description?: string;
}
interface ChoiceProps {
  id?: string;
  label: string;
  value: string;
  options: ChoiceOption[];
  onChange: (value: string) => void;
  editable?: boolean;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}
/** Shared RTL select/creatable combobox. Popover's top layer avoids clipping in dialogs. */
export function Choice({
  id,
  label,
  value,
  options,
  onChange,
  editable = false,
  required = false,
  disabled = false,
  placeholder = "انتخاب کنید…",
}: ChoiceProps) {
  const uid = useId().replace(/:/g, ""),
    controlId = id ?? `choice-${uid}`,
    listId = `choices-${uid}`;
  const control = useRef<HTMLInputElement | HTMLButtonElement>(null),
    popup = useRef<HTMLDivElement>(null),
    root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [active, setActive] = useState(-1);
  const skipOpenOnFocus = useRef(false);
  const typeahead = useRef({ text: "", time: 0 });
  const selected = options.find((o) => o.value === value);
  const visible =
    editable && query
      ? options.filter((o) =>
          normalizeFa(
            o.label + " " + o.value + " " + (o.description ?? ""),
          ).includes(normalizeFa(query)),
        )
      : options;
  const activeId =
    active >= 0 && active < visible.length ? `${listId}-${active}` : undefined;
  const close = () => {
    setOpen(false);
    setQuery("");
    setActive(-1);
  };
  function show(last = false) {
    if (disabled || control.current?.matches(":disabled")) return;
    setQuery("");
    const selectedIndex = options.findIndex((o) => o.value === value);
    setActive(
      last
        ? options.length - 1
        : selectedIndex >= 0
          ? selectedIndex
          : editable
            ? -1
            : 0,
    );
    setOpen(true);
  }
  function focusControl() {
    if (document.activeElement !== control.current) {
      skipOpenOnFocus.current = true;
      control.current?.focus({ preventScroll: true });
    }
  }
  function choose(index: number) {
    const option = visible[index];
    if (!option) {
      close();
      return;
    }
    onChange(option.value);
    close();
    focusControl();
  }
  useLayoutEffect(() => {
    const panel = popup.current;
    if (!panel || !open) return;
    panel.showPopover();
    const position = () => {
      const anchor = control.current?.getBoundingClientRect();
      if (!anchor) return;
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop ?? 0,
        left = viewport?.offsetLeft ?? 0,
        width = viewport?.width ?? innerWidth,
        height = viewport?.height ?? innerHeight;
      const below = top + height - anchor.bottom - 12,
        above = anchor.top - top - 12;
      const upwards = below < Math.min(280, above);
      const room = Math.max(72, upwards ? above : below);
      panel.style.width = `${Math.min(Math.max(anchor.width, 240), width - 24)}px`;
      panel.style.maxHeight = `${Math.min(330, room)}px`;
      panel.dataset.side = upwards ? "top" : "bottom";
      const panelWidth = panel.getBoundingClientRect().width;
      panel.style.left = `${Math.max(left + 12, Math.min(anchor.right - panelWidth, left + width - panelWidth - 12))}px`;
      panel.style.top = `${upwards ? Math.max(top + 8, anchor.top - panel.getBoundingClientRect().height - 7) : anchor.bottom + 7}px`;
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(panel);
    if (control.current) observer.observe(control.current);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    const outside = (event: PointerEvent) => {
      if (
        !root.current?.contains(event.target as Node) &&
        !panel.contains(event.target as Node)
      )
        close();
    };
    document.addEventListener("pointerdown", outside);
    return () => {
      if (panel.matches(":popover-open")) panel.hidePopover();
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);
  useEffect(() => {
    if (activeId && open)
      document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId, open]);
  useEffect(() => {
    if (disabled) close();
  }, [disabled]);
  function keyboard(
    event: KeyboardEvent<HTMLInputElement | HTMLButtonElement | HTMLDivElement>,
  ) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      close();
      focusControl();
      return;
    }
    if (event.key === "Tab") {
      close();
      return;
    }
    if (["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      if (!open) show(event.key === "ArrowUp");
      else
        setActive((i) =>
          Math.max(
            0,
            Math.min(
              visible.length - 1,
              i + (event.key === "ArrowDown" ? 1 : -1),
            ),
          ),
        );
      return;
    }
    if (
      open &&
      ["Home", "End"].includes(event.key) &&
      (!editable || event.ctrlKey)
    ) {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : visible.length - 1);
      return;
    }
    if (event.key === "Enter" || (!editable && event.key === " ")) {
      event.preventDefault();
      if (!open) show();
      else if (active >= 0) choose(active);
      else close();
      return;
    }
    if (
      !editable &&
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      const now = Date.now();
      typeahead.current = {
        text:
          (now - typeahead.current.time < 600 ? typeahead.current.text : "") +
          event.key,
        time: now,
      };
      const index = options.findIndex((o) =>
        normalizeFa(o.label).startsWith(normalizeFa(typeahead.current.text)),
      );
      if (!open) show();
      if (index >= 0) setActive(index);
    }
  }
  return (
    <div
      className={
        "choice " + (open ? "is-open" : "") + (editable ? " is-editable" : "")
      }
      ref={root}
    >
      <div className="choice-anchor">
        {editable ? (
          <input
            ref={(el) => {
              control.current = el;
            }}
            id={controlId}
            role="combobox"
            aria-label={label}
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={open ? activeId : undefined}
            autoComplete="off"
            required={required}
            disabled={disabled}
            className="choice-input"
            placeholder={placeholder}
            value={selected?.label ?? value}
            onFocus={() => {
              if (skipOpenOnFocus.current) {
                skipOpenOnFocus.current = false;
                return;
              }
              show();
            }}
            onClick={() => {
              if (!open) show();
            }}
            onChange={(e) => {
              onChange(e.target.value);
              setQuery(e.target.value);
              setActive(-1);
              setOpen(true);
            }}
            onKeyDown={keyboard}
            onBlur={(e) => {
              if (!popup.current?.contains(e.relatedTarget as Node)) close();
            }}
          />
        ) : (
          <button
            ref={(el) => {
              control.current = el;
            }}
            id={controlId}
            type="button"
            role="combobox"
            aria-label={label}
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls={open ? listId : undefined}
            aria-activedescendant={open ? activeId : undefined}
            disabled={disabled}
            className="choice-trigger"
            onClick={() => (open ? close() : show())}
            onKeyDown={keyboard}
            onBlur={(e) => {
              if (!popup.current?.contains(e.relatedTarget as Node)) close();
            }}
          >
            <span className={!selected ? "choice-placeholder" : ""}>
              {selected?.label ?? (value || placeholder)}
            </span>
          </button>
        )}
        <ChevronDown className="choice-chevron" size={18} aria-hidden="true" />
      </div>
      <div
        ref={popup}
        popover="manual"
        className="choice-popover"
        dir="rtl"
        onPointerDown={(e) => e.preventDefault()}
      >
        <div className="choice-menu-heading">
          <span>
            {editable ? (
              <>
                <Search size={14} />
                پیشنهادها
              </>
            ) : (
              label
            )}
          </span>
          <small>{number(visible.length)} گزینه</small>
        </div>
        <div
          id={listId}
          role="listbox"
          tabIndex={0}
          aria-activedescendant={activeId}
          onKeyDown={keyboard}
          onBlur={(e) => {
            if (!root.current?.contains(e.relatedTarget as Node)) close();
          }}
          aria-label={label}
          className="choice-options"
        >
          {visible.map((option, index) => (
            <div
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              key={option.value}
              className={
                "choice-option " +
                (index === active ? "is-active" : "") +
                (option.value === value ? "is-selected" : "")
              }
              onPointerMove={() => setActive(index)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                choose(index);
              }}
            >
              <span className="choice-option-copy">
                <span>{option.label}</span>
                {option.description && (
                  <small dir="auto">{option.description}</small>
                )}
              </span>
              <span className="choice-check">
                {option.value === value && <Check size={17} />}
              </span>
            </div>
          ))}
        </div>
        {!visible.length && (
          <div className="choice-empty">
            گزینه‌ای پیدا نشد.
            {editable && (
              <small>متن واردشده به‌عنوان مقدار سفارشی حفظ می‌شود.</small>
            )}
          </div>
        )}
        {editable && visible.length > 0 && (
          <div className="choice-footnote">
            یک گزینه انتخاب کنید یا مقدار دلخواه بنویسید.
          </div>
        )}
      </div>
    </div>
  );
}
