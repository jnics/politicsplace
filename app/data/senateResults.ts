// Every U.S. Senate race decided in the November general election of each cycle
// (regular class races, plus any special elections held the same November).
// Independents who caucus with a party (King-ME, Sanders-VT) are marked with that
// party plus a `note`. Where a state had two races on the same ballot for the SAME
// seat (an appointee winning both a special and the concurrent regular election,
// e.g. CA 2022 & 2024), both entries are kept for reference but they never disagree
// on party. Sourced from Wikipedia's "20XX United States Senate elections" articles.

export type SenatePartyLetter = "D" | "R";

export interface SenateRaceResult {
  state: string;
  winner: string;
  party: SenatePartyLetter;
  special: boolean;
  note?: string;
}

export type SenateCycleYear = 2016 | 2018 | 2020 | 2022 | 2024;

export const SENATE_RESULTS: Record<SenateCycleYear, SenateRaceResult[]> = {
  "2016": [
    {
      "state": "AL",
      "winner": "Richard Shelby",
      "party": "R",
      "special": false
    },
    {
      "state": "AK",
      "winner": "Lisa Murkowski",
      "party": "R",
      "special": false
    },
    {
      "state": "AZ",
      "winner": "John McCain",
      "party": "R",
      "special": false
    },
    {
      "state": "AR",
      "winner": "John Boozman",
      "party": "R",
      "special": false
    },
    {
      "state": "CA",
      "winner": "Kamala Harris",
      "party": "D",
      "special": false
    },
    {
      "state": "CO",
      "winner": "Michael Bennet",
      "party": "D",
      "special": false
    },
    {
      "state": "CT",
      "winner": "Richard Blumenthal",
      "party": "D",
      "special": false
    },
    {
      "state": "FL",
      "winner": "Marco Rubio",
      "party": "R",
      "special": false
    },
    {
      "state": "GA",
      "winner": "Johnny Isakson",
      "party": "R",
      "special": false
    },
    {
      "state": "HI",
      "winner": "Brian Schatz",
      "party": "D",
      "special": false
    },
    {
      "state": "ID",
      "winner": "Mike Crapo",
      "party": "R",
      "special": false
    },
    {
      "state": "IL",
      "winner": "Tammy Duckworth",
      "party": "D",
      "special": false
    },
    {
      "state": "IN",
      "winner": "Todd Young",
      "party": "R",
      "special": false
    },
    {
      "state": "IA",
      "winner": "Chuck Grassley",
      "party": "R",
      "special": false
    },
    {
      "state": "KS",
      "winner": "Jerry Moran",
      "party": "R",
      "special": false
    },
    {
      "state": "KY",
      "winner": "Rand Paul",
      "party": "R",
      "special": false
    },
    {
      "state": "LA",
      "winner": "John Kennedy",
      "party": "R",
      "special": false
    },
    {
      "state": "MD",
      "winner": "Chris Van Hollen",
      "party": "D",
      "special": false
    },
    {
      "state": "MO",
      "winner": "Roy Blunt",
      "party": "R",
      "special": false
    },
    {
      "state": "NV",
      "winner": "Catherine Cortez Masto",
      "party": "D",
      "special": false
    },
    {
      "state": "NH",
      "winner": "Maggie Hassan",
      "party": "D",
      "special": false
    },
    {
      "state": "NY",
      "winner": "Chuck Schumer",
      "party": "D",
      "special": false
    },
    {
      "state": "NC",
      "winner": "Richard Burr",
      "party": "R",
      "special": false
    },
    {
      "state": "ND",
      "winner": "John Hoeven",
      "party": "R",
      "special": false
    },
    {
      "state": "OH",
      "winner": "Rob Portman",
      "party": "R",
      "special": false
    },
    {
      "state": "OK",
      "winner": "James Lankford",
      "party": "R",
      "special": false
    },
    {
      "state": "OR",
      "winner": "Ron Wyden",
      "party": "D",
      "special": false
    },
    {
      "state": "PA",
      "winner": "Pat Toomey",
      "party": "R",
      "special": false
    },
    {
      "state": "SC",
      "winner": "Tim Scott",
      "party": "R",
      "special": false
    },
    {
      "state": "SD",
      "winner": "John Thune",
      "party": "R",
      "special": false
    },
    {
      "state": "UT",
      "winner": "Mike Lee",
      "party": "R",
      "special": false
    },
    {
      "state": "VT",
      "winner": "Patrick Leahy",
      "party": "D",
      "special": false
    },
    {
      "state": "WA",
      "winner": "Patty Murray",
      "party": "D",
      "special": false
    },
    {
      "state": "WI",
      "winner": "Ron Johnson",
      "party": "R",
      "special": false
    }
  ],
  "2018": [
    {
      "state": "AZ",
      "winner": "Kyrsten Sinema",
      "party": "D",
      "special": false
    },
    {
      "state": "CA",
      "winner": "Dianne Feinstein",
      "party": "D",
      "special": false
    },
    {
      "state": "CT",
      "winner": "Chris Murphy",
      "party": "D",
      "special": false
    },
    {
      "state": "DE",
      "winner": "Tom Carper",
      "party": "D",
      "special": false
    },
    {
      "state": "FL",
      "winner": "Rick Scott",
      "party": "R",
      "special": false
    },
    {
      "state": "HI",
      "winner": "Mazie Hirono",
      "party": "D",
      "special": false
    },
    {
      "state": "IN",
      "winner": "Mike Braun",
      "party": "R",
      "special": false
    },
    {
      "state": "ME",
      "winner": "Angus King",
      "party": "D",
      "special": false,
      "note": "Independent; caucuses with Democrats"
    },
    {
      "state": "MD",
      "winner": "Ben Cardin",
      "party": "D",
      "special": false
    },
    {
      "state": "MA",
      "winner": "Elizabeth Warren",
      "party": "D",
      "special": false
    },
    {
      "state": "MI",
      "winner": "Debbie Stabenow",
      "party": "D",
      "special": false
    },
    {
      "state": "MN",
      "winner": "Amy Klobuchar",
      "party": "D",
      "special": false,
      "note": "Regular election (separate from MN special same year)"
    },
    {
      "state": "MN",
      "winner": "Tina Smith",
      "party": "D",
      "special": true,
      "note": "Special election to fill remainder of Al Franken's term after his resignation; Smith had been appointed to the seat"
    },
    {
      "state": "MS",
      "winner": "Roger Wicker",
      "party": "R",
      "special": false,
      "note": "Regular election (separate from MS special same year)"
    },
    {
      "state": "MS",
      "winner": "Cindy Hyde-Smith",
      "party": "R",
      "special": true,
      "note": "Special election (runoff) to fill remainder of Thad Cochran's term after his resignation; Hyde-Smith had been appointed to the seat"
    },
    {
      "state": "MO",
      "winner": "Josh Hawley",
      "party": "R",
      "special": false
    },
    {
      "state": "MT",
      "winner": "Jon Tester",
      "party": "D",
      "special": false
    },
    {
      "state": "NE",
      "winner": "Deb Fischer",
      "party": "R",
      "special": false
    },
    {
      "state": "NV",
      "winner": "Jacky Rosen",
      "party": "D",
      "special": false
    },
    {
      "state": "NJ",
      "winner": "Bob Menendez",
      "party": "D",
      "special": false
    },
    {
      "state": "NM",
      "winner": "Martin Heinrich",
      "party": "D",
      "special": false
    },
    {
      "state": "NY",
      "winner": "Kirsten Gillibrand",
      "party": "D",
      "special": false
    },
    {
      "state": "ND",
      "winner": "Kevin Cramer",
      "party": "R",
      "special": false
    },
    {
      "state": "OH",
      "winner": "Sherrod Brown",
      "party": "D",
      "special": false
    },
    {
      "state": "PA",
      "winner": "Bob Casey Jr.",
      "party": "D",
      "special": false
    },
    {
      "state": "RI",
      "winner": "Sheldon Whitehouse",
      "party": "D",
      "special": false
    },
    {
      "state": "TN",
      "winner": "Marsha Blackburn",
      "party": "R",
      "special": false
    },
    {
      "state": "TX",
      "winner": "Ted Cruz",
      "party": "R",
      "special": false
    },
    {
      "state": "UT",
      "winner": "Mitt Romney",
      "party": "R",
      "special": false
    },
    {
      "state": "VT",
      "winner": "Bernie Sanders",
      "party": "D",
      "special": false,
      "note": "Independent; caucuses with Democrats"
    },
    {
      "state": "VA",
      "winner": "Tim Kaine",
      "party": "D",
      "special": false
    },
    {
      "state": "WA",
      "winner": "Maria Cantwell",
      "party": "D",
      "special": false
    },
    {
      "state": "WV",
      "winner": "Joe Manchin",
      "party": "D",
      "special": false
    },
    {
      "state": "WI",
      "winner": "Tammy Baldwin",
      "party": "D",
      "special": false
    },
    {
      "state": "WY",
      "winner": "John Barrasso",
      "party": "R",
      "special": false
    }
  ],
  "2020": [
    {
      "state": "AL",
      "winner": "Tommy Tuberville",
      "party": "R",
      "special": false
    },
    {
      "state": "AK",
      "winner": "Dan Sullivan",
      "party": "R",
      "special": false
    },
    {
      "state": "AZ",
      "winner": "Mark Kelly",
      "party": "D",
      "special": true,
      "note": "Special election (Class 3 seat) to fill remainder of John McCain's term; won a full term in 2022"
    },
    {
      "state": "AR",
      "winner": "Tom Cotton",
      "party": "R",
      "special": false
    },
    {
      "state": "CO",
      "winner": "John Hickenlooper",
      "party": "D",
      "special": false
    },
    {
      "state": "DE",
      "winner": "Chris Coons",
      "party": "D",
      "special": false
    },
    {
      "state": "GA",
      "winner": "Jon Ossoff",
      "party": "D",
      "special": false,
      "note": "Regular election, decided in January 2021 runoff (separate from GA special same cycle)"
    },
    {
      "state": "GA",
      "winner": "Raphael Warnock",
      "party": "D",
      "special": true,
      "note": "Special election to fill remainder of Johnny Isakson's term after his resignation; decided in January 2021 runoff"
    },
    {
      "state": "ID",
      "winner": "Jim Risch",
      "party": "R",
      "special": false
    },
    {
      "state": "IL",
      "winner": "Dick Durbin",
      "party": "D",
      "special": false
    },
    {
      "state": "IA",
      "winner": "Joni Ernst",
      "party": "R",
      "special": false
    },
    {
      "state": "KS",
      "winner": "Roger Marshall",
      "party": "R",
      "special": false
    },
    {
      "state": "KY",
      "winner": "Mitch McConnell",
      "party": "R",
      "special": false
    },
    {
      "state": "LA",
      "winner": "Bill Cassidy",
      "party": "R",
      "special": false
    },
    {
      "state": "ME",
      "winner": "Susan Collins",
      "party": "R",
      "special": false
    },
    {
      "state": "MA",
      "winner": "Ed Markey",
      "party": "D",
      "special": false
    },
    {
      "state": "MI",
      "winner": "Gary Peters",
      "party": "D",
      "special": false
    },
    {
      "state": "MN",
      "winner": "Tina Smith",
      "party": "D",
      "special": false
    },
    {
      "state": "MS",
      "winner": "Cindy Hyde-Smith",
      "party": "R",
      "special": false
    },
    {
      "state": "MT",
      "winner": "Steve Daines",
      "party": "R",
      "special": false
    },
    {
      "state": "NE",
      "winner": "Ben Sasse",
      "party": "R",
      "special": false
    },
    {
      "state": "NH",
      "winner": "Jeanne Shaheen",
      "party": "D",
      "special": false
    },
    {
      "state": "NJ",
      "winner": "Cory Booker",
      "party": "D",
      "special": false
    },
    {
      "state": "NM",
      "winner": "Ben Ray Lujan",
      "party": "D",
      "special": false
    },
    {
      "state": "NC",
      "winner": "Thom Tillis",
      "party": "R",
      "special": false
    },
    {
      "state": "OK",
      "winner": "Jim Inhofe",
      "party": "R",
      "special": false
    },
    {
      "state": "OR",
      "winner": "Jeff Merkley",
      "party": "D",
      "special": false
    },
    {
      "state": "RI",
      "winner": "Jack Reed",
      "party": "D",
      "special": false
    },
    {
      "state": "SC",
      "winner": "Lindsey Graham",
      "party": "R",
      "special": false
    },
    {
      "state": "SD",
      "winner": "Mike Rounds",
      "party": "R",
      "special": false
    },
    {
      "state": "TN",
      "winner": "Bill Hagerty",
      "party": "R",
      "special": false
    },
    {
      "state": "TX",
      "winner": "John Cornyn",
      "party": "R",
      "special": false
    },
    {
      "state": "VA",
      "winner": "Mark Warner",
      "party": "D",
      "special": false
    },
    {
      "state": "WV",
      "winner": "Shelley Moore Capito",
      "party": "R",
      "special": false
    },
    {
      "state": "WY",
      "winner": "Cynthia Lummis",
      "party": "R",
      "special": false
    }
  ],
  "2022": [
    {
      "state": "AL",
      "winner": "Katie Britt",
      "party": "R",
      "special": false
    },
    {
      "state": "AK",
      "winner": "Lisa Murkowski",
      "party": "R",
      "special": false
    },
    {
      "state": "AZ",
      "winner": "Mark Kelly",
      "party": "D",
      "special": false
    },
    {
      "state": "AR",
      "winner": "John Boozman",
      "party": "R",
      "special": false
    },
    {
      "state": "CA",
      "winner": "Alex Padilla",
      "party": "D",
      "special": false,
      "note": "Regular election (separate from CA special same year)"
    },
    {
      "state": "CA",
      "winner": "Alex Padilla",
      "party": "D",
      "special": true,
      "note": "Special election to fill remainder of Kamala Harris's term after she became Vice President; Padilla had been appointed to the seat and won both races on the same ballot"
    },
    {
      "state": "CO",
      "winner": "Michael Bennet",
      "party": "D",
      "special": false
    },
    {
      "state": "CT",
      "winner": "Richard Blumenthal",
      "party": "D",
      "special": false
    },
    {
      "state": "FL",
      "winner": "Marco Rubio",
      "party": "R",
      "special": false
    },
    {
      "state": "GA",
      "winner": "Raphael Warnock",
      "party": "D",
      "special": false,
      "note": "Full-term regular election, decided in December 2022 runoff"
    },
    {
      "state": "HI",
      "winner": "Brian Schatz",
      "party": "D",
      "special": false
    },
    {
      "state": "ID",
      "winner": "Mike Crapo",
      "party": "R",
      "special": false
    },
    {
      "state": "IL",
      "winner": "Tammy Duckworth",
      "party": "D",
      "special": false
    },
    {
      "state": "IN",
      "winner": "Todd Young",
      "party": "R",
      "special": false
    },
    {
      "state": "IA",
      "winner": "Chuck Grassley",
      "party": "R",
      "special": false
    },
    {
      "state": "KS",
      "winner": "Jerry Moran",
      "party": "R",
      "special": false
    },
    {
      "state": "KY",
      "winner": "Rand Paul",
      "party": "R",
      "special": false
    },
    {
      "state": "LA",
      "winner": "John Kennedy",
      "party": "R",
      "special": false
    },
    {
      "state": "MD",
      "winner": "Chris Van Hollen",
      "party": "D",
      "special": false
    },
    {
      "state": "MO",
      "winner": "Eric Schmitt",
      "party": "R",
      "special": false
    },
    {
      "state": "NV",
      "winner": "Catherine Cortez Masto",
      "party": "D",
      "special": false
    },
    {
      "state": "NH",
      "winner": "Maggie Hassan",
      "party": "D",
      "special": false
    },
    {
      "state": "NY",
      "winner": "Chuck Schumer",
      "party": "D",
      "special": false
    },
    {
      "state": "NC",
      "winner": "Ted Budd",
      "party": "R",
      "special": false
    },
    {
      "state": "ND",
      "winner": "John Hoeven",
      "party": "R",
      "special": false
    },
    {
      "state": "OH",
      "winner": "JD Vance",
      "party": "R",
      "special": false
    },
    {
      "state": "OK",
      "winner": "James Lankford",
      "party": "R",
      "special": false,
      "note": "Regular election (separate from OK special same year)"
    },
    {
      "state": "OK",
      "winner": "Markwayne Mullin",
      "party": "R",
      "special": true,
      "note": "Special election to fill remainder of Jim Inhofe's term after his resignation"
    },
    {
      "state": "OR",
      "winner": "Ron Wyden",
      "party": "D",
      "special": false
    },
    {
      "state": "PA",
      "winner": "John Fetterman",
      "party": "D",
      "special": false
    },
    {
      "state": "SC",
      "winner": "Tim Scott",
      "party": "R",
      "special": false
    },
    {
      "state": "SD",
      "winner": "John Thune",
      "party": "R",
      "special": false
    },
    {
      "state": "UT",
      "winner": "Mike Lee",
      "party": "R",
      "special": false
    },
    {
      "state": "VT",
      "winner": "Peter Welch",
      "party": "D",
      "special": false
    },
    {
      "state": "WA",
      "winner": "Patty Murray",
      "party": "D",
      "special": false
    },
    {
      "state": "WI",
      "winner": "Ron Johnson",
      "party": "R",
      "special": false
    }
  ],
  "2024": [
    {
      "state": "AZ",
      "winner": "Ruben Gallego",
      "party": "D",
      "special": false
    },
    {
      "state": "CA",
      "winner": "Adam Schiff",
      "party": "D",
      "special": false,
      "note": "Regular election (separate from CA special same year)"
    },
    {
      "state": "CA",
      "winner": "Adam Schiff",
      "party": "D",
      "special": true,
      "note": "Special election to fill remainder of Dianne Feinstein's term after her death; Laphonza Butler had been appointed to the seat but did not run; Schiff won both races on the same ballot"
    },
    {
      "state": "CT",
      "winner": "Chris Murphy",
      "party": "D",
      "special": false
    },
    {
      "state": "DE",
      "winner": "Lisa Blunt Rochester",
      "party": "D",
      "special": false
    },
    {
      "state": "FL",
      "winner": "Rick Scott",
      "party": "R",
      "special": false
    },
    {
      "state": "HI",
      "winner": "Mazie Hirono",
      "party": "D",
      "special": false
    },
    {
      "state": "IN",
      "winner": "Jim Banks",
      "party": "R",
      "special": false
    },
    {
      "state": "ME",
      "winner": "Angus King",
      "party": "D",
      "special": false,
      "note": "Independent; caucuses with Democrats"
    },
    {
      "state": "MD",
      "winner": "Angela Alsobrooks",
      "party": "D",
      "special": false
    },
    {
      "state": "MA",
      "winner": "Elizabeth Warren",
      "party": "D",
      "special": false
    },
    {
      "state": "MI",
      "winner": "Elissa Slotkin",
      "party": "D",
      "special": false
    },
    {
      "state": "MN",
      "winner": "Amy Klobuchar",
      "party": "D",
      "special": false
    },
    {
      "state": "MS",
      "winner": "Roger Wicker",
      "party": "R",
      "special": false
    },
    {
      "state": "MO",
      "winner": "Josh Hawley",
      "party": "R",
      "special": false
    },
    {
      "state": "MT",
      "winner": "Tim Sheehy",
      "party": "R",
      "special": false
    },
    {
      "state": "NE",
      "winner": "Deb Fischer",
      "party": "R",
      "special": false,
      "note": "Regular election (separate from NE special same year)"
    },
    {
      "state": "NE",
      "winner": "Pete Ricketts",
      "party": "R",
      "special": true,
      "note": "Special election to fill remainder of Ben Sasse's term after his resignation; Ricketts had been appointed to the seat"
    },
    {
      "state": "NV",
      "winner": "Jacky Rosen",
      "party": "D",
      "special": false
    },
    {
      "state": "NJ",
      "winner": "Andy Kim",
      "party": "D",
      "special": false
    },
    {
      "state": "NM",
      "winner": "Martin Heinrich",
      "party": "D",
      "special": false
    },
    {
      "state": "NY",
      "winner": "Kirsten Gillibrand",
      "party": "D",
      "special": false
    },
    {
      "state": "ND",
      "winner": "Kevin Cramer",
      "party": "R",
      "special": false
    },
    {
      "state": "OH",
      "winner": "Bernie Moreno",
      "party": "R",
      "special": false
    },
    {
      "state": "PA",
      "winner": "Dave McCormick",
      "party": "R",
      "special": false
    },
    {
      "state": "RI",
      "winner": "Sheldon Whitehouse",
      "party": "D",
      "special": false
    },
    {
      "state": "TN",
      "winner": "Marsha Blackburn",
      "party": "R",
      "special": false
    },
    {
      "state": "TX",
      "winner": "Ted Cruz",
      "party": "R",
      "special": false
    },
    {
      "state": "UT",
      "winner": "John Curtis",
      "party": "R",
      "special": false
    },
    {
      "state": "VT",
      "winner": "Bernie Sanders",
      "party": "D",
      "special": false,
      "note": "Independent; caucuses with Democrats"
    },
    {
      "state": "VA",
      "winner": "Tim Kaine",
      "party": "D",
      "special": false
    },
    {
      "state": "WA",
      "winner": "Maria Cantwell",
      "party": "D",
      "special": false
    },
    {
      "state": "WV",
      "winner": "Jim Justice",
      "party": "R",
      "special": false
    },
    {
      "state": "WI",
      "winner": "Tammy Baldwin",
      "party": "D",
      "special": false
    },
    {
      "state": "WY",
      "winner": "John Barrasso",
      "party": "R",
      "special": false
    }
  ]
};

export const SENATE_CYCLE_YEARS: SenateCycleYear[] = [2016, 2018, 2020, 2022, 2024];
