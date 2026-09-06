import { useTheme } from "~/lib/useTheme";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5">
          <path d="M12 4.5a1 1 0 0 1-1-1V2a1 1 0 1 1 2 0v1.5a1 1 0 0 1-1 1Zm0 15a1 1 0 0 1 1 1V22a1 1 0 1 1-2 0v-1.5a1 1 0 0 1 1-1ZM4.5 12a1 1 0 0 1-1 1H2a1 1 0 1 1 0-2h1.5a1 1 0 0 1 1 1Zm15 0a1 1 0 0 1 1-1H22a1 1 0 1 1 0 2h-1.5a1 1 0 0 1-1-1ZM6.34 6.34a1 1 0 0 1-1.42 0L3.85 5.27a1 1 0 1 1 1.42-1.42l1.07 1.07a1 1 0 0 1 0 1.42Zm11.32 11.32a1 1 0 0 1-1.42 0l-1.07-1.07a1 1 0 1 1 1.42-1.42l1.07 1.07a1 1 0 0 1 0 1.42ZM6.34 17.66a1 1 0 0 1 0 1.42l-1.07 1.07a1 1 0 1 1-1.42-1.42l1.07-1.07a1 1 0 0 1 1.42 0ZM19.15 4.85a1 1 0 0 1 0 1.42l-1.07 1.07a1 1 0 1 1-1.42-1.42l1.07-1.07a1 1 0 0 1 1.42 0ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4.5 w-4.5">
          <path d="M20.742 13.045a8.088 8.088 0 0 1-2.077.273c-4.508 0-8.16-3.653-8.16-8.16 0-1.334.32-2.593.888-3.706a.75.75 0 0 0-.917-1.037A10.083 10.083 0 0 0 3.5 10.5C3.5 16.023 7.977 20.5 13.5 20.5c3.86 0 7.213-2.19 8.877-5.393a.75.75 0 0 0-.635-1.062Z" />
        </svg>
      )}
    </button>
  );
}
