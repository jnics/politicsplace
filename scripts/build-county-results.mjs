#!/usr/bin/env node
/**
 * County-level president + senate results for WI / NV / TX, merged into
 * app/data/countyResults.generated.json.
 *
 *   node scripts/build-county-results.mjs <USPS> <src-dir>
 *
 * <src-dir> holds (only the files a state's races reference are needed):
 *   countypres_2000-2016.csv  MEDSL github.com/MEDSL/county-returns      (2016 president, national)
 *   2016-precinct-senate.csv  MEDSL official-precinct-returns            (2016 senate, national)
 *   SENATE_precinct_general.csv  MEDSL 2018-elections-official/SENATE    (2018 senate, national)
 *   <st>22.csv                MEDSL 2022-elections-official individual   (2022 senate)
 *   <st>24.csv                MEDSL 2024-elections-official individual   (2024 president + senate)
 *   <st>_2020.dbf             VEST doi:10.7910/DVN/K7760H                (2020 president; TX also 2020 senate)
 *
 * Senate cycles: WI + NV run 2016 / 2018 / 2022 / 2024 (no 2020, no 2026).
 * TX runs 2018 / 2020 / 2024 (no 2016, no 2022; 2026 is upcoming — no results).
 */
import { readFileSync, writeFileSync, createReadStream, readdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const USPS = (process.argv[2] || "").toUpperCase();
const SRC = process.argv[3];
if (!USPS || !SRC) throw new Error("usage: build-county-results.mjs <USPS> <src-dir>");

// ── per-state race plan ───────────────────────────────────────────────
const CONFIG = {
  WI: {
    fips: "55",
    vest: { file: "wi_2020.dbf", countyCol: "CNTY_FIPS", countyKind: "geoid" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "sen2016", file: "2016-precinct-senate.csv" },
      { key: "2018-senate", src: "sen2018", file: "SENATE_precinct_general.csv" },
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PRECBLA"] } },
      { key: "2022-senate", src: "medsl", file: "wi22.csv", office: "US SENATE" },
      { key: "2024-president", src: "medsl", file: "wi24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "wi24.csv", office: "US SENATE" },
    ],
  },
  NV: {
    fips: "32",
    vest: { file: "nv_2020.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "sen2016", file: "2016-precinct-senate.csv" },
      { key: "2018-senate", src: "sen2018", file: "SENATE_precinct_general.csv" },
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREABLA", "G20PREONON"] } },
      { key: "2022-senate", src: "medsl", file: "nv22.csv", office: "US SENATE" },
      { key: "2024-president", src: "medsl", file: "nv24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "nv24.csv", office: "US SENATE" },
    ],
  },
  TX: {
    fips: "48",
    vest: { file: "tx_2020.dbf", countyCol: "CNTY", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2018-senate", src: "sen2018", file: "SENATE_precinct_general.csv" },
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREOWRI"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDHEG", r: "G20USSRCOR", o: ["G20USSLMCK", "G20USSGCOL"] } },
      { key: "2024-president", src: "medsl", file: "tx24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "tx24.csv", office: "US SENATE" },
    ],
  },
  VA: {
    fips: "51",
    // VA VEST county column is COUNTYFP (3-digit); "counties" include the
    // independent cities, which carry their own FIPS.
    vest: { file: "va_2020.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2018-senate", src: "sen2018", file: "SENATE_precinct_general.csv", cand: { d: /KAINE/, r: /STEWART/ } }, // Kaine–Stewart
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREOWRI"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDWAR", r: "G20USSRGAD", o: ["G20USSOWRI"] } }, // Warner–Gade
      { key: "2024-president", src: "medsl", file: "va24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "va24.csv", office: "US SENATE" }, // Kaine–Cao
    ],
  },
  NH: {
    fips: "33",
    vest: { file: "nh_2020.dbf", countyCol: "COUNTYFP20", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "sen2016", file: "2016-precinct-senate.csv" }, // Hassan–Ayotte
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDSHA", r: "G20USSRMES", o: ["G20USSLODO", "G20USSOWRI"] } }, // Shaheen–Messner
      { key: "2022-senate", src: "medsl", file: "nh22.csv", office: "US SENATE" }, // Hassan–Bolduc
      { key: "2024-president", src: "medsl", file: "nh24.csv", office: "US PRESIDENT" },
    ],
  },
  MN: {
    fips: "27",
    vest: { file: "mn_2020.dbf", countyCol: "COUNTYFIPS", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      // 2018 MN had two Senate races; take the special (Smith's seat — the one
      // up again in 2026), not Klobuchar's regular race.
      { key: "2018-senate", src: "sen2018", file: "SENATE_precinct_general.csv", special: "TRUE" }, // Smith–Housley
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREADEL", "G20PRESLAR", "G20PRESKEN", "G20PREIWES", "G20PREIPIE", "G20PREOWRI"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDSMI", r: "G20USSRLEW", o: ["G20USSMOCO", "G20USSCSTE", "G20USSOWRI"] } }, // Smith–Lewis
      { key: "2024-president", src: "medsl", file: "mn24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "mn24.csv", office: "US SENATE" }, // Klobuchar–White
    ],
  },
  CO: {
    fips: "08",
    vest: { file: "co_2020.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "sen2016", file: "2016-precinct-senate.csv" }, // Bennet–Glenn
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PRECBLA", "G20PREUWES", "G20PREOOTH"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDHIC", r: "G20USSRGAR", o: ["G20USSLDOA", "G20USSODOY", "G20USSOEVA", "G20USSOWRI"] } }, // Hickenlooper–Gardner
      { key: "2022-senate", src: "medsl", file: "co22.csv", office: "US SENATE" }, // Bennet–O'Dea
      { key: "2024-president", src: "medsl", file: "co24.csv", office: "US PRESIDENT" },
    ],
  },
  NM: {
    fips: "35",
    vest: { file: "nm_2020.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2018-senate", src: "sen2018", file: "SENATE_precinct_general.csv" }, // Heinrich–Rich
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PRECTIT", "G20PRESLAR"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDLUJ", r: "G20USSRRON", o: ["G20USSLWAL"] } }, // Luján–Ronchetti
      { key: "2024-president", src: "medsl", file: "nm24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "nm24.csv", office: "US SENATE" }, // Heinrich–Domenici
    ],
  },
  KS: {
    fips: "20",
    vest: { file: "ks_2020.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "sen2016", file: "2016-precinct-senate.csv" }, // Moran–Wiesner
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDBOL", r: "G20USSRMAR", o: ["G20USSLBUC"] } }, // Marshall–Bollier
      { key: "2022-senate", src: "medsl", file: "ks22.csv", office: "US SENATE" }, // Moran–Holland
      { key: "2024-president", src: "medsl", file: "ks24.csv", office: "US PRESIDENT" },
    ],
  },
  IA: {
    fips: "19",
    // Iowa VEST dbf carries only the county NAME.
    vest: { file: "ia_2020.dbf", countyCol: "COUNTY", countyKind: "name" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      // No 2016-senate: MEDSL's 2016 precinct-senate file has no IA data and
      // there is no OpenElections IA county roll-up. IA's Senate cycles here are
      // 2020 + 2022.
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PRECBLA", "G20PREOFUE", "G20PREOKIN", "G20PREIWES", "G20PREIPIE", "G20PREOWRI"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDGRE", r: "G20USSRERN", o: ["G20USSLSTE", "G20USSOHER", "G20USSOWRI"] } }, // Ernst–Greenfield
      { key: "2022-senate", src: "medsl", file: "ia22.csv", office: "US SENATE" }, // Grassley–Franken
      { key: "2024-president", src: "medsl", file: "ia24.csv", office: "US PRESIDENT" },
    ],
  },
  ME: {
    fips: "23",
    vest: { file: "me_2020.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      // No 2018-senate: MEDSL's 2018 file reports Maine's RCV race in a way that
      // double-counts King and drops the third-place Democrat from the
      // denominator. ME's Senate cycle here is 2020 (Collins–Gideon), the seat
      // up again in 2026.
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREADEL"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDGID", r: "G20USSRCOL", o: ["G20USSISAV", "G20USSILIN"] } }, // Collins–Gideon
      { key: "2024-president", src: "medsl", file: "me24.csv", office: "US PRESIDENT", statewideOnly: true },
    ],
  },
  MT: {
    fips: "30",
    vest: { file: "mt_2020.dbf", countyCol: "COUNTYFP10", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2018-senate", src: "sen2018", file: "SENATE_precinct_general.csv" }, // Tester–Rosendale
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDBUL", r: "G20USSRDAI", o: [] } }, // Daines–Bullock
      { key: "2024-president", src: "medsl", file: "mt24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "mt24.csv", office: "US SENATE" }, // Sheehy–Tester
    ],
  },
  NE: {
    fips: "31",
    vest: { file: "ne_2020.dbf", countyCol: "COUNTY", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2018-senate", src: "sen2018", file: "SENATE_precinct_general.csv" }, // Fischer–Raybould
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDJAN", r: "G20USSRSAS", o: ["G20USSLSIA"] } }, // Sasse–Janicek
      // 2024 had two NE Senate races; use the Class-2 special (Ricketts's seat,
      // the one up again in 2026), not Fischer vs the independent Osborn.
      { key: "2024-senate", src: "medsl", file: "ne24.csv", office: "US SENATE - 2 YEAR TERM", cand: { d: /LOVE/, r: /RICKETTS/ } }, // Ricketts–Love
      { key: "2024-president", src: "medsl", file: "ne24.csv", office: "US PRESIDENT", cand: { d: /HARRIS/, r: /TRUMP/ } },
    ],
  },
  OR: {
    fips: "41",
    // OR VEST dbf carries the county NAME; Oregon has no Census VTDs at all.
    vest: { file: "or_2020.dbf", countyCol: "COUNTY", countyKind: "name" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "sen2016", file: "2016-precinct-senate.csv" }, // Wyden–Callahan
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREPHUN", "G20PREOWRI"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDMER", r: "G20USSRPER", o: ["G20USSLDYE", "G20USSGTAH", "G20USSOWRI"] } }, // Merkley–Perkins
      { key: "2022-senate", src: "medsl", file: "or22.csv", office: "US SENATE", cand: { d: /WYDEN/, r: /PERKINS/ } }, // Wyden–Perkins
      { key: "2024-president", src: "medsl", file: "or24.csv", office: "US PRESIDENT", cand: { d: /HARRIS/, r: /TRUMP/ } },
    ],
  },
  SC: {
    fips: "45",
    vest: { file: "sc_2020.dbf", countyCol: "COUNTY", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "vest", vest: { file: "sc_2016.dbf", countyCol: "COUNTY", countyKind: "fp3" },
        cols: { d: "G16USSDDIX", r: "G16USSRSCO", o: ["G16USSLBLE", "G16USSASCA", "G16USSOWRI"] } }, // Scott–Dixon
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREADEL"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDHAR", r: "G20USSRGRA", o: ["G20USSCBLE", "G20USSOWRI"] } }, // Graham–Harrison
      { key: "2022-senate", src: "medsl", file: "sc22.csv", office: "US SENATE" }, // Scott–Matthews
      { key: "2024-president", src: "medsl", file: "sc24.csv", office: "US PRESIDENT" },
    ],
  },
  IN: {
    fips: "18",
    vest: { file: "in_2020.dbf", countyCol: "COUNTYFP20", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "vest", vest: { file: "in_2016.dbf", countyCol: "COUNTY", countyKind: "fp3" },
        cols: { d: "G16USSDBAY", r: "G16USSRYOU", o: ["G16USSLBRE", "G16USSOWRI"] } }, // Young–Bayh
      // Indiana is missing from MEDSL's 2018 SENATE precinct file — use VEST 2018.
      { key: "2018-senate", src: "vest", vest: { file: "in_2018.dbf", countyCol: "COUNTY", countyKind: "fp3" },
        cols: { d: "G18USSDDON", r: "G18USSRBRA", o: ["G18USSLBRE"] } }, // Braun–Donnelly
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR"] } },
      { key: "2024-president", src: "medsl", file: "in24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "in24.csv", office: "US SENATE" }, // Banks–McCormick
    ],
  },
  WA: {
    fips: "53",
    vest: { file: "wa_2020.dbf", countyCol: "COUNTY", countyKind: "full" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "vest", vest: { file: "wa_2016.dbf", countyCol: "COUNTY", countyKind: "name" },
        cols: { d: "G16USSDMUR", r: "G16USSRVAN", o: [] } }, // Murray–Vance
      { key: "2018-senate", src: "sen2018", file: "SENATE_precinct_general.csv" }, // Cantwell–Hutchison
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PRESLAR", "G20PRESKEN", "G20PREOWRI"] } },
      { key: "2022-senate", src: "medsl", file: "wa22.csv", office: "US SENATE" }, // Murray–Smiley
      { key: "2024-president", src: "medsl", file: "wa24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "wa24.csv", office: "US SENATE" }, // Cantwell–Garcia
    ],
  },
  AK: {
    fips: "02",
    // Alaska: MEDSL/countypres data is by state-house district, not borough, and
    // the 2024 MEDSL file leaves absentee/early ballots unassigned. Only 2020
    // (VEST precinct shapes, folded to boroughs by scripts/join-precinct-results)
    // gives clean borough numbers.
    vest: { file: "ak_2020.dbf", countyCol: "", countyKind: "name" },
    races: [
      { key: "2020-president", src: "prSum" },
    ],
  },
  CT: {
    fips: "09",
    vest: { file: "ct_2020.dbf", countyCol: "COUNTYFP20", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "vest", vest: { file: "ct_2016.dbf", countyCol: "COUNTYFP20", countyKind: "fp3" },
        cols: { d: "G16USSDBLU", r: "G16USSRCAR", o: ["G16USSLLIO", "G16USSGRUS", "G16USSOWRI"] } }, // Blumenthal–Carter
      { key: "2018-senate", src: "vest", vest: { file: "ct_2018.dbf", countyCol: "COUNTYFP20", countyKind: "fp3" },
        cols: { d: "G18USSDMUR", r: "G18USSRCOR", o: ["G18USSLLIO", "G18USSGRUS", "G18USSOWRI"] } }, // Murphy–Corey
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREOWRI"] } },
      { key: "2022-senate", src: "medsl", file: "ct22.csv", office: "US SENATE" }, // Blumenthal–Levy
      { key: "2024-president", src: "medsl", file: "ct24.csv", office: "US PRESIDENT" },
    ],
  },
  TN: {
    fips: "47",
    vest: { file: "tn_2020.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2018-senate", src: "sen2018", file: "SENATE_precinct_general.csv" }, // Blackburn–Bredesen
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU",
        o: ["G20PREIJOR", "G20PREIWES", "G20PREIHAW", "G20PREIBLA", "G20PREIKEN", "G20PREILAR", "G20PREIDEL"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDBRA", r: "G20USSRHAG",
        o: ["G20USSIMCL", "G20USSIFAP", "G20USSIHOO", "G20USSIHEN", "G20USSIJAM", "G20USSISTA", "G20USSIHIL", "G20USSIGRU"] } }, // Hagerty–Bradshaw
      { key: "2024-president", src: "medsl", file: "tn24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "tn24.csv", office: "US SENATE" }, // Blackburn–Johnson
    ],
  },
  MD: {
    fips: "24",
    // MD VEST dbfs key each precinct by JURSCODE (a 4-letter jurisdiction code),
    // not a FIPS — map it. Baltimore city = BACI = 24510.
    vest: { file: "md_2020.dbf", countyCol: "JURSCODE", countyKind: "map", countyMap: {
      ALLE: "24001", ANNE: "24003", BACO: "24005", CALV: "24009", CARO: "24011",
      CARR: "24013", CECI: "24015", CHAR: "24017", DORC: "24019", FRED: "24021",
      GARR: "24023", HARF: "24025", HOWA: "24027", KENT: "24029", MONT: "24031",
      PRIN: "24033", QUEE: "24035", STMA: "24037", SOME: "24039", TALB: "24041",
      WASH: "24043", WICO: "24045", WORC: "24047", BACI: "24510",
    } },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "vest", vest: { file: "md_2016.dbf" },
        cols: { d: "G16USSDVAN", r: "G16USSRSZE", o: ["G16USSGFLO", "G16USSOWRI"] } }, // Van Hollen–Szeliga
      { key: "2018-senate", src: "vest", vest: { file: "md_2018.dbf" },
        cols: { d: "G18USSDCAR", r: "G18USSRCAM", o: ["G18USSLVOH", "G18USSISIM", "G18USSOWRI"] } }, // Cardin–Campbell
      { key: "2020-president", src: "prSum" },
      { key: "2022-senate", src: "medsl", file: "md22.csv", office: "US SENATE" }, // Van Hollen–Chaffee
      { key: "2024-president", src: "medsl", file: "md24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "md24.csv", office: "US SENATE" }, // Alsobrooks–Hogan
    ],
  },
  MO: {
    fips: "29",
    vest: { file: "mo_2020.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "vest", vest: { file: "mo_2016.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
        cols: { d: "G16USSDKAN", r: "G16USSRBLU", o: ["G16USSLDIN", "G16USSGMCF", "G16USSCRYM"] } }, // Blunt–Kander
      { key: "2018-senate", src: "vest", vest: { file: "mo_2018.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
        cols: { d: "G18USSDMCC", r: "G18USSRHAW", o: ["G18USSLCAM", "G18USSGCRA", "G18USSIODE"] } }, // Hawley–McCaskill
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PRECBLA"] } },
      // Missouri's Jackson County (Kansas City) never published complete
      // precinct results for 2022 or 2024, so every precinct-derived file
      // (MEDSL, OpenElections) undercounts it by ~150-220k mostly-Democratic
      // votes. 2022 Senate and 2024 President have no ungated complete county
      // source — omit them. 2024 Senate uses MEDSL's certified national
      // senate-county file, which carries Jackson in full.
      { key: "2024-senate", src: "sen2024c", file: "2024-senate-county.csv" }, // Hawley–Kunce
    ],
  },
  UT: {
    fips: "49",
    vest: { file: "ut_2020.dbf", countyCol: "COUNTY", countyKind: "name" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "vest", vest: { file: "ut_2016.dbf", countyCol: "COUNTY", countyKind: "name" },
        cols: { d: "G16USSDSNO", r: "G16USSRLEE", o: ["G16USSAFON", "G16USSIBAR"] } }, // Lee–Snow
      { key: "2018-senate", src: "vest", vest: { file: "ut_2018.dbf", countyCol: "COUNTY", countyKind: "name" },
        cols: { d: "G18USSDWIL", r: "G18USSRROM", o: ["G18USSLBOW", "G18USSCAAL", "G18USSAMCC"] } }, // Romney–Wilson
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU",
        o: ["G20PRELJOR", "G20PREGHAW", "G20PRECBLA", "G20PREIWES", "G20PREIPIE", "G20PREIMCH", "G20PREILAR"] } },
      // 2022 UT Senate had no Democrat (party backed the independent McMullin) — omit.
      { key: "2024-president", src: "medsl", file: "ut24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "ut24.csv", office: "US SENATE" }, // Curtis–Gleich
    ],
  },
  KY: {
    fips: "21",
    vest: { file: "ky_2020_vtd_estimates.dbf", countyCol: "COUNTYFP20", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "vest", vest: { file: "ky_2016.dbf", countyCol: "COUNTYFP16", countyKind: "fp3" },
        cols: { d: "G16USSDGRA", r: "G16USSRPAU", o: [] } }, // Paul–Gray
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREIWES", "G20PREIPIE"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDMCG", r: "G20USSRMCC", o: ["G20USSLBAR"] } }, // McConnell–McGrath
      { key: "2022-senate", src: "medsl", file: "ky22.csv", office: "US SENATE" }, // Paul–Booker
      { key: "2024-president", src: "medsl", file: "ky24.csv", office: "US PRESIDENT" },
    ],
  },
  AR: {
    fips: "05",
    vest: { file: "ar_2020.dbf", countyCol: "COUNTY_FIP", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "vest", vest: { file: "ar_2016.dbf", countyCol: "COUNTY_FIP", countyKind: "fp3" },
        cols: { d: "G16USSDELD", r: "G16USSRBOO", o: ["G16USSLGIL", "G16USSOWRI"] } }, // Boozman–Eldridge
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU",
        o: ["G20PRELJOR", "G20PREGHAW", "G20PRECBLA", "G20PREACAR", "G20PREOMYE", "G20PRESLAR", "G20PREIWES", "G20PREICOL", "G20PREIPIE", "G20PREIGAM", "G20PREIFUE"] } },
      // 2020 AR Senate had no Democrat (Cotton vs Harrington, Libertarian) — omit.
      { key: "2022-senate", src: "medsl", file: "ar22.csv", office: "US SENATE" }, // Boozman–James
      { key: "2024-president", src: "medsl", file: "ar24.csv", office: "US PRESIDENT" },
    ],
  },
  WV: {
    fips: "54",
    vest: { file: "wv_2020.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2018-senate", src: "vest", vest: { file: "wv_2018.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
        cols: { d: "G18USSDMAN", r: "G18USSRMOR", o: ["G18USSLHOL"] } }, // Manchin–Morrisey
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREMHAW"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDSWE", r: "G20USSRCAP", o: ["G20USSLMOR"] } }, // Capito–Swearengin
      { key: "2024-president", src: "medsl", file: "wv24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "wv24.csv", office: "US SENATE" }, // Justice–Elliott
    ],
  },
  ID: {
    fips: "16",
    vest: { file: "id_2020.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "vest", vest: { file: "id_2016.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
        cols: { d: "G16USSDSTU", r: "G16USSRCRA", o: ["G16USSCWRI"] } }, // Crapo–Stewart
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREIWES", "G20PREIPIE", "G20PREIBLA", "G20PREIFUE"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDJOR", r: "G20USSRRIS", o: ["G20USSIFLE", "G20USSCWRI"] } }, // Risch–Jordan
      { key: "2022-senate", src: "medsl", file: "id22.csv", office: "US SENATE" }, // Crapo–Roth
      { key: "2024-president", src: "medsl", file: "id24.csv", office: "US PRESIDENT" },
    ],
  },
  SD: {
    fips: "46",
    vest: { file: "sd_2020.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "vest", vest: { file: "sd_2016.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
        cols: { d: "G16USSDWIL", r: "G16USSRTHU", o: [] } }, // Thune–Williams
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDAHL", r: "G20USSRROU", o: [] } }, // Rounds–Ahlers
      { key: "2022-senate", src: "medsl", file: "sd22.csv", office: "US SENATE" }, // Thune–Bengs
      { key: "2024-president", src: "medsl", file: "sd24.csv", office: "US PRESIDENT" },
    ],
  },
  ND: {
    fips: "38",
    vest: { file: "nd_2020.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "vest", vest: { file: "nd_2016.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
        cols: { d: "G16USSDGLA", r: "G16USSRHOE", o: ["G16USSLMAR", "G16USSIGER", "G16USSOWRI"] } }, // Hoeven–Glassheim
      { key: "2018-senate", src: "vest", vest: { file: "nd_2018.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
        cols: { d: "G18USSDHEI", r: "G18USSRCRA", o: ["G18USSOWRI"] } }, // Cramer–Heitkamp
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PREOWRI"] } },
      { key: "2022-senate", src: "medsl", file: "nd22.csv", office: "US SENATE" }, // Hoeven–Christiansen
      { key: "2024-president", src: "medsl", file: "nd24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "nd24.csv", office: "US SENATE" }, // Cramer–?
    ],
  },
  DE: {
    fips: "10",
    // DE VEST dbfs carry no county column and DE has only 3 counties — sum the
    // per-precinct `pr` for 2020 president; the rest from national files.
    vest: { file: "de_2020.dbf", countyCol: "", countyKind: "name" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      // MEDSL's 2018 national Senate file has almost no DE precinct rows (7k
      // votes) and DE VEST dbfs carry no county key — DE Senate is 2024 only.
      { key: "2020-president", src: "prSum" },
      { key: "2024-president", src: "medsl", file: "de24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "de24.csv", office: "US SENATE" }, // Blunt Rochester–Hansen
    ],
  },
  VT: {
    fips: "50",
    vest: { file: "vt_2020.dbf", countyCol: "COUNTYFP20", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "vest", vest: { file: "vt_2016.dbf", countyCol: "COUNTYFP20", countyKind: "fp3" },
        cols: { d: "G16USSDLEA", r: "G16USSRMIL", o: ["G16USSOERI", "G16USSITRU", "G16USSODIA", "G16USSOWRI"] } }, // Leahy–Milne
      { key: "2018-senate", src: "vest", vest: { file: "vt_2018.dbf", countyCol: "COUNTYFP20", countyKind: "fp3" },
        cols: { d: "G18USSISAN", r: "G18USSRZUP", o: ["G18USSIPEA", "G18USSIBES", "G18USSIGIL", "G18USSIADE", "G18USSISVI", "G18USSIBUS", "G18USSOKAN", "G18USSOWRI"] } }, // Sanders (I)–Zupan
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREIWES", "G20PREOOTH", "G20PREOSAN", "G20PREOWRI"] } },
      { key: "2022-senate", src: "medsl", file: "vt22.csv", office: "US SENATE" }, // Welch–Malloy
      { key: "2024-president", src: "medsl", file: "vt24.csv", office: "US PRESIDENT" },
      // Sanders runs as an Independent — map him to the D side by name.
      { key: "2024-senate", src: "medsl", file: "vt24.csv", office: "US SENATE", cand: { d: /SANDERS/, r: /MALLOY/ } }, // Sanders–Malloy
    ],
  },
  WY: {
    fips: "56",
    vest: { file: "wy_2020.dbf", countyCol: "COUNTYFP20", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2018-senate", src: "vest", vest: { file: "wy_2018.dbf", countyCol: "COUNTYFP20", countyKind: "fp3" },
        cols: { d: "G18USSDTRA", r: "G18USSRBAR", o: ["G18USSLPOR", "G18USSOWRI"] } }, // Barrasso–Trauner
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREIPIE", "G20PREOWRI"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDDAV", r: "G20USSRLUM", o: ["G20USSOWRI"] } }, // Lummis–Ben-David
      { key: "2024-president", src: "medsl", file: "wy24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "wy24.csv", office: "US SENATE" }, // Barrasso–Morrow
    ],
  },
  HI: {
    fips: "15",
    // Hawaii has no Census 2020 VTDs, so no precinct `pr` to sum — the 2020 dbf's
    // COUNTYFP gives clean county totals directly.
    vest: { file: "hi_2020.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      // HI VEST 2018 dbf county codes don't resolve for Honolulu (2/3 of the
      // state) — HI Senate is 2022 + 2024.
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PRECBLA", "G20PREOPIE"] } },
      { key: "2022-senate", src: "medsl", file: "hi22.csv", office: "US SENATE" }, // Schatz–McDermott
      { key: "2024-president", src: "medsl", file: "hi24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "hi24.csv", office: "US SENATE" }, // Hirono–McDermott
    ],
  },
  RI: {
    fips: "44",
    vest: { file: "ri_2020.dbf", countyCol: "COUNTYFP20", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2018-senate", src: "vest", vest: { file: "ri_2018.dbf", countyCol: "COUNTYFP20", countyKind: "fp3" },
        cols: { d: "G18USSDWHI", r: "G18USSRFLA", o: ["G18USSOWRI"] } }, // Whitehouse–Flanders
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREADEL", "G20PRESLAR", "G20PREOCAR", "G20PREOWRI"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDREE", r: "G20USSRWAT", o: ["G20USSOWRI"] } }, // Reed–Waters
      { key: "2024-president", src: "medsl", file: "ri24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "ri24.csv", office: "US SENATE" }, // Whitehouse–de la Cruz
    ],
  },
  MS: {
    fips: "28",
    vest: { file: "ms_2020.dbf", countyCol: "COUNTYFP20", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      // 2018 had two MS Senate races; use the regular (Wicker), not the Hyde-Smith
      // special (S18USS* / R18USS* columns).
      { key: "2018-senate", src: "vest", vest: { file: "ms_2018.dbf", countyCol: "COUNTYFP18", countyKind: "fp3" },
        cols: { d: "G18USSDBAR", r: "G18USSRWIC", o: ["G18USSLBED", "G18USSOOHA"] } }, // Wicker–Baria
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREABLA", "G20PREOCAR", "G20PREIWES", "G20PREICOL", "G20PREIPIE"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDESP", r: "G20USSRHYD", o: ["G20USSLEDW"] } }, // Hyde-Smith–Espy (Class 2, the 2026 seat)
      { key: "2024-president", src: "medsl", file: "ms24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "ms24.csv", office: "US SENATE" }, // Wicker–Pinkins
    ],
  },
  OK: {
    fips: "40",
    vest: { file: "ok_2020.dbf", countyCol: "COUNTY_NAM", countyKind: "name" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "vest", vest: { file: "ok_2016.dbf", countyCol: "COUNTY", countyKind: "name" },
        cols: { d: "G16USSDWOR", r: "G16USSRLAN", o: ["G16USSLMUR", "G16USSIBRA", "G16USSIBEA"] } }, // Lankford–Workman
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREIWES", "G20PREISIM", "G20PREIPIE"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDBRO", r: "G20USSRINH", o: ["G20USSLMUR", "G20USSIFAR", "G20USSINES"] } }, // Inhofe–Broyles
      // 2022 had two OK Senate races; `special: "FALSE"` keeps the regular
      // (Lankford), dropping the Mullin special.
      { key: "2022-senate", src: "medsl", file: "ok22.csv", office: "US SENATE", special: "FALSE" }, // Lankford–Horn (M.)
      { key: "2024-president", src: "medsl", file: "ok24.csv", office: "US PRESIDENT" },
    ],
  },
  NJ: {
    fips: "34",
    vest: { file: "nj_2020_vtd_estimates.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2018-senate", src: "vest", vest: { file: "nj_2018.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
        cols: { d: "G18USSDMEN", r: "G18USSRHUG", o: ["G18USSLSAB", "G18USSGHOF", "G18USSORIV", "G18USSOFLA", "G18USSOKIM", "G18USSOSCH"] } }, // Menendez–Hugin
      { key: "2020-president", src: "prSum" },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDBOO", r: "G20USSRMEH", o: ["G20USSGHOF", "G20USSOFER", "G20USSOBUR"] } }, // Booker–Mehta
      // MEDSL's nj24.csv mixes TOTAL and component modes by county (only 9 of 21
      // counties carry a TOTAL) and the TOTAL rows are themselves inflated ~1.9x
      // — unusable. 2024 President is omitted; 2024 Senate uses the certified
      // national senate-county file.
      { key: "2024-senate", src: "sen2024c", file: "2024-senate-county.csv" }, // Kim–Bashaw
    ],
  },
  MA: {
    fips: "25",
    // MA VEST dbfs carry no county column — 2020 president from `prSum`, 2018
    // Senate from the national MEDSL file, 2024 from the individual-state file.
    vest: { file: "ma_2020.dbf", countyCol: "", countyKind: "name" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2018-senate", src: "sen2018", file: "SENATE_precinct_general.csv" }, // Warren–Diehl
      { key: "2020-president", src: "prSum" },
      { key: "2024-president", src: "medsl", file: "ma24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "ma24.csv", office: "US SENATE" }, // Warren–Deaton
    ],
  },
  AL: {
    fips: "01",
    vest: { file: "al_2020.dbf", countyCol: "COUNTYFP20", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "vest", vest: { file: "al_2016.dbf", countyCol: "COUNTYFP20", countyKind: "fp3" },
        cols: { d: "G16USSDCRU", r: "G16USSRSHE", o: ["G16USSOWRI"] } }, // Shelby–Crumpton
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREOWRI"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDJON", r: "G20USSRTUB", o: ["G20USSOWRI"] } }, // Tuberville–Jones
      { key: "2022-senate", src: "medsl", file: "al22.csv", office: "US SENATE" }, // Britt–Boyd
      { key: "2024-president", src: "medsl", file: "al24.csv", office: "US PRESIDENT" },
    ],
  },
  LA: {
    fips: "22",
    vest: { file: "la_2020.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      // Louisiana's jungle primary: 2016 went to a runoff — the R16USS* columns
      // are the certified Dec runoff (Kennedy vs Campbell).
      { key: "2016-senate", src: "vest", vest: { file: "la_2016.dbf", countyCol: "COUNTYFP10", countyKind: "fp3" },
        cols: { d: "R16USSDCAM", r: "R16USSRKEN", o: [] } }, // Kennedy–Campbell (runoff)
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREOWES", "G20PREOOTH"] } },
      // 2020 Senate: Cassidy won the jungle primary outright over the top
      // Democrat (Perkins).
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDPER", r: "G20USSRCAS", o: ["G20USSRMUR", "G20USSDEDW", "G20USSDPIE", "G20USSDKNI", "G20USSDWEN", "G20USSLSIG", "G20USSIMEN", "G20USSOPRI", "G20USSOJOH", "G20USSNBIL", "G20USSNBOU", "G20USSNMON", "G20USSNDAR"] } }, // Cassidy–Perkins
      { key: "2022-senate", src: "medsl", file: "la22.csv", office: "US SENATE" }, // Kennedy (won jungle outright)
      { key: "2024-president", src: "medsl", file: "la24.csv", office: "US PRESIDENT" },
    ],
  },
  CA: {
    fips: "06",
    // California has no Census 2020 VTDs — county totals come from the VEST 2020
    // dbf's COUNTY name directly. 2016/2018 Senate were both Democrat-vs-Democrat
    // (no R on the ballot), so only 2022 (Padilla–Meuser) and 2024 (Schiff–
    // Garvey) are two-party.
    vest: { file: "ca_2020.dbf", countyCol: "COUNTY", countyKind: "name" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREAFUE", "G20PREPLAR"] } },
      { key: "2022-senate", src: "medsl", file: "ca22.csv", office: "US SENATE" }, // Padilla–Meuser
      { key: "2024-president", src: "medsl", file: "ca24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "ca24.csv", office: "US SENATE", cand: { d: /SCHIFF/, r: /GARVEY/ } }, // Schiff–Garvey
    ],
  },
  FL: {
    fips: "12",
    // FL VEST dbf keys precincts by a 3-letter county code — 2020 president via
    // `prSum` instead; 2016/2018 Senate from the national MEDSL files.
    vest: { file: "fl_2020.dbf", countyCol: "", countyKind: "name" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "sen2016", file: "2016-precinct-senate.csv" }, // Rubio–Murphy
      { key: "2018-senate", src: "sen2018", file: "SENATE_precinct_general.csv" }, // Scott–Nelson
      { key: "2020-president", src: "prSum" },
      { key: "2022-senate", src: "medsl", file: "fl22.csv", office: "US SENATE" }, // Rubio–Demings
      { key: "2024-president", src: "medsl", file: "fl24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "medsl", file: "fl24.csv", office: "US SENATE" }, // Scott–Mucarsel-Powell
    ],
  },
  IL: {
    fips: "17",
    vest: { file: "il_2020.dbf", countyCol: "COUNTYFP20", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "vest", vest: { file: "il_2016.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
        cols: { d: "G16USSDDUC", r: "G16USSRKIR", o: ["G16USSLMCM", "G16USSGSUM", "G16USSOWRI"] } }, // Duckworth–Kirk
      { key: "2020-president", src: "vest", cols: { d: "G20PREDBID", r: "G20PRERTRU", o: ["G20PRELJOR", "G20PREGHAW", "G20PREACAR", "G20PRESLAR"] } },
      { key: "2020-senate", src: "vest", cols: { d: "G20USSDDUR", r: "G20USSRCUR", o: ["G20USSIWIL", "G20USSLMAL", "G20USSGBLA"] } }, // Durbin–Curran
      { key: "2022-senate", src: "medsl", file: "il22.csv", office: "US SENATE" }, // Duckworth–Salvi
      { key: "2024-president", src: "medsl", file: "il24.csv", office: "US PRESIDENT" },
    ],
  },
  NY: {
    fips: "36",
    vest: { file: "ny_2020.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
    races: [
      { key: "2016-president", src: "countypres", file: "countypres_2000-2016.csv" },
      { key: "2016-senate", src: "vest", vest: { file: "ny_2016.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
        cols: { d: "G16USSDSCH", r: "G16USSRLON", o: ["G16USSLMER", "G16USSGWIL", "G16USSOWRI"] } }, // Schumer–Long
      { key: "2018-senate", src: "vest", vest: { file: "ny_2018.dbf", countyCol: "COUNTYFP", countyKind: "fp3" },
        cols: { d: "G18USSDGIL", r: "G18USSRFAR", o: ["G18USSOWRI"] } }, // Gillibrand–Farley
      { key: "2020-president", src: "prSum" },
      // ny22.csv has US SENATE rows for only 18 of 62 counties — omit 2022.
      { key: "2024-president", src: "medsl", file: "ny24.csv", office: "US PRESIDENT" },
      { key: "2024-senate", src: "sen2024c", file: "2024-senate-county.csv" }, // Gillibrand–Sapraicone
    ],
  },
};
const cfg = CONFIG[USPS];
if (!cfg) throw new Error(`no config for ${USPS}`);

// ── helpers ───────────────────────────────────────────────────────────
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
const dside = (p) => {
  const s = String(p).toUpperCase().replace(/[^A-Z]/g, "");
  return s.startsWith("DEM") ? "d" : s.startsWith("REP") ? "r" : null;
};
// MEDSL town files (Maine especially) carry pseudo-candidate rows that must not
// land in the denominator: "TOTAL BALLOTS CAST", "UNDERVOTES", "BLANK", etc.
const isSummaryCand = (c) =>
  /^(TOTAL\b|TOTAL BALLOTS|TOTAL VOTES|UNDER ?VOTES?|OVER ?VOTES?|BLANKS?|EXHAUSTED|VOTER TURNOUT|BALLOTS CAST|CAST VOTES|REGISTERED VOTERS|WRITE-?INS?$)/i.test(
    String(c || "").trim()
  );

const blocks = {};
const bump = (race, fips, side, v) => {
  const b = (blocks[race] ||= {});
  const t = (b[fips] ||= { d: 0, r: 0, total: 0 });
  t.total += v;
  if (side === "d" || side === "r") t[side] += v;
};

// stream a national MEDSL-style CSV; `pick(r, idx)` -> { fips, side, votes } | null
async function streamCsv(file, pick) {
  const rl = createInterface({ input: createReadStream(resolve(SRC, file)) });
  let idx = null;
  for await (const line of rl) {
    if (!idx) { idx = splitLine(line).map((s) => s.toLowerCase().trim()); continue; }
    const r = splitLine(line);
    const hit = pick(r, idx);
    if (hit) bump(hit.race, hit.fips, hit.side, hit.votes);
  }
}

// county name -> fips, from the already-correct geo file (some VEST dbfs, e.g.
// Iowa's, carry only the county NAME, and FIPS is never a simple formula).
const keyN = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");
const GEO = JSON.parse(readFileSync(resolve(root, `app/data/geo/${USPS}.json`), "utf8"));
const fipsByName = new Map(GEO.counties.map((c) => [keyN(c.name), c.fips]));

// ── per-source loaders ────────────────────────────────────────────────
for (const race of cfg.races) {
  if (race.src === "prSum") {
    // Sum the per-precinct `pr` (2020 president [d,r,other]) already joined by
    // scripts/join-precinct-results.mjs into county (borough) totals. Used for
    // Alaska, whose MEDSL/countypres data is by state-house district, not
    // borough, and whose 2024 MEDSL file leaves absentee/early ballots
    // unassigned to a borough.
    const dir = resolve(root, `app/data/geo/precincts/${USPS}`);
    for (const f of readdirSync(dir)) {
      const g = JSON.parse(readFileSync(resolve(dir, f), "utf8"));
      for (const p of g.precincts) {
        if (!p.pr) continue;
        bump(race.key, g.countyFips, "d", p.pr[0]);
        bump(race.key, g.countyFips, "r", p.pr[1]);
        bump(race.key, g.countyFips, null, p.pr[2]);
      }
    }
    continue;
  }

  if (race.src === "vest") {
    // per-race dbf override (e.g. VEST 2016 for a state whose Senate race isn't
    // in MEDSL's 2016 precinct file); else the state's default cfg.vest.
    const v = { ...cfg.vest, ...(race.vest ?? {}) };
    const rows = readDbf(readFileSync(resolve(SRC, v.file)));
    for (const row of rows) {
      const raw = String(row[v.countyCol] || "");
      const fips =
        v.countyKind === "geoid"
          ? raw.padStart(5, "0")
          : v.countyKind === "name"
            ? fipsByName.get(keyN(raw))
            : v.countyKind === "full"
              ? raw.replace(/\D/g, "").padStart(5, "0")
              : v.countyKind === "map"
                ? v.countyMap[raw.trim().toUpperCase()]
                : cfg.fips + raw.replace(/\D/g, "").padStart(3, "0");
      if (!fips || fips.length !== 5) continue;
      bump(race.key, fips, "d", parseInt(row[race.cols.d], 10) || 0);
      bump(race.key, fips, "r", parseInt(row[race.cols.r], 10) || 0);
      for (const o of race.cols.o) bump(race.key, fips, null, parseInt(row[o], 10) || 0);
    }
    continue;
  }

  if (race.src === "countypres") {
    // year,state,state_po,county,FIPS,office,candidate,party,candidatevotes,totalvotes,version
    await streamCsv(race.file, (r, h) => {
      if (r[h.indexOf("year")] !== "2016") return null;
      if (r[h.indexOf("state_po")] !== USPS) return null;
      const fips = String(r[h.indexOf("fips")]).replace(/\D/g, "").padStart(5, "0");
      const side = dside(r[h.indexOf("party")]);
      return { race: race.key, fips, side, votes: parseInt(r[h.indexOf("candidatevotes")], 10) || 0 };
    });
    continue;
  }

  if (race.src === "sen2016") {
    // MEDSL 2016 precinct senate: ...,state_postal,...,county_fips,...,office,...,party,mode,votes
    await streamCsv(race.file, (r, h) => {
      if (r[h.indexOf("state_postal")] !== USPS) return null;
      if (String(r[h.indexOf("office")]).toUpperCase() !== "US SENATE") return null;
      if (String(r[h.indexOf("mode")]).toUpperCase() !== "TOTAL") return null;
      const fips = String(r[h.indexOf("county_fips")]).replace(/\D/g, "").padStart(5, "0");
      const p = String(r[h.indexOf("party")]).toUpperCase();
      const side = p.startsWith("DEMOCRAT") ? "d" : p.startsWith("REPUBLICAN") ? "r" : null;
      return { race: race.key, fips, side, votes: parseInt(r[h.indexOf("votes")], 10) || 0 };
    });
    continue;
  }

  if (race.src === "sen2018") {
    // MEDSL 2018: precinct,office,party_detailed,party_simplified,mode,votes,county_name,county_fips,...,special,...,state_po,...
    // Some states (VA) carry no party_simplified and no TOTAL mode — classify by
    // candidate name (`race.cand`) and sum the component modes, preferring a
    // real TOTAL row where one exists.
    const want = (race.special || "FALSE").toUpperCase();
    const COMPONENT = /^(ELECTION DAY|EARLY|ABSENTEE|PROVISIONAL|MAIL|ADVANCE|IN-PERSON|ONE STOP|FAILSAFE|LATE|CURBSIDE|AFFIDAVIT|MILITARY|UOCAVA|UNSCANNED|MANUAL|SCANNED|FEDERAL|OVERSEAS|EMERGENCY)/;
    const total = {}, comp = {}; // fips -> { d, r, total }
    const rl = createInterface({ input: createReadStream(resolve(SRC, race.file)) });
    let h = null;
    for await (const line of rl) {
      if (!h) { h = splitLine(line).map((s) => s.toLowerCase().trim()); continue; }
      const r = splitLine(line);
      if (r[h.indexOf("state_po")] !== USPS || r[h.indexOf("office")] !== "US SENATE") continue;
      if (String(r[h.indexOf("special")]).toUpperCase() !== want) continue;
      const cand = String(r[h.indexOf("candidate")] || "").toUpperCase();
      if (isSummaryCand(cand)) continue;
      let side = dside(r[h.indexOf("party_simplified")]);
      if (!side && race.cand) side = race.cand.d.test(cand) ? "d" : race.cand.r.test(cand) ? "r" : null;
      const fips = String(r[h.indexOf("county_fips")]).padStart(5, "0");
      const mode = r[h.indexOf("mode")];
      const bag = mode === "TOTAL" ? total : COMPONENT.test(mode) ? comp : null;
      if (!bag) continue;
      const v = parseInt(r[h.indexOf("votes")], 10) || 0;
      const t = (bag[fips] ||= { d: 0, r: 0, total: 0 });
      t.total += v;
      if (side) t[side] += v;
    }
    for (const fips of new Set([...Object.keys(total), ...Object.keys(comp)])) {
      const t = total[fips]?.total ? total[fips] : comp[fips];
      bump(race.key, fips, "d", t.d);
      bump(race.key, fips, "r", t.r);
      bump(race.key, fips, null, t.total - t.d - t.r);
    }
    continue;
  }

  if (race.src === "medsl") {
    // MEDSL 2022/2024 individual-state: ...,office,...,mode,votes,county_name,county_fips,...
    // Iowa's files carry only ELECTION DAY + ABSENTEE component modes (no TOTAL);
    // some carry a blank mode. Prefer a real TOTAL, else sum components + blank.
    // Maine reports president/senate three times (STATEWIDE + one row per CD for
    // the split electoral votes) — `statewideOnly` keeps just the STATEWIDE set.
    const COMPONENT = /^(ELECTION DAY|EARLY|ABSENTEE|PROVISIONAL|MAIL|ADVANCE|IN-PERSON|ONE STOP|POLLING|PRE-POLL|FAILSAFE|LATE|CURBSIDE|AFFIDAVIT|MILITARY|UOCAVA|UNSCANNED|MANUAL|SCANNED|FEDERAL|OVERSEAS|EMERGENCY)/;
    const total = {}, comp = {};
    const rl = createInterface({ input: createReadStream(resolve(SRC, race.file)) });
    let h = null;
    for await (const line of rl) {
      if (!h) { h = splitLine(line).map((s) => s.toLowerCase().trim()); continue; }
      const r = splitLine(line);
      if (r[h.indexOf("office")] !== race.office) continue;
      // `special` gates concurrent regular/special Senate races in the same file
      // (Oklahoma 2022: Lankford regular + Mullin special). Default: regular only.
      if (h.indexOf("special") >= 0 &&
          String(r[h.indexOf("special")]).toUpperCase() !== (race.special || "FALSE").toUpperCase())
        continue;
      // `cand` (a {d,r} regex pair) narrows to one matchup when the party
      // columns alone don't disambiguate.
      if (race.cand) {
        const cn = String(r[h.indexOf("candidate")] || "").toUpperCase();
        if (!race.cand.d.test(cn) && !race.cand.r.test(cn) &&
            !/^(TOTAL|UNDER|OVER|BLANK|WRITE)/.test(cn)) continue;
      }
      if (race.statewideOnly && String(r[h.indexOf("district")]).toUpperCase() !== "STATEWIDE") continue;
      if (isSummaryCand(r[h.indexOf("candidate")])) continue;
      const fips = String(r[h.indexOf("county_fips")]).padStart(5, "0");
      if (!fips.startsWith(cfg.fips)) continue;
      // classification cascade: party_simplified -> party_detailed (Nebraska's
      // ballot is officially NONPARTISAN, real party is only in party_detailed)
      // -> candidate-name regex (Oregon repeats each candidate with a blank
      // party on a second row set).
      let side = dside(r[h.indexOf("party_simplified")]) || dside(r[h.indexOf("party_detailed")]);
      if (!side && race.cand) {
        const cand = String(r[h.indexOf("candidate")] || "").toUpperCase();
        side = race.cand.d.test(cand) ? "d" : race.cand.r.test(cand) ? "r" : null;
      }
      const mode = String(r[h.indexOf("mode")] || "").toUpperCase();
      const bag = mode === "TOTAL" ? total : (mode === "" || COMPONENT.test(mode)) ? comp : null;
      if (!bag) continue;
      const v = parseInt(r[h.indexOf("votes")], 10) || 0;
      const t = (bag[fips] ||= { d: 0, r: 0, total: 0 });
      t.total += v;
      if (side) t[side] += v;
    }
    for (const fips of new Set([...Object.keys(total), ...Object.keys(comp)])) {
      const t = total[fips]?.total ? total[fips] : comp[fips];
      bump(race.key, fips, "d", t.d);
      bump(race.key, fips, "r", t.r);
      bump(race.key, fips, null, t.total - t.d - t.r);
    }
    continue;
  }

  if (race.src === "sen2024c") {
    // MEDSL national 2024-senate-county.csv — certified county-level Senate, used
    // where a state's individual-state precinct file has a gap (Missouri's
    // Jackson County never published complete precinct results).
    // year,state,state_po,...,office,county_name,county_fips,candidate,party_detailed,party_simplified,writein,mode,votes,totalvotes,...
    const COMPONENT = /^(ELECTION DAY|EARLY|ABSENTEE|PROVISIONAL|MAIL|ADVANCE|IN-PERSON|ONE STOP|POLLING|PRE-POLL|FAILSAFE|LATE|CURBSIDE|AFFIDAVIT|MILITARY|UOCAVA|UNSCANNED|MANUAL|SCANNED|FEDERAL|OVERSEAS|EMERGENCY)/;
    const total = {}, comp = {};
    const rl = createInterface({ input: createReadStream(resolve(SRC, race.file)) });
    let h = null;
    for await (const line of rl) {
      if (!h) { h = splitLine(line).map((s) => s.toLowerCase().trim()); continue; }
      const r = splitLine(line);
      if (r[h.indexOf("state_po")] !== USPS) continue;
      if (String(r[h.indexOf("office")]).toUpperCase() !== "US SENATE") continue;
      if (isSummaryCand(r[h.indexOf("candidate")])) continue;
      const fips = String(r[h.indexOf("county_fips")]).replace(/\D/g, "").padStart(5, "0");
      const side = dside(r[h.indexOf("party_simplified")]) || dside(r[h.indexOf("party_detailed")]);
      const mode = String(r[h.indexOf("mode")] || "").toUpperCase();
      const bag = mode === "TOTAL" ? total : (mode === "" || COMPONENT.test(mode)) ? comp : null;
      if (!bag) continue;
      const v = parseInt(r[h.indexOf("votes")], 10) || 0;
      const t = (bag[fips] ||= { d: 0, r: 0, total: 0 });
      t.total += v;
      if (side) t[side] += v;
    }
    for (const fips of new Set([...Object.keys(total), ...Object.keys(comp)])) {
      const t = total[fips]?.total ? total[fips] : comp[fips];
      bump(race.key, fips, "d", t.d);
      bump(race.key, fips, "r", t.r);
      bump(race.key, fips, null, t.total - t.d - t.r);
    }
    continue;
  }

  throw new Error(`unknown src ${race.src}`);
}

// ── merge ─────────────────────────────────────────────────────────────
const path = resolve(root, "app/data/countyResults.generated.json");
const cur = JSON.parse(readFileSync(path, "utf8"));
for (const [race, byFips] of Object.entries(blocks)) {
  const block = {};
  for (const [fips, t] of Object.entries(byFips)) {
    if (!t.total) continue;
    const dPct = Math.round((t.d / t.total) * 1000) / 10;
    const rPct = Math.round((t.r / t.total) * 1000) / 10;
    block[fips] = {
      fips, winner: t.d >= t.r ? "D" : "R", dPct, rPct,
      marginPct: Math.round(Math.abs(dPct - rPct) * 10) / 10,
      dVotes: t.d, rVotes: t.r, totalVotes: t.total,
    };
  }
  cur[race] = { ...(cur[race] ?? {}), ...block };
  const c = Object.values(block);
  const dv = c.reduce((s, x) => s + x.dVotes, 0), rv = c.reduce((s, x) => s + x.rVotes, 0), tv = c.reduce((s, x) => s + x.totalVotes, 0);
  console.error(
    `${race}: ${c.length} counties, D ${c.filter((x) => x.winner === "D").length} / R ${c.filter((x) => x.winner === "R").length}` +
    `  statewide D ${(100 * dv / tv).toFixed(2)} / R ${(100 * rv / tv).toFixed(2)}  (${tv.toLocaleString()} votes)`
  );
}
writeFileSync(path, JSON.stringify(cur, null, 1) + "\n");
console.error(`merged ${USPS} into app/data/countyResults.generated.json`);
