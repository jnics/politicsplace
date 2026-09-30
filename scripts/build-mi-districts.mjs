#!/usr/bin/env node
/**
 * Michigan U.S. House district results on the current (2022/2026) lines:
 *
 *   - districtHouse.generated.json  MI block — U.S. House vote by district by
 *     year. 2022 + 2024 straight from MEDSL's `district` column (those cycles
 *     ran on the current 13-seat map). 2020's 14-seat map has no like-for-line.
 *   - districtResults.generated.json MI block — president + senate by district
 *     for the DistrictTip history list:
 *       2020 pres + senate  — VEST 2020 precinct shapes, geometry to current CD
 *       2016 pres / 2018 sen / 2024 pres + sen — county results allocated to the
 *       districts each county overlaps, by 2020 VTD population.
 *
 *   node scripts/build-mi-districts.mjs <mi-dir>
 *
 * <mi-dir> holds mi22_cleaned.csv, mi24.csv, mi_2020.{shp,dbf} (see
 * scripts/build-mi-county-results.mjs for where each comes from).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const SRC = process.argv[2];
if (!SRC) throw new Error("usage: build-mi-districts.mjs <mi-dir>");

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
function inRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inFeature(pt, geom) {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  for (const poly of polys) {
    if (!inRing(pt, poly[0])) continue;
    if (poly.slice(1).some((h) => inRing(pt, h))) continue;
    return true;
  }
  return false;
}
const bbox = (geom) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  for (const poly of polys) for (const [x, y] of poly[0]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
};
const centroid = (geom) => {
  const ring = geom.type === "Polygon" ? geom.coordinates[0] : geom.coordinates[0][0];
  let cx = 0, cy = 0;
  for (const [x, y] of ring) { cx += x; cy += y; }
  return [cx / ring.length, cy / ring.length];
};

const WHO = {
  "2016-president": { R: "Trump", D: "Clinton" },
  "2020-president": { R: "Trump", D: "Biden" },
  "2024-president": { R: "Trump", D: "Harris" },
  "2018-senate": { R: "James", D: "Stabenow" },
  "2020-senate": { R: "James", D: "Peters" },
  "2024-senate": { R: "Rogers", D: "Slotkin" },
};
const shape = (t) => {
  const tot = t.d + t.r;
  const dPct = Math.round((t.d / tot) * 1000) / 10;
  const rPct = Math.round((t.r / tot) * 1000) / 10;
  return { winner: dPct >= rPct ? "D" : "R", dPct, rPct, marginPct: Math.round(Math.abs(dPct - rPct) * 10) / 10 };
};

async function main() {
  const { read } = await import("shapefile");

  // VTD -> current CD (+ VTD population), from the app's own assignment + geo.
  const dj = JSON.parse(readFileSync(resolve(root, "app/data/geo/MI.districts.json"), "utf8"));
  const vtdToCd = new Map();
  for (const [cd, byFips] of Object.entries(dj))
    for (const [fips, ids] of Object.entries(byFips))
      for (const id of ids) vtdToCd.set(`${fips}:${id}`, Number(cd));
  const vtdPop = new Map();
  const { readdirSync } = await import("node:fs");
  for (const f of readdirSync(resolve(root, "app/data/geo/precincts/MI"))) {
    const g = JSON.parse(readFileSync(resolve(root, "app/data/geo/precincts/MI", f), "utf8"));
    for (const p of g.precincts) vtdPop.set(`${g.countyFips}:${p.id}`, p.pop || 0);
  }

  // ── House 2022 + 2024: MEDSL district column ───────────────────────────
  const houseByYear = {};
  for (const [year, file] of [["2022", "mi22_cleaned.csv"], ["2024", "mi24.csv"]]) {
    const rows = parseCSV(readFileSync(resolve(SRC, file), "utf8"));
    const h = rows[0].map((s) => s.toLowerCase().trim());
    const iO = h.indexOf("office"), iPS = h.indexOf("party_simplified"),
      iM = h.indexOf("mode"), iV = h.indexOf("votes"), iD = h.indexOf("district");
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (r[iO] !== "US HOUSE" || r[iM] !== "TOTAL") continue;
      const cd = parseInt(r[iD], 10);
      if (!cd) continue;
      const s = r[iPS] === "DEMOCRAT" ? "d" : r[iPS] === "REPUBLICAN" ? "r" : null;
      if (!s) continue;
      ((houseByYear[cd] ||= {})[year] ||= { d: 0, r: 0 })[s] += parseInt(r[iV], 10) || 0;
    }
  }

  // ── 2020 pres + senate: VEST geometry ─────────────────────────────────
  const zip = readFileSync(resolve(SRC, "mi_2020.shp"));
  const vest = (await read(zip, readFileSync(resolve(SRC, "mi_2020.dbf")))).features
    .filter((f) => f.geometry)
    .map((f) => ({
      c: centroid(f.geometry),
      p: {
        d: (+f.properties.G20PREDBID || 0), r: (+f.properties.G20PRERTRU || 0),
      },
      s: {
        d: (+f.properties.G20USSDPET || 0), r: (+f.properties.G20USSRJAM || 0),
      },
    }));
  const url =
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer/58/query?" +
    new URLSearchParams({
      where: "STATE='26'", outFields: "VTD,COUNTY", returnGeometry: "true",
      geometryPrecision: "6", maxAllowableOffset: "0.0005", outSR: "4326", f: "geojson",
    });
  console.error("fetching Census VTD polygons…");
  const vtds = (await (await fetch(url)).json()).features
    .map((f) => ({ cd: vtdToCd.get(`26${f.properties.COUNTY}:${f.properties.VTD}`), geom: f.geometry, bbox: bbox(f.geometry) }))
    .filter((v) => v.cd != null);
  const stateRaces = {};
  for (const vp of vest) {
    let cd = null;
    for (const v of vtds) {
      if (vp.c[0] < v.bbox[0] || vp.c[0] > v.bbox[2] || vp.c[1] < v.bbox[1] || vp.c[1] > v.bbox[3]) continue;
      if (inFeature(vp.c, v.geom)) { cd = v.cd; break; }
    }
    if (cd == null) continue;
    const b = (stateRaces[cd] ||= {});
    for (const [rk, votes] of [["2020-president", vp.p], ["2020-senate", vp.s]]) {
      (b[rk] ||= { d: 0, r: 0 }).d += votes.d;
      b[rk].r += votes.r;
    }
  }

  // ── 2016 pres / 2018 sen / 2024 pres+sen: county → CD by VTD population ─
  const county = JSON.parse(readFileSync(resolve(root, "app/data/countyResults.generated.json"), "utf8"));
  // CD population share of each county
  const share = {}; // fips -> cd -> pop
  for (const [key, cd] of vtdToCd) {
    const [fips] = key.split(":");
    (share[fips] ||= {})[cd] = (share[fips][cd] || 0) + (vtdPop.get(key) || 0);
  }
  for (const rk of ["2016-president", "2018-senate", "2024-president", "2024-senate"]) {
    const block = county[rk];
    if (!block) continue;
    for (const [fips, res] of Object.entries(block)) {
      if (!fips.startsWith("26") || res.dVotes == null) continue;
      const cds = share[fips];
      if (!cds) continue;
      const tot = Object.values(cds).reduce((s, x) => s + x, 0) || 1;
      for (const [cd, pop] of Object.entries(cds)) {
        const f = pop / tot;
        const b = (stateRaces[cd] ||= {});
        (b[rk] ||= { d: 0, r: 0 }).d += res.dVotes * f;
        b[rk].r += res.rVotes * f;
      }
    }
  }

  // ── write ────────────────────────────────────────────────────────────
  const drPath = resolve(root, "app/data/districtResults.generated.json");
  let dr = {};
  try { dr = JSON.parse(readFileSync(drPath, "utf8")); } catch {}
  dr.MI = {};
  for (const [cd, races] of Object.entries(stateRaces)) {
    dr.MI[cd] = {};
    for (const [rk, t] of Object.entries(races)) {
      if (!t.d && !t.r) continue;
      const s = shape(t);
      dr.MI[cd][rk] = { winner: s.winner, dPct: s.dPct, rPct: s.rPct, who: WHO[rk]?.[s.winner] };
    }
  }
  writeFileSync(drPath, JSON.stringify(dr, null, 1) + "\n");

  const dhPath = resolve(root, "app/data/districtHouse.generated.json");
  const dh = JSON.parse(readFileSync(dhPath, "utf8"));
  dh.MI = {};
  for (const [cd, byYear] of Object.entries(houseByYear)) {
    dh.MI[cd] = {};
    for (const [yr, t] of Object.entries(byYear)) if (t.d || t.r) dh.MI[cd][yr] = shape(t);
  }
  writeFileSync(dhPath, JSON.stringify(dh, null, 1) + "\n");

  console.error("wrote MI -> districtResults.generated.json + districtHouse.generated.json");
  for (let cd = 1; cd <= 13; cd++) {
    const h = dh.MI[cd]?.["2024"], p = dr.MI[cd]?.["2024-president"];
    console.error(`  MI-${cd}: 2024 House ${h ? h.winner + "+" + h.marginPct : "?"}  2024 pres ${p ? p.winner + "+" + Math.abs(p.rPct - p.dPct).toFixed(1) : "?"}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
