#!/usr/bin/env node
/**
 * Build the governor section of the /election2026 Big Board into
 * app/data/bigBoardGovernors.generated.json (BoardRace[] with chamber
 * "governor"), which bigBoard2026.ts appends to BIG_BOARD_2026.
 *
 *   node scripts/build-board-governors.mjs
 *
 * Two sources, both free:
 *  - Candidates: civicAPI's national "United States Governors" race (id 87535,
 *    the same feed app/lib/civicFeed.server.ts reads live on election night),
 *    so board candidate names line up with the feed's. Write-ins are dropped.
 *  - Incumbent + incumbent party: the ratings table on Wikipedia's
 *    "2026 United States gubernatorial elections" ("Governor" and "Last
 *    election" columns, e.g. "Kay Ivey (term-limited)" / "66.91% R").
 *
 * Re-run if a nominee changes; it rewrites the whole file.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "..", "app/data/bigBoardGovernors.generated.json");
const CIVIC_GOVERNORS = "https://civicapi.org/api/v2/race/87535";
const WIKI_ARTICLE = "2026 United States gubernatorial elections";
const UA = { "user-agent": "politicsplace-board-governors/1.0 (github; local dev)" };

const STATE_CODE = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY",
};
const STATE_NAME = Object.fromEntries(
  Object.entries(STATE_CODE).map(([n, c]) => [c, n.replace(/\b\w/g, (m) => m.toUpperCase())])
);

const PARTY = {
  democratic: "D", democrat: "D", republican: "R", independent: "I",
  libertarian: "L", green: "G",
};
const partyOf = (p) => PARTY[String(p).trim().toLowerCase()] ?? "O";

const decode = (s) =>
  s
    .replace(/<sup[\s\S]*?<\/sup>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\[\s*[\w\s]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();

async function getJson(url) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

/** state code -> { incumbent, incumbentParty } from the Wikipedia ratings table. */
async function incumbents() {
  const j = await getJson(
    "https://en.wikipedia.org/w/api.php?" +
      new URLSearchParams({ action: "parse", page: WIKI_ARTICLE, prop: "text", format: "json", formatversion: "2" })
  );
  const out = {};
  for (const table of j.parse.text.match(/<table[\s\S]*?<\/table>/gi) ?? []) {
    const rows = table
      .split(/<tr\b[^>]*>/i)
      .slice(1)
      .map((r) => (r.match(/<t[dh]\b[\s\S]*?<\/t[dh]>/gi) ?? []).map(decode));
    const header = rows.find((r) => r.some((c) => /^governor$/i.test(c)) && r.some((c) => /last election/i.test(c)));
    if (!header) continue;
    const iState = header.findIndex((c) => /^state$/i.test(c));
    const iGov = header.findIndex((c) => /^governor$/i.test(c));
    const iLast = header.findIndex((c) => /last election/i.test(c));
    for (const r of rows) {
      const code = STATE_CODE[(r[iState] ?? "").toLowerCase()];
      // Minnesota's Democrats run as "DFL".
      const party = (r[iLast] ?? "").match(/\b(DFL|D|R|I)\s*$/)?.[1]?.replace("DFL", "D");
      if (!code || !party) continue;
      out[code] = {
        incumbent: r[iGov].replace(/\s*\(.*?\)\s*/g, " ").trim(),
        incumbentParty: party,
      };
    }
    if (Object.keys(out).length) return out;
  }
  throw new Error(`no incumbents table found in "${WIKI_ARTICLE}"`);
}

async function main() {
  const [civic, inc] = await Promise.all([getJson(CIVIC_GOVERNORS), incumbents()]);
  const races = [];
  const misses = [];
  for (const [key, region] of Object.entries(civic.region_results ?? {})) {
    const state = key.toUpperCase();
    const i = inc[state];
    if (!i) misses.push(state);
    const candidates = region.candidates
      .filter((c) => c.major_candidate && !/write-?in/i.test(c.party) && !/write-?in/i.test(c.name))
      .map((c) => ({
        name: c.name,
        party: partyOf(c.party),
        ...(c.incumbent || c.name === i?.incumbent ? { incumbent: true } : {}),
      }));
    races.push({
      chamber: "governor",
      place: STATE_NAME[state] ?? state,
      state,
      ...(i ? { incumbent: i.incumbent } : {}),
      incumbentParty: i?.incumbentParty ?? "O",
      candidates,
    });
  }
  races.sort((a, b) => a.place.localeCompare(b.place));
  writeFileSync(OUT, JSON.stringify(races, null, 1) + "\n");
  console.error(`${races.length} governor races written to ${OUT}`);
  if (misses.length) console.error(`No incumbent found for: ${misses.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
