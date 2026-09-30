#!/usr/bin/env node
/**
 * U.S. House / president / senate results by congressional district for
 * WI / NV / TX, written to app/data/districtHouse.generated.json (House) and
 * app/data/districtResults.generated.json (president + senate).
 *
 *   node scripts/build-districts.mjs <USPS> <src-dir>
 *
 * WI and NV kept their 2021 maps through 2024 and into 2026, so their House
 * vote comes straight from MEDSL's `district` column. TEXAS redrew mid-decade
 * for 2026: app/data/geo/TX.districts.json is the NEW 38-seat map, but the
 * 2022 and 2024 House elections ran on the OLD map, so TX House votes are
 * re-aggregated onto the new lines through the VEST 2020 precinct key
 * (CNTYKEY+PREC) -> new district crosswalk.
 *
 * President/senate by district:
 *   2020            — VEST 2020 precinct shapes -> new district (exact)
 *   other cycles    — county results split across the county's districts by
 *                     2020 VTD population (a lean indicator, not a tally)
 *
 * <src-dir> holds: <st>_2020.{shp,dbf}, the 2022 + 2024 MEDSL precinct CSVs
 * (<st>22.csv, <st>24.csv), and countyResults.generated.json is read from the
 * repo.
 */
import { readFileSync, writeFileSync, readdirSync, createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const USPS = (process.argv[2] || "").toUpperCase();
const SRC = process.argv[3];
if (!USPS || !SRC) throw new Error("usage: build-districts.mjs <USPS> <src-dir>");

const TX_LAMBERT =
  'PROJCS["NAD_1983_Lambert_Conformal_Conic",GEOGCS["GCS_North_American_1983",DATUM["D_North_American_1983",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Lambert_Conformal_Conic"],PARAMETER["False_Easting",1000000.0],PARAMETER["False_Northing",1000000.0],PARAMETER["Central_Meridian",-100.0],PARAMETER["Standard_Parallel_1",27.41666666666667],PARAMETER["Standard_Parallel_2",34.91666666666666],PARAMETER["Latitude_Of_Origin",31.16666666666667],UNIT["Meter",1.0]]';

const CONFIG = {
  WI: {
    fips: "55", nDistricts: 8, reprojectFrom: "EPSG:3857",
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    countyKeys: ["2016-president", "2016-senate", "2018-senate", "2022-senate", "2024-president", "2024-senate"],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Johnson", D: "Feingold" },
      "2018-senate": { R: "Vukmir", D: "Baldwin" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2022-senate": { R: "Johnson", D: "Barnes" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Hovde", D: "Baldwin" },
    },
  },
  NV: {
    fips: "32", nDistricts: 4, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    countyKeys: ["2016-president", "2016-senate", "2018-senate", "2022-senate", "2024-president", "2024-senate"],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Heck", D: "Cortez Masto" },
      "2018-senate": { R: "Heller", D: "Rosen" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2022-senate": { R: "Laxalt", D: "Cortez Masto" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Brown", D: "Rosen" },
    },
  },
  TX: {
    fips: "48", nDistricts: 38, reprojectFrom: TX_LAMBERT,
    houseFromDistrictColumn: false, // redrawn — bridge through VEST precinct key
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDHEG", r: "G20USSRCOR" },
    countyKeys: ["2016-president", "2018-senate", "2024-president", "2024-senate"],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2018-senate": { R: "Cruz", D: "O'Rourke" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Cornyn", D: "Hegar" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Cruz", D: "Allred" },
    },
  },
  VA: {
    fips: "51", nDistricts: 11, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDWAR", r: "G20USSRGAD" },
    countyKeys: ["2016-president", "2018-senate", "2024-president", "2024-senate"],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2018-senate": { R: "Stewart", D: "Kaine" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Gade", D: "Warner" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Cao", D: "Kaine" },
    },
  },
  NH: {
    fips: "33", nDistricts: 2, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDSHA", r: "G20USSRMES" },
    countyKeys: ["2016-president", "2016-senate", "2022-senate", "2024-president"],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Ayotte", D: "Hassan" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Messner", D: "Shaheen" },
      "2022-senate": { R: "Bolduc", D: "Hassan" },
      "2024-president": { R: "Trump", D: "Harris" },
    },
  },
  MN: {
    // VEST MN is NAD83 / UTM zone 15N (EPSG:26915); proj4 needs the full string.
    fips: "27", nDistricts: 8, reprojectFrom: "+proj=utm +zone=15 +datum=NAD83 +units=m +no_defs",
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDSMI", r: "G20USSRLEW" },
    // Hennepin + Ramsey each split between an urban and a suburban seat, so
    // allocating a county's blended margin by population smears MN-3/4/5. Keep
    // only 2020 (VEST precinct geometry, exact); the tip falls back to that lean
    // plus the House vote — same choice as Arizona/Maricopa.
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2018-senate": { R: "Housley", D: "Smith" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Lewis", D: "Smith" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "White", D: "Klobuchar" },
    },
  },
  CO: {
    fips: "08", nDistricts: 8, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDHIC", r: "G20USSRGAR" },
    countyKeys: ["2016-president", "2016-senate", "2022-senate", "2024-president"],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Glenn", D: "Bennet" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Gardner", D: "Hickenlooper" },
      "2022-senate": { R: "O'Dea", D: "Bennet" },
      "2024-president": { R: "Trump", D: "Harris" },
    },
  },
  NM: {
    fips: "35", nDistricts: 3, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDLUJ", r: "G20USSRRON" },
    // Bernalillo (a third of the state) is cracked across all 3 seats, so a
    // population-allocated county margin smears NM-2 (the swing seat). Keep only
    // 2020 (VEST geometry) + House — same choice as Arizona/Minnesota.
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2018-senate": { R: "Rich", D: "Heinrich" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Ronchetti", D: "Luján" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Domenici", D: "Heinrich" },
    },
  },
  KS: {
    fips: "20", nDistricts: 4, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDBOL", r: "G20USSRMAR" },
    // Wyandotte + Johnson are cracked between KS-2 and KS-3 (the "Ad Astra"
    // gerrymander), so keep only 2020 (VEST geometry) + House by district.
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Moran", D: "Wiesner" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Marshall", D: "Bollier" },
      "2022-senate": { R: "Moran", D: "Holland" },
      "2024-president": { R: "Trump", D: "Harris" },
    },
  },
  IA: {
    fips: "19", nDistricts: 4, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDGRE", r: "G20USSRERN" },
    // Iowa law keeps every county whole within a congressional district, so the
    // county-population split is exact.
    countyKeys: ["2016-president", "2022-senate", "2024-president"],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Ernst", D: "Greenfield" },
      "2022-senate": { R: "Grassley", D: "Franken" },
      "2024-president": { R: "Trump", D: "Harris" },
    },
  },
  ME: {
    fips: "23", nDistricts: 2, reprojectFrom: null, cdPolygons: true,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDGID", r: "G20USSRCOL" },
    // Only 6 of 16 counties have Census VTDs, so there is no statewide
    // precinct->district population map for county allocation. 2020 (VEST via
    // the district polygons) + House only.
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Collins", D: "Gideon" },
      "2024-president": { R: "Trump", D: "Harris" },
    },
  },
  MT: {
    fips: "30", nDistricts: 2, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDBUL", r: "G20USSRDAI" },
    countyKeys: ["2016-president", "2018-senate", "2024-president", "2024-senate"],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2018-senate": { R: "Rosendale", D: "Tester" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Daines", D: "Bullock" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Sheehy", D: "Tester" },
    },
  },
  NE: {
    fips: "31", nDistricts: 3, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDJAN", r: "G20USSRSAS" },
    countyKeys: ["2016-president", "2018-senate", "2024-president", "2024-senate"],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2018-senate": { R: "Fischer", D: "Raybould" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Sasse", D: "Janicek" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Ricketts", D: "Love" },
    },
  },
  OR: {
    // Oregon has no Census VTDs — match VEST to the district polygons, and there
    // is no precinct->district map for county allocation. VEST .prj is a HARN
    // Oregon Lambert (no clean EPSG for proj4) so pass the WKT.
    fips: "41", nDistricts: 6, cdPolygons: true,
    reprojectFrom:
      'PROJCS["NAD_1983_HARN_StatePlane_Oregon_North_FIPS_3601_Feet_Intl",GEOGCS["GCS_North_American_1983_HARN",DATUM["D_North_American_1983_HARN",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Lambert_Conformal_Conic"],PARAMETER["False_Easting",8202099.738],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",-120.5],PARAMETER["Standard_Parallel_1",44.3333333333333],PARAMETER["Standard_Parallel_2",46.0],PARAMETER["Latitude_Of_Origin",43.6666666666667],UNIT["foot",0.3048]]',
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDMER", r: "G20USSRPER" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Perkins", D: "Merkley" },
      "2024-president": { R: "Trump", D: "Harris" },
    },
  },
  AK: {
    // Single at-large district. VEST -> AK-1 for everyone; House RCV first-choice
    // from the MEDSL `district`=STATEWIDE rows.
    fips: "02", nDistricts: 1, reprojectFrom: null,
    houseFromDistrictColumn: true, atLarge: true,
    houseCand: { d: /PELTOLA/, r: /BEGICH|YOUNG|PALIN/ },
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDGRO", r: "G20USSRSUL" },
    countyKeys: [],
    // Alaska's House race is decided by ranked-choice; use the certified
    // final-round two-party result rather than the first-choice tallies.
    houseOverride: {
      1: {
        "2022": { winner: "D", dPct: 55, rPct: 45, marginPct: 9.9 }, // Peltola d. Palin
        "2024": { winner: "R", dPct: 48.8, rPct: 51.2, marginPct: 2.6 }, // Begich d. Peltola
      },
    },
    who: {
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Sullivan", D: "Gross" },
    },
  },
  SC: {
    fips: "45", nDistricts: 7,
    reprojectFrom:
      'PROJCS["NAD_1983_2011_StatePlane_South_Carolina_FIPS_3900_Ft_Intl",GEOGCS["GCS_NAD_1983_2011",DATUM["D_NAD_1983_2011",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Lambert_Conformal_Conic"],PARAMETER["False_Easting",1999996.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",-81.0],PARAMETER["Standard_Parallel_1",32.5],PARAMETER["Standard_Parallel_2",34.83333333333334],PARAMETER["Latitude_Of_Origin",31.83333333333333],UNIT["Foot",0.3048]]',
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDHAR", r: "G20USSRGRA" },
    countyKeys: ["2016-president", "2016-senate", "2022-senate", "2024-president"],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Scott", D: "Dixon" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Graham", D: "Harrison" },
      "2022-senate": { R: "Scott", D: "Matthews" },
      "2024-president": { R: "Trump", D: "Harris" },
    },
  },
  IN: {
    fips: "18", nDistricts: 9, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    countyKeys: ["2016-president", "2016-senate", "2018-senate", "2024-president", "2024-senate"],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Young", D: "Bayh" },
      "2018-senate": { R: "Braun", D: "Donnelly" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Banks", D: "McCormick" },
    },
  },
  WA: {
    fips: "53", nDistricts: 10, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    // King County spans WA-1/7/8/9 — allocating its blended D margin smears the
    // Seattle seats. 2020 (VEST geometry) + House only.
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Vance", D: "Murray" },
      "2018-senate": { R: "Hutchison", D: "Cantwell" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2022-senate": { R: "Smiley", D: "Murray" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Garcia", D: "Cantwell" },
    },
  },
  CT: {
    // Every CT district crosses county lines and the big counties (Hartford, New
    // Haven, Fairfield) are split, so county-allocation smears all 5 — 2020
    // (VEST geometry) + House only. No 2020 CT Senate race.
    fips: "09", nDistricts: 5, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Carter", D: "Blumenthal" },
      "2018-senate": { R: "Corey", D: "Murphy" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2022-senate": { R: "Levy", D: "Blumenthal" },
      "2024-president": { R: "Trump", D: "Harris" },
    },
  },
  TN: {
    // Davidson (Nashville) is cracked three ways and Shelby (Memphis) is split —
    // county-allocation smears TN-5/6/7/8/9. 2020 (VEST geometry) + House only.
    fips: "47", nDistricts: 9, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDBRA", r: "G20USSRHAG" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2018-senate": { R: "Blackburn", D: "Bredesen" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Hagerty", D: "Bradshaw" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Blackburn", D: "Johnson" },
    },
  },
  MD: {
    // Montgomery, Prince George's, Anne Arundel and Baltimore County are each
    // split across several seats (the MD gerrymander) — 2020 (VEST geometry) +
    // House only. .prj is Web Mercator. No 2020 MD Senate race.
    fips: "24", nDistricts: 8, reprojectFrom: "EPSG:3857",
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Szeliga", D: "Van Hollen" },
      "2018-senate": { R: "Campbell", D: "Cardin" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2022-senate": { R: "Chaffee", D: "Van Hollen" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Hogan", D: "Alsobrooks" },
    },
  },
  MO: {
    // St. Louis County (MO-1/2/3) and Jackson County / Kansas City (MO-4/5) are
    // split, and Jackson's precinct data is incomplete anyway — 2020 (VEST
    // geometry) + House only.
    fips: "29", nDistricts: 8, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Blunt", D: "Kander" },
      "2018-senate": { R: "Hawley", D: "McCaskill" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2024-senate": { R: "Hawley", D: "Kunce" },
    },
  },
  CA: {
    // California has no Census 2020 VTDs — cdPolygons matches VEST centroids
    // straight to the congressional-district shapes. Prop 50 (Nov 2025) redrew
    // the map mid-decade, so the House `district` column is on the old lines —
    // skipHouse. .prj is Web Mercator. No 2020 CA Senate race.
    fips: "06", nDistricts: 52, reprojectFrom: "EPSG:3857", cdPolygons: true,
    skipHouse: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Garvey", D: "Schiff" },
    },
  },
  FL: {
    fips: "12", nDistricts: 28, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Rubio", D: "Murphy" },
      "2018-senate": { R: "Scott", D: "Nelson" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2022-senate": { R: "Rubio", D: "Demings" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Scott", D: "Mucarsel-Powell" },
    },
  },
  IL: {
    fips: "17", nDistricts: 17, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDDUR", r: "G20USSRCUR" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Kirk", D: "Duckworth" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Curran", D: "Durbin" },
      "2022-senate": { R: "Salvi", D: "Duckworth" },
      "2024-president": { R: "Trump", D: "Harris" },
    },
  },
  NY: {
    // .prj is Web Mercator. NY's 2024 map (layer 0) is the current one.
    fips: "36", nDistricts: 26, reprojectFrom: "EPSG:3857",
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Long", D: "Schumer" },
      "2018-senate": { R: "Farley", D: "Gillibrand" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Sapraicone", D: "Gillibrand" },
    },
  },
  NJ: {
    // .prj is NAD83 New Jersey State Plane (US ft). NJ kept its 12-seat map, but
    // MEDSL's nj24.csv is broken (6 of 12 districts empty) so House is 2022 only.
    fips: "34", nDistricts: 12,
    reprojectFrom:
      'PROJCS["NAD83_New_Jersey_ftUS",GEOGCS["GCS_North_American_1983",DATUM["D_North_American_1983",SPHEROID["GRS_1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",38.83333333333334],PARAMETER["central_meridian",-74.5],PARAMETER["scale_factor",0.9999],PARAMETER["false_easting",492125],PARAMETER["false_northing",0],UNIT["Foot_US",0.30480060960121924]]',
    houseFromDistrictColumn: true, houseYears: ["2022"],
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDBOO", r: "G20USSRMEH" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2018-senate": { R: "Hugin", D: "Menendez" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Mehta", D: "Booker" },
      "2024-senate": { R: "Bashaw", D: "Kim" },
    },
  },
  MA: {
    fips: "25", nDistricts: 9, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDMAR", r: "G20USSROCO" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2018-senate": { R: "Diehl", D: "Warren" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "O'Connor", D: "Markey" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Deaton", D: "Warren" },
    },
  },
  AL: {
    // Alabama redrew for 2024 (new majority-Black AL-2) — House is 2024 only.
    fips: "01", nDistricts: 7, reprojectFrom: null,
    houseFromDistrictColumn: true, houseYears: ["2024"],
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDJON", r: "G20USSRTUB" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Shelby", D: "Crumpton" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Tuberville", D: "Jones" },
      "2022-senate": { R: "Britt", D: "Boyd" },
      "2024-president": { R: "Trump", D: "Harris" },
    },
  },
  LA: {
    // Louisiana redrew for 2024 (new majority-Black LA-6) — House is 2024 only.
    // Jungle-primary Senate results are the November all-party first round; the
    // Democratic column sums every Democrat on the ballot.
    fips: "22", nDistricts: 6, reprojectFrom: null,
    houseFromDistrictColumn: true, houseYears: ["2024"],
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDPER", r: "G20USSRCAS" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Kennedy", D: "Campbell" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Cassidy", D: "Perkins" },
      "2022-senate": { R: "Kennedy", D: "Chambers" },
      "2024-president": { R: "Trump", D: "Harris" },
    },
  },
  DE: {
    fips: "10", nDistricts: 1, reprojectFrom: "EPSG:3857",
    houseFromDistrictColumn: true, atLarge: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDCOO", r: "G20USSRWIT" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Witzke", D: "Coons" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Hansen", D: "Blunt Rochester" },
    },
  },
  VT: {
    fips: "50", nDistricts: 1, reprojectFrom: null,
    houseFromDistrictColumn: true, atLarge: true,
    houseCand: { d: /BALINT/, r: /MADDEN|COESTER/ },
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    countyKeys: ["2016-president", "2016-senate", "2018-senate", "2022-senate", "2024-president", "2024-senate"],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Milne", D: "Leahy" },
      "2018-senate": { R: "Zupan", D: "Sanders" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2022-senate": { R: "Malloy", D: "Welch" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Malloy", D: "Sanders" },
    },
  },
  WY: {
    fips: "56", nDistricts: 1, reprojectFrom: null,
    houseFromDistrictColumn: true, atLarge: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDDAV", r: "G20USSRLUM" },
    countyKeys: ["2016-president", "2018-senate", "2024-president", "2024-senate"],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2018-senate": { R: "Barrasso", D: "Trauner" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Lummis", D: "Ben-David" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Barrasso", D: "Morrow" },
    },
  },
  HI: {
    // Hawaii has no Census 2020 VTDs — match VEST centroids straight to the
    // congressional-district polygons. .prj is WGS84. No 2020 HI Senate race.
    fips: "15", nDistricts: 2, reprojectFrom: null, cdPolygons: true,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2022-senate": { R: "McDermott", D: "Schatz" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "McDermott", D: "Hirono" },
    },
  },
  RI: {
    fips: "44", nDistricts: 2, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDREE", r: "G20USSRWAT" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2018-senate": { R: "Flanders", D: "Whitehouse" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Waters", D: "Reed" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "de la Cruz", D: "Whitehouse" },
    },
  },
  MS: {
    // Hinds (Jackson) is split MS-2/MS-3 and MS-2 is the Delta majority-Black
    // seat — 2020 (VEST geometry) + House only.
    fips: "28", nDistricts: 4, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDESP", r: "G20USSRHYD" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2018-senate": { R: "Wicker", D: "Baria" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Hyde-Smith", D: "Espy" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Wicker", D: "Pinkins" },
    },
  },
  OK: {
    // Oklahoma County is split OK-3/4/5 — 2020 (VEST geometry) + House only.
    fips: "40", nDistricts: 5, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDBRO", r: "G20USSRINH" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Lankford", D: "Workman" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Inhofe", D: "Broyles" },
      "2022-senate": { R: "Lankford", D: "Horn" },
      "2024-president": { R: "Trump", D: "Harris" },
    },
  },
  KY: {
    fips: "21", nDistricts: 6, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDMCG", r: "G20USSRMCC" },
    // Jefferson (Louisville) is KY-3 nearly whole; the rest of KY is whole
    // rural counties — allocation is close to exact.
    countyKeys: ["2016-president", "2016-senate", "2022-senate", "2024-president"],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Paul", D: "Gray" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "McConnell", D: "McGrath" },
      "2022-senate": { R: "Paul", D: "Booker" },
      "2024-president": { R: "Trump", D: "Harris" },
    },
  },
  AR: {
    // Pulaski (Little Rock) is cracked across all four seats (the 2022 AR
    // gerrymander) — 2020 (VEST geometry) + House only. .prj is UTM zone 15N.
    fips: "05", nDistricts: 4,
    reprojectFrom: "+proj=utm +zone=15 +datum=NAD83 +units=m +no_defs",
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Boozman", D: "Eldridge" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2022-senate": { R: "Boozman", D: "James" },
      "2024-president": { R: "Trump", D: "Harris" },
    },
  },
  WV: {
    // Census 2020 VTDs cover only 42 of 55 WV counties (Kanawha/Charleston is
    // missing), so match VEST centroids straight to the congressional-district
    // polygons. 2 districts. No county allocation (only 2 seats, split N/S).
    fips: "54", nDistricts: 2, reprojectFrom: null, cdPolygons: true,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDSWE", r: "G20USSRCAP" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2018-senate": { R: "Morrisey", D: "Manchin" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Capito", D: "Swearengin" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Justice", D: "Elliott" },
    },
  },
  ID: {
    // Ada (Boise) is split between ID-1 and ID-2; the rest is whole rural
    // counties. 2020 (VEST geometry) + House only.
    fips: "16", nDistricts: 2, reprojectFrom: null,
    houseFromDistrictColumn: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDJOR", r: "G20USSRRIS" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Crapo", D: "Stewart" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Risch", D: "Jordan" },
      "2022-senate": { R: "Crapo", D: "Roth" },
      "2024-president": { R: "Trump", D: "Harris" },
    },
  },
  SD: {
    fips: "46", nDistricts: 1, reprojectFrom: null,
    houseFromDistrictColumn: true, atLarge: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    vestSenate: { key: "2020-senate", d: "G20USSDAHL", r: "G20USSRROU" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Thune", D: "Williams" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2020-senate": { R: "Rounds", D: "Ahlers" },
      "2022-senate": { R: "Thune", D: "Bengs" },
      "2024-president": { R: "Trump", D: "Harris" },
    },
  },
  ND: {
    fips: "38", nDistricts: 1, reprojectFrom: null,
    houseFromDistrictColumn: true, atLarge: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Hoeven", D: "Glassheim" },
      "2018-senate": { R: "Cramer", D: "Heitkamp" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2022-senate": { R: "Hoeven", D: "Christiansen" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Cramer", D: "Christiansen" },
    },
  },
  UT: {
    // Utah has a NEW court-ordered congressional map for 2026 (the 2021
    // gerrymander that quartered Salt Lake County was struck; the remedial map
    // has a Salt Lake County-anchored seat). Layer 0 gives those new lines, so
    // the 2020 presidential aggregate by district is valid — but 2022/2024 House
    // ran on the old cracked map, so `skipHouse`. .prj is Web Mercator.
    fips: "49", nDistricts: 4, reprojectFrom: "EPSG:3857",
    skipHouse: true,
    vestPres: { d: "G20PREDBID", r: "G20PRERTRU" },
    countyKeys: [],
    who: {
      "2016-president": { R: "Trump", D: "Clinton" },
      "2016-senate": { R: "Lee", D: "Snow" },
      "2018-senate": { R: "Romney", D: "Wilson" },
      "2020-president": { R: "Trump", D: "Biden" },
      "2024-president": { R: "Trump", D: "Harris" },
      "2024-senate": { R: "Curtis", D: "Gleich" },
    },
  },
};
const cfg = CONFIG[USPS];
if (!cfg) throw new Error(`no config for ${USPS}`);

// ── geometry helpers ──────────────────────────────────────────────────
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
function readDbf(buf) {
  const headerLen = buf.readUInt16LE(8), recordLen = buf.readUInt16LE(10), count = buf.readUInt32LE(4);
  const fields = [];
  for (let p = 32; buf[p] !== 0x0d; p += 32)
    fields.push({ name: buf.toString("ascii", p, p + 11).replace(/\0.*$/, ""), length: buf[p + 16] });
  const rows = [];
  for (let i = 0; i < count; i++) {
    let p = headerLen + i * recordLen + 1;
    const r = {};
    for (const f of fields) { r[f.name] = buf.toString("ascii", p, p + f.length).replace(/\0/g, "").trim(); p += f.length; }
    rows.push(r);
  }
  return rows;
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
const shape = (t) => {
  const tot = t.d + t.r;
  const dPct = Math.round((t.d / tot) * 1000) / 10;
  const rPct = Math.round((t.r / tot) * 1000) / 10;
  return { winner: dPct >= rPct ? "D" : "R", dPct, rPct, marginPct: Math.round(Math.abs(dPct - rPct) * 10) / 10 };
};

async function main() {
  const { read } = await import("shapefile");
  let toWgs = null;
  if (cfg.reprojectFrom) toWgs = (await import("proj4")).default(cfg.reprojectFrom, "WGS84");

  // VTD -> new CD, and per-(county,VTD) population. Hawaii has no Census 2020
  // VTDs at all, so neither file exists — cdPolygons matches VEST straight to the
  // CD shapes and countyKeys is empty, so both maps stay empty.
  const djPath = resolve(root, `app/data/geo/${USPS}.districts.json`);
  const dj = existsSync(djPath) ? JSON.parse(readFileSync(djPath, "utf8")) : {};
  const vtdToCd = new Map();
  for (const [cd, byFips] of Object.entries(dj))
    for (const [fips, ids] of Object.entries(byFips))
      // Alaska's one district is keyed by its full label ("Congressional
      // District (at Large)"), not a number.
      for (const id of ids) vtdToCd.set(`${fips}:${id}`, cfg.atLarge ? 1 : Number(cd));
  const vtdPop = new Map();
  const precDir = resolve(root, `app/data/geo/precincts/${USPS}`);
  if (existsSync(precDir))
    for (const f of readdirSync(precDir)) {
      const g = JSON.parse(readFileSync(resolve(precDir, f), "utf8"));
      for (const p of g.precincts) vtdPop.set(`${g.countyFips}:${p.id}`, p.pop || 0);
    }

  // ── VEST 2020 precincts: geometry -> new CD ──────────────────────────
  const vestRaw = (await read(readFileSync(resolve(SRC, `${USPS.toLowerCase()}_2020.shp`)))).features;
  const vestDbf = readDbf(readFileSync(resolve(SRC, `${USPS.toLowerCase()}_2020.dbf`)));
  const vest = [];
  vestRaw.forEach((f, i) => {
    if (!f.geometry) return;
    let c = centroid(f.geometry);
    if (toWgs) c = toWgs.forward(c);
    vest.push({ c, p: vestDbf[i] ?? {} });
  });
  console.error(`  ${vest.length} VEST precincts`);

  const url =
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer/58/query?" +
    new URLSearchParams({
      where: `STATE='${cfg.fips}'`, outFields: "VTD,COUNTY", returnGeometry: "true",
      geometryPrecision: "6", maxAllowableOffset: "0.0005", outSR: "4326", f: "geojson",
    });
  console.error("fetching Census VTD polygons…");
  let vtds = (await (await fetch(url)).json()).features
    .map((f) => ({
      cd: vtdToCd.get(`${cfg.fips}${f.properties.COUNTY}:${f.properties.VTD}`),
      geom: f.geometry, bbox: bbox(f.geometry),
    }))
    .filter((v) => v.cd != null);

  // Maine's Census 2020 VTDs cover only 6 of 16 counties, so the VTD->CD path
  // drops most VEST precincts. Match VEST centroids against the congressional
  // district polygons themselves instead (full statewide coverage).
  if (cfg.cdPolygons) {
    const cdUrl =
      `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer/0/query?` +
      new URLSearchParams({
        where: `STATE='${cfg.fips}'`, outFields: "BASENAME", returnGeometry: "true",
        geometryPrecision: "6", maxAllowableOffset: "0.0005", outSR: "4326", f: "geojson",
      });
    console.error("fetching congressional-district polygons…");
    vtds = (await (await fetch(cdUrl)).json()).features
      .filter((f) => /^\d+$/.test(f.properties.BASENAME))
      .map((f) => ({ cd: Number(f.properties.BASENAME), geom: f.geometry, bbox: bbox(f.geometry) }));
  }

  const stateRaces = {};
  const vestKeyToCd = new Map(); // "<cntyFips3>:<prec>" -> new CD  (TX House bridge)
  let vestMatched = 0;
  for (const vp of vest) {
    let cd = null;
    for (const v of vtds) {
      if (vp.c[0] < v.bbox[0] || vp.c[0] > v.bbox[2] || vp.c[1] < v.bbox[1] || vp.c[1] > v.bbox[3]) continue;
      if (inFeature(vp.c, v.geom)) { cd = v.cd; break; }
    }
    if (cd == null) continue;
    vestMatched += 1;
    const b = (stateRaces[cd] ||= {});
    (b["2020-president"] ||= { d: 0, r: 0 }).d += +vp.p[cfg.vestPres.d] || 0;
    b["2020-president"].r += +vp.p[cfg.vestPres.r] || 0;
    if (cfg.vestSenate) {
      (b[cfg.vestSenate.key] ||= { d: 0, r: 0 }).d += +vp.p[cfg.vestSenate.d] || 0;
      b[cfg.vestSenate.key].r += +vp.p[cfg.vestSenate.r] || 0;
    }
    if (USPS === "TX") {
      const ck = vp.p.CNTYKEY, prec = vp.p.PREC, cnty = String(vp.p.CNTY).padStart(3, "0");
      if (ck && prec) vestKeyToCd.set(`${cnty}:${prec}`, cd);
    }
  }
  console.error(`  ${vestMatched}/${vest.length} VEST precincts placed in a district`);

  // ── House 2022 + 2024 ───────────────────────────────────────────────
  const houseByYear = {};
  // AL and LA redrew for 2024 (new court-ordered majority-Black seats), so their
  // 2022 House `district` column is on the old lines — `houseYears` restricts to
  // the cycles that ran on the current map.
  const files = [["2022", `${USPS.toLowerCase()}22.csv`], ["2024", `${USPS.toLowerCase()}24.csv`]]
    .filter(([y]) => !cfg.houseYears || cfg.houseYears.includes(y));

  if (cfg.skipHouse) {
    // The state has a new congressional map for 2026 (court-ordered redraw) but
    // no election has run on it yet, so the MEDSL `district` column refers to the
    // old lines and there is nothing valid to show per current district.
    console.error("  House by district skipped (new 2026 map, no election on it yet)");
  } else if (cfg.houseFromDistrictColumn) {
    // Two passes per file: pass 1 learns candidate -> D/R from any labelled row
    // (Nebraska's ballot is officially NONPARTISAN so the party is only in
    // party_detailed; Oregon's fusion voting splits a candidate across several
    // party lines and leaves most rows with a blank party). Pass 2 classifies
    // every vote row by candidate name and prefers a real TOTAL mode, falling
    // back to component / blank modes.
    const COMPONENT = /^(ELECTION DAY|EARLY VOTING|ABSENTEE|PROVISIONAL|MAIL|ADVANCE|IN-PERSON|ONE STOP)/;
    const isSummary = (c) => /^(TOTAL\b|TOTAL BALLOTS|UNDER ?VOTES?|OVER ?VOTES?|BLANKS?|EXHAUSTED|BALLOTS CAST|CAST VOTES|WRITE-?INS?$)/i.test(String(c || "").trim());
    const dr = (p) => { const s = String(p || "").toUpperCase(); return s.startsWith("DEMOCRAT") ? "d" : s.startsWith("REPUBLICAN") ? "r" : null; };
    for (const [year, file] of files) {
      const candSide = new Map();
      for (let pass = 1; pass <= 2; pass++) {
        const rl = createInterface({ input: createReadStream(resolve(SRC, file)) });
        let h = null;
        const total = {}, comp = {}; // "cd:s" -> votes
        for await (const line of rl) {
          if (!h) { h = splitLine(line).map((s) => s.toLowerCase().trim()); continue; }
          const r = splitLine(line);
          if (r[h.indexOf("office")] !== "US HOUSE") continue;
          const cand = String(r[h.indexOf("candidate")] || "").toUpperCase().replace(/\s+/g, " ").trim();
          if (isSummary(cand)) continue;
          if (pass === 1) {
            const s = dr(r[h.indexOf("party_simplified")]) || dr(r[h.indexOf("party_detailed")])
              || (cfg.houseCand ? (cfg.houseCand.d.test(cand) ? "d" : cfg.houseCand.r.test(cand) ? "r" : null) : null);
            if (s && cand) candSide.set(cand, s);
            continue;
          }
          const s = candSide.get(cand);
          const cd = cfg.atLarge ? 1 : parseInt(r[h.indexOf("district")], 10);
          if (!cd || !s) continue;
          const mode = String(r[h.indexOf("mode")] || "").toUpperCase();
          const bag = mode === "TOTAL" ? total : (mode === "" || COMPONENT.test(mode)) ? comp : null;
          if (!bag) continue;
          bag[`${cd}:${s}`] = (bag[`${cd}:${s}`] || 0) + (parseInt(r[h.indexOf("votes")], 10) || 0);
        }
        if (pass === 2) {
          const src = Object.keys(total).length ? total : comp;
          for (const [k, v] of Object.entries(src)) {
            const [cd, s] = k.split(":");
            ((houseByYear[cd] ||= {})[year] ||= { d: 0, r: 0 })[s] += v;
          }
        }
      }
    }
  } else {
    // TX: bridge MEDSL precinct (CNTYKEY+PREC) -> VEST precinct -> new CD.
    const cntykeyByFips3 = new Map();
    for (const row of vestDbf) {
      const cnty = String(row.CNTY).padStart(3, "0");
      if (row.CNTYKEY && !cntykeyByFips3.has(cnty)) cntykeyByFips3.set(cnty, String(row.CNTYKEY));
    }
    for (const [year, file] of files) {
      const rl = createInterface({ input: createReadStream(resolve(SRC, file)) });
      let h = null, matched = 0, missed = 0;
      const missByCounty = {}; // fips3 -> { d, r }
      const matchedByCounty = {}; // fips3 -> { cd -> { d, r } }
      for await (const line of rl) {
        if (!h) { h = splitLine(line).map((s) => s.toLowerCase().trim()); continue; }
        const r = splitLine(line);
        if (r[h.indexOf("office")] !== "US HOUSE" || r[h.indexOf("mode")] !== "TOTAL") continue;
        const p = r[h.indexOf("party_simplified")];
        const s = p === "DEMOCRAT" ? "d" : p === "REPUBLICAN" ? "r" : null;
        if (!s) continue;
        const v = parseInt(r[h.indexOf("votes")], 10) || 0;
        const fips5 = String(r[h.indexOf("county_fips")]).padStart(5, "0");
        if (!fips5.startsWith(cfg.fips)) continue;
        const fips3 = fips5.slice(2);
        const ck = cntykeyByFips3.get(fips3);
        // MEDSL's precinct id is spelled differently across cycles: 2024 uses
        // CNTYKEY+PREC ("571006"), 2022 uses PCTKEY+"_suffix" ("1131006_2020").
        // Try every reasonable derivation against the VEST key set.
        const rawPrec = String(r[h.indexOf("precinct")] || "").split("_")[0];
        const cands = [rawPrec];
        if (ck && rawPrec.startsWith(ck)) cands.push(rawPrec.slice(ck.length));
        if (rawPrec.startsWith(fips3)) cands.push(rawPrec.slice(3));
        let cd;
        for (const c of cands) { cd = vestKeyToCd.get(`${fips3}:${c}`); if (cd != null) break; }
        if (cd != null) {
          matched += v;
          ((houseByYear[cd] ||= {})[year] ||= { d: 0, r: 0 })[s] += v;
          ((matchedByCounty[fips3] ||= {})[cd] ||= { d: 0, r: 0 })[s] += v;
        } else {
          missed += v;
          (missByCounty[fips3] ||= { d: 0, r: 0 })[s] += v;
        }
      }
      // spread each county's unmatched House votes across that county's
      // districts in proportion to its matched vote there, falling back to VTD
      // population when nothing in the county matched.
      const popShare = {};
      for (const [key, cd] of vtdToCd) {
        const f3 = key.split(":")[0].slice(2);
        (popShare[f3] ||= {})[cd] = (popShare[f3][cd] || 0) + (vtdPop.get(key) || 0);
      }
      for (const [fips3, mm] of Object.entries(missByCounty)) {
        const mc = matchedByCounty[fips3];
        const weights = mc
          ? Object.fromEntries(Object.entries(mc).map(([cd, t]) => [cd, t.d + t.r]))
          : popShare[fips3];
        if (!weights) continue;
        const tot = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
        for (const [cd, w] of Object.entries(weights)) {
          const t = ((houseByYear[cd] ||= {})[year] ||= { d: 0, r: 0 });
          t.d += (mm.d * w) / tot;
          t.r += (mm.r * w) / tot;
        }
      }
      console.error(`  ${year} House: ${matched.toLocaleString()} votes bridged, ${missed.toLocaleString()} spread by fallback`);
    }
  }

  // ── county results split across a county's districts by VTD population ─
  const county = JSON.parse(readFileSync(resolve(root, "app/data/countyResults.generated.json"), "utf8"));
  const share = {};
  for (const [key, cd] of vtdToCd) {
    const [fips] = key.split(":");
    (share[fips] ||= {})[cd] = (share[fips][cd] || 0) + (vtdPop.get(key) || 0);
  }
  for (const rk of cfg.countyKeys) {
    const block = county[rk];
    if (!block) continue;
    for (const [fips, res] of Object.entries(block)) {
      if (!fips.startsWith(cfg.fips) || res.dVotes == null) continue;
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

  // ── write districtResults.generated.json ────────────────────────────
  const drPath = resolve(root, "app/data/districtResults.generated.json");
  let dr = {};
  try { dr = JSON.parse(readFileSync(drPath, "utf8")); } catch {}
  dr[USPS] = {};
  for (const [cd, races] of Object.entries(stateRaces)) {
    dr[USPS][cd] = {};
    for (const [rk, t] of Object.entries(races)) {
      if (!t.d && !t.r) continue;
      const s = shape(t);
      dr[USPS][cd][rk] = { winner: s.winner, dPct: s.dPct, rPct: s.rPct, who: cfg.who[rk]?.[s.winner] };
    }
  }
  writeFileSync(drPath, JSON.stringify(dr, null, 1) + "\n");

  // ── write districtHouse.generated.json ─────────────────────────────
  const dhPath = resolve(root, "app/data/districtHouse.generated.json");
  const dh = JSON.parse(readFileSync(dhPath, "utf8"));
  dh[USPS] = {};
  for (const [cd, byYear] of Object.entries(houseByYear)) {
    dh[USPS][cd] = {};
    for (const [yr, t] of Object.entries(byYear)) if (t.d || t.r) dh[USPS][cd][yr] = shape(t);
  }
  for (const [cd, byYear] of Object.entries(cfg.houseOverride ?? {}))
    dh[USPS][cd] = { ...(dh[USPS][cd] ?? {}), ...byYear };
  writeFileSync(dhPath, JSON.stringify(dh, null, 1) + "\n");

  console.error(`wrote ${USPS} -> districtResults + districtHouse`);
  for (let cd = 1; cd <= cfg.nDistricts; cd++) {
    const hh = dh[USPS][cd]?.["2024"], p = dr[USPS][cd]?.["2024-president"];
    console.error(`  ${USPS}-${cd}: 2024 House ${hh ? hh.winner + "+" + hh.marginPct : "?"}   2024 pres ${p ? p.winner + "+" + Math.abs(p.rPct - p.dPct).toFixed(1) : "?"}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
