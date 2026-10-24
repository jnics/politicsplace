import type { ReactNode } from "react";

export interface Stat {
  label: string;
  value: ReactNode;
  /** Smaller, muted text after the value (a share, a date). */
  sub?: ReactNode;
  /** Extra classes on the value, e.g. a party color. */
  cls?: string;
}

/**
 * The early-vote hover cards' top block: small labeled tiles that wrap to
 * fill however wide the card is, instead of run-on lines of text.
 */
export function StatGrid({ items, title }: { items: Stat[]; title?: ReactNode }) {
  if (!items.length) return null;
  return (
    <div>
      {title && <div className="mb-0.5 text-gray-300 dark:text-gray-600">{title}</div>}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(7.25rem,1fr))] gap-x-3 gap-y-1.5">
        {items.map((s) => (
          <div key={s.label} className="min-w-0">
            <div className="truncate text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {s.label}
            </div>
            <div className={`truncate font-medium tabular-nums ${s.cls ?? ""}`}>
              {s.value}
              {s.sub != null && (
                <span className="font-normal text-gray-300 dark:text-gray-600"> {s.sub}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
