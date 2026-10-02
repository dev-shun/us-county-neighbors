import { describe, expect, it } from "vitest";
import countiesJson from "../data/counties.json";
import neighborsJson from "../data/neighbors.json";
import { validateDataset } from "../scripts/transform";
import type { County } from "../src/types";

const counties = countiesJson as County[];
const neighbors = neighborsJson as Record<string, string[]>;

describe("shipped data", () => {
  it("has 3,144 counties with unique 5-digit FIPS codes", () => {
    expect(counties).toHaveLength(3144);
    const codes = counties.map((c) => c.fips);
    expect(new Set(codes).size).toBe(3144);
    for (const code of codes) expect(code).toMatch(/^\d{5}$/);
  });

  it("covers 50 states plus DC", () => {
    expect(new Set(counties.map((c) => c.stateCode)).size).toBe(51);
  });

  it("has a neighbor list for every county and no others", () => {
    expect(Object.keys(neighbors).sort()).toEqual(counties.map((c) => c.fips).sort());
  });

  it("has symmetric neighbors with no self-references or unknown counties", () => {
    expect(() => validateDataset({ counties, neighbors })).not.toThrow();
  });

  it("has 18,576 directed neighbor pairs", () => {
    const pairs = Object.values(neighbors).reduce((total, list) => total + list.length, 0);
    expect(pairs).toBe(18576);
  });
});
