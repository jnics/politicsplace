/**
 * Resolving an EAVS jurisdiction row to a county, shared by the EAVS build
 * scripts. Most rows carry a 10-digit FIPSCode (state + county + a
 * subdivision part), but not all:
 *   - Wisconsin's ~1,850 municipalities carry only a 5-digit municipal code
 *     ("00100") with no state or county in it; the county is in the name:
 *     "TOWN OF ABRAMS - OCONTO COUNTY". Municipalities spanning counties
 *     ("... - MULTIPLE COUNTIES") can't be placed and return null.
 *   - Alaska reports as one statewide jurisdiction ("0200000000") and has
 *     no county to give.
 * State totals should therefore be summed from every row by its State_Abbr,
 * not from the counties.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const nameKey = (s) =>
  s
    .toUpperCase()
    .replace(/\b(COUNTY|PARISH|BOROUGH|CITY AND BOROUGH|CENSUS AREA)\b/g, "")
    .replace(/\bSAINT\b/g, "ST")
    .replace(/[^A-Z]/g, "");

/** Builds `countyOf(fipsCode, stateAbbr, jurisdictionName) -> 5-digit FIPS | null`. */
export function makeCountyResolver(root) {
  const byState = new Map(); // usps -> { prefix, names: Map }
  const indexFor = (usps) => {
    if (byState.has(usps)) return byState.get(usps);
    const path = resolve(root, "app/data/geo", `${usps}.json`);
    let entry = null;
    if (existsSync(path)) {
      const geo = JSON.parse(readFileSync(path, "utf8"));
      entry = {
        prefix: geo.fips,
        names: new Map(geo.counties.map((c) => [nameKey(c.name), c.fips])),
      };
    }
    byState.set(usps, entry);
    return entry;
  };

  return function countyOf(fipsCode, stateAbbr, jurisName) {
    const usps = String(stateAbbr ?? "").trim();
    const idx = indexFor(usps);
    const raw = String(fipsCode ?? "").trim();
    if (raw.length >= 9) {
      const county = raw.padStart(10, "0").slice(0, 5);
      // A real county code: right state, and not the statewide "XX000".
      if (!county.endsWith("000") && (!idx || county.startsWith(idx.prefix))) return county;
      return null;
    }
    // Short code (Wisconsin): read the county out of the name.
    const m = / - ([A-Z .']+?) COUNTY\s*$/i.exec(String(jurisName ?? ""));
    if (!m || !idx) return null;
    return idx.names.get(nameKey(m[1])) ?? null;
  };
}
