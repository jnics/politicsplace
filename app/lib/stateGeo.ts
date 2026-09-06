import type {
  Feature,
  FeatureCollection,
  MultiLineString,
} from "geojson";

/**
 * One state's county geometry, sliced out of us-atlas by
 * scripts/extract-county-geo.mjs and stored in app/data/geo/<USPS>.json.
 * Coordinates are pre-projected (us-atlas Albers plane), so the app renders
 * them with an identity projection and sets the SVG viewBox to `viewBox`.
 */
export interface StateGeo {
  fips: string;
  usps: string;
  name: string;
  /** "x y w h" for the <svg viewBox>. */
  viewBox: string;
  /** One feature per county; `id` is the 5-digit county FIPS. */
  counties: FeatureCollection;
  /** Interior borders between this state's counties. */
  borders: MultiLineString;
  /** The state's outer boundary. */
  outline: Feature;
}

/**
 * Per-state lazy loaders. Add a line here after running
 * `node scripts/extract-county-geo.mjs <USPS>` for a new state.
 */
const LOADERS: Record<string, () => Promise<{ default: StateGeo }>> = {
  OH: () => import("~/data/geo/OH.json") as Promise<{ default: StateGeo }>,
};

/** USPS codes that currently have county geometry available. */
export const STATES_WITH_GEO = Object.keys(LOADERS);

export function hasStateGeo(usps: string): boolean {
  return usps in LOADERS;
}

const cache = new Map<string, StateGeo>();

export async function loadStateGeo(usps: string): Promise<StateGeo | null> {
  const cached = cache.get(usps);
  if (cached) return cached;
  const loader = LOADERS[usps];
  if (!loader) return null;
  const mod = await loader();
  cache.set(usps, mod.default);
  return mod.default;
}
