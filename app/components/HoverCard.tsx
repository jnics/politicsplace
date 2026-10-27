import type { ReactNode } from "react";
import { pctOf, shortVotes } from "~/lib/earlyVote";

/**
 * Building blocks for the early-vote hover cards, so each card reads as a
 * few distinct blocks instead of one run of same-looking text. The card sits
 * on MapTooltip's dark background in light mode and its light background in
 * dark mode, so every color here is written for both.
 */

/** Small uppercase label that names a block. */
export const EYEBROW = "text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500";
/** Secondary text: shares, dates, empty cells. */
export const SOFT = "text-gray-400 dark:text-gray-500";

/** The card's title line: name on the left, an as-of date on the right. */
export function CardHeader({ title, asOf }: { title: ReactNode; asOf?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/15 pb-1 dark:border-black/10">
      <div className="text-sm font-semibold tracking-tight">{title}</div>
      {asOf && <div className={`shrink-0 text-[10px] ${SOFT}`}>as of {asOf}</div>}
    </div>
  );
}

/** A tinted block with an optional eyebrow title (and a note on its right). */
export function Section({
  title,
  aside,
  children,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md bg-white/[0.06] px-2 py-1.5 dark:bg-black/[0.04]">
      {(title || aside) && (
        <div className="mb-0.5 flex items-baseline justify-between gap-2">
          <div className={EYEBROW}>{title}</div>
          {aside && <div className={`truncate text-[10px] ${SOFT}`}>{aside}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * Bar color by how far 2026 has got: red, then warm to green, with green
 * kept for passing the old total. No blue -- that means Democrats.
 */
const PCT_TIERS: [min: number, bar: string][] = [
  // Vivid green with a soft glow, so passing 100% stands out from the lime.
  [100, "bg-green-400 shadow-[0_0_4px_1px] shadow-green-400/70 dark:bg-green-500 dark:shadow-green-500/60"],
  [75, "bg-lime-400 dark:bg-lime-600"],
  [50, "bg-yellow-300 dark:bg-yellow-500"],
  [25, "bg-amber-500 dark:bg-amber-600"],
  [0, "bg-red-800 dark:bg-red-900"], // maroon, well clear of the amber
];

/** A percent with a thin bar under it, capped at full width past 100%. */
export function PctBar({ pct }: { pct: number }) {
  const over = pct >= 100;
  const bar = PCT_TIERS.find(([min]) => pct >= min)![1];
  return (
    <div className="ml-auto w-14">
      <div className={`text-right ${over ? "font-semibold text-green-300 dark:text-green-700" : SOFT}`}>
        {pct.toFixed(0)}%
      </div>
      <div className="h-[3px] rounded-full bg-white/10 dark:bg-black/10">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

const DOT: Record<string, string> = {
  D: "bg-blue-400 dark:bg-blue-600",
  R: "bg-red-400 dark:bg-red-600",
  O: "bg-gray-400 dark:bg-gray-500",
};

/** A party label with a colored dot in front. */
export function PartyLabel({ party, children }: { party: "D" | "R" | "O"; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${DOT[party]}`} />
      {children}
    </span>
  );
}

/** A D+/R+ margin as a small colored pill. */
export function LeadPill({ lead }: { lead: number }) {
  const d = lead >= 0;
  return (
    <span
      className={`rounded px-1 font-semibold ${
        d ? "bg-blue-500/25 text-blue-200 dark:text-blue-800" : "bg-red-500/25 text-red-200 dark:text-red-800"
      }`}
    >
      {d ? "D" : "R"}+{Math.abs(lead).toFixed(1)}
    </span>
  );
}

/** Year | early vote | 2026 % | total vote | 2026 %. Used by the state and county cards. */
export function CyclesTable({
  rows,
  now,
}: {
  rows: { y: string; ev: number | null; t: number | null }[];
  /** 2026's early vote so far; null hides the "2026" columns' values. */
  now: number | null;
}) {
  const cell = (n: number | null) =>
    n ? (
      <>
        <td className="text-right font-medium">{shortVotes(n)}</td>
        <td className="pl-2">{now ? <PctBar pct={pctOf(now, n)!} /> : null}</td>
      </>
    ) : (
      <>
        <td className={`text-right ${SOFT}`}>&ndash;</td>
        <td />
      </>
    );
  return (
    <table className="w-full tabular-nums">
      <thead>
        <tr className={`${EYEBROW} text-right`}>
          <th className="text-left font-semibold" />
          <th className="font-semibold">Early</th>
          <th className="font-semibold">{now ? "2026" : ""}</th>
          <th className="font-semibold">Total</th>
          <th className="font-semibold">{now ? "2026" : ""}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.y}>
            <td className={`font-semibold ${SOFT}`}>{r.y}</td>
            {cell(r.ev)}
            {cell(r.t)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
