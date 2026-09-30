/**
 * One state's county geometry, produced by scripts/extract-county-geo.mjs and
 * stored in app/data/geo/<USPS>.json. Each state is projected on its own upright
 * geoMercator, and the geometry is pre-serialised to SVG path strings so the app
 * renders it with no projection library and no runtime work.
 *
 * These files are loaded with `fetch()` against the static `/geo/...` path,
 * NOT `import()`. `public/geo` is a directory junction onto app/data/geo (so
 * the generation scripts keep writing the same place), and Vite/Wrangler
 * serve public/ as plain static assets with no size limit. This data used to
 * be pulled in via dynamic `import()`, which is fine for a browser bundle,
 * but a Cloudflare Worker deploy bundles every module reachable from the SSR
 * build into ONE script — all ~109MB of per-state/per-county geometry ended
 * up inlined into the Worker itself and blew past Workers' 64MB script size
 * limit. Loading it as a runtime fetch instead keeps it out of the Worker
 * script entirely; only the browser ever requests these files, and only the
 * ones it actually needs.
 */
export interface CountyShape {
  /** 5-digit county FIPS. */
  fips: string;
  name: string;
  /** SVG path data. */
  d: string;
}

export interface DistrictShape {
  /** District number as a string ("1", "12"). */
  id: string;
  label: string;
  d: string;
}

export interface StateGeo {
  fips: string;
  usps: string;
  name: string;
  /** "x y w h" for the <svg viewBox>. */
  viewBox: string;
  counties: CountyShape[];
  /** Interior borders between this state's counties. */
  bordersD: string;
  /** The state's outer boundary. */
  outlineD: string;
  /** 120th-Congress districts, same projection as the counties. */
  districts?: DistrictShape[];
}

/**
 * USPS codes with county geometry available. Add a line here after running
 * `node scripts/extract-county-geo.mjs <USPS>`.
 */
export const STATES_WITH_GEO = [
  "OH", "NC", "MI", "GA", "PA", "AZ", "WI", "NV", "TX", "VA", "NH", "MN",
  "CO", "NM", "KS", "IA", "ME", "MT", "NE", "OR", "AK", "SC", "IN", "WA",
  "CT", "TN", "MD", "MO", "UT", "KY", "AR", "WV", "ID", "SD", "ND", "DE",
  "VT", "WY", "HI", "RI", "MS", "OK", "NJ", "MA", "AL", "LA", "CA", "FL",
  "IL", "NY",
];

export function hasStateGeo(usps: string): boolean {
  return STATES_WITH_GEO.includes(usps);
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

const cache = new Map<string, StateGeo>();

export async function loadStateGeo(usps: string): Promise<StateGeo | null> {
  const cached = cache.get(usps);
  if (cached) return cached;
  if (!hasStateGeo(usps)) return null;
  const geo = await fetchJson<StateGeo>(`/geo/${usps}.json`);
  if (geo) cache.set(usps, geo);
  return geo;
}

export interface PrecinctShape {
  /** VTD code. Prefix with the county FIPS for the full Census GEOID20. */
  id: string;
  name: string;
  pop?: number;
  d: string;
  /**
   * 2020 presidential vote in this precinct: [Democratic, Republican, other].
   * Alias of `prr["2020-president"]`, kept for older callers.
   */
  pr?: [number, number, number];
  /**
   * Vote by race, `"<year>-<office>" -> [Democratic, Republican, other]`, folded
   * onto the 2020 VTD shapes by scripts/build-precinct-years.mjs. Years the
   * state has no precinct data for are absent (the map falls back to county
   * shading). Currently: Ohio (2016/2018/2020/2022/2024).
   */
  prr?: Record<string, [number, number, number]>;
}

export interface CountyPrecincts {
  /** 5-digit county FIPS. */
  countyFips: string;
  /** "x y w h" -- in the same projection as the parent StateGeo. */
  viewBox: string;
  precincts: PrecinctShape[];
}

/** USPS codes that have any precinct-level files at all (some states'
 *  precincts/<USPS> directory exists but is empty — not counted). */
const STATES_WITH_PRECINCTS = [
  "TX", "GA", "VA", "KY", "MO", "KS", "IL", "NC", "IA", "TN", "NE", "IN",
  "OH", "MN", "MI", "MS", "OK", "AR", "WI", "PA", "FL", "AL", "SD", "LA",
  "CO", "NY", "MT", "ND", "SC", "ID", "WV", "WA", "NM", "AK", "UT", "MD",
  "WY", "NJ", "NV", "AZ", "VT", "MA", "NH", "CT", "ME", "RI", "DE",
];

export function hasPrecincts(usps: string): boolean {
  return STATES_WITH_PRECINCTS.includes(usps);
}

const precinctCache = new Map<string, CountyPrecincts>();

/** Load one county's precincts (fetched on demand), or null if none. */
export async function loadCountyPrecincts(
  usps: string,
  countyFips: string
): Promise<CountyPrecincts | null> {
  const cached = precinctCache.get(countyFips);
  if (cached) return cached;
  if (!hasPrecincts(usps)) return null;
  const data = await fetchJson<CountyPrecincts>(
    `/geo/precincts/${usps}/${countyFips}.json`
  );
  if (data) precinctCache.set(countyFips, data);
  return data;
}

// Which "<year>-<office>" races each state has precinct-level (`prr`) data for,
// written by scripts/build-precinct-years.mjs. States not listed have only
// "2020-president" (from scripts/join-precinct-results.mjs). Tiny manifest —
// stays a regular bundled import, unlike the per-state/per-county geometry.
import precinctYearsManifest from "~/data/geo/precinctYears.generated.json";
const PRECINCT_YEARS = precinctYearsManifest as Record<string, string[]>;

/** Race keys with precinct-level numbers for this state. */
export function precinctRaceKeys(usps: string): string[] {
  return PRECINCT_YEARS[usps] ?? (hasPrecincts(usps) ? ["2020-president"] : []);
}

/** True when the precinct layer can shade this state by this exact race. */
export function hasPrecinctRace(usps: string, raceKey: string): boolean {
  return precinctRaceKeys(usps).includes(raceKey);
}

/**
 * `"<year>-<office>" -> "<cd>" -> "<countyFips>" -> [d, r, other]`: each
 * congressional district's slice of each county, summed from the precinct-level
 * `prr` by scripts/build-precinct-years.mjs. Lets the district-focused county
 * layer shade each county by its part of a House (or any) race. Only states run
 * through build-precinct-years have one (currently Ohio).
 */
export type DistrictCountyResults = Record<
  string,
  Record<string, Record<string, [number, number, number]>>
>;

const districtCountyCache = new Map<string, DistrictCountyResults | null>();

export async function loadDistrictCounty(
  usps: string
): Promise<DistrictCountyResults | null> {
  if (districtCountyCache.has(usps)) return districtCountyCache.get(usps) ?? null;
  const data = await fetchJson<DistrictCountyResults>(
    `/geo/${usps}.districtCounty.json`
  );
  districtCountyCache.set(usps, data);
  return data;
}

/**
 * districtId -> { countyFips -> [precinct VTD ids] }: which precincts actually
 * fall inside each congressional district. Produced by
 * scripts/assign-precincts-to-districts.mjs, loaded only when a district is
 * opened so the base state zoom stays small.
 */
export type DistrictPrecincts = Record<string, Record<string, string[]>>;

const districtPrecinctCache = new Map<string, DistrictPrecincts>();

export async function loadDistrictPrecincts(
  usps: string
): Promise<DistrictPrecincts | null> {
  const cached = districtPrecinctCache.get(usps);
  if (cached) return cached;
  const data = await fetchJson<DistrictPrecincts>(`/geo/${usps}.districts.json`);
  if (data) districtPrecinctCache.set(usps, data);
  return data;
}
