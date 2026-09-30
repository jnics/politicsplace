#!/usr/bin/env node
/**
 * Michigan county-level results for the county-zoom shading. Merged into
 * app/data/countyResults.generated.json.
 *
 *   node scripts/build-mi-county-results.mjs <dir>
 *
 * <dir> holds:
 *   c2016.csv    OpenElections 20161108__mi__general__county.csv     (2016 president)
 *   oe2018.csv   OpenElections 20181106__mi__general__precinct.csv    (2018 senate — MEDSL 2018 MI drops Wayne + 5 others)
 *   mi_2020.dbf  VEST mi_2020.zip / doi:10.7910/DVN/K7760H            (2020 pres + senate)
 *   mi24.csv     MEDSL 2024-elections-official individual_states/mi24 (2024 pres + senate)
 *
 * Michigan's Senate cycles are 2018 (Stabenow), 2020 (Peters), 2024 (Slotkin).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const SRC = process.argv[2];
if (!SRC) throw new Error("pass the dir holding the MI source files");

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

const keyN = (s) => String(s).toUpperCase().replace(/\s+/g, "").replace(/\./g, "").trim();
const MI_GEO = JSON.parse(readFileSync(resolve(root, "app/data/geo/MI.json"), "utf8"));
const fipsByName = new Map(MI_GEO.counties.map((c) => [keyN(c.name), c.fips]));
// OpenElections uses a few non-standard county spellings.
fipsByName.set("GDTRAVERSE", fipsByName.get("GRANDTRAVERSE"));
const dside = (p) => {
  const s = String(p).toUpperCase().trim();
  if (s === "DEM" || s === "D" || s.startsWith("DEMOCRAT")) return "d";
  if (s === "REP" || s === "R" || s.startsWith("REPUBLICAN")) return "r";
  return null;
};

/** minimal .dbf reader (ascii fields) */
function readDbf(buf) {
  const headerLen = buf.readUInt16LE(8);
  const recordLen = buf.readUInt16LE(10);
  const count = buf.readUInt32LE(4);
  const fields = [];
  for (let p = 32; buf[p] !== 0x0d; p += 32) {
    fields.push({ name: buf.toString("ascii", p, p + 11).replace(/\0.*$/, ""), length: buf[p + 16] });
  }
  const rows = [];
  for (let i = 0; i < count; i++) {
    let p = headerLen + i * recordLen + 1;
    const r = {};
    for (const f of fields) { r[f.name] = buf.toString("ascii", p, p + f.length).trim(); p += f.length; }
    rows.push(r);
  }
  return rows;
}

const blocks = {}; // "<year>-<office>" -> { fips -> {d,r,total} }
const bump = (race, fips, side, v) => {
  const b = (blocks[race] ||= {});
  const t = (b[fips] ||= { d: 0, r: 0, total: 0 });
  t.total += v;
  if (side) t[side] += v;
};

// ── 2016 president: OpenElections county file ────────────────────────────
for (const r of parseCSV(readFileSync(resolve(SRC, "c2016.csv"), "utf8")).slice(1)) {
  const [county, office, , party, , , , , votes] = r;
  if (!/President/i.test(office)) continue;
  const fips = fipsByName.get(keyN(county));
  if (!fips) continue;
  bump("2016-president", fips, dside(party), parseInt(votes, 10) || 0);
}

// ── 2018 senate: OpenElections precinct file (county name keyed) ─────────
{
  const rows = parseCSV(readFileSync(resolve(SRC, "oe2018.csv"), "utf8"));
  const h = rows[0].map((s) => s.toLowerCase().trim());
  const iC = h.indexOf("county"), iO = h.indexOf("office"),
    iPa = h.indexOf("party"), iV = h.indexOf("votes");
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!/^U\.?S\.? Senate$/i.test((r[iO] || "").trim())) continue;
    const fips = fipsByName.get(keyN(r[iC] || ""));
    if (!fips) continue;
    bump("2018-senate", fips, dside(r[iPa]), parseInt((r[iV] || "").replace(/,/g, ""), 10) || 0);
  }
}

// ── 2024 pres/senate: MEDSL precinct file ───────────────────────────────
for (const [file, map] of [
  ["mi24.csv", { "US PRESIDENT": "2024-president", "US SENATE": "2024-senate" }],
]) {
  const rows = parseCSV(readFileSync(resolve(SRC, file), "utf8"));
  const h = rows[0].map((s) => s.toLowerCase().trim());
  const iO = h.indexOf("office"), iPS = h.indexOf("party_simplified"),
    iM = h.indexOf("mode"), iV = h.indexOf("votes"), iF = h.indexOf("county_fips");
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r[iM] !== "TOTAL") continue;
    const race = map[r[iO]];
    if (!race) continue;
    const fips = String(r[iF]).padStart(5, "0");
    const s = r[iPS] === "DEMOCRAT" ? "d" : r[iPS] === "REPUBLICAN" ? "r" : null;
    bump(race, fips, s, parseInt(r[iV], 10) || 0);
  }
}

// ── 2020 president + senate: VEST dbf ────────────────────────────────────
{
  const dbf = readDbf(readFileSync(resolve(SRC, "mi_2020.dbf")));
  const P = { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREUBLA", "G20PREGHAW", "G20PRENDEL"] };
  const S = { d: "G20USSDPET", r: "G20USSRJAM", o: ["G20USSUWIL", "G20USSGSQU", "G20USSNDER"] };
  for (const row of dbf) {
    const fips = "26" + String(row.COUNTYFIPS).padStart(3, "0");
    for (const [race, cols] of [["2020-president", P], ["2020-senate", S]]) {
      const d = parseInt(row[cols.d], 10) || 0;
      const r = parseInt(row[cols.r], 10) || 0;
      const o = cols.o.reduce((s, c) => s + (parseInt(row[c], 10) || 0), 0);
      bump(race, fips, "d", d);
      bump(race, fips, "r", r);
      bump(race, fips, null, o);
    }
  }
}

// ── shape + merge ───────────────────────────────────────────────────────
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
  console.error(
    `${race}: ${c.length} counties, D ${c.filter((x) => x.winner === "D").length} / R ${c.filter((x) => x.winner === "R").length}`
  );
}
writeFileSync(path, JSON.stringify(cur, null, 1) + "\n");
console.error("merged MI into app/data/countyResults.generated.json");
