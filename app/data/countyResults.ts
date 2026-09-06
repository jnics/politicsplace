// County-level results, keyed by a race key then by 5-digit county FIPS.
// Race key format: "<year>-<office>" e.g. "2024-president", "2024-senate".
//
// Ohio 2024 presidential results are from Wikipedia ("2024 United States
// presidential election in Ohio", results by county); marginPct is |Trump% -
// Harris%|. Fill in other states/races as the county zoom expands.

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
  "2024-president": {
    "39001": { fips: "39001", winner: "R", marginPct: 65.7, totalVotes: 12429 },
    "39003": { fips: "39003", winner: "R", marginPct: 43.9, totalVotes: 46576 },
    "39005": { fips: "39005", winner: "R", marginPct: 49.8, totalVotes: 26730 },
    "39007": { fips: "39007", winner: "R", marginPct: 28.3, totalVotes: 43575 },
    "39009": { fips: "39009", winner: "D", marginPct: 10.6, totalVotes: 26014 },
    "39011": { fips: "39011", winner: "R", marginPct: 64.3, totalVotes: 25730 },
    "39013": { fips: "39013", winner: "R", marginPct: 47.3, totalVotes: 31049 },
    "39015": { fips: "39015", winner: "R", marginPct: 61.3, totalVotes: 21512 },
    "39017": { fips: "39017", winner: "R", marginPct: 26.3, totalVotes: 183252 },
    "39019": { fips: "39019", winner: "R", marginPct: 54.6, totalVotes: 13853 },
    "39021": { fips: "39021", winner: "R", marginPct: 50.5, totalVotes: 20564 },
    "39023": { fips: "39023", winner: "R", marginPct: 29.4, totalVotes: 63206 },
    "39025": { fips: "39025", winner: "R", marginPct: 35.6, totalVotes: 114683 },
    "39027": { fips: "39027", winner: "R", marginPct: 54.4, totalVotes: 20870 },
    "39029": { fips: "39029", winner: "R", marginPct: 48.8, totalVotes: 48246 },
    "39031": { fips: "39031", winner: "R", marginPct: 51.9, totalVotes: 16420 },
    "39033": { fips: "39033", winner: "R", marginPct: 52.7, totalVotes: 20336 },
    "39035": { fips: "39035", winner: "D", marginPct: 31.3, totalVotes: 578370 },
    "39037": { fips: "39037", winner: "R", marginPct: 65.1, totalVotes: 27112 },
    "39039": { fips: "39039", winner: "R", marginPct: 39.6, totalVotes: 19260 },
    "39041": { fips: "39041", winner: "R", marginPct: 6.6, totalVotes: 133906 },
    "39043": { fips: "39043", winner: "R", marginPct: 14.1, totalVotes: 39937 },
    "39045": { fips: "39045", winner: "R", marginPct: 24, totalVotes: 84457 },
    "39047": { fips: "39047", winner: "R", marginPct: 55, totalVotes: 12615 },
    "39049": { fips: "39049", winner: "D", marginPct: 28.1, totalVotes: 604184 },
    "39051": { fips: "39051", winner: "R", marginPct: 42.2, totalVotes: 22564 },
    "39053": { fips: "39053", winner: "R", marginPct: 59.2, totalVotes: 13034 },
    "39055": { fips: "39055", winner: "R", marginPct: 24, totalVotes: 55189 },
    "39057": { fips: "39057", winner: "R", marginPct: 19.7, totalVotes: 90395 },
    "39059": { fips: "39059", winner: "R", marginPct: 52, totalVotes: 17626 },
    "39061": { fips: "39061", winner: "D", marginPct: 14.8, totalVotes: 411656 },
    "39063": { fips: "39063", winner: "R", marginPct: 38.4, totalVotes: 38018 },
    "39065": { fips: "39065", winner: "R", marginPct: 54.6, totalVotes: 12908 },
    "39067": { fips: "39067", winner: "R", marginPct: 55.1, totalVotes: 7120 },
    "39069": { fips: "39069", winner: "R", marginPct: 46.5, totalVotes: 14975 },
    "39071": { fips: "39071", winner: "R", marginPct: 63.3, totalVotes: 20005 },
    "39073": { fips: "39073", winner: "R", marginPct: 44.2, totalVotes: 13512 },
    "39075": { fips: "39075", winner: "R", marginPct: 68.9, totalVotes: 12386 },
    "39077": { fips: "39077", winner: "R", marginPct: 43.9, totalVotes: 27344 },
    "39079": { fips: "39079", winner: "R", marginPct: 57.9, totalVotes: 14332 },
    "39081": { fips: "39081", winner: "R", marginPct: 43.7, totalVotes: 31417 },
    "39083": { fips: "39083", winner: "R", marginPct: 44.7, totalVotes: 32277 },
    "39085": { fips: "39085", winner: "R", marginPct: 14.3, totalVotes: 129159 },
    "39087": { fips: "39087", winner: "R", marginPct: 50.3, totalVotes: 26836 },
    "39089": { fips: "39089", winner: "R", marginPct: 29.9, totalVotes: 95581 },
    "39091": { fips: "39091", winner: "R", marginPct: 56, totalVotes: 23512 },
    "39093": { fips: "39093", winner: "R", marginPct: 5.7, totalVotes: 159807 },
    "39095": { fips: "39095", winner: "D", marginPct: 12.4, totalVotes: 192489 },
    "39097": { fips: "39097", winner: "R", marginPct: 43.5, totalVotes: 20762 },
    "39099": { fips: "39099", winner: "R", marginPct: 9.4, totalVotes: 113233 },
    "39101": { fips: "39101", winner: "R", marginPct: 41.2, totalVotes: 27470 },
    "39103": { fips: "39103", winner: "R", marginPct: 24.7, totalVotes: 107517 },
    "39105": { fips: "39105", winner: "R", marginPct: 56.9, totalVotes: 10422 },
    "39107": { fips: "39107", winner: "R", marginPct: 66.5, totalVotes: 23826 },
    "39109": { fips: "39109", winner: "R", marginPct: 44.9, totalVotes: 59438 },
    "39111": { fips: "39111", winner: "R", marginPct: 59.6, totalVotes: 6815 },
    "39113": { fips: "39113", winner: "D", marginPct: 0.5, totalVotes: 256544 },
    "39115": { fips: "39115", winner: "R", marginPct: 53, totalVotes: 6803 },
    "39117": { fips: "39117", winner: "R", marginPct: 55.5, totalVotes: 18932 },
    "39119": { fips: "39119", winner: "R", marginPct: 43.9, totalVotes: 39394 },
    "39121": { fips: "39121", winner: "R", marginPct: 64.4, totalVotes: 6184 },
    "39123": { fips: "39123", winner: "R", marginPct: 25, totalVotes: 24042 },
    "39125": { fips: "39125", winner: "R", marginPct: 55.9, totalVotes: 9328 },
    "39127": { fips: "39127", winner: "R", marginPct: 54.5, totalVotes: 17005 },
    "39129": { fips: "39129", winner: "R", marginPct: 48.3, totalVotes: 29413 },
    "39131": { fips: "39131", winner: "R", marginPct: 53.6, totalVotes: 12242 },
    "39133": { fips: "39133", winner: "R", marginPct: 15.5, totalVotes: 83619 },
    "39135": { fips: "39135", winner: "R", marginPct: 58.8, totalVotes: 21766 },
    "39137": { fips: "39137", winner: "R", marginPct: 68.5, totalVotes: 19840 },
    "39139": { fips: "39139", winner: "R", marginPct: 42.3, totalVotes: 58362 },
    "39141": { fips: "39141", winner: "R", marginPct: 39.2, totalVotes: 33065 },
    "39143": { fips: "39143", winner: "R", marginPct: 30.7, totalVotes: 29827 },
    "39145": { fips: "39145", winner: "R", marginPct: 47.9, totalVotes: 31225 },
    "39147": { fips: "39147", winner: "R", marginPct: 37.3, totalVotes: 25404 },
    "39149": { fips: "39149", winner: "R", marginPct: 64.6, totalVotes: 25362 },
    "39151": { fips: "39151", winner: "R", marginPct: 21.9, totalVotes: 184193 },
    "39153": { fips: "39153", winner: "D", marginPct: 6.9, totalVotes: 274454 },
    "39155": { fips: "39155", winner: "R", marginPct: 16.7, totalVotes: 97096 },
    "39157": { fips: "39157", winner: "R", marginPct: 43.1, totalVotes: 43211 },
    "39159": { fips: "39159", winner: "R", marginPct: 29.4, totalVotes: 37567 },
    "39161": { fips: "39161", winner: "R", marginPct: 58.2, totalVotes: 14806 },
    "39163": { fips: "39163", winner: "R", marginPct: 58.3, totalVotes: 5766 },
    "39165": { fips: "39165", winner: "R", marginPct: 31.3, totalVotes: 140759 },
    "39167": { fips: "39167", winner: "R", marginPct: 43.6, totalVotes: 31123 },
    "39169": { fips: "39169", winner: "R", marginPct: 39.3, totalVotes: 53150 },
    "39171": { fips: "39171", winner: "R", marginPct: 48.1, totalVotes: 18314 },
    "39173": { fips: "39173", winner: "R", marginPct: 10.2, totalVotes: 67586 },
    "39175": { fips: "39175", winner: "R", marginPct: 51, totalVotes: 11445 },
  },
};

export function countyResult(
  raceKey: string,
  fips: string
): CountyResult | undefined {
  return COUNTY_RESULTS[raceKey]?.[fips];
}
