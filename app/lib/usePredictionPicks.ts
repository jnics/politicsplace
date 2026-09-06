import { useCallback, useEffect, useState } from "react";
import type { Shade } from "~/lib/shades";

const STORAGE_KEY = "politicsplace:2026-senate-picks:v1";

function readStored(): Record<string, Shade> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Shade>) : {};
  } catch {
    return {};
  }
}

/**
 * Persists the visitor's own 2026 Senate predictions in their browser
 * (localStorage) so their picks survive a reload. This is per-browser, not
 * shared with anyone else -- there's no server backing this yet.
 */
export function usePredictionPicks() {
  // Start empty on both server and first client render so SSR markup
  // matches, then hydrate from localStorage right after mount.
  const [picks, setPicks] = useState<Record<string, Shade>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPicks(readStored());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [picks, hydrated]);

  const setPick = useCallback((state: string, shade: Shade) => {
    setPicks((prev) => ({ ...prev, [state]: shade }));
  }, []);

  const resetPicks = useCallback(() => {
    setPicks({});
  }, []);

  return { picks, setPick, resetPicks, hydrated };
}
