import { NO_DATA, PARTY_BINS, TURNOUT_BINS, type Metric } from "~/lib/earlyVote";

/**
 * Color key for the early-vote maps (state and county). Sits centered above
 * the map, where it's seen before anyone has to scroll. `title` names what
 * the colors measure, e.g. "% of 2022 turnout cast early".
 */
export function EvLegend({ metric, title }: { metric: Metric; title?: string }) {
  const items =
    metric === "turnout"
      ? TURNOUT_BINS.map((b) => ({ label: b.label, colors: [b.color] }))
      : PARTY_BINS.map((b) => ({ label: `${b.label} pts`, colors: [b.d, b.r] }));
  return (
    <div className="mb-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
      {title && <span className="font-medium text-gray-700 dark:text-gray-300">{title}</span>}
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1">
          {it.colors.map((c) => (
            <span
              key={c}
              className="inline-block h-3 w-3 rounded-sm border border-black/10"
              style={{ backgroundColor: c }}
            />
          ))}
          {it.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1">
        <span
          className="inline-block h-3 w-3 rounded-sm border border-black/10"
          style={{ backgroundColor: NO_DATA }}
        />
        No data
      </span>
    </div>
  );
}
