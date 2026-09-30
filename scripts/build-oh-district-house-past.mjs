#!/usr/bin/env node
/**
 * Add the 2016, 2018 and 2020 U.S. House vote, aggregated onto Ohio's CURRENT
 * (2027-2033) congressional lines, to app/data/districtHouse.generated.json.
 *
 *   node scripts/build-oh-district-house-past.mjs <dir-with-the-csvs>
 *
 * Inputs (OpenElections precinct returns, too big to commit — download per run):
 *   <dir>/oe_oh_2016_precinct.csv
 *     raw.githubusercontent.com/openelections/openelections-data-oh/master/2016/20161108__oh__general__precinct.csv
 *   <dir>/oe_oh_2018_precinct.csv
 *     raw.githubusercontent.com/openelections/openelections-data-oh/master/2018/20181106__oh__general__precinct.csv
 *   <dir>/oe_oh_2020_precinct.csv
 *     raw.githubusercontent.com/openelections/openelections-data-oh/master/2020/20201103__oh__general__precinct.csv
 *
 * Join: OpenElections' `precinct code` is the same code the geo files carry as
 * the tail of each precinct id (id = <ohCountyNumber><code>). Names diverge
 * between cycles; the codes do not — this matches 100% of precincts.
 *
 * 2016-2020 used the 16-seat 2012-2020 map, so a district NUMBER from
 * those years is meaningless on the current lines. Only the "current lines"
 * side is kept: what today's district territory voted in those House races.
 * There is no old-lines counterpart and no redraw-flip comparison for them.
 *
 * Merges "2016"/"2018"/"2020" into districtHouse.generated.json, leaving the
 * 2022/2024 entries (which DO support the redraw comparison) untouched.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const SRC = process.argv[2];
if (!SRC) throw new Error("pass the dir holding the two oe_oh_20NN_precinct.csv files");

/** Minimal RFC4180 CSV -> array of string rows. */
function parseCSV(t) {
  const rows = [];
  let row = [], cur = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') {
        if (t[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c !== "\r") cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// Ohio's 88 counties, alphabetical — index + 1 is the county number that
// prefixes every precinct id in the geo files, and fips = 39 + (2n - 1).
const OH_COUNTIES = `Adams Allen Ashland Ashtabula Athens Auglaize Belmont Brown Butler
Carroll Champaign Clark Clermont Clinton Columbiana Coshocton Crawford Cuyahoga
Darke Defiance Delaware Erie Fairfield Fayette Franklin Fulton Gallia Geauga
Greene Guernsey Hamilton Hancock Hardin Harrison Henry Highland Hocking Holmes
Huron Jackson Jefferson Knox Lake Lawrence Licking Logan Lorain Lucas Madison
Mahoning Marion Medina Meigs Mercer Miami Monroe Montgomery Morgan Morrow
Muskingum Noble Ottawa Paulding Perry Pickaway Pike Portage Preble Putnam
Richland Ross Sandusky Scioto Seneca Shelby Stark Summit Trumbull Tuscarawas
Union "Van Wert" Vinton Warren Washington Wayne Williams Wood Wyandot`
  .split(/\s+(?=(?:[^"]*"[^"]*")*[^"]*$)/)
  .map((s) => s.replace(/"/g, "").toUpperCase());
const countyNumByName = new Map(OH_COUNTIES.map((n, i) => [n, i + 1]));

// ── geo precinct id -> current district ──────────────────────────────────
const districts = JSON.parse(
  readFileSync(resolve(root, "app/data/geo/OH.districts.json"), "utf8")
);
const idToDistrict = new Map();
for (const [dist, counties] of Object.entries(districts)) {
  for (const [fips, ids] of Object.entries(counties)) {
    let pf;
    try {
      pf = JSON.parse(
        readFileSync(resolve(root, `app/data/geo/precincts/OH/${fips}.json`), "utf8")
      );
    } catch {
      continue;
    }
    const known = new Set(pf.precincts.map((p) => p.id));
    for (const id of ids) if (known.has(id)) idToDistrict.set(id, Number(dist));
  }
}

function tally(file) {
  const rows = parseCSV(readFileSync(resolve(SRC, file), "utf8"));
  const h = rows[0].map((s) => s.toLowerCase().trim());
  const iCounty = h.indexOf("county");
  const iCode = h.findIndex((x) => x === "precinct code" || x === "precinct_code");
  const iOffice = h.indexOf("office");
  const iParty = h.indexOf("party");
  const iCand = h.indexOf("candidate");
  const iVotes = h.indexOf("votes");
  const t = {}; // district -> { d, r }
  let total = 0, matched = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length <= iVotes) continue;
    if (!/^(U\.?S\.? House|Representative to Congress)$/i.test((row[iOffice] || "").trim()))
      continue;
    const partyRaw = (row[iParty] || "").trim().toUpperCase();
    const cand = (row[iCand] || "").toUpperCase();
    const party =
      partyRaw === "D" || partyRaw.startsWith("DEM") || /\(D(EM)?\)\*?$/.test(cand) ? "D"
      : partyRaw === "R" || partyRaw.startsWith("REP") || /\(R(EP)?\)\*?$/.test(cand) ? "R"
      : null;
    if (!party) continue;
    const v = parseInt(row[iVotes], 10) || 0;
    total += v;
    const num = countyNumByName.get((row[iCounty] || "").trim().toUpperCase());
    if (!num) continue;
    const id = String(num).padStart(3, "0") + (row[iCode] || "").trim().toUpperCase();
    const dist = idToDistrict.get(id);
    if (dist == null) continue;
    matched += v;
    const e = (t[dist] ||= { d: 0, r: 0 });
    e[party === "D" ? "d" : "r"] += v;
  }
  return { t, total, matched };
}

const outPath = resolve(root, "app/data/districtHouse.generated.json");
const cur = JSON.parse(readFileSync(outPath, "utf8"));

for (const [year, file] of [
  ["2016", "oe_oh_2016_precinct.csv"],
  ["2018", "oe_oh_2018_precinct.csv"],
  ["2020", "oe_oh_2020_precinct.csv"],
]) {
  const { t, total, matched } = tally(file);
  console.error(
    `${year}: ${(100 * matched / total).toFixed(1)}% of two-party House votes matched ` +
      `(${matched.toLocaleString()} / ${total.toLocaleString()})`
  );
  console.error(
    Object.entries(t)
      .sort((a, b) => a[0] - b[0])
      .map(([d, v]) => {
        const tot = v.d + v.r;
        return `${d}:${v.d >= v.r ? "D" : "R"}+${Math.abs(((v.d - v.r) / tot) * 100).toFixed(0)}`;
      })
      .join(" ")
  );
  for (const [dist, v] of Object.entries(t)) {
    const tot = v.d + v.r;
    if (!tot) continue;
    const dPct = Math.round((v.d / tot) * 1000) / 10;
    const rPct = Math.round((v.r / tot) * 1000) / 10;
    (cur.OH[dist] ||= {})[year] = {
      winner: dPct >= rPct ? "D" : "R",
      dPct,
      rPct,
      marginPct: Math.round(Math.abs(dPct - rPct) * 10) / 10,
    };
  }
}

cur.note =
  "OH U.S. House vote by party aggregated onto the 2027-2033 district lines from " +
  "precinct returns. 2022 + 2024 (MEDSL) are on the same 2022-2032 map as their " +
  "election and back the old-vs-new redraw comparison. 2016-2020 (OpenElections, " +
  "joined by precinct code) were run on the 16-seat 2012-2020 map, so only " +
  "their current-lines aggregate is kept. Two-party shares only.";

writeFileSync(outPath, JSON.stringify(cur, null, 1) + "\n");
console.error("merged 2016 + 2018 + 2020 into app/data/districtHouse.generated.json");
