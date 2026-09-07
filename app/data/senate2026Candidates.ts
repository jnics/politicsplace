// General-election candidates for the 2026 Senate races, keyed by state USPS
// code. Compiled from Wikipedia's "2026 United States Senate elections"
// candidate table; primary also-rans are dropped, third-party/independent
// candidates on the November ballot are kept. Reconfirm closer to Election Day
// (Nov 3, 2026) -- a few nominations were still unsettled at research time.

export type BallotParty = "D" | "R" | "I" | "L" | "G" | "O";

export interface BallotCandidate {
  name: string;
  party: BallotParty;
  incumbent?: boolean;
}

export const SENATE_2026_CANDIDATES: Record<string, BallotCandidate[]> = {
  AL: [
    { name: "Barry Moore", party: "R" },
    { name: "Everett Wess", party: "D" },
  ],
  AK: [
    { name: "Dan Sullivan", party: "R", incumbent: true },
    { name: "Mary Peltola", party: "D" },
    { name: "Gerald Heikes", party: "R" },
  ],
  AR: [
    { name: "Tom Cotton", party: "R", incumbent: true },
    { name: "Hallie Shoffner", party: "D" },
    { name: "Jeff Wadlin", party: "L" },
  ],
  CO: [
    { name: "John Hickenlooper", party: "D", incumbent: true },
    { name: "Mark Baisley", party: "R" },
  ],
  DE: [
    { name: "Chris Coons", party: "D", incumbent: true },
    { name: "John Shulli", party: "R" },
  ],
  FL: [
    { name: "Ashley Moody", party: "R", incumbent: true },
    { name: "Vindman", party: "D" },
  ],
  GA: [
    { name: "Jon Ossoff", party: "D", incumbent: true },
    { name: "Mike Collins", party: "R" },
  ],
  ID: [
    { name: "Jim Risch", party: "R", incumbent: true },
    { name: "Todd Achilles", party: "I" },
    { name: "Matt Loesby", party: "L" },
  ],
  IL: [
    { name: "Juliana Stratton", party: "D" },
    { name: "Don Tracy", party: "R" },
  ],
  IA: [
    { name: "Ashley Hinson", party: "R" },
    { name: "Josh Turek", party: "D" },
    { name: "Thomas Laehn", party: "L" },
  ],
  KS: [
    { name: "Roger Marshall", party: "R", incumbent: true },
    { name: "Adam Hamilton", party: "D" },
  ],
  KY: [
    { name: "Andy Barr", party: "R" },
    { name: "Charles Booker", party: "D" },
  ],
  LA: [
    { name: "Julia Letlow", party: "R" },
    { name: "Jamie Davis", party: "D" },
  ],
  ME: [
    { name: "Susan Collins", party: "R", incumbent: true },
    { name: "Troy Jackson", party: "D" },
  ],
  MA: [
    { name: "Ed Markey", party: "D", incumbent: true },
    { name: "John Deaton", party: "R" },
  ],
  MI: [
    { name: "Mike Rogers", party: "R" },
    { name: "Abdul El-Sayed", party: "D" },
    { name: "Douglas P. Marsh", party: "G" },
    { name: "Lydia Christensen", party: "L" },
  ],
  MN: [
    { name: "Peggy Flanagan", party: "D" },
    { name: "Michele Tafoya", party: "R" },
  ],
  MS: [
    { name: "Cindy Hyde-Smith", party: "R", incumbent: true },
    { name: "Scott Colom", party: "D" },
    { name: "Ty Pinkins", party: "I" },
  ],
  MT: [
    { name: "Kurt Alme", party: "R" },
    { name: "Seth Bodnar", party: "I" },
    { name: "Alani Bankhead", party: "D" },
    { name: "Kyle Austin", party: "L" },
  ],
  NE: [
    { name: "Pete Ricketts", party: "R", incumbent: true },
    { name: "Dan Osborn", party: "I" },
  ],
  NH: [
    { name: "Chris Pappas", party: "D" },
    { name: "Scott Brown", party: "R" },
  ],
  NJ: [
    { name: "Cory Booker", party: "D", incumbent: true },
    { name: "Justin Murphy", party: "R" },
  ],
  NM: [
    { name: "Ben Ray Luján", party: "D", incumbent: true },
    { name: "Larry Marker", party: "R" },
  ],
  NC: [
    { name: "Roy Cooper", party: "D" },
    { name: "Michael Whatley", party: "R" },
    { name: "Shannon Bray", party: "L" },
  ],
  OH: [
    { name: "Jon Husted", party: "R", incumbent: true },
    { name: "Sherrod Brown", party: "D" },
  ],
  OK: [
    { name: "Kevin Hern", party: "R" },
    { name: "N'Kiyla Jasmine Thomas", party: "D" },
  ],
  OR: [
    { name: "Jeff Merkley", party: "D", incumbent: true },
    { name: "David Brock Smith", party: "R" },
  ],
  RI: [
    { name: "Jack Reed", party: "D", incumbent: true },
    { name: "Raymond McKay", party: "R" },
  ],
  SC: [
    { name: "Darline Graham", party: "R" },
    { name: "Annie Andrews", party: "D" },
    { name: "Kasie Whitener", party: "L" },
  ],
  SD: [
    { name: "Mike Rounds", party: "R", incumbent: true },
    { name: "Brian Bengs", party: "I" },
  ],
  TN: [
    { name: "Bill Hagerty", party: "R", incumbent: true },
    { name: "Marquita Bradshaw", party: "D" },
  ],
  TX: [
    { name: "Ken Paxton", party: "R" },
    { name: "James Talarico", party: "D" },
    { name: "Ted Brown", party: "L" },
  ],
  VA: [
    { name: "Mark Warner", party: "D", incumbent: true },
    { name: "Bert Mizusawa", party: "R" },
  ],
  WV: [
    { name: "Shelley Moore Capito", party: "R", incumbent: true },
    { name: "Rachel Fetty Anderson", party: "D" },
  ],
  WY: [
    { name: "Harriet Hageman", party: "R" },
    { name: "James W. Byrd", party: "D" },
  ],
};
