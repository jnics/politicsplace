#!/usr/bin/env node
/**
 * Work out which precincts make up each congressional district and write the
 * assignment to a lazy sidecar file:
 *
 *   app/data/geo/<USPS>.districts.json
 *   { "<districtId>": { "<countyFips5>": ["<vtdId>", ...], ... }, ... }
 *
 *   node scripts/assign-precincts-to-districts.mjs OH
 *
 * A precinct is assigned to the district whose polygon contains its centroid
 * (all geometry is already in the same per-state projection). Whole counties
 * overlap several districts, so the district map can now show only the precincts
 * actually inside a district instead of every county it clips. Kept out of
 * <USPS>.json so the base zoom stays small; loaded when a district is opened.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const usps = (process.argv[2] || "OH").toUpperCase();

function pathPoints(d) {
  const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const pts = [];
  for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
  return pts;
}
function centroid(pts) {
  let x = 0, y = 0;
  for (const [px, py] of pts) {
    x += px;
    y += py;
  }
  return [x / pts.length, y / pts.length];
}
function pointInPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (
      yi > pt[1] !== yj > pt[1] &&
      pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}
function bbox(poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

const geoPath = resolve(__dirname, `../app/data/geo/${usps}.json`);
const geo = JSON.parse(readFileSync(geoPath, "utf8"));
if (!geo.districts?.length) {
  console.error(`${usps}.json has no districts`);
  process.exit(1);
}

const districts = geo.districts.map((d) => {
  const poly = pathPoints(d.d);
  return { id: d.id, poly, box: bbox(poly), precincts: {} };
});

const dir = resolve(__dirname, `../app/data/geo/precincts/${usps}`);
let assigned = 0;
let orphan = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const county = JSON.parse(readFileSync(resolve(dir, file), "utf8"));
  for (const p of county.precincts) {
    const c = centroid(pathPoints(p.d));
    let hit = districts.find(
      (d) =>
        c[0] >= d.box.x0 &&
        c[0] <= d.box.x1 &&
        c[1] >= d.box.y0 &&
        c[1] <= d.box.y1 &&
        pointInPoly(c, d.poly)
    );
    if (!hit) {
      // centroid landed outside every district (sliver precinct on a border) —
      // give it to the nearest district centre.
      let best = Infinity;
      for (const d of districts) {
        const dc = centroid(d.poly);
        const dist = (dc[0] - c[0]) ** 2 + (dc[1] - c[1]) ** 2;
        if (dist < best) {
          best = dist;
          hit = d;
        }
      }
      orphan += 1;
    }
    (hit.precincts[county.countyFips] ??= []).push(p.id);
    assigned += 1;
  }
}

const out = {};
for (const d of districts) {
  out[d.id] = Object.fromEntries(
    Object.entries(d.precincts)
      .sort()
      .map(([k, v]) => [k, v.sort()])
  );
}

const outPath = resolve(__dirname, `../app/data/geo/${usps}.districts.json`);
writeFileSync(outPath, JSON.stringify(out));
const summary = geo.districts.map((d) => {
  const counts = Object.entries(out[d.id]).map(
    ([c, ids]) => `${c}:${ids.length}`
  );
  return `${d.label}: ${counts.join(" ")}`;
});
console.log(summary.join("\n"));
console.log(`\nassigned ${assigned} precincts (${orphan} snapped to nearest district)`);
