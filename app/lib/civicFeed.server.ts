import type { BoardParty, BoardRace } from "~/data/bigBoard2026";
import { raceId, type BoardResult } from "~/data/boardResults";
import { readStore } from "~/lib/board.server";
import { writeBlob } from "~/lib/db.server";

/**
 * Live election-night results for the /election2026 Big Board from civicAPI
 * (civicapi.org — free, no key, attribution required: the page links it).
 *
 * civicAPI publishes each chamber's national race with a per-region breakdown,
 * so three requests cover the whole board:
 *   - 87528 "United States Senate"           region keys "oh", "tx", ...
 *   - 87524 "United States House of Reps"    region keys "oh-07", "ak-al", ...
 *   - 87535 "United States Governors"        region keys "oh", "tx", ...
 * (The ids come from civicAPI's own site bundle; if they ever change, find the
 * new ones with /api/v2/race/search?startDate=2026-11-03&query=Senate.)
 *
 * Run by the Worker's cron trigger on election night (workers/app.ts) and by the
 * editor-only "Pull now" button on the page.
 */

const API = "https://civicapi.org/api/v2/race";
const CHAMBER_RACE: Record<BoardRace["chamber"], number> = {
  senate: 87528,
  house: 87524,
  governor: 87535,
};

/** No writes before this. civicAPI serves placeholder test numbers ahead of
 *  election night (seen 2026-10-20: PA governor "76% reporting", 8.6M votes
 *  each, a House seat "called"), so pulling early would fill the board with
 *  junk. 23:30 UTC = 6:30 PM EST, half an hour after the first polls close
 *  (counts are cumulative, so nothing reported before then is missed). */
export const FEED_OPENS_AT = "2026-11-03T23:30:00Z";

/** The audit-log `by` for feed writes, so the page can tell them from hand entry. */
export const FEED_BY = "civicAPI";

interface CivicCandidate {
  name: string;
  party: string;
  votes: number;
  winner: boolean;
}

interface CivicRegion {
  percent_reporting: number;
  candidates: CivicCandidate[];
}

const PARTY: Record<string, BoardParty> = {
  democratic: "D",
  democrat: "D",
  republican: "R",
  independent: "I",
  libertarian: "L",
  green: "G",
};
const partyOf = (p: string): BoardParty => PARTY[p.trim().toLowerCase()] ?? "O";

/** Last name, lowercased, without accents, suffixes or punctuation:
 *  "Dan S. Sullivan" -> "sullivan", "Angélica María Dueñas" -> "duenas". */
const surname = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.,'"“”]/g, "")
    .split(/\s+/)
    .filter((w) => !/^(jr|sr|ii|iii|iv)$/.test(w))
    .pop() ?? "";

/** True when two surnames are one edit apart ("weiner"/"wiener" is two
 *  substitutions, so transpositions count as one edit too). Catches board
 *  typos without matching unrelated names. */
function nearSurname(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 4 || Math.abs(a.length - b.length) > 1) return false;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  const rows = [prev];
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(
        rows[i - 1][j] + 1,
        row[j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        v = Math.min(v, rows[i - 2][j - 2] + 1);
      row.push(v);
    }
    rows.push(row);
  }
  return rows[a.length][b.length] <= 1;
}

const regionKey = (r: BoardRace) =>
  r.chamber === "house"
    ? `${(r.state ?? "").toLowerCase()}-${r.district ? String(r.district).padStart(2, "0") : "al"}`
    : (r.state ?? "").toLowerCase();

/** Map one civicAPI region onto a board race. Each feed candidate is matched to
 *  a board candidate by surname (exact, then one edit off), else by party when
 *  exactly one board candidate has that party; unmatched feed candidates (write-ins etc.) are
 *  dropped. Returns null while the region has nothing counted or called. */
export function toBoardResult(race: BoardRace, region: CivicRegion): BoardResult | null {
  const counted = region.candidates.some((c) => c.votes > 0);
  const winner = region.candidates.find((c) => c.winner);
  if (!counted && !winner && !(region.percent_reporting > 0)) return null;

  const votes: Record<string, number> = {};
  for (const c of region.candidates) {
    const party = partyOf(c.party);
    const sameParty = race.candidates.filter((b) => b.party === party);
    const last = surname(c.name);
    const match =
      race.candidates.find((b) => surname(b.name) === last) ??
      race.candidates.find((b) => nearSurname(surname(b.name), last)) ??
      (sameParty.length === 1 ? sameParty[0] : undefined);
    if (match) votes[match.name] = (votes[match.name] ?? 0) + Math.max(0, c.votes || 0);
  }
  return {
    reportedPct: Math.max(0, Math.min(100, region.percent_reporting || 0)),
    votes,
    called: winner ? partyOf(winner.party) : undefined,
  };
}

async function fetchRegions(id: number): Promise<Record<string, CivicRegion>> {
  const res = await fetch(`${API}/${id}`, {
    headers: { "user-agent": "politicsplace-election-night/1.0" },
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`civicAPI race ${id}: HTTP ${res.status}`);
  const j = (await res.json()) as { region_results?: Record<string, CivicRegion> };
  return j.region_results ?? {};
}

/** Pull both chambers and write every race the feed has numbers for into the
 *  board store. The feed's votes and % reporting replace what's stored; a call
 *  entered by hand is kept until the feed makes its own. Races the feed hasn't
 *  started counting are left alone, so hand entry still works for them. */
export async function syncBoardFromFeed(db: D1Database, races: BoardRace[]) {
  if (Date.now() < Date.parse(FEED_OPENS_AT))
    throw new Error("The results feed opens at 6:30 PM ET on Nov 3.");

  const regions = Object.fromEntries(
    await Promise.all(
      (Object.keys(CHAMBER_RACE) as BoardRace["chamber"][]).map(
        async (ch) => [ch, await fetchRegions(CHAMBER_RACE[ch])] as const
      )
    )
  ) as Record<BoardRace["chamber"], Record<string, CivicRegion>>;

  const store = await readStore(db);
  const at = new Date().toISOString();
  let updated = 0;
  let missing = 0;
  for (const race of races) {
    const region = regions[race.chamber][regionKey(race)];
    if (!region) {
      missing += 1;
      continue;
    }
    const next = toBoardResult(race, region);
    if (!next) continue;
    const id = raceId(race);
    next.called ??= store.results[id]?.called;
    store.results[id] = next;
    store.log[id] = { at, by: FEED_BY };
    updated += 1;
  }
  if (updated) await writeBlob(db, "board", store);
  return { updated, missing, at };
}
