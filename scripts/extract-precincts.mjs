#!/usr/bin/env node
/**
 * Pull one state's voting precincts (Census 2020 "voting districts" / VTDs),
 * project them with the SAME per-state Mercator the county/district geometry
 * uses, and write one small file per county:
 *
 *   app/data/geo/precincts/<USPS>/<countyFips3>.json
 *   { countyFips, viewBox, precincts: [{ id, name, pop, d }] }
 *
 *   node scripts/extract-precincts.mjs OH
 *
 * Precinct geometry only. Run scripts/join-precinct-results.mjs afterwards to
 * add per-precinct vote counts (`pr: [d, r, other]`) from VEST.
 */
import { writeFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const topo = require("us-atlas/counties-10m.json");

const FIPS = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09", DE: "10",
  DC: "11", FL: "12", GA: "13", HI: "15", ID: "16", IL: "17", IN: "18", IA: "19",
  KS: "20", KY: "21", LA: "22", ME: "23", MD: "24", MA: "25", MI: "26", MN: "27",
  MS: "28", MO: "29", MT: "30", NE: "31", NV: "32", NH: "33", NJ: "34", NM: "35",
  NY: "36", NC: "37", ND: "38", OH: "39", OK: "40", OR: "41", PA: "42", RI: "44",
  SC: "45", SD: "46", TN: "47", TX: "48", UT: "49", VT: "50", VA: "51", WA: "53",
  WV: "54", WI: "55", WY: "56",
};

const usps = (process.argv[2] || "OH").toUpperCase();
const fips = FIPS[usps];
if (!fips) {
  console.error(`Unknown state ${usps}`);
  process.exit(1);
}

/** Reverse every ring (ArcGIS winds the way d3-geo reads as "outside"). */
function reverseRings(geom) {
  const rev = (r) => [...r].reverse();
  if (geom.type === "Polygon") return { ...geom, coordinates: geom.coordinates.map(rev) };
  if (geom.type === "MultiPolygon")
    return { ...geom, coordinates: geom.coordinates.map((p) => p.map(rev)) };
  return geom;
}

// Same per-state projection as scripts/extract-county-geo.mjs: geoMercator
// fitted to a fixed width over this state's counties.
const stateCounties = {
  type: "FeatureCollection",
  features: feature(topo, topo.objects.counties).features.filter(
    (f) => String(f.id).padStart(5, "0").slice(0, 2) === fips
  ),
};
const projection = geoMercator();
projection.fitWidth(800 - 16, stateCounties);
const path = geoPath(projection);

function viewBoxOf(ds) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const d of ds) {
    const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    for (let i = 0; i + 1 < n.length; i += 2) {
      x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]);
      y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]);
    }
  }
  const p = 4;
  return [x0 - p, y0 - p, x1 - x0 + 2 * p, y1 - y0 + 2 * p]
    .map((v) => +v.toFixed(1))
    .join(" ");
}

async function main() {
  const url =
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer/58/query?" +
    new URLSearchParams({
      where: `STATE='${fips}'`,
      outFields: "BASENAME,VTD,COUNTY,POP100",
      returnGeometry: "true",
      geometryPrecision: "4",
      maxAllowableOffset: "0.0006", // ~65 m
      outSR: "4326",
      f: "geojson",
    });
  console.log("fetching precincts (this is a big request)…");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Census API ${res.status}`);
  const fc = await res.json();
  console.log(`  ${fc.features.length} precincts`);

  const byCounty = new Map();
  for (const f of fc.features) {
    const county = f.properties.COUNTY; // 3-digit
    const list = byCounty.get(county) ?? [];
    list.push({
      id: f.properties.VTD,
      name: f.properties.BASENAME,
      pop: f.properties.POP100 ?? undefined,
      d: path(reverseRings(f.geometry)),
    });
    byCounty.set(county, list);
  }

  const dir = resolve(__dirname, `../app/data/geo/precincts/${usps}`);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  let total = 0;
  for (const [county, precincts] of byCounty) {
    precincts.sort((a, b) => a.name.localeCompare(b.name));
    const out = {
      countyFips: fips + county,
      viewBox: viewBoxOf(precincts.map((p) => p.d)),
      precincts,
    };
    await writeFile(resolve(dir, `${fips}${county}.json`), JSON.stringify(out));
    total += precincts.length;
  }
  console.log(
    `wrote ${byCounty.size} county files (${total} precincts) -> ${dir}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
