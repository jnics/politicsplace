#!/usr/bin/env node
/**
 * County voter registration by party, for the early-vote county cards.
 * Each state publishes its own file in its own format, so this is one small
 * reader per state; add a state by adding a reader to READERS.
 *
 *   pnpm registration:pull
 *
 * Covered:
 *   PA  Department of State "currentvotestats.xlsx" (Reg Voter sheet:
 *       Dem / Rep / No Aff / Other per county), updated weekly-ish.
 *   NC  State Board of Elections RegStat page, whose JSON payload carries
 *       Democrats / Republicans / Unaffiliated / minor parties per county;
 *       published weekly on Saturdays.
 *
 *   AZ  Secretary of State registration PDF (see readAZ).
 *
 * Not covered: GA and OH (no party registration; a primary vote count is not
 * a registration count, so they show the registered total only).
 *
 * Tried and blocked to scripts by bot protection (checked 2026-10-24), so
 * not covered: Nevada (nvsos.gov, Incapsula), Michigan results
 * (mvic.sos.state.mi.us, Cloudflare), Wisconsin (elections.wi.gov,
 * Cloudflare), New Hampshire (sos.nh.gov, Akamai), Maine (maine.gov,
 * CloudFront WAF), plus the main Ohio and Georgia SOS sites.
 *
 * Writes app/data/geo/party-registration-counties.json, fetched at runtime:
 *   { byState: { PA: { asOf, source, counties: { "<fips>": [dem, rep, other] } } } }
 * and, for the registration states, overwrites the statewide party split in
 * app/data/electorate.generated.json with the county sums.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readSheet, sheetNames } from "./lib/readXlsx.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT_PATH = resolve(root, "app/data/geo/party-registration-counties.json");
const UA = { "User-Agent": "Mozilla/5.0 politicsplace" };

const num = (v) => {
  const n = Number(String(v ?? "").replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Upper-cased county name -> FIPS, from the app's county geometry. */
function countyFips(usps) {
  const path = resolve(root, "app/data/geo", `${usps}.json`);
  if (!existsSync(path)) throw new Error(`no geometry for ${usps}`);
  const { counties } = JSON.parse(readFileSync(path, "utf8"));
  const key = (s) => s.toUpperCase().replace(/[^A-Z]/g, "");
  const map = new Map(counties.map((c) => [key(c.name), c.fips]));
  return (name) => {
    const k = key(name.replace(/\bcounty\b/i, ""));
    if (map.has(k)) return map.get(k);
    // A name cut short by PDF text extraction ("Santa" for Santa Cruz):
    // accept it only when exactly one county starts with it.
    const hits = [...map.keys()].filter((m) => k.length >= 4 && m.startsWith(k));
    return hits.length === 1 ? map.get(hits[0]) : undefined;
  };
}

async function readPA() {
  const url =
    "https://www.pa.gov/content/dam/copapwp-pagov/en/dos/resources/voting-and-elections/voting-and-election-statistics/currentvotestats.xlsx";
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`PA HTTP ${res.status}`);
  const dir = mkdtempSync(join(tmpdir(), "pa-reg-"));
  const file = join(dir, "pa.xlsx");
  try {
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    const sheet = sheetNames(file).findIndex((n) => /reg voter/i.test(n));
    const rows = readSheet(file, Math.max(0, sheet));
    const asOf = /as of (\d{1,2}\/\d{1,2}\/\d{4})/i.exec(rows[0]?.join(" ") ?? "")?.[1] ?? null;
    const head = rows.findIndex((r) => r[0] === "CountyName");
    const h = rows[head];
    const [iD, iR, iN, iO] = ["Dem", "Rep", "No Aff", "Other"].map((c) => h.indexOf(c));
    const fipsOf = countyFips("PA");
    const counties = {};
    for (const r of rows.slice(head + 1)) {
      const fips = r[0] && fipsOf(r[0]);
      if (!fips) continue;
      counties[fips] = [num(r[iD]), num(r[iR]), num(r[iN]) + num(r[iO])];
    }
    return { asOf, source: "Pennsylvania Department of State", counties };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** The JSON object starting at `start` (string-aware bracket count). */
function jsonAt(text, start) {
  let depth = 0, j = start, inStr = false;
  for (; j < text.length; j++) {
    const c = text[j];
    if (inStr) {
      if (c === "\\") j++;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) break;
  }
  return JSON.parse(text.slice(start, j + 1));
}

async function readNC() {
  const fipsOf = countyFips("NC");
  // Weekly snapshots are dated Saturdays; walk back to the newest one.
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 1) % 7));
  for (let tries = 0; tries < 4; tries++, d.setDate(d.getDate() - 7)) {
    const mdy = `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    const res = await fetch(`https://vt.ncsbe.gov/RegStat/Results/?date=${encodeURIComponent(mdy)}`, { headers: UA });
    if (!res.ok) continue;
    const html = await res.text();
    const at = html.indexOf('{"Data":[');
    if (at < 0) continue;
    const { Data } = jsonAt(html, at);
    if (!Data?.length) continue;
    const counties = {};
    for (const r of Data) {
      const fips = fipsOf(r.CountyName ?? "");
      if (!fips) continue;
      const other =
        num(r.Unaffiliated) + num(r.Libertarians) + num(r.Green) + num(r.NoLabels) +
        num(r.Constitution) + num(r.JusticeForAll) + num(r.WeThePeople);
      counties[fips] = [num(r.Democrats), num(r.Republicans), other];
    }
    // A future-dated request returns the latest snapshot, so take the date the
    // page itself prints rather than the one asked for.
    const asOf = /\b(\d{1,2}\/\d{1,2}\/20\d{2})\b/.exec(html)?.[1] ?? mdy;
    return { asOf, source: "North Carolina State Board of Elections", counties };
  }
  throw new Error("NC: no weekly snapshot in the last 4 weeks");
}

/**
 * Arizona publishes registration only as a PDF report per election
 * (State-Voter-Registration-<Month>-<Year>.pdf on azsos.gov). Its text is
 * extracted with `pdftotext -layout` (poppler; ships with Git for Windows)
 * and each county's first "GE <year>" row read: Democratic, Green,
 * Libertarian, No Labels, Republican, Other -- the report's column order.
 * Later pages repeat "GE" rows as percentages, so only the first per county
 * counts.
 */
/** pdftotext: on PATH in Git Bash, but the scheduled task's PATH doesn't
 *  include Git's mingw64\bin, so fall back to Git for Windows' copy. */
function pdftotextPath() {
  if (process.platform !== "win32") return "pdftotext";
  for (const base of [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Programs")]) {
    const p = base && join(base, "Git", "mingw64", "bin", "pdftotext.exe");
    if (p && existsSync(p)) return p;
  }
  return "pdftotext";
}

async function readAZ() {
  const page = await (
    await fetch("https://azsos.gov/elections/results-data/voter-registration-statistics", { headers: UA })
  ).text();
  const pdfUrl = [...page.matchAll(/href="(https:\/\/apps\.azsos\.gov\/election\/VoterReg\/\d{4}\/State-Voter-Registration-[^"]+\.pdf)"/g)]
    .map((m) => m[1])
    .sort()
    .at(-1);
  if (!pdfUrl) throw new Error("AZ: no registration PDF linked");
  const res = await fetch(pdfUrl, { headers: UA });
  if (!res.ok) throw new Error(`AZ HTTP ${res.status}`);
  const dir = mkdtempSync(join(tmpdir(), "az-reg-"));
  try {
    const pdf = join(dir, "az.pdf");
    writeFileSync(pdf, Buffer.from(await res.arrayBuffer()));
    execFileSync(pdftotextPath(), ["-layout", pdf, join(dir, "az.txt")], { stdio: "ignore" });
    const lines = readFileSync(join(dir, "az.txt"), "utf8").split(/\r?\n/);
    const fipsOf = countyFips("AZ");
    const counties = {};
    let county = null;
    for (const line of lines) {
      const name = /^([A-Z][A-Za-z .]+?)\s{2,}\d+\s+APR 20\d\d/.exec(line);
      if (name) county = name[1].trim();
      const ge = /\bGE 20\d\d\s+(.*)$/.exec(line);
      const fips = county && fipsOf(county);
      if (!ge || !fips || counties[fips]) continue;
      const n = ge[1].trim().split(/\s+/).map((s) => Number(s.replace(/,/g, "")));
      if (n.length < 6 || !n.slice(0, 6).every(Number.isInteger)) continue;
      const [dem, green, lib, noLabels, rep, other] = n;
      counties[fips] = [dem, rep, green + lib + noLabels + other];
    }
    const asOf = /State-Voter-Registration-([A-Za-z]+-\d{4})\.pdf$/.exec(pdfUrl)?.[1]?.replace("-", " ") ?? null;
    return { asOf, source: "Arizona Secretary of State registration report", counties };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const READERS = { PA: readPA, NC: readNC, AZ: readAZ };

// A state that fails keeps its last good entry.
const previous = existsSync(OUT_PATH) ? JSON.parse(readFileSync(OUT_PATH, "utf8")).byState ?? {} : {};
const byState = {};
for (const [usps, read] of Object.entries(READERS)) {
  try {
    byState[usps] = { basis: "registration", ...(await read()) };
    console.log(`${usps}: ${Object.keys(byState[usps].counties).length} counties, as of ${byState[usps].asOf}`);
  } catch (e) {
    if (previous[usps]) byState[usps] = previous[usps];
    console.warn(`${usps} skipped${previous[usps] ? " (kept previous)" : ""}: ${e.message}`);
  }
}
writeFileSync(OUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), byState }));
console.log(`Wrote ${OUT_PATH}`);

// The state card's party split comes from electorate.generated.json, whose
// Independent Voter Project snapshot lags the official files read here (PA
// Dems: 3.66M there vs 3.88M summed from the DOS counties). For every state
// read by registration, replace it with the county sums so the state and
// county numbers agree.
const ELECTORATE_PATH = resolve(root, "app/data/electorate.generated.json");
const electorate = JSON.parse(readFileSync(ELECTORATE_PATH, "utf8"));
for (const [usps, s] of Object.entries(byState)) {
  if (s.basis !== "registration") continue;
  const [dem, rep, other] = Object.values(s.counties).reduce(
    (a, c) => a.map((x, i) => x + (c[i] ?? 0)),
    [0, 0, 0]
  );
  (electorate.byState[usps] ??= { vep: null, cvap: null, registered: null }).party = {
    total: dem + rep + other,
    dem,
    rep,
    other,
    modeled: false,
    asOf: s.asOf,
    source: s.source,
  };
  console.log(`${usps} state party: D ${dem} / R ${rep} / other ${other} (county sums)`);
}
writeFileSync(ELECTORATE_PATH, JSON.stringify(electorate, null, 1));
console.log(`Updated ${ELECTORATE_PATH}`);
