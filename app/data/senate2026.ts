// Every U.S. Senate seat up for election in November 2026: the 33 regular Class 2
// seats, plus 2 special elections (Florida, Ohio) for seats vacated in Jan 2025 by
// Marco Rubio and JD Vance. `incumbent`/`party` reflect who holds the seat today
// (as of research in September 2026), not a prediction of the November outcome.
// Compiled from Wikipedia + Ballotpedia; see project notes for retirement/primary
// details (several incumbents below are retiring or lost their primary but still
// hold the seat through the current term).

export interface Senate2026Race {
  state: string;
  incumbent: string;
  party: "D" | "R";
  special: boolean;
  note?: string;
}

export const SENATE_2026_AS_OF = "2026-09-06";

export const SENATE_2026_NOTES: string[] = [
  "33 Class 2 seats are up for regular election, plus 2 special elections (Florida, Ohio) for seats vacated in January 2025 when Marco Rubio (Secretary of State) and JD Vance (Vice President) left the Senate -- 35 races total.",
  "'incumbent' below is the person currently holding the seat as of September 2026 (i.e. through the end of the current term), regardless of whether they are running again -- several are retiring, lost their primary, or (in two cases) are appointees replacing someone who resigned or died mid-term.",
  "Eight elected incumbents announced they would not seek re-election: Democrats Dick Durbin (IL), Jeanne Shaheen (NH), Tina Smith (MN), Gary Peters (MI); Republicans Mitch McConnell (KY), Joni Ernst (IA), Thom Tillis (NC), Steve Daines (MT), and Cynthia Lummis (WY) -- that is actually nine when Lummis (announced Dec 2025) is included; Tommy Tuberville (AL, R) is leaving the Senate to run for Governor of Alabama rather than seeking re-election.",
  "Oklahoma: incumbent Markwayne Mullin (R) resigned March 23, 2026 to become U.S. Secretary of Homeland Security. Governor Kevin Stitt appointed Alan Armstrong (R) the next day. Armstrong signed an oath not to seek a full term and is not on the November 2026 ballot; this remains a regular (not special) election since the seat was already scheduled for its normal Class 2 election. Republican nominee is Kevin Hern.",
  "South Carolina: incumbent Lindsey Graham (R) won the June 2026 GOP primary but died of cardiac arrest on July 11, 2026. Governor Henry McMaster appointed Graham's sister, Darline Graham (R), to fill the seat. She won a special primary runoff on August 25, 2026 and is the Republican nominee on the November 2026 general-election ballot. This remains the regular Class 2 election for the seat, not a special election.",
  "Texas: incumbent John Cornyn (R) lost the May 2026 GOP primary runoff to Ken Paxton, who is the Republican nominee in November.",
  "Louisiana: incumbent Bill Cassidy (R) was eliminated in Louisiana's May 2026 primary; Julia Letlow won the GOP runoff on June 27, 2026 and is the Republican nominee in November.",
  "Florida special election: Ashley Moody (R), appointed by Gov. DeSantis after Marco Rubio's resignation (Jan 2025), is running to keep the seat.",
  "Ohio special election: Jon Husted (R), appointed by Gov. DeWine after JD Vance's resignation (Jan 2025), is running to keep the seat; his Democratic opponent is former senator Sherrod Brown.",
  "All other listed incumbents (Sullivan-AK, Cotton-AR, Hickenlooper-CO, Coons-DE, Ossoff-GA, Risch-ID, Marshall-KS, Collins-ME, Markey-MA, Hyde-Smith-MS, Ricketts-NE, Booker-NJ, Lujan-NM, Merkley-OR, Reed-RI, Rounds-SD, Hagerty-TN, Warner-VA, Capito-WV) are running for re-election as of this writing, per the sources above; primary/general outcomes for the 2026 cycle should be reconfirmed closer to or after November 3, 2026 since some races were still contested at the time of research."
];

export const SENATE_2026_RACES: Senate2026Race[] = [
  {
    "state": "AL",
    "incumbent": "Tommy Tuberville",
    "party": "R",
    "special": false,
    "note": "Not seeking re-election; running for Governor of Alabama"
  },
  {
    "state": "AK",
    "incumbent": "Dan Sullivan",
    "party": "R",
    "special": false
  },
  {
    "state": "AR",
    "incumbent": "Tom Cotton",
    "party": "R",
    "special": false
  },
  {
    "state": "CO",
    "incumbent": "John Hickenlooper",
    "party": "D",
    "special": false
  },
  {
    "state": "DE",
    "incumbent": "Chris Coons",
    "party": "D",
    "special": false
  },
  {
    "state": "GA",
    "incumbent": "Jon Ossoff",
    "party": "D",
    "special": false
  },
  {
    "state": "ID",
    "incumbent": "Jim Risch",
    "party": "R",
    "special": false
  },
  {
    "state": "IL",
    "incumbent": "Dick Durbin",
    "party": "D",
    "special": false,
    "note": "Retiring"
  },
  {
    "state": "IA",
    "incumbent": "Joni Ernst",
    "party": "R",
    "special": false,
    "note": "Retiring"
  },
  {
    "state": "KS",
    "incumbent": "Roger Marshall",
    "party": "R",
    "special": false
  },
  {
    "state": "KY",
    "incumbent": "Mitch McConnell",
    "party": "R",
    "special": false,
    "note": "Retiring"
  },
  {
    "state": "LA",
    "incumbent": "Bill Cassidy",
    "party": "R",
    "special": false,
    "note": "Lost May 2026 GOP primary; Julia Letlow is the Republican nominee for November"
  },
  {
    "state": "ME",
    "incumbent": "Susan Collins",
    "party": "R",
    "special": false
  },
  {
    "state": "MA",
    "incumbent": "Ed Markey",
    "party": "D",
    "special": false
  },
  {
    "state": "MI",
    "incumbent": "Gary Peters",
    "party": "D",
    "special": false,
    "note": "Retiring"
  },
  {
    "state": "MN",
    "incumbent": "Tina Smith",
    "party": "D",
    "special": false,
    "note": "Retiring"
  },
  {
    "state": "MS",
    "incumbent": "Cindy Hyde-Smith",
    "party": "R",
    "special": false
  },
  {
    "state": "MT",
    "incumbent": "Steve Daines",
    "party": "R",
    "special": false,
    "note": "Retiring"
  },
  {
    "state": "NE",
    "incumbent": "Pete Ricketts",
    "party": "R",
    "special": false
  },
  {
    "state": "NH",
    "incumbent": "Jeanne Shaheen",
    "party": "D",
    "special": false,
    "note": "Retiring"
  },
  {
    "state": "NJ",
    "incumbent": "Cory Booker",
    "party": "D",
    "special": false
  },
  {
    "state": "NM",
    "incumbent": "Ben Ray Lujan",
    "party": "D",
    "special": false
  },
  {
    "state": "NC",
    "incumbent": "Thom Tillis",
    "party": "R",
    "special": false,
    "note": "Retiring"
  },
  {
    "state": "OK",
    "incumbent": "Alan Armstrong",
    "party": "R",
    "special": false,
    "note": "Appointed March 24, 2026 after Markwayne Mullin resigned to become Secretary of Homeland Security; barred by oath from seeking a full term. Kevin Hern is the Republican nominee for November."
  },
  {
    "state": "OR",
    "incumbent": "Jeff Merkley",
    "party": "D",
    "special": false
  },
  {
    "state": "RI",
    "incumbent": "Jack Reed",
    "party": "D",
    "special": false
  },
  {
    "state": "SC",
    "incumbent": "Darline Graham",
    "party": "R",
    "special": false,
    "note": "Appointed by Gov. McMaster after Lindsey Graham (her brother), the elected incumbent, died July 11, 2026; she won the GOP nomination in an August 2026 special primary runoff and is the Republican candidate for November."
  },
  {
    "state": "SD",
    "incumbent": "Mike Rounds",
    "party": "R",
    "special": false
  },
  {
    "state": "TN",
    "incumbent": "Bill Hagerty",
    "party": "R",
    "special": false
  },
  {
    "state": "TX",
    "incumbent": "John Cornyn",
    "party": "R",
    "special": false,
    "note": "Lost May 2026 GOP primary runoff to Ken Paxton, who is the Republican nominee for November"
  },
  {
    "state": "VA",
    "incumbent": "Mark Warner",
    "party": "D",
    "special": false
  },
  {
    "state": "WV",
    "incumbent": "Shelley Moore Capito",
    "party": "R",
    "special": false
  },
  {
    "state": "WY",
    "incumbent": "Cynthia Lummis",
    "party": "R",
    "special": false,
    "note": "Retiring"
  },
  {
    "state": "FL",
    "incumbent": "Ashley Moody",
    "party": "R",
    "special": true,
    "note": "Appointed by Gov. DeSantis after Marco Rubio resigned (Jan 2025) to become Secretary of State; running to keep the seat"
  },
  {
    "state": "OH",
    "incumbent": "Jon Husted",
    "party": "R",
    "special": true,
    "note": "Appointed by Gov. DeWine after JD Vance resigned (Jan 2025) to become Vice President; running to keep the seat against Democrat and former senator Sherrod Brown"
  }
];
