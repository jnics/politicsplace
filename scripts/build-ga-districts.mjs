#!/usr/bin/env node
/**
 * Georgia U.S. House district results on the current (2024/2026) lines:
 *
 *   - districtHouse.generated.json  GA block — 2024 U.S. House vote by district,
 *     straight from the OpenElections precinct file's `district` column (2024
 *     ran on the current 14-seat court map). 2022 used a different map, so it is
 *     left out (no like-for-line without 2022 precinct geometry).
 *   - districtResults.generated.json GA block — president + senate by district:
 *       2020 pres + senate (regular)  — VEST 2020 precinct shapes → current CD
 *       2016 pres / 2016 sen / 2022 sen / 2024 pres — county results allocated to
 *       each county's districts by 2020 VTD population
 *
 *   node scripts/build-ga-districts.mjs <ga-dir>
 *
 * <ga-dir> holds gp2024.csv (OpenElections 20241105__ga__general__precinct-level)
 * and ga_2020.{shp,dbf}.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const SRC = process.argv[2];
if (!SRC) throw new Error("usage: build-ga-districts.mjs <ga-dir>");

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
  "2016-senate": { R: "Isakson", D: "Barksdale" },
  "2020-senate": { R: "Perdue", D: "Ossoff" },
  "2022-senate": { R: "Walker", D: "Warnock" },
};
const shape = (t) => {
  const tot = t.d + t.r;
  const dPct = Math.round((t.d / tot) * 1000) / 10;
  const rPct = Math.round((t.r / tot) * 1000) / 10;
  return { winner: dPct >= rPct ? "D" : "R", dPct, rPct, marginPct: Math.round(Math.abs(dPct - rPct) * 10) / 10 };
};
const dside = (p) => {
  const s = String(p).toUpperCase().replace(/[^A-Z]/g, "");
  return s.startsWith("DEM") ? "d" : s.startsWith("REP") ? "r" : null;
};

async function main() {
  const { read } = await import("shapefile");

  const dj = JSON.parse(readFileSync(resolve(root, "app/data/geo/GA.districts.json"), "utf8"));
  const vtdToCd = new Map();
  for (const [cd, byFips] of Object.entries(dj))
    for (const [fips, ids] of Object.entries(byFips))
      for (const id of ids) vtdToCd.set(`${fips}:${id}`, Number(cd));
  const vtdPop = new Map();
  for (const f of readdirSync(resolve(root, "app/data/geo/precincts/GA"))) {
    const g = JSON.parse(readFileSync(resolve(root, "app/data/geo/precincts/GA", f), "utf8"));
    for (const p of g.precincts) vtdPop.set(`${g.countyFips}:${p.id}`, p.pop || 0);
  }

  // ── 2024 House: precinct file `district` column ────────────────────────
  const houseByYear = {};
  {
    const rows = parseCSV(readFileSync(resolve(SRC, "gp2024.csv"), "utf8"));
    const h = rows[0].map((s) => s.toLowerCase().trim());
    const iO = h.indexOf("office"), iD = h.indexOf("district"),
      iPa = h.indexOf("party"), iV = h.indexOf("total_votes");
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if ((r[iO] || "").trim() !== "U.S. House") continue;
      const cd = parseInt(r[iD], 10);
      const s = dside(r[iPa]);
      if (!cd || !s) continue;
      ((houseByYear[cd] ||= {})["2024"] ||= { d: 0, r: 0 })[s] += parseInt((r[iV] || "").replace(/,/g, ""), 10) || 0;
    }
  }

  // ── 2020 pres + senate: VEST geometry ────────────────────────────────
  const vest = (await read(readFileSync(resolve(SRC, "ga_2020.shp")), readFileSync(resolve(SRC, "ga_2020.dbf")))).features
    .filter((f) => f.geometry)
    .map((f) => ({
      c: centroid(f.geometry),
      p: { d: +f.properties.G20PREDBID || 0, r: +f.properties.G20PRERTRU || 0 },
      s: { d: +f.properties.G20USSDOSS || 0, r: +f.properties.G20USSRPER || 0 },
    }));
  const url =
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer/58/query?" +
    new URLSearchParams({
      where: "STATE='13'", outFields: "VTD,COUNTY", returnGeometry: "true",
      geometryPrecision: "6", maxAllowableOffset: "0.0005", outSR: "4326", f: "geojson",
    });
  console.error("fetching Census VTD polygons…");
  const vtds = (await (await fetch(url)).json()).features
    .map((f) => ({ cd: vtdToCd.get(`13${f.properties.COUNTY}:${f.properties.VTD}`), geom: f.geometry, bbox: bbox(f.geometry) }))
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

  // ── county → CD by VTD population, for the rest ──────────────────────
  const county = JSON.parse(readFileSync(resolve(root, "app/data/countyResults.generated.json"), "utf8"));
  const share = {};
  for (const [key, cd] of vtdToCd) {
    const [fips] = key.split(":");
    (share[fips] ||= {})[cd] = (share[fips][cd] || 0) + (vtdPop.get(key) || 0);
  }
  for (const rk of ["2016-president", "2016-senate", "2022-senate", "2024-president"]) {
    const block = county[rk];
    if (!block) continue;
    for (const [fips, res] of Object.entries(block)) {
      if (!fips.startsWith("13") || res.dVotes == null) continue;
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

  const drPath = resolve(root, "app/data/districtResults.generated.json");
  let dr = {};
  try { dr = JSON.parse(readFileSync(drPath, "utf8")); } catch {}
  dr.GA = {};
  for (const [cd, races] of Object.entries(stateRaces)) {
    dr.GA[cd] = {};
    for (const [rk, t] of Object.entries(races)) {
      if (!t.d && !t.r) continue;
      const s = shape(t);
      dr.GA[cd][rk] = { winner: s.winner, dPct: s.dPct, rPct: s.rPct, who: WHO[rk]?.[s.winner] };
    }
  }
  writeFileSync(drPath, JSON.stringify(dr, null, 1) + "\n");

  const dhPath = resolve(root, "app/data/districtHouse.generated.json");
  const dh = JSON.parse(readFileSync(dhPath, "utf8"));
  dh.GA = {};
  for (const [cd, byYear] of Object.entries(houseByYear)) {
    dh.GA[cd] = {};
    for (const [yr, t] of Object.entries(byYear)) if (t.d || t.r) dh.GA[cd][yr] = shape(t);
  }
  writeFileSync(dhPath, JSON.stringify(dh, null, 1) + "\n");

  console.error("wrote GA -> districtResults.generated.json + districtHouse.generated.json");
  for (let cd = 1; cd <= 14; cd++) {
    const hh = dh.GA[cd]?.["2024"], p = dr.GA[cd]?.["2024-president"];
    console.error(`  GA-${cd}: 2024 House ${hh ? hh.winner + "+" + hh.marginPct : "?"}  2024 pres ${p ? p.winner + "+" + Math.abs(p.rPct - p.dPct).toFixed(1) : "?"}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
