// Identified supporters for the election-day voter chase (/chase).
//
// This is the "supporter DB" side of the chase: people the campaign has already
// canvassed and IDed. It is expected to be loaded per location from the
// campaign's voter-file export (VAN / PDI / L2). Until those files land this
// module carries a small placeholder set for OH-07 so the page is usable; swap
// SUPPORTERS for a generated JSON (like polls.generated.json) once real data is
// available — the shape below is what the rest of the app expects.
//
// Support level follows the VAN convention: 1 = strong support, 5 = strong
// opposition. The chase targets levels 1-2 (optionally 3) who have not voted.

export type SupportLevel = 1 | 2 | 3 | 4 | 5;

export interface Supporter {
  /** Stable id — the voter-file registration id when available, else generated. */
  id: string;
  /** Location key, e.g. "OH-07". Lets one deployment cover several races. */
  location: string;
  /** Precinct name or code as it appears in the voter file. */
  precinct: string;
  name: string;
  address: string;
  city: string;
  zip: string;
  phone?: string;
  email?: string;
  support: SupportLevel;
  /**
   * Set true if the voter file already shows an accepted absentee/early ballot
   * for this person before election day — they start off the chase list.
   */
  earlyVoted?: boolean;
}

export interface ChaseLocation {
  id: string;
  label: string;
}

export const SUPPORT_LABELS: Record<SupportLevel, string> = {
  1: "Strong support",
  2: "Lean support",
  3: "Undecided",
  4: "Lean oppose",
  5: "Strong oppose",
};

// ── placeholder data (OH-07) ────────────────────────────────────────────────
// Remove once a real supporter export is wired in.
export const SUPPORTERS: Supporter[] = [
  {
    id: "OH07-0001", location: "OH-07", precinct: "Wadsworth 1-A",
    name: "Karen Whitfield", address: "218 College St", city: "Wadsworth", zip: "44281",
    phone: "330-555-0142", email: "kwhitfield@example.com", support: 1,
  },
  {
    id: "OH07-0002", location: "OH-07", precinct: "Wadsworth 1-A",
    name: "Daniel Okafor", address: "44 Pardee Ave", city: "Wadsworth", zip: "44281",
    phone: "330-555-0170", support: 1, earlyVoted: true,
  },
  {
    id: "OH07-0003", location: "OH-07", precinct: "Wadsworth 1-A",
    name: "Marcy Bianco", address: "1201 Broad St", city: "Wadsworth", zip: "44281",
    phone: "330-555-0188", email: "mbianco@example.com", support: 2,
  },
  {
    id: "OH07-0004", location: "OH-07", precinct: "Wadsworth 1-A",
    name: "Theo Rasmussen", address: "9 Elmwood Ct", city: "Wadsworth", zip: "44281",
    support: 2,
  },
  {
    id: "OH07-0005", location: "OH-07", precinct: "Wadsworth 2-B",
    name: "Priya Nathan", address: "512 Trumbull Ave", city: "Wadsworth", zip: "44281",
    phone: "330-555-0203", email: "pnathan@example.com", support: 1,
  },
  {
    id: "OH07-0006", location: "OH-07", precinct: "Wadsworth 2-B",
    name: "George Halloran", address: "77 Weatherstone Dr", city: "Wadsworth", zip: "44281",
    phone: "330-555-0211", support: 1,
  },
  {
    id: "OH07-0007", location: "OH-07", precinct: "Wadsworth 2-B",
    name: "Lucille Ferraro", address: "308 High St", city: "Wadsworth", zip: "44281",
    phone: "330-555-0225", support: 2,
  },
  {
    id: "OH07-0008", location: "OH-07", precinct: "Wadsworth 2-B",
    name: "Sam Delgado", address: "150 Blocker Rd", city: "Wadsworth", zip: "44281",
    email: "sdelgado@example.com", support: 3,
  },
  {
    id: "OH07-0009", location: "OH-07", precinct: "Medina City 4-C",
    name: "Bethany Kroll", address: "640 N Huntington St", city: "Medina", zip: "44256",
    phone: "330-555-0240", email: "bkroll@example.com", support: 1,
  },
  {
    id: "OH07-0010", location: "OH-07", precinct: "Medina City 4-C",
    name: "Arturo Mendez", address: "1130 Lafayette Rd", city: "Medina", zip: "44256",
    phone: "330-555-0259", support: 1, earlyVoted: true,
  },
  {
    id: "OH07-0011", location: "OH-07", precinct: "Medina City 4-C",
    name: "Nadia Petrossian", address: "22 Sturbridge Ln", city: "Medina", zip: "44256",
    phone: "330-555-0263", support: 2,
  },
  {
    id: "OH07-0012", location: "OH-07", precinct: "Medina City 4-C",
    name: "Wesley Chan", address: "905 E Union St", city: "Medina", zip: "44256",
    email: "wchan@example.com", support: 2,
  },
  {
    id: "OH07-0013", location: "OH-07", precinct: "Medina City 4-C",
    name: "Doris Ainsley", address: "17 Guilford Blvd", city: "Medina", zip: "44256",
    phone: "330-555-0277", support: 3,
  },
];

const LOCATION_LABELS: Record<string, string> = {
  "OH-07": "Ohio 7th Congressional District",
};

/** Locations present in the supporter data, for the location picker. */
export const CHASE_LOCATIONS: ChaseLocation[] = [
  ...new Set(SUPPORTERS.map((s) => s.location)),
]
  .sort()
  .map((id) => ({ id, label: LOCATION_LABELS[id] ?? id }));

/** Precinct names for a location, in file order (deduped). */
export function precinctsFor(location: string): string[] {
  const seen = new Set<string>();
  for (const s of SUPPORTERS) {
    if (s.location === location) seen.add(s.precinct);
  }
  return [...seen].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
