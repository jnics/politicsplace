#!/usr/bin/env node
/**
 * Pennsylvania county-level results, merged into countyResults.generated.json.
 *
 *   node scripts/build-pa-county-results.mjs <pa-dir>
 *
 * <pa-dir> holds:
 *   c2016.csv   OpenElections 20161108__pa__general_county.csv     (2016 pres + senate)
 *   c2018.csv   OpenElections 20181106__pa__general__county.csv    (2018 senate)
 *   pa22_cleaned.csv   MEDSL 2022-pa-local-precinct-general        (2022 senate)
 *   pa24.csv           MEDSL 2024 individual_states/pa24            (2024 president)
 *   sen24_county.csv   MEDSL 2024 2024-senate-county.csv           (2024 senate — OE PA-2024 drops Clarion/Wayne/Sullivan)
 *   pa_2020.dbf VEST pa_2020.zip / doi:10.7910/DVN/K7760H           (2020 president)
 *
 * PA's Senate cycles: 2016 (Toomey), 2018 (Casey), 2022 (Fetterman), 2024
 * (McCormick). No PA Senate race in 2020 or 2026.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const SRC = process.argv[2];
if (!SRC) throw new Error("pass the dir holding the PA source files");

function parseCSV(t) {
  const rows = [];
  let row = [], cur = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c !== "\r") cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
function readDbf(buf) {
  const headerLen = buf.readUInt16LE(8), recordLen = buf.readUInt16LE(10), count = buf.readUInt32LE(4);
  const fields = [];
  for (let p = 32; buf[p] !== 0x0d; p += 32)
    fields.push({ name: buf.toString("ascii", p, p + 11).replace(/\0.*$/, ""), length: buf[p + 16] });
  const rows = [];
  for (let i = 0; i < count; i++) {
    let p = headerLen + i * recordLen + 1;
    const r = {};
    for (const f of fields) { r[f.name] = buf.toString("ascii", p, p + f.length).trim(); p += f.length; }
    rows.push(r);
  }
  return rows;
}

const keyN = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
const PA_GEO = JSON.parse(readFileSync(resolve(root, "app/data/geo/PA.json"), "utf8"));
const fipsByName = new Map(PA_GEO.counties.map((c) => [keyN(c.name), c.fips]));
const dside = (p) => {
  const s = String(p).toUpperCase().replace(/[^A-Z]/g, "");
  return s.startsWith("DEM") ? "d" : s.startsWith("REP") ? "r" : null;
};

const blocks = {};
const bump = (race, fips, side, v) => {
  const b = (blocks[race] ||= {});
  const t = (b[fips] ||= { d: 0, r: 0, total: 0 });
  t.total += v;
  if (side) t[side] += v;
};

// ── OpenElections county files that carry a `votes` total ──────────────
for (const [file, map] of [
  ["c2016.csv", { President: "2016-president", "U.S. Senate": "2016-senate" }],
  ["c2018.csv", { "U.S. Senate": "2018-senate" }],
]) {
  const rows = parseCSV(readFileSync(resolve(SRC, file), "utf8"));
  const h = rows[0].map((s) => s.toLowerCase().trim());
  const iC = h.indexOf("county"), iO = h.indexOf("office"),
    iPa = h.indexOf("party"), iV = h.indexOf("votes");
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const race = map[(r[iO] || "").trim()];
    if (!race) continue;
    const fips = fipsByName.get(keyN(r[iC] || ""));
    if (!fips) continue;
    bump(race, fips, dside(r[iPa]), parseInt((r[iV] || "").replace(/,/g, ""), 10) || 0);
  }
}

// ── MEDSL files: 2022 senate, 2024 president, 2024 senate ──────────────
for (const [file, office, race] of [
  ["pa22_cleaned.csv", "US SENATE", "2022-senate"],
  ["pa24.csv", "US PRESIDENT", "2024-president"],
  ["sen24_county.csv", "US SENATE", "2024-senate"],
]) {
  const rows = parseCSV(readFileSync(resolve(SRC, file), "utf8"));
  const h = rows[0].map((s) => s.toLowerCase().trim());
  const iO = h.indexOf("office"), iPS = h.indexOf("party_simplified"),
    iM = h.indexOf("mode"), iV = h.indexOf("votes"), iF = h.indexOf("county_fips");
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r[iO] !== office || r[iM] !== "TOTAL") continue;
    const fips = String(r[iF]).padStart(5, "0");
    if (!fips.startsWith("42")) continue; // sen24_county.csv is national
    const s = r[iPS] === "DEMOCRAT" ? "d" : r[iPS] === "REPUBLICAN" ? "r" : null;
    bump(race, fips, s, parseInt(r[iV], 10) || 0);
  }
}

// ── 2020 president: VEST dbf ────────────────────────────────────────────
{
  const dbf = readDbf(readFileSync(resolve(SRC, "pa_2020.dbf")));
  for (const row of dbf) {
    const fips = "42" + String(row.COUNTYFP).padStart(3, "0");
    const d = parseInt(row.G20PREDBID, 10) || 0;
    const r = parseInt(row.G20PRERTRU, 10) || 0;
    const o = parseInt(row.G20PRELJOR, 10) || 0;
    bump("2020-president", fips, "d", d);
    bump("2020-president", fips, "r", r);
    bump("2020-president", fips, null, o);
  }
}

// ── merge ──────────────────────────────────────────────────────────────
const path = resolve(root, "app/data/countyResults.generated.json");
const cur = JSON.parse(readFileSync(path, "utf8"));
for (const [race, byFips] of Object.entries(blocks)) {
  const block = {};
  for (const [fips, t] of Object.entries(byFips)) {
    if (!t.total) continue;
    const dPct = Math.round((t.d / t.total) * 1000) / 10;
    const rPct = Math.round((t.r / t.total) * 1000) / 10;
    block[fips] = {
      fips, winner: t.d >= t.r ? "D" : "R", dPct, rPct,
      marginPct: Math.round(Math.abs(dPct - rPct) * 10) / 10,
      dVotes: t.d, rVotes: t.r, totalVotes: t.total,
    };
  }
  cur[race] = { ...(cur[race] ?? {}), ...block };
  const c = Object.values(block);
  console.error(`${race}: ${c.length} counties, D ${c.filter((x) => x.winner === "D").length} / R ${c.filter((x) => x.winner === "R").length}`);
}
writeFileSync(path, JSON.stringify(cur, null, 1) + "\n");
console.error("merged PA into app/data/countyResults.generated.json");
