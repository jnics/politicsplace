// How each U.S. House district voted in recent statewide races, computed for the
// district's CURRENT (2026) lines. Keyed by state USPS, then district number,
// then race key ("2016-president", "2024-senate", ...).
//
// Ohio is hand-transcribed below (OH_ROWS) from the "2027-2033 boundaries"
// recent-results table on each district's Wikipedia article. Other states come
// from districtResults.generated.json — precinct returns re-aggregated onto the
// current lines by scripts/build-<state>-districts.mjs.

export interface DistrictRaceResult {
  winner: "D" | "R";
  rPct: number;
  dPct: number;
  /** Short label of who won, e.g. "Trump", "Moreno". */
  who?: string;
}

/** Winner's short name by race + party, for the `who` label. */
const WHO: Record<string, Record<"D" | "R", string>> = {
  "2016-president": { R: "Trump", D: "Clinton" },
  "2020-president": { R: "Trump", D: "Biden" },
  "2024-president": { R: "Trump", D: "Harris" },
  "2016-senate": { R: "Portman", D: "Strickland" },
  "2018-senate": { R: "Renacci", D: "Brown" },
  "2022-senate": { R: "Vance", D: "Ryan" },
  "2024-senate": { R: "Moreno", D: "Brown" },
};

type Row = [key: string, winner: "D" | "R", rPct: number, dPct: number];

// One row per race, in the order:
//   2016-president, 2016-senate, 2018-senate, 2020-president,
//   2022-senate, 2024-president, 2024-senate
const OH_ROWS: Record<number, Row[]> = {
  1: [
    ["2016-president", "R", 49, 46], ["2016-senate", "R", 59, 36],
    ["2018-senate", "D", 48, 52], ["2020-president", "D", 49.1, 49.3],
    ["2022-senate", "R", 50.1, 49.9], ["2024-president", "R", 51, 48],
    ["2024-senate", "D", 47, 49],
  ],
  2: [
    ["2016-president", "R", 66, 29], ["2016-senate", "R", 67, 29],
    ["2018-senate", "R", 59, 41], ["2020-president", "R", 69, 30],
    ["2022-senate", "R", 67, 33], ["2024-president", "R", 71, 29],
    ["2024-senate", "R", 65, 31],
  ],
  3: [
    ["2016-president", "D", 28, 67], ["2016-senate", "D", 39, 57],
    ["2018-senate", "D", 26, 74], ["2020-president", "D", 27, 71],
    ["2022-senate", "D", 28, 72], ["2024-president", "D", 29, 70],
    ["2024-senate", "D", 26, 71],
  ],
  4: [
    ["2016-president", "R", 68, 28], ["2016-senate", "R", 72, 23],
    ["2018-senate", "R", 61, 39], ["2020-president", "R", 69, 29],
    ["2022-senate", "R", 69, 31], ["2024-president", "R", 71, 28],
    ["2024-senate", "R", 65, 31],
  ],
  5: [
    ["2016-president", "R", 57, 38], ["2016-senate", "R", 62, 32],
    ["2018-senate", "D", 49, 51], ["2020-president", "R", 60, 39],
    ["2022-senate", "R", 58, 42], ["2024-president", "R", 61, 38],
    ["2024-senate", "R", 55, 41],
  ],
  6: [
    ["2016-president", "R", 61, 35], ["2016-senate", "R", 61, 33],
    ["2018-senate", "R", 52, 48], ["2020-president", "R", 64, 34],
    ["2022-senate", "R", 63, 37], ["2024-president", "R", 67, 32],
    ["2024-senate", "R", 60, 36],
  ],
  7: [
    ["2016-president", "R", 54, 42], ["2016-senate", "R", 61, 34],
    ["2018-senate", "D", 48, 52], ["2020-president", "R", 54, 45],
    ["2022-senate", "R", 52, 48], ["2024-president", "R", 55, 44],
    ["2024-senate", "R", 50, 47],
  ],
  8: [
    ["2016-president", "R", 58, 38], ["2016-senate", "R", 66, 30],
    ["2018-senate", "R", 54, 46], ["2020-president", "R", 57, 42],
    ["2022-senate", "R", 57, 43], ["2024-president", "R", 57, 42],
    ["2024-senate", "R", 53, 43],
  ],
  9: [
    ["2016-president", "R", 50, 45], ["2016-senate", "R", 56, 39],
    ["2018-senate", "D", 43, 57], ["2020-president", "R", 52, 46],
    ["2022-senate", "R", 52, 48], ["2024-president", "R", 55, 44],
    ["2024-senate", "R", 50, 46],
  ],
  10: [
    ["2016-president", "R", 52, 43], ["2016-senate", "R", 61, 35],
    ["2018-senate", "D", 48, 52], ["2020-president", "R", 52, 46],
    ["2022-senate", "R", 53, 47], ["2024-president", "R", 53, 46],
    ["2024-senate", "R", 49, 48],
  ],
  11: [
    ["2016-president", "D", 18, 79], ["2016-senate", "D", 25, 70],
    ["2018-senate", "D", 17, 83], ["2020-president", "D", 21, 78],
    ["2022-senate", "D", 20, 80], ["2024-president", "D", 22, 77],
    ["2024-senate", "D", 19, 78],
  ],
  12: [
    ["2016-president", "R", 63, 32], ["2016-senate", "R", 68, 27],
    ["2018-senate", "R", 57, 43], ["2020-president", "R", 64, 35],
    ["2022-senate", "R", 63, 37], ["2024-president", "R", 65, 35],
    ["2024-senate", "R", 59, 37],
  ],
  13: [
    ["2016-president", "D", 45, 50], ["2016-senate", "R", 51, 44],
    ["2018-senate", "D", 41, 59], ["2020-president", "D", 46, 52],
    ["2022-senate", "D", 44, 55], ["2024-president", "D", 48, 51],
    ["2024-senate", "D", 43, 54],
  ],
  14: [
    ["2016-president", "R", 56, 40], ["2016-senate", "R", 60, 35],
    ["2018-senate", "D", 48, 52], ["2020-president", "R", 58, 40],
    ["2022-senate", "R", 56, 44], ["2024-president", "R", 60, 39],
    ["2024-senate", "R", 53, 43],
  ],
  15: [
    ["2016-president", "R", 53, 42], ["2016-senate", "R", 60, 34],
    ["2018-senate", "D", 47, 53], ["2020-president", "R", 53, 46],
    ["2022-senate", "R", 52, 48], ["2024-president", "R", 55, 45],
    ["2024-senate", "R", 49, 47],
  ],
};

// Other states are computed from precinct returns, not hand-transcribed — see
// scripts/build-<state>-districts.mjs → districtResults.generated.json.
import districtResultsGenerated from "~/data/districtResults.generated.json";

export const DISTRICT_RESULTS: Record<
  string,
  Record<number, Record<string, DistrictRaceResult>>
> = {
  OH: Object.fromEntries(
    Object.entries(OH_ROWS).map(([n, rows]) => [
      Number(n),
      Object.fromEntries(
        rows.map(([key, winner, rPct, dPct]) => [
          key,
          { winner, rPct, dPct, who: WHO[key][winner] },
        ])
      ),
    ])
  ),
  ...Object.fromEntries(
    Object.entries(
      districtResultsGenerated as Record<
        string,
        Record<string, Record<string, DistrictRaceResult>>
      >
    ).map(([usps, byDist]) => [
      usps,
      Object.fromEntries(
        Object.entries(byDist).map(([n, races]) => [Number(n), races])
      ),
    ])
  ),
};

export function districtResults(
  usps: string,
  district: number
): Record<string, DistrictRaceResult> | undefined {
  return DISTRICT_RESULTS[usps]?.[district];
}

// ── U.S. House results by district, aggregated onto the current lines ─────────
// (from scripts/build-oh-district-house*.mjs; Ohio, House cycles 2016-2024.)
import houseGenerated from "~/data/districtHouse.generated.json";

interface DistrictHouseResult {
  winner: "D" | "R";
  dPct: number;
  rPct: number;
  marginPct: number;
}

const DISTRICT_HOUSE = houseGenerated as unknown as Record<
  string,
  Record<string, Record<string, DistrictHouseResult>>
>;

/** Election years we have U.S. House results aggregated onto the current lines
 *  for, as 4-digit strings ascending. Empty for states we haven't built. */
export function districtHouseYears(usps: string): string[] {
  const byDist = DISTRICT_HOUSE[usps];
  if (!byDist) return [];
  const years = new Set<string>();
  for (const d of Object.values(byDist)) for (const y of Object.keys(d)) years.add(y);
  return [...years].sort();
}

/** The district's own U.S. House race result for a year ("2016".."2024"), or
 *  undefined when we don't have it aggregated onto the current lines. */
export function districtHouse(
  usps: string,
  district: number,
  year: string
): DistrictRaceResult | undefined {
  const r = DISTRICT_HOUSE[usps]?.[String(district)]?.[year];
  return r
    ? { winner: r.winner, rPct: r.rPct, dPct: r.dPct }
    : undefined;
}

// ── Old-lines vs. current-lines: did the redraw move the seat? ────────────────
// Ohio's actual U.S. House result on the OLD lines — the seats as they were
// really elected that November — for the two cycles (2022, 2024) run on the
// 2022-2032 map, so a district number means the same broad territory on both
// sides of the comparison. Two-party margin in points. Source: Wikipedia
// "20NN United States House of Representatives elections in Ohio", per-district
// certified results tables (Ohio SoS canvass). Compare against
// districtHouse(..., "20NN"), the same vote re-tallied onto the current
// (2027-2033) lines, to see which seats the 2025 redistricting flipped.
//
// 2016-2020 are deliberately absent: those cycles used the 16-seat 2012-2020
// map, so there is no like-for-like current district to compare to.
type OldRow = { winner: "D" | "R"; who: string; marginPct: number };

const OH_HOUSE_OLD: Record<string, Record<number, OldRow>> = {
  "2022": {
    1: { winner: "D", who: "Landsman", marginPct: 5.5 },
    2: { winner: "R", who: "Wenstrup", marginPct: 49.0 },
    3: { winner: "D", who: "Beatty", marginPct: 40.9 },
    4: { winner: "R", who: "Jordan", marginPct: 38.4 },
    5: { winner: "R", who: "Latta", marginPct: 33.8 },
    6: { winner: "R", who: "Johnson", marginPct: 35.4 },
    7: { winner: "R", who: "Miller", marginPct: 10.7 },
    8: { winner: "R", who: "Davidson", marginPct: 29.3 },
    9: { winner: "D", who: "Kaptur", marginPct: 13.3 },
    10: { winner: "R", who: "Turner", marginPct: 23.3 },
    11: { winner: "D", who: "Brown", marginPct: 55.5 },
    12: { winner: "R", who: "Balderson", marginPct: 38.5 },
    13: { winner: "D", who: "Sykes", marginPct: 5.4 },
    14: { winner: "R", who: "Joyce", marginPct: 23.5 },
    15: { winner: "R", who: "Carey", marginPct: 13.9 },
  },
  "2024": {
    1: { winner: "D", who: "Landsman", marginPct: 9.2 },
    2: { winner: "R", who: "Taylor", marginPct: 47.1 },
    3: { winner: "D", who: "Beatty", marginPct: 41.5 },
    4: { winner: "R", who: "Jordan", marginPct: 36.9 },
    5: { winner: "R", who: "Latta", marginPct: 35.0 },
    6: { winner: "R", who: "Rulli", marginPct: 33.5 },
    7: { winner: "R", who: "Miller", marginPct: 17.2 },
    8: { winner: "R", who: "Davidson", marginPct: 25.6 },
    9: { winner: "D", who: "Kaptur", marginPct: 0.7 },
    10: { winner: "R", who: "Turner", marginPct: 19.0 },
    11: { winner: "D", who: "Brown", marginPct: 59.9 },
    12: { winner: "R", who: "Balderson", marginPct: 37.0 },
    13: { winner: "D", who: "Sykes", marginPct: 2.2 },
    14: { winner: "R", who: "Joyce", marginPct: 26.8 },
    15: { winner: "R", who: "Carey", marginPct: 12.9 },
  },
};

export interface DistrictOldVsNew {
  /** The House election year being compared ("2022" | "2024"). */
  year: string;
  /** Actual House result on the lines used that year. */
  old: OldRow;
  /** The same year's House vote re-aggregated onto the current lines. */
  now: DistrictRaceResult & { marginPct: number };
  /** True when the winning party differs — the redraw flipped the seat. */
  flipped: boolean;
}

/** The district's actual U.S. House result (old lines) vs. the same vote on the
 *  current lines for a given cycle, and whether the redraw changed the winning
 *  party. `year` defaults to the most recent cycle we have (2024); only 2022 and
 *  2024 are available. Ohio only; undefined without both numbers. */
export function districtOldVsNew(
  usps: string,
  district: number,
  year = "2024"
): DistrictOldVsNew | undefined {
  if (usps !== "OH") return undefined;
  // Only the two cycles run on the 2022-2032 map can be compared like-for-like.
  const y = year === "2026" ? "2024" : year;
  const old = OH_HOUSE_OLD[y]?.[district];
  const r = DISTRICT_HOUSE.OH?.[String(district)]?.[y];
  if (!old || !r) return undefined;
  return {
    year: y,
    old,
    now: { winner: r.winner, rPct: r.rPct, dPct: r.dPct, marginPct: r.marginPct },
    flipped: old.winner !== r.winner,
  };
}

/** The result to shade a district by: the given race key, else 2024 president. */
export function districtLean(
  usps: string,
  district: number,
  raceKey: string
): DistrictRaceResult | undefined {
  const d = DISTRICT_RESULTS[usps]?.[district];
  return d?.[raceKey] ?? d?.["2024-president"];
}
