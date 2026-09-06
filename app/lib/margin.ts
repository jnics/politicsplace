import type { Shade } from "~/lib/shades";

/**
 * Turn a win margin (in percentage points, winner minus runner-up, always given
 * as a non-negative number) plus the winning party into a point on the 7-way
 * safe / likely / lean / toss-up spectrum used everywhere else in the app.
 *
 * Thresholds follow the common U.S. cartographic convention (roughly what
 * 270toWin / Cook Political Report use for their result maps):
 *
 *   margin < 1 pt   -> toss-up (effectively a tie / recount territory)
 *   1 pt  - 6 pt    -> lean
 *   6 pt  - 15 pt   -> likely
 *   margin >= 15 pt -> safe
 */
export function marginToShade(
  party: "D" | "R",
  marginPct: number,
  opts: { allowTossup?: boolean } = {}
): Shade {
  const m = Math.abs(marginPct);
  // Predictions can land on "toss-up"; a race that already happened cannot --
  // there's a winner, so the closest a decided race gets is "lean".
  if ((opts.allowTossup ?? true) && m < 1) return "tossup";
  const bucket = m < 6 ? "lean" : m < 15 ? "likely" : "safe";
  return `${bucket}${party}` as Shade;
}

/** Format a margin for display, e.g. "R +12.4 pts" or "D +0.8 pts". */
export function formatMargin(party: "D" | "R", marginPct: number): string {
  return `${party} +${Math.abs(marginPct).toFixed(1)} pts`;
}

/** Format a vote count with thousands separators, e.g. 3543219 -> "3,543,219". */
export function formatVotes(n: number): string {
  return n.toLocaleString("en-US");
}
