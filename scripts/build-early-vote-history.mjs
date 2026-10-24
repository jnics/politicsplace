#!/usr/bin/env node
/**
 * Builds county-level early-vote history (2016, 2018, 2020, 2022, 2024) from
 * the U.S. Election Assistance Commission's Election Administration and
 * Voting Survey (EAVS), the federal survey every jurisdiction answers after
 * each general election. One-time per cycle -- the past doesn't change -- so
 * this is NOT part of the daily pull.
 *
 *   node scripts/build-early-vote-history.mjs <dir-with-EAVS-csvs>
 *
 * Download the "nolabel" CSV release for each year from
 * https://www.eac.gov/research-and-data/datasets-codebooks-and-surveys,
 * unzip, and put the CSVs in one directory (file names must contain the year):
 *   2024_EAVS_for_Public_Release_nolabel_V2.csv
 *   2022_EAVS_for_Public_Release_nolabel_V1.csv
 *   2020_EAVS_for_Public_Release_nolabel_V1.2_CSV.csv
 *   EAVS_2018_for_Public_Release_nolabel v1.1.csv
 *   EAVS_2016_Final_Data_for_Public_Release_nolabel_V1.1_CSV.csv
 *
 * Section F, "participation", per jurisdiction:
 *   F1a  total who cast a ballot that counted
 *   F1d  domestic absentee / mail ballots counted
 *   F1f  in-person early voting (incl. in-person absentee)
 *   F1g  ballots in all-vote-by-mail jurisdictions
 * Early vote here = F1d + F1f + F1g. Negative values are EAVS "missing" /
 * "not applicable" codes and count as no data.
 *
 * Jurisdictions roll up to counties through scripts/lib/eavsCounty.mjs:
 * the 10-digit FIPSCode where there is one (New England towns and Michigan
 * townships carry their county in it), the county in the name for Wisconsin
 * municipalities. State totals are summed from every row.
 *
 * Writes app/data/geo/earlyvote-history-counties.json (fetched at runtime
 * beside the county geometry) and app/data/earlyVoteHistory.generated.json
 * (state totals, bundled).
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeCountyResolver } from "./lib/eavsCounty.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const countyOf = makeCountyResolver(root);
const OUT_PATH = resolve(root, "app/data/geo/earlyvote-history-counties.json");
const STATE_OUT_PATH = resolve(root, "app/data/earlyVoteHistory.generated.json");
const YEARS = [2016, 2018, 2020, 2022, 2024];

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/build-early-vote-history.mjs <dir-with-EAVS-csvs>");
  process.exit(1);
}

/** Minimal RFC-4180 parser, yielding rows as arrays. */
function* csvRows(text) {
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      yield row;
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    yield row;
  }
}

/** EAVS value -> count, or null for blanks and the negative missing codes. */
function val(v) {
  const n = Number(String(v ?? "").replace(/,/g, "").trim());
  return Number.isFinite(n) && n >= 0 && v !== "" ? n : null;
}

function readYear(year) {
  const file = readdirSync(dir).find((f) => f.includes(String(year)) && f.endsWith(".csv"));
  if (!file) {
    console.warn(`${year}: no CSV in ${dir}, skipped`);
    return null;
  }
  const rows = csvRows(readFileSync(resolve(dir, file), "latin1"));
  const header = rows.next().value.map((h) => h.trim());
  const col = (name) => header.indexOf(name);
  const iFips = col("FIPSCode");
  const iState = col("State_Abbr") >= 0 ? col("State_Abbr") : col("State");
  const iName = col("Jurisdiction_Name") >= 0 ? col("Jurisdiction_Name") : col("JurisdictionName");
  const [iA, iD, iF, iG] = ["F1a", "F1d", "F1f", "F1g"].map(col);

  const blank = () => ({ t: 0, m: 0, i: 0, haveEv: false });
  const add = (c, total, mail, inPerson, allMail) => {
    if (total != null) c.t += total;
    if (mail != null || allMail != null) {
      c.m += (mail ?? 0) + (allMail ?? 0);
      c.haveEv = true;
    }
    if (inPerson != null) {
      c.i += inPerson;
      c.haveEv = true;
    }
  };

  // States from every row (Alaska is one statewide jurisdiction with no
  // county; some Wisconsin municipalities can't be placed in a county), so
  // state totals don't depend on the county lookup.
  const counties = {};
  const states = {};
  let n = 0;
  for (const r of rows) {
    if (r.length < header.length / 2) continue;
    const st = r[iState]?.trim();
    if (!/^[A-Z]{2}$/.test(st ?? "")) continue;
    const vals = [val(r[iA]), val(r[iD]), val(r[iF]), val(r[iG])];
    add((states[st] ??= blank()), ...vals);
    const county = countyOf(r[iFips], st, r[iName]);
    if (county) add((counties[county] ??= { st, ...blank() }), ...vals);
    n += 1;
  }
  console.log(`${year}: ${n} jurisdictions -> ${Object.keys(counties).length} counties (${file})`);
  return { counties, states };
}

// byState[usps][fips][year] = [early total, mail, in person, total ballots]
const byState = {};
const stateTotals = {};
for (const year of YEARS) {
  const parsed = readYear(year);
  if (!parsed) continue;
  for (const [fips, c] of Object.entries(parsed.counties)) {
    const ev = c.haveEv ? c.m + c.i : null;
    ((byState[c.st] ??= {})[fips] ??= {})[year] = [ev, c.m, c.i, c.t || null];
  }
  for (const [st, c] of Object.entries(parsed.states)) {
    (stateTotals[st] ??= {})[year] = { ev: c.haveEv ? c.m + c.i : 0, t: c.t };
  }
}

const source = "U.S. Election Assistance Commission, EAVS 2016-2024 (F1a, F1d, F1f, F1g)";
writeFileSync(
  OUT_PATH,
  JSON.stringify({ generatedAt: new Date().toISOString(), source, years: YEARS, byState })
);
// State totals are small, so they're bundled (imported) for the state cards.
writeFileSync(
  STATE_OUT_PATH,
  JSON.stringify({ generatedAt: new Date().toISOString(), source, years: YEARS, byState: stateTotals }, null, 1)
);
console.log(`Wrote ${OUT_PATH}`);
console.log(`Wrote ${STATE_OUT_PATH}`);
for (const st of ["OH", "GA", "TX", "PA"]) {
  console.log(st, JSON.stringify(stateTotals[st]));
}
