import { describe, expectTypeOf, it } from "vitest";
import {
  getCountiesByState,
  getCounty,
  searchCounties,
  type County,
  type CountyWithNeighbors,
} from "../src/index";

// These assertions are enforced by `npm run typecheck`; at runtime they are no-ops.
describe("includeNeighbors narrows return types", () => {
  it("searchCounties", () => {
    expectTypeOf(searchCounties("Cook")).toEqualTypeOf<County[]>();
    expectTypeOf(searchCounties("Cook", { state: "IL" })).toEqualTypeOf<County[]>();
    expectTypeOf(searchCounties("Cook", { includeNeighbors: true })).toEqualTypeOf<CountyWithNeighbors[]>();
    const flag: boolean = Math.random() > 0.5;
    expectTypeOf(searchCounties("Cook", { includeNeighbors: flag })).toEqualTypeOf<
      County[] | CountyWithNeighbors[]
    >();
  });

  it("getCountiesByState", () => {
    expectTypeOf(getCountiesByState("IL")).toEqualTypeOf<County[]>();
    expectTypeOf(getCountiesByState("IL", { includeNeighbors: true })).toEqualTypeOf<CountyWithNeighbors[]>();
  });

  it("getCounty", () => {
    expectTypeOf(getCounty("17031")).toEqualTypeOf<County | undefined>();
    expectTypeOf(getCounty("17031", { includeNeighbors: true })).toEqualTypeOf<CountyWithNeighbors | undefined>();
  });
});
