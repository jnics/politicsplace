#!/usr/bin/env node
/**
 * Builds the electorate behind the early-vote map's "% of eligible voters":
 * how many people CAN vote, per state and per county. One-time per release,
 * not part of the daily pull.
 *
 *   node scripts/build-electorate.mjs <County.csv> <Turnout_2024G.csv> <2024 EAVS csv>
 *
 * Inputs:
 *   - Census Bureau CVAP special tabulation, 2019-2023 ACS 5-year,
 *     County.csv out of
 *     https://www2.census.gov/programs-surveys/decennial/rdo/datasets/2023/2023-cvap/CVAP_2019-2023_ACS_csv_files.zip
 *     `cvap_est` on the "Total" line = citizens 18+ (the county-level
 *     stand-in for eligible voters; it doesn't remove people barred by a
 *     felony conviction).
 *   - UF Election Lab 2024 turnout file,
 *     https://election.lab.ufl.edu/data-downloads/turnoutdata/Turnout_2024G_v0.4.csv
 *     `VEP` = voting-eligible population: citizens 18+ minus those
 *     ineligible by felony status, plus eligible overseas -- the standard
 *     state-level denominator.
 *   - 2024 EAVS (same file build-early-vote-history.mjs uses): A1a, total
 *     registered voters per jurisdiction, rolled up to counties.
 *   - Independent Voter Project (fetched live): registered voters by party
 *     per state -- see pullPartyRegistration below. State level only.
 *
 * Writes app/data/electorate.generated.json (states, bundled) and
 * app/data/geo/electorate-counties.json (counties, fetched at runtime).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { makeCountyResolver } from "./lib/eavsCounty.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const countyOf = makeCountyResolver(root);
const STATE_OUT = resolve(root, "app/data/electorate.generated.json");
const COUNTY_OUT = resolve(root, "app/data/geo/electorate-counties.json");

const [cvapPath, vepPath, eavsPath] = process.argv.slice(2);
if (!cvapPath || !vepPath || !eavsPath) {
  console.error("usage: node scripts/build-electorate.mjs <County.csv> <Turnout_2024G.csv> <2024 EAVS csv>");
  process.exit(1);
}

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
const num = (v) => {
  const n = Number(String(v ?? "").replace(/[,%\s]/g, ""));
  return Number.isFinite(n) && n >= 0 && String(v).trim() !== "" ? n : null;
};

// FIPS state prefix -> USPS, from the app's own table.
const stateFipsSrc = readFileSync(resolve(root, "app/data/stateFips.ts"), "utf8");
const FIPS_TO_USPS = {
  // The app's table has no DC (it's not on the Senate map).
  11: "DC",
  ...Object.fromEntries([...stateFipsSrc.matchAll(/([A-Z]{2}):\s*"(\d{2})"/g)].map(([, u, f]) => [f, u])),
};

// ── Counties: CVAP ─────────────────────────────────────────────────────
const counties = {}; // fips -> [cvap, registered]
{
  const rows = csvRows(readFileSync(cvapPath, "latin1"));
  const h = rows.next().value;
  const [iLine, iGeo, iCvap] = ["lntitle", "geoid", "cvap_est"].map((c) => h.indexOf(c));
  for (const r of rows) {
    if (r[iLine] !== "Total") continue;
    const fips = /US(\d{5})$/.exec(r[iGeo] ?? "")?.[1];
    if (fips) counties[fips] = [num(r[iCvap]), null];
  }
}

// ── Counties + states: registered voters (EAVS 2024 A1a) ───────────────
const stateReg = {};
{
  const rows = csvRows(readFileSync(eavsPath, "latin1"));
  const h = rows.next().value.map((x) => x.trim());
  const [iFips, iReg, iSt, iName] = ["FIPSCode", "A1a", "State_Abbr", "Jurisdiction_Name"].map((c) =>
    h.indexOf(c)
  );
  for (const r of rows) {
    const reg = num(r[iReg]);
    const st = r[iSt]?.trim();
    if (reg == null || !/^[A-Z]{2}$/.test(st ?? "")) continue;
    // State totals from every row: Alaska is one statewide jurisdiction and
    // some Wisconsin municipalities don't resolve to a county.
    stateReg[st] = (stateReg[st] ?? 0) + reg;
    const fips = countyOf(r[iFips], st, r[iName]);
    if (!fips) continue;
    const c = (counties[fips] ??= [null, null]);
    c[1] = (c[1] ?? 0) + reg;
  }
}

// ── States: VEP + CVAP sums ────────────────────────────────────────────
const states = {};
{
  const rows = csvRows(readFileSync(vepPath, "utf8"));
  const h = rows.next().value;
  const [iAbv, iVep] = ["STATE_ABV", "VEP"].map((c) => h.indexOf(c));
  for (const r of rows) {
    const st = r[iAbv]?.trim();
    if (!st || st === "US") continue;
    states[st] = { vep: num(r[iVep]), cvap: null, registered: stateReg[st] ?? null };
  }
}
for (const [fips, [cvap]] of Object.entries(counties)) {
  const st = FIPS_TO_USPS[fips.slice(0, 2)];
  if (!st || cvap == null) continue;
  const s = (states[st] ??= { vep: null, cvap: null, registered: stateReg[st] ?? null });
  s.cvap = (s.cvap ?? 0) + cvap;
}

// ── States: registered voters by party (Independent Voter Project) ───────
// independentvoterproject.org/voter-data is a Next.js page whose flight
// payload carries one record per state: totalRegistered and D/R/independent
// shares. Official registration where a state registers by party; L2's
// modeled party (primary ballots, donations, analytics) where it doesn't --
// those records carry a "do not officially register" registrationNotes.
async function pullPartyRegistration() {
  const res = await fetch("https://independentvoterproject.org/voter-data", {
    headers: { "User-Agent": "Mozilla/5.0 politicsplace" },
  });
  if (!res.ok) throw new Error(`IVP HTTP ${res.status}`);
  const html = await res.text();
  let flight = "";
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)) {
    flight += JSON.parse(`"${m[1]}"`);
  }
  const out = {};
  for (const m of flight.matchAll(/\{"slug":"[a-z]{2}","name":"[^"]+","abbr":"([A-Z]{2})","totalRegistered":[^{}]*\}/g)) {
    try {
      const r = JSON.parse(m[0]);
      if (!r.totalRegistered || r.demPct == null) continue;
      const n = (pct) => Math.round((r.totalRegistered * pct) / 100);
      out[r.abbr] = {
        total: r.totalRegistered,
        dem: n(r.demPct),
        rep: n(r.repPct),
        other: n(r.indPct),
        modeled: /do not officially register/i.test(r.registrationNotes ?? ""),
      };
    } catch {
      // partial record -- skip
    }
  }
  return out;
}
const partyReg = await pullPartyRegistration().catch((e) => {
  console.warn(`party registration skipped: ${e.message}`);
  return {};
});
for (const [st, p] of Object.entries(partyReg)) {
  (states[st] ??= { vep: null, cvap: null, registered: null }).party = p;
}
console.log(
  `party registration: ${Object.keys(partyReg).length} states (${
    Object.values(partyReg).filter((p) => p.modeled).length
  } modeled)`
);

const meta = {
  generatedAt: new Date().toISOString(),
  source:
    "VEP: UF Election Lab 2024; CVAP: Census Bureau 2019-2023 ACS special tabulation; registered: EAC EAVS 2024 (A1a); party: Independent Voter Project (L2-modeled where states don't register by party)",
};
writeFileSync(STATE_OUT, JSON.stringify({ ...meta, byState: states }, null, 1));
writeFileSync(COUNTY_OUT, JSON.stringify({ ...meta, byCounty: counties }));
console.log(`${Object.keys(states).length} states, ${Object.keys(counties).length} counties`);
for (const st of ["OH", "TX", "GA"]) console.log(st, JSON.stringify(states[st]));
console.log("Cuyahoga", JSON.stringify(counties["39035"]));
console.log(`Wrote ${STATE_OUT}\nWrote ${COUNTY_OUT}`);
