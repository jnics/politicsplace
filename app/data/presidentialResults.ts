// Presidential election results by state, 2016 / 2020 / 2024.
// party: "D" | "R" | "split" (Maine/Nebraska allocate some EVs by congressional district).
// ev: electoral votes for that state IN THAT SPECIFIC YEAR (apportionment changed after the 2020 census).
// For "split" states, majorityParty/majorityEv is the larger share (statewide + most
// districts) and minorityParty/minorityEv is the district that broke the other way.
// Sourced from Wikipedia + archives.gov Electoral College tables.

export type PresidentialParty = "D" | "R" | "split";

export interface PresidentialStateResult {
  party: PresidentialParty;
  ev: number;
  details?: string;
  majorityParty?: "D" | "R";
  majorityEv?: number;
  minorityParty?: "D" | "R";
  minorityEv?: number;
}

export type PresidentialYear = 2016 | 2020 | 2024;

export const PRESIDENTIAL_RESULTS: Record<PresidentialYear, Record<string, PresidentialStateResult>> = {
  "2016": {
    "AL": {
      "party": "R",
      "ev": 9
    },
    "AK": {
      "party": "R",
      "ev": 3
    },
    "AZ": {
      "party": "R",
      "ev": 11
    },
    "AR": {
      "party": "R",
      "ev": 6
    },
    "CA": {
      "party": "D",
      "ev": 55
    },
    "CO": {
      "party": "D",
      "ev": 9
    },
    "CT": {
      "party": "D",
      "ev": 7
    },
    "DE": {
      "party": "D",
      "ev": 3
    },
    "DC": {
      "party": "D",
      "ev": 3
    },
    "FL": {
      "party": "R",
      "ev": 29
    },
    "GA": {
      "party": "R",
      "ev": 16
    },
    "HI": {
      "party": "D",
      "ev": 4
    },
    "ID": {
      "party": "R",
      "ev": 4
    },
    "IL": {
      "party": "D",
      "ev": 20
    },
    "IN": {
      "party": "R",
      "ev": 11
    },
    "IA": {
      "party": "R",
      "ev": 6
    },
    "KS": {
      "party": "R",
      "ev": 6
    },
    "KY": {
      "party": "R",
      "ev": 8
    },
    "LA": {
      "party": "R",
      "ev": 8
    },
    "ME": {
      "party": "split",
      "ev": 4,
      "details": "Clinton (D) won the statewide vote and ME-01, giving her 3 EV; Trump (R) won ME-02, giving him 1 EV.",
      "majorityParty": "D",
      "majorityEv": 3,
      "minorityParty": "R",
      "minorityEv": 1
    },
    "MD": {
      "party": "D",
      "ev": 10
    },
    "MA": {
      "party": "D",
      "ev": 11
    },
    "MI": {
      "party": "R",
      "ev": 16
    },
    "MN": {
      "party": "D",
      "ev": 10
    },
    "MS": {
      "party": "R",
      "ev": 6
    },
    "MO": {
      "party": "R",
      "ev": 10
    },
    "MT": {
      "party": "R",
      "ev": 3
    },
    "NE": {
      "party": "R",
      "ev": 5
    },
    "NV": {
      "party": "D",
      "ev": 6
    },
    "NH": {
      "party": "D",
      "ev": 4
    },
    "NJ": {
      "party": "D",
      "ev": 14
    },
    "NM": {
      "party": "D",
      "ev": 5
    },
    "NY": {
      "party": "D",
      "ev": 29
    },
    "NC": {
      "party": "R",
      "ev": 15
    },
    "ND": {
      "party": "R",
      "ev": 3
    },
    "OH": {
      "party": "R",
      "ev": 18
    },
    "OK": {
      "party": "R",
      "ev": 7
    },
    "OR": {
      "party": "D",
      "ev": 7
    },
    "PA": {
      "party": "R",
      "ev": 20
    },
    "RI": {
      "party": "D",
      "ev": 4
    },
    "SC": {
      "party": "R",
      "ev": 9
    },
    "SD": {
      "party": "R",
      "ev": 3
    },
    "TN": {
      "party": "R",
      "ev": 11
    },
    "TX": {
      "party": "R",
      "ev": 38
    },
    "UT": {
      "party": "R",
      "ev": 6
    },
    "VT": {
      "party": "D",
      "ev": 3
    },
    "VA": {
      "party": "D",
      "ev": 13
    },
    "WA": {
      "party": "D",
      "ev": 12
    },
    "WV": {
      "party": "R",
      "ev": 5
    },
    "WI": {
      "party": "R",
      "ev": 10
    },
    "WY": {
      "party": "R",
      "ev": 3
    }
  },
  "2020": {
    "AL": {
      "party": "R",
      "ev": 9
    },
    "AK": {
      "party": "R",
      "ev": 3
    },
    "AZ": {
      "party": "D",
      "ev": 11
    },
    "AR": {
      "party": "R",
      "ev": 6
    },
    "CA": {
      "party": "D",
      "ev": 55
    },
    "CO": {
      "party": "D",
      "ev": 9
    },
    "CT": {
      "party": "D",
      "ev": 7
    },
    "DE": {
      "party": "D",
      "ev": 3
    },
    "DC": {
      "party": "D",
      "ev": 3
    },
    "FL": {
      "party": "R",
      "ev": 29
    },
    "GA": {
      "party": "D",
      "ev": 16
    },
    "HI": {
      "party": "D",
      "ev": 4
    },
    "ID": {
      "party": "R",
      "ev": 4
    },
    "IL": {
      "party": "D",
      "ev": 20
    },
    "IN": {
      "party": "R",
      "ev": 11
    },
    "IA": {
      "party": "R",
      "ev": 6
    },
    "KS": {
      "party": "R",
      "ev": 6
    },
    "KY": {
      "party": "R",
      "ev": 8
    },
    "LA": {
      "party": "R",
      "ev": 8
    },
    "ME": {
      "party": "split",
      "ev": 4,
      "details": "Biden (D) won the statewide vote and ME-01, giving him 3 EV; Trump (R) won ME-02, giving him 1 EV.",
      "majorityParty": "D",
      "majorityEv": 3,
      "minorityParty": "R",
      "minorityEv": 1
    },
    "MD": {
      "party": "D",
      "ev": 10
    },
    "MA": {
      "party": "D",
      "ev": 11
    },
    "MI": {
      "party": "D",
      "ev": 16
    },
    "MN": {
      "party": "D",
      "ev": 10
    },
    "MS": {
      "party": "R",
      "ev": 6
    },
    "MO": {
      "party": "R",
      "ev": 10
    },
    "MT": {
      "party": "R",
      "ev": 3
    },
    "NE": {
      "party": "split",
      "ev": 5,
      "details": "Trump (R) won the statewide vote, NE-01, and NE-03, giving him 4 EV; Biden (D) won NE-02, giving him 1 EV.",
      "majorityParty": "R",
      "majorityEv": 4,
      "minorityParty": "D",
      "minorityEv": 1
    },
    "NV": {
      "party": "D",
      "ev": 6
    },
    "NH": {
      "party": "D",
      "ev": 4
    },
    "NJ": {
      "party": "D",
      "ev": 14
    },
    "NM": {
      "party": "D",
      "ev": 5
    },
    "NY": {
      "party": "D",
      "ev": 29
    },
    "NC": {
      "party": "R",
      "ev": 15
    },
    "ND": {
      "party": "R",
      "ev": 3
    },
    "OH": {
      "party": "R",
      "ev": 18
    },
    "OK": {
      "party": "R",
      "ev": 7
    },
    "OR": {
      "party": "D",
      "ev": 7
    },
    "PA": {
      "party": "D",
      "ev": 20
    },
    "RI": {
      "party": "D",
      "ev": 4
    },
    "SC": {
      "party": "R",
      "ev": 9
    },
    "SD": {
      "party": "R",
      "ev": 3
    },
    "TN": {
      "party": "R",
      "ev": 11
    },
    "TX": {
      "party": "R",
      "ev": 38
    },
    "UT": {
      "party": "R",
      "ev": 6
    },
    "VT": {
      "party": "D",
      "ev": 3
    },
    "VA": {
      "party": "D",
      "ev": 13
    },
    "WA": {
      "party": "D",
      "ev": 12
    },
    "WV": {
      "party": "R",
      "ev": 5
    },
    "WI": {
      "party": "D",
      "ev": 10
    },
    "WY": {
      "party": "R",
      "ev": 3
    }
  },
  "2024": {
    "AL": {
      "party": "R",
      "ev": 9
    },
    "AK": {
      "party": "R",
      "ev": 3
    },
    "AZ": {
      "party": "R",
      "ev": 11
    },
    "AR": {
      "party": "R",
      "ev": 6
    },
    "CA": {
      "party": "D",
      "ev": 54
    },
    "CO": {
      "party": "D",
      "ev": 10
    },
    "CT": {
      "party": "D",
      "ev": 7
    },
    "DE": {
      "party": "D",
      "ev": 3
    },
    "DC": {
      "party": "D",
      "ev": 3
    },
    "FL": {
      "party": "R",
      "ev": 30
    },
    "GA": {
      "party": "R",
      "ev": 16
    },
    "HI": {
      "party": "D",
      "ev": 4
    },
    "ID": {
      "party": "R",
      "ev": 4
    },
    "IL": {
      "party": "D",
      "ev": 19
    },
    "IN": {
      "party": "R",
      "ev": 11
    },
    "IA": {
      "party": "R",
      "ev": 6
    },
    "KS": {
      "party": "R",
      "ev": 6
    },
    "KY": {
      "party": "R",
      "ev": 8
    },
    "LA": {
      "party": "R",
      "ev": 8
    },
    "ME": {
      "party": "split",
      "ev": 4,
      "details": "Harris (D) won the statewide vote and ME-01, giving her 3 EV; Trump (R) won ME-02, giving him 1 EV.",
      "majorityParty": "D",
      "majorityEv": 3,
      "minorityParty": "R",
      "minorityEv": 1
    },
    "MD": {
      "party": "D",
      "ev": 10
    },
    "MA": {
      "party": "D",
      "ev": 11
    },
    "MI": {
      "party": "R",
      "ev": 15
    },
    "MN": {
      "party": "D",
      "ev": 10
    },
    "MS": {
      "party": "R",
      "ev": 6
    },
    "MO": {
      "party": "R",
      "ev": 10
    },
    "MT": {
      "party": "R",
      "ev": 4
    },
    "NE": {
      "party": "split",
      "ev": 5,
      "details": "Trump (R) won the statewide vote, NE-01, and NE-03, giving him 4 EV; Harris (D) won NE-02, giving her 1 EV.",
      "majorityParty": "R",
      "majorityEv": 4,
      "minorityParty": "D",
      "minorityEv": 1
    },
    "NV": {
      "party": "R",
      "ev": 6
    },
    "NH": {
      "party": "D",
      "ev": 4
    },
    "NJ": {
      "party": "D",
      "ev": 14
    },
    "NM": {
      "party": "D",
      "ev": 5
    },
    "NY": {
      "party": "D",
      "ev": 28
    },
    "NC": {
      "party": "R",
      "ev": 16
    },
    "ND": {
      "party": "R",
      "ev": 3
    },
    "OH": {
      "party": "R",
      "ev": 17
    },
    "OK": {
      "party": "R",
      "ev": 7
    },
    "OR": {
      "party": "D",
      "ev": 8
    },
    "PA": {
      "party": "R",
      "ev": 19
    },
    "RI": {
      "party": "D",
      "ev": 4
    },
    "SC": {
      "party": "R",
      "ev": 9
    },
    "SD": {
      "party": "R",
      "ev": 3
    },
    "TN": {
      "party": "R",
      "ev": 11
    },
    "TX": {
      "party": "R",
      "ev": 40
    },
    "UT": {
      "party": "R",
      "ev": 6
    },
    "VT": {
      "party": "D",
      "ev": 3
    },
    "VA": {
      "party": "D",
      "ev": 13
    },
    "WA": {
      "party": "D",
      "ev": 12
    },
    "WV": {
      "party": "R",
      "ev": 4
    },
    "WI": {
      "party": "R",
      "ev": 10
    },
    "WY": {
      "party": "R",
      "ev": 3
    }
  }
};

export const PRESIDENTIAL_YEARS: PresidentialYear[] = [2016, 2020, 2024];
