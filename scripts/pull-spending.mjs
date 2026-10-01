#!/usr/bin/env node
/**
 * For every candidate already resolved by pull-fundraising.mjs, pulls FEC's
 * SCHEDULE_B aggregates — where the campaign's money actually went — via
 * two aggregate endpoints, not raw itemized disbursements (same reasoning
 * as pull-donor-locations.mjs: a well-funded campaign can have thousands of
 * individual disbursement records, and FEC already computes the useful
 * sums server-side):
 *
 *  - schedule_b/by_purpose  — spend broken down into FEC's ~7 categories
 *    (Advertising, Administrative, Fundraising, Travel, ...). Small, always
 *    1 request per candidate.
 *  - schedule_b/by_recipient (sorted by total, capped to the top 20) — the
 *    vendors/consultants actually paid, same "top N" shape as the donor list.
 *
 * Writes app/data/spending.generated.json:
 *   { "<candidateId>": { byPurpose: [{purpose,total,count}], topRecipients: [{name,total,count}] } }
 *
 * Same caching/budget/pacing rules as the other FEC pulls (see
 * scripts/lib/fecClient.mjs) — a re-run only fetches candidates it doesn't
 * already have. Pass --refresh to force a full re-pull.
 *
 * Usage:
 *   node scripts/pull-spending.mjs           # incremental
 *   node scripts/pull-spending.mjs --refresh
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createFecClient, loadDevVars, requireApiKey } from "./lib/fecClient.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const FUNDRAISING_PATH = resolve(root, "app/data/fundraising.generated.json");
const OUT_PATH = resolve(root, "app/data/spending.generated.json");

loadDevVars(root);
const API_KEY = requireApiKey();

const REFRESH = process.argv.includes("--refresh");
const TOP_RECIPIENTS = 20;

const requestLog = [];
const fec = createFecClient(API_KEY, requestLog);
const { fecFetch } = fec;

async function fetchByPurpose(committeeId, label) {
  const json = await fecFetch(
    "schedules/schedule_b/by_purpose/",
    { committee_id: committeeId, cycle: "2026" },
    `spend purpose: ${label}`
  );
  return (json?.results ?? [])
    .map((r) => ({ purpose: r.purpose, total: r.total, count: r.count ?? null }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
}

async function fetchTopRecipients(committeeId, label) {
  const json = await fecFetch(
    "schedules/schedule_b/by_recipient/",
    {
      committee_id: committeeId,
      cycle: "2026",
      sort: "-total",
      per_page: String(TOP_RECIPIENTS),
    },
    `spend recipients: ${label}`
  );
  return (json?.results ?? []).map((r) => ({
    name: r.recipient_name,
    total: r.total,
    count: r.count ?? null,
  }));
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

  outer: for (const c of candidateList) {
    if (byCandidate[c.candidateId] && !REFRESH) {
      skipped += 1;
      continue;
    }
    try {
      const label = `${c.name} (${c.raceTitle})`;
      const byPurpose = await fetchByPurpose(c.committeeId, label);
      const topRecipients = await fetchTopRecipients(c.committeeId, label);
      byCandidate[c.candidateId] = { name: c.name, raceTitle: c.raceTitle, byPurpose, topRecipients };
    } catch (err) {
      if (err.message === "BUDGET_HIT" || err.message === "RATE_LIMITED") {
        console.warn(`\nStopping early: ${err.message}. Re-run later to continue.`);
        stoppedEarly = true;
        break outer;
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
        source: "FEC (api.open.fec.gov) schedule_b/by_purpose + by_recipient",
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
  console.log(`Wrote ${OUT_PATH}`);
}

main();
