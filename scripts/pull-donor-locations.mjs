#!/usr/bin/env node
/**
 * For every candidate already resolved by pull-fundraising.mjs (needs their
 * `committeeId`), pulls FEC's SCHEDULE_A "by_state" aggregate — individual
 * contributions to that committee, pre-summed by donor state server-side.
 *
 * Deliberately NOT pulling raw itemized contributions: a well-funded 2026
 * Senate campaign can have 250,000+ individual contribution records, and
 * summing those ourselves would be both enormous (pagination-wise) and
 * pointless when FEC already computes the sum. `by_state` gives the same
 * "who donated, added up by location" answer in 1 request per candidate
 * (state count is small — at most a couple of pages at per_page=100).
 *
 * Writes app/data/donorLocations.generated.json:
 *   { "<candidateId>": { name, raceTitle, byState: [{state, stateFull, total, count}, ...] } }
 *
 * Same caching/budget/pacing rules as pull-fundraising.mjs (see
 * scripts/lib/fecClient.mjs) — a re-run only fetches candidates it doesn't
 * already have. Pass --refresh to force a full re-pull.
 *
 * Usage:
 *   node scripts/pull-donor-locations.mjs           # incremental
 *   node scripts/pull-donor-locations.mjs --refresh
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createFecClient, loadDevVars, requireApiKey } from "./lib/fecClient.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const FUNDRAISING_PATH = resolve(root, "app/data/fundraising.generated.json");
const OUT_PATH = resolve(root, "app/data/donorLocations.generated.json");

loadDevVars(root);
const API_KEY = requireApiKey();

const REFRESH = process.argv.includes("--refresh");
const requestLog = [];
const fec = createFecClient(API_KEY, requestLog);
const { fecFetch } = fec;

async function fetchByState(committeeId, label) {
  const rows = [];
  let page = 1;
  for (;;) {
    const json = await fecFetch(
      "schedules/schedule_a/by_state/",
      { committee_id: committeeId, cycle: "2026", per_page: "100", page: String(page) },
      `by_state p${page}: ${label}`
    );
    const results = json?.results ?? [];
    rows.push(...results);
    if (!json || page >= (json.pagination?.pages ?? 1)) break;
    page += 1;
  }
  return rows
    .filter((r) => r.state && r.total > 0)
    .map((r) => ({
      state: r.state,
      stateFull: r.state_full,
      total: r.total,
      count: r.count ?? null,
    }))
    .sort((a, b) => b.total - a.total);
}

function loadExisting() {
  if (REFRESH || !existsSync(OUT_PATH)) return {};
  try {
    return JSON.parse(readFileSync(OUT_PATH, "utf8")).byCandidate ?? {};
  } catch {
    return {};
  }
}

async function main() {
  const fundraising = JSON.parse(readFileSync(FUNDRAISING_PATH, "utf8"));
  const candidateList = Object.values(fundraising.candidates).filter((c) => c.committeeId);
  console.log(`${candidateList.length} candidates with a known committee.`);

  const byCandidate = loadExisting();
  let skipped = 0;
  let stoppedEarly = false;

  for (const c of candidateList) {
    if (byCandidate[c.candidateId] && !REFRESH) {
      skipped += 1;
      continue;
    }
    try {
      const byState = await fetchByState(c.committeeId, `${c.name} (${c.raceTitle})`);
      byCandidate[c.candidateId] = {
        name: c.name,
        raceTitle: c.raceTitle,
        raceKey: c.raceKey,
        committeeId: c.committeeId,
        byState,
      };
    } catch (err) {
      if (err.message === "BUDGET_HIT" || err.message === "RATE_LIMITED") {
        console.warn(`\nStopping early: ${err.message}. Re-run later to continue.`);
        stoppedEarly = true;
        break;
      }
      console.warn(`  error on ${c.name}: ${err.message}`);
    }
  }

  const existingLog = existsSync(OUT_PATH)
    ? (JSON.parse(readFileSync(OUT_PATH, "utf8")).requestLog ?? [])
    : [];
  const fullRequestLog = [...existingLog, ...requestLog];

  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "FEC (api.open.fec.gov) schedule_a/by_state",
        requestsThisRun: fec.requestCount,
        totalRequestsLogged: fullRequestLog.length,
        stoppedEarly,
        requestLog: fullRequestLog,
        byCandidate,
      },
      null,
      2
    )
  );

  console.log(`\n${fec.requestCount} FEC requests this run, ${skipped} candidates already cached.`);
  console.log(`${Object.keys(byCandidate).length} candidates with donor-location data.`);
  console.log(`Wrote ${OUT_PATH}`);
}

main();
