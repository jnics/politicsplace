// National generic congressional ballot by cycle — the plain Democratic vs.
// Republican "which party's candidate would you vote for" number. Candidates
// change every cycle, but the party margin is comparable across years, which is
// the point of showing them side by side.
//
// Every row is the POLLING AGGREGATE (RealClearPolitics' final average for
// completed cycles; for the current one, the average of the aggregators that
// Wikipedia's House elections article compiles) — consistent with the rest of
// the Polls page, which is poll-based. `result` carries the certified national
// U.S. House popular vote for that cycle so the card can show how the polls did.
// Completed cycles are hand-maintained. The current cycle's figure comes from
// genericBallot.generated.json (`pnpm polls:generic`, part of `pnpm polls:all`)
// and replaces the hand-seeded row below when present.
import generated from "~/data/genericBallot.generated.json";

export interface GenericBallotYear {
  year: number;
  /** Polling average, two-party shares as points. */
  d: number;
  r: number;
  /** Signed party margin of the polling average, e.g. "D+5.8" or "R+2.7". */
  spread: string;
  /** Always "polling" here — the figure above is the poll average. */
  kind: "polling";
  /** ISO date (or bare year) the average is as of. */
  asOf: string;
  /** Certified national U.S. House popular vote for the cycle, once counted. */
  result?: { d: number; r: number; spread: string };
  /** One-line context / sourcing note. */
  note?: string;
}

export const GENERIC_BALLOT: GenericBallotYear[] = [
  {
    year: 2016,
    d: 45.4,
    r: 46.0,
    spread: "R+0.6",
    kind: "polling",
    asOf: "2016-11-08",
    result: { d: 48.0, r: 49.1, spread: "R+1.1" },
    note: "RealClearPolitics final average (R+0.6). Certified national House popular vote: R+1.1.",
  },
  {
    year: 2018,
    d: 50.5,
    r: 43.2,
    spread: "D+7.3",
    kind: "polling",
    asOf: "2018-11-06",
    result: { d: 53.4, r: 44.8, spread: "D+8.6" },
    note: "RealClearPolitics final average (D+7.3). Certified national House popular vote: D+8.6.",
  },
  {
    year: 2020,
    d: 49.4,
    r: 42.6,
    spread: "D+6.8",
    kind: "polling",
    asOf: "2020-11-03",
    result: { d: 50.8, r: 47.7, spread: "D+3.1" },
    note: "RealClearPolitics final average (D+6.8). Certified national House popular vote: D+3.1 — the generic ballot's biggest miss since 2006.",
  },
  {
    year: 2022,
    d: 45.7,
    r: 48.2,
    spread: "R+2.5",
    kind: "polling",
    asOf: "2022-11-08",
    result: { d: 47.3, r: 50.0, spread: "R+2.6" },
    note: "RealClearPolitics final average (R+2.5). Certified national House popular vote: R+2.6.",
  },
  {
    year: 2024,
    d: 46.4,
    r: 49.2,
    spread: "R+2.8",
    kind: "polling",
    asOf: "2024-11-05",
    result: { d: 47.2, r: 49.8, spread: "R+2.6" },
    note: "RealClearPolitics final average (R+2.8). Certified national House popular vote: R+2.6.",
  },
  {
    year: 2026,
    d: 50.8,
    r: 42.5,
    spread: "D+8.3",
    kind: "polling",
    asOf: "2026-10-18",
    note: "Average of 5 national polling aggregators.",
  },
];

// Lay the pulled current-cycle average over its hand-seeded row.
{
  const i = GENERIC_BALLOT.findIndex((g) => g.year === generated.year);
  if (i >= 0)
    GENERIC_BALLOT[i] = {
      ...GENERIC_BALLOT[i],
      d: generated.d,
      r: generated.r,
      spread: generated.spread,
      asOf: generated.asOf,
      note: `Average of ${generated.aggregators.length} national polling aggregators.`,
    };
}

export const GENERIC_BALLOT_YEARS = GENERIC_BALLOT.map((g) => g.year);
