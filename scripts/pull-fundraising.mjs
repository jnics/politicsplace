#!/usr/bin/env node
/**
 * Pulls FEC campaign-finance totals for every tracked 2026 federal race
 * (Senate + House — the FEC only covers federal candidates, so Governor/
 * President races never get an entry here) and writes
 * app/data/fundraising.generated.json for the /fundraising page to render.
 *
 * See scripts/lib/fecClient.mjs for the shared pacing/budget/retry rules
 * (the FEC API's real limit is ~60 requests/minute, not the advertised
 * 1000/hour) and scripts/pull-donor-locations.mjs for the companion pull
 * that resolves each candidate's donor-by-state breakdown (needs the
 * `committeeId` this script captures on every candidate).
 *
 * Caches every candidate it has already resolved (by "<raceKey>|<name>")
 * across runs — a normal re-run only fetches candidates it doesn't already
 * have, since fundraising totals only change when a campaign files a new
 * quarterly report. Pass --refresh to force a full re-pull.
 *
 * Race list comes from app/data/polls.generated.json (the 538 + Wikipedia
 * pull) filtered to 2026 senate/house — NOT a separately hand-maintained
 * list, so it stays in sync with `pnpm polls:all` automatically. Any
 * House/Senate race that's ONLY in pollsSeeded.ts (hand-seeded, not yet
 * covered by either poll importer) is not included yet.
 *
 * Usage:
 *   node scripts/pull-fundraising.mjs           # incremental (pnpm fundraising:pull)
 *   node scripts/pull-fundraising.mjs --refresh # re-resolve + re-fetch everyone
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createFecClient, loadDevVars, requireApiKey } from "./lib/fecClient.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const GENERATED_PATH = resolve(root, "app/data/polls.generated.json");
const OUT_PATH = resolve(root, "app/data/fundraising.generated.json");

loadDevVars(root);
const API_KEY = requireApiKey();

const REFRESH = process.argv.includes("--refresh");
const requestLog = [];
const fec = createFecClient(API_KEY, requestLog);
const { fecFetch } = fec;

const OFFICE_CODE = { senate: "S", house: "H" };

function districtParam(raceType, district) {
  if (raceType !== "house") return undefined;
  return String(district ?? 0).padStart(2, "0");
}

const FEC_PARTY = { D: "DEM", R: "REP", I: "IND" };

/** Search FEC for one candidate, scoped by office/state/district, then pick
 *  the best match: prefer one active in the 2026 cycle, then a party match.
 *  Returns both the candidate_id and their current principal committee_id
 *  (needed by pull-donor-locations.mjs) straight from the search result. */
async function resolveCandidate(race, candidate) {
  const params = {
    q: candidate.name,
    office: OFFICE_CODE[race.raceType],
    state: race.state,
  };
  const district = districtParam(race.raceType, race.district);
  if (district) params.district = district;

  const json = await fecFetch(
    "candidates/search/",
    params,
    `search: ${candidate.name} (${race.state}${district ? "-" + district : ""})`
  );
  const results = json?.results ?? [];
  if (results.length === 0) return null;

  const in2026 = results.filter((r) => r.cycles?.includes(2026));
  const pool = in2026.length > 0 ? in2026 : results;
  const best = pool.find((r) => r.party === FEC_PARTY[candidate.party]) ?? pool[0];
  const principal = best.principal_committees?.find((c) => c.designation === "P")
    ?? best.principal_committees?.[0];
  return { candidateId: best.candidate_id, committeeId: principal?.committee_id ?? null };
}

async function fetchTotals(candidateId, label) {
  const json = await fecFetch(
    `candidate/${candidateId}/totals/`,
    { cycle: "2026" },
    `totals: ${label}`
  );
  const row = json?.results?.[0];
  if (!row) return null;
  return {
    receipts: row.receipts ?? 0,
    disbursements: row.disbursements ?? 0,
    cashOnHand: row.last_cash_on_hand_end_period ?? 0,
    individualContributions: row.individual_contributions ?? 0,
    coverageEnd: row.coverage_end_date ?? null,
  };
}

function loadExisting() {
  if (REFRESH || !existsSync(OUT_PATH)) return { candidates: {}, unresolved: {} };
  try {
    const parsed = JSON.parse(readFileSync(OUT_PATH, "utf8"));
    return { unresolved: {}, ...parsed };
  } catch {
    return { candidates: {}, unresolved: {} };
  }
}

function raceKey(r) {
  return `${r.year ?? 2026}:${r.raceType}:${r.state}:${r.district ?? ""}`;
}

/** Same dedup app/data/polls.ts's `POLLS` already does for the site: when
 *  more than one source row exists for the same race (year+raceType+state+
 *  district+special), the LAST one in file order wins. import-wikipedia-
 *  polls.mjs always appends fresh Wikipedia rows after whatever existed
 *  before, so a Wikipedia row naturally supersedes a stale RealClearPolling
 *  leftover for the same race — without this, both get iterated separately
 *  and a candidate like Susan Collins (RCP: "Collins", Wikipedia: "Susan
 *  Collins") gets pulled twice under different names, and some RCP rows are
 *  outright stale pre-primary nominees (wrong person, not just a name
 *  format difference) that shouldn't be queried against FEC at all. */
function dedupeRaces(races) {
  const byKey = new Map();
  for (const r of races) {
    const key = `${r.year ?? 2026}:${r.raceType}:${r.state}:${r.district ?? ""}:${r.special ? "special" : ""}`;
    byKey.set(key, r);
  }
  return [...byKey.values()];
}

async function main() {
  const generated = JSON.parse(readFileSync(GENERATED_PATH, "utf8"));
  const races = dedupeRaces(
    generated.races.filter(
      (r) => (r.year ?? 2026) === 2026 && (r.raceType === "senate" || r.raceType === "house")
    )
  );
  console.log(`${races.length} tracked 2026 federal races (after dedup).`);

  const existing = loadExisting();
  const candidates = { ...existing.candidates };
  const unresolved = { ...existing.unresolved };
  const notFound = [];
  let skipped = 0;
  let stoppedEarly = false;

  outer: for (const race of races) {
    const rKey = raceKey(race);
    for (const candidate of race.candidates) {
      const entryKey = `${rKey}|${candidate.name}`;
      if ((candidates[entryKey] || unresolved[entryKey]) && !REFRESH) {
        skipped += 1;
        continue;
      }
      try {
        const resolved = await resolveCandidate(race, candidate);
        if (!resolved) {
          unresolved[entryKey] = "no FEC candidate match";
          notFound.push(`${race.title} — ${candidate.name}`);
          continue;
        }
        const totals = await fetchTotals(resolved.candidateId, `${candidate.name} (${race.title})`);
        if (!totals) {
          unresolved[entryKey] = "no 2026 totals filed";
          notFound.push(`${race.title} — ${candidate.name} (no 2026 totals filed)`);
          continue;
        }
        candidates[entryKey] = {
          raceKey: rKey,
          raceTitle: race.title,
          raceType: race.raceType,
          state: race.state,
          district: race.district ?? null,
          name: candidate.name,
          party: candidate.party,
          candidateId: resolved.candidateId,
          committeeId: resolved.committeeId,
          ...totals,
        };
      } catch (err) {
        if (err.message === "BUDGET_HIT" || err.message === "RATE_LIMITED") {
          console.warn(`\nStopping early: ${err.message}. Re-run later to continue.`);
          stoppedEarly = true;
          break outer;
        }
        console.warn(`  error on ${candidate.name}: ${err.message}`);
      }
    }
  }

  const fullRequestLog = [...(existing.requestLog ?? []), ...requestLog];

  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "FEC (api.open.fec.gov)",
        requestsThisRun: fec.requestCount,
        totalRequestsLogged: fullRequestLog.length,
        stoppedEarly,
        notFound,
        requestLog: fullRequestLog,
        candidates,
        unresolved,
      },
      null,
      2
    )
  );

  console.log(`\n${fec.requestCount} FEC requests this run, ${skipped} candidates already cached.`);
  console.log(`${Object.keys(candidates).length} candidates total, ${notFound.length} not found.`);
  console.log(`Wrote ${OUT_PATH}`);
}

main();
