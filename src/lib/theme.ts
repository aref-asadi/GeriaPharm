export type ThemePreference = "light" | "dark" | "system";
const KEY = "gp-theme";
export const themeLabels: Record<ThemePreference, string> = {
  light: "روشن",
  dark: "تیره",
  system: "هماهنگ با سیستم",
};
export function storedTheme(): ThemePreference {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
}
export function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
export function applyTheme(preference: ThemePreference) {
  const resolved = resolveTheme(preference);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  for (const meta of document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"]',
  ))
    meta.content = resolved === "dark" ? "#090d16" : "#f8fafc";
  try {
    localStorage.setItem(KEY, preference);
  } catch {
    /* storage unavailable; theme applies for this session only */
  }
}
/** Subscribe to OS scheme changes; returns a cleanup function. */
export function watchSystemTheme(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}