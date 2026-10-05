# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-06

Initial release.

### Added

- `searchCounties(name, { state?, includeNeighbors? })` to find counties by name, optionally within one state.
- `getCountiesByState(state, { includeNeighbors? })` to list every county in a state.
- `getCounty(fips, { includeNeighbors? })` and `getNeighbors(fips)` to look up a county and its direct neighbors by FIPS code.
- `getAllCounties()` and `getStates()`.
- Bundled data for the 3,144 counties and county-equivalents of the 50 states and DC: names, FIPS codes, coordinates, population and Census county adjacency.
- Name matching that ignores case, accents, extra spaces and curly apostrophes, and matches both the name (`"Cook"`) and the full name (`"Cook County"`).
- States accepted as a 2-letter code or full name in any case; FIPS codes accepted as strings or numbers, padded or not.
- `TypeError` for empty or non-string names and states and for non-object `options`; `RangeError` for unknown states.
- ESM and CommonJS builds with TypeScript types. No runtime dependencies; requires Node.js 18+.
