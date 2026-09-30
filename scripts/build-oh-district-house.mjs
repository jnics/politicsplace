#!/usr/bin/env node
/**
 * Aggregate precinct-level U.S. House votes onto Ohio's CURRENT (2027-2033)
 * congressional lines, so the map's district drill-down can shade districts by
 * their House result for a past year even though the districts were redrawn.
 *
 *   node scripts/build-oh-district-house.mjs <dir-with-medsl-csvs>
 *
 * Inputs (MEDSL precinct returns, too big to commit — download per run):
 *   <dir>/oh22_cleaned.csv   github.com/MEDSL/2022-elections-official  (2022-oh-local-precinct-general.zip)
 *   <dir>/oh24.csv           github.com/MEDSL/2024-elections-official  (individual_states/oh24.zip)
 * Output (committed): app/data/districtHouse.generated.json
 *
 * Precinct -> new-district comes from app/data/geo/OH.districts.json (the new
 * lines) joined to the per-county precinct name lists by exact name.
 */
import { readFileSync, writeFileSync, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const SRC = process.argv[2];
if (!SRC) throw new Error("pass the dir holding oh22_cleaned.csv and oh24.csv");

const norm = (s) => String(s).toUpperCase().replace(/\s+/g, " ").trim();

// ── precinct key -> new district ──────────────────────────────────────────
const districts = JSON.parse(
  readFileSync(resolve(root, "app/data/geo/OH.districts.json"), "utf8")
);
const keyToDistrict = new Map();
for (const [dist, counties] of Object.entries(districts)) {
  for (const [fips, ids] of Object.entries(counties)) {
    let pf;
    try {
      pf = JSON.parse(
        readFileSync(
          resolve(root, `app/data/geo/precincts/OH/${fips}.json`),
          "utf8"
        )
      );
    } catch {
      continue;
    }
    const nameById = new Map(pf.precincts.map((p) => [p.id, p.name]));
    for (const id of ids) {
      const nm = nameById.get(id);
      if (nm) keyToDistrict.set(`${fips}:${norm(nm)}`, Number(dist));
    }
  }
}

// ── stream a MEDSL csv, sum US HOUSE D/R votes per new district ────────────
async function tallyYear(file) {
  const tallies = {}; // district -> { d, r, matched, unmatched }
  let iP, iO, iPS, iV, iM, iF;
  let header = true;
  const rl = createInterface({ input: createReadStream(resolve(SRC, file)) });
  for await (const line of rl) {
    if (header) {
      const h = line.split(",");
      iP = h.indexOf("precinct");
      iO = h.indexOf("office");
      iPS = h.indexOf("party_simplified");
      iV = h.indexOf("votes");
      iM = h.indexOf("mode");
      iF = h.indexOf("county_fips");
      header = false;
      continue;
    }
    const c = line.split(",");
    if (c[iO] !== "US HOUSE" || c[iM] !== "TOTAL") continue;
    const dist = keyToDistrict.get(`${c[iF]}:${norm(c[iP])}`);
    if (dist == null) continue;
    const t = (tallies[dist] ||= { d: 0, r: 0 });
    const v = parseInt(c[iV], 10) || 0;
    if (c[iPS] === "DEMOCRAT") t.d += v;
    else if (c[iPS] === "REPUBLICAN") t.r += v;
  }
  return tallies;
}

const years = {};
for (const [year, file] of [
  ["2022", "oh22_cleaned.csv"],
  ["2024", "oh24.csv"],
]) {
  const t = await tallyYear(file);
  years[year] = t;
  console.error(
    `${year}: ${Object.keys(t).length} districts; ` +
      Object.entries(t)
        .map(([d, v]) => `${d}:${v.d > v.r ? "D" : "R"}+${Math.abs(
          ((v.d - v.r) / (v.d + v.r)) * 100
        ).toFixed(0)}`)
        .join(" ")
  );
}

// ── shape into { district: { year: { winner, dPct, rPct, marginPct } } } ──
const out = {};
for (const [year, t] of Object.entries(years)) {
  for (const [dist, v] of Object.entries(t)) {
    const tot = v.d + v.r;
    if (!tot) continue;
    const dPct = Math.round((v.d / tot) * 1000) / 10;
    const rPct = Math.round((v.r / tot) * 1000) / 10;
    (out[dist] ||= {})[year] = {
      winner: dPct >= rPct ? "D" : "R",
      dPct,
      rPct,
      marginPct: Math.round(Math.abs(dPct - rPct) * 10) / 10,
    };
  }
}

writeFileSync(
  resolve(root, "app/data/districtHouse.generated.json"),
  JSON.stringify(
    {
      note:
        "OH U.S. House vote by party aggregated onto the 2027-2033 district lines from MEDSL precinct returns (2022, 2024). Two-party shares only. Regenerate with scripts/build-oh-district-house.mjs.",
      OH: out,
    },
    null,
    1
  ) + "\n"
);
console.error("wrote app/data/districtHouse.generated.json");
