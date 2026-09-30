#!/usr/bin/env node
/**
 * Per-year precinct-level results, folded onto the 2020 Census VTD shapes the
 * app renders. Writes to every precinct file under app/data/geo/precincts/<USPS>:
 *
 *   prr: { "<year>-<office>": [dVotes, rVotes, otherVotes], ... }
 *
 * `pr` stays an alias of prr["2020-president"]. Also writes
 *   app/data/geo/<USPS>.districtCounty.json   (each CD's slice of each county)
 *   app/data/geo/precinctYears.generated.json (which races each state has)
 *
 *   node scripts/build-precinct-years.mjs <USPS> <src-dir>
 *
 * <src-dir> holds (only what's present is used):
 *   <usps>_2016.zip / _2018.zip / _2020.zip  VEST year zips (doi:10.7910/DVN/
 *     NH5S2I, UBKYRU, K7760H). Race columns are auto-detected by the VEST naming
 *     convention (G<YY><PRE|USS|USH|CON><party-letter><cand>); each VEST precinct
 *     is folded into the 2020 VTD that contains its centroid.
 *   <usps>22.csv / <usps>24.csv               MEDSL precinct CSVs. No geometry,
 *     so joined by (county FIPS + precinct name), with a 2-pass candidate->party
 *     learn and a population-spread fallback for names that don't match.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, createReadStream } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const USPS = (process.argv[2] || "").toUpperCase();
const SRC = process.argv[3];
if (!USPS || !SRC) throw new Error("usage: build-precinct-years.mjs <USPS> <src-dir>");

// Per-state overrides. `fips` required. `sr` gives a proj4 string / EPSG code for
// a VEST year whose shapefile is projected (most are lon/lat and need nothing).
const CONFIG = {
  OH: { fips: "39" },
  // MN 2018 had two Senate races (Klobuchar regular + Smith special); VEST puts
  // both under G18USS* so the auto-sum can't separate them — drop that key.
  MN: { fips: "27", dropKeys: ["2018-senate"] },
  TX: {
    fips: "48",
    skipMedsl: true,
  },
  WI: { fips: "55", sr: { "2020": "EPSG:3857" } },
  // Oregon has NO Census 2020 VTDs, so there is nothing to fold precinct votes
  // onto — the precinct layer for OR stays empty.
  OR: { fips: "41", skip: true },
  NC: { fips: "37", sr: { "2020": "2264" } },
  // Texas SOS precinct names bear no relation to the 2020 VTD names, so the
  // MEDSL 2022/24 name-match is hopeless — keep VEST 2018/2020 only.
  MI: { fips: "26" }, PA: { fips: "42" }, AZ: { fips: "04" },
  // Georgia's MEDSL files split each mode into its own column (no `votes`
  // total) and its SOS precinct names don't match the VTD names — VEST only.
  GA: { fips: "13", skipMedsl: true },
  NV: { fips: "32" }, NH: { fips: "33" }, CO: { fips: "08" },
  // VA precinct names (VEST/Census VTD vs SOS) diverge for ~half the state —
  // the 2022/24 name-match only covers ~50% of the vote. VEST years only.
  VA: { fips: "51", skipMedsl: true },
  // NM SOS precinct names don't match the VTD names either (~33% MEDSL coverage).
  NM: { fips: "35", skipMedsl: true },
  KS: { fips: "20" }, IA: { fips: "19" },
  // Maine has Census VTDs for only 6 of 16 counties, so both the VEST geometry
  // fold and the name-match cover a fraction of the state — leave ME at the
  // 2020-president join and add nothing.
  ME: { fips: "23", skip: true },
  MT: { fips: "30" },
  // NE 2024 had two Senate races (Fischer regular vs the independent Osborn,
  // Ricketts special vs Love) — MEDSL's "US SENATE" sums them.
  NE: { fips: "31", dropKeys: ["2024-senate"] },
  // AK 2016 Senate had no Democrat (Murkowski vs two independents); AK 2022/24
  // is RCV and the MEDSL file leaves ballots unassigned to a borough.
  AK: { fips: "02", dropKeys: ["2016-senate"], skipMedsl: true },
  SC: { fips: "45" },
  // Indiana county clerks' precinct names don't match the 2020 VTD names — the
  // MEDSL 2022/24 name-match covers ~36% of the vote and pushes the 2024
  // presidential margin ~6pt too Democratic. VEST years only.
  IN: { fips: "18", skipMedsl: true },
  WA: { fips: "53" },
  // CT, MD and UT report town-precinct names that share nothing with the 2020
  // Census VTD names (0-2% match), and TN matches only ~28%. Below that the
  // 2022/24 "precinct" map is almost entirely county-population spread, no better
  // than the county-result fallback the app already draws — so VEST years only.
  // (UT 2022 Senate also has no Democrat: the party backed the independent
  // McMullin.)
  CT: { fips: "09", skipMedsl: true },
  TN: { fips: "47", skipMedsl: true },
  MD: { fips: "24", skipMedsl: true },
  // Missouri's Jackson County (Kansas City) never published complete precinct
  // results for 2022/2024, so the MEDSL name-match undercounts it badly.
  MO: { fips: "29", skipMedsl: true },
  UT: { fips: "49", skipMedsl: true },
  // KY 0% name-match; AR ~30%; ID ~39% (and the MEDSL id22 file inflates every
  // count ~1.85x — percentages are right, raw totals are not); WV ~49% but the
  // precinct layer already only covers 42 of 55 counties (no 2020 Census VTDs for
  // Kanawha and 12 others). SD/ND MEDSL match ~1%. All get VEST years only —
  // and SD/ND VEST carries House columns too, so 2016/18/20 House is real there.
  KY: { fips: "21", skipMedsl: true },
  AR: { fips: "05", skipMedsl: true },
  WV: { fips: "54", skipMedsl: true },
  ID: { fips: "16", skipMedsl: true },
  SD: { fips: "46", skipMedsl: true },
  ND: { fips: "38", skipMedsl: true },
  DE: { fips: "10", skipMedsl: true },
  VT: { fips: "50", skipMedsl: true },
  WY: { fips: "56", skipMedsl: true },
  // Hawaii has no Census 2020 VTDs — nothing to fold precinct votes onto.
  HI: { fips: "15", skip: true },
  RI: { fips: "44", skipMedsl: true },
  MS: { fips: "28", skipMedsl: true },
  OK: { fips: "40", skipMedsl: true },
  NJ: { fips: "34", skipMedsl: true },
  MA: { fips: "25", skipMedsl: true },
  AL: { fips: "01", skipMedsl: true },
  LA: { fips: "22", skipMedsl: true },
  // California has no Census 2020 VTDs — nothing to fold precinct votes onto.
  CA: { fips: "06", skip: true },
  FL: { fips: "12", skipMedsl: true },
  IL: { fips: "17", skipMedsl: true },
  NY: { fips: "36", skipMedsl: true },
};
const cfg = CONFIG[USPS];
if (!cfg) throw new Error(`no precinct-year config for ${USPS} — add fips`);
if (cfg.skip) { console.error(`${USPS}: precinct-years skipped (see CONFIG note)`); process.exit(0); }
const FIPS = cfg.fips;
const DROP = new Set(cfg.dropKeys ?? []);

// ── name keys (MEDSL join) ───────────────────────────────────────────
const norm0 = (s) => String(s).toUpperCase().replace(/\s+/g, " ").trim();
const norm1 = (s) => norm0(s).replace(/^PRECINCT /, "");
const norm2 = (s) =>
  norm0(s)
    .replace(/\b(CITY|VILLAGE|VLG|TOWNSHIP|TWP|WARD|WD|PRECINCT|PCT|PT)\b/g, " ")
    .replace(/[^A-Z0-9]/g, "");

const geoDir = resolve(root, `app/data/geo/precincts/${USPS}`);
const geoFiles = readdirSync(geoDir).filter((f) => f.endsWith(".json"));
const m0 = new Map(), m1 = new Map(), m2 = new Map();
const vtdPop = new Map();
const vtdCounty = new Map();
for (const f of geoFiles) {
  const g = JSON.parse(readFileSync(resolve(geoDir, f), "utf8"));
  for (const p of g.precincts) {
    m0.set(`${g.countyFips}|${norm0(p.name)}`, p.id);
    m1.set(`${g.countyFips}|${norm1(p.name)}`, p.id);
    const k2 = `${g.countyFips}|${norm2(p.name)}`;
    (m2.get(k2) ?? m2.set(k2, new Set()).get(k2)).add(p.id);
    vtdPop.set(p.id, p.pop || 0);
    vtdCounty.set(p.id, g.countyFips);
  }
}
function resolveVtd(fips, rawName) {
  return (
    m0.get(`${fips}|${norm0(rawName)}`) ||
    m1.get(`${fips}|${norm1(rawName)}`) ||
    (() => {
      const s = m2.get(`${fips}|${norm2(rawName)}`);
      return s && s.size === 1 ? [...s][0] : null;
    })()
  );
}

// ── zip + dbf + geometry ─────────────────────────────────────────────
function unzipEntry(buf, wantSuffix) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 65536; i--)
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("no EOCD");
  const count = buf.readUInt16LE(eocd + 10);
  let o = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    const method = buf.readUInt16LE(o + 10);
    const compSize = buf.readUInt32LE(o + 20);
    const nameLen = buf.readUInt16LE(o + 28);
    const extraLen = buf.readUInt16LE(o + 30);
    const commentLen = buf.readUInt16LE(o + 32);
    const localOff = buf.readUInt32LE(o + 42);
    const name = buf.toString("ascii", o + 46, o + 46 + nameLen);
    o += 46 + nameLen + extraLen + commentLen;
    if (!name.toLowerCase().endsWith(wantSuffix)) continue;
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const comp = buf.subarray(dataStart, dataStart + compSize);
    return method === 0 ? comp : inflateRawSync(comp);
  }
  return null;
}
function readDbf(buf) {
  const headerLen = buf.readUInt16LE(8), recordLen = buf.readUInt16LE(10), count = buf.readUInt32LE(4);
  const fields = [];
  for (let p = 32; buf[p] !== 0x0d && p < headerLen; p += 32)
    fields.push({ name: buf.toString("ascii", p, p + 11).replace(/\0.*$/, ""), length: buf[p + 16] });
  const rows = [];
  for (let i = 0; i < count; i++) {
    let p = headerLen + i * recordLen + 1;
    const r = {};
    for (const f of fields) { r[f.name] = buf.toString("ascii", p, p + f.length).replace(/\0/g, "").trim(); p += f.length; }
    rows.push(r);
  }
  return { fields: fields.map((f) => f.name), rows };
}
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
const centroidOf = (geom) => {
  const ring = geom.type === "Polygon" ? geom.coordinates[0] : geom.coordinates[0][0];
  let cx = 0, cy = 0;
  for (const [x, y] of ring) { cx += x; cy += y; }
  return [cx / ring.length, cy / ring.length];
};
const bboxOf = (geom) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  for (const poly of polys) for (const [x, y] of poly[0]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
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

const dr = (p) => { const s = String(p || "").toUpperCase(); return s.startsWith("DEMOCRAT") ? "d" : s.startsWith("REPUBLICAN") ? "r" : null; };
const isSummary = (c) =>
  /^(TOTAL\b|TOTAL BALLOTS|UNDER ?VOTES?|OVER ?VOTES?|BLANKS?|EXHAUSTED|BALLOTS CAST|CAST VOTES|WRITE-?INS?$|SCATTER)/i.test(String(c || "").trim());

// out[raceKey] = Map<vtdId, [d, r, o]>
const out = {};
const stat = {};
const add = (key, vtd, d, r, o) => {
  if (DROP.has(key)) return;
  const m = (out[key] ||= new Map());
  const cur = m.get(vtd) ?? [0, 0, 0];
  m.set(vtd, [cur[0] + d, cur[1] + r, cur[2] + o]);
};

// ── VEST years: auto-detect columns, geometry-fold ──────────────────
let vtdShapes = null; // fetched once
async function censusVtds() {
  if (vtdShapes) return vtdShapes;
  const url =
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer/58/query?" +
    new URLSearchParams({
      where: `STATE='${FIPS}'`, outFields: "VTD,COUNTY", returnGeometry: "true",
      geometryPrecision: "6", maxAllowableOffset: "0.0005", outSR: "4326", f: "geojson",
    });
  console.error("  fetching Census VTD polygons…");
  let fc = null;
  for (let attempt = 1; attempt <= 6 && !fc; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
      fc = await res.json();
      if (!fc.features) { fc = null; throw new Error("no features"); }
    } catch (e) {
      console.error(`  VTD fetch attempt ${attempt} failed (${e.message}); retrying…`);
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
  if (!fc) throw new Error("Census VTD fetch failed after retries");
  vtdShapes = fc.features.map((f) => ({
    id: f.properties.VTD,
    fips: FIPS + f.properties.COUNTY,
    geom: f.geometry,
    bbox: bboxOf(f.geometry),
  }));
  return vtdShapes;
}

const OFFICE = { PRE: "president", USS: "senate", USH: "house", CON: "house", HAL: "house" };

async function importVest(year, buf) {
  const shpBuf = unzipEntry(buf, ".shp");
  const dbfBuf = unzipEntry(buf, ".dbf");
  if (!shpBuf || !dbfBuf) { console.error(`  ${year}: no shp/dbf in zip`); return; }
  const { read } = await import("shapefile");
  const feats = (await read(shpBuf)).features;
  const { fields, rows } = readDbf(dbfBuf);

  // group race columns: { "<year>-<office>": { d:[cols], r:[cols], o:[cols] } }
  const groups = {};
  for (const name of fields) {
    const m = name.match(/^G(\d\d)(PRE|USS|USH|CON|HAL)([A-Z])/);
    if (!m) continue;
    const yr = 2000 + Number(m[1]);
    const office = OFFICE[m[2]];
    if (!office) continue;
    const key = `${yr}-${office}`;
    const side = m[3] === "D" ? "d" : m[3] === "R" ? "r" : "o";
    ((groups[key] ||= { d: [], r: [], o: [] })[side]).push(name);
  }
  const keys = Object.keys(groups).filter((k) => groups[k].d.length && groups[k].r.length);
  if (!keys.length) { console.error(`  ${year}: no race columns detected`); return; }

  // Reproject when the shapefile is projected — from the config, else straight
  // from the .prj WKT (proj4 parses it).
  let toWgs = null;
  const prjBuf = unzipEntry(buf, ".prj");
  const prj = prjBuf ? prjBuf.toString("ascii") : "";
  const srcSR = cfg.srAll ?? cfg.sr?.[String(year)] ?? (/^PROJCS\[/.test(prj) ? prj : null);
  if (srcSR) {
    const proj4 = (await import("proj4")).default;
    toWgs = proj4(srcSR, "WGS84");
  }
  const vtds = await censusVtds();

  let matched = 0, missed = 0;
  feats.forEach((f, i) => {
    if (!f.geometry) return;
    let c = centroidOf(f.geometry);
    if (toWgs) c = toWgs.forward(c);
    let hit = null;
    for (const v of vtds) {
      if (c[0] < v.bbox[0] || c[0] > v.bbox[2] || c[1] < v.bbox[1] || c[1] > v.bbox[3]) continue;
      if (inFeature(c, v.geom)) { hit = v; break; }
    }
    if (!hit) { missed++; return; }
    matched++;
    const row = rows[i] ?? {};
    for (const key of keys) {
      const g = groups[key];
      const d = g.d.reduce((s, col) => s + (parseInt(row[col], 10) || 0), 0);
      const r = g.r.reduce((s, col) => s + (parseInt(row[col], 10) || 0), 0);
      const o = g.o.reduce((s, col) => s + (parseInt(row[col], 10) || 0), 0);
      add(key, hit.id, d, r, o);
    }
  });
  for (const key of keys) stat[key] = { matched, missed, join: "geometry" };
  console.error(`  ${year}: ${keys.join(", ")} — ${matched} precincts placed (${missed} outside every VTD)`);
}

// ── MEDSL files: name-match + population spread ─────────────────────
async function importMedsl(file) {
  const offices = ["US PRESIDENT", "US SENATE", "US HOUSE"];
  // sniff which offices exist + the year
  const sniff = createInterface({ input: createReadStream(resolve(SRC, file)) });
  let h = null, yr = null;
  const present = new Set();
  for await (const line of sniff) {
    if (!h) { h = splitLine(line).map((s) => s.toLowerCase().trim()); continue; }
    const r = splitLine(line);
    if (yr == null) yr = Number(r[h.indexOf("year")]) || null;
    const o = r[h.indexOf("office")];
    if (offices.includes(o)) present.add(o);
    if (present.size === 3 && yr) break;
  }
  if (!yr) { console.error(`  ${file}: no year column`); return; }

  for (const office of present) {
    const key = `${yr}-${office === "US PRESIDENT" ? "president" : office === "US SENATE" ? "senate" : "house"}`;
    const candSide = new Map();
    // (fips|name) -> { d, r, o } collected twice — once from TOTAL-mode rows,
    // once from component-mode rows — and per precinct the TOTAL wins, else the
    // component sum (some states, e.g. Georgia, only report components).
    const COMPONENT = /^(ELECTION DAY|EARLY VOTING|LATE EARLY|ADVANCE|ADVANCED|ABSENTEE|MAIL|PROVISIONAL|IN-PERSON|ELECTION-DAY|ONE STOP|POLLING|PRE-POLL)/i;
    const totalBag = new Map(), compBag = new Map();
    for (let pass = 1; pass <= 2; pass++) {
      const rl = createInterface({ input: createReadStream(resolve(SRC, file)) });
      let hh = null;
      for await (const line of rl) {
        if (!hh) { hh = splitLine(line).map((s) => s.toLowerCase().trim()); continue; }
        const r = splitLine(line);
        if (r[hh.indexOf("office")] !== office) continue;
        const cand = norm0(r[hh.indexOf("candidate")]);
        if (isSummary(cand)) continue;
        if (pass === 1) {
          const s = dr(r[hh.indexOf("party_simplified")]) || dr(r[hh.indexOf("party_detailed")]);
          if (s && cand) candSide.set(cand, s);
          continue;
        }
        const fips = String(r[hh.indexOf("county_fips")]).padStart(5, "0");
        if (!fips.startsWith(FIPS)) continue;
        const mode = String(r[hh.indexOf("mode")] || "").toUpperCase();
        const bag = mode === "TOTAL" ? totalBag : (mode === "" || COMPONENT.test(mode)) ? compBag : null;
        if (!bag) continue;
        const k = `${fips}|${norm0(r[hh.indexOf("precinct")])}`;
        const t = bag.get(k) ?? { d: 0, r: 0, o: 0 };
        const v = parseInt(r[hh.indexOf("votes")], 10) || 0;
        const s = candSide.get(cand);
        if (s === "d") t.d += v; else if (s === "r") t.r += v; else t.o += v;
        bag.set(k, t);
      }
    }
    const byKey = new Map();
    for (const k of new Set([...totalBag.keys(), ...compBag.keys()])) {
      const tt = totalBag.get(k);
      const t = tt && tt.d + tt.r + tt.o > 0 ? tt : compBag.get(k);
      if (t) byKey.set(k, t);
    }
    let matched = 0, missed = 0;
    const missByCounty = {};
    for (const [k, t] of byKey) {
      const [fips, nm] = k.split("|");
      const vtd = resolveVtd(fips, nm);
      if (vtd) { matched++; add(key, vtd, t.d, t.r, t.o); }
      else {
        missed++;
        const u = (missByCounty[fips] ||= { d: 0, r: 0, o: 0 });
        u.d += t.d; u.r += t.r; u.o += t.o;
      }
    }
    for (const [fips, u] of Object.entries(missByCounty)) {
      const gp = geoFiles.includes(`${fips}.json`)
        ? JSON.parse(readFileSync(resolve(geoDir, `${fips}.json`), "utf8")).precincts
        : [];
      const empty = gp.filter((p) => !out[key]?.has(p.id));
      const tot = empty.reduce((s, p) => s + (p.pop || 0), 0) || 1;
      for (const p of empty) {
        const w = (p.pop || 0) / tot;
        add(key, p.id, Math.round(u.d * w), Math.round(u.r * w), Math.round(u.o * w));
      }
    }
    stat[key] = { matched, missed, join: "name" };
    console.error(`  ${file} ${office}: ${matched} matched, ${missed} spread`);
  }
}

async function main() {
  for (const year of [2016, 2018, 2020]) {
    const zip = resolve(SRC, `${USPS.toLowerCase()}_${year}.zip`);
    if (existsSync(zip)) await importVest(year, readFileSync(zip));
  }
  if (!cfg.skipMedsl)
    for (const yy of ["22", "24"]) {
      const cands = [`${USPS.toLowerCase()}${yy}.csv`, `${USPS.toLowerCase()}${yy}_cleaned.csv`];
      const file = cands.find((c) => existsSync(resolve(SRC, c)));
      if (file) await importMedsl(file);
    }

  if (Object.keys(out).length === 0) throw new Error("nothing imported");

  // vtd -> CD, for the districtCounty roll-up
  const dj = JSON.parse(readFileSync(resolve(root, `app/data/geo/${USPS}.districts.json`), "utf8"));
  const vtdCd = new Map();
  for (const [cd, byFips] of Object.entries(dj))
    for (const ids of Object.values(byFips)) for (const id of ids) vtdCd.set(id, cd);

  let touched = 0;
  for (const f of geoFiles) {
    const path = resolve(geoDir, f);
    const g = JSON.parse(readFileSync(path, "utf8"));
    for (const p of g.precincts) {
      const prr = {};
      for (const key of Object.keys(out)) {
        const v = out[key].get(p.id);
        if (v && v[0] + v[1] + v[2] > 0) prr[key] = v;
      }
      if (Object.keys(prr).length) { p.prr = prr; touched++; } else delete p.prr;
      if (prr["2020-president"]) p.pr = prr["2020-president"];
    }
    writeFileSync(path, JSON.stringify(g));
  }

  const dc = {};
  for (const [key, m] of Object.entries(out)) {
    const byRace = (dc[key] = {});
    for (const [vtd, v] of m) {
      const cd = vtdCd.get(vtd), fips = vtdCounty.get(vtd);
      if (cd == null || fips == null) continue;
      const cur = ((byRace[cd] ||= {})[fips] ||= [0, 0, 0]);
      cur[0] += v[0]; cur[1] += v[1]; cur[2] += v[2];
    }
  }
  writeFileSync(resolve(root, `app/data/geo/${USPS}.districtCounty.json`), JSON.stringify(dc));

  const manifestPath = resolve(root, "app/data/geo/precinctYears.generated.json");
  let manifest = {};
  try { manifest = JSON.parse(readFileSync(manifestPath, "utf8")); } catch {}
  manifest[USPS] = Object.keys(out)
    .filter((k) => { let t = 0; for (const v of out[k].values()) t += v[0] + v[1] + v[2]; return t > 0; })
    .sort();
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + "\n");

  console.error(`\n${USPS}: statewide two-party check —`);
  for (const [key, s] of Object.entries(stat)) {
    let d = 0, r = 0, o = 0;
    for (const v of (out[key]?.values() ?? [])) { d += v[0]; r += v[1]; o += v[2]; }
    const tot = d + r + o || 1;
    console.error(
      `  ${key.padEnd(18)} D ${(100 * d / tot).toFixed(2)} / R ${(100 * r / tot).toFixed(2)}` +
      `  (${tot.toLocaleString()}, ${s.join})`
    );
  }
  console.error(`wrote prr to ${touched} precincts across ${geoFiles.length} counties`);
}

main().catch((e) => { console.error(e); process.exit(1); });
