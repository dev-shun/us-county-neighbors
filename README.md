# us-county-neighbors

Search the 3,144 US counties (50 states + DC) by name or state, and get each county's neighboring counties.

- Zero runtime dependencies; data is bundled, so it works offline
- TypeScript types included; works with `import` and `require`
- Node.js 18+

## Install

```bash
npm install us-county-neighbors
```

## Usage

```js
import { searchCounties, getCountiesByState, getCounty, getNeighbors } from "us-county-neighbors";
// or: const { searchCounties } = require("us-county-neighbors");

// Search by county name
searchCounties("Washington");                 // 31 counties named Washington
searchCounties("Cook", { state: "IL" });      // [Cook County, IL]

// Include each match's neighbors
searchCounties("Cook", { state: "IL", includeNeighbors: true });
// [{ fips: "17031", name: "Cook", ..., neighbors: [DuPage IL, Kane IL, Lake IL, McHenry IL,
//                                                  Will IL, Lake IN, Porter IN, Berrien MI] }]

// List the counties in a state
getCountiesByState("Illinois");               // 102 counties, sorted by name
getCountiesByState("IL", { includeNeighbors: true });

// Look up by FIPS code
getCounty("17031");                           // Cook County, IL
getCounty(1001);                              // Autauga County, AL
getNeighbors("17031");                        // the 8 neighbors above
```

## API

| Function | Returns |
|---|---|
| `searchCounties(name, { state?, includeNeighbors? })` | Counties whose name or full name matches `name`, sorted by state then name |
| `getCountiesByState(state, { includeNeighbors? })` | Every county in `state`, sorted by name |
| `getCounty(fips, { includeNeighbors? })` | One county, or `undefined` |
| `getNeighbors(fips)` | A county's direct neighbors, sorted by state then name (`[]` if none or unknown) |
| `getAllCounties()` | All 3,144 counties, sorted by state then name |
| `getStates()` | `{ code, name }` for the 50 states and DC, sorted by code |

`state` accepts a 2-letter code or a full name, in any case: `"IL"`, `"il"`, `"Illinois"`.
`fips` accepts a string or number, padded or not: `"17031"`, `17031`, `"1001"`.

With `includeNeighbors: true`, each result has a `neighbors` array (TypeScript type `CountyWithNeighbors`).

### County

| Field | Example |
|---|---|
| `fips` | `"17031"` (always 5 digits) |
| `name` | `"Doña Ana"` |
| `nameAscii` | `"Dona Ana"` |
| `fullName` | `"Cook County"`, `"Orleans Parish"`, `"Baltimore City"` |
| `stateCode` | `"IL"` |
| `stateName` | `"Illinois"` |
| `lat`, `lng` | `41.8401`, `-87.8168` |
| `population` | `5182090` |

Returned objects are frozen. Returned arrays are new copies that you can modify freely.

### Name matching

Matching is exact, but ignores case, accents and extra spaces, and checks both the name and the full name:

- `"cook"`, `"Cook County"` and `"COOK"` all match Cook County.
- `"Dona Ana"` matches `"Doña Ana"`, and curly apostrophes match straight ones (`"Prince George’s"` → `"Prince George's"`).
- `"Baltimore"` returns both Baltimore County and Baltimore City; `"Baltimore County"` returns only the county.
- Many names repeat across states (31 Washingtons), so pass `state` to narrow the results.

### Errors

- A name that matches nothing returns `[]`.
- An empty or non-string name or state throws a `TypeError`, as does an `options` argument that isn't an object (e.g. `searchCounties("Cook", "IL")`).
- An unknown state (e.g. `"XX"`) throws a `RangeError`.
- An unknown FIPS code returns `undefined` (`getCounty`) or `[]` (`getNeighbors`).

### Notes

- Neighbors are direct neighbors only, and can be in other states. Honolulu, Hawaii and Kauai counties (HI) have none.
- US territories (Puerto Rico, Guam, etc.) are not included.

## Data

The data comes from [this spreadsheet](https://docs.google.com/spreadsheets/d/1GaOFD2TYva_0aYgIjHVik17O4YLz0buO): Sheet1 lists the counties and Sheet2 lists neighboring county pairs.

To refresh it:

```bash
npm run sync-data   # downloads the sheet, validates it, rewrites data/*.json
npm test            # confirm nothing unexpected changed
git diff data/      # review the changes
```

Then bump the version and publish.

## Development

```bash
npm install
npm test            # unit + data tests
npm run typecheck
npm run build       # dist/ (ESM + CJS + types)
npm run smoke       # load the built package via require and import
```

Development requires Node.js 22.18+ (or 24.11+).

## License

MIT
