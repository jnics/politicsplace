/** Shared helpers for the 2026 early-vote map (state and county views). */

export interface PartySplit {
  dem: number;
  rep: number;
  other: number;
}

export type Metric = "turnout" | "party";

// Sequential, non-partisan ramp for "% of the electorate already voted".
export const TURNOUT_BINS: { min: number; color: string; label: string }[] = [
  { min: 0, color: "#ecfeff", label: "<10%" },
  { min: 10, color: "#a5f3fc", label: "10–20%" },
  { min: 20, color: "#22d3ee", label: "20–35%" },
  { min: 35, color: "#0891b2", label: "35–50%" },
  { min: 50, color: "#155e75", label: "50%+" },
];
export const NO_DATA = "#e5e7eb";

// Party lead among ballots cast, D blue / R red.
export const PARTY_BINS: { min: number; d: string; r: string; label: string }[] = [
  { min: 0, d: "#dbeafe", r: "#fee2e2", label: "<5" },
  { min: 5, d: "#93c5fd", r: "#fca5a5", label: "5–15" },
  { min: 15, d: "#3b82f6", r: "#ef4444", label: "15–30" },
  { min: 30, d: "#1d4ed8", r: "#b91c1c", label: "30+" },
];

export function pctOf(n: number, of: number | null | undefined): number | null {
  return of ? (n / of) * 100 : null;
}

export function shortVotes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

/** D/R/other shares (0-100) of a party split. */
export function shares(p: PartySplit) {
  const t = p.dem + p.rep + p.other;
  return { d: (p.dem / t) * 100, r: (p.rep / t) * 100, o: (p.other / t) * 100 };
}

export function partyFill(p: PartySplit): string {
  const s = shares(p);
  const lead = Math.abs(s.d - s.r);
  const bin = [...PARTY_BINS].reverse().find((b) => lead >= b.min) ?? PARTY_BINS[0];
  return s.d >= s.r ? bin.d : bin.r;
}

export function turnoutFill(pct: number): string {
  return ([...TURNOUT_BINS].reverse().find((b) => pct >= b.min) ?? TURNOUT_BINS[0]).color;
}
