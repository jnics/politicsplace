/**
 * One state's county geometry, produced by scripts/extract-county-geo.mjs and
 * stored in app/data/geo/<USPS>.json. Each state is projected on its own upright
 * geoMercator, and the geometry is pre-serialised to SVG path strings so the app
 * renders it with no projection library and no runtime work.
 */
export interface CountyShape {
  /** 5-digit county FIPS. */
  fips: string;
  name: string;
  /** SVG path data. */
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
}

/**
 * Per-state lazy loaders. Add a line here after running
 * `node scripts/extract-county-geo.mjs <USPS>` for a new state.
 */
const LOADERS: Record<string, () => Promise<{ default: StateGeo }>> = {
  OH: () => import("~/data/geo/OH.json") as unknown as Promise<{ default: StateGeo }>,
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
