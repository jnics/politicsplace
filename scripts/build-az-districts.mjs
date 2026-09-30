#!/usr/bin/env node
/**
 * Arizona U.S. House district results on the current (2022/2026) lines:
 *
 *   - districtHouse.generated.json  AZ block — 2022 + 2024 U.S. House vote by
 *     district, from MEDSL's `district` column (both cycles on the current
 *     9-seat map). MEDSL AZ mixes component modes and TOTAL by county, so per
 *     (district,county) we prefer the component sum and fall back to TOTAL.
 *   - districtResults.generated.json AZ block — president + senate by district:
 *       2020 pres + 2020 special senate — VEST 2020 precinct shapes → current CD
 *       2016 pres / 2016 sen / 2018 sen / 2022 sen / 2024 pres / 2024 sen
 *                                       — county results allocated by 2020 VTD pop
 *
 *   node scripts/build-az-districts.mjs <az-dir>
 *
 * <az-dir> holds AZ-cleaned.csv, az24.csv, az_2020.{shp,dbf}.
 */
import { readFileSync, writeFileSync, readdirSync, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const SRC = process.argv[2];
if (!SRC) throw new Error("usage: build-az-districts.mjs <az-dir>");

const splitLine = (l) => {
  const out = [];
  let cur = "", q = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (q) { if (c === '"') { if (l[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
};
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
const COMPONENT = /^(ELECTION DAY|EARLY VOTING|LATE EARLY|PROVISIONAL|LATE VOTES|ABSENTEE|MAIL|ADVANCE)/;

const WHO = {
  "2016-president": { R: "Trump", D: "Clinton" },
  "2020-president": { R: "Trump", D: "Biden" },
  "2024-president": { R: "Trump", D: "Harris" },
  "2016-senate": { R: "McCain", D: "Kirkpatrick" },
  "2018-senate": { R: "McSally", D: "Sinema" },
  "2020-senate": { R: "McSally", D: "Kelly" },
  "2022-senate": { R: "Masters", D: "Kelly" },
  "2024-senate": { R: "Lake", D: "Gallego" },
};
const shape = (t) => {
  const tot = t.d + t.r;
  const dPct = Math.round((t.d / tot) * 1000) / 10;
  const rPct = Math.round((t.r / tot) * 1000) / 10;
  return { winner: dPct >= rPct ? "D" : "R", dPct, rPct, marginPct: Math.round(Math.abs(dPct - rPct) * 10) / 10 };
};

async function main() {
  const { read } = await import("shapefile");

  const dj = JSON.parse(readFileSync(resolve(root, "app/data/geo/AZ.districts.json"), "utf8"));
  const vtdToCd = new Map();
  for (const [cd, byFips] of Object.entries(dj))
    for (const [fips, ids] of Object.entries(byFips))
      for (const id of ids) vtdToCd.set(`${fips}:${id}`, Number(cd));
  const vtdPop = new Map();
  for (const f of readdirSync(resolve(root, "app/data/geo/precincts/AZ"))) {
    const g = JSON.parse(readFileSync(resolve(root, "app/data/geo/precincts/AZ", f), "utf8"));
    for (const p of g.precincts) vtdPop.set(`${g.countyFips}:${p.id}`, p.pop || 0);
  }

  // ── House 2022 + 2024: MEDSL `district` column ────────────────────────
  // MEDSL AZ sometimes puts the party on a TOTAL row and leaves it blank on the
  // component rows that carry the votes. So: pass 1 learns candidate -> party
  // from any labelled row; pass 2 classifies every row by candidate name and,
  // per (district,county), prefers the component sum, falling back to TOTAL.
  const houseByYear = {};
  for (const [year, file] of [["2022", "AZ-cleaned.csv"], ["2024", "az24.csv"]]) {
    const candParty = new Map(); // upper candidate name -> "d" | "r"
    for (let pass = 1; pass <= 2; pass++) {
      const comp = {}, total = {};
      const rl = createInterface({ input: createReadStream(resolve(SRC, file)) });
      let idx = null;
      for await (const line of rl) {
        if (!idx) {
          const h = splitLine(line).map((s) => s.toLowerCase().trim());
          idx = { o: h.indexOf("office"), ps: h.indexOf("party_simplified"), c: h.indexOf("candidate"), m: h.indexOf("mode"), v: h.indexOf("votes"), f: h.indexOf("county_fips"), d: h.indexOf("district") };
          continue;
        }
        const r = splitLine(line);
        if (r[idx.o] !== "US HOUSE") continue;
        const cand = (r[idx.c] || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (pass === 1) {
          if (r[idx.ps] === "DEMOCRAT") candParty.set(cand, "d");
          else if (r[idx.ps] === "REPUBLICAN") candParty.set(cand, "r");
          continue;
        }
        const cd = parseInt(r[idx.d], 10);
        const fips = String(r[idx.f]).padStart(5, "0");
        const s = candParty.get(cand);
        if (!cd || !fips.startsWith("04") || !s) continue;
        const mode = r[idx.m];
        const bag = mode === "TOTAL" ? total : COMPONENT.test(mode) ? comp : null;
        if (!bag) continue;
        const k = `${cd}:${fips}`;
        (bag[k] ||= { d: 0, r: 0 })[s] += parseInt(r[idx.v], 10) || 0;
      }
      if (pass === 2) {
        for (const k of new Set([...Object.keys(comp), ...Object.keys(total)])) {
          const t = comp[k] ?? total[k];
          const cd = Number(k.split(":")[0]);
          const b = ((houseByYear[cd] ||= {})[year] ||= { d: 0, r: 0 });
          b.d += t.d; b.r += t.r;
        }
      }
    }
  }

  // ── 2020 pres + special senate: VEST geometry ────────────────────────
  const vest = (await read(readFileSync(resolve(SRC, "az_2020.shp")), readFileSync(resolve(SRC, "az_2020.dbf")))).features
    .filter((f) => f.geometry)
    .map((f) => ({
      c: centroid(f.geometry),
      p: { d: +f.properties.G20PREDBID || 0, r: +f.properties.G20PRERTRU || 0 },
      s: { d: +f.properties.G20USSDKEL || 0, r: +f.properties.G20USSRMCS || 0 },
    }));
  const url =
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer/58/query?" +
    new URLSearchParams({
      where: "STATE='04'", outFields: "VTD,COUNTY", returnGeometry: "true",
      geometryPrecision: "6", maxAllowableOffset: "0.0005", outSR: "4326", f: "geojson",
    });
  console.error("fetching Census VTD polygons…");
  const vtds = (await (await fetch(url)).json()).features
    .map((f) => ({ cd: vtdToCd.get(`04${f.properties.COUNTY}:${f.properties.VTD}`), geom: f.geometry, bbox: bbox(f.geometry) }))
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

  // 2016/2018/2022/2024 pres+senate BY DISTRICT are deliberately omitted for AZ:
  // Maricopa spans 8 of the 9 districts, so allocating its county total by
  // population smears a D+2 county evenly and turns the safe-D Phoenix seats
  // into tossups. Only 2020 (real precinct geometry, via VEST) is kept; the
  // DistrictTip falls back to the 2020 lean + the 2022/2024 House vote.
  void vtdPop;

  const drPath = resolve(root, "app/data/districtResults.generated.json");
  let dr = {};
  try { dr = JSON.parse(readFileSync(drPath, "utf8")); } catch {}
  dr.AZ = {};
  for (const [cd, races] of Object.entries(stateRaces)) {
    dr.AZ[cd] = {};
    for (const [rk, t] of Object.entries(races)) {
      if (!t.d && !t.r) continue;
      const s = shape(t);
      dr.AZ[cd][rk] = { winner: s.winner, dPct: s.dPct, rPct: s.rPct, who: WHO[rk]?.[s.winner] };
    }
  }
  writeFileSync(drPath, JSON.stringify(dr, null, 1) + "\n");

  const dhPath = resolve(root, "app/data/districtHouse.generated.json");
  const dh = JSON.parse(readFileSync(dhPath, "utf8"));
  dh.AZ = {};
  for (const [cd, byYear] of Object.entries(houseByYear)) {
    dh.AZ[cd] = {};
    for (const [yr, t] of Object.entries(byYear)) if (t.d || t.r) dh.AZ[cd][yr] = shape(t);
  }
  writeFileSync(dhPath, JSON.stringify(dh, null, 1) + "\n");

  console.error("wrote AZ -> districtResults.generated.json + districtHouse.generated.json");
  for (let cd = 1; cd <= 9; cd++) {
    const hh = dh.AZ[cd]?.["2024"], p = dr.AZ[cd]?.["2024-president"];
    console.error(`  AZ-${cd}: 2024 House ${hh ? hh.winner + "+" + hh.marginPct : "?"}  2024 pres ${p ? p.winner + "+" + Math.abs(p.rPct - p.dPct).toFixed(1) : "?"}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
