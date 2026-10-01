#!/usr/bin/env node
/**
 * Pulls per-state early-voting / election-administration info from Google's
 * Civic Information API (voterInfoQuery), which is powered by the Voting
 * Information Project (VIP) — the same official-election-official data feed
 * Google's own now-retired Representatives API used, but voterInfoQuery
 * itself is still active (confirmed 2026-09-30; only the separate
 * representativeInfo* endpoints were shut down in April 2025).
 *
 * Free, no billing account: CIVIC_API_KEY in .dev.vars locally / a Worker
 * secret in production, from Google Cloud Console (APIs & Services ->
 * Civic Information API -> Credentials).
 *
 * UNLIKE the FEC pulls, this one always re-fetches every state on every run
 * rather than caching indefinitely — the whole point of re-running it is to
 * catch states that have newly published their VIP data. States typically
 * upload the full feed (early vote sites, election-official contact) only
 * 2-4 weeks before Election Day, so most states will come back nearly empty
 * until then; re-run this periodically as the election approaches
 * (`pnpm earlyvoting:pull`) and it fills in on its own.
 *
 * One request per state (a representative address -- each state's capitol
 * -- geocodes to that state's VIP entry; this app doesn't need per-address
 * precision, just the state-level election-administration info), plus one
 * request up front to resolve the current electionId. ~51 requests total,
 * well under any plausible rate limit, paced politely anyway.
 *
 * Writes app/data/earlyVoting.generated.json.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDevVars } from "./lib/fecClient.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT_PATH = resolve(root, "app/data/earlyVoting.generated.json");

loadDevVars(root);
const API_KEY = process.env.CIVIC_API_KEY;
if (!API_KEY) {
  console.error(
    "CIVIC_API_KEY not set. Add it to .dev.vars (local) — see README-deploy.md."
  );
  process.exit(1);
}

const DELAY_MS = 400;
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// One representative address per state -- its state capitol. Good enough to
// resolve VIP's state-level election-administration data; not shown to users.
const STATE_CAPITOLS = {
  AL: "600 Dexter Ave, Montgomery, AL 36130",
  AK: "120 4th St, Juneau, AK 99801",
  AZ: "1700 W Washington St, Phoenix, AZ 85007",
  AR: "500 Woodlane St, Little Rock, AR 72201",
  CA: "1315 10th St, Sacramento, CA 95814",
  CO: "200 E Colfax Ave, Denver, CO 80203",
  CT: "210 Capitol Ave, Hartford, CT 06106",
  DE: "411 Legislative Ave, Dover, DE 19901",
  FL: "402 S Monroe St, Tallahassee, FL 32399",
  GA: "206 Washington St SW, Atlanta, GA 30334",
  HI: "415 S Beretania St, Honolulu, HI 96813",
  ID: "700 W Jefferson St, Boise, ID 83702",
  IL: "401 S Spring St, Springfield, IL 62706",
  IN: "200 W Washington St, Indianapolis, IN 46204",
  IA: "1007 E Grand Ave, Des Moines, IA 50319",
  KS: "300 SW 10th Ave, Topeka, KS 66612",
  KY: "700 Capital Ave, Frankfort, KY 40601",
  LA: "900 N 3rd St, Baton Rouge, LA 70802",
  ME: "State House Station, Augusta, ME 04333",
  MD: "100 State Cir, Annapolis, MD 21401",
  MA: "24 Beacon St, Boston, MA 02133",
  MI: "100 N Capitol Ave, Lansing, MI 48933",
  MN: "75 Rev Dr Martin Luther King Jr Blvd, St Paul, MN 55155",
  MS: "400 High St, Jackson, MS 39201",
  MO: "201 W Capitol Ave, Jefferson City, MO 65101",
  MT: "1301 E 6th Ave, Helena, MT 59601",
  NE: "1445 K St, Lincoln, NE 68508",
  NV: "101 N Carson St, Carson City, NV 89701",
  NH: "107 N Main St, Concord, NH 03301",
  NJ: "125 W State St, Trenton, NJ 08608",
  NM: "490 Old Santa Fe Trail, Santa Fe, NM 87501",
  NY: "State St, Albany, NY 12224",
  NC: "1 E Edenton St, Raleigh, NC 27601",
  ND: "600 E Boulevard Ave, Bismarck, ND 58505",
  OH: "1 Capitol Sq, Columbus, OH 43215",
  OK: "2300 N Lincoln Blvd, Oklahoma City, OK 73105",
  OR: "900 Court St NE, Salem, OR 97301",
  PA: "501 N 3rd St, Harrisburg, PA 17120",
  RI: "82 Smith St, Providence, RI 02903",
  SC: "1100 Gervais St, Columbia, SC 29201",
  SD: "500 E Capitol Ave, Pierre, SD 57501",
  TN: "600 Charlotte Ave, Nashville, TN 37243",
  TX: "1100 Congress Ave, Austin, TX 78701",
  UT: "350 State St, Salt Lake City, UT 84103",
  VT: "115 State St, Montpelier, VT 05633",
  VA: "1000 Bank St, Richmond, VA 23219",
  WA: "416 Sid Snyder Ave SW, Olympia, WA 98504",
  WV: "1900 Kanawha Blvd E, Charleston, WV 25305",
  WI: "2 E Main St, Madison, WI 53703",
  WY: "200 W 24th St, Cheyenne, WY 82002",
};

async function fetchJson(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url);
    if (res.status === 429 || res.status >= 500) {
      await sleep(DELAY_MS * 4 * (attempt + 1));
      continue;
    }
    return res.json();
  }
  return null;
}

async function resolveElectionId() {
  const json = await fetchJson(
    `https://www.googleapis.com/civicinfo/v2/elections?key=${API_KEY}`
  );
  const match = (json?.elections ?? []).find(
    (e) => e.name.includes("2026") && e.electionDay?.startsWith("2026")
  );
  return match?.id ?? null;
}

async function main() {
  const electionId = await resolveElectionId();
  if (!electionId) {
    console.error("Could not find a 2026 election in the Civic API's election list.");
    process.exit(1);
  }
  console.log(`Using electionId ${electionId}.`);

  const byState = {};
  let published = 0;

  for (const [usps, address] of Object.entries(STATE_CAPITOLS)) {
    const url = new URL("https://www.googleapis.com/civicinfo/v2/voterinfo");
    url.searchParams.set("key", API_KEY);
    url.searchParams.set("address", address);
    url.searchParams.set("electionId", electionId);

    console.log(`  ${usps}...`);
    const json = await fetchJson(url);
    await sleep(DELAY_MS);

    const stateInfo = json?.state?.[0];
    const admin = stateInfo?.electionAdministrationBody;
    const hasUsefulData =
      !!admin &&
      Object.keys(admin).some(
        (k) => k !== "name" && k !== "correspondenceAddress"
      );

    if (hasUsefulData) published += 1;

    byState[usps] = {
      hasData: hasUsefulData,
      admin: admin ?? null,
      earlyVoteSites: json?.earlyVoteSites ?? null,
      dropOffLocations: json?.dropOffLocations ?? null,
      pollingLocations: json?.pollingLocations ?? null,
    };
  }

  writeFileSync(
    OUT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "Google Civic Information API (Voting Information Project)",
        electionId,
        statesPublished: published,
        byState,
      },
      null,
      2
    )
  );

  console.log(`\n${published}/50 states have published election-administration data so far.`);
  console.log(`Wrote ${OUT_PATH}`);
}

main();
