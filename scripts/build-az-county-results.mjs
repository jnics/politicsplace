#!/usr/bin/env node
/**
 * Arizona county-level results, merged into countyResults.generated.json.
 *
 *   node scripts/build-az-county-results.mjs <az-dir>
 *
 * <az-dir> holds:
 *   o2016.csv       OpenElections 20161108__az__general__precinct.csv   (2016 pres + senate; has `votes` total)
 *   c2018.csv       OpenElections 20181106__az__general__county.csv     (2018 senate; county name is in the `precinct` field)
 *   AZ-cleaned.csv  MEDSL 2022-az-local-precinct-general                (2022 senate)
 *   az24.csv        MEDSL 2024 individual_states/az24                   (2024 president)
 *   sen24.csv       MEDSL 2024 2024-senate-county.csv (national)        (2024 senate)
 *   az_2020.dbf     VEST az_2020.zip / doi:10.7910/DVN/K7760H           (2020 pres + 2020 special senate)
 *
 * AZ has a Senate race every cycle: 2016 (McCain), 2018 (Sinema), 2020-special
 * (Kelly/McSally), 2022 (Kelly), 2024 (Gallego). No AZ race in 2026.
 */
import { readFileSync, writeFileSync, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const SRC = process.argv[2];
if (!SRC) throw new Error("pass the dir holding the AZ source files");

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
const AZ_GEO = JSON.parse(readFileSync(resolve(root, "app/data/geo/AZ.json"), "utf8"));
const fipsByName = new Map(AZ_GEO.counties.map((c) => [keyN(c.name), c.fips]));
// "d" | "r" | "o" (a recognised minor party) | null (blank / running-mate row
// / NP — skip these entirely so a messy file's shifted duplicates don't inflate
// the denominator).
const KNOWN_MINOR = new Set(["GRN", "GREEN", "LBT", "LIB", "LIBERTARIAN", "IND", "INDEPENDENT", "NLP", "CST", "REF", "SOL", "PAF", "WI", "WRITEIN", "AME", "CON", "AMD", "NON", "NPA", "GRE"]);
const dparty = (p) => {
  const s = String(p).toUpperCase().replace(/[^A-Z]/g, "");
  if (!s) return null;
  if (s.startsWith("DEM")) return "d";
  if (s.startsWith("REP")) return "r";
  return KNOWN_MINOR.has(s) ? "o" : null;
};

const blocks = {};
const bump = (race, fips, side, v) => {
  const b = (blocks[race] ||= {});
  const t = (b[fips] ||= { d: 0, r: 0, total: 0 });
  t.total += v;
  if (side === "d" || side === "r") t[side] += v;
};

// ── OpenElections: 2016 (county in col `county`), 2018 (county in `precinct`) ──
for (const [file, map, countyCol] of [
  ["o2016.csv", { President: "2016-president", "U.S. Senate": "2016-senate" }, "county"],
  ["c2018.csv", { "U.S. Senate": "2018-senate" }, "precinct"],
]) {
  const rows = parseCSV(readFileSync(resolve(SRC, file), "utf8"));
  const h = rows[0].map((s) => s.toLowerCase().trim());
  const iC = h.indexOf(countyCol), iO = h.indexOf("office"),
    iPa = h.indexOf("party"), iV = h.indexOf("votes");
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const race = map[(r[iO] || "").trim()];
    if (!race) continue;
    const fips = fipsByName.get(keyN(r[iC] || ""));
    if (!fips) continue;
    const side = dparty(r[iPa]);
    if (!side) continue; // blank / running-mate / unknown — skip
    bump(race, fips, side, parseInt((r[iV] || "").replace(/,/g, ""), 10) || 0);
  }
}

// ── MEDSL national files — stream, filter to AZ (county_fips 04xxx) ────
// (individual_states/*.zip turned out to hold the whole national CSV.)
const splitLine = (l) => {
  // MEDSL fields with an embedded comma are quoted; a light parser is enough.
  const out = [];
  let cur = "", q = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (q) { if (c === '"') { if (l[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
};
const COMPONENT = /^(ELECTION DAY|EARLY VOTING|LATE EARLY|PROVISIONAL|LATE VOTES|ABSENTEE|MAIL|ADVANCE|IN-PERSON)/;
for (const [file, office, race] of [
  ["AZ-cleaned.csv", "US SENATE", "2022-senate"],
  ["az24.csv", "US PRESIDENT", "2024-president"],
  ["sen24.csv", "US SENATE", "2024-senate"],
]) {
  // Some AZ counties report only component modes, others only TOTAL — collect
  // both, then per county prefer the component sum, falling back to TOTAL.
  const comp = {}; // fips -> { d, r, total }
  const total = {}; // fips -> { d, r, total }
  const rl = createInterface({ input: createReadStream(resolve(SRC, file)) });
  let idx = null;
  for await (const line of rl) {
    if (!idx) {
      const h = splitLine(line).map((s) => s.toLowerCase().trim());
      idx = {
        o: h.indexOf("office"), ps: h.indexOf("party_simplified"),
        m: h.indexOf("mode"), v: h.indexOf("votes"), f: h.indexOf("county_fips"),
      };
      continue;
    }
    const r = splitLine(line);
    const fips = String(r[idx.f]).padStart(5, "0");
    if (!fips.startsWith("04") || r[idx.o] !== office) continue;
    const mode = r[idx.m];
    const target = mode === "TOTAL" ? total : COMPONENT.test(mode) ? comp : null;
    if (!target) continue;
    const v = parseInt(r[idx.v], 10) || 0;
    const t = (target[fips] ||= { d: 0, r: 0, total: 0 });
    t.total += v;
    if (r[idx.ps] === "DEMOCRAT") t.d += v;
    else if (r[idx.ps] === "REPUBLICAN") t.r += v;
  }
  for (const fips of new Set([...Object.keys(comp), ...Object.keys(total)])) {
    const t = comp[fips] ?? total[fips];
    bump(race, fips, "d", t.d);
    bump(race, fips, "r", t.r);
    bump(race, fips, null, t.total - t.d - t.r);
  }
}

// ── VEST: 2020 president + 2020 special senate ────────────────────────
// VEST tags rows with AZ's 2-letter county codes, not names.
const AZ_CODE_FIPS = {
  AP: "04001", CH: "04003", CN: "04005", GI: "04007", GM: "04009",
  GN: "04011", LP: "04012", MC: "04013", MO: "04015", NA: "04017",
  PM: "04019", PN: "04021", SC: "04023", YA: "04025", YU: "04027",
};
{
  const dbf = readDbf(readFileSync(resolve(SRC, "az_2020.dbf")));
  for (const row of dbf) {
    const fips = AZ_CODE_FIPS[String(row.CDE_COUNTY || "").toUpperCase().trim()];
    if (!fips) continue;
    for (const [race, d, r, o] of [
      ["2020-president", "G20PREDBID", "G20PRERTRU", "G20PRELJOR"],
      ["2020-senate", "G20USSDKEL", "G20USSRMCS", null],
    ]) {
      bump(race, fips, "d", parseInt(row[d], 10) || 0);
      bump(race, fips, "r", parseInt(row[r], 10) || 0);
      if (o) bump(race, fips, null, parseInt(row[o], 10) || 0);
    }
  }
}

// ── merge ─────────────────────────────────────────────────────────────
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
console.error("merged AZ into app/data/countyResults.generated.json");
