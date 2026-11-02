import { readBlob, writeBlob } from "~/lib/db.server";

/**
 * Live election-night results for every Ohio state-level contest (statewide
 * offices, Supreme Court, U.S. Senate and House, Court of Appeals, State
 * Senate, State House, statewide issues) from the Ohio Secretary of State's
 * "Ohio Decides" site, liveresults.ohiosos.gov. Shown on the /election2026
 * "OH-State" tab.
 *
 * The site publishes one NIST 1500-100 / IEEE 1622 XML file with every
 * contest (the "Election Results XML Feed" link on the page), so one request
 * covers all ~160 contests. It is plain HTTP with no bot wall (checked
 * 2026-11-02). Each BallotSelection's first VoteCounts is the statewide (or
 * district-wide) total; the county totals that follow tell us which counties
 * a contest spans, and each county GpUnit carries SubUnitsReported /
 * TotalSubUnits (election-day precincts) for a reporting estimate.
 *
 * Run by the Worker's cron (workers/app.ts) alongside civicAPI, and by the
 * editor-only "Pull Ohio now" button.
 */

const FEED_URL =
  "https://liveresults.ohiosos.gov/Api/v1/download?filename=VSSC1622XmlFileBlob";

/** No writes before this: 8:15 PM EST on Nov 3 (the user's choice), 45
 *  minutes after Ohio's polls close. Before election night the file is a
 *  zeroed test file (IsTest="true"). */
export const OHIO_FEED_OPENS_AT = "2026-11-04T01:15:00Z";

export const OHIO_STORE = "ohioState";

export interface OhioCandidate {
  name: string;
  /** D, R, L, I, O (other / nonpartisan), or "" for ballot-issue choices. */
  party: string;
  votes: number;
}

export interface OhioContest {
  id: string;
  name: string;
  /** "Governor and Lieutenant Governor", "State Representative", ... */
  group: string;
  seq: string;
  candidates: OhioCandidate[];
  /** Election-day precincts reported / total, summed over every county the
   *  contest touches (whole counties, so a district in part of a county
   *  counts that county's full precinct list). */
  reported: number;
  precincts: number;
  counties: string[];
}

export interface OhioResults {
  /** When we pulled it. */
  at: string | null;
  /** The SOS file's own GeneratedDate. */
  generatedAt: string | null;
  isTest: boolean;
  reported: number;
  precincts: number;
  contests: OhioContest[];
}

export const EMPTY_OHIO: OhioResults = {
  at: null,
  generatedAt: null,
  isTest: false,
  reported: 0,
  precincts: 0,
  contests: [],
};

const PARTY: Record<string, string> = {
  DEM: "D",
  REP: "R",
  LIB: "L",
  Indep: "I",
};

const attr = (tag: string, name: string) =>
  tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? "";

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

/** Parse the SOS XML file. Exported for testing against a saved copy. */
export function parseOhioXml(xml: string): OhioResults {
  const report = xml.match(/<ElectionReport [^>]*>/)?.[0] ?? "";

  const partyById = new Map<string, string>();
  for (const m of xml.matchAll(/<Party ObjectId="([^"]+)" Abbreviation="([^"]*)"/g))
    partyById.set(m[1], PARTY[m[2]] ?? "O");

  const candById = new Map<string, { name: string; party: string }>();
  for (const m of xml.matchAll(/<Candidate ObjectId="([^"]+)"[^>]*>([\s\S]*?)<\/Candidate>/g)) {
    const name = m[2].match(/<LanguageString[^>]*>([^<]*)</)?.[1] ?? "";
    const partyId = m[2].match(/<PartyId>([^<]*)</)?.[1] ?? "";
    candById.set(m[1], { name: decode(name), party: partyById.get(partyId) ?? "O" });
  }

  const county = new Map<string, { name: string; reported: number; total: number }>();
  for (const m of xml.matchAll(/<GpUnit [^>]*Type="County"[^>]*>/g)) {
    const t = m[0];
    county.set(attr(t, "ObjectId"), {
      name: attr(t, "Name"),
      reported: Number(attr(t, "SubUnitsReported")) || 0,
      total: Number(attr(t, "TotalSubUnits")) || 0,
    });
  }

  const contests: OhioContest[] = [];
  for (const m of xml.matchAll(/<Contest ([^>]*)>([\s\S]*?)<\/Contest>/g)) {
    const head = m[1];
    const body = m[2];
    const group =
      body.match(/<Code OtherType="ContestType" Value="([^"]*)"/)?.[1] ?? "Other";
    const candidates: OhioCandidate[] = [];
    let countyIds: string[] | null = null;
    for (const b of body.matchAll(/<BallotSelection ([^>]*)>([\s\S]*?)<\/BallotSelection>/g)) {
      const votes = Number(b[2].match(/<VoteCounts Type="Total" Count="(\d+)"/)?.[1] ?? 0);
      if (attr(b[1], "IsWriteIn") === "true" && votes === 0) continue;
      const selection = attr(b[1], "Selection");
      if (selection) {
        candidates.push({ name: selection, party: "", votes });
      } else {
        const ids = [...b[2].matchAll(/<CandidateId>([^<]*)</g)].map((x) => x[1]);
        const first = candById.get(ids[0] ?? "");
        candidates.push({
          name: first?.name ?? "Unknown",
          party: first?.party ?? "O",
          votes,
        });
      }
      // The county totals sit between these two comments; one selection is enough.
      if (!countyIds) {
        const block = b[2].split("<!--begin county totals-->")[1]?.split("<!--begin precinct totals-->")[0] ?? "";
        countyIds = [...block.matchAll(/<GpUnitId>([^<]*)</g)].map((x) => x[1]);
      }
    }
    const touched = (countyIds ?? []).map((id) => county.get(id)).filter((c) => !!c);
    contests.push({
      id: attr(head, "ObjectId"),
      name: decode(attr(head, "Name")),
      group: decode(group),
      seq: attr(head, "SequenceOrder"),
      candidates,
      reported: touched.reduce((s, c) => s + c.reported, 0),
      precincts: touched.reduce((s, c) => s + c.total, 0),
      counties: touched.map((c) => c.name),
    });
  }

  const all = [...county.values()];
  return {
    at: null,
    generatedAt: attr(report, "GeneratedDate") || null,
    isTest: attr(report, "IsTest") === "true",
    reported: all.reduce((s, c) => s + c.reported, 0),
    precincts: all.reduce((s, c) => s + c.total, 0),
    contests,
  };
}

export const readOhio = (db: D1Database) => readBlob<OhioResults>(db, OHIO_STORE, EMPTY_OHIO);

/** Pull the SOS file and replace the stored Ohio results. Before the feed
 *  opens it stores the contest and candidate list with every count zeroed,
 *  so the tab can show the races ahead of time without test numbers. */
export async function syncOhioFromFeed(db: D1Database) {
  const res = await fetch(FEED_URL, {
    headers: { "user-agent": "politicsplace-election-night/1.0" },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`Ohio SOS feed: HTTP ${res.status}`);
  const parsed = parseOhioXml(await res.text());
  if (parsed.contests.length === 0) throw new Error("Ohio SOS feed: no contests in the file.");
  if (Date.now() < Date.parse(OHIO_FEED_OPENS_AT)) {
    parsed.reported = 0;
    for (const c of parsed.contests) {
      c.reported = 0;
      for (const x of c.candidates) x.votes = 0;
    }
  }
  parsed.at = new Date().toISOString();
  await writeBlob(db, OHIO_STORE, parsed);
  return { contests: parsed.contests.length, at: parsed.at, isTest: parsed.isTest };
}
