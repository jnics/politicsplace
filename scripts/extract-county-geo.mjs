#!/usr/bin/env node
/**
 * Slice one state's county geometry out of us-atlas, reproject it upright, and
 * write a small file the app renders directly.
 *
 *   node scripts/extract-county-geo.mjs OH        # by USPS code
 *   node scripts/extract-county-geo.mjs 39        # or by state FIPS
 *
 * Output: app/data/geo/<USPS>.json
 *   { fips, usps, name, viewBox,
 *     counties: [{ fips, name, d }],   // d = SVG path, 5-digit county FIPS
 *     bordersD,                        // interior county borders
 *     outlineD,                        // the state's outer boundary
 *     districts: [{ id, label, d }] }  // 119th-Congress districts (Census)
 *
 * us-atlas' counties-10m.json is in lon/lat; we project each state on its own
 * geoMercator fitted to a fixed width, so it renders straight (not tilted the
 * way it is inside the national Albers-USA projection). Congressional-district
 * geometry comes from the Census TIGERweb GeoJSON API and is projected the same
 * way so it lines up with the counties.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { geoMercator, geoPath } from "d3-geo";
import { feature, mesh, merge } from "topojson-client";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const topo = require("us-atlas/counties-10m.json");
const statesTopo = require("us-atlas/states-10m.json");

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
  statesTopo.objects.states.geometries.find((g) => g.id === fips)?.properties.name ??
  usps;

const allCounties = feature(topo, topo.objects.counties);
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

const idSet = new Set(stateCounties.features.map((f) => String(f.id).padStart(5, "0")));
const bordersMesh = mesh(
  topo,
  topo.objects.counties,
  (a, b) =>
    a !== b &&
    idSet.has(String(a.id).padStart(5, "0")) &&
    idSet.has(String(b.id).padStart(5, "0"))
);
const outlineGeom = merge(
  topo,
  topo.objects.counties.geometries.filter((g) =>
    idSet.has(String(g.id).padStart(5, "0"))
  )
);

// Upright per-state projection, fitted to a fixed width.
const W = 800;
const PAD = 8;
const projection = geoMercator();
projection.fitWidth(W - PAD * 2, stateCounties);
const path = geoPath(projection);

/** Reverse every ring of a Polygon/MultiPolygon geometry (winding fix). */
function reverseRings(geom) {
  const rev = (ring) => [...ring].reverse();
  if (geom.type === "Polygon") {
    return { ...geom, coordinates: geom.coordinates.map(rev) };
  }
  if (geom.type === "MultiPolygon") {
    return {
      ...geom,
      coordinates: geom.coordinates.map((poly) => poly.map(rev)),
    };
  }
  return geom;
}

// 119th-Congress district geometry from the Census TIGERweb GeoJSON API,
// projected through the same `path` so it aligns with the counties.
async function fetchDistricts() {
  const url =
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/4/query?" +
    new URLSearchParams({
      where: `STATE='${fips}'`,
      outFields: "BASENAME,NAME,GEOID",
      returnGeometry: "true",
      geometryPrecision: "3",
      maxAllowableOffset: "0.008", // ~0.9 km Douglas-Peucker, plenty for a state view
      outSR: "4326",
      f: "geojson",
    });
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const fc = await res.json();
    return (fc.features ?? [])
      .map((f) => ({
        id: f.properties.BASENAME,
        label: f.properties.NAME,
        // ArcGIS winds rings the way d3-geo reads as "everything outside", which
        // paints a giant bounding rectangle. Reversing each ring fixes it.
        d: path(reverseRings(f.geometry)),
      }))
      .filter((d) => d.d)
      .sort((a, b) => Number(a.id) - Number(b.id) || a.id.localeCompare(b.id));
  } catch (err) {
    console.warn(`  (skipping districts: ${err.message})`);
    return [];
  }
}

const districts = await fetchDistricts();

const countyShapes = stateCounties.features.map((f) => ({
  fips: String(f.id).padStart(5, "0"),
  name: f.properties.name,
  d: path(f),
}));
const bordersD = path(bordersMesh) ?? "";
const outlineD = path(outlineGeom) ?? "";

// viewBox from the land area (counties). Congressional districts can extend a
// little past this into open water (Census includes lake jurisdiction); that
// sliver clips harmlessly rather than adding a big empty band to every view.
let minX = Infinity;
let minY = Infinity;
let maxX = -Infinity;
let maxY = -Infinity;
for (const d of [...countyShapes.map((c) => c.d), outlineD]) {
  const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  for (let i = 0; i + 1 < nums.length; i += 2) {
    minX = Math.min(minX, nums[i]);
    maxX = Math.max(maxX, nums[i]);
    minY = Math.min(minY, nums[i + 1]);
    maxY = Math.max(maxY, nums[i + 1]);
  }
}
const viewBox = [
  +(minX - PAD).toFixed(1),
  +(minY - PAD).toFixed(1),
  +(maxX - minX + PAD * 2).toFixed(1),
  +(maxY - minY + PAD * 2).toFixed(1),
].join(" ");

const out = {
  fips,
  usps,
  name: stateName,
  viewBox,
  counties: countyShapes,
  bordersD,
  outlineD,
  districts,
};

const dir = resolve(__dirname, "../app/data/geo");
await mkdir(dir, { recursive: true });
const file = resolve(dir, `${usps}.json`);
await writeFile(file, JSON.stringify(out));
console.log(
  `Wrote ${out.counties.length} ${stateName} counties + ${districts.length} districts -> ${file}`
);
