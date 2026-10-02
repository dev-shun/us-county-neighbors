import type { County, Dataset } from "../src/types";

/** One Sheet1 row as returned by SheetJS `sheet_to_json` (values are whatever the cell held). */
export interface RawCountyRow {
  county?: unknown;
  county_ascii?: unknown;
  county_full?: unknown;
  county_fips?: unknown;
  state_id?: unknown;
  state_name?: unknown;
  lat?: unknown;
  lng?: unknown;
  population?: unknown;
}

const GEOID = /^\d{5}$/;

// Spreadsheet row number for a data row: +1 for 1-based numbering, +1 for the header row.
function sheetRow(index: number): number {
  return index + 2;
}

function text(row: RawCountyRow, key: keyof RawCountyRow, index: number): string {
  const value = row[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Sheet1 row ${sheetRow(index)}: "${key}" must be a non-empty string, got ${JSON.stringify(value)}`);
  }
  return value.trim();
}

function number(row: RawCountyRow, key: keyof RawCountyRow, index: number): number {
  const value = row[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Sheet1 row ${sheetRow(index)}: "${key}" must be a number, got ${JSON.stringify(value)}`);
  }
  return value;
}

function fips(row: RawCountyRow, index: number): string {
  const value = row.county_fips;
  const digits = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d{1,5}$/.test(digits)) {
    throw new Error(
      `Sheet1 row ${sheetRow(index)}: "county_fips" must be a 1-5 digit code, got ${JSON.stringify(value)}`,
    );
  }
  return digits.padStart(5, "0");
}

function byFips(a: County, b: County): number {
  return a.fips < b.fips ? -1 : a.fips > b.fips ? 1 : 0;
}

/** Sheet1 rows → County records sorted by FIPS. Throws on missing, malformed or duplicate values. */
export function parseCounties(rows: RawCountyRow[]): County[] {
  const seen = new Set<string>();
  const counties = rows.map((row, index): County => {
    const code = fips(row, index);
    if (seen.has(code)) throw new Error(`Sheet1 row ${sheetRow(index)}: duplicate FIPS ${code}`);
    seen.add(code);
    return {
      fips: code,
      name: text(row, "county", index),
      nameAscii: text(row, "county_ascii", index),
      fullName: text(row, "county_full", index),
      stateCode: text(row, "state_id", index).toUpperCase(),
      stateName: text(row, "state_name", index),
      lat: number(row, "lat", index),
      lng: number(row, "lng", index),
      population: number(row, "population", index),
    };
  });
  return counties.sort(byFips);
}

/**
 * Sheet2 lines ("Name|GEOID|Neighbor Name|Neighbor GEOID", header excluded) → neighbor FIPS lists.
 * Every county gets an entry. Self-pairs and GEOIDs not in `counties` (territories) are dropped.
 */
export function parseNeighbors(lines: string[], counties: County[]): Record<string, string[]> {
  const lists = new Map<string, Set<string>>(counties.map((c) => [c.fips, new Set<string>()]));
  lines.forEach((line, index) => {
    const fields = line.split("|");
    if (fields.length !== 4) {
      throw new Error(`Sheet2 row ${sheetRow(index)}: expected 4 "|"-separated fields, got ${JSON.stringify(line)}`);
    }
    const from = fields[1]!.trim();
    const to = fields[3]!.trim();
    if (!GEOID.test(from) || !GEOID.test(to)) {
      throw new Error(`Sheet2 row ${sheetRow(index)}: invalid GEOID in ${JSON.stringify(line)}`);
    }
    if (from === to) return; // the sheet lists every county as its own neighbor
    const list = lists.get(from);
    if (list && lists.has(to)) list.add(to);
  });
  const neighbors: Record<string, string[]> = {};
  for (const [code, list] of lists) neighbors[code] = [...list].sort();
  return neighbors;
}

/** Throws if any neighbor reference is missing, unknown, self-referencing or one-way. */
export function validateDataset({ counties, neighbors }: Dataset): void {
  const known = new Set(counties.map((c) => c.fips));
  for (const code of Object.keys(neighbors)) {
    if (!known.has(code)) throw new Error(`Neighbor list for unknown county ${code}`);
  }
  for (const code of known) {
    const list = neighbors[code];
    if (!list) throw new Error(`County ${code} has no neighbor list`);
    for (const other of list) {
      if (other === code) throw new Error(`County ${code} lists itself as a neighbor`);
      if (!known.has(other)) throw new Error(`County ${code} has unknown neighbor ${other}`);
      if (!neighbors[other]?.includes(code)) {
        throw new Error(`Asymmetric neighbors: ${code} -> ${other} but not ${other} -> ${code}`);
      }
    }
  }
}

/** Guards against a broken or restructured download producing a tiny or partial dataset. */
export function assertPlausibleSize({ counties }: Dataset): void {
  if (counties.length < 3100 || counties.length > 3200) {
    throw new Error(
      `Expected 3,100-3,200 counties, got ${counties.length}. Did the sheet download or layout change?`,
    );
  }
  const states = new Set(counties.map((c) => c.stateCode)).size;
  if (states !== 51) throw new Error(`Expected 51 states (50 + DC), got ${states}.`);
}

export function buildDataset(countyRows: RawCountyRow[], neighborLines: string[]): Dataset {
  const counties = parseCounties(countyRows);
  const dataset = { counties, neighbors: parseNeighbors(neighborLines, counties) };
  validateDataset(dataset);
  return dataset;
}

/** One county per line so data refreshes produce readable diffs. */
export function serializeCounties(counties: County[]): string {
  return `[\n${counties.map((c) => `  ${JSON.stringify(c)}`).join(",\n")}\n]\n`;
}

/** One county's neighbor list per line, keys sorted by FIPS. */
export function serializeNeighbors(neighbors: Record<string, string[]>): string {
  const lines = Object.keys(neighbors)
    .sort()
    .map((code) => `  ${JSON.stringify(code)}: ${JSON.stringify(neighbors[code])}`);
  return `{\n${lines.join(",\n")}\n}\n`;
}
