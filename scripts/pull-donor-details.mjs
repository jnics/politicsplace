#!/usr/bin/env node
/**
 * For each candidate's top 5 donor states (from donorLocations.generated.json,
 * itself built by pull-donor-locations.mjs), pulls the top 20 itemized
 * individual/PAC/committee contributions FEC has on file for that
 * state — named donors, not just the state total.
 *
 * Deliberately capped (5 states x 20 donors, not every state or every
 * record): a big campaign's full itemized ledger is 250,000+ rows, and
 * nobody drilling into a state wants an unsorted dump of all of them
 * anyway — the top 20 largest are what's actually informative. See
 * scripts/lib/fecClient.mjs for the shared pacing/budget/retry rules.
 *
 * TWO REQUESTS PER STATE, NOT ONE — confirmed by hand (Jamie Davis' "top
 * Massachusetts donor" came back as $5.4M against a real MA total of
 * $14.9K) that a plain amount-sorted schedule_a query is dominated by
 * MEMO/CONDUIT entries: when a committee's ActBlue (HQ'd in MA) or WinRed
 * (HQ'd in VA) pass-through bundle is itemized, FEC breaks the lump sum
 * into per-source sub-entries tagged `memo_code: "X"` /
 * `memoed_subtotal: true` — informational, NOT counted toward any real
 * total, but they sort to the very top of "by amount" since they're much
 * larger than any legal individual contribution. No server-side flag
 * reliably excludes just these (tried `is_memo`, `exclude_memo` — FEC
 * silently ignores both) while keeping real non-memo group contributions,
 * so real people and real groups are fetched separately:
 *  - `is_individual=true` — real people. Confirmed clean (verified sample:
 *    real names, legal-limit amounts, memo_code null).
 *  - `is_individual=false`, fetched at per_page=100 and filtered client-side
 *    to `memo_code !== "X"` — real groups/PACs/committees that gave
 *    directly rather than through a conduit. Whatever survives that one
 *    page is what's shown; not worth paginating deeper for a rarer case.
 * The two lists are merged and re-sorted by amount before taking the top 20.
 *
 * Writes app/data/donorDetails.generated.json:
 *   { "<candidateId>": { "<state>": [{name, entity, employer, occupation, amount, date}, ...] } }
 *
 * Caches per candidate+state across runs — pass --refresh to force a
 * full re-pull.
 *
 * Usage:
 *   node scripts/pull-donor-details.mjs
 *   node scripts/pull-donor-details.mjs --refresh
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createFecClient, loadDevVars, requireApiKey } from "./lib/fecClient.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const DONOR_LOCATIONS_PATH = resolve(root, "app/data/donorLocations.generated.json");
const OUT_PATH = resolve(root, "app/data/donorDetails.generated.json");

loadDevVars(root);
const API_KEY = requireApiKey();

const REFRESH = process.argv.includes("--refresh");
const TOP_STATES = 5;
const TOP_DONORS = 20;

const requestLog = [];
const fec = createFecClient(API_KEY, requestLog);
const { fecFetch } = fec;

function toDonor(r) {
  return {
    name: r.contributor_name,
    entity: r.entity_type_desc ?? r.entity_type ?? null,
    employer: r.contributor_employer || null,
    occupation: r.contributor_occupation || null,
    amount: r.contribution_receipt_amount,
    date: r.contribution_receipt_date,
  };
}

/** Same donor can appear as several separate itemized checks (FEC logs each
 *  one, it doesn't pre-sum them) -- fold same-name donors into one row with
 *  the total, rather than showing "$3,500" twice for someone who gave twice.
 *  Keeps the most recent date and the first non-null employer/occupation. */
function consolidateByName(donors) {
  const byName = new Map();
  for (const d of donors) {
    const key = d.name?.trim().toUpperCase() ?? "";
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, { ...d });
      continue;
    }
    existing.amount += d.amount;
    if (d.date > existing.date) existing.date = d.date;
    existing.employer ??= d.employer;
    existing.occupation ??= d.occupation;
  }
  return [...byName.values()];
}

async function fetchIndividuals(committeeId, state, label) {
  const json = await fecFetch(
    "schedules/schedule_a/",
    {
      committee_id: committeeId,
      contributor_state: state,
      two_year_transaction_period: "2026",
      is_individual: "true",
      sort: "-contribution_receipt_amount",
      // Over-fetch past TOP_DONORS: consolidating repeat givers can turn,
      // say, 100 raw checks into far fewer unique people, and we want the
      // true top 20 UNIQUE donors, not the top 20 raw transactions.
      per_page: "100",
    },
    `donors(people) ${state}: ${label}`
  );
  return (json?.results ?? []).map(toDonor);
}

async function fetchGroups(committeeId, state, label) {
  const json = await fecFetch(
    "schedules/schedule_a/",
    {
      committee_id: committeeId,
      contributor_state: state,
      two_year_transaction_period: "2026",
      is_individual: "false",
      sort: "-contribution_receipt_amount",
      per_page: "100",
    },
    `donors(groups) ${state}: ${label}`
  );
  return (json?.results ?? [])
    .filter(
      (r) =>
        r.memo_code !== "X" &&
        !r.memoed_subtotal &&
        // Only FEC Schedule A line 11 ("Contributions from...") is an actual
        // external donor. Line 12 ("Transfers from authorized committees")
        // is the candidate's own joint-fundraising committee moving money
        // into their main committee -- not a donor, just the same
        // campaign's money, and it's large enough to otherwise dominate
        // "top donors by amount" (caught this: Lujan's "top DC donor" was
        // $270K from "LUJAN VICTORY FUND", his own joint committee). Line 14
        // ("Offsets to operating expenditures", i.e. a vendor refund) isn't
        // a donor either. Whitelisting 11-prefixed lines rather than
        // blacklisting each bad case guards against others FEC might use.
        r.line_number?.startsWith("11")
    )
    .map(toDonor);
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
  const donorLocations = JSON.parse(readFileSync(DONOR_LOCATIONS_PATH, "utf8"));
  const candidates = Object.entries(donorLocations.byCandidate);
  console.log(`${candidates.length} candidates with donor-location data.`);

  const byCandidate = loadExisting();
  let skipped = 0;
  let stoppedEarly = false;

  outer: for (const [candidateId, info] of candidates) {
    const topStates = (info.byState ?? []).slice(0, TOP_STATES).map((s) => s.state);
    if (topStates.length === 0) continue;

    const existingForCandidate = byCandidate[candidateId] ?? {};
    for (const state of topStates) {
      if (existingForCandidate[state] && !REFRESH) {
        skipped += 1;
        continue;
      }
      try {
        const label = `${info.name} (${info.raceTitle})`;
        // Sequential, not Promise.all -- fecFetch's pacing/backoff is shared
        // state across calls; firing both at once would burst past it.
        const people = await fetchIndividuals(info.committeeId, state, label);
        const groups = await fetchGroups(info.committeeId, state, label);
        const merged = consolidateByName([...people, ...groups])
          .sort((a, b) => b.amount - a.amount)
          .slice(0, TOP_DONORS);
        byCandidate[candidateId] ??= {};
        byCandidate[candidateId][state] = merged;
      } catch (err) {
        if (err.message === "BUDGET_HIT" || err.message === "RATE_LIMITED") {
          console.warn(`\nStopping early: ${err.message}. Re-run later to continue.`);
          stoppedEarly = true;
          break outer;
        }
        console.warn(`  error on ${info.name}/${state}: ${err.message}`);
      }
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
        source: "FEC (api.open.fec.gov) schedule_a itemized, top 20 per state (people + groups, memo/conduit entries excluded)",
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

  console.log(`\n${fec.requestCount} FEC requests this run, ${skipped} candidate+state pairs already cached.`);
  console.log(`Wrote ${OUT_PATH}`);
}

main();
