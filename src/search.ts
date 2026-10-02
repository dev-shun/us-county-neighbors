import { getIndexes } from "./data";
import { normalizeFips, normalizeName } from "./normalize";
import type { County, CountyWithNeighbors, NeighborOptions, SearchOptions, State } from "./types";

function neighborsOf(fips: string): County[] {
  return [...(getIndexes().neighbors.get(fips) ?? [])];
}

function withNeighbors(county: County): CountyWithNeighbors {
  return Object.freeze({ ...county, neighbors: neighborsOf(county.fips) });
}

/** Rejects non-object options, so `searchCounties("Cook", "IL")` throws instead of ignoring "IL". */
function wantsNeighbors(options: NeighborOptions | undefined): boolean {
  if (options != null && typeof options !== "object") {
    throw new TypeError(`options must be an object, got ${typeof options}`);
  }
  return Boolean(options?.includeNeighbors);
}

function expand(counties: readonly County[], options: NeighborOptions | undefined): County[] | CountyWithNeighbors[] {
  return wantsNeighbors(options) ? counties.map(withNeighbors) : [...counties];
}

function resolveState(state: unknown): string {
  if (typeof state !== "string" || state.trim() === "") {
    throw new TypeError(`state must be a non-empty string, got ${JSON.stringify(state)}`);
  }
  const code = getIndexes().stateLookup.get(normalizeName(state));
  if (!code) {
    throw new RangeError(
      `Unknown state: ${JSON.stringify(state)}. Use a 2-letter code like "IL" or a full name like "Illinois".`,
    );
  }
  return code;
}

/**
 * Find counties whose name or full name matches exactly (ignoring case, accents and extra spaces).
 * "Cook", "cook county" and "COOK" all match Cook County. Sorted by state then name.
 */
export function searchCounties(name: string, options: SearchOptions & { includeNeighbors: true }): CountyWithNeighbors[];
export function searchCounties(name: string, options?: SearchOptions & { includeNeighbors?: false }): County[];
export function searchCounties(name: string, options?: SearchOptions): County[] | CountyWithNeighbors[];
export function searchCounties(name: string, options?: SearchOptions): County[] | CountyWithNeighbors[] {
  if (typeof name !== "string" || name.trim() === "") {
    throw new TypeError(`name must be a non-empty string, got ${JSON.stringify(name)}`);
  }
  const stateCode = options?.state === undefined ? undefined : resolveState(options.state);
  const matches = getIndexes().byName.get(normalizeName(name)) ?? [];
  return expand(stateCode ? matches.filter((c) => c.stateCode === stateCode) : matches, options);
}

/** Every county in a state ("IL", "il" or "Illinois"), sorted by name. */
export function getCountiesByState(
  state: string,
  options: NeighborOptions & { includeNeighbors: true },
): CountyWithNeighbors[];
export function getCountiesByState(state: string, options?: NeighborOptions & { includeNeighbors?: false }): County[];
export function getCountiesByState(state: string, options?: NeighborOptions): County[] | CountyWithNeighbors[];
export function getCountiesByState(state: string, options?: NeighborOptions): County[] | CountyWithNeighbors[] {
  return expand(getIndexes().byState.get(resolveState(state)) ?? [], options);
}

/** Look up one county by FIPS code ("17031", "1001" or 17031). */
export function getCounty(
  fips: string | number,
  options: NeighborOptions & { includeNeighbors: true },
): CountyWithNeighbors | undefined;
export function getCounty(
  fips: string | number,
  options?: NeighborOptions & { includeNeighbors?: false },
): County | undefined;
export function getCounty(fips: string | number, options?: NeighborOptions): County | CountyWithNeighbors | undefined;
export function getCounty(fips: string | number, options?: NeighborOptions): County | CountyWithNeighbors | undefined {
  const attach = wantsNeighbors(options);
  const code = normalizeFips(fips);
  const county = code === undefined ? undefined : getIndexes().byFips.get(code);
  if (!county) return undefined;
  return attach ? withNeighbors(county) : county;
}

/** Direct neighbors of a county, sorted by state then name. Empty for unknown FIPS codes. */
export function getNeighbors(fips: string | number): County[] {
  const code = normalizeFips(fips);
  return code === undefined ? [] : neighborsOf(code);
}

/** All 3,144 counties, sorted by state then name. */
export function getAllCounties(): County[] {
  return [...getIndexes().all];
}

/** The 50 states plus DC, sorted by code. */
export function getStates(): State[] {
  return [...getIndexes().states];
}
