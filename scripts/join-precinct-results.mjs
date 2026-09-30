#!/usr/bin/env node
/**
 * Join precinct-level election results onto the precinct geometry files.
 *
 *   node scripts/join-precinct-results.mjs OH
 *
 * Source: VEST (Voting and Election Science Team) 2020 precinct boundaries +
 * returns, Harvard Dataverse doi:10.7910/DVN/K7760H. VEST 2020 is built on the
 * Census 2020 VTDs -- the exact geometry scripts/extract-precincts.mjs pulls --
 * so the join is 1:1 on GEOID20 ("<state><county><vtd>").
 *
 * For Ohio, VEST 2020 publishes the presidential race only:
 *   G20PREDBID (Biden, D), G20PRERTRU (Trump, R),
 *   G20PRELJOR (Jorgensen, L), G20PREGHAW (Hawkins, G)
 *
 * Each precinct in app/data/geo/precincts/<USPS>/<county>.json gains:
 *   pr: [dVotes, rVotes, otherVotes]     // 2020 president; total = sum
 *
 * Other years use different precinct lines pre-2020 and are left to the
 * county-level shading.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdtempSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Per-state VEST 2020 config. `join`:
//   "geoid20" — the dbf carries a GEOID20 column that is exactly the Census VTD
//               id the geometry uses (OH). 1:1 join.
//   "precid"  — no GEOID20; match the dbf's `PREC_ID` to the geo file's precinct
//               `name`, scoped to the county (NC). `countyIdCol` holds the
//               state's 1..N county number, fips = stateFips*1000 + (2*n - 1).
const VEST = {
  OH: {
    url: "https://dataverse.harvard.edu/api/access/datafile/4499012",
    dbf: "oh_2020.dbf",
    join: "geoid20",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW"] },
  },
  NC: {
    // nc_2020.zip within doi:10.7910/DVN/K7760H
    url: "https://dataverse.harvard.edu/api/access/datafile/11595848",
    dbf: "nc_2020.dbf",
    shp: "nc_2020.shp",
    // NC's VEST precincts are the SBOE set, not Census VTDs, so neither ids nor
    // names line up — assign each Census VTD to the VEST precinct that contains
    // its centroid.
    join: "geometry",
    censusFips: "37",
    // NC VEST .prj: NAD83 State Plane NC (US ft) = EPSG:2264. Ask TIGERweb for
    // the Census VTDs in the same CRS so point-in-polygon needs no reprojection.
    vestSR: "2264",
    cols: {
      d: "G20PREDBID",
      r: "G20PRERTRU",
      o: ["G20PRELJOR", "G20PREGHAW", "G20PRECBLA", "G20PREOWRI"],
    },
  },
  MI: {
    // mi_2020.zip within doi:10.7910/DVN/K7760H
    url: "https://dataverse.harvard.edu/api/access/datafile/9865421",
    dbf: "mi_2020.dbf",
    shp: "mi_2020.shp",
    // MI's VEST precincts are the state's MCD/ward/precinct set, not Census VTDs.
    // The .prj is plain WGS84, so the Census VTD fetch stays at outSR 4326.
    join: "geometry",
    censusFips: "26",
    cols: {
      d: "G20PREDBID",
      r: "G20PRERTRU",
      o: ["G20PRELJOR", "G20PREUBLA", "G20PREGHAW", "G20PRENDEL"],
    },
  },
  GA: {
    // ga_2020.zip within doi:10.7910/DVN/K7760H — county SOS precincts, lon/lat.
    url: "https://dataverse.harvard.edu/api/access/datafile/11070054",
    dbf: "ga_2020.dbf",
    shp: "ga_2020.shp",
    join: "geometry",
    censusFips: "13",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR"] },
  },
  PA: {
    // pa_2020.zip within doi:10.7910/DVN/K7760H — county precincts, lon/lat,
    // president only.
    url: "https://dataverse.harvard.edu/api/access/datafile/10596699",
    dbf: "pa_2020.dbf",
    shp: "pa_2020.shp",
    join: "geometry",
    censusFips: "42",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR"] },
  },
  AZ: {
    // az_2020.zip within doi:10.7910/DVN/K7760H — lon/lat.
    url: "https://dataverse.harvard.edu/api/access/datafile/4864722",
    dbf: "az_2020.dbf",
    shp: "az_2020.shp",
    join: "geometry",
    censusFips: "04",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR"] },
  },
  WI: {
    // wi_2020.zip within doi:10.7910/DVN/K7760H — WGS84 Web Mercator (EPSG:3857),
    // president only (no 2020 WI Senate race). Ask TIGERweb for VTDs in 3857 too
    // so point-in-polygon is planar with no reprojection.
    url: "https://dataverse.harvard.edu/api/access/datafile/8569139",
    dbf: "wi_2020.dbf",
    shp: "wi_2020.shp",
    join: "geometry",
    censusFips: "55",
    vestSR: "3857",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PRECBLA"] },
  },
  NV: {
    // nv_2020.zip within doi:10.7910/DVN/K7760H — NAD83 lon/lat, president only
    // (no 2020 NV Senate race).
    url: "https://dataverse.harvard.edu/api/access/datafile/11595850",
    dbf: "nv_2020.dbf",
    shp: "nv_2020.shp",
    join: "geometry",
    censusFips: "32",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREABLA", "G20PREONON"] },
  },
  SC: {
    url: "https://dataverse.harvard.edu/api/access/datafile/11070057",
    dbf: "sc_2020.dbf",
    shp: "sc_2020.shp",
    join: "geometry",
    censusFips: "45",
    // SC VEST .prj is a state-plane in international feet — reproject to lon/lat.
    reprojectFrom:
      'PROJCS["NAD_1983_2011_StatePlane_South_Carolina_FIPS_3900_Ft_Intl",GEOGCS["GCS_NAD_1983_2011",DATUM["D_NAD_1983_2011",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Lambert_Conformal_Conic"],PARAMETER["False_Easting",1999996.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",-81.0],PARAMETER["Standard_Parallel_1",32.5],PARAMETER["Standard_Parallel_2",34.83333333333334],PARAMETER["Latitude_Of_Origin",31.83333333333333],UNIT["Foot",0.3048]]',
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREADEL"] },
  },
  IN: {
    url: "https://dataverse.harvard.edu/api/access/datafile/5143396",
    dbf: "in_2020.dbf",
    join: "geoid20",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR"] },
  },
  WA: {
    url: "https://dataverse.harvard.edu/api/access/datafile/11070055",
    dbf: "wa_2020.dbf",
    shp: "wa_2020.shp",
    join: "geometry",
    censusFips: "53",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PRESLAR", "G20PRESKEN", "G20PREOWRI"] },
  },
  NE: {
    // ne_2020.zip within doi:10.7910/DVN/K7760H — county precincts, lon/lat.
    url: "https://dataverse.harvard.edu/api/access/datafile/5739922",
    dbf: "ne_2020.dbf",
    shp: "ne_2020.shp",
    join: "geometry",
    censusFips: "31",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR"] },
  },
  AK: {
    // ak_2020.zip within doi:10.7910/DVN/K7760H — state-house-district precincts,
    // lon/lat. 2020 was pre-RCV (plurality).
    url: "https://dataverse.harvard.edu/api/access/datafile/11070062",
    dbf: "ak_2020.dbf",
    shp: "ak_2020.shp",
    join: "geometry",
    censusFips: "02",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGVEN", "G20PRECBLA", "G20PREADEL", "G20PREIPIE"] },
  },
  IA: {
    // ia_2020.zip within doi:10.7910/DVN/K7760H — county precincts, lon/lat.
    url: "https://dataverse.harvard.edu/api/access/datafile/4789403",
    dbf: "ia_2020.dbf",
    shp: "ia_2020.shp",
    join: "geometry",
    censusFips: "19",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PRECBLA", "G20PREOFUE", "G20PREOKIN", "G20PREIWES", "G20PREIPIE", "G20PREOWRI"] },
  },
  ME: {
    // me_2020.zip within doi:10.7910/DVN/K7760H — town precincts, lon/lat.
    url: "https://dataverse.harvard.edu/api/access/datafile/11070059",
    dbf: "me_2020.dbf",
    shp: "me_2020.shp",
    join: "geometry",
    censusFips: "23",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREADEL"] },
  },
  MT: {
    // mt_2020.zip within doi:10.7910/DVN/K7760H — SOS precincts, lon/lat.
    url: "https://dataverse.harvard.edu/api/access/datafile/4773527",
    dbf: "mt_2020.dbf",
    shp: "mt_2020.shp",
    join: "geometry",
    censusFips: "30",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR"] },
  },
  CO: {
    // co_2020.zip within doi:10.7910/DVN/K7760H — county precincts, lon/lat.
    url: "https://dataverse.harvard.edu/api/access/datafile/4863166",
    dbf: "co_2020.dbf",
    shp: "co_2020.shp",
    join: "geometry",
    censusFips: "08",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PRECBLA", "G20PREUWES", "G20PREOOTH"] },
  },
  NM: {
    // nm_2020.zip within doi:10.7910/DVN/K7760H — county precincts, lon/lat.
    url: "https://dataverse.harvard.edu/api/access/datafile/5425599",
    dbf: "nm_2020.dbf",
    shp: "nm_2020.shp",
    join: "geometry",
    censusFips: "35",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PRECTIT", "G20PRESLAR"] },
  },
  KS: {
    // ks_2020.zip within doi:10.7910/DVN/K7760H — VTDs, lon/lat.
    url: "https://dataverse.harvard.edu/api/access/datafile/6696064",
    dbf: "ks_2020.dbf",
    shp: "ks_2020.shp",
    join: "geometry",
    censusFips: "20",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR"] },
  },
  NH: {
    // nh_2020.zip within doi:10.7910/DVN/K7760H — VEST dbf carries a GEOID20
    // that is exactly the Census VTD id (town-ward code), so a 1:1 join.
    url: "https://dataverse.harvard.edu/api/access/datafile/11070060",
    dbf: "nh_2020.dbf",
    join: "geoid20",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR"] },
  },
  VA: {
    // va_2020.zip within doi:10.7910/DVN/K7760H — county precincts, lon/lat.
    url: "https://dataverse.harvard.edu/api/access/datafile/11070061",
    dbf: "va_2020.dbf",
    shp: "va_2020.shp",
    join: "geometry",
    censusFips: "51",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREOWRI"] },
  },
  MN: {
    // mn_2020.zip within doi:10.7910/DVN/K7760H — VTDs, NAD83 UTM Zone 15N
    // (EPSG:26915). Fetch the Census VTDs in 26915 too so the join is planar.
    url: "https://dataverse.harvard.edu/api/access/datafile/11595851",
    dbf: "mn_2020.dbf",
    shp: "mn_2020.shp",
    join: "geometry",
    censusFips: "27",
    vestSR: "26915",
    cols: {
      d: "G20PREDBID",
      r: "G20PRERTRU",
      o: ["G20PRELJOR", "G20PREGHAW", "G20PREADEL", "G20PRESLAR", "G20PRESKEN", "G20PREIWES", "G20PREIPIE", "G20PREOWRI"],
    },
  },
  TX: {
    // tx_2020.zip within doi:10.7910/DVN/K7760H — a custom Texas-centric Lambert
    // Conformal Conic with no clean EPSG for TIGERweb, so reproject the VEST
    // centroids to lon/lat with proj4 and fetch the VTDs at 4326. Has 2020
    // Senate (Cornyn vs Hegar).
    url: "https://dataverse.harvard.edu/api/access/datafile/12070365",
    dbf: "tx_2020.dbf",
    shp: "tx_2020.shp",
    join: "geometry",
    censusFips: "48",
    reprojectFrom:
      'PROJCS["NAD_1983_Lambert_Conformal_Conic",GEOGCS["GCS_North_American_1983",DATUM["D_North_American_1983",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Lambert_Conformal_Conic"],PARAMETER["False_Easting",1000000.0],PARAMETER["False_Northing",1000000.0],PARAMETER["Central_Meridian",-100.0],PARAMETER["Standard_Parallel_1",27.41666666666667],PARAMETER["Standard_Parallel_2",34.91666666666666],PARAMETER["Latitude_Of_Origin",31.16666666666667],UNIT["Meter",1.0]]',
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREOWRI"] },
  },
  CT: {
    // ct_2020.zip within doi:10.7910/DVN/K7760H — town precincts, NAD83 lon/lat,
    // president only (no 2020 CT Senate race).
    url: "https://dataverse.harvard.edu/api/access/datafile/4986646",
    dbf: "ct_2020.dbf",
    shp: "ct_2020.shp",
    join: "geometry",
    censusFips: "09",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREOWRI"] },
  },
  TN: {
    url: "https://dataverse.harvard.edu/api/access/datafile/11070058",
    dbf: "tn_2020.dbf",
    shp: "tn_2020.shp",
    join: "geometry",
    censusFips: "47",
    cols: {
      d: "G20PREDBID",
      r: "G20PRERTRU",
      o: ["G20PREIJOR", "G20PREIWES", "G20PREIHAW", "G20PREIBLA", "G20PREIKEN", "G20PREILAR", "G20PREIDEL"],
    },
  },
  MD: {
    // md_2020.zip within doi:10.7910/DVN/K7760H — .prj is Web Mercator; ask
    // TIGERweb for the VTDs in 3857 so point-in-polygon is planar. President only.
    url: "https://dataverse.harvard.edu/api/access/datafile/12070366",
    dbf: "md_2020.dbf",
    shp: "md_2020.shp",
    join: "geometry",
    censusFips: "24",
    vestSR: "3857",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREBSEG", "G20PREOWRI"] },
  },
  MO: {
    url: "https://dataverse.harvard.edu/api/access/datafile/5007850",
    dbf: "mo_2020.dbf",
    shp: "mo_2020.shp",
    join: "geometry",
    censusFips: "29",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PRECBLA"] },
  },
  UT: {
    // ut_2020.zip within doi:10.7910/DVN/K7760H — .prj is Web Mercator.
    url: "https://dataverse.harvard.edu/api/access/datafile/11595849",
    dbf: "ut_2020.dbf",
    shp: "ut_2020.shp",
    join: "geometry",
    censusFips: "49",
    vestSR: "3857",
    cols: {
      d: "G20PREDBID",
      r: "G20PRERTRU",
      o: ["G20PRELJOR", "G20PREGHAW", "G20PRECBLA", "G20PREIWES", "G20PREIPIE", "G20PREIMCH", "G20PREILAR"],
    },
  },
  KY: {
    // ky_2020_vtd_estimates.zip within doi:10.7910/DVN/K7760H — a VTD-estimate
    // layer that carries GEOID20, so a 1:1 id join.
    url: "https://dataverse.harvard.edu/api/access/datafile/6550199",
    dbf: "ky_2020_vtd_estimates.dbf",
    join: "geoid20",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREIWES", "G20PREIPIE"] },
  },
  AR: {
    // ar_2020.zip within doi:10.7910/DVN/K7760H — .prj is NAD83 / UTM zone 15N
    // (metres); proj4 lacks EPSG:26915 so pass the proj string.
    url: "https://dataverse.harvard.edu/api/access/datafile/4931787",
    dbf: "ar_2020.dbf",
    shp: "ar_2020.shp",
    join: "geometry",
    censusFips: "05",
    reprojectFrom: "+proj=utm +zone=15 +datum=NAD83 +units=m +no_defs",
    cols: {
      d: "G20PREDBID",
      r: "G20PRERTRU",
      o: ["G20PRELJOR", "G20PREGHAW", "G20PRECBLA", "G20PREACAR", "G20PREOMYE", "G20PRESLAR", "G20PREIWES", "G20PREICOL", "G20PREIPIE", "G20PREIGAM", "G20PREIFUE"],
    },
  },
  WV: {
    url: "https://dataverse.harvard.edu/api/access/datafile/6418344",
    dbf: "wv_2020.dbf",
    shp: "wv_2020.shp",
    join: "geometry",
    censusFips: "54",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREMHAW"] },
  },
  ID: {
    url: "https://dataverse.harvard.edu/api/access/datafile/4789401",
    dbf: "id_2020.dbf",
    shp: "id_2020.shp",
    join: "geometry",
    censusFips: "16",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREIWES", "G20PREIPIE", "G20PREIBLA", "G20PREIFUE"] },
  },
  SD: {
    url: "https://dataverse.harvard.edu/api/access/datafile/6082788",
    dbf: "sd_2020.dbf",
    shp: "sd_2020.shp",
    join: "geometry",
    censusFips: "46",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR"] },
  },
  ND: {
    url: "https://dataverse.harvard.edu/api/access/datafile/5342900",
    dbf: "nd_2020.dbf",
    shp: "nd_2020.shp",
    join: "geometry",
    censusFips: "38",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PREOWRI"] },
  },
  DE: {
    // de_2020.zip within doi:10.7910/DVN/K7760H — .prj is Web Mercator.
    url: "https://dataverse.harvard.edu/api/access/datafile/4773531",
    dbf: "de_2020.dbf",
    shp: "de_2020.shp",
    join: "geometry",
    censusFips: "10",
    vestSR: "3857",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW"] },
  },
  VT: {
    url: "https://dataverse.harvard.edu/api/access/datafile/5739919",
    dbf: "vt_2020.dbf",
    shp: "vt_2020.shp",
    join: "geometry",
    censusFips: "50",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREIWES", "G20PREOOTH", "G20PREOSAN", "G20PREOWRI"] },
  },
  WY: {
    url: "https://dataverse.harvard.edu/api/access/datafile/4789404",
    dbf: "wy_2020.dbf",
    shp: "wy_2020.shp",
    join: "geometry",
    censusFips: "56",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREIPIE", "G20PREOWRI"] },
  },
  RI: {
    // ri_2020.zip within doi:10.7910/DVN/K7760H — dbf carries GEOID20.
    url: "https://dataverse.harvard.edu/api/access/datafile/11070053",
    dbf: "ri_2020.dbf",
    join: "geoid20",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREADEL", "G20PRESLAR", "G20PREOCAR", "G20PREOWRI"] },
  },
  MS: {
    url: "https://dataverse.harvard.edu/api/access/datafile/5706487",
    dbf: "ms_2020.dbf",
    join: "geoid20",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREABLA", "G20PREOCAR", "G20PREIWES", "G20PREICOL", "G20PREIPIE"] },
  },
  OK: {
    url: "https://dataverse.harvard.edu/api/access/datafile/5790364",
    dbf: "ok_2020.dbf",
    shp: "ok_2020.shp",
    join: "geometry",
    censusFips: "40",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREIWES", "G20PREISIM", "G20PREIPIE"] },
  },
  NJ: {
    // nj_2020_vtd_estimates.zip — .prj is NAD83 New Jersey State Plane (US ft).
    url: "https://dataverse.harvard.edu/api/access/datafile/12070364",
    dbf: "nj_2020_vtd_estimates.dbf",
    shp: "nj_2020_vtd_estimates.shp",
    join: "geometry",
    censusFips: "34",
    reprojectFrom:
      'PROJCS["NAD83_New_Jersey_ftUS",GEOGCS["GCS_North_American_1983",DATUM["D_North_American_1983",SPHEROID["GRS_1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",38.83333333333334],PARAMETER["central_meridian",-74.5],PARAMETER["scale_factor",0.9999],PARAMETER["false_easting",492125],PARAMETER["false_northing",0],UNIT["Foot_US",0.30480060960121924]]',
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PRECBLA", "G20PRESLAR", "G20PREUHAM", "G20PREADEL"] },
  },
  MA: {
    url: "https://dataverse.harvard.edu/api/access/datafile/5007849",
    dbf: "ma_2020.dbf",
    shp: "ma_2020.shp",
    join: "geometry",
    censusFips: "25",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREOWRI"] },
  },
  AL: {
    url: "https://dataverse.harvard.edu/api/access/datafile/4751074",
    dbf: "al_2020.dbf",
    join: "geoid20",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREOWRI"] },
  },
  LA: {
    url: "https://dataverse.harvard.edu/api/access/datafile/5739918",
    dbf: "la_2020.dbf",
    shp: "la_2020.shp",
    join: "geometry",
    censusFips: "22",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREOWES", "G20PREOOTH"] },
  },
  FL: {
    url: "https://dataverse.harvard.edu/api/access/datafile/12070362",
    dbf: "fl_2020.dbf",
    shp: "fl_2020.shp",
    join: "geometry",
    censusFips: "12",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREODEL", "G20PRESLAR", "G20PRECBLA", "G20PREOWRI"] },
  },
  IL: {
    url: "https://dataverse.harvard.edu/api/access/datafile/4773525",
    dbf: "il_2020.dbf",
    join: "geoid20",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREACAR", "G20PRESLAR"] },
  },
  NY: {
    // .prj is Web Mercator.
    url: "https://dataverse.harvard.edu/api/access/datafile/5259468",
    dbf: "ny_2020.dbf",
    shp: "ny_2020.shp",
    join: "geometry",
    censusFips: "36",
    vestSR: "3857",
    cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREIPIE", "G20PREOWRI"] },
  },
};

const usps = (process.argv[2] || "OH").toUpperCase();
const cfg = VEST[usps];
if (!cfg) {
  console.error(`No precinct-results source configured for ${usps}`);
  process.exit(1);
}

/**
 * Pull one named entry out of a .zip buffer via the central directory (robust to
 * streamed zips that put sizes in a trailing data descriptor, as Dataverse does).
 */
function unzipEntry(buf, wantName) {
  // End of Central Directory: scan backwards for its signature.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 22 - 65536; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("no EOCD record");
  const count = buf.readUInt16LE(eocd + 10);
  let o = buf.readUInt32LE(eocd + 16);

  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(o) !== 0x02014b50) throw new Error("bad central dir entry");
    const method = buf.readUInt16LE(o + 10);
    const compSize = buf.readUInt32LE(o + 20);
    const nameLen = buf.readUInt16LE(o + 28);
    const extraLen = buf.readUInt16LE(o + 30);
    const commentLen = buf.readUInt16LE(o + 32);
    const localOff = buf.readUInt32LE(o + 42);
    const name = buf.toString("ascii", o + 46, o + 46 + nameLen);
    o += 46 + nameLen + extraLen + commentLen;
    if (name !== wantName && !name.endsWith("/" + wantName)) continue;

    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const comp = buf.subarray(dataStart, dataStart + compSize);
    return method === 0 ? comp : inflateRawSync(comp);
  }
  throw new Error(`${wantName} not found in zip`);
}

/** Minimal DBF reader (dBASE III/IV numeric + character fields). */
function readDbf(buf) {
  const recordCount = buf.readUInt32LE(4);
  const headerLen = buf.readUInt16LE(8);
  const recordLen = buf.readUInt16LE(10);
  const fields = [];
  let o = 32;
  while (buf[o] !== 0x0d && o < headerLen) {
    fields.push({
      name: buf.toString("ascii", o, o + 11).replace(/\0.*$/, ""),
      type: String.fromCharCode(buf[o + 11]),
      length: buf[o + 16],
    });
    o += 32;
  }
  const rows = [];
  for (let i = 0; i < recordCount; i++) {
    const start = headerLen + i * recordLen;
    if (buf[start] === 0x2a) continue;
    let p = start + 1;
    const row = {};
    for (const f of fields) {
      // Some publishers (e.g. VEST TX 2020) NUL-pad numeric fields instead of
      // space-padding them; strip NULs before parsing or Number() yields NaN.
      const raw = buf.toString("ascii", p, p + f.length).replace(/\0/g, "").trim();
      p += f.length;
      row[f.name] = f.type === "N" || f.type === "F" ? (raw === "" ? 0 : Number(raw)) : raw;
    }
    rows.push(row);
  }
  return rows;
}

async function loadDbfBuffer() {
  // allow a pre-downloaded copy in the scratch dir / cwd to avoid re-fetching
  const local = process.argv[3];
  if (local && existsSync(local)) {
    console.log(`using local ${local}`);
    return local.endsWith(".dbf") ? readFileSync(local) : unzipEntry(readFileSync(local), cfg.dbf);
  }
  console.log(`downloading VEST ${usps} 2020 (~16 MB)…`);
  const res = await fetch(cfg.url);
  if (!res.ok) throw new Error(`Dataverse ${res.status}`);
  return unzipEntry(Buffer.from(await res.arrayBuffer()), cfg.dbf);
}

const votes = (p) => [
  Math.round(p[cfg.cols.d] || 0),
  Math.round(p[cfg.cols.r] || 0),
  cfg.cols.o.reduce((s, c) => s + Math.round(p[c] || 0), 0),
];
const norm = (s) => String(s).toUpperCase().replace(/\s+/g, " ").trim();

/** Ray-casting point-in-polygon against one GeoJSON ring ([ [lng,lat], ... ]). */
function inRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (
      yi > pt[1] !== yj > pt[1] &&
      pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi
    )
      inside = !inside;
  }
  return inside;
}
function inFeature(pt, geom) {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  for (const poly of polys) {
    if (!inRing(pt, poly[0])) continue;
    if (poly.slice(1).some((hole) => inRing(pt, hole))) continue;
    return true;
  }
  return false;
}

const bboxOf = (geom) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  for (const poly of polys) for (const [x, y] of poly[0]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
};
const centroidOf = (geom) => {
  const ring = geom.type === "Polygon" ? geom.coordinates[0] : geom.coordinates[0][0];
  let cx = 0, cy = 0;
  for (const [x, y] of ring) { cx += x; cy += y; }
  return [cx / ring.length, cy / ring.length];
};

/** geometry mode: fold each VEST precinct's votes into the Census VTD that
 *  contains ITS centroid — so every VEST precinct is counted exactly once and
 *  the statewide total is exact (unlike matching the other way, where one VEST
 *  precinct can land under several VTDs). VTDs that receive nothing get no `pr`
 *  and fall back to county shading. Returns Map<"<geoid>", [d,r,o]>. */
async function geometryJoin() {
  const { read } = await import("shapefile");
  const src = process.argv[3];
  const buf = src && existsSync(src)
    ? readFileSync(src)
    : Buffer.from(await (await fetch(cfg.url)).arrayBuffer());
  // Geometry from the .shp; attributes from the .dbf via the local NUL-tolerant
  // reader (the shapefile package drops NUL-padded numeric fields to null).
  // .shp and .dbf records are 1:1 in the same order.
  const srcReader = await read(unzipEntry(buf, cfg.shp));
  const dbfRows = readDbf(unzipEntry(buf, cfg.dbf));
  // A custom projected VEST CRS with no clean EPSG for TIGERweb: convert each
  // centroid to lon/lat and treat the join as geographic.
  let toWgs = null;
  if (cfg.reprojectFrom) {
    const proj4 = (await import("proj4")).default;
    toWgs = proj4(cfg.reprojectFrom, "WGS84");
  }
  const vest = [];
  (srcReader.features ?? []).forEach((f, i) => {
    if (!f.geometry) return;
    let c = centroidOf(f.geometry);
    if (toWgs) c = toWgs.forward(c);
    vest.push({ v: votes(dbfRows[i] ?? {}), c });
  });
  console.log(`  ${vest.length} VEST precincts`);

  // maxAllowableOffset / geometryPrecision are in the OUT SR's units: a few tens
  // of feet for a projected SR, but a fraction of a degree for lon/lat.
  const geographic = !cfg.vestSR || cfg.vestSR === "4326";
  const url =
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer/58/query?" +
    new URLSearchParams({
      where: `STATE='${cfg.censusFips}'`,
      outFields: "VTD,COUNTY",
      returnGeometry: "true",
      geometryPrecision: geographic ? "6" : "1",
      maxAllowableOffset: geographic ? "0.0005" : "30",
      outSR: cfg.vestSR ?? "4326",
      f: "geojson",
    });
  console.log("fetching Census VTD polygons…");
  const fc = await (await fetch(url)).json();
  const vtds = fc.features.map((f) => ({
    geoid: cfg.censusFips + f.properties.COUNTY + f.properties.VTD,
    geom: f.geometry,
    bbox: bboxOf(f.geometry),
  }));

  const out = new Map();
  let dropped = 0;
  for (const p of vest) {
    let hit = null;
    for (const v of vtds) {
      if (p.c[0] < v.bbox[0] || p.c[0] > v.bbox[2] || p.c[1] < v.bbox[1] || p.c[1] > v.bbox[3]) continue;
      if (inFeature(p.c, v.geom)) { hit = v; break; }
    }
    if (!hit) { dropped += 1; continue; }
    const cur = out.get(hit.geoid) ?? [0, 0, 0];
    out.set(hit.geoid, [cur[0] + p.v[0], cur[1] + p.v[1], cur[2] + p.v[2]]);
  }
  if (dropped) console.log(`  ${dropped} VEST precincts fell outside every VTD`);
  return out;
}

async function main() {
  let byKey;
  if (cfg.join === "geometry") {
    byKey = await geometryJoin();
  } else {
    const rows = readDbf(await loadDbfBuffer());
    byKey = new Map();
    for (const r of rows) {
      if ((cfg.join ?? "geoid20") === "geoid20") {
        if (r.GEOID20) byKey.set(r.GEOID20, votes(r));
      } else {
        const n = Number(r[cfg.countyIdCol]);
        if (!n) continue;
        const fips = String(cfg.stateFips) + String(2 * n - 1).padStart(3, "0");
        byKey.set(`${fips}:${norm(r[cfg.precIdCol])}`, votes(r));
      }
    }
  }
  console.log(`  ${byKey.size} precinct results`);

  const dir = resolve(__dirname, `../app/data/geo/precincts/${usps}`);
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  let matched = 0;
  let missed = 0;
  for (const file of files) {
    const path = resolve(dir, file);
    const geo = JSON.parse(readFileSync(path, "utf8"));
    for (const p of geo.precincts) {
      const key =
        cfg.join === "precid"
          ? `${geo.countyFips}:${norm(p.name)}`
          : geo.countyFips + p.id;
      const pr = byKey.get(key);
      if (pr) {
        p.pr = pr;
        matched += 1;
      } else {
        delete p.pr;
        missed += 1;
      }
    }
    writeFileSync(path, JSON.stringify(geo));
  }
  console.log(`joined ${matched} precincts across ${files.length} counties (${missed} without a result)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
