import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pp-theme";

export type Theme = "light" | "dark";

function currentThemeFromDom(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * Tracks/toggles the manual dark-mode override. The actual `.dark` class on
 * <html> is set by a blocking inline script in root.tsx before hydration
 * (so there's no flash of the wrong theme); this hook just reads that state
 * on mount and flips it (updating both the DOM class and localStorage) when
 * the user clicks the toggle.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(currentThemeFromDom());
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore quota / privacy-mode errors
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
