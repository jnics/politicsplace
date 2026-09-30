import { useCallback, useEffect, useState } from "react";
import type { Shade } from "~/lib/shades";

const DEFAULT_KEY = "politicsplace:2026-senate-picks:v1";

function readStored(storageKey: string): Record<string, Shade> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as Record<string, Shade>) : {};
  } catch {
    return {};
  }
}

/**
 * Persists one set of the visitor's own 2026 predictions in their browser
 * (localStorage) so their picks survive a reload. Per-browser, not shared with
 * anyone else -- there's no server backing this yet. Pass a distinct
 * `storageKey` per granularity (state / county / precinct).
 */
export function usePredictionPicks(storageKey: string = DEFAULT_KEY) {
  // Start empty on both server and first client render so SSR markup
  // matches, then hydrate from localStorage right after mount.
  const [picks, setPicks] = useState<Record<string, Shade>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPicks(readStored(storageKey));
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(picks));
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [picks, hydrated, storageKey]);

  const setPick = useCallback((id: string, shade: Shade) => {
    setPicks((prev) => ({ ...prev, [id]: shade }));
  }, []);

  const clearPick = useCallback((id: string) => {
    setPicks((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const resetPicks = useCallback(() => {
    setPicks({});
  }, []);

  return { picks, setPick, clearPick, resetPicks, hydrated };
}
