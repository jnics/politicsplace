// How each U.S. House district voted in recent statewide races, computed for the
// district's CURRENT lines (the ones its next election uses). These come from
// the "Recent election results" tables on each district's Wikipedia page, which
// aggregate precinct-level results onto the new boundaries -- so no precinct
// pipeline is needed just for the district-level lean.
//
// Keyed by state USPS, then district number, then race key ("2024-president",
// "2024-senate", ...). Ohio only for now; Ohio's 7th uses its 2027-2033 lines.

export interface DistrictRaceResult {
  winner: "D" | "R";
  rPct: number;
  dPct: number;
  /** Short label of who won, e.g. "Trump", "Moreno". */
  who?: string;
}

export const DISTRICT_RESULTS: Record<
  string,
  Record<number, Record<string, DistrictRaceResult>>
> = {
  OH: {
    7: {
      "2016-president": { winner: "R", rPct: 54, dPct: 42, who: "Trump" },
      "2016-senate": { winner: "R", rPct: 61, dPct: 34, who: "Portman" },
      "2018-senate": { winner: "D", rPct: 48, dPct: 52, who: "Brown" },
      "2020-president": { winner: "R", rPct: 54, dPct: 45, who: "Trump" },
      "2022-senate": { winner: "R", rPct: 52, dPct: 48, who: "Vance" },
      "2024-president": { winner: "R", rPct: 55, dPct: 44, who: "Trump" },
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
