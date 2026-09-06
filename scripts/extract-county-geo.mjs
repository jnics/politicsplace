#!/usr/bin/env node
/**
 * Slice one state's county geometry out of us-atlas and write a small,
 * pre-projected GeoJSON file the app can import directly.
 *
 *   node scripts/extract-county-geo.mjs OH        # by USPS code
 *   node scripts/extract-county-geo.mjs 39        # or by state FIPS
 *
 * Output: app/data/geo/<USPS>.json
 *   { fips, usps, name, viewBox: "x y w h",
 *     counties: FeatureCollection,   // each feature id = 5-digit county FIPS
 *     borders:  MultiLineString,     // interior county borders (for thin strokes)
 *     outline:  Feature }            // the state's outer boundary
 *
 * us-atlas' *-albers-10m files are already projected to a ~975x610 plane, so the
 * app renders them with an identity projection and just sets the SVG viewBox to
 * the state's bounds.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { geoPath } from "d3-geo";
import { feature, mesh, merge } from "topojson-client";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const counties = require("us-atlas/counties-albers-10m.json");
const states = require("us-atlas/states-albers-10m.json");

// USPS <-> FIPS (50 states + DC).
const FIPS = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09", DE: "10",
  DC: "11", FL: "12", GA: "13", HI: "15", ID: "16", IL: "17", IN: "18", IA: "19",
  KS: "20", KY: "21", LA: "22", ME: "23", MD: "24", MA: "25", MI: "26", MN: "27",
  MS: "28", MO: "29", MT: "30", NE: "31", NV: "32", NH: "33", NJ: "34", NM: "35",
  NY: "36", NC: "37", ND: "38", OH: "39", OK: "40", OR: "41", PA: "42", RI: "44",
  SC: "45", SD: "46", TN: "47", TX: "48", UT: "49", VT: "50", VA: "51", WA: "53",
  WV: "54", WI: "55", WY: "56",
};
const FIPS_TO_USPS = Object.fromEntries(Object.entries(FIPS).map(([k, v]) => [v, k]));

const arg = (process.argv[2] || "OH").toUpperCase();
const fips = FIPS[arg] ?? (arg.length === 2 && /\d/.test(arg) ? arg : null);
if (!fips || !FIPS_TO_USPS[fips]) {
  console.error(`Unknown state: ${arg}. Pass a USPS code (OH) or FIPS (39).`);
  process.exit(1);
}
const usps = FIPS_TO_USPS[fips];

const stateName =
  states.objects.states.geometries.find((g) => g.id === fips)?.properties.name ?? usps;

// County features for this state (5-digit id, first two digits = state FIPS).
const allCounties = feature(counties, counties.objects.counties);
const stateCounties = {
  type: "FeatureCollection",
  features: allCounties.features.filter(
    (f) => String(f.id).padStart(5, "0").slice(0, 2) === fips
  ),
};
if (stateCounties.features.length === 0) {
  console.error(`No counties found for ${usps} (${fips}).`);
  process.exit(1);
}

// Interior borders between this state's counties (thin lines, no double-drawing).
const idSet = new Set(stateCounties.features.map((f) => String(f.id).padStart(5, "0")));
const borders = mesh(
  counties,
  counties.objects.counties,
  (a, b) =>
    a !== b &&
    idSet.has(String(a.id).padStart(5, "0")) &&
    idSet.has(String(b.id).padStart(5, "0"))
);

// State outline = union of its counties.
const outlineGeom = merge(
  counties,
  counties.objects.counties.geometries.filter((g) =>
    idSet.has(String(g.id).padStart(5, "0"))
  )
);
const outline = { type: "Feature", properties: { name: stateName }, geometry: outlineGeom };

// viewBox from the projected bounds, with a little padding.
const path = geoPath(); // identity projection (data is pre-projected)
const [[x0, y0], [x1, y1]] = path.bounds(stateCounties);
const pad = Math.max(x1 - x0, y1 - y0) * 0.03;
const viewBox = [
  +(x0 - pad).toFixed(1),
  +(y0 - pad).toFixed(1),
  +(x1 - x0 + pad * 2).toFixed(1),
  +(y1 - y0 + pad * 2).toFixed(1),
].join(" ");

const out = {
  fips,
  usps,
  name: stateName,
  viewBox,
  counties: stateCounties,
  borders,
  outline,
};

const dir = resolve(__dirname, "../app/data/geo");
await mkdir(dir, { recursive: true });
const file = resolve(dir, `${usps}.json`);
await writeFile(file, JSON.stringify(out));
console.log(
  `Wrote ${stateCounties.features.length} ${stateName} counties -> ${file} (viewBox "${viewBox}")`
);
