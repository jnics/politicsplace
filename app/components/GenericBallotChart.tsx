import { GENERIC_BALLOT } from "~/data/genericBallot";

// One distinct hue per cycle — deliberately NOT the app's usual blue/red
// party colors, since this chart's whole point is comparing cycles against
// each other, not calling a winner. Direction (bar grows left or right of
// the center line) still carries the D/R lean, matching the rest of the
// map's left = Democratic, right = Republican convention.
const YEAR_COLORS: Record<number, string> = {
  2016: "#f59e0b", // amber-500
  2018: "#10b981", // emerald-500
  2020: "#8b5cf6", // violet-500
  2022: "#06b6d4", // cyan-500
  2024: "#ec4899", // pink-500
  2026: "#84cc16", // lime-500
};

/** Signed D-vs-R margin in points, D positive. */
function marginOf(d: number, r: number): number {
  return d - r;
}

/** One horizontal bar: grows left of center for a D lean, right for R —
 *  same convention as the map and donut. `pct` is 0-1 of the chart's scale. */
function MarginBar({
  margin,
  pct,
  color,
  faded,
}: {
  margin: number;
  pct: number;
  color: string;
  faded?: boolean;
}) {
  const isD = margin >= 0;
  return (
    <div className="relative h-3 w-full">
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gray-300 dark:bg-gray-700" />
      <div
        className="absolute inset-y-0 rounded-sm"
        style={{
          [isD ? "right" : "left"]: "50%",
          width: `${pct * 50}%`,
          backgroundColor: color,
          opacity: faded ? 0.45 : 1,
        }}
      />
    </div>
  );
}

/**
 * The national generic congressional ballot across every cycle at once — one
 * row per year, each in its own color, polling average vs. the certified
 * House popular vote stacked underneath so you can see how far off the polls
 * ran that year. Left of center = Democratic lean, right = Republican,
 * matching the map's convention; color here just separates the cycles.
 */
export function GenericBallotChart() {
  const rows = GENERIC_BALLOT.map((g) => ({
    year: g.year,
    color: YEAR_COLORS[g.year] ?? "#a1a1aa",
    pollMargin: marginOf(g.d, g.r),
    pollSpread: g.spread,
    resultMargin: g.result ? marginOf(g.result.d, g.result.r) : null,
    resultSpread: g.result?.spread ?? null,
  }));
  const maxAbs = Math.max(
    10,
    ...rows.flatMap((r) => [Math.abs(r.pollMargin), Math.abs(r.resultMargin ?? 0)])
  );

  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Generic congressional ballot, 2016&ndash;2026
        </h2>
        <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gray-400 opacity-45" />
            polling avg.
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gray-400" />
            certified result
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.year}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-gray-100">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: r.color }}
                />
                {r.year}
              </span>
              <span className="tabular-nums text-gray-500 dark:text-gray-400">
                poll {r.pollSpread}
                {r.resultSpread && <> &middot; actual {r.resultSpread}</>}
              </span>
            </div>
            <div className="space-y-1">
              <MarginBar
                margin={r.pollMargin}
                pct={Math.abs(r.pollMargin) / maxAbs}
                color={r.color}
                faded
              />
              {r.resultMargin != null ? (
                <MarginBar
                  margin={r.resultMargin}
                  pct={Math.abs(r.resultMargin) / maxAbs}
                  color={r.color}
                />
              ) : (
                <div className="h-3 text-[10px] italic leading-3 text-gray-400 dark:text-gray-600">
                  no certified result yet
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-gray-400 dark:text-gray-500">
        Left of center = Democratic lean, right = Republican &mdash; each year&rsquo;s
        own color, not party color. Polling average is RealClearPolitics&rsquo; final
        (or running, for 2026) average; the certified bar is the actual national
        U.S. House popular vote once counted.
      </p>
    </div>
  );
}
