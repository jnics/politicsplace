// County-level results, keyed by a race key then by 5-digit county FIPS.
// EMPTY scaffolding for now -- the county zoom renders geometry + names without
// it. Fill per state/race as data is gathered (e.g. from a CountyResults pull
// script, or MIT Election Lab's county returns).
//
// Race key format: "<year>-<office>" e.g. "2024-president", "2024-senate".

export type CountyWinner = "D" | "R" | "I" | "O";

export interface CountyResult {
  /** 5-digit county FIPS. */
  fips: string;
  winner?: CountyWinner;
  dPct?: number;
  rPct?: number;
  /** Winner minus runner-up, points. */
  marginPct?: number;
  dVotes?: number;
  rVotes?: number;
  totalVotes?: number;
}

export const COUNTY_RESULTS: Record<string, Record<string, CountyResult>> = {
  // "2024-president": { "39001": { fips: "39001", winner: "R", marginPct: 40.2, ... }, ... },
};

export function countyResult(
  raceKey: string,
  fips: string
): CountyResult | undefined {
  return COUNTY_RESULTS[raceKey]?.[fips];
}
