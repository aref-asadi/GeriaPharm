import { Monitor, Moon, Sun } from "lucide-react";
import {
  themeLabels,
  type ThemePreference,
} from "../lib/theme";
const order: ThemePreference[] = ["light", "dark", "system"];
const icons = { light: Sun, dark: Moon, system: Monitor } as const;
export function ThemeToggle({
  value,
  onChange,
}: {
  value: ThemePreference;
  onChange: (t: ThemePreference) => void;
}) {
  const active = value;
  return (
    <div
      className="theme-toggle"
      role="group"
      aria-label="انتخاب حالت نمایش روشن یا تیره"
    >
      {order.map((t) => {
        const Icon = icons[t];
        const pressed = active === t;
        return (
          <button
            key={t}
            type="button"
            aria-pressed={pressed}
            title={themeLabels[t]}
            onClick={() => onChange(t)}
          >
            <Icon size={17} aria-hidden />
            <span className="sr-only">{themeLabels[t]}</span>
          </button>
        );
      })}
    </div>
  );
}