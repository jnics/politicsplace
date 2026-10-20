// Every other race on the Medina County ballot on Nov 3, 2026, for the county
// section of the /results election-night page. (The OH-7 House race itself is
// tallied per polling place — see oh7.ts — so it is not repeated here.)
//
// Counts for these are entered county-wide, one row per race, not per polling
// place. Rosters: statewide/judicial nominees from the Wikipedia 2026 Ohio
// election articles, county + legislative from the Medina County Democratic
// Party's "Candidates and Issues" page, the Medina Gazette's primary coverage
// and Ballotpedia. Reconfirm against the Medina BOE's certified list before
// Election Day (lookup.boe.ohio.gov is Cloudflare-walled, so it was not read
// directly).

export type RaceParty = "D" | "R" | "L" | "O" | "Y" | "N";

export interface CountyCandidate {
  /** Stable key used in the results store and the form fields. */
  key: string;
  name: string;
  party: RaceParty;
  incumbent?: boolean;
}

export interface CountyRace {
  /** Stable id used in the results store. */
  id: string;
  title: string;
  candidates: CountyCandidate[];
  note?: string;
  /** Set on the two Ohio House races: only precincts in that district vote on it. */
  houseDistrict?: 66 | 67;
}

export interface CountyRaceGroup {
  label: string;
  races: CountyRace[];
}

/** Precincts in Medina County — the denominator for each race's reporting bar. */
export const MEDINA_PRECINCT_COUNT = 124;

const OTHER: CountyCandidate = { key: "other", name: "Other / write-in", party: "O" };

const race = (
  id: string,
  title: string,
  candidates: CountyCandidate[],
  note?: string,
  houseDistrict?: 66 | 67
): CountyRace => ({ id, title, candidates: [...candidates, OTHER], note, houseDistrict });

export const MEDINA_RACE_GROUPS: CountyRaceGroup[] = [
  {
    label: "Federal & statewide",
    races: [
      race("us-senate", "U.S. Senate (special)", [
        { key: "brown", name: "Sherrod Brown", party: "D" },
        { key: "husted", name: "Jon Husted", party: "R", incumbent: true },
      ]),
      race("governor", "Governor & Lt. Governor", [
        { key: "acton", name: "Amy Acton", party: "D" },
        { key: "ramaswamy", name: "Vivek Ramaswamy", party: "R" },
      ]),
      race("attorney-general", "Attorney General", [
        { key: "kulewicz", name: "John Kulewicz", party: "D" },
        { key: "faber", name: "Keith Faber", party: "R" },
      ]),
      race("auditor-of-state", "Auditor of State", [
        { key: "blackwell", name: "Annette Blackwell", party: "D" },
        { key: "larose", name: "Frank LaRose", party: "R" },
      ]),
      race("secretary-of-state", "Secretary of State", [
        { key: "russo", name: "Allison Russo", party: "D" },
        { key: "sprague", name: "Robert Sprague", party: "R" },
      ]),
      race("treasurer", "Treasurer of State", [
        { key: "walsh", name: "Seth Walsh", party: "D" },
        { key: "edwards", name: "Jay Edwards", party: "R" },
      ]),
    ],
  },
  {
    label: "Ohio House",
    races: [
      race(
        "state-house-66",
        "State Representative, 66th District",
        [
          { key: "nardo", name: "Chris Nardo", party: "D" },
          { key: "hutson", name: "Sean Hutson", party: "R", incumbent: true },
          { key: "peroli", name: "Justin Peroli", party: "L" },
        ],
        "Part of the county.",
        66
      ),
      race(
        "state-house-67",
        "State Representative, 67th District",
        [
          { key: "sample", name: "Heather L. Sample", party: "D" },
          { key: "miller", name: "Melanie Miller", party: "R", incumbent: true },
        ],
        "Part of the county.",
        67
      ),
    ],
  },
  {
    label: "Judicial",
    races: [
      race("supreme-court-jan1", "Ohio Supreme Court (term from Jan. 1)", [
        { key: "zayas", name: "Marilyn Zayas", party: "D" },
        { key: "hawkins", name: "Dan Hawkins", party: "R", incumbent: true },
      ]),
      race("supreme-court-jan2", "Ohio Supreme Court (term from Jan. 2)", [
        { key: "brunner", name: "Jennifer Brunner", party: "D", incumbent: true },
        { key: "odonnell", name: "Colleen O'Donnell", party: "R" },
      ]),
      race("appeals-9-sutton", "9th District Court of Appeals (full term)", [
        { key: "sutton", name: "Betty Sutton", party: "D", incumbent: true },
        { key: "curtin", name: "Cynthia Curtin", party: "R" },
      ]),
      race("appeals-9-unexpired", "9th District Court of Appeals (unexpired term)", [
        { key: "galonski", name: "Tavia Galonski", party: "D" },
        { key: "manning", name: "Nathan H. Manning", party: "R" },
      ]),
      race("common-pleas-general", "Common Pleas Judge, General Division", [
        { key: "fuchs", name: "Ben Fuchs", party: "D" },
        { key: "razavi", name: "Matthew K. Razavi", party: "R" },
      ]),
      race("common-pleas-juvenile-probate", "Common Pleas Judge, Juvenile/Probate", [
        { key: "conway", name: "Mike Conway", party: "D" },
        { key: "dunn", name: "Kevin W. Dunn", party: "R" },
      ]),
    ],
  },
  {
    label: "Medina County",
    races: [
      race("county-commissioner", "County Commissioner", [
        { key: "minichiello", name: "Cheryl Minichiello", party: "D" },
        { key: "mcnabb", name: "Julie A. McNabb", party: "R" },
      ]),
      race("county-auditor", "County Auditor", [
        { key: "brenstuhl", name: "Carol Brenstuhl", party: "D" },
        { key: "dumperth", name: "Rick Dumperth", party: "R" },
      ]),
      race(
        "county-recorder",
        "County Recorder (unexpired term)",
        [
          { key: "quade", name: "Scott Quade", party: "D" },
          { key: "ray", name: "Sharon Ray", party: "R", incumbent: true },
        ],
        "Ray was appointed Recorder in Sept. 2026; her spot on the ballot is assumed, not confirmed."
      ),
    ],
  },
  {
    label: "Issues",
    races: [
      {
        id: "issue-3",
        title: "State Issue 3 — voter photo ID amendment",
        candidates: [
          { key: "yes", name: "Yes", party: "Y" },
          { key: "no", name: "No", party: "N" },
        ],
      },
    ],
  },
];

export const MEDINA_RACES: CountyRace[] = MEDINA_RACE_GROUPS.flatMap((g) => g.races);

// Ohio House lines inside Medina County: the 67th takes Brunswick, Brunswick
// Hills, Chatham, Homer, Litchfield, Liverpool and Spencer (township + village)
// and part of York Township; the 66th is the rest of the county. Which York
// precincts fall on which side was not confirmed, so York counts as both.
const HD67 = /^(Brunswick City|Brunswick Hills Twp|Chatham Twp|Homer Twp|Litchfield Twp|Liverpool Twp|Spencer Twp|Spencer Village)\b/;
const HD_SPLIT = /^York Twp\b/;

/** The races on the ballot at a polling place serving these precincts. */
export function racesForPrecincts(precincts: string[]): CountyRace[] {
  const districts = new Set<number>();
  for (const p of precincts) {
    if (HD_SPLIT.test(p)) districts.add(66).add(67);
    else districts.add(HD67.test(p) ? 67 : 66);
  }
  return MEDINA_RACES.filter(
    (r) => r.houseDistrict == null || districts.has(r.houseDistrict)
  );
}
