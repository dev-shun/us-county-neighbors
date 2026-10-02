// Loads the built package by name, so this exercises the "import" branch of the exports map.
import { getCountiesByState, searchCounties } from "us-county-neighbors";

const [cook] = searchCounties("Cook", { state: "IL", includeNeighbors: true });
if (!cook || cook.fips !== "17031" || cook.neighbors.length !== 8 || getCountiesByState("IL").length !== 102) {
  console.error("ESM smoke test failed:", cook);
  process.exit(1);
}
console.log("ESM smoke test passed");
