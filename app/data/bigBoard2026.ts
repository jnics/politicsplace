// The 2026 general-election "Big Board": every federal race with its
// candidates, for the /election2026 results page. Compiled from the campaign's
// "2026 General Big Board" spreadsheet (candidate rosters as of research date;
// reconfirm before Election Day). Vote counts / % reported are entered live.

export type BoardParty = "D" | "R" | "I" | "L" | "G" | "O";

export interface BoardCandidate {
  name: string;
  party: BoardParty;
  incumbent?: boolean;
}

export interface BoardRace {
  chamber: "senate" | "house";
  /** Display label: "Ohio" or "Ohio 7". */
  place: string;
  /** USPS code. */
  state?: string;
  /** House only (0 = at-large). */
  district?: number;
  incumbent?: string;
  incumbentParty: BoardParty;
  candidates: BoardCandidate[];
  note?: string;
}

export const BIG_BOARD_2026: BoardRace[] = [
  {
    "chamber": "senate",
    "place": "Alabama",
    "state": "AL",
    "incumbent": "Tommy Tuberville",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Barry Moore",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Everett Wess",
        "party": "D"
      }
    ],
    "note": "Progressive except for Palestine"
  },
  {
    "chamber": "senate",
    "place": "Alaska",
    "state": "AK",
    "incumbent": "Dan Sullivan",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Dan Sullivan",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Mary Peltola",
        "party": "D"
      },
      {
        "name": "The Other Dan Sullivan",
        "party": "R"
      }
    ],
    "note": "Lefty"
  },
  {
    "chamber": "senate",
    "place": "Arkansas",
    "state": "AR",
    "incumbent": "Tom Cotton",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Tom Cotton",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Hallie Shoffner",
        "party": "D"
      }
    ],
    "note": "DSA endorsed"
  },
  {
    "chamber": "senate",
    "place": "Colorado",
    "state": "CO",
    "incumbent": "John Hickenlooper",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "John Hickenlooper",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Mark Bailey",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Delaware",
    "state": "DE",
    "incumbent": "Chris Coons",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Chris Coons",
        "party": "D",
        "incumbent": true
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Florida",
    "state": "FL",
    "incumbent": "Ashley Moody",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Ashley Moody",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Angie Nixon",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Georgia",
    "state": "GA",
    "incumbent": "Jon Ossoff",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jon Ossoff",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Mike Collins",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Idaho",
    "state": "ID",
    "incumbent": "Jim Risch",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jim Risch",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Todd Achilles",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Illinois",
    "state": "IL",
    "incumbent": "Dick Durbin",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Juliana Stratton",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Don Tracy",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Iowa",
    "state": "IA",
    "incumbent": "Joni Ernst",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Ashley Hinson",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Josh Turek",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Kansas",
    "state": "KS",
    "incumbent": "Roger Marshall",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Roger Marshall",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Adam Hamllton",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Kentucky",
    "state": "KY",
    "incumbent": "Mitch McConnell",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Andy Barr",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Charles Booker",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Louisianna",
    "state": "LA",
    "incumbent": "Bill Cassidy",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Julia Letlow",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Jamie Davis",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Maine",
    "state": "ME",
    "incumbent": "Susan Collins",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Susan Collins",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Troy Jackson",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Massachusetts",
    "state": "MA",
    "incumbent": "Ed Markey",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Ed Markey",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "John Deaton",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Michigan",
    "state": "MI",
    "incumbent": "Gary Peters",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Abdul El-Sayed",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Mike Rogers",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Minnesota",
    "state": "MN",
    "incumbent": "Tina Smith",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Peggy Flanagan",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Michele Tafoya",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Mississippi",
    "state": "MS",
    "incumbent": "Cindy Hyde-Smith",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Cindy Hyde-Smith",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Scott Colom",
        "party": "D"
      },
      {
        "name": "Ty Pinkins",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Montana",
    "state": "MT",
    "incumbent": "Steve Daines",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Kurt Alme",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Alani Bankhead",
        "party": "D"
      },
      {
        "name": "Seth Bodnar",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Nebraska",
    "state": "NE",
    "incumbent": "Pete Ricketts",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Pete Ricketts",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Dan Osborn",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "New Hampshire",
    "state": "NH",
    "incumbent": "Jeanne Shaheen",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jeanne Shaheen",
        "party": "D",
        "incumbent": true
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "New Jersey",
    "state": "NJ",
    "incumbent": "Cory Booker",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Cory Booker",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Justin Murphy",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "New Mexico",
    "state": "NM",
    "incumbent": "Ben Ray Lujan",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Ben Ray Lujan",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Larry Marker",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "North Carolina",
    "state": "NC",
    "incumbent": "Thom Tillis",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mike Whatley",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Roy Cooper",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Ohio",
    "state": "OH",
    "incumbent": "John Husted",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "John Husted",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Sherrod Brown",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Oklahoma",
    "state": "OK",
    "incumbent": "Markwayne Mullin",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Kevin Hearn",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "N'Kiyla Jasmine Thomas",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Oregon",
    "state": "OR",
    "incumbent": "Jeff Merkely",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jeff Merkely",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "David Brock Smith",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Rhode Island",
    "state": "RI",
    "incumbent": "Jack Reed",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jack Reed",
        "party": "D",
        "incumbent": true
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "South Carolina",
    "state": "SC",
    "incumbent": "Lindsey Graham",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Darline Graham",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Annie Andrews",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "South Dakota",
    "state": "SD",
    "incumbent": "Mike Rounds",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mike Rounds",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Brian Bengs",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Tennessee",
    "state": "TN",
    "incumbent": "Bill Haggerty",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Bill Haggerty",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Marquita Bradshaw",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Texas",
    "state": "TX",
    "incumbent": "John Cornyn",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Ken Paxton",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "James Talarico",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Virginia",
    "state": "VA",
    "incumbent": "Mark Warner",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Mark Warner",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Bret Mizusawa",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "West Virginia",
    "state": "WV",
    "incumbent": "Shelley Moore Capito",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Shelley Moore Capito",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Rachel Fetty Anderson",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "senate",
    "place": "Wyoming",
    "state": "WY",
    "incumbent": "Cynthia Lummis",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Harriet Hageman",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "James W. Byrd",
        "party": "D"
      }
    ],
    "note": "Dem Hold"
  },
  {
    "chamber": "house",
    "place": "Alabama 1",
    "state": "AL",
    "district": 1,
    "incumbent": "Barry Moore",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jerry Carl",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Clyde Jones Jr.",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Alabama 2",
    "state": "AL",
    "district": 2,
    "incumbent": "Shomari Figures",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Shomari Figures",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Rhett Marques",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Alabama 3",
    "state": "AL",
    "district": 3,
    "incumbent": "Mike Rogers",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mike Rogers",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Lee McInnis",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Alabama 4",
    "state": "AL",
    "district": 4,
    "incumbent": "Robert Aderholt",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Robert Aderholt",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Amanda Pusczek",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Alabama 5",
    "state": "AL",
    "district": 5,
    "incumbent": "Dale Strong",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Dale Strong",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Andrew Sneed",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Alabama 6",
    "state": "AL",
    "district": 6,
    "incumbent": "Gary Palmer",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Gary Palmer",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Maurice Mercer",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Alabama 7",
    "state": "AL",
    "district": 7,
    "incumbent": "Terri Sewell",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Terri Sewell",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Ammie Akin",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Alaska at-large",
    "state": "AK",
    "district": 0,
    "incumbent": "Nick Begich III",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Nick Begich III",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Eric Hafner",
        "party": "D"
      },
      {
        "name": "Bill Hill",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Arizona 1",
    "state": "AZ",
    "district": 1,
    "incumbent": "David Schweikert",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jay Feely",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Amish Shah",
        "party": "D"
      },
      {
        "name": "Monica Alpone",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Arizona 2",
    "state": "AZ",
    "district": 2,
    "incumbent": "Eli Crane",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Eli Crane",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Johnathan Nez",
        "party": "D"
      },
      {
        "name": "Curtis Goodwin",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Arizona 3",
    "state": "AZ",
    "district": 3,
    "incumbent": "Yassamin Ansari",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Yassamin Ansari",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Alan Avera",
        "party": "O"
      },
      {
        "name": "David Redkey",
        "party": "G"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Arizona 4",
    "state": "AZ",
    "district": 4,
    "incumbent": "Greg Stanton",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Greg Stanton",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Zuhdi Jasser",
        "party": "R"
      },
      {
        "name": "Tisha Benoit",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Arizona 5",
    "state": "AZ",
    "district": 5,
    "incumbent": "Andy Biggs",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mark Lamb",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Elizabeth Lee",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Arizona 6",
    "state": "AZ",
    "district": 6,
    "incumbent": "Juan Ciscomani",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Juan Ciscomani",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "JoAnna Mendoza",
        "party": "D"
      },
      {
        "name": "Jereme Peters",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Arizona 7",
    "state": "AZ",
    "district": 7,
    "incumbent": "Adelita Grijalva",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Adelita Grijalva",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Daniel Butierez",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Arizona 8",
    "state": "AZ",
    "district": 8,
    "incumbent": "Abraham Hamadeh",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Abraham Hamadeh",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Bernadette Greene-Placentia",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Arizona 9",
    "state": "AZ",
    "district": 9,
    "incumbent": "Paul Gosar",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Paul Gosar",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Dani Sterbinsky",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Arkansas 1",
    "state": "AR",
    "district": 1,
    "incumbent": "Rick Crawford",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Rick Crawford",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Terri Green",
        "party": "D"
      },
      {
        "name": "Steve Parsons",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Arkansas 2",
    "state": "AR",
    "district": 2,
    "incumbent": "French Hill",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "French Hill",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Chris Jones",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Arkansas 3",
    "state": "AR",
    "district": 3,
    "incumbent": "Steve Womack",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Steve Womack",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Robb Ryerse",
        "party": "D"
      },
      {
        "name": "Bobby Wilson",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Arkansas 4",
    "state": "AR",
    "district": 4,
    "incumbent": "Bruce Westerman",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Bruce Westerman",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "James Russell",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 1",
    "state": "CA",
    "district": 1,
    "incumbent": "Doug LaMalfa",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "James Gallagher",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Mike McGuire",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 2",
    "state": "CA",
    "district": 2,
    "incumbent": "Jared Huffman",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jared Huffman",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Robin Littau",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 3",
    "state": "CA",
    "district": 3,
    "incumbent": "Kevin Kiley",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Robb Tucker",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Ami Bera",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 4",
    "state": "CA",
    "district": 4,
    "incumbent": "Mike Thompson",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Mike Thompson",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Eric Jones",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 5",
    "state": "CA",
    "district": 5,
    "incumbent": "Tom McClintock",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Tom McClintock",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Michael Masuda",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 6",
    "state": "CA",
    "district": 6,
    "incumbent": "Ami Bera",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Kevin Kiley",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Richard Pan",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 7",
    "state": "CA",
    "district": 7,
    "incumbent": "Doris Matsui",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Doris Matsui",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Mai Vang",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 8",
    "state": "CA",
    "district": 8,
    "incumbent": "John Garamendi",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "John Garamendi",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Rudy Recile",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 9",
    "state": "CA",
    "district": 9,
    "incumbent": "Josh Harder",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Josh Harder",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "John McBride",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 10",
    "state": "CA",
    "district": 10,
    "incumbent": "Mark DeSaulnier",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Mark DeSaulnier",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Jeff Frese",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 11",
    "state": "CA",
    "district": 11,
    "incumbent": "Nancy Pelosi",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Connie Chan",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Scott Weiner",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 12",
    "state": "CA",
    "district": 12,
    "incumbent": "Lateefah Simon",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Lateefah Simon",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Jamie Joyce",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 13",
    "state": "CA",
    "district": 13,
    "incumbent": "Adam Gray",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Adam Gray",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Kevin Lincoln",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 14",
    "state": "CA",
    "district": 14,
    "incumbent": "Eric Swalwell",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Aisha Wahabb",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Melissa Hernandez",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 15",
    "state": "CA",
    "district": 15,
    "incumbent": "Kevin Mullin",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Kevin Mullin",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Charles Hoelter",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 16",
    "state": "CA",
    "district": 16,
    "incumbent": "Sam Liccardo",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Sam Liccardo",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Peter Soule",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 17",
    "state": "CA",
    "district": 17,
    "incumbent": "Ro Khanna",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Ro Khanna",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Ritesh Tandon",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 18",
    "state": "CA",
    "district": 18,
    "incumbent": "Zoe Lofgren",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Zoe Lofgren",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Shane Lewis",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 19",
    "state": "CA",
    "district": 19,
    "incumbent": "Jimmy Panetta",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jimmy Panetta",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Peter Coe Verbica",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 20",
    "state": "CA",
    "district": 20,
    "incumbent": "Vince Fong",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Vince Fong",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Sandra Van Scotter",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 21",
    "state": "CA",
    "district": 21,
    "incumbent": "Jim Costa",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jim Costa",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Kyle Kirkland",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 22",
    "state": "CA",
    "district": 22,
    "incumbent": "David Valadao",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "David Valadao",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Randy Villegas",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 23",
    "state": "CA",
    "district": 23,
    "incumbent": "Jay Obernolte",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jay Obernolte",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Tessa Lynn Hodge",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 24",
    "state": "CA",
    "district": 24,
    "incumbent": "Salud Carbajal",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Salud Carbajal",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Bob Smith",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 25",
    "state": "CA",
    "district": 25,
    "incumbent": "Raul Ruiz",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Raul Ruiz",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Joe Males",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 26",
    "state": "CA",
    "district": 26,
    "incumbent": "Julia Brownley",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jacqui Irwin",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Sam Galucci",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 27",
    "state": "CA",
    "district": 27,
    "incumbent": "George Whitesides",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "George Whitesides",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Jason Gibbs",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 28",
    "state": "CA",
    "district": 28,
    "incumbent": "Judy Chu",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Judy Chu",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "April Verlato",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 29",
    "state": "CA",
    "district": 29,
    "incumbent": "Luz Rivas",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Luz Rivas",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Angelica Duenas",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 30",
    "state": "CA",
    "district": 30,
    "incumbent": "Laura Friedman",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Laura Friedman",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Scott Meyers",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 31",
    "state": "CA",
    "district": 31,
    "incumbent": "Gil Cisneros",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Gil Cisneros",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Eric Ching",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 32",
    "state": "CA",
    "district": 32,
    "incumbent": "Brad Sherman",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Brad Sherman",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Larry Thompson",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 33",
    "state": "CA",
    "district": 33,
    "incumbent": "Pete Aguilar",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Pete Aguilar",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Stephanie Vargas",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 34",
    "state": "CA",
    "district": 34,
    "incumbent": "Jimmy Gomez",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jimmy Gomez",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Angela Gonzales-Torres",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 35",
    "state": "CA",
    "district": 35,
    "incumbent": "Norma Torres",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Norma Torres",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Mike Cargile",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 36",
    "state": "CA",
    "district": 36,
    "incumbent": "Ted Lieu",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Ted Lieu",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Houstin Brignano",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 37",
    "state": "CA",
    "district": 37,
    "incumbent": "Sydney Kamlager-Dove",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Sydney Kamlager-Dove",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Samantha Mota",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 38",
    "state": "CA",
    "district": 38,
    "incumbent": "Linda Sánchez",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Hilda Solis",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Pedro Casas",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 39",
    "state": "CA",
    "district": 39,
    "incumbent": "Mark Takano",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Mark Takano",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Steve Manos",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 40",
    "state": "CA",
    "district": 40,
    "incumbent": "Young Kim",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Young Kim",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Ken Calvert",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 41",
    "state": "CA",
    "district": 41,
    "incumbent": "Ken Calvert",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Linda Sanchez",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Mitch Clemmons",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 42",
    "state": "CA",
    "district": 42,
    "incumbent": "Robert Garcia",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Robert Garcia",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Brian Burley",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 43",
    "state": "CA",
    "district": 43,
    "incumbent": "Maxine Waters",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Maxine Waters",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Christian Morales",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 44",
    "state": "CA",
    "district": 44,
    "incumbent": "Nanette Barragán",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Nanette Barragán",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Genevieve Angel",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 45",
    "state": "CA",
    "district": 45,
    "incumbent": "Derek Tran",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Derek Tran",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Chuong Vo",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 46",
    "state": "CA",
    "district": 46,
    "incumbent": "Lou Correa",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Lou Correa",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "David Pan",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 47",
    "state": "CA",
    "district": 47,
    "incumbent": "Dave Min",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Dave Min",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Jenny Le Roux",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 48",
    "state": "CA",
    "district": 48,
    "incumbent": "Darrell Issa",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jim Desmond",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Marni Von Wilpert",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 49",
    "state": "CA",
    "district": 49,
    "incumbent": "Mike Levin",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Mike Levin",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Armen Kurdian",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 50",
    "state": "CA",
    "district": 50,
    "incumbent": "Scott Peters",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Scott Peters",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Steve Cohen",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 51",
    "state": "CA",
    "district": 51,
    "incumbent": "Sara Jacobs",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Sara Jacobs",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Ricardo Cabrera",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "California 52",
    "state": "CA",
    "district": 52,
    "incumbent": "Juan Vargas",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Juan Vargas",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Jeffe Belle",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Colorado 1",
    "state": "CO",
    "district": 1,
    "incumbent": "Diana DeGette",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Melat Kiros",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Christy Peterson",
        "party": "R"
      },
      {
        "name": "Shimon Blau",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Colorado 2",
    "state": "CO",
    "district": 2,
    "incumbent": "Joe Neguse",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Joe Neguse",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Kelley Dennison",
        "party": "R"
      },
      {
        "name": "Gaylon Kent",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Colorado 3",
    "state": "CO",
    "district": 3,
    "incumbent": "Jeff Hurd",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jeff Hurd",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Dwayne Romero",
        "party": "D"
      },
      {
        "name": "Clifton Brown",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Colorado 4",
    "state": "CO",
    "district": 4,
    "incumbent": "Lauren Boebert",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Lauren Boebert",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Eileen Laubacher",
        "party": "D"
      },
      {
        "name": "Douglas Mangeris",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Colorado 5",
    "state": "CO",
    "district": 5,
    "incumbent": "Jeff Crank",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jeff Crank",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Jessica Killin",
        "party": "D"
      },
      {
        "name": "Mark Elworth",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Colorado 6",
    "state": "CO",
    "district": 6,
    "incumbent": "Jason Crow",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jason Crow",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Jason Clark",
        "party": "R"
      },
      {
        "name": "Patty McMahon",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Colorado 7",
    "state": "CO",
    "district": 7,
    "incumbent": "Brittany Pettersen",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Brittany Pettersen",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Tim Bennett",
        "party": "R"
      },
      {
        "name": "Dan Sallis",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Colorado 8",
    "state": "CO",
    "district": 8,
    "incumbent": "Gabe Evans",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Gabe Evans",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Manny Rutinel",
        "party": "D"
      },
      {
        "name": "Dan Wood",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Connecticut 1",
    "state": "CT",
    "district": 1,
    "incumbent": "John B. Larson",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Luke Bronin",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Amy Chai",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Connecticut 2",
    "state": "CT",
    "district": 2,
    "incumbent": "Joe Courtney",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Joe Courtney",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "George Austin",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Connecticut 3",
    "state": "CT",
    "district": 3,
    "incumbent": "Rosa DeLauro",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Rosa DeLauro",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Christopher Lancia",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Connecticut 4",
    "state": "CT",
    "district": 4,
    "incumbent": "Jim Himes",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jim Himes",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Michael Goldstein",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Connecticut 5",
    "state": "CT",
    "district": 5,
    "incumbent": "Jahana Hayes",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jahana Hayes",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Chris Shea",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Delaware at-large",
    "state": "DE",
    "district": 0,
    "incumbent": "Sarah McBride",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Sarah McBride",
        "party": "D",
        "incumbent": true
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 1",
    "state": "FL",
    "district": 1,
    "incumbent": "Jimmy Patronis",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jimmy Patronis",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Gay Valimont",
        "party": "D"
      },
      {
        "name": "Tyler Davis",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 2",
    "state": "FL",
    "district": 2,
    "incumbent": "Neal Dunn",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Austin Rogers",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Amanda Green",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 3",
    "state": "FL",
    "district": 3,
    "incumbent": "Kat Cammack",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Kat Cammack",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Seth Harp",
        "party": "D"
      },
      {
        "name": "Mike Klein",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 4",
    "state": "FL",
    "district": 4,
    "incumbent": "Aaron Bean",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Aaron Bean",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "LaShonda Holloway",
        "party": "D"
      },
      {
        "name": "Todd Schaefer",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 5",
    "state": "FL",
    "district": 5,
    "incumbent": "John Rutherford",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "John Rutherford",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Rachel Grage",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 6",
    "state": "FL",
    "district": 6,
    "incumbent": "Randy Fine",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Randy Fine",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Eric Yonce",
        "party": "D"
      },
      {
        "name": "Andrew Parrott",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 7",
    "state": "FL",
    "district": 7,
    "incumbent": "Cory Mills",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Ryan Elijah",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Bale Dalton",
        "party": "D"
      },
      {
        "name": "Christopher Dennsion",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 8",
    "state": "FL",
    "district": 8,
    "incumbent": "Mike Haridopolos",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mike Haridopolos",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Jennifer Jenkins",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 9",
    "state": "FL",
    "district": 9,
    "incumbent": "Darren Soto",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Darren Soto",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Dan Green",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 10",
    "state": "FL",
    "district": 10,
    "incumbent": "Maxwell Frost",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Maxwell Frost",
        "party": "D",
        "incumbent": true
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 11",
    "state": "FL",
    "district": 11,
    "incumbent": "Daniel Webster",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Joe Strada",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "James Pericola",
        "party": "D"
      },
      {
        "name": "Ralph Groves",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 12",
    "state": "FL",
    "district": 12,
    "incumbent": "Gus Bilirakis",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Gus Bilirakis",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Kimberly Overman",
        "party": "D"
      },
      {
        "name": "Branden Scrivener",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 13",
    "state": "FL",
    "district": 13,
    "incumbent": "Anna Paulina Luna",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Anna Paulina Luna",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Leela Gray",
        "party": "D"
      },
      {
        "name": "Tony D'Arrigo",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 14",
    "state": "FL",
    "district": 14,
    "incumbent": "Kathy Castor",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Kathy Castor",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Mike Beltran",
        "party": "R"
      },
      {
        "name": "Brian Lambert",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 15",
    "state": "FL",
    "district": 15,
    "incumbent": "Laurel Lee",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Laurel Lee",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Robert People",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 16",
    "state": "FL",
    "district": 16,
    "incumbent": "Vern Buchanan",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Sydney Gruters",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Kelly Kirschner",
        "party": "D"
      },
      {
        "name": "Mark Davis",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 17",
    "state": "FL",
    "district": 17,
    "incumbent": "Greg Steube",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Greg Steube",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Matthew Montavon",
        "party": "D"
      },
      {
        "name": "Michael Quirk",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 18",
    "state": "FL",
    "district": 18,
    "incumbent": "Scott Franklin",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Scott Franklin",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Curtis Gibson",
        "party": "D"
      },
      {
        "name": "Deva Simmons",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 19",
    "state": "FL",
    "district": 19,
    "incumbent": "Byron Donalds",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jim Schwartzel",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Victor Arias",
        "party": "D"
      },
      {
        "name": "Seth Haskin",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 20",
    "state": "FL",
    "district": 20,
    "incumbent": "Sheila Cherfilus-McCormick",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Debbie Wasserman Schultz",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Brent Andersen",
        "party": "R"
      },
      {
        "name": "Kedner Maxime",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 21",
    "state": "FL",
    "district": 21,
    "incumbent": "Brian Mast",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Brian Mast",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "James Martin",
        "party": "D"
      },
      {
        "name": "Alexander Cooke",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 22",
    "state": "FL",
    "district": 22,
    "incumbent": "Lois Frankel",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Pia Dandiya",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Casey Askar",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 23",
    "state": "FL",
    "district": 23,
    "incumbent": "Jared Moskowitz",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Lois Frankel",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Deborah Adeimy",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 24",
    "state": "FL",
    "district": 24,
    "incumbent": "Frederica Wilson",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Oliver Gilbert",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Te Mayonna Brown",
        "party": "R"
      },
      {
        "name": "Andy Daro",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 25",
    "state": "FL",
    "district": 25,
    "incumbent": "Debbie Wasserman Schultz",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jared Moskowitz",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Scott Singer",
        "party": "R"
      },
      {
        "name": "Peter Jassenoff",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 26",
    "state": "FL",
    "district": 26,
    "incumbent": "Mario Díaz-Balart",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mario Díaz-Balart",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Nicole Locklin",
        "party": "D"
      },
      {
        "name": "Deborah Ann Meidinger Hosey",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 27",
    "state": "FL",
    "district": 27,
    "incumbent": "María Elvira Salazar",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "María Elvira Salazar",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Elliott Rodriguez",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Florida 28",
    "state": "FL",
    "district": 28,
    "incumbent": "Carlos Giménez",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Carlos Giménez",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Phil Ehr",
        "party": "D"
      },
      {
        "name": "Eddy Rojas",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Georgia 1",
    "state": "GA",
    "district": 1,
    "incumbent": "Buddy Carter",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jim Kingston",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Amanda Hollowell",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Georgia 2",
    "state": "GA",
    "district": 2,
    "incumbent": "Sanford Bishop",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Sanford Bishop",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Matt Day",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Georgia 3",
    "state": "GA",
    "district": 3,
    "incumbent": "Brian Jack",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Brian Jack",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Maura Keller",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Georgia 4",
    "state": "GA",
    "district": 4,
    "incumbent": "Hank Johnson",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Hank Johnson",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "James Duffie",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Georgia 5",
    "state": "GA",
    "district": 5,
    "incumbent": "Nikema Williams",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Nikema Williams",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "John Oscar Salvesen",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Georgia 6",
    "state": "GA",
    "district": 6,
    "incumbent": "Lucy McBath",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Lucy McBath",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Kevin Martin",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Georgia 7",
    "state": "GA",
    "district": 7,
    "incumbent": "Rich McCormick",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Rich McCormick",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Tony Kozycki",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Georgia 8",
    "state": "GA",
    "district": 8,
    "incumbent": "Austin Scott",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Austin Scott",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Kelly Esti",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Georgia 9",
    "state": "GA",
    "district": 9,
    "incumbent": "Andrew Clyde",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Andrew Clyde",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Caitlyn Gegen",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Georgia 10",
    "state": "GA",
    "district": 10,
    "incumbent": "Mike Collins",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Houston Gaines",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Pam Delancey",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Georgia 11",
    "state": "GA",
    "district": 11,
    "incumbent": "Barry Loudermilk",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "John COwan",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Chris Harden",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Georgia 12",
    "state": "GA",
    "district": 12,
    "incumbent": "Rick Allen",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Rick Allen",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Ceretta Smith",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Georgia 13",
    "state": "GA",
    "district": 13,
    "incumbent": "David Scott",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jasmine Clark",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Jonathan Chavez",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Georgia 14",
    "state": "GA",
    "district": 14,
    "incumbent": "Marjorie Taylor Greene",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Clay Fuller",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Shawn Harris",
        "party": "D"
      },
      {
        "name": "Andrew Underwood",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Hawaii 1",
    "state": "HI",
    "district": 1,
    "incumbent": "Ed Case",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Ed Case",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Adriel Lam",
        "party": "R"
      },
      {
        "name": "Jordan Conley",
        "party": "G"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Hawaii 2",
    "state": "HI",
    "district": 2,
    "incumbent": "Jill Tokuda",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jill Tokuda",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Brenton Awa",
        "party": "R"
      },
      {
        "name": "Edward Codelia",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Idaho 1",
    "state": "ID",
    "district": 1,
    "incumbent": "Russ Fulcher",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Russ Fulcher",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Kaylee Peterson",
        "party": "D"
      },
      {
        "name": "Sarah Zabel",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Idaho 2",
    "state": "ID",
    "district": 2,
    "incumbent": "Mike Simpson",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mike Simpson",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Ellie Gilbreath",
        "party": "D"
      },
      {
        "name": "Tripp Hutchinson",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Illinois 1",
    "state": "IL",
    "district": 1,
    "incumbent": "Jonathan Jackson",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jonathan Jackson",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Christian Maxwell",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Illinois 2",
    "state": "IL",
    "district": 2,
    "incumbent": "Robin Kelly",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Donna Miller",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Michael Noack",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Illinois 3",
    "state": "IL",
    "district": 3,
    "incumbent": "Delia Ramirez",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Delia Ramirez",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Angel Oakley",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Illinois 4",
    "state": "IL",
    "district": 4,
    "incumbent": "Chuy García",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Patty Garcia",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Lupe Castillo",
        "party": "R"
      },
      {
        "name": "Ed Herhsey",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Illinois 5",
    "state": "IL",
    "district": 5,
    "incumbent": "Mike Quigley",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Mike Quigley",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Tommy Hanson",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Illinois 6",
    "state": "IL",
    "district": 6,
    "incumbent": "Sean Casten",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Sean Casten",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Niki Conforti",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Illinois 7",
    "state": "IL",
    "district": 7,
    "incumbent": "Danny Davis",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "La Shawn Ford",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Chad Koppie",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Illinois 8",
    "state": "IL",
    "district": 8,
    "incumbent": "Raja Krishnamoorthi",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Melissa Bean",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Jennifer Davis",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Illinois 9",
    "state": "IL",
    "district": 9,
    "incumbent": "Jan Schakowsky",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Daniel Biss",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "John Elleson",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Illinois 10",
    "state": "IL",
    "district": 10,
    "incumbent": "Brad Schneider",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Brad Schneider",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Carl Lambrecht",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Illinois 11",
    "state": "IL",
    "district": 11,
    "incumbent": "Bill Foster",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Bill Foster",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Jeff Walter",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Illinois 12",
    "state": "IL",
    "district": 12,
    "incumbent": "Mike Bost",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mike Bost",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Julie Fortier",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Illinois 13",
    "state": "IL",
    "district": 13,
    "incumbent": "Nikki Budzinski",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Nikki Budzinski",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Jeff Wilson",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Illinois 14",
    "state": "IL",
    "district": 14,
    "incumbent": "Lauren Underwood",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Lauren Underwood",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "James Marter",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Illinois 15",
    "state": "IL",
    "district": 15,
    "incumbent": "Mary Miller",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mary Miller",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Jennifer Todd",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Illinois 16",
    "state": "IL",
    "district": 16,
    "incumbent": "Darin LaHood",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Darin LaHood",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Paul Nolley",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Illinois 17",
    "state": "IL",
    "district": 17,
    "incumbent": "Eric Sorensen",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Eric Sorensen",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Dillan Vancil",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Indiana 1",
    "state": "IN",
    "district": 1,
    "incumbent": "Frank J. Mrvan",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Frank J. Mrvan",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Barb Regnitz",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Indiana 2",
    "state": "IN",
    "district": 2,
    "incumbent": "Rudy Yakym",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Rudy Yakym",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Jamee Decio",
        "party": "D"
      },
      {
        "name": "William Henry",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Indiana 3",
    "state": "IN",
    "district": 3,
    "incumbent": "Marlin Stutzman",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Marlin Stutzman",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Kelly Thompson",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Indiana 4",
    "state": "IN",
    "district": 4,
    "incumbent": "Jim Baird",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jim Baird",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Drew Cox",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Indiana 5",
    "state": "IN",
    "district": 5,
    "incumbent": "Victoria Spartz",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Victoria Spartz",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "JD Ford",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Indiana 6",
    "state": "IN",
    "district": 6,
    "incumbent": "Jefferson Shreve",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jefferson Shreve",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Cinde Wirth",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Indiana 7",
    "state": "IN",
    "district": 7,
    "incumbent": "André Carson",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "André Carson",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Patrick McAuley",
        "party": "R"
      },
      {
        "name": "James Sceniak",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Indiana 8",
    "state": "IN",
    "district": 8,
    "incumbent": "Mark Messmer",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mark Messmer",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Mary Allen",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Indiana 9",
    "state": "IN",
    "district": 9,
    "incumbent": "Erin Houchin",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Erin Houchin",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Brad Meyer",
        "party": "D"
      },
      {
        "name": "Tonya Hudson",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Iowa 1",
    "state": "IA",
    "district": 1,
    "incumbent": "Mariannette Miller-Meeks",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mariannette Miller-Meeks",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Christina Bohannan",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Iowa 2",
    "state": "IA",
    "district": 2,
    "incumbent": "Ashley Hinson",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Joe Mitchell",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Lindsay James",
        "party": "D"
      },
      {
        "name": "Dave Bushaw",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Iowa 3",
    "state": "IA",
    "district": 3,
    "incumbent": "Zach Nunn",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Zach Nunn",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Sarah Trone Garriott",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Iowa 4",
    "state": "IA",
    "district": 4,
    "incumbent": "Randy Feenstra",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Chris McGowan",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "David Dawson",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Kansas 1",
    "state": "KS",
    "district": 1,
    "incumbent": "Tracey Mann",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Tracey Mann",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Lauren Reinhold",
        "party": "D"
      },
      {
        "name": "Steven Jacob",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Kansas 2",
    "state": "KS",
    "district": 2,
    "incumbent": "Derek Schmidt",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Derek Schmidt",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Don Coover",
        "party": "D"
      },
      {
        "name": "John Hauer",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Kansas 3",
    "state": "KS",
    "district": 3,
    "incumbent": "Sharice Davids",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Sharice Davids",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Eric Jenkins",
        "party": "R"
      },
      {
        "name": "Steven Hohe",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Kansas 4",
    "state": "KS",
    "district": 4,
    "incumbent": "Ron Estes",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Ron Estes",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Katy Tyndell",
        "party": "D"
      },
      {
        "name": "Drew Cranmer",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Kentucky 1",
    "state": "KY",
    "district": 1,
    "incumbent": "James Comer",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "James Comer",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Drew Williams",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Kentucky 2",
    "state": "KY",
    "district": 2,
    "incumbent": "Brett Guthrie",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Brett Guthrie",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Megan Wingfield",
        "party": "D"
      },
      {
        "name": "Thomas Loecken",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Kentucky 3",
    "state": "KY",
    "district": 3,
    "incumbent": "Morgan McGarvey",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Morgan McGarvey",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Maria Rodriguez",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Kentucky 4",
    "state": "KY",
    "district": 4,
    "incumbent": "Thomas Massie",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Ed Gallrein",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Melissa Strange",
        "party": "D"
      },
      {
        "name": "Jeremy Todd",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Kentucky 5",
    "state": "KY",
    "district": 5,
    "incumbent": "Hal Rogers",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Hal Rogers",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Ned Pillersdorf",
        "party": "D"
      },
      {
        "name": "Gerardo Serrano",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Kentucky 6",
    "state": "KY",
    "district": 6,
    "incumbent": "Andy Barr",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Ralph Alvarado",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Zach Dembo",
        "party": "D"
      },
      {
        "name": "Pete Lynch",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Louisiana 1",
    "state": "LA",
    "district": 1,
    "incumbent": "Steve Scalise",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Steve Scalise",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Lauren Jewett",
        "party": "D"
      },
      {
        "name": "Randall Arrington",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Louisiana 2",
    "state": "LA",
    "district": 2,
    "incumbent": "Troy Carter",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Troy Carter",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Peter Williams",
        "party": "R"
      },
      {
        "name": "Renada Collins",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Louisiana 3",
    "state": "LA",
    "district": 3,
    "incumbent": "Clay Higgins",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Clay Higgins",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Caleb Walker",
        "party": "D"
      },
      {
        "name": "Priscilla Gonzalez",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Louisiana 4",
    "state": "LA",
    "district": 4,
    "incumbent": "Mike Johnson",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mike Johnson",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Conrad Cable",
        "party": "D"
      },
      {
        "name": "Matt Gromlich",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Louisiana 5",
    "state": "LA",
    "district": 5,
    "incumbent": "Julia Letlow",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Stewart Cathey Jr.",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Dan McKay",
        "party": "D"
      },
      {
        "name": "Michael Echols",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Louisiana 6",
    "state": "LA",
    "district": 6,
    "incumbent": "Cleo Fields",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Lindsay Garcia",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Blake Miguez",
        "party": "R"
      },
      {
        "name": "Rufus Craig",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Maine 1",
    "state": "ME",
    "district": 1,
    "incumbent": "Chellie Pingree",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Chellie Pingree",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Ronald Russell",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Maine 2",
    "state": "ME",
    "district": 2,
    "incumbent": "Jared Golden",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Matthew Dunlap",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Paul LePage",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Maryland 1",
    "state": "MD",
    "district": 1,
    "incumbent": "Andy Harris",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Andy Harris",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Dan Schwartz",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Maryland 2",
    "state": "MD",
    "district": 2,
    "incumbent": "Johnny Olszewski",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Johnny Olszewski",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Dave Wallace",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Maryland 3",
    "state": "MD",
    "district": 3,
    "incumbent": "Sarah Elfreth",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Sarah Elfreth",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Beney Flowers",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Maryland 4",
    "state": "MD",
    "district": 4,
    "incumbent": "Glenn Ivey",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Glenn Ivey",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "George McDermorr",
        "party": "R"
      },
      {
        "name": "Sam Husseini",
        "party": "G"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Maryland 5",
    "state": "MD",
    "district": 5,
    "incumbent": "Steny Hoyer",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Adrian Boafo",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Chris Chaffee",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Maryland 6",
    "state": "MD",
    "district": 6,
    "incumbent": "April McClain Delaney",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "April McClain Delaney",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Robin Ficker",
        "party": "R"
      },
      {
        "name": "Moshe Landman",
        "party": "G"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Maryland 7",
    "state": "MD",
    "district": 7,
    "incumbent": "Kweisi Mfume",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Kweisi Mfume",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Scott Collier",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Maryland 8",
    "state": "MD",
    "district": 8,
    "incumbent": "Jamie Raskin",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jamie Raskin",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Cheryl Riley",
        "party": "R"
      },
      {
        "name": "Nancy Wallace",
        "party": "G"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Massachusetts 1",
    "state": "MA",
    "district": 1,
    "incumbent": "Richard Neal",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Richard Neal",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Nadia Milleron",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Massachusetts 2",
    "state": "MA",
    "district": 2,
    "incumbent": "Jim McGovern",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jim McGovern",
        "party": "D",
        "incumbent": true
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Massachusetts 3",
    "state": "MA",
    "district": 3,
    "incumbent": "Lori Trahan",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Lori Trahan",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Gary Grossi",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Massachusetts 4",
    "state": "MA",
    "district": 4,
    "incumbent": "Jake Auchincloss",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jake Auchincloss",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Tom Stalcup",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Massachusetts 5",
    "state": "MA",
    "district": 5,
    "incumbent": "Katherine Clark",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Katherine Clark",
        "party": "D",
        "incumbent": true
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Massachusetts 6",
    "state": "MA",
    "district": 6,
    "incumbent": "Seth Moulton",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Dan Koh",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Micah Jones",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Massachusetts 7",
    "state": "MA",
    "district": 7,
    "incumbent": "Ayanna Pressley",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Ayanna Pressley",
        "party": "D",
        "incumbent": true
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Massachusetts 8",
    "state": "MA",
    "district": 8,
    "incumbent": "Stephen F. Lynch",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Stephen F. Lynch",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Robert Burke",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Massachusetts 9",
    "state": "MA",
    "district": 9,
    "incumbent": "Bill Keating",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Bill Keating",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Tyler MacAllister",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Michigan 1",
    "state": "MI",
    "district": 1,
    "incumbent": "Jack Bergman",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jack Bergman",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Callie Barr",
        "party": "D"
      },
      {
        "name": "Liz Hakola",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Michigan 2",
    "state": "MI",
    "district": 2,
    "incumbent": "John Moolenaar",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "John Moolenaar",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Ben Ambrose",
        "party": "D"
      },
      {
        "name": "Charlotte Magoon",
        "party": "G"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Michigan 3",
    "state": "MI",
    "district": 3,
    "incumbent": "Hillary Scholten",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Hillary Scholten",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Terri DeBoaer",
        "party": "R"
      },
      {
        "name": "Joe Jock",
        "party": "G"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Michigan 4",
    "state": "MI",
    "district": 4,
    "incumbent": "Bill Huizenga",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Bill Huizenga",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Sean McCann",
        "party": "D"
      },
      {
        "name": "Shafina Che Barnett",
        "party": "G"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Michigan 5",
    "state": "MI",
    "district": 5,
    "incumbent": "Tim Walberg",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Tim Walberg",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Christian Vukasovich",
        "party": "D"
      },
      {
        "name": "Sharon Marie Renier (USTP)",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Michigan 6",
    "state": "MI",
    "district": 6,
    "incumbent": "Debbie Dingell",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Debbie Dingell",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Heather Smiley",
        "party": "R"
      },
      {
        "name": "Linda Rayburn",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Michigan 7",
    "state": "MI",
    "district": 7,
    "incumbent": "Tom Barrett",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Tom Barrett",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "William Lawrence",
        "party": "D"
      },
      {
        "name": "Felix Thibodeau",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Michigan 8",
    "state": "MI",
    "district": 8,
    "incumbent": "Kristen McDonald Rivet",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Kristen McDonald Rivet",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Thomas Smith",
        "party": "R"
      },
      {
        "name": "Kathy Goodwin",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Michigan 9",
    "state": "MI",
    "district": 9,
    "incumbent": "Lisa McClain",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Lisa McClain",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Ray Pooley",
        "party": "D"
      },
      {
        "name": "Jim Walkowicz",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Michigan 10",
    "state": "MI",
    "district": 10,
    "incumbent": "John James",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mike Bouchard",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Christina Hines",
        "party": "D"
      },
      {
        "name": "Kwabena Nkromo",
        "party": "G"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Michigan 11",
    "state": "MI",
    "district": 11,
    "incumbent": "Haley Stevens",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jeremy Moss",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Ethan Baker",
        "party": "R"
      },
      {
        "name": "Ryan Teasdale",
        "party": "G"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Michigan 12",
    "state": "MI",
    "district": 12,
    "incumbent": "Rashida Tlaib",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Rashida Tlaib",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "James Hooper",
        "party": "R"
      },
      {
        "name": "Gary Walkowicz",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Michigan 13",
    "state": "MI",
    "district": 13,
    "incumbent": "Shri Thanedar",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Donovan McKinney",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "TP Nykoriak",
        "party": "R"
      },
      {
        "name": "Chris Dardzinski (USTP)",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Minnesota 1",
    "state": "MN",
    "district": 1,
    "incumbent": "Brad Finstad",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Brad Finstad",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Jake Johnson",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Minnesota 2",
    "state": "MN",
    "district": 2,
    "incumbent": "Angie Craig",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Matt Little",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Eric Pratt",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Minnesota 3",
    "state": "MN",
    "district": 3,
    "incumbent": "Kelly Morrison",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Kelly Morrison",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Tyler Bass",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Minnesota 4",
    "state": "MN",
    "district": 4,
    "incumbent": "Betty McCollum",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Betty McCollum",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Paul Wikstrom",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Minnesota 5",
    "state": "MN",
    "district": 5,
    "incumbent": "Ilhan Omar",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Ilhan Omar",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "John Nagel",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Minnesota 6",
    "state": "MN",
    "district": 6,
    "incumbent": "Tom Emmer",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Tom Emmer",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Doug Chapin",
        "party": "D"
      },
      {
        "name": "Kelly Doss",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Minnesota 7",
    "state": "MN",
    "district": 7,
    "incumbent": "Michelle Fischbach",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Michelle Fischbach",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Erik Osberg",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Minnesota 8",
    "state": "MN",
    "district": 8,
    "incumbent": "Pete Stauber",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Pete Stauber",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Trina Swanson",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Mississippi 1",
    "state": "MS",
    "district": 1,
    "incumbent": "Trent Kelly",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Trent Kelly",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Cliff Johnson",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Mississippi 2",
    "state": "MS",
    "district": 2,
    "incumbent": "Bennie Thompson",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Bennie Thompson",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Ron Eller",
        "party": "R"
      },
      {
        "name": "Bennie Foster",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Mississippi 3",
    "state": "MS",
    "district": 3,
    "incumbent": "Michael Guest",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Michael Guest",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Michael Chiaradio",
        "party": "D"
      },
      {
        "name": "Erik Kiehle",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Mississippi 4",
    "state": "MS",
    "district": 4,
    "incumbent": "Mike Ezell",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mike Ezell",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Jeffrey Hulum III",
        "party": "D"
      },
      {
        "name": "Carl Boyanton",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Missouri 1",
    "state": "MO",
    "district": 1,
    "incumbent": "Wesley Bell",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Wesley Bell",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Paul Berry",
        "party": "R"
      },
      {
        "name": "Tom Schmitz",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Missouri 2",
    "state": "MO",
    "district": 2,
    "incumbent": "Ann Wagner",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Ann Wagner",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Fred Wellman",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Missouri 3",
    "state": "MO",
    "district": 3,
    "incumbent": "Bob Onder",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Bob Onder",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Bethany Mann",
        "party": "D"
      },
      {
        "name": "Jim Higgins",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Missouri 4",
    "state": "MO",
    "district": 4,
    "incumbent": "Mark Alford",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mark Alford",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Jordan Herrera",
        "party": "D"
      },
      {
        "name": "Thomas Holbrook",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Missouri 5",
    "state": "MO",
    "district": 5,
    "incumbent": "Emanuel Cleaver",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Emanuel Cleaver",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Rick Brattin",
        "party": "R"
      },
      {
        "name": "Randy Langkraehr",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Missouri 6",
    "state": "MO",
    "district": 6,
    "incumbent": "Sam Graves",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Chris Stigall",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Josh Smead",
        "party": "D"
      },
      {
        "name": "Andy Maidment",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Missouri 7",
    "state": "MO",
    "district": 7,
    "incumbent": "Eric Burlison",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Eric Burlison",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Missi Hesketh",
        "party": "D"
      },
      {
        "name": "Kevin Craig",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Missouri 8",
    "state": "MO",
    "district": 8,
    "incumbent": "Jason Smith",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jason Smith",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Chris Reichard",
        "party": "D"
      },
      {
        "name": "Rebecca Sharpe Lombard",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Montana 1",
    "state": "MT",
    "district": 1,
    "incumbent": "Ryan Zinke",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Aaron Flint",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Sam Forstag",
        "party": "D"
      },
      {
        "name": "Nick Sheehy",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Montana 2",
    "state": "MT",
    "district": 2,
    "incumbent": "Troy Downing",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Troy Downing",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Brian Miller",
        "party": "D"
      },
      {
        "name": "Patrick McCracken",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Nebraska 1",
    "state": "NE",
    "district": 1,
    "incumbent": "Mike Flood",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mike Flood",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Chris Backenmeyer",
        "party": "D"
      },
      {
        "name": "Daniel Hartong",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Nebraska 2",
    "state": "NE",
    "district": 2,
    "incumbent": "Don Bacon",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Brinker Harding",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Denise Powell",
        "party": "D"
      },
      {
        "name": "Eric Foreman",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Nebraska 3",
    "state": "NE",
    "district": 3,
    "incumbent": "Adrian Smith",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Adrian Smith",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Becky Stile",
        "party": "D"
      },
      {
        "name": "David Else",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Nevada 1",
    "state": "NV",
    "district": 1,
    "incumbent": "Dina Titus",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Dina Titus",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Carrie Buck",
        "party": "R"
      },
      {
        "name": "Bobby Khan",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Nevada 2",
    "state": "NV",
    "district": 2,
    "incumbent": "Mark Amodei",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "David Flippo",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Terea Benitez-Thompson",
        "party": "D"
      },
      {
        "name": "Lynn Chapman",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Nevada 3",
    "state": "NV",
    "district": 3,
    "incumbent": "Susie Lee",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Susie Lee",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Martin O'Donnell",
        "party": "R"
      },
      {
        "name": "Jon Kamerath",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Nevada 4",
    "state": "NV",
    "district": 4,
    "incumbent": "Steven Horsford",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Steven Horsford",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Cody Whipple",
        "party": "R"
      },
      {
        "name": "Russell Best",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New Hampshire 1",
    "state": "NH",
    "district": 1,
    "incumbent": "Chris Pappas",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Chris Pappas",
        "party": "D",
        "incumbent": true
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New Hampshire 2",
    "state": "NH",
    "district": 2,
    "incumbent": "Maggie Goodlander",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Maggie Goodlander",
        "party": "D",
        "incumbent": true
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New Jersey 1",
    "state": "NJ",
    "district": 1,
    "incumbent": "Donald Norcross",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Donald Norcross",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Damon Galdo",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New Jersey 2",
    "state": "NJ",
    "district": 2,
    "incumbent": "Jeff Van Drew",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jeff Van Drew",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Zack Millock",
        "party": "D"
      },
      {
        "name": "Ramon Mora Jr",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New Jersey 3",
    "state": "NJ",
    "district": 3,
    "incumbent": "Herb Conaway",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Herb Conaway",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Michael McGuire",
        "party": "R"
      },
      {
        "name": "Steven Welzer",
        "party": "G"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New Jersey 4",
    "state": "NJ",
    "district": 4,
    "incumbent": "Chris Smith",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Chris Smith",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Racjel Peace",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New Jersey 5",
    "state": "NJ",
    "district": 5,
    "incumbent": "Josh Gottheimer",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Josh Gottheimer",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Sean Kirrane",
        "party": "R"
      },
      {
        "name": "Adam Rueda",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New Jersey 6",
    "state": "NJ",
    "district": 6,
    "incumbent": "Frank Pallone",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Frank Pallone",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Hillary Herzig",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New Jersey 7",
    "state": "NJ",
    "district": 7,
    "incumbent": "Thomas Kean Jr.",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Thomas Kean Jr.",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Rebecca Bennett",
        "party": "D"
      },
      {
        "name": "Seamus O'Toole",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New Jersey 8",
    "state": "NJ",
    "district": 8,
    "incumbent": "Rob Menendez",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Rob Menendez",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Craig Honts",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New Jersey 9",
    "state": "NJ",
    "district": 9,
    "incumbent": "Nellie Pou",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Nellie Pou",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Rosie Pino",
        "party": "R"
      },
      {
        "name": "Terrisa Bukovinac",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New Jersey 10",
    "state": "NJ",
    "district": 10,
    "incumbent": "LaMonica McIver",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "LaMonica McIver",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Carmen Bucco",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New Jersey 11",
    "state": "NJ",
    "district": 11,
    "incumbent": "Mikie Sherrill",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Analilia Mejia",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Joe Hathaway",
        "party": "R"
      },
      {
        "name": "Alan Bond",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New Jersey 12",
    "state": "NJ",
    "district": 12,
    "incumbent": "Bonnie Watson Coleman",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Adam Hamawy",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Gregg Mele",
        "party": "R"
      },
      {
        "name": "Andres Jinete",
        "party": "G"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New Mexico 1",
    "state": "NM",
    "district": 1,
    "incumbent": "Melanie Stansbury",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Melanie Stansbury",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Didi Okpareke",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New Mexico 2",
    "state": "NM",
    "district": 2,
    "incumbent": "Gabe Vasquez",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Gabe Vasquez",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Greg Cunningham",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New Mexico 3",
    "state": "NM",
    "district": 3,
    "incumbent": "Teresa Leger Fernandez",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Teresa Leger Fernandez",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Martin Zamora",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 1",
    "state": "NY",
    "district": 1,
    "incumbent": "Nick LaLota",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Nick LaLota",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Chris Gallant",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 2",
    "state": "NY",
    "district": 2,
    "incumbent": "Andrew Garbarino",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Andrew Garbarino",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Patrick Halpin",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 3",
    "state": "NY",
    "district": 3,
    "incumbent": "Tom Suozzi",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Tom Suozzi",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Mike LiPetri",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 4",
    "state": "NY",
    "district": 4,
    "incumbent": "Laura Gillen",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Laura Gillen",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Jeanine Driscoll",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 5",
    "state": "NY",
    "district": 5,
    "incumbent": "Gregory Meeks",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Gregory Meeks",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "George Marsh",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 6",
    "state": "NY",
    "district": 6,
    "incumbent": "Grace Meng",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Grace Meng",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Joseph Chou",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 7",
    "state": "NY",
    "district": 7,
    "incumbent": "Nydia Velázquez",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Claire Valdez",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Melvin Rivera",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 8",
    "state": "NY",
    "district": 8,
    "incumbent": "Hakeem Jeffries",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Hakeem Jeffries",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Lewis Mizrahi",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 9",
    "state": "NY",
    "district": 9,
    "incumbent": "Yvette Clarke",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Yvette Clarke",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Joel Anabilah-Azumah",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 10",
    "state": "NY",
    "district": 10,
    "incumbent": "Dan Goldman",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Brad Lander",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Jennifer Moore",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 11",
    "state": "NY",
    "district": 11,
    "incumbent": "Nicole Malliotakis",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Nicole Malliotakis",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Michael DeCillis",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 12",
    "state": "NY",
    "district": 12,
    "incumbent": "Jerry Nadler",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Micah Lasher",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Nicole Malliotakis",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 13",
    "state": "NY",
    "district": 13,
    "incumbent": "Adriano Espaillat",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Darializa Avila Chevalier",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Jomo Williams",
        "party": "R"
      },
      {
        "name": "Bob Cohen",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 14",
    "state": "NY",
    "district": 14,
    "incumbent": "Alexandria Ocasio-Cortez",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Alexandria Ocasio-Cortez",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Diamant Hysenaj",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 15",
    "state": "NY",
    "district": 15,
    "incumbent": "Ritchie Torres",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Ritchie Torres",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Stylo Sapaskis",
        "party": "R"
      },
      {
        "name": "Gonzalo Duran",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 16",
    "state": "NY",
    "district": 16,
    "incumbent": "George Latimer",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "George Latimer",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Joseph Cinquemani",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 17",
    "state": "NY",
    "district": 17,
    "incumbent": "Mike Lawler",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mike Lawler",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Cait Conley",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 18",
    "state": "NY",
    "district": 18,
    "incumbent": "Pat Ryan",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Pat Ryan",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Jacqueline Auringer",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 19",
    "state": "NY",
    "district": 19,
    "incumbent": "Josh Riley",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Josh Riley",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Peter Oberacker",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 20",
    "state": "NY",
    "district": 20,
    "incumbent": "Paul Tonko",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Paul Tonko",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Ralph Ambrosio",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 21",
    "state": "NY",
    "district": 21,
    "incumbent": "Elise Stefanik",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Anthonu Constantino",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Blake Gendebien",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 22",
    "state": "NY",
    "district": 22,
    "incumbent": "John Mannion",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "John Mannion",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Kailee Buller",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 23",
    "state": "NY",
    "district": 23,
    "incumbent": "Nick Langworthy",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Nick Langworthy",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Aaron Gies",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 24",
    "state": "NY",
    "district": 24,
    "incumbent": "Claudia Tenney",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Claudia Tenney",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Alissa Ellman",
        "party": "D"
      },
      {
        "name": "Todd Sloan",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 25",
    "state": "NY",
    "district": 25,
    "incumbent": "Joseph Morelle",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Joseph Morelle",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Virgina mcIntyre",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "New York 26",
    "state": "NY",
    "district": 26,
    "incumbent": "Tim Kennedy",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Tim Kennedy",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Dennis Hannon",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "North Carolina 1",
    "state": "NC",
    "district": 1,
    "incumbent": "Don Davis",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Don Davis",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Laurie Buckhout",
        "party": "R"
      },
      {
        "name": "Tom Bailey",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "North Carolina 2",
    "state": "NC",
    "district": 2,
    "incumbent": "Deborah Ross",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Deborah Ross",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Eugene Douglass",
        "party": "R"
      },
      {
        "name": "Matthew Laszacs",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "North Carolina 3",
    "state": "NC",
    "district": 3,
    "incumbent": "Greg Murphy",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Greg Murphy",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Raymond Smith Jr.",
        "party": "D"
      },
      {
        "name": "Daniel Cavender",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "North Carolina 4",
    "state": "NC",
    "district": 4,
    "incumbent": "Valerie Foushee",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Valerie Foushee",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Max Ganorkar",
        "party": "R"
      },
      {
        "name": "Guy Meilleur",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "North Carolina 5",
    "state": "NC",
    "district": 5,
    "incumbent": "Virginia Foxx",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Virginia Foxx",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Chuck Hubbard",
        "party": "D"
      },
      {
        "name": "Robert Luffman",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "North Carolina 6",
    "state": "NC",
    "district": 6,
    "incumbent": "Addison McDowell",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Addison McDowell",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Cyril Jefferson",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "North Carolina 7",
    "state": "NC",
    "district": 7,
    "incumbent": "David Rouzer",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "David Rouzer",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Kimberly Hardy",
        "party": "D"
      },
      {
        "name": "Maad Abu-Ghazalah",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "North Carolina 8",
    "state": "NC",
    "district": 8,
    "incumbent": "Mark Harris",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mark Harris",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Colby Watson",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "North Carolina 9",
    "state": "NC",
    "district": 9,
    "incumbent": "Richard Hudson",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Richard Hudson",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Richard Ojeda",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "North Carolina 10",
    "state": "NC",
    "district": 10,
    "incumbent": "Pat Harrigan",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Pat Harrigan",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Ashley Bell",
        "party": "D"
      },
      {
        "name": "Steve Feldman",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "North Carolina 11",
    "state": "NC",
    "district": 11,
    "incumbent": "Chuck Edwards",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jennifer Balkcom",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Jamie Ager",
        "party": "D"
      },
      {
        "name": "Travis Groo",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "North Carolina 12",
    "state": "NC",
    "district": 12,
    "incumbent": "Alma Adams",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Alma Adams",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Jack Codiga",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "North Carolina 13",
    "state": "NC",
    "district": 13,
    "incumbent": "Brad Knott",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Brad Knott",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Paul Narringer",
        "party": "D"
      },
      {
        "name": "Steven Swinton",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "North Carolina 14",
    "state": "NC",
    "district": 14,
    "incumbent": "Tim Moore",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Tim Moore",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Lakesha Womack",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "North Dakota at-large",
    "state": "ND",
    "district": 0,
    "incumbent": "Julie Fedorchak",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Julie Fedorchak",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Trygve Hammer",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Ohio 1",
    "state": "OH",
    "district": 1,
    "incumbent": "Greg Landsman",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Greg Landsman",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Eric Conroy",
        "party": "R"
      },
      {
        "name": "John Hancock",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Ohio 2",
    "state": "OH",
    "district": 2,
    "incumbent": "David Taylor",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "David Taylor",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Jennifer Mazzuckelli",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Ohio 3",
    "state": "OH",
    "district": 3,
    "incumbent": "Joyce Beatty",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Joyce Beatty",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Cleophus Delaney",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Ohio 4",
    "state": "OH",
    "district": 4,
    "incumbent": "Jim Jordan",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jim Jordan",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Joshua Kolasinski",
        "party": "D"
      },
      {
        "name": "Tamie Wilson",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Ohio 5",
    "state": "OH",
    "district": 5,
    "incumbent": "Bob Latta",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Bob Latta",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Brian Shaver",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Ohio 6",
    "state": "OH",
    "district": 6,
    "incumbent": "Michael Rulli",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Michael Rulli",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Elizabeth Kirtley",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Ohio 7",
    "state": "OH",
    "district": 7,
    "incumbent": "Max Miller",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Max Miller",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Brian Poindexter",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Ohio 8",
    "state": "OH",
    "district": 8,
    "incumbent": "Warren Davidson",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Warren Davidson",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Vanessa Enoch",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Ohio 9",
    "state": "OH",
    "district": 9,
    "incumbent": "Marcy Kaptur",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Marcy Kaptur",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Derek Merrin",
        "party": "R"
      },
      {
        "name": "Matthew Althaus",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Ohio 10",
    "state": "OH",
    "district": 10,
    "incumbent": "Mike Turner",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mike Turner",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Kristina Knickerbocker",
        "party": "D"
      },
      {
        "name": "Thomas McMasters",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Ohio 11",
    "state": "OH",
    "district": 11,
    "incumbent": "Shontel Brown",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Shontel Brown",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Mike Kirchner",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Ohio 12",
    "state": "OH",
    "district": 12,
    "incumbent": "Troy Balderson",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Troy Balderson",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Jerrad Christian",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Ohio 13",
    "state": "OH",
    "district": 13,
    "incumbent": "Emilia Sykes",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Emilia Sykes",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Carey Coleman",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Ohio 14",
    "state": "OH",
    "district": 14,
    "incumbent": "David Joyce",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "David Joyce",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Maria Jukic",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Ohio 15",
    "state": "OH",
    "district": 15,
    "incumbent": "Mike Carey",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mike Carey",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Don Leonard",
        "party": "D"
      },
      {
        "name": "Brennan Barrington",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Oklahoma 1",
    "state": "OK",
    "district": 1,
    "incumbent": "Kevin Hern",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mark Tedford",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "John Croisant",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Oklahoma 2",
    "state": "OK",
    "district": 2,
    "incumbent": "Josh Brecheen",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Josh Brecheen",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Brandon Wade",
        "party": "D"
      },
      {
        "name": "Ronnie Hopkins",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Oklahoma 3",
    "state": "OK",
    "district": 3,
    "incumbent": "Frank Lucas",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Frank Lucas",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Suzie Byrd",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Oklahoma 4",
    "state": "OK",
    "district": 4,
    "incumbent": "Tom Cole",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Tom Cole",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Mitchell Jacob",
        "party": "D"
      },
      {
        "name": "Rocco Bonacci",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Oklahoma 5",
    "state": "OK",
    "district": 5,
    "incumbent": "Stephanie Bice",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Stephanie Bice",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Jena Nelson",
        "party": "D"
      },
      {
        "name": "Austin Nieves",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Oregon 1",
    "state": "OR",
    "district": 1,
    "incumbent": "Suzanne Bonamici",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Suzanne Bonamici",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Barbara Kahl",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Oregon 2",
    "state": "OR",
    "district": 2,
    "incumbent": "Cliff Bentz",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Cliff Bentz",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Chris Beck",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Oregon 3",
    "state": "OR",
    "district": 3,
    "incumbent": "Maxine Dexter",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Maxine Dexter",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Loran Ayles",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Oregon 4",
    "state": "OR",
    "district": 4,
    "incumbent": "Val Hoyle",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Val Hoyle",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Monique DeSpain",
        "party": "R"
      },
      {
        "name": "Justin Filip",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Oregon 5",
    "state": "OR",
    "district": 5,
    "incumbent": "Janelle Bynum",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Janelle Bynum",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Patti Adair",
        "party": "R"
      },
      {
        "name": "Andrea Townsend",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Oregon 6",
    "state": "OR",
    "district": 6,
    "incumbent": "Andrea Salinas",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Andrea Salinas",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "David Russ",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Pennsylvania 1",
    "state": "PA",
    "district": 1,
    "incumbent": "Brian Fitzpatrick",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Brian Fitzpatrick",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Bob Harvie",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Pennsylvania 2",
    "state": "PA",
    "district": 2,
    "incumbent": "Brendan Boyle",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Brendan Boyle",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Jessica Arriaga",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Pennsylvania 3",
    "state": "PA",
    "district": 3,
    "incumbent": "Dwight Evans",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Chris Rabb",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Dennis Mahoney",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Pennsylvania 4",
    "state": "PA",
    "district": 4,
    "incumbent": "Madeleine Dean",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Madeleine Dean",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Aurora Stuski",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Pennsylvania 5",
    "state": "PA",
    "district": 5,
    "incumbent": "Mary Gay Scanlon",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Mary Gay Scanlon",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Nicholas Manganaro",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Pennsylvania 6",
    "state": "PA",
    "district": 6,
    "incumbent": "Chrissy Houlahan",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Chrissy Houlahan",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Marty Young",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Pennsylvania 7",
    "state": "PA",
    "district": 7,
    "incumbent": "Ryan Mackenzie",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Ryan Mackenzie",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Bob Brooks",
        "party": "D"
      },
      {
        "name": "Andrew Tupone",
        "party": "G"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Pennsylvania 8",
    "state": "PA",
    "district": 8,
    "incumbent": "Rob Bresnahan",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Rob Bresnahan",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Paige Cognetti",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Pennsylvania 9",
    "state": "PA",
    "district": 9,
    "incumbent": "Dan Meuser",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Dan Meuser",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Rachel Wallace",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Pennsylvania 10",
    "state": "PA",
    "district": 10,
    "incumbent": "Scott Perry",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Scott Perry",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Janelle Stelson",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Pennsylvania 11",
    "state": "PA",
    "district": 11,
    "incumbent": "Lloyd Smucker",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Lloyd Smucker",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Nancy Mannion",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Pennsylvania 12",
    "state": "PA",
    "district": 12,
    "incumbent": "Summer Lee",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Summer Lee",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Jamews Hayes",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Pennsylvania 13",
    "state": "PA",
    "district": 13,
    "incumbent": "John Joyce",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "John Joyce",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Beth Farnham",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Pennsylvania 14",
    "state": "PA",
    "district": 14,
    "incumbent": "Guy Reschenthaler",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Guy Reschenthaler",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Alan Bradstock",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Pennsylvania 15",
    "state": "PA",
    "district": 15,
    "incumbent": "Glenn Thompson",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Glenn Thompson",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Ray Bilger",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Pennsylvania 16",
    "state": "PA",
    "district": 16,
    "incumbent": "Mike Kelly",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mike Kelly",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Justin Wagner",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Pennsylvania 17",
    "state": "PA",
    "district": 17,
    "incumbent": "Chris Deluzio",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Chris Deluzio",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Tony Guy",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Rhode Island 1",
    "state": "RI",
    "district": 1,
    "incumbent": "Gabe Amo",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Gabe Amo",
        "party": "D",
        "incumbent": true
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Rhode Island 2",
    "state": "RI",
    "district": 2,
    "incumbent": "Seth Magaziner",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Seth Magaziner",
        "party": "D",
        "incumbent": true
      }
    ]
  },
  {
    "chamber": "house",
    "place": "South Carolina 1",
    "state": "SC",
    "district": 1,
    "incumbent": "Nancy Mace",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jenny Costa Honeycutt",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Nancy Lacore",
        "party": "D"
      },
      {
        "name": "Bill Reeside",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "South Carolina 2",
    "state": "SC",
    "district": 2,
    "incumbent": "Joe Wilson",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Joe Wilson",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Zyon Khalifa",
        "party": "D"
      },
      {
        "name": "Dayna Alane Smith",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "South Carolina 3",
    "state": "SC",
    "district": 3,
    "incumbent": "Sheri Biggs",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Sheri Biggs",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Eunice Lehmacher",
        "party": "D"
      },
      {
        "name": "Brian Corriea",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "South Carolina 4",
    "state": "SC",
    "district": 4,
    "incumbent": "William Timmons",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "William Timmons",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Courtney McClain",
        "party": "D"
      },
      {
        "name": "Jessica Ethridge",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "South Carolina 5",
    "state": "SC",
    "district": 5,
    "incumbent": "Ralph Norman",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Wes CLimer",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Mallory Dittmer",
        "party": "D"
      },
      {
        "name": "Andy Kaplan",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "South Carolina 6",
    "state": "SC",
    "district": 6,
    "incumbent": "Jim Clyburn",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jim Clyburn",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "John Peterson",
        "party": "R"
      },
      {
        "name": "Joseph Oddo",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "South Carolina 7",
    "state": "SC",
    "district": 7,
    "incumbent": "Russell Fry",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Russell Fry",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "John Vincent",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "South Dakota at-large",
    "state": "SD",
    "district": 0,
    "incumbent": "Dusty Johnson",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Marty Jackley",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Nikki Gronli",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Tennessee 1",
    "state": "TN",
    "district": 1,
    "incumbent": "Diana Harshbarger",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Diana Harshbarger",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Kristi Burke",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Tennessee 2",
    "state": "TN",
    "district": 2,
    "incumbent": "Tim Burchett",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Tim Burchett",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Michaela Barnett",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Tennessee 3",
    "state": "TN",
    "district": 3,
    "incumbent": "Chuck Fleischmann",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Chuck Fleischmann",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Anna Golladay",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Tennessee 4",
    "state": "TN",
    "district": 4,
    "incumbent": "Scott DesJarlais",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Scott DesJarlais",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Victoria Broderick",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Tennessee 5",
    "state": "TN",
    "district": 5,
    "incumbent": "Andy Ogles",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Chaz Molder",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Charlie Hatcher",
        "party": "D"
      },
      {
        "name": "James Johnson",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Tennessee 6",
    "state": "TN",
    "district": 6,
    "incumbent": "John Rose",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Johnny Garrett",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Mike Croley",
        "party": "D"
      },
      {
        "name": "Christopher Monday",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Tennessee 7",
    "state": "TN",
    "district": 7,
    "incumbent": "Vacant",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Matt Van Epps",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Darden Copeland",
        "party": "D"
      },
      {
        "name": "Andrew Koontz",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Tennessee 8",
    "state": "TN",
    "district": 8,
    "incumbent": "David Kustoff",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "David Kustoff",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Heidi Kuhn",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Tennessee 9",
    "state": "TN",
    "district": 9,
    "incumbent": "Steve Cohen",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Justin Pearson",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Brent Taylor",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 1",
    "state": "TX",
    "district": 1,
    "incumbent": "Nathaniel Moran",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Nathaniel Moran",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Yolanda Prince",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 2",
    "state": "TX",
    "district": 2,
    "incumbent": "Dan Crenshaw",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Steve Toth",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Shaun Finnie",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 3",
    "state": "TX",
    "district": 3,
    "incumbent": "Keith Self",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Keith Self",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Evan Hunt",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 4",
    "state": "TX",
    "district": 4,
    "incumbent": "Pat Fallon",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Pat Fallon",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Jason Pearce",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 5",
    "state": "TX",
    "district": 5,
    "incumbent": "Lance Gooden",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Lance Gooden",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Chelsey Hockett",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 6",
    "state": "TX",
    "district": 6,
    "incumbent": "Jake Ellzey",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jake Ellzey",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Danny Minton",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 7",
    "state": "TX",
    "district": 7,
    "incumbent": "Lizzie Fletcher",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Lizzie Fletcher",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Alexander Hale",
        "party": "R"
      },
      {
        "name": "Espoir Ngabo",
        "party": "G"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 8",
    "state": "TX",
    "district": 8,
    "incumbent": "Morgan Luttrell",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Laura Jones",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Jessica Hart Steinmann",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 9",
    "state": "TX",
    "district": 9,
    "incumbent": "Al Green",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Leticia Guitierrez",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Alex Mealer",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 10",
    "state": "TX",
    "district": 10,
    "incumbent": "Michael McCaul",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Chris Gober",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Caitlin Rourk",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 11",
    "state": "TX",
    "district": 11,
    "incumbent": "August Pfluger",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "August Pfluger",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Claire Reynolds",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 12",
    "state": "TX",
    "district": 12,
    "incumbent": "Craig Goldman",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Craig Goldman",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Angela Rodriguelz Prilliman",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 13",
    "state": "TX",
    "district": 13,
    "incumbent": "Ronny Jackson",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Ronny Jackson",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Mark Nair",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 14",
    "state": "TX",
    "district": 14,
    "incumbent": "Randy Weber",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Randy Weber",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Thurman Bartie",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 15",
    "state": "TX",
    "district": 15,
    "incumbent": "Monica De La Cruz",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Monica De La Cruz",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Bobby Pulido",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 16",
    "state": "TX",
    "district": 16,
    "incumbent": "Veronica Escobar",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Veronica Escobar",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Adam Bauman",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 17",
    "state": "TX",
    "district": 17,
    "incumbent": "Pete Sessions",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Pete Sessions",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Casey Shepard",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 18",
    "state": "TX",
    "district": 18,
    "incumbent": "Christian Menefee",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Christian Menefee",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Ronald Whitfield",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 19",
    "state": "TX",
    "district": 19,
    "incumbent": "Jodey Arrington",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Tom Sell",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Kyle Rable",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 20",
    "state": "TX",
    "district": 20,
    "incumbent": "Joaquin Castro",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Joaquin Castro",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Edgardo Rafael Baez",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 21",
    "state": "TX",
    "district": 21,
    "incumbent": "Chip Roy",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mark Teixeira",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Kristin Hook",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 22",
    "state": "TX",
    "district": 22,
    "incumbent": "Troy Nehls",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Trever Nehls",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Marquette Greene-Scott",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 23",
    "state": "TX",
    "district": 23,
    "incumbent": "Tony Gonzales",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Brandon Herrera",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Katy Padilla Stout",
        "party": "D"
      },
      {
        "name": "Ben Mendoza",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 24",
    "state": "TX",
    "district": 24,
    "incumbent": "Beth Van Duyne",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Beth Van Duyne",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Kevin Burge",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 25",
    "state": "TX",
    "district": 25,
    "incumbent": "Roger Williams",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Roger Williams",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Dione Sims",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 26",
    "state": "TX",
    "district": 26,
    "incumbent": "Brandon Gill",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Brandon Gill",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Steven Shook",
        "party": "D"
      },
      {
        "name": "Phil Gray",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 27",
    "state": "TX",
    "district": 27,
    "incumbent": "Michael Cloud",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Michael Cloud",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Tanya Lloyd",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 28",
    "state": "TX",
    "district": 28,
    "incumbent": "Henry Cuellar",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Henry Cuellar",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Tano Tijerina",
        "party": "R"
      },
      {
        "name": "Marlon Duran",
        "party": "G"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 29",
    "state": "TX",
    "district": 29,
    "incumbent": "Sylvia Garcia",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Sylvia Garcia",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Martha Fierro",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 30",
    "state": "TX",
    "district": 30,
    "incumbent": "Jasmine Crockett",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Frederick Haynes III",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Everett Jackson",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 31",
    "state": "TX",
    "district": 31,
    "incumbent": "John Carter",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "John Carter",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Justin Early",
        "party": "D"
      },
      {
        "name": "Greg Stoker",
        "party": "G"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 32",
    "state": "TX",
    "district": 32,
    "incumbent": "Julie Johnson",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Dan Barrios",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Jace Yarbrough",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 33",
    "state": "TX",
    "district": 33,
    "incumbent": "Marc Veasey",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Colin Allred",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Patrick Gillespie",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 34",
    "state": "TX",
    "district": 34,
    "incumbent": "Vicente Gonzalez",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Vicente Gonzalez",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Eric Flores",
        "party": "R"
      },
      {
        "name": "Eddie Espinoza",
        "party": "G"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 35",
    "state": "TX",
    "district": 35,
    "incumbent": "Greg Casar",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Johnny Garcia",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Carlos De La Cruz",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 36",
    "state": "TX",
    "district": 36,
    "incumbent": "Brian Babin",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Brian Babin",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Rhonda Hart",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 37",
    "state": "TX",
    "district": 37,
    "incumbent": "Lloyd Doggett",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Greg Casar",
        "party": "D",
        "incumbent": false
      },
      {
        "name": "Lauren Pena",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Texas 38",
    "state": "TX",
    "district": 38,
    "incumbent": "Wesley Hunt",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jon Bonck",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Melissa McDonough",
        "party": "D"
      },
      {
        "name": "Alex McMenemy",
        "party": "G"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Utah 1",
    "state": "UT",
    "district": 1,
    "incumbent": "Blake Moore",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Riley Owen",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Ben McAdams",
        "party": "D"
      },
      {
        "name": "Jesse West",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Utah 2",
    "state": "UT",
    "district": 2,
    "incumbent": "Celeste Maloy",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Blake Moore",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Peter Crosby",
        "party": "D"
      },
      {
        "name": "Daniel Cottam",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Utah 3",
    "state": "UT",
    "district": 3,
    "incumbent": "Mike Kennedy",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Celeste Maloy",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Kent Udell",
        "party": "D"
      },
      {
        "name": "Michael Stoddard",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Utah 4",
    "state": "UT",
    "district": 4,
    "incumbent": "Burgess Owens",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Mike Kennedy",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Jonny Larsen",
        "party": "D"
      },
      {
        "name": "Taylor Wright",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Vermont at-large",
    "state": "VT",
    "district": 0,
    "incumbent": "Becca Balint",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Becca Balint",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Gerald Malloy",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Virginia 1",
    "state": "VA",
    "district": 1,
    "incumbent": "Rob Wittman",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Rob Wittman",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Shannon Taylor",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Virginia 2",
    "state": "VA",
    "district": 2,
    "incumbent": "Jen Kiggans",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Jen Kiggans",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Elaine Luria",
        "party": "D"
      },
      {
        "name": "J Matt Baker",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Virginia 3",
    "state": "VA",
    "district": 3,
    "incumbent": "Bobby Scott",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Bobby Scott",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Edwin Rivera",
        "party": "R"
      },
      {
        "name": "Stephen Woll",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Virginia 4",
    "state": "VA",
    "district": 4,
    "incumbent": "Jennifer McClellan",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Jennifer McClellan",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Robert Murray",
        "party": "R"
      },
      {
        "name": "Joan Bell",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Virginia 5",
    "state": "VA",
    "district": 5,
    "incumbent": "John McGuire",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "John McGuire",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Tom Perriello",
        "party": "D"
      },
      {
        "name": "Cook Harvey",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Virginia 6",
    "state": "VA",
    "district": 6,
    "incumbent": "Ben Cline",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Ben Cline",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Beth Macy",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Virginia 7",
    "state": "VA",
    "district": 7,
    "incumbent": "Eugene Vindman",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Eugene Vindman",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Doug Ollivant",
        "party": "R"
      },
      {
        "name": "Taner Demirci Lopez",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Virginia 8",
    "state": "VA",
    "district": 8,
    "incumbent": "Don Beyer",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Don Beyer",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Tony Sabio",
        "party": "R"
      },
      {
        "name": "Shelly Arnoldi",
        "party": "L"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Virginia 9",
    "state": "VA",
    "district": 9,
    "incumbent": "Morgan Griffith",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Morgan Griffith",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Joy Powers",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Virginia 10",
    "state": "VA",
    "district": 10,
    "incumbent": "Suhas Subramanyam",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Suhas Subramanyam",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Dave Beckwith",
        "party": "R"
      },
      {
        "name": "Ahsen Malik",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Virginia 11",
    "state": "VA",
    "district": 11,
    "incumbent": "James Walkinshaw",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "James Walkinshaw",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Arthur Purves",
        "party": "R"
      },
      {
        "name": "Dianne Blais",
        "party": "G"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Washington 1",
    "state": "WA",
    "district": 1,
    "incumbent": "Suzan DelBene",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Suzan DelBene",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Mary Silva",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Washington 2",
    "state": "WA",
    "district": 2,
    "incumbent": "Rick Larsen",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Rick Larsen",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Edwin Feller",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Washington 3",
    "state": "WA",
    "district": 3,
    "incumbent": "Marie Gluesenkamp Perez",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Marie Gluesenkamp Perez",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "John Braun",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Washington 4",
    "state": "WA",
    "district": 4,
    "incumbent": "Dan Newhouse",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Amanda McKinney",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "John Duresky",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Washington 5",
    "state": "WA",
    "district": 5,
    "incumbent": "Michael Baumgartner",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Michael Baumgartner",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Carmela Conroy",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Washington 6",
    "state": "WA",
    "district": 6,
    "incumbent": "Emily Randall",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Emily Randall",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Teresa Fox",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Washington 7",
    "state": "WA",
    "district": 7,
    "incumbent": "Pramila Jayapal",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Pramila Jayapal",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Nirav Sheth",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Washington 8",
    "state": "WA",
    "district": 8,
    "incumbent": "Kim Schrier",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Kim Schrier",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Spencer Meline",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Washington 9",
    "state": "WA",
    "district": 9,
    "incumbent": "Adam Smith",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Adam Smith",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Doug Basler",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Washington 10",
    "state": "WA",
    "district": 10,
    "incumbent": "Marilyn Strickland",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Marilyn Strickland",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Chris Chung",
        "party": "R"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "West Virginia 1",
    "state": "WV",
    "district": 1,
    "incumbent": "Carol Miller",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Carol Miller",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Vince George",
        "party": "D"
      },
      {
        "name": "Belinda Fox-Spencer",
        "party": "O"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "West Virginia 2",
    "state": "WV",
    "district": 2,
    "incumbent": "Riley Moore",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Riley Moore",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Ace Parsi",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Wisconsin 1",
    "state": "WI",
    "district": 1,
    "incumbent": "Bryan Steil",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Bryan Steil",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Mitchell Berman",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Wisconsin 2",
    "state": "WI",
    "district": 2,
    "incumbent": "Mark Pocan",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Mark Pocan",
        "party": "D",
        "incumbent": true
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Wisconsin 3",
    "state": "WI",
    "district": 3,
    "incumbent": "Derrick Van Orden",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Derrick Van Orden",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Rebecca Cooke",
        "party": "D"
      },
      {
        "name": "Alexander Kent",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Wisconsin 4",
    "state": "WI",
    "district": 4,
    "incumbent": "Gwen Moore",
    "incumbentParty": "D",
    "candidates": [
      {
        "name": "Gwen Moore",
        "party": "D",
        "incumbent": true
      },
      {
        "name": "Tim Rogers",
        "party": "R"
      },
      {
        "name": "Arthur Burks",
        "party": "I"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Wisconsin 5",
    "state": "WI",
    "district": 5,
    "incumbent": "Scott Fitzgerald",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Scott Fitzgerald",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Andrew Beck",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Wisconsin 6",
    "state": "WI",
    "district": 6,
    "incumbent": "Glenn Grothman",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Glenn Grothman",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Brad Smith",
        "party": "D"
      },
      {
        "name": "Matthew Arndt",
        "party": "G"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Wisconsin 7",
    "state": "WI",
    "district": 7,
    "incumbent": "Tom Tiffany",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Michael Alfonso",
        "party": "R",
        "incumbent": false
      },
      {
        "name": "Fred Clark",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Wisconsin 8",
    "state": "WI",
    "district": 8,
    "incumbent": "Tony Wied",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Tony Wied",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Rick Crosson",
        "party": "D"
      }
    ]
  },
  {
    "chamber": "house",
    "place": "Wyoming at-large",
    "state": "WY",
    "district": 0,
    "incumbent": "Harriet Hageman",
    "incumbentParty": "R",
    "candidates": [
      {
        "name": "Harriet Hageman",
        "party": "R",
        "incumbent": true
      },
      {
        "name": "Lisa Kinney",
        "party": "D"
      }
    ],
    "note": "Dem Hold"
  }
];

export const BOARD_SENATE = BIG_BOARD_2026.filter((r) => r.chamber === "senate");
export const BOARD_HOUSE = BIG_BOARD_2026.filter((r) => r.chamber === "house");
