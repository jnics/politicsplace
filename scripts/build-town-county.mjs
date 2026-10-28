#!/usr/bin/env node
/**
 * Builds the town -> county lookup the early-vote pull uses for the New
 * England states the UF Election Lab reports by town instead of county
 * (CT, ME, MA, RI, VT). One-time, not part of the daily pull; rerun only if
 * towns or county lines change.
 *
 *   node scripts/build-town-county.mjs <national_cousub2020.txt>
 *
 * Input: the Census Bureau's 2020 county subdivision codes,
 *   https://www2.census.gov/geo/docs/reference/codes2020/national_cousub2020.txt
 * (pipe-delimited). Its Connecticut rows still use the eight old counties,
 * matching the app's county geometry.
 *
 * Writes scripts/data/town-county.json: { "<USPS>": { "<town key>": "<county
 * FIPS>" } }. Keys are townKey() (scripts/lib/town-key.mjs), shared with
 * pull-early-vote-counts.mjs. A town name that occurs in more than one county
 * of a state is left out. EXTRA adds the voting units UF lists that the 2020
 * Census file lacks.
 *
 * Maine's unorganized townships ("Albany Twp", "T17 R5") are one Census unit
 * per county, so they don't match by name; they're about 1,500 ballots and
 * are left out of the county view (still in the statewide total).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { townKey } from "./lib/town-key.mjs";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT = resolve(root, "scripts/data/town-county.json");
const STATES = new Set(["CT", "ME", "MA", "RI", "VT"]);
const EXTRA = {
  VT: { "Essex Junction": "50007" }, // became a city in 2022, Chittenden County
  ME: { "Penobscot Nation Voting District": "23019" }, // Penobscot County
};

const [src] = process.argv.slice(2);
if (!src) {
  console.error("usage: node scripts/build-town-county.mjs <national_cousub2020.txt>");
  process.exit(1);
}

const lines = readFileSync(src, "utf8").split(/\r?\n/);
const header = lines[0].split("|");
const col = (name) => header.indexOf(name);
const [iState, iStateFp, iCountyFp, iName, iClass] = [
  "STATE", "STATEFP", "COUNTYFP", "COUSUBNAME", "CLASSFP",
].map(col);

const out = {};
const dupes = {};
for (const line of lines.slice(1)) {
  const f = line.split("|");
  const usps = f[iState];
  if (!STATES.has(usps) || f[iClass] === "Z9") continue; // Z9: "not defined" placeholders
  const key = townKey(f[iName]);
  if (!key) continue;
  const fips = f[iStateFp] + f[iCountyFp];
  const state = (out[usps] ??= {});
  if (state[key] && state[key] !== fips) (dupes[usps] ??= new Set()).add(key);
  state[key] = fips;
}
for (const [usps, keys] of Object.entries(dupes)) for (const k of keys) delete out[usps][k];
for (const [usps, towns] of Object.entries(EXTRA))
  for (const [name, fips] of Object.entries(towns)) out[usps][townKey(name)] = fips;

writeFileSync(OUT, JSON.stringify(out));
for (const [usps, towns] of Object.entries(out))
  console.log(`${usps}: ${Object.keys(towns).length} towns${dupes[usps] ? `, ${dupes[usps].size} ambiguous dropped` : ""}`);
console.log(`Wrote ${OUT}`);
