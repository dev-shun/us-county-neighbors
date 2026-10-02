// Loads the built package by name, so this exercises the "require" branch of the exports map.
const { getCountiesByState, searchCounties } = require("us-county-neighbors");

const [cook] = searchCounties("Cook", { state: "IL", includeNeighbors: true });
if (!cook || cook.fips !== "17031" || cook.neighbors.length !== 8 || getCountiesByState("IL").length !== 102) {
  console.error("CJS smoke test failed:", cook);
  process.exit(1);
}
console.log("CJS smoke test passed");
