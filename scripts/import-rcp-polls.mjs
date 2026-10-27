#!/usr/bin/env node
/**
 * Import 2026 RealClearPolling polls + RCP averages into
 * app/data/polls.generated.json from a local cache written by Claude.
 *
 *   pnpm polls:rcp
 *
 * WHY A CACHE: realclearpolling.com blocks automated browsers (see
 * pull-polls.mjs / polls-all.mjs), but the "RealClearPolitics Polls" claude.ai
 * connector (rcp.tazalabs.ai) serves the same data. That connector is only
 * reachable from a Claude session -- there's no API key a node script could
 * use -- so the pull is two steps:
 *
 *   1. In Claude Code, ask Claude to "refresh the RCP cache". Claude:
 *      - calls `search_races` (cycle_year 2026, limit 200) and writes the race
 *        list + current averages to scripts/data/rcp-races.json
 *        ({ fetchedAt, races: [{ id, title, race_type, category, state,
 *        district, candidates, current_average, rcp_url, ... }] });
 *      - for each General / Special Election head-to-head (not primaries, RCV
 *        rounds, or "Multi-Candidate"/3-way variants of a race that also has a
 *        2-way page), calls `get_race_polls` -- default (polls in the RCP
 *        average) when the race has an average, `include_excluded: true` when
 *        it doesn't -- and writes scripts/data/rcp-polls.json:
 *          { fetchedAt, races: { "<race id>": {
 *              cols: ["Brown", "Husted"],   // surnames as RCP's results name them
 *              polls: [[pollster, start, end, sampleSize|null, population,
 *                       pct for each col (null if not asked)...]] } } }
 *   2. Run this script (also step 4 of `pnpm polls:all`). It is offline and
 *      just normalizes whatever is cached.
 *
 * Rows are written with `source: "RealClearPolling"` (no sourceNote -- RCP is
 * the page's default source). Like the other importers it keeps every
 * other-source race. When RCP and Wikipedia both cover a race,
 * app/data/polls.ts picks between them (see pickRace there).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, "../app/data/polls.generated.json");
const RACES_CACHE = resolve(here, "data/rcp-races.json");
const POLLS_CACHE = resolve(here, "data/rcp-polls.json");

const STATE_NAME = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};
const ORD = (n) =>
  `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

const PARTY = { Democrat: "D", Republican: "R", Independent: "I" };
const party = (affiliation) => PARTY[affiliation] ?? "O";

/** "PA10" / "MT-1" -> 10 / 1; at-large ("AKAL") is district 1, matching the
 *  other sources. */
function parseDistrict(d) {
  if (!d) return undefined;
  if (/AL$/i.test(d)) return 1;
  const n = Number(String(d).match(/(\d+)$/)?.[1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function buildRace(meta, cached) {
  const state = meta.state.toUpperCase();
  const raceType = meta.race_type;
  const district = raceType === "house" ? parseDistrict(meta.district) : undefined;
  const special = /special/i.test(meta.category) || /special/i.test(meta.title);

  // RCP's poll results and averages use surnames; candidates carry full names.
  const fullName = (surname) =>
    meta.candidates.find((c) =>
      c.name.toLowerCase().endsWith(surname.toLowerCase())
    );
  const cols = cached.cols.map((surname) => {
    const c = fullName(surname);
    if (!c) console.error(`  ${meta.id}: no candidate matches "${surname}" -- column dropped`);
    return c && { name: c.name, party: party(c.affiliation) };
  });

  const polls = [];
  for (const [pollster, startDate, endDate, sampleSize, population, ...pcts] of cached.polls) {
    if (/placeholder/i.test(pollster)) continue;
    const results = cols
      .map((c, i) => c && Number.isFinite(pcts[i]) && { candidate: c.name, party: c.party, pct: pcts[i] })
      .filter(Boolean);
    if (results.length < 2) continue;
    polls.push({
      pollster,
      startDate,
      endDate,
      ...(sampleSize ? { sampleSize } : {}),
      ...(population ? { population } : {}),
      results,
    });
  }

  const avg = meta.current_average;
  let aggregateAverage;
  if (avg?.results?.length) {
    aggregateAverage = {
      spread:
        !avg.spread?.value || avg.spread.name === "Tie"
          ? "Tie"
          : `${avg.spread.name} +${avg.spread.value}`,
      period: avg.date_label ?? "",
      results: avg.results.map((r) => ({
        candidate: fullName(r.name)?.name ?? r.name,
        party: party(r.affiliation),
        pct: r.value,
      })),
    };
  }

  const name = STATE_NAME[state] ?? state;
  const title =
    raceType === "house"
      ? `${name} ${ORD(district)} District`
      : raceType === "governor"
        ? `${name} Governor`
        : `${name} Senate${special ? " (special)" : ""}`;

  return {
    raceType,
    state,
    ...(district ? { district } : {}),
    ...(raceType === "senate" && special ? { special: true } : {}),
    title,
    candidates: cols.filter(Boolean),
    ...(aggregateAverage ? { aggregateAverage } : {}),
    polls,
    source: "RealClearPolling",
    lastPulled: POLLS_FETCHED_AT,
  };
}

const racesCache = JSON.parse(readFileSync(RACES_CACHE, "utf8"));
const pollsCache = JSON.parse(readFileSync(POLLS_CACHE, "utf8"));
const POLLS_FETCHED_AT = pollsCache.fetchedAt;
const metaById = new Map(racesCache.races.map((r) => [String(r.id), r]));

const imported = [];
for (const [id, cached] of Object.entries(pollsCache.races)) {
  const meta = metaById.get(id);
  if (!meta) {
    console.error(`  ${id}: in rcp-polls.json but not rcp-races.json -- skipped`);
    continue;
  }
  const race = buildRace(meta, cached);
  if (race.polls.length === 0 && !race.aggregateAverage) continue;
  imported.push(race);
}

let prev = { races: [] };
try { prev = JSON.parse(readFileSync(OUT, "utf8")); } catch {}
const kept = (prev.races ?? []).filter((r) => r.source !== "RealClearPolling");
const out = {
  ...prev,
  races: [...kept, ...imported].sort(
    (a, b) =>
      (a.year ?? 2026) - (b.year ?? 2026) ||
      a.raceType.localeCompare(b.raceType) ||
      a.state.localeCompare(b.state) ||
      (a.district ?? 0) - (b.district ?? 0)
  ),
};
writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");

console.error(
  `RealClearPolling: ${imported.length} races (${imported.reduce((n, r) => n + r.polls.length, 0)} polls, ` +
    `cache from ${POLLS_FETCHED_AT}), kept ${kept.length} other-source races -> ${out.races.length} total`
);
