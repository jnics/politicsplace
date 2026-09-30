#!/usr/bin/env node
/**
 * Georgia county-level results, merged into app/data/countyResults.generated.json.
 *
 *   node scripts/build-ga-county-results.mjs <ga-dir>
 *
 * <ga-dir> holds:
 *   g2016.csv     OpenElections 20161108__ga__general.csv               (2016 pres + senate)
 *   g2022.csv     OpenElections 20221108__ga__general__precinct.csv     (2022 senate — Nov general)
 *   g2024.csv     OpenElections 20241105__ga__general__county-level.csv (2024 president)
 *   ga_2020.dbf   VEST ga_2020.zip / doi:10.7910/DVN/K7760H             (2020 pres + senate)
 *
 * GA's Senate cycles: 2016 (Isakson), 2020 regular (Perdue/Ossoff — Nov general,
 * before the Jan-2021 runoff), 2022 (Warnock/Walker — Nov general), 2026 (Ossoff).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const SRC = process.argv[2];
if (!SRC) throw new Error("pass the dir holding the GA source files");

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
const GA_GEO = JSON.parse(readFileSync(resolve(root, "app/data/geo/GA.json"), "utf8"));
const fipsByName = new Map(GA_GEO.counties.map((c) => [keyN(c.name), c.fips]));
const dside = (p) => {
  const s = String(p).toUpperCase().replace(/[^A-Z]/g, ""); // OE 2016 GA has "(REP"
  if (s === "DEM" || s === "D" || s.startsWith("DEMOCRAT")) return "d";
  if (s === "REP" || s === "R" || s.startsWith("REPUBLICAN")) return "r";
  return null;
};

const blocks = {};
const bump = (race, fips, side, v) => {
  const b = (blocks[race] ||= {});
  const t = (b[fips] ||= { d: 0, r: 0, total: 0 });
  t.total += v;
  if (side) t[side] += v;
};

// ── 2016 pres + senate: OpenElections county file (has a `votes` total) ──
{
  const rows = parseCSV(readFileSync(resolve(SRC, "g2016.csv"), "utf8"));
  const h = rows[0].map((s) => s.toLowerCase().trim());
  const iC = h.indexOf("county"), iO = h.indexOf("office"),
    iPa = h.indexOf("party"), iV = h.indexOf("votes");
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const race = r[iO] === "President of the United States" ? "2016-president"
      : r[iO] === "United States Senator" ? "2016-senate" : null;
    if (!race) continue;
    const fips = fipsByName.get(keyN(r[iC] || ""));
    if (!fips) continue;
    bump(race, fips, dside(r[iPa]), parseInt((r[iV] || "").replace(/,/g, ""), 10) || 0);
  }
}

// ── 2022 senate + 2024 president: OpenElections, 4 mode columns summed ───
for (const [file, office, race] of [
  ["g2022.csv", "U.S. Senate", "2022-senate"],
  ["g2024.csv", "President", "2024-president"],
]) {
  const rows = parseCSV(readFileSync(resolve(SRC, file), "utf8"));
  const h = rows[0].map((s) => s.toLowerCase().trim());
  const iC = h.indexOf("county"), iO = h.indexOf("office"), iPa = h.indexOf("party");
  const modeCols = ["election_day_votes", "advanced_votes", "absentee_by_mail_votes", "provisional_votes"]
    .map((c) => h.indexOf(c));
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if ((r[iO] || "").trim() !== office) continue;
    const fips = fipsByName.get(keyN(r[iC] || ""));
    if (!fips) continue;
    const v = modeCols.reduce((s, ci) => s + (parseInt((r[ci] || "").replace(/,/g, ""), 10) || 0), 0);
    bump(race, fips, dside(r[iPa]), v);
  }
}

// ── 2020 pres + senate (regular): VEST dbf ──────────────────────────────
{
  const dbf = readDbf(readFileSync(resolve(SRC, "ga_2020.dbf")));
  // VEST GA county id: FIPS2 is the GA county number *3 (e.g. 215 = 072); the
  // reliable key is COUNTY (name).
  const P = { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR"] };
  const S = { d: "G20USSDOSS", r: "G20USSRPER", o: ["G20USSLHAZ"] };
  for (const row of dbf) {
    const fips = fipsByName.get(keyN(row.COUNTY || ""));
    if (!fips) continue;
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
console.error("merged GA into app/data/countyResults.generated.json");
