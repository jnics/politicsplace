// The race config + polling-place list for the /results election-night page.
//
// Polling places come from scripts/build-oh7-precincts.mjs. Ohio's 7th district
// on its 2026 lines is Cuyahoga (split), Medina (whole), Ashland (whole minus
// Mifflin) and Wayne (split). Every polling place is a real BOE location:
// Cuyahoga from CuyahogaGIS, the rest from lookup.boe.ohio.gov.

import generated from "~/data/oh7Precincts.generated.json";

export type PartyCode = "D" | "R" | "O";

export interface Oh7Candidate {
  /** Stable key used in the results store and the form fields. */
  key: string;
  name: string;
  short: string;
  party: PartyCode;
  incumbent?: boolean;
}

/** First = Democrat, second = Republican, third = the "other / write-in" bucket. */
export const OH7_CANDIDATES: Oh7Candidate[] = [
  { key: "poindexter", name: "Brian Poindexter", short: "Poindexter", party: "D" },
  { key: "miller", name: "Max Miller", short: "Miller", party: "R", incumbent: true },
  { key: "other", name: "Other / write-in", short: "Other", party: "O" },
];

export const OH7_TITLE = "Ohio 7th Congressional District";

export interface Oh7PollingPlace {
  /** "cuya:<pollId>" or "<county>:<ward-slug>" */
  id: string;
  name: string;
  address?: string;
  town: string;
  county: string;
  /** Precinct labels that vote here. */
  precincts: string[];
}

export interface Oh7Town {
  town: string;
  county: string;
  pollingPlaces: Oh7PollingPlace[];
}

export const OH7_TOWNS: Oh7Town[] = generated.towns;
export const OH7_GENERATED_AT: string = generated.generatedAt;
export const OH7_PLACE_COUNT: number = generated.pollingPlaceCount;
export const OH7_PRECINCT_COUNT: number = generated.precinctCount;
