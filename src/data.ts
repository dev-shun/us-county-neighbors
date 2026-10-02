import countiesJson from "../data/counties.json";
import neighborsJson from "../data/neighbors.json";
import { normalizeName } from "./normalize";
import type { County, State } from "./types";

export interface Indexes {
  /** Every county, sorted by `compareCounties`. */
  all: readonly County[];
  byFips: ReadonlyMap<string, County>;
  /** Keyed by the normalized `name`, `nameAscii` and `fullName`; each list sorted by `compareCounties`. */
  byName: ReadonlyMap<string, readonly County[]>;
  /** Keyed by state code; each list sorted by name. */
  byState: ReadonlyMap<string, readonly County[]>;
  /** Keyed by FIPS; each list sorted by `compareCounties`. */
  neighbors: ReadonlyMap<string, readonly County[]>;
  /** Sorted by code. */
  states: readonly State[];
  /** Normalized state code or name → state code. */
  stateLookup: ReadonlyMap<string, string>;
}

let cache: Indexes | undefined;

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** State code, then case-insensitive ASCII name, then FIPS. Locale-independent, so stable everywhere. */
export function compareCounties(a: County, b: County): number {
  return (
    compare(a.stateCode, b.stateCode) ||
    compare(a.nameAscii.toLowerCase(), b.nameAscii.toLowerCase()) ||
    compare(a.fips, b.fips)
  );
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function buildIndexes(rawCounties: County[], rawNeighbors: Record<string, string[]>): Indexes {
  const all = rawCounties.map((county) => Object.freeze({ ...county })).sort(compareCounties);
  const byFips = new Map(all.map((county) => [county.fips, county]));
  const byName = new Map<string, County[]>();
  const byState = new Map<string, County[]>();
  const stateLookup = new Map<string, string>();
  const states: State[] = [];

  for (const county of all) {
    for (const key of new Set([county.name, county.nameAscii, county.fullName].map(normalizeName))) {
      push(byName, key, county);
    }
    if (!byState.has(county.stateCode)) {
      states.push(Object.freeze({ code: county.stateCode, name: county.stateName }));
      stateLookup.set(normalizeName(county.stateCode), county.stateCode);
      stateLookup.set(normalizeName(county.stateName), county.stateCode);
    }
    push(byState, county.stateCode, county);
  }

  const neighbors = new Map<string, County[]>();
  for (const county of all) {
    const list = (rawNeighbors[county.fips] ?? [])
      .map((code) => byFips.get(code))
      .filter((neighbor): neighbor is County => neighbor !== undefined)
      .sort(compareCounties);
    neighbors.set(county.fips, list);
  }

  states.sort((a, b) => compare(a.code, b.code));
  return { all, byFips, byName, byState, neighbors, states, stateLookup };
}

/** Builds the indexes on first use and caches them for the life of the process. */
export function getIndexes(): Indexes {
  cache ??= buildIndexes(countiesJson satisfies County[], neighborsJson satisfies Record<string, string[]>);
  return cache;
}
