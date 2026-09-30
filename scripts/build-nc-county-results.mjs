#!/usr/bin/env node
/**
 * North Carolina county-level results for the county-zoom shading, from the NC
 * State Board of Elections precinct exports (authoritative, public, no login):
 *
 *   https://s3.amazonaws.com/dl.ncsbe.gov/ENRS/<YYYY_MM_DD>/results_pct_<YYYYMMDD>.zip
 *
 * One tab-separated file per election, columns incl. County, Contest Name,
 * Choice Party, Total Votes. We sum to county for US PRESIDENT / US SENATE and
 * write the two-major-party shares (of the full total) plus the margin.
 *
 *   node scripts/build-nc-county-results.mjs <dir-with-the-4-results_pct_*.txt>
 *
 * Output (merged by countyResults.ts): app/data/countyResults.generated.json
 *   { "<year>-<office>": { "<fips5>": { fips, winner, dPct, rPct, marginPct,
 *                                       dVotes, rVotes, totalVotes } } }
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const SRC = process.argv[2];
if (!SRC) throw new Error("pass the dir holding results_pct_20161108.txt etc.");

// County NAME (uppercase, spaces stripped) -> 5-digit FIPS, from the extracted
// state geo. NC's Census county codes are historical, NOT alphabetical
// (McDowell 37111 precedes Macon 37113), so no "37 + 2n-1" formula.
const keyN = (s) => String(s).toUpperCase().replace(/\s+/g, "").trim();
const NC_GEO = JSON.parse(
  readFileSync(resolve(root, "app/data/geo/NC.json"), "utf8")
);
const fipsByName = new Map(NC_GEO.counties.map((c) => [keyN(c.name), c.fips]));

const FILES = [
  ["2016", "results_pct_20161108.txt", ["president", "senate"]],
  ["2020", "results_pct_20201103.txt", ["president", "senate"]],
  ["2022", "results_pct_20221108.txt", ["senate"]],
  ["2024", "results_pct_20241105.txt", ["president"]],
];
const CONTEST = { president: "US PRESIDENT", senate: "US SENATE" };

const out = {};

for (const [year, file, offices] of FILES) {
  const path = resolve(SRC, file);
  if (!existsSync(path)) {
    console.error(`skip ${year}: ${file} not found`);
    continue;
  }
  const lines = readFileSync(path, "latin1").split(/\r?\n/);
  const h = lines[0].split("\t").map((s) => s.trim());
  const iCounty = h.indexOf("County");
  const iContest = h.indexOf("Contest Name");
  const iParty = h.indexOf("Choice Party");
  const iVotes = h.indexOf("Total Votes");

  for (const office of offices) {
    const tally = {}; // fips -> { d, r, total }
    const want = CONTEST[office];
    for (let i = 1; i < lines.length; i++) {
      const c = lines[i].split("\t");
      if ((c[iContest] || "").trim() !== want) continue;
      const fips = fipsByName.get(keyN(c[iCounty] || ""));
      if (!fips) continue;
      const v = parseInt((c[iVotes] || "").replace(/,/g, ""), 10) || 0;
      const t = (tally[fips] ||= { d: 0, r: 0, total: 0 });
      t.total += v;
      const p = (c[iParty] || "").trim().toUpperCase();
      if (p === "DEM") t.d += v;
      else if (p === "REP") t.r += v;
    }
    const block = {};
    for (const [fips, t] of Object.entries(tally)) {
      if (!t.total) continue;
      const dPct = Math.round((t.d / t.total) * 1000) / 10;
      const rPct = Math.round((t.r / t.total) * 1000) / 10;
      block[fips] = {
        fips,
        winner: t.d >= t.r ? "D" : "R",
        dPct,
        rPct,
        marginPct: Math.round(Math.abs(dPct - rPct) * 10) / 10,
        dVotes: t.d,
        rVotes: t.r,
        totalVotes: t.total,
      };
    }
    out[`${year}-${office}`] = block;
    const counts = Object.values(block);
    const dWon = counts.filter((x) => x.winner === "D").length;
    console.error(
      `${year}-${office}: ${counts.length} counties, D wins ${dWon} / R wins ${
        counts.length - dWon
      }`
    );
  }
}

writeFileSync(
  resolve(root, "app/data/countyResults.generated.json"),
  JSON.stringify(
    {
      note:
        "County-level US President / US Senate results, summed from the NC State " +
        "Board of Elections precinct exports (dl.ncsbe.gov/ENRS). Two-major-party " +
        "shares of the full total. Regenerate with scripts/build-nc-county-results.mjs.",
      ...out,
    },
    null,
    1
  ) + "\n"
);
console.error("wrote app/data/countyResults.generated.json");
