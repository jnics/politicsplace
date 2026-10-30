import { useCallback, useEffect, useState } from "react";

function readStored(storageKey: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * The visitor's starred items (race ids) on an election-night page, kept in
 * their browser (localStorage) so the stars survive a reload and the board's
 * auto-refresh. Per-browser: each viewer has their own. Ids stay in the order
 * they were starred.
 */
export function useFavorites(storageKey: string) {
  // Empty on the server and the first client render so the SSR markup
  // matches, then hydrate from localStorage right after mount.
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setIds(readStored(storageKey));
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(ids));
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [ids, hydrated, storageKey]);

  const toggle = useCallback((id: string) => {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  return { ids, has: (id: string) => ids.includes(id), toggle };
}

/** A small star button: filled when starred. */
export function StarButton({
  on,
  label,
  onToggle,
  className = "",
}: {
  on: boolean;
  /** What is being starred, for the button's accessible name. */
  label: string;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        // Inside a <summary> this would also open/close the section.
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={on}
      aria-label={on ? `Remove ${label} from favorites` : `Add ${label} to favorites`}
      title={on ? "Remove from favorites" : "Add to favorites (moves it to the top)"}
      className={`shrink-0 leading-none transition-colors ${
        on
          ? "text-amber-500 hover:text-amber-600"
          : "text-gray-300 hover:text-amber-500 dark:text-gray-600 dark:hover:text-amber-400"
      } ${className}`}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinejoin="round"
          d="M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.6L10 14.7l-5.1 2.7 1-5.6-4.1-4 5.7-.8z"
        />
      </svg>
    </button>
  );
}
