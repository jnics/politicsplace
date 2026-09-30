#!/usr/bin/env node
/**
 * Build app/data/oh7Precincts.generated.json: the real polling places of Ohio's
 * 7th congressional district (2026 lines — Cuyahoga split, Medina whole, Ashland
 * whole [minus Mifflin], Wayne split), grouped by town/city, for the /results
 * election-night tally page.
 *
 *   node scripts/build-oh7-precincts.mjs   (pnpm oh7:precincts)
 *
 * Sources (committed under scripts/data/, reproducible offline):
 *  - scripts/data/oh7-cuyahoga-polling.json — CuyahogaGIS "Voting Precincts
 *    region" FeatureServer, Congressio = 7 (real polling name + address).
 *  - scripts/data/oh7-county-polling.json — the Ashland / Medina / Wayne county
 *    "Precinct and Polling Locations" reports from lookup.boe.ohio.gov.
 *
 * Wayne is split: only the precincts listed for district 7 in
 * app/data/geo/OH.districts.json are kept (matched by normalised name).
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const read = async (p) => JSON.parse(await readFile(resolve(root, p), "utf8"));

const titleCase = (s) =>
  String(s).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/** A loose key so a precinct name matches between the geo file and the BOE
 *  report: uppercase, TP->TWP, keep up to "<place> <ward>[-letter]", strip the
 *  rest (place nicknames, punctuation). */
function normKey(name) {
  let s = String(name)
    .toUpperCase()
    .replace(/#/g, "")
    .replace(/\bTP\b/g, "TWP")
    .replace(/\bTOWNSHIP\b/g, "TWP")
    .replace(/\bVIL\b/g, "VILLAGE");
  // keep up to "<place> <ward>" plus an attached "-A" style letter; drop any
  // trailing place nickname (" CRESTON", " DOY/TOWN", " W SALEM").
  s = s.replace(/^(.*?\d+(?:-?[A-Z])?)(?:\s+[A-Z/].*)?$/, "$1");
  return s.replace(/[^A-Z0-9]/g, "");
}

function normPrecinct(name) {
  return titleCase(name)
    .replace(/\bBrhills\b/gi, "Brunswick Hills")
    .replace(/\bHarrisvl\b/gi, "Harrisville")
    .replace(/\bChlk\b/gi, "Chippewa Lake")
    .replace(/\bTp\b/g, "Twp")
    .replace(/\bVil\b/g, "Village")
    .replace(/\bPk\b/g, "Park")
    .trim();
}

/** Municipality a precinct is in: its name minus the trailing ward code. */
function townOf(precinct) {
  let s = normPrecinct(precinct);
  s = s.replace(/^(.*\b(?:Twp|Township|City|Village)\s+\d+)\b.*$/, "$1");
  s = s
    .replace(/[\s-]+\d+(?:[\s-][A-Za-z])?$/, "")
    .replace(/\s+[A-Za-z]$/, "")
    .trim();
  return s || normPrecinct(precinct);
}

// ── which precincts are in district 7 (from the geo map) ───────────────────
const districts = await read("app/data/geo/OH.districts.json");
const d7 = districts["7"];
const inD7 = {}; // county fips -> Set(normKey)
for (const [fips, ids] of Object.entries(d7)) {
  const file = await read(`app/data/geo/precincts/OH/${fips}.json`);
  const nameById = new Map(file.precincts.map((p) => [p.id, p.name]));
  inD7[fips] = new Set(
    ids.map((i) => nameById.get(i)).filter(Boolean).map(normKey)
  );
}
const WAYNE_D7 = inD7["39169"]; // Wayne is the split county we filter

const pollingPlaces = [];

// ── Cuyahoga (from ArcGIS, already filtered to Congressio = 7) ─────────────
{
  const cuya = await read("scripts/data/oh7-cuyahoga-polling.json");
  const byId = new Map();
  for (const r of cuya.rows) {
    const key = `cuya:${r.poll_id}`;
    const pp = byId.get(key) ?? {
      id: key,
      name: titleCase(r.location),
      address: `${titleCase(r.address)}, ${r.city}`,
      town: r.city,
      county: "Cuyahoga",
      precincts: [],
    };
    pp.precincts.push(r.label);
    byId.set(key, pp);
  }
  pollingPlaces.push(...byId.values());
}

// ── Ashland (whole, as scraped) + Medina (whole) + Wayne (split) ──────────
{
  const src = await read("scripts/data/oh7-county-polling.json");
  const byLoc = new Map();
  for (const r of src.rows) {
    if (r.county === "Wayne" && !WAYNE_D7.has(normKey(r.precinct))) continue;
    const key = `${r.county.toLowerCase()}:${(r.location + r.address)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}`;
    const pp = byLoc.get(key) ?? {
      id: key,
      name: r.location,
      address: r.address,
      county: r.county,
      _towns: {},
      precincts: [],
    };
    const t = townOf(r.precinct);
    pp._towns[t] = (pp._towns[t] || 0) + 1;
    pp.precincts.push(normPrecinct(r.precinct));
    byLoc.set(key, pp);
  }
  for (const pp of byLoc.values()) {
    pp.town = Object.entries(pp._towns).sort((a, b) => b[1] - a[1])[0][0];
    delete pp._towns;
    pollingPlaces.push(pp);
  }
}

// ── assemble ──────────────────────────────────────────────────────────────
for (const pp of pollingPlaces)
  pp.precincts.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const townMap = new Map();
for (const pp of pollingPlaces) {
  const k = `${pp.county}|${pp.town}`;
  const t = townMap.get(k) ?? { town: pp.town, county: pp.county, pollingPlaces: [] };
  t.pollingPlaces.push(pp);
  townMap.set(k, t);
}

const towns = [...townMap.values()]
  .map((t) => ({
    town: t.town,
    county: t.county,
    pollingPlaces: t.pollingPlaces.sort((a, b) => a.name.localeCompare(b.name)),
  }))
  .sort(
    (a, b) => a.town.localeCompare(b.town) || a.county.localeCompare(b.county)
  );

const out = {
  district: "OH-7",
  generatedAt: new Date().toISOString().slice(0, 10),
  pollingPlaceCount: pollingPlaces.length,
  precinctCount: pollingPlaces.reduce((n, pp) => n + pp.precincts.length, 0),
  towns,
};

await writeFile(
  resolve(root, "app/data/oh7Precincts.generated.json"),
  JSON.stringify(out, null, 1) + "\n"
);
console.log(
  `wrote ${towns.length} towns, ${out.pollingPlaceCount} polling places, ${out.precinctCount} precincts`
);
