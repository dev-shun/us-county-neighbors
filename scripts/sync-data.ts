import { mkdir, writeFile } from "node:fs/promises";
import * as XLSX from "xlsx";
import {
  assertPlausibleSize,
  buildDataset,
  serializeCounties,
  serializeNeighbors,
  type RawCountyRow,
} from "./transform";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1GaOFD2TYva_0aYgIjHVik17O4YLz0buO/export?format=xlsx";
const DATA_DIR = new URL("../data/", import.meta.url);

async function main(): Promise<void> {
  console.log(`Downloading ${SHEET_URL}`);
  const response = await fetch(SHEET_URL);
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status} ${response.statusText}`);
  const workbook = XLSX.read(new Uint8Array(await response.arrayBuffer()), { type: "array" });

  const [countySheetName, neighborSheetName] = workbook.SheetNames;
  const countySheet = countySheetName === undefined ? undefined : workbook.Sheets[countySheetName];
  const neighborSheet = neighborSheetName === undefined ? undefined : workbook.Sheets[neighborSheetName];
  if (!countySheet || !neighborSheet) {
    throw new Error(`Expected 2 sheets, found: ${workbook.SheetNames.join(", ")}`);
  }

  const countyRows = XLSX.utils.sheet_to_json<RawCountyRow>(countySheet, { defval: null });
  const neighborLines = XLSX.utils
    .sheet_to_json<unknown[]>(neighborSheet, { header: 1, blankrows: false })
    .slice(1) // header row
    .map((row) => String(row[0] ?? ""));

  const dataset = buildDataset(countyRows, neighborLines);
  assertPlausibleSize(dataset);

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(new URL("counties.json", DATA_DIR), serializeCounties(dataset.counties));
  await writeFile(new URL("neighbors.json", DATA_DIR), serializeNeighbors(dataset.neighbors));

  const pairs = Object.values(dataset.neighbors).reduce((total, list) => total + list.length, 0);
  console.log(`Wrote ${dataset.counties.length} counties and ${pairs} neighbor pairs to data/`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
