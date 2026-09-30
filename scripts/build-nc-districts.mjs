#!/usr/bin/env node
/**
 * North Carolina U.S. House district results on the CURRENT (2026) congressional
 * lines:
 *
 *   - districtResults.generated.json   president + senate by district
 *   - districtHouse.generated.json     U.S. House vote by district by year
 *
 *   node scripts/build-nc-districts.mjs <ncsbe-dir>
 *
 * <ncsbe-dir> holds, per election, the NCSBE precinct RESULTS export and its
 * matching NCSBE precinct SHAPEFILE (both from dl.ncsbe.gov, same agency, same
 * `PREC_ID` + `COUNTY_ID`):
 *
 *   results_pct_20161108.txt   Precincts / Precincts.{shp,dbf}   (SBE_PRECINCTS_20161004)
 *   results_pct_20201103.txt   SBE_PRECINCTS_20201018.{shp,dbf}
 *   results_pct_20221108.txt   SBE_PRECINCTS_20220831.{shp,dbf}
 *   results_pct_20241105.txt   SBE_PRECINCTS_20240723.{shp,dbf}
 *
 * Each NCSBE precinct polygon (EPSG:2264) is tied to the Census VTD that
 * contains its centroid, then to that VTD's current district from
 * NC.districts.json (built off TIGERweb layer 4 = 119th = NC's 2023 map, which
 * is also the 2026 map — layer 0's NC entry is a stale placeholder).
 * Result rows for a county's non-geographic pseudo-precincts (absentee /
 * one-stop / provisional / transfer) don't match a shape; their votes are
 * split across that county's districts in proportion to the matched vote.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const NCSBE = process.argv[2];
if (!NCSBE) throw new Error("usage: build-nc-districts.mjs <ncsbe-dir>");

const norm = (s) => String(s).toUpperCase().replace(/\s+/g, "").trim();

// County NAME -> 5-digit FIPS, straight from the extracted state geo. NC's
// Census county codes are historical, NOT alphabetical (McDowell 37111 sorts
// before Macon 37113), so a "37 + 2n-1" formula is wrong here — read the map.
const NC_GEO = JSON.parse(
  readFileSync(resolve(root, "app/data/geo/NC.json"), "utf8")
);
const fipsByName = new Map(
  NC_GEO.counties.map((c) => [norm(c.name), c.fips])
);

// ── ray-cast point-in-polygon ────────────────────────────────────────────
function inRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi)
      inside = !inside;
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
function bboxOf(geom) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  for (const poly of polys) for (const [x, y] of poly[0]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}
function centroid(geom) {
  const ring = geom.type === "Polygon" ? geom.coordinates[0] : geom.coordinates[0][0];
  let cx = 0, cy = 0;
  for (const [x, y] of ring) { cx += x; cy += y; }
  return [cx / ring.length, cy / ring.length];
}

const WHO = {
  "2016-president": { R: "Trump", D: "Clinton" },
  "2020-president": { R: "Trump", D: "Biden" },
  "2024-president": { R: "Trump", D: "Harris" },
  "2016-senate": { R: "Burr", D: "Ross" },
  "2020-senate": { R: "Tillis", D: "Cunningham" },
  "2022-senate": { R: "Budd", D: "Beasley" },
};
const YEARS = [
  ["2016", "results_pct_20161108.txt", "Precincts", { president: "US PRESIDENT", senate: "US SENATE" }],
  ["2020", "results_pct_20201103.txt", "SBE_PRECINCTS_20201018", { president: "US PRESIDENT", senate: "US SENATE" }],
  ["2022", "results_pct_20221108.txt", "SBE_PRECINCTS_20220831", { senate: "US SENATE" }],
  ["2024", "results_pct_20241105.txt", "SBE_PRECINCTS_20240723", { president: "US PRESIDENT" }],
];

async function main() {
  const { read } = await import("shapefile");

  // Census 2020 VTDs in EPSG:2264 — the same precinct set NC.districts.json
  // already assigns to a current district. NCSBE precinct -> VTD -> CD keeps the
  // district split identical to the app map's own.
  const url =
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer/58/query?" +
    new URLSearchParams({
      where: "STATE='37'", outFields: "VTD,COUNTY",
      returnGeometry: "true", geometryPrecision: "1",
      maxAllowableOffset: "20", outSR: "2264", f: "geojson",
    });
  console.error("fetching Census VTD polygons…");
  const dj = JSON.parse(readFileSync(resolve(root, "app/data/geo/NC.districts.json"), "utf8"));
  const vtdToCd = new Map(); // "<fips>:<vtdId>" -> cd
  for (const [cd, byFips] of Object.entries(dj))
    for (const [fips, ids] of Object.entries(byFips))
      for (const id of ids) vtdToCd.set(`${fips}:${id}`, Number(cd));

  const vtds = (await (await fetch(url)).json()).features
    .map((f) => ({
      cd: vtdToCd.get(`37${f.properties.COUNTY}:${f.properties.VTD}`),
      geom: f.geometry,
      bbox: bboxOf(f.geometry),
    }))
    .filter((v) => v.cd != null);
  console.error(`  ${vtds.length} VTDs with a district`);
  const cdOf = (pt) => {
    for (const v of vtds) {
      if (pt[0] < v.bbox[0] || pt[0] > v.bbox[2] || pt[1] < v.bbox[1] || pt[1] > v.bbox[3]) continue;
      if (inFeature(pt, v.geom)) return v.cd;
    }
    return null;
  };

  const stateRaces = {}; // cd -> raceKey -> {d,r}
  const houseByYear = {}; // cd -> year -> {d,r}
  const add = (bucket, side, v) => { bucket[side] += v; };

  for (const [year, resFile, shpBase, offices] of YEARS) {
    // precinct code -> cd for this year
    const fc = await read(
      readFileSync(resolve(NCSBE, shpBase + ".shp")),
      readFileSync(resolve(NCSBE, shpBase + ".dbf"))
    );
    // "<normCountyName>:<normPrecId>" -> current district
    const precToCd = new Map();
    for (const f of fc.features) {
      if (!f.geometry) continue;
      const p = f.properties;
      const cn = norm(p.COUNTY_NAM ?? p.county_nam);
      const pid = norm(p.PREC_ID ?? p.prec_id);
      const cd = cdOf(centroid(f.geometry));
      if (cd != null) precToCd.set(`${cn}:${pid}`, cd);
    }

    const lines = readFileSync(resolve(NCSBE, resFile), "latin1").split(/\r?\n/);
    const h = lines[0].split("\t").map((s) => s.trim());
    const iC = h.indexOf("County"), iP = h.indexOf("Precinct");
    const iCon = h.indexOf("Contest Name"), iPar = h.indexOf("Choice Party"), iV = h.indexOf("Total Votes");

    // county -> raceKey -> { matched: cd -> {d,r}, remainder: {d,r} }
    const perCounty = {};
    for (let i = 1; i < lines.length; i++) {
      const c = lines[i].split("\t");
      const contest = (c[iCon] || "").trim();
      const isHouse = /^US HOUSE OF REPRESENTATIVES DISTRICT/.test(contest);
      let raceKey = isHouse ? `${year}-house` : null;
      if (!raceKey) for (const [off, name] of Object.entries(offices)) if (contest === name) raceKey = `${year}-${off}`;
      if (!raceKey) continue;
      const cname = norm(c[iC]);
      if (!fipsByName.has(cname)) continue;
      const party = (c[iPar] || "").trim().toUpperCase();
      const side = party === "DEM" ? "d" : party === "REP" ? "r" : null;
      if (!side) continue;
      const v = parseInt((c[iV] || "").replace(/,/g, ""), 10) || 0;
      const cd = precToCd.get(`${cname}:${norm(c[iP])}`);
      const cc = (perCounty[cname] ||= {});
      const rc = (cc[raceKey] ||= { matched: {}, remainder: { d: 0, r: 0 } });
      if (cd == null) add(rc.remainder, side, v);
      else add((rc.matched[cd] ||= { d: 0, r: 0 }), side, v);
    }

    // fold each county into the district totals, spreading its remainder
    // proportionally to the matched vote for that race in that county.
    for (const [, races] of Object.entries(perCounty)) {
      for (const [raceKey, rc] of Object.entries(races)) {
        const cds = Object.keys(rc.matched).map(Number);
        const totMatched = cds.reduce((s, cd) => s + rc.matched[cd].d + rc.matched[cd].r, 0);
        for (const cd of cds) {
          const m = rc.matched[cd];
          const share = totMatched ? (m.d + m.r) / totMatched : 0;
          const d = m.d + rc.remainder.d * share;
          const r = m.r + rc.remainder.r * share;
          if (raceKey.endsWith("-house")) {
            const b = ((houseByYear[cd] ||= {})[year] ||= { d: 0, r: 0 });
            b.d += d; b.r += r;
          } else {
            const b = ((stateRaces[cd] ||= {})[raceKey] ||= { d: 0, r: 0 });
            b.d += d; b.r += r;
          }
        }
      }
    }
    console.error(`${year}: ${precToCd.size} precincts mapped`);
  }

  const shape = (t) => {
    const tot = t.d + t.r;
    const dPct = Math.round((t.d / tot) * 1000) / 10;
    const rPct = Math.round((t.r / tot) * 1000) / 10;
    return { winner: dPct >= rPct ? "D" : "R", dPct, rPct, marginPct: Math.round(Math.abs(dPct - rPct) * 10) / 10 };
  };

  // districtResults.generated.json (president + senate)
  const drPath = resolve(root, "app/data/districtResults.generated.json");
  let dr = {};
  try { dr = JSON.parse(readFileSync(drPath, "utf8")); } catch {}
  dr.NC = {};
  for (const [cd, races] of Object.entries(stateRaces)) {
    dr.NC[cd] = {};
    for (const [rk, t] of Object.entries(races)) {
      if (!t.d && !t.r) continue;
      const s = shape(t);
      dr.NC[cd][rk] = { winner: s.winner, dPct: s.dPct, rPct: s.rPct, who: WHO[rk]?.[s.winner] };
    }
  }
  writeFileSync(drPath, JSON.stringify(dr, null, 1) + "\n");
  console.error("wrote NC -> app/data/districtResults.generated.json");

  // merge NC into districtHouse.generated.json
  const dhPath = resolve(root, "app/data/districtHouse.generated.json");
  const dh = JSON.parse(readFileSync(dhPath, "utf8"));
  dh.NC = {};
  for (const [cd, byYear] of Object.entries(houseByYear)) {
    dh.NC[cd] = {};
    for (const [yr, t] of Object.entries(byYear)) {
      if (!t.d && !t.r) continue;
      dh.NC[cd][yr] = shape(t);
    }
  }
  writeFileSync(dhPath, JSON.stringify(dh, null, 1) + "\n");
  console.error("merged NC -> app/data/districtHouse.generated.json");

  for (let cd = 1; cd <= 14; cd++) {
    const h = dh.NC[cd]?.["2024"], p = dr.NC[cd]?.["2024-president"];
    console.error(
      `  NC-${cd}: 2024 House ${h ? h.winner + "+" + h.marginPct : "?"}  ` +
      `2024 pres ${p ? p.winner + "+" + Math.abs(p.rPct - p.dPct).toFixed(1) : "?"}`
    );
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
