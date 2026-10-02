import { getIndexes } from "./data";
import { normalizeFips } from "./normalize";
import type { County, CountyWithNeighbors, NeighborOptions, State } from "./types";

function neighborsOf(fips: string): County[] {
  return [...(getIndexes().neighbors.get(fips) ?? [])];
}

function withNeighbors(county: County): CountyWithNeighbors {
  return Object.freeze({ ...county, neighbors: neighborsOf(county.fips) });
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
  const code = normalizeFips(fips);
  const county = code === undefined ? undefined : getIndexes().byFips.get(code);
  if (!county) return undefined;
  return options?.includeNeighbors ? withNeighbors(county) : county;
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
