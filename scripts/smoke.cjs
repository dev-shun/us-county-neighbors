// Loads the built package by name, so this exercises the "require" branch of the exports map.
const pkg = require("us-county-neighbors");

const EXPORTS = ["getAllCounties", "getCountiesByState", "getCounty", "getNeighbors", "getStates", "searchCounties"];
const [cook] = pkg.searchCounties("Cook", { state: "IL", includeNeighbors: true });
const ok =
  Object.keys(pkg).sort().join() === EXPORTS.join() &&
  cook?.fips === "17031" &&
  cook.neighbors.length === 8 &&
  pkg.getCounty(17031, { includeNeighbors: true })?.neighbors.length === 8 &&
  pkg.getNeighbors("17031").length === 8 &&
  pkg.getCountiesByState("IL").length === 102 &&
  pkg.getAllCounties().length === 3144 &&
  pkg.getStates().length === 51;
if (!ok) {
  console.error("CJS smoke test failed:", Object.keys(pkg), cook);
  process.exit(1);
}
console.log("CJS smoke test passed");
