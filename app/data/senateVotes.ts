// Winner/runner-up vote counts and percentages for every Senate race,
// 2016-2024. Keyed the same way as SENATE_RESULTS (see senateResults.ts) --
// where a state has two entries in the same year (a regular + special
// ballot line), match them up by array order / `special` flag, not just by
// state code. Sourced primarily from Wikipedia's per-state "20XX United
// States Senate election in [State]" articles; see project research notes.

export interface SenateCandidateVote {
  name: string;
  party: string;
  votes: number;
  pct: number;
}

export interface SenateVoteEntry {
  state: string;
  winner: SenateCandidateVote;
  runnerUp: SenateCandidateVote;
  special?: boolean;
  note?: string;
}

export const SENATE_VOTES: Record<string, SenateVoteEntry[]> = {
  "2016": [
    {
      "state": "AL",
      "winner": {
        "name": "Richard Shelby",
        "party": "R",
        "votes": 1335104,
        "pct": 63.9
      },
      "runnerUp": {
        "name": "Ron Crumpton",
        "party": "D",
        "votes": 748709,
        "pct": 35.8
      }
    },
    {
      "state": "AK",
      "winner": {
        "name": "Lisa Murkowski",
        "party": "R",
        "votes": 138149,
        "pct": 44.4
      },
      "runnerUp": {
        "name": "Joe Miller",
        "party": "L",
        "votes": 90825,
        "pct": 29.2
      }
    },
    {
      "state": "AZ",
      "winner": {
        "name": "John McCain",
        "party": "R",
        "votes": 1359267,
        "pct": 53.7
      },
      "runnerUp": {
        "name": "Ann Kirkpatrick",
        "party": "D",
        "votes": 1031245,
        "pct": 40.7
      }
    },
    {
      "state": "AR",
      "winner": {
        "name": "John Boozman",
        "party": "R",
        "votes": 661984,
        "pct": 59.8
      },
      "runnerUp": {
        "name": "Conner Eldridge",
        "party": "D",
        "votes": 400602,
        "pct": 36.2
      }
    },
    {
      "state": "CA",
      "winner": {
        "name": "Kamala Harris",
        "party": "D",
        "votes": 7542753,
        "pct": 61.6
      },
      "runnerUp": {
        "name": "Loretta Sanchez",
        "party": "D",
        "votes": 4710417,
        "pct": 38.4
      }
    },
    {
      "state": "CO",
      "winner": {
        "name": "Michael Bennet",
        "party": "D",
        "votes": 1370710,
        "pct": 50.0
      },
      "runnerUp": {
        "name": "Darryl Glenn",
        "party": "R",
        "votes": 1215318,
        "pct": 44.3
      }
    },
    {
      "state": "CT",
      "winner": {
        "name": "Richard Blumenthal",
        "party": "D",
        "votes": 1008714,
        "pct": 63.2
      },
      "runnerUp": {
        "name": "Dan Carter",
        "party": "R",
        "votes": 552621,
        "pct": 34.6
      }
    },
    {
      "state": "FL",
      "winner": {
        "name": "Marco Rubio",
        "party": "R",
        "votes": 4835191,
        "pct": 52.0
      },
      "runnerUp": {
        "name": "Patrick Murphy",
        "party": "D",
        "votes": 4122088,
        "pct": 44.3
      }
    },
    {
      "state": "GA",
      "winner": {
        "name": "Johnny Isakson",
        "party": "R",
        "votes": 2135806,
        "pct": 54.8
      },
      "runnerUp": {
        "name": "Jim Barksdale",
        "party": "D",
        "votes": 1599726,
        "pct": 41.0
      }
    },
    {
      "state": "HI",
      "winner": {
        "name": "Brian Schatz",
        "party": "D",
        "votes": 306604,
        "pct": 73.6
      },
      "runnerUp": {
        "name": "John Carroll",
        "party": "R",
        "votes": 92653,
        "pct": 22.2
      }
    },
    {
      "state": "ID",
      "winner": {
        "name": "Mike Crapo",
        "party": "R",
        "votes": 449017,
        "pct": 66.1
      },
      "runnerUp": {
        "name": "Jerry Sturgill",
        "party": "D",
        "votes": 188249,
        "pct": 27.7
      }
    },
    {
      "state": "IL",
      "winner": {
        "name": "Tammy Duckworth",
        "party": "D",
        "votes": 3012940,
        "pct": 54.9
      },
      "runnerUp": {
        "name": "Mark Kirk",
        "party": "R",
        "votes": 2184692,
        "pct": 39.8
      }
    },
    {
      "state": "IN",
      "winner": {
        "name": "Todd Young",
        "party": "R",
        "votes": 1423991,
        "pct": 52.1
      },
      "runnerUp": {
        "name": "Evan Bayh",
        "party": "D",
        "votes": 1158947,
        "pct": 42.4
      }
    },
    {
      "state": "IA",
      "winner": {
        "name": "Chuck Grassley",
        "party": "R",
        "votes": 926007,
        "pct": 60.1
      },
      "runnerUp": {
        "name": "Patty Judge",
        "party": "D",
        "votes": 549460,
        "pct": 35.7
      }
    },
    {
      "state": "KS",
      "winner": {
        "name": "Jerry Moran",
        "party": "R",
        "votes": 732376,
        "pct": 62.2
      },
      "runnerUp": {
        "name": "Patrick Wiesner",
        "party": "D",
        "votes": 379740,
        "pct": 32.2
      }
    },
    {
      "state": "KY",
      "winner": {
        "name": "Rand Paul",
        "party": "R",
        "votes": 1090177,
        "pct": 57.3
      },
      "runnerUp": {
        "name": "Jim Gray",
        "party": "D",
        "votes": 813246,
        "pct": 42.7
      }
    },
    {
      "state": "LA",
      "winner": {
        "name": "John Kennedy",
        "party": "R",
        "votes": 536191,
        "pct": 60.7
      },
      "runnerUp": {
        "name": "Foster Campbell",
        "party": "D",
        "votes": 347816,
        "pct": 39.3
      },
      "note": "Decided in December 10, 2016 runoff (jungle primary system)"
    },
    {
      "state": "MD",
      "winner": {
        "name": "Chris Van Hollen",
        "party": "D",
        "votes": 1659907,
        "pct": 60.9
      },
      "runnerUp": {
        "name": "Kathy Szeliga",
        "party": "R",
        "votes": 972557,
        "pct": 35.7
      }
    },
    {
      "state": "MO",
      "winner": {
        "name": "Roy Blunt",
        "party": "R",
        "votes": 1378458,
        "pct": 49.2
      },
      "runnerUp": {
        "name": "Jason Kander",
        "party": "D",
        "votes": 1300200,
        "pct": 46.4
      }
    },
    {
      "state": "NV",
      "winner": {
        "name": "Catherine Cortez Masto",
        "party": "D",
        "votes": 521994,
        "pct": 47.1
      },
      "runnerUp": {
        "name": "Joe Heck",
        "party": "R",
        "votes": 495079,
        "pct": 44.7
      }
    },
    {
      "state": "NH",
      "winner": {
        "name": "Maggie Hassan",
        "party": "D",
        "votes": 354649,
        "pct": 48.0
      },
      "runnerUp": {
        "name": "Kelly Ayotte",
        "party": "R",
        "votes": 353632,
        "pct": 47.9
      }
    },
    {
      "state": "NY",
      "winner": {
        "name": "Chuck Schumer",
        "party": "D",
        "votes": 5182006,
        "pct": 70.7
      },
      "runnerUp": {
        "name": "Wendy Long",
        "party": "R",
        "votes": 1988261,
        "pct": 27.1
      }
    },
    {
      "state": "NC",
      "winner": {
        "name": "Richard Burr",
        "party": "R",
        "votes": 2395376,
        "pct": 51.1
      },
      "runnerUp": {
        "name": "Deborah Ross",
        "party": "D",
        "votes": 2128165,
        "pct": 45.4
      }
    },
    {
      "state": "ND",
      "winner": {
        "name": "John Hoeven",
        "party": "R",
        "votes": 268788,
        "pct": 78.5
      },
      "runnerUp": {
        "name": "Eliot Glassheim",
        "party": "D",
        "votes": 58116,
        "pct": 17.0
      }
    },
    {
      "state": "OH",
      "winner": {
        "name": "Rob Portman",
        "party": "R",
        "votes": 3118567,
        "pct": 58.0
      },
      "runnerUp": {
        "name": "Ted Strickland",
        "party": "D",
        "votes": 1996908,
        "pct": 37.2
      }
    },
    {
      "state": "OK",
      "winner": {
        "name": "James Lankford",
        "party": "R",
        "votes": 980892,
        "pct": 67.7
      },
      "runnerUp": {
        "name": "Mike Workman",
        "party": "D",
        "votes": 355911,
        "pct": 24.6
      }
    },
    {
      "state": "OR",
      "winner": {
        "name": "Ron Wyden",
        "party": "D",
        "votes": 1105119,
        "pct": 56.6
      },
      "runnerUp": {
        "name": "Mark Callahan",
        "party": "R",
        "votes": 651106,
        "pct": 33.3
      }
    },
    {
      "state": "PA",
      "winner": {
        "name": "Pat Toomey",
        "party": "R",
        "votes": 2951702,
        "pct": 48.8
      },
      "runnerUp": {
        "name": "Katie McGinty",
        "party": "D",
        "votes": 2865012,
        "pct": 47.3
      }
    },
    {
      "state": "SC",
      "winner": {
        "name": "Tim Scott",
        "party": "R",
        "votes": 1241609,
        "pct": 60.6
      },
      "runnerUp": {
        "name": "Thomas Dixon",
        "party": "D",
        "votes": 757022,
        "pct": 36.9
      }
    },
    {
      "state": "SD",
      "winner": {
        "name": "John Thune",
        "party": "R",
        "votes": 265516,
        "pct": 71.8
      },
      "runnerUp": {
        "name": "Jay Williams",
        "party": "D",
        "votes": 104140,
        "pct": 28.2
      }
    },
    {
      "state": "UT",
      "winner": {
        "name": "Mike Lee",
        "party": "R",
        "votes": 760220,
        "pct": 68.1
      },
      "runnerUp": {
        "name": "Misty Snow",
        "party": "D",
        "votes": 301858,
        "pct": 27.1
      }
    },
    {
      "state": "VT",
      "winner": {
        "name": "Patrick Leahy",
        "party": "D",
        "votes": 192243,
        "pct": 61.3
      },
      "runnerUp": {
        "name": "Scott Milne",
        "party": "R",
        "votes": 103637,
        "pct": 33.0
      }
    },
    {
      "state": "WA",
      "winner": {
        "name": "Patty Murray",
        "party": "D",
        "votes": 1913979,
        "pct": 59.0
      },
      "runnerUp": {
        "name": "Chris Vance",
        "party": "R",
        "votes": 1329338,
        "pct": 41.0
      }
    },
    {
      "state": "WI",
      "winner": {
        "name": "Ron Johnson",
        "party": "R",
        "votes": 1479471,
        "pct": 50.2
      },
      "runnerUp": {
        "name": "Russ Feingold",
        "party": "D",
        "votes": 1380335,
        "pct": 46.8
      }
    }
  ],
  "2018": [
    {
      "state": "AZ",
      "winner": {
        "name": "Kyrsten Sinema",
        "party": "D",
        "votes": 1191100,
        "pct": 50.0
      },
      "runnerUp": {
        "name": "Martha McSally",
        "party": "R",
        "votes": 1135200,
        "pct": 47.6
      }
    },
    {
      "state": "CA",
      "winner": {
        "name": "Dianne Feinstein",
        "party": "D",
        "votes": 6019422,
        "pct": 54.2
      },
      "runnerUp": {
        "name": "Kevin de Leon",
        "party": "D",
        "votes": 5093942,
        "pct": 45.8
      },
      "note": "California top-two primary sent two Democrats to the general"
    },
    {
      "state": "CT",
      "winner": {
        "name": "Chris Murphy",
        "party": "D",
        "votes": 825579,
        "pct": 59.5
      },
      "runnerUp": {
        "name": "Matthew Corey",
        "party": "R",
        "votes": 545717,
        "pct": 39.3
      }
    },
    {
      "state": "DE",
      "winner": {
        "name": "Tom Carper",
        "party": "D",
        "votes": 217385,
        "pct": 60.0
      },
      "runnerUp": {
        "name": "Rob Arlett",
        "party": "R",
        "votes": 137127,
        "pct": 37.8
      }
    },
    {
      "state": "FL",
      "winner": {
        "name": "Rick Scott",
        "party": "R",
        "votes": 4099505,
        "pct": 50.1
      },
      "runnerUp": {
        "name": "Bill Nelson",
        "party": "D",
        "votes": 4089472,
        "pct": 49.9
      }
    },
    {
      "state": "HI",
      "winner": {
        "name": "Mazie Hirono",
        "party": "D",
        "votes": 276316,
        "pct": 71.2
      },
      "runnerUp": {
        "name": "Ron Curtis",
        "party": "R",
        "votes": 112035,
        "pct": 28.8
      }
    },
    {
      "state": "IN",
      "winner": {
        "name": "Mike Braun",
        "party": "R",
        "votes": 1158000,
        "pct": 50.7
      },
      "runnerUp": {
        "name": "Joe Donnelly",
        "party": "D",
        "votes": 1023553,
        "pct": 44.8
      }
    },
    {
      "state": "ME",
      "winner": {
        "name": "Angus King",
        "party": "D",
        "votes": 344575,
        "pct": 54.3
      },
      "runnerUp": {
        "name": "Eric Brakey",
        "party": "R",
        "votes": 223502,
        "pct": 35.2
      },
      "note": "King is an Independent who caucuses with Democrats"
    },
    {
      "state": "MD",
      "winner": {
        "name": "Ben Cardin",
        "party": "D",
        "votes": 1491614,
        "pct": 64.9
      },
      "runnerUp": {
        "name": "Tony Campbell",
        "party": "R",
        "votes": 697017,
        "pct": 30.3
      }
    },
    {
      "state": "MA",
      "winner": {
        "name": "Elizabeth Warren",
        "party": "D",
        "votes": 1633371,
        "pct": 60.3
      },
      "runnerUp": {
        "name": "Geoff Diehl",
        "party": "R",
        "votes": 979210,
        "pct": 36.2
      }
    },
    {
      "state": "MI",
      "winner": {
        "name": "Debbie Stabenow",
        "party": "D",
        "votes": 2214478,
        "pct": 52.3
      },
      "runnerUp": {
        "name": "John James",
        "party": "R",
        "votes": 1938818,
        "pct": 45.8
      }
    },
    {
      "state": "MN",
      "special": false,
      "winner": {
        "name": "Amy Klobuchar",
        "party": "D",
        "votes": 1566174,
        "pct": 60.3
      },
      "runnerUp": {
        "name": "Jim Newberger",
        "party": "R",
        "votes": 940437,
        "pct": 36.2
      },
      "note": "Regular election"
    },
    {
      "state": "MN",
      "special": true,
      "winner": {
        "name": "Tina Smith",
        "party": "D",
        "votes": 1370540,
        "pct": 53.0
      },
      "runnerUp": {
        "name": "Karin Housley",
        "party": "R",
        "votes": 1095777,
        "pct": 42.4
      },
      "note": "Special election for remainder of Al Franken's term"
    },
    {
      "state": "MS",
      "special": false,
      "winner": {
        "name": "Roger Wicker",
        "party": "R",
        "votes": 547619,
        "pct": 58.5
      },
      "runnerUp": {
        "name": "David Baria",
        "party": "D",
        "votes": 369567,
        "pct": 39.5
      },
      "note": "Regular election"
    },
    {
      "state": "MS",
      "special": true,
      "winner": {
        "name": "Cindy Hyde-Smith",
        "party": "R",
        "votes": 486769,
        "pct": 53.6
      },
      "runnerUp": {
        "name": "Mike Espy",
        "party": "D",
        "votes": 420819,
        "pct": 46.4
      },
      "note": "Special election runoff (Nov 27, 2018) for remainder of Thad Cochran's term"
    },
    {
      "state": "MO",
      "winner": {
        "name": "Josh Hawley",
        "party": "R",
        "votes": 1254927,
        "pct": 51.4
      },
      "runnerUp": {
        "name": "Claire McCaskill",
        "party": "D",
        "votes": 1112935,
        "pct": 45.6
      }
    },
    {
      "state": "MT",
      "winner": {
        "name": "Jon Tester",
        "party": "D",
        "votes": 253876,
        "pct": 50.3
      },
      "runnerUp": {
        "name": "Matt Rosendale",
        "party": "R",
        "votes": 235963,
        "pct": 46.8
      }
    },
    {
      "state": "NE",
      "winner": {
        "name": "Deb Fischer",
        "party": "R",
        "votes": 403151,
        "pct": 57.7
      },
      "runnerUp": {
        "name": "Jane Raybould",
        "party": "D",
        "votes": 269917,
        "pct": 38.6
      }
    },
    {
      "state": "NV",
      "winner": {
        "name": "Jacky Rosen",
        "party": "D",
        "votes": 490071,
        "pct": 50.4
      },
      "runnerUp": {
        "name": "Dean Heller",
        "party": "R",
        "votes": 441202,
        "pct": 45.4
      }
    },
    {
      "state": "NJ",
      "winner": {
        "name": "Bob Menendez",
        "party": "D",
        "votes": 1711654,
        "pct": 54.0
      },
      "runnerUp": {
        "name": "Bob Hugin",
        "party": "R",
        "votes": 1357355,
        "pct": 42.8
      }
    },
    {
      "state": "NM",
      "winner": {
        "name": "Martin Heinrich",
        "party": "D",
        "votes": 376998,
        "pct": 54.1
      },
      "runnerUp": {
        "name": "Mick Rich",
        "party": "R",
        "votes": 212813,
        "pct": 30.5
      }
    },
    {
      "state": "NY",
      "winner": {
        "name": "Kirsten Gillibrand",
        "party": "D",
        "votes": 4056931,
        "pct": 67.0
      },
      "runnerUp": {
        "name": "Chele Farley",
        "party": "R",
        "votes": 1998220,
        "pct": 33.0
      }
    },
    {
      "state": "ND",
      "winner": {
        "name": "Kevin Cramer",
        "party": "R",
        "votes": 179720,
        "pct": 55.1
      },
      "runnerUp": {
        "name": "Heidi Heitkamp",
        "party": "D",
        "votes": 144376,
        "pct": 44.3
      }
    },
    {
      "state": "OH",
      "winner": {
        "name": "Sherrod Brown",
        "party": "D",
        "votes": 2358508,
        "pct": 53.4
      },
      "runnerUp": {
        "name": "Jim Renacci",
        "party": "R",
        "votes": 2057559,
        "pct": 46.6
      }
    },
    {
      "state": "PA",
      "winner": {
        "name": "Bob Casey Jr.",
        "party": "D",
        "votes": 2792437,
        "pct": 55.7
      },
      "runnerUp": {
        "name": "Lou Barletta",
        "party": "R",
        "votes": 2134848,
        "pct": 42.6
      }
    },
    {
      "state": "RI",
      "winner": {
        "name": "Sheldon Whitehouse",
        "party": "D",
        "votes": 231477,
        "pct": 61.4
      },
      "runnerUp": {
        "name": "Robert Flanders",
        "party": "R",
        "votes": 144421,
        "pct": 38.3
      }
    },
    {
      "state": "TN",
      "winner": {
        "name": "Marsha Blackburn",
        "party": "R",
        "votes": 1227483,
        "pct": 54.7
      },
      "runnerUp": {
        "name": "Phil Bredesen",
        "party": "D",
        "votes": 985450,
        "pct": 43.9
      }
    },
    {
      "state": "TX",
      "winner": {
        "name": "Ted Cruz",
        "party": "R",
        "votes": 4260373,
        "pct": 50.9
      },
      "runnerUp": {
        "name": "Beto O'Rourke",
        "party": "D",
        "votes": 4045632,
        "pct": 48.3
      }
    },
    {
      "state": "UT",
      "winner": {
        "name": "Mitt Romney",
        "party": "R",
        "votes": 665215,
        "pct": 62.6
      },
      "runnerUp": {
        "name": "Jenny Wilson",
        "party": "D",
        "votes": 328541,
        "pct": 30.9
      }
    },
    {
      "state": "VT",
      "winner": {
        "name": "Bernie Sanders",
        "party": "D",
        "votes": 183649,
        "pct": 67.4
      },
      "runnerUp": {
        "name": "Lawrence Zupan",
        "party": "R",
        "votes": 74815,
        "pct": 27.5
      },
      "note": "Sanders is an Independent who caucuses with Democrats"
    },
    {
      "state": "VA",
      "winner": {
        "name": "Tim Kaine",
        "party": "D",
        "votes": 1910370,
        "pct": 57.0
      },
      "runnerUp": {
        "name": "Corey Stewart",
        "party": "R",
        "votes": 1374313,
        "pct": 41.0
      }
    },
    {
      "state": "WA",
      "winner": {
        "name": "Maria Cantwell",
        "party": "D",
        "votes": 1803364,
        "pct": 58.4
      },
      "runnerUp": {
        "name": "Susan Hutchison",
        "party": "R",
        "votes": 1282804,
        "pct": 41.6
      }
    },
    {
      "state": "WV",
      "winner": {
        "name": "Joe Manchin",
        "party": "D",
        "votes": 290510,
        "pct": 49.6
      },
      "runnerUp": {
        "name": "Patrick Morrisey",
        "party": "R",
        "votes": 271113,
        "pct": 46.3
      }
    },
    {
      "state": "WI",
      "winner": {
        "name": "Tammy Baldwin",
        "party": "D",
        "votes": 1472914,
        "pct": 55.4
      },
      "runnerUp": {
        "name": "Leah Vukmir",
        "party": "R",
        "votes": 1184885,
        "pct": 44.5
      }
    },
    {
      "state": "WY",
      "winner": {
        "name": "John Barrasso",
        "party": "R",
        "votes": 136210,
        "pct": 67.0
      },
      "runnerUp": {
        "name": "Gary Trauner",
        "party": "D",
        "votes": 61227,
        "pct": 30.1
      }
    }
  ],
  "2020": [
    {
      "state": "AL",
      "winner": {
        "name": "Tommy Tuberville",
        "party": "R",
        "votes": 1392076,
        "pct": 60.1
      },
      "runnerUp": {
        "name": "Doug Jones",
        "party": "D",
        "votes": 920478,
        "pct": 39.74
      }
    },
    {
      "state": "AK",
      "winner": {
        "name": "Dan Sullivan",
        "party": "R",
        "votes": 191112,
        "pct": 53.9
      },
      "runnerUp": {
        "name": "Al Gross",
        "party": "I",
        "votes": 146068,
        "pct": 41.19
      }
    },
    {
      "state": "AZ",
      "special": true,
      "winner": {
        "name": "Mark Kelly",
        "party": "D",
        "votes": 1716467,
        "pct": 51.16
      },
      "runnerUp": {
        "name": "Martha McSally",
        "party": "R",
        "votes": 1637661,
        "pct": 48.81
      }
    },
    {
      "state": "AR",
      "winner": {
        "name": "Tom Cotton",
        "party": "R",
        "votes": 793871,
        "pct": 66.53
      },
      "runnerUp": {
        "name": "Ricky Dale Harrington Jr.",
        "party": "L",
        "votes": 399390,
        "pct": 33.47
      }
    },
    {
      "state": "CO",
      "winner": {
        "name": "John Hickenlooper",
        "party": "D",
        "votes": 1731114,
        "pct": 53.5
      },
      "runnerUp": {
        "name": "Cory Gardner",
        "party": "R",
        "votes": 1429492,
        "pct": 44.18
      }
    },
    {
      "state": "DE",
      "winner": {
        "name": "Chris Coons",
        "party": "D",
        "votes": 291804,
        "pct": 59.44
      },
      "runnerUp": {
        "name": "Lauren Witzke",
        "party": "R",
        "votes": 186054,
        "pct": 37.9
      }
    },
    {
      "state": "GA",
      "special": false,
      "winner": {
        "name": "Jon Ossoff",
        "party": "D",
        "votes": 2269923,
        "pct": 50.61
      },
      "runnerUp": {
        "name": "David Perdue",
        "party": "R",
        "votes": 2214979,
        "pct": 49.39
      },
      "note": "Decided in Jan 5, 2021 runoff"
    },
    {
      "state": "GA",
      "special": true,
      "winner": {
        "name": "Raphael Warnock",
        "party": "D",
        "votes": 2289113,
        "pct": 51.04
      },
      "runnerUp": {
        "name": "Kelly Loeffler",
        "party": "R",
        "votes": 2195841,
        "pct": 48.96
      },
      "note": "Decided in Jan 5, 2021 runoff"
    },
    {
      "state": "ID",
      "winner": {
        "name": "Jim Risch",
        "party": "R",
        "votes": 538446,
        "pct": 62.62
      },
      "runnerUp": {
        "name": "Paulette Jordan",
        "party": "D",
        "votes": 285864,
        "pct": 33.25
      }
    },
    {
      "state": "IL",
      "winner": {
        "name": "Dick Durbin",
        "party": "D",
        "votes": 3278930,
        "pct": 54.93
      },
      "runnerUp": {
        "name": "Mark Curran",
        "party": "R",
        "votes": 2319870,
        "pct": 38.87
      }
    },
    {
      "state": "IA",
      "winner": {
        "name": "Joni Ernst",
        "party": "R",
        "votes": 864997,
        "pct": 51.74
      },
      "runnerUp": {
        "name": "Theresa Greenfield",
        "party": "D",
        "votes": 754859,
        "pct": 45.15
      }
    },
    {
      "state": "KS",
      "winner": {
        "name": "Roger Marshall",
        "party": "R",
        "votes": 727962,
        "pct": 53.22
      },
      "runnerUp": {
        "name": "Barbara Bollier",
        "party": "D",
        "votes": 571530,
        "pct": 41.79
      }
    },
    {
      "state": "KY",
      "winner": {
        "name": "Mitch McConnell",
        "party": "R",
        "votes": 1233315,
        "pct": 57.76
      },
      "runnerUp": {
        "name": "Amy McGrath",
        "party": "D",
        "votes": 816257,
        "pct": 38.23
      }
    },
    {
      "state": "LA",
      "winner": {
        "name": "Bill Cassidy",
        "party": "R",
        "votes": 1228908,
        "pct": 59.32
      },
      "runnerUp": {
        "name": "Adrian Perkins",
        "party": "D",
        "votes": 394049,
        "pct": 19.02
      },
      "note": "Jungle primary; other candidates split remainder"
    },
    {
      "state": "ME",
      "winner": {
        "name": "Susan Collins",
        "party": "R",
        "votes": 417645,
        "pct": 50.98
      },
      "runnerUp": {
        "name": "Sara Gideon",
        "party": "D",
        "votes": 347223,
        "pct": 42.39
      }
    },
    {
      "state": "MA",
      "winner": {
        "name": "Ed Markey",
        "party": "D",
        "votes": 2357809,
        "pct": 66.15
      },
      "runnerUp": {
        "name": "Kevin O'Connor",
        "party": "R",
        "votes": 1177765,
        "pct": 33.05
      }
    },
    {
      "state": "MI",
      "winner": {
        "name": "Gary Peters",
        "party": "D",
        "votes": 2734568,
        "pct": 49.9
      },
      "runnerUp": {
        "name": "John James",
        "party": "R",
        "votes": 2642233,
        "pct": 48.22
      }
    },
    {
      "state": "MN",
      "winner": {
        "name": "Tina Smith",
        "party": "D",
        "votes": 1566522,
        "pct": 48.74
      },
      "runnerUp": {
        "name": "Jason Lewis",
        "party": "R",
        "votes": 1398145,
        "pct": 43.5
      }
    },
    {
      "state": "MS",
      "winner": {
        "name": "Cindy Hyde-Smith",
        "party": "R",
        "votes": 709511,
        "pct": 54.11
      },
      "runnerUp": {
        "name": "Mike Espy",
        "party": "D",
        "votes": 578691,
        "pct": 44.13
      }
    },
    {
      "state": "MT",
      "winner": {
        "name": "Steve Daines",
        "party": "R",
        "votes": 333174,
        "pct": 55.01
      },
      "runnerUp": {
        "name": "Steve Bullock",
        "party": "D",
        "votes": 272463,
        "pct": 44.99
      }
    },
    {
      "state": "NE",
      "winner": {
        "name": "Ben Sasse",
        "party": "R",
        "votes": 583507,
        "pct": 62.74
      },
      "runnerUp": {
        "name": "Chris Janicek",
        "party": "D",
        "votes": 227191,
        "pct": 24.43
      }
    },
    {
      "state": "NH",
      "winner": {
        "name": "Jeanne Shaheen",
        "party": "D",
        "votes": 450778,
        "pct": 56.63
      },
      "runnerUp": {
        "name": "Corky Messner",
        "party": "R",
        "votes": 326229,
        "pct": 40.99
      }
    },
    {
      "state": "NJ",
      "winner": {
        "name": "Cory Booker",
        "party": "D",
        "votes": 2541239,
        "pct": 57.23
      },
      "runnerUp": {
        "name": "Rik Mehta",
        "party": "R",
        "votes": 1817091,
        "pct": 40.92
      }
    },
    {
      "state": "NM",
      "winner": {
        "name": "Ben Ray Lujan",
        "party": "D",
        "votes": 474483,
        "pct": 51.73
      },
      "runnerUp": {
        "name": "Mark Ronchetti",
        "party": "R",
        "votes": 418483,
        "pct": 45.62
      }
    },
    {
      "state": "NC",
      "winner": {
        "name": "Thom Tillis",
        "party": "R",
        "votes": 2665598,
        "pct": 48.69
      },
      "runnerUp": {
        "name": "Cal Cunningham",
        "party": "D",
        "votes": 2569965,
        "pct": 46.94
      }
    },
    {
      "state": "OK",
      "winner": {
        "name": "Jim Inhofe",
        "party": "R",
        "votes": 979140,
        "pct": 62.91
      },
      "runnerUp": {
        "name": "Abby Broyles",
        "party": "D",
        "votes": 509763,
        "pct": 32.75
      }
    },
    {
      "state": "OR",
      "winner": {
        "name": "Jeff Merkley",
        "party": "D",
        "votes": 1321047,
        "pct": 56.91
      },
      "runnerUp": {
        "name": "Jo Rae Perkins",
        "party": "R",
        "votes": 912814,
        "pct": 39.32
      }
    },
    {
      "state": "RI",
      "winner": {
        "name": "Jack Reed",
        "party": "D",
        "votes": 328574,
        "pct": 66.48
      },
      "runnerUp": {
        "name": "Allen Waters",
        "party": "R",
        "votes": 164855,
        "pct": 33.35
      }
    },
    {
      "state": "SC",
      "winner": {
        "name": "Lindsey Graham",
        "party": "R",
        "votes": 1369137,
        "pct": 54.44
      },
      "runnerUp": {
        "name": "Jaime Harrison",
        "party": "D",
        "votes": 1110828,
        "pct": 44.17
      }
    },
    {
      "state": "SD",
      "winner": {
        "name": "Mike Rounds",
        "party": "R",
        "votes": 276232,
        "pct": 65.74
      },
      "runnerUp": {
        "name": "Dan Ahlers",
        "party": "D",
        "votes": 143987,
        "pct": 34.26
      }
    },
    {
      "state": "TN",
      "winner": {
        "name": "Bill Hagerty",
        "party": "R",
        "votes": 1840926,
        "pct": 62.2
      },
      "runnerUp": {
        "name": "Marquita Bradshaw",
        "party": "D",
        "votes": 1040691,
        "pct": 35.16
      }
    },
    {
      "state": "TX",
      "winner": {
        "name": "John Cornyn",
        "party": "R",
        "votes": 5962983,
        "pct": 53.51
      },
      "runnerUp": {
        "name": "MJ Hegar",
        "party": "D",
        "votes": 4889384,
        "pct": 43.87
      }
    },
    {
      "state": "VA",
      "winner": {
        "name": "Mark Warner",
        "party": "D",
        "votes": 2466500,
        "pct": 55.99
      },
      "runnerUp": {
        "name": "Daniel Gade",
        "party": "R",
        "votes": 1934199,
        "pct": 43.91
      }
    },
    {
      "state": "WV",
      "winner": {
        "name": "Shelley Moore Capito",
        "party": "R",
        "votes": 547454,
        "pct": 70.28
      },
      "runnerUp": {
        "name": "Paula Jean Swearengin",
        "party": "D",
        "votes": 210309,
        "pct": 27.0
      }
    },
    {
      "state": "WY",
      "winner": {
        "name": "Cynthia Lummis",
        "party": "R",
        "votes": 198100,
        "pct": 72.85
      },
      "runnerUp": {
        "name": "Merav Ben-David",
        "party": "D",
        "votes": 72766,
        "pct": 26.76
      }
    }
  ],
  "2022": [
    {
      "state": "AL",
      "winner": {
        "name": "Katie Britt",
        "party": "R",
        "votes": 942154,
        "pct": 66.62
      },
      "runnerUp": {
        "name": "Will Boyd",
        "party": "D",
        "votes": 436746,
        "pct": 30.88
      }
    },
    {
      "state": "AK",
      "winner": {
        "name": "Lisa Murkowski",
        "party": "R",
        "votes": 136330,
        "pct": 53.7
      },
      "runnerUp": {
        "name": "Kelly Tshibaka",
        "party": "R",
        "votes": 117534,
        "pct": 46.3
      },
      "note": "Ranked-choice final round; both top-two finishers were Republicans"
    },
    {
      "state": "AZ",
      "winner": {
        "name": "Mark Kelly",
        "party": "D",
        "votes": 1322027,
        "pct": 51.39
      },
      "runnerUp": {
        "name": "Blake Masters",
        "party": "R",
        "votes": 1196308,
        "pct": 46.51
      }
    },
    {
      "state": "AR",
      "winner": {
        "name": "John Boozman",
        "party": "R",
        "votes": 592437,
        "pct": 65.73
      },
      "runnerUp": {
        "name": "Natalie James",
        "party": "D",
        "votes": 280187,
        "pct": 31.09
      }
    },
    {
      "state": "CA",
      "special": false,
      "winner": {
        "name": "Alex Padilla",
        "party": "D",
        "votes": 6608689,
        "pct": 60.89
      },
      "runnerUp": {
        "name": "Mark Meuser",
        "party": "R",
        "votes": 4248162,
        "pct": 39.11
      }
    },
    {
      "state": "CA",
      "special": true,
      "winner": {
        "name": "Alex Padilla",
        "party": "D",
        "votes": 6608689,
        "pct": 60.89
      },
      "runnerUp": {
        "name": "Mark Meuser",
        "party": "R",
        "votes": 4248162,
        "pct": 39.11
      },
      "note": "Same seat/ballot line as CA regular; figures duplicated"
    },
    {
      "state": "CO",
      "winner": {
        "name": "Michael Bennet",
        "party": "D",
        "votes": 1397170,
        "pct": 55.88
      },
      "runnerUp": {
        "name": "Joe O'Dea",
        "party": "R",
        "votes": 1031693,
        "pct": 41.26
      }
    },
    {
      "state": "CT",
      "winner": {
        "name": "Richard Blumenthal",
        "party": "D",
        "votes": 723864,
        "pct": 57.45
      },
      "runnerUp": {
        "name": "Leora Levy",
        "party": "R",
        "votes": 535943,
        "pct": 42.54
      }
    },
    {
      "state": "FL",
      "winner": {
        "name": "Marco Rubio",
        "party": "R",
        "votes": 4474847,
        "pct": 57.68
      },
      "runnerUp": {
        "name": "Val Demings",
        "party": "D",
        "votes": 3201522,
        "pct": 41.27
      }
    },
    {
      "state": "GA",
      "winner": {
        "name": "Raphael Warnock",
        "party": "D",
        "votes": 1820633,
        "pct": 51.4
      },
      "runnerUp": {
        "name": "Herschel Walker",
        "party": "R",
        "votes": 1721244,
        "pct": 48.6
      },
      "note": "Decided in Dec 6, 2022 runoff"
    },
    {
      "state": "HI",
      "winner": {
        "name": "Brian Schatz",
        "party": "D",
        "votes": 290894,
        "pct": 71.21
      },
      "runnerUp": {
        "name": "Bob McDermott",
        "party": "R",
        "votes": 106358,
        "pct": 26.04
      }
    },
    {
      "state": "ID",
      "winner": {
        "name": "Mike Crapo",
        "party": "R",
        "votes": 358539,
        "pct": 60.68
      },
      "runnerUp": {
        "name": "David Roth",
        "party": "D",
        "votes": 169808,
        "pct": 28.74
      }
    },
    {
      "state": "IL",
      "winner": {
        "name": "Tammy Duckworth",
        "party": "D",
        "votes": 2329136,
        "pct": 56.82
      },
      "runnerUp": {
        "name": "Kathy Salvi",
        "party": "R",
        "votes": 1701055,
        "pct": 41.5
      }
    },
    {
      "state": "IN",
      "winner": {
        "name": "Todd Young",
        "party": "R",
        "votes": 1090165,
        "pct": 58.62
      },
      "runnerUp": {
        "name": "Thomas McDermott Jr.",
        "party": "D",
        "votes": 704411,
        "pct": 37.87
      }
    },
    {
      "state": "IA",
      "winner": {
        "name": "Chuck Grassley",
        "party": "R",
        "votes": 681501,
        "pct": 56.01
      },
      "runnerUp": {
        "name": "Michael Franken",
        "party": "D",
        "votes": 533330,
        "pct": 43.84
      }
    },
    {
      "state": "KS",
      "winner": {
        "name": "Jerry Moran",
        "party": "R",
        "votes": 602976,
        "pct": 60.0
      },
      "runnerUp": {
        "name": "Mark Holland",
        "party": "D",
        "votes": 372214,
        "pct": 37.04
      }
    },
    {
      "state": "KY",
      "winner": {
        "name": "Rand Paul",
        "party": "R",
        "votes": 913326,
        "pct": 61.8
      },
      "runnerUp": {
        "name": "Charles Booker",
        "party": "D",
        "votes": 564311,
        "pct": 38.19
      }
    },
    {
      "state": "LA",
      "winner": {
        "name": "John Kennedy",
        "party": "R",
        "votes": 851568,
        "pct": 61.56
      },
      "runnerUp": {
        "name": "Gary Chambers",
        "party": "D",
        "votes": 246933,
        "pct": 17.85
      },
      "note": "Jungle primary; other candidates split remainder"
    },
    {
      "state": "MD",
      "winner": {
        "name": "Chris Van Hollen",
        "party": "D",
        "votes": 1316897,
        "pct": 65.77
      },
      "runnerUp": {
        "name": "Chris Chaffee",
        "party": "R",
        "votes": 682293,
        "pct": 34.07
      }
    },
    {
      "state": "MO",
      "winner": {
        "name": "Eric Schmitt",
        "party": "R",
        "votes": 1146966,
        "pct": 55.43
      },
      "runnerUp": {
        "name": "Trudy Busch Valentine",
        "party": "D",
        "votes": 872694,
        "pct": 42.18
      }
    },
    {
      "state": "NV",
      "winner": {
        "name": "Catherine Cortez Masto",
        "party": "D",
        "votes": 498316,
        "pct": 48.81
      },
      "runnerUp": {
        "name": "Adam Laxalt",
        "party": "R",
        "votes": 490388,
        "pct": 48.04
      }
    },
    {
      "state": "NH",
      "winner": {
        "name": "Maggie Hassan",
        "party": "D",
        "votes": 332490,
        "pct": 53.54
      },
      "runnerUp": {
        "name": "Don Bolduc",
        "party": "R",
        "votes": 275631,
        "pct": 44.39
      }
    },
    {
      "state": "NY",
      "winner": {
        "name": "Chuck Schumer",
        "party": "D",
        "votes": 3320561,
        "pct": 56.74
      },
      "runnerUp": {
        "name": "Joe Pinion",
        "party": "R",
        "votes": 2501151,
        "pct": 42.73
      }
    },
    {
      "state": "NC",
      "winner": {
        "name": "Ted Budd",
        "party": "R",
        "votes": 1905786,
        "pct": 50.5
      },
      "runnerUp": {
        "name": "Cheri Beasley",
        "party": "D",
        "votes": 1784049,
        "pct": 47.27
      }
    },
    {
      "state": "ND",
      "winner": {
        "name": "John Hoeven",
        "party": "R",
        "votes": 135474,
        "pct": 56.41
      },
      "runnerUp": {
        "name": "Katrina Christiansen",
        "party": "D",
        "votes": 59995,
        "pct": 24.98
      }
    },
    {
      "state": "OH",
      "winner": {
        "name": "JD Vance",
        "party": "R",
        "votes": 2192114,
        "pct": 53.03
      },
      "runnerUp": {
        "name": "Tim Ryan",
        "party": "D",
        "votes": 1939489,
        "pct": 46.92
      }
    },
    {
      "state": "OK",
      "special": false,
      "winner": {
        "name": "James Lankford",
        "party": "R",
        "votes": 739960,
        "pct": 64.3
      },
      "runnerUp": {
        "name": "Madison Horn",
        "party": "D",
        "votes": 369370,
        "pct": 32.1
      }
    },
    {
      "state": "OK",
      "special": true,
      "winner": {
        "name": "Markwayne Mullin",
        "party": "R",
        "votes": 710643,
        "pct": 61.77
      },
      "runnerUp": {
        "name": "Kendra Horn",
        "party": "D",
        "votes": 405389,
        "pct": 35.24
      }
    },
    {
      "state": "OR",
      "winner": {
        "name": "Ron Wyden",
        "party": "D",
        "votes": 1076424,
        "pct": 55.83
      },
      "runnerUp": {
        "name": "Jo Rae Perkins",
        "party": "R",
        "votes": 788991,
        "pct": 40.92
      }
    },
    {
      "state": "PA",
      "winner": {
        "name": "John Fetterman",
        "party": "D",
        "votes": 2751012,
        "pct": 51.17
      },
      "runnerUp": {
        "name": "Mehmet Oz",
        "party": "R",
        "votes": 2487260,
        "pct": 46.27
      }
    },
    {
      "state": "SC",
      "winner": {
        "name": "Tim Scott",
        "party": "R",
        "votes": 1066274,
        "pct": 62.88
      },
      "runnerUp": {
        "name": "Krystle Matthews",
        "party": "D",
        "votes": 627616,
        "pct": 37.01
      }
    },
    {
      "state": "SD",
      "winner": {
        "name": "John Thune",
        "party": "R",
        "votes": 242316,
        "pct": 69.63
      },
      "runnerUp": {
        "name": "Brian Bengs",
        "party": "D",
        "votes": 91007,
        "pct": 26.15
      }
    },
    {
      "state": "UT",
      "winner": {
        "name": "Mike Lee",
        "party": "R",
        "votes": 571974,
        "pct": 53.15
      },
      "runnerUp": {
        "name": "Evan McMullin",
        "party": "I",
        "votes": 459958,
        "pct": 42.74
      }
    },
    {
      "state": "VT",
      "winner": {
        "name": "Peter Welch",
        "party": "D",
        "votes": 196575,
        "pct": 68.47
      },
      "runnerUp": {
        "name": "Gerald Malloy",
        "party": "R",
        "votes": 80468,
        "pct": 28.03
      }
    },
    {
      "state": "WA",
      "winner": {
        "name": "Patty Murray",
        "party": "D",
        "votes": 1741827,
        "pct": 57.15
      },
      "runnerUp": {
        "name": "Tiffany Smiley",
        "party": "R",
        "votes": 1299322,
        "pct": 42.63
      }
    },
    {
      "state": "WI",
      "winner": {
        "name": "Ron Johnson",
        "party": "R",
        "votes": 1337185,
        "pct": 50.41
      },
      "runnerUp": {
        "name": "Mandela Barnes",
        "party": "D",
        "votes": 1310467,
        "pct": 49.41
      }
    }
  ],
  "2024": [
    {
      "state": "AZ",
      "winner": {
        "name": "Ruben Gallego",
        "party": "D",
        "votes": 1676335,
        "pct": 50.06
      },
      "runnerUp": {
        "name": "Kari Lake",
        "party": "R",
        "votes": 1595761,
        "pct": 47.65
      }
    },
    {
      "state": "CA",
      "special": false,
      "winner": {
        "name": "Adam Schiff",
        "party": "D",
        "votes": 9036252,
        "pct": 58.87
      },
      "runnerUp": {
        "name": "Steve Garvey",
        "party": "R",
        "votes": 6312594,
        "pct": 41.13
      }
    },
    {
      "state": "CA",
      "special": true,
      "winner": {
        "name": "Adam Schiff",
        "party": "D",
        "votes": 9036252,
        "pct": 58.87
      },
      "runnerUp": {
        "name": "Steve Garvey",
        "party": "R",
        "votes": 6312594,
        "pct": 41.13
      },
      "note": "Same seat/ballot line as CA regular; figures duplicated"
    },
    {
      "state": "CT",
      "winner": {
        "name": "Chris Murphy",
        "party": "D",
        "votes": 1000695,
        "pct": 58.58
      },
      "runnerUp": {
        "name": "Matthew Corey",
        "party": "R",
        "votes": 678256,
        "pct": 39.7
      }
    },
    {
      "state": "DE",
      "winner": {
        "name": "Lisa Blunt Rochester",
        "party": "D",
        "votes": 283298,
        "pct": 56.59
      },
      "runnerUp": {
        "name": "Eric Hansen",
        "party": "R",
        "votes": 197753,
        "pct": 39.5
      }
    },
    {
      "state": "FL",
      "winner": {
        "name": "Rick Scott",
        "party": "R",
        "votes": 5977706,
        "pct": 55.57
      },
      "runnerUp": {
        "name": "Debbie Mucarsel-Powell",
        "party": "D",
        "votes": 4603077,
        "pct": 42.79
      }
    },
    {
      "state": "HI",
      "winner": {
        "name": "Mazie Hirono",
        "party": "D",
        "votes": 324194,
        "pct": 64.61
      },
      "runnerUp": {
        "name": "Bob McDermott",
        "party": "R",
        "votes": 160075,
        "pct": 31.9
      }
    },
    {
      "state": "IN",
      "winner": {
        "name": "Jim Banks",
        "party": "R",
        "votes": 1659416,
        "pct": 58.64
      },
      "runnerUp": {
        "name": "Valerie McCray",
        "party": "D",
        "votes": 1097061,
        "pct": 38.77
      }
    },
    {
      "state": "ME",
      "winner": {
        "name": "Angus King",
        "party": "I",
        "votes": 427331,
        "pct": 52.06
      },
      "runnerUp": {
        "name": "Demi Kouzounas",
        "party": "R",
        "votes": 284338,
        "pct": 34.64
      }
    },
    {
      "state": "MD",
      "winner": {
        "name": "Angela Alsobrooks",
        "party": "D",
        "votes": 1650912,
        "pct": 54.64
      },
      "runnerUp": {
        "name": "Larry Hogan",
        "party": "R",
        "votes": 1294344,
        "pct": 42.84
      }
    },
    {
      "state": "MA",
      "winner": {
        "name": "Elizabeth Warren",
        "party": "D",
        "votes": 2041668,
        "pct": 59.81
      },
      "runnerUp": {
        "name": "John Deaton",
        "party": "R",
        "votes": 1365440,
        "pct": 40.0
      }
    },
    {
      "state": "MI",
      "winner": {
        "name": "Elissa Slotkin",
        "party": "D",
        "votes": 2712686,
        "pct": 48.64
      },
      "runnerUp": {
        "name": "Mike Rogers",
        "party": "R",
        "votes": 2693680,
        "pct": 48.3
      }
    },
    {
      "state": "MN",
      "winner": {
        "name": "Amy Klobuchar",
        "party": "D",
        "votes": 1792441,
        "pct": 56.2
      },
      "runnerUp": {
        "name": "Royce White",
        "party": "R",
        "votes": 1291712,
        "pct": 40.5
      }
    },
    {
      "state": "MS",
      "winner": {
        "name": "Roger Wicker",
        "party": "R",
        "votes": 763420,
        "pct": 62.81
      },
      "runnerUp": {
        "name": "Ty Pinkins",
        "party": "D",
        "votes": 451981,
        "pct": 37.19
      }
    },
    {
      "state": "MO",
      "winner": {
        "name": "Josh Hawley",
        "party": "R",
        "votes": 1651907,
        "pct": 55.57
      },
      "runnerUp": {
        "name": "Lucas Kunce",
        "party": "D",
        "votes": 1243728,
        "pct": 41.84
      }
    },
    {
      "state": "MT",
      "winner": {
        "name": "Tim Sheehy",
        "party": "R",
        "votes": 319682,
        "pct": 52.64
      },
      "runnerUp": {
        "name": "Jon Tester",
        "party": "D",
        "votes": 276305,
        "pct": 45.5
      }
    },
    {
      "state": "NE",
      "special": false,
      "winner": {
        "name": "Deb Fischer",
        "party": "R",
        "votes": 499124,
        "pct": 53.19
      },
      "runnerUp": {
        "name": "Dan Osborn",
        "party": "I",
        "votes": 436493,
        "pct": 46.52
      }
    },
    {
      "state": "NE",
      "special": true,
      "winner": {
        "name": "Pete Ricketts",
        "party": "R",
        "votes": 585103,
        "pct": 62.58
      },
      "runnerUp": {
        "name": "Preston Love Jr.",
        "party": "D",
        "votes": 349902,
        "pct": 37.42
      }
    },
    {
      "state": "NV",
      "winner": {
        "name": "Jacky Rosen",
        "party": "D",
        "votes": 701105,
        "pct": 47.87
      },
      "runnerUp": {
        "name": "Sam Brown",
        "party": "R",
        "votes": 677046,
        "pct": 46.22
      }
    },
    {
      "state": "NJ",
      "winner": {
        "name": "Andy Kim",
        "party": "D",
        "votes": 2161491,
        "pct": 53.61
      },
      "runnerUp": {
        "name": "Curtis Bashaw",
        "party": "R",
        "votes": 1773589,
        "pct": 43.99
      }
    },
    {
      "state": "NM",
      "winner": {
        "name": "Martin Heinrich",
        "party": "D",
        "votes": 497333,
        "pct": 55.06
      },
      "runnerUp": {
        "name": "Nella Domenici",
        "party": "R",
        "votes": 405978,
        "pct": 44.94
      }
    },
    {
      "state": "NY",
      "winner": {
        "name": "Kirsten Gillibrand",
        "party": "D",
        "votes": 4711298,
        "pct": 58.82
      },
      "runnerUp": {
        "name": "Mike Sapraicone",
        "party": "R",
        "votes": 3246114,
        "pct": 40.52
      }
    },
    {
      "state": "ND",
      "winner": {
        "name": "Kevin Cramer",
        "party": "R",
        "votes": 241569,
        "pct": 66.31
      },
      "runnerUp": {
        "name": "Katrina Christiansen",
        "party": "D",
        "votes": 121602,
        "pct": 33.38
      }
    },
    {
      "state": "OH",
      "winner": {
        "name": "Bernie Moreno",
        "party": "R",
        "votes": 2857383,
        "pct": 50.09
      },
      "runnerUp": {
        "name": "Sherrod Brown",
        "party": "D",
        "votes": 2650949,
        "pct": 46.47
      }
    },
    {
      "state": "PA",
      "winner": {
        "name": "Dave McCormick",
        "party": "R",
        "votes": 3399295,
        "pct": 48.82
      },
      "runnerUp": {
        "name": "Bob Casey Jr.",
        "party": "D",
        "votes": 3384180,
        "pct": 48.6
      }
    },
    {
      "state": "RI",
      "winner": {
        "name": "Sheldon Whitehouse",
        "party": "D",
        "votes": 294665,
        "pct": 59.9
      },
      "runnerUp": {
        "name": "Patricia Morgan",
        "party": "R",
        "votes": 196039,
        "pct": 39.85
      }
    },
    {
      "state": "TN",
      "winner": {
        "name": "Marsha Blackburn",
        "party": "R",
        "votes": 1918743,
        "pct": 63.8
      },
      "runnerUp": {
        "name": "Gloria Johnson",
        "party": "D",
        "votes": 1027461,
        "pct": 34.16
      }
    },
    {
      "state": "TX",
      "winner": {
        "name": "Ted Cruz",
        "party": "R",
        "votes": 5990741,
        "pct": 53.05
      },
      "runnerUp": {
        "name": "Colin Allred",
        "party": "D",
        "votes": 5031249,
        "pct": 44.56
      }
    },
    {
      "state": "UT",
      "winner": {
        "name": "John Curtis",
        "party": "R",
        "votes": 914700,
        "pct": 62.5
      },
      "runnerUp": {
        "name": "Caroline Gleich",
        "party": "D",
        "votes": 464515,
        "pct": 31.74
      }
    },
    {
      "state": "VT",
      "winner": {
        "name": "Bernie Sanders",
        "party": "I",
        "votes": 229429,
        "pct": 63.16
      },
      "runnerUp": {
        "name": "Gerald Malloy",
        "party": "R",
        "votes": 116512,
        "pct": 32.07
      }
    },
    {
      "state": "VA",
      "winner": {
        "name": "Tim Kaine",
        "party": "D",
        "votes": 2417115,
        "pct": 54.37
      },
      "runnerUp": {
        "name": "Hung Cao",
        "party": "R",
        "votes": 2019911,
        "pct": 45.44
      }
    },
    {
      "state": "WA",
      "winner": {
        "name": "Maria Cantwell",
        "party": "D",
        "votes": 2252577,
        "pct": 59.09
      },
      "runnerUp": {
        "name": "Raul Garcia",
        "party": "R",
        "votes": 1549187,
        "pct": 40.64
      }
    },
    {
      "state": "WV",
      "winner": {
        "name": "Jim Justice",
        "party": "R",
        "votes": 514079,
        "pct": 68.75
      },
      "runnerUp": {
        "name": "Glenn Elliott",
        "party": "D",
        "votes": 207548,
        "pct": 27.76
      }
    },
    {
      "state": "WI",
      "winner": {
        "name": "Tammy Baldwin",
        "party": "D",
        "votes": 1672777,
        "pct": 49.33
      },
      "runnerUp": {
        "name": "Eric Hovde",
        "party": "R",
        "votes": 1643996,
        "pct": 48.48
      }
    },
    {
      "state": "WY",
      "winner": {
        "name": "John Barrasso",
        "party": "R",
        "votes": 198418,
        "pct": 75.11
      },
      "runnerUp": {
        "name": "Scott Morrow",
        "party": "D",
        "votes": 63727,
        "pct": 24.12
      }
    }
  ]
};
