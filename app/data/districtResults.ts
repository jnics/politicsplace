// How each U.S. House district voted in recent statewide races, computed for the
// district's CURRENT lines (the ones its next election uses). From the "recent
// election results" tables on each district's Wikipedia page, which aggregate
// precinct-level results onto the new boundaries.
//
// Keyed by state USPS, then district number, then race key ("2024-president",
// "2024-senate", ...). Ohio only for now, on its 2027-2033 lines.

export interface DistrictRaceResult {
  winner: "D" | "R";
  rPct: number;
  dPct: number;
  /** Short label of who won, e.g. "Trump", "Moreno". */
  who?: string;
}

/** Ohio 2024 presidential result for every district (Wikipedia, new lines). */
const OH_2024_PRES: Record<number, DistrictRaceResult> = {
  1: { winner: "R", rPct: 51, dPct: 48, who: "Trump" },
  2: { winner: "R", rPct: 71, dPct: 29, who: "Trump" },
  3: { winner: "D", rPct: 29, dPct: 70, who: "Harris" },
  4: { winner: "R", rPct: 71, dPct: 28, who: "Trump" },
  5: { winner: "R", rPct: 61, dPct: 38, who: "Trump" },
  6: { winner: "R", rPct: 67, dPct: 32, who: "Trump" },
  7: { winner: "R", rPct: 55, dPct: 44, who: "Trump" },
  8: { winner: "R", rPct: 57, dPct: 42, who: "Trump" },
  9: { winner: "R", rPct: 55, dPct: 44, who: "Trump" },
  10: { winner: "R", rPct: 53, dPct: 46, who: "Trump" },
  11: { winner: "D", rPct: 22, dPct: 77, who: "Harris" },
  12: { winner: "R", rPct: 65, dPct: 35, who: "Trump" },
  13: { winner: "D", rPct: 48, dPct: 51, who: "Harris" },
  14: { winner: "R", rPct: 60, dPct: 39, who: "Trump" },
  15: { winner: "R", rPct: 55, dPct: 45, who: "Trump" },
};

export const DISTRICT_RESULTS: Record<
  string,
  Record<number, Record<string, DistrictRaceResult>>
> = {
  OH: {
    ...Object.fromEntries(
      Object.entries(OH_2024_PRES).map(([n, r]) => [n, { "2024-president": r }])
    ),
    7: {
      "2016-president": { winner: "R", rPct: 54, dPct: 42, who: "Trump" },
      "2016-senate": { winner: "R", rPct: 61, dPct: 34, who: "Portman" },
      "2018-senate": { winner: "D", rPct: 48, dPct: 52, who: "Brown" },
      "2020-president": { winner: "R", rPct: 54, dPct: 45, who: "Trump" },
      "2022-senate": { winner: "R", rPct: 52, dPct: 48, who: "Vance" },
      "2024-president": OH_2024_PRES[7],
      "2024-senate": { winner: "R", rPct: 50, dPct: 47, who: "Moreno" },
    },
  },
};

export function districtResults(
  usps: string,
  district: number
): Record<string, DistrictRaceResult> | undefined {
  return DISTRICT_RESULTS[usps]?.[district];
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
