import { describe, expect, it } from "vitest";
import {
  getAllCounties,
  getCountiesByState,
  getCounty,
  getNeighbors,
  getStates,
  searchCounties,
} from "../src/search";
import type { County } from "../src/types";

const label = (c: County) => `${c.name}, ${c.stateCode}`;
const COOK_NEIGHBORS = [
  "DuPage, IL",
  "Kane, IL",
  "Lake, IL",
  "McHenry, IL",
  "Will, IL",
  "Lake, IN",
  "Porter, IN",
  "Berrien, MI",
];

describe("getCounty", () => {
  it("finds a county by FIPS string", () => {
    // lat, lng and population can legitimately change on a data sync, so only their type is pinned.
    expect(getCounty("17031")).toEqual({
      fips: "17031",
      name: "Cook",
      nameAscii: "Cook",
      fullName: "Cook County",
      stateCode: "IL",
      stateName: "Illinois",
      lat: expect.any(Number),
      lng: expect.any(Number),
      population: expect.any(Number),
    });
  });

  it("accepts numeric and unpadded FIPS codes", () => {
    expect(getCounty(17031)?.name).toBe("Cook");
    expect(getCounty(1001)?.name).toBe("Autauga");
    expect(getCounty("1001")?.name).toBe("Autauga");
  });

  it("returns undefined for unknown or malformed FIPS codes", () => {
    expect(getCounty("99999")).toBeUndefined();
    expect(getCounty("abc")).toBeUndefined();
  });

  it("attaches neighbors when asked", () => {
    const cook = getCounty("17031", { includeNeighbors: true });
    expect(cook?.neighbors.map(label)).toEqual(COOK_NEIGHBORS);
    expect(() => getCounty("17031", true as never)).toThrow(TypeError);
  });

  it("returns frozen objects", () => {
    const cook = getCounty("17031")!;
    expect(Object.isFrozen(cook)).toBe(true);
    expect(() => {
      (cook as { name: string }).name = "Chicago";
    }).toThrow(TypeError);
    expect(Object.isFrozen(getCounty("17031", { includeNeighbors: true }))).toBe(true);
  });
});

describe("getNeighbors", () => {
  it("returns direct neighbors sorted by state then name, across state lines", () => {
    expect(getNeighbors("17031").map(label)).toEqual(COOK_NEIGHBORS);
    expect(getNeighbors(17031).map(label)).toEqual(COOK_NEIGHBORS);
  });

  it("returns an empty list for the Hawaii island counties with no land neighbors", () => {
    expect(getNeighbors("15001")).toEqual([]); // Hawaii
    expect(getNeighbors("15003")).toEqual([]); // Honolulu
    expect(getNeighbors("15007")).toEqual([]); // Kauai
  });

  it("returns an empty list for unknown or malformed FIPS codes", () => {
    expect(getNeighbors("99999")).toEqual([]);
    expect(getNeighbors("abc")).toEqual([]);
  });

  it("never lists a county as its own neighbor", () => {
    for (const county of getAllCounties()) {
      expect(getNeighbors(county.fips).some((n) => n.fips === county.fips)).toBe(false);
    }
  });

  it("returns a fresh array each call", () => {
    getNeighbors("17031").pop();
    expect(getNeighbors("17031")).toHaveLength(8);
  });
});

describe("getAllCounties", () => {
  it("returns all 3,144 counties sorted by state then name", () => {
    const all = getAllCounties();
    expect(all).toHaveLength(3144);
    expect(label(all[0]!)).toBe("Aleutians East, AK");
    expect(label(all.at(-1)!)).toBe("Weston, WY");
  });

  it("returns a fresh array each call", () => {
    getAllCounties().length = 0;
    expect(getAllCounties()).toHaveLength(3144);
  });
});

describe("getStates", () => {
  it("returns 50 states plus DC sorted by code", () => {
    const states = getStates();
    expect(states).toHaveLength(51);
    expect(states[0]).toEqual({ code: "AK", name: "Alaska" });
    expect(states).toContainEqual({ code: "DC", name: "District of Columbia" });
    expect(states.map((s) => s.code)).toEqual(states.map((s) => s.code).sort());
  });
});

const fipsOf = (counties: County[]) => counties.map((c) => c.fips);

describe("searchCounties", () => {
  it("returns every county with that name, sorted by state", () => {
    const result = searchCounties("Washington");
    expect(result).toHaveLength(31);
    expect(result.every((c) => c.name === "Washington")).toBe(true);
    const codes = result.map((c) => c.stateCode);
    expect(codes).toEqual([...codes].sort());
  });

  it("matches the full name, so 'Washington County' excludes Washington Parish", () => {
    const result = searchCounties("Washington County");
    expect(result).toHaveLength(30);
    expect(result.some((c) => c.stateCode === "LA")).toBe(false);
  });

  it("is case-, whitespace- and accent-insensitive", () => {
    expect(fipsOf(searchCounties("cook county", { state: "IL" }))).toEqual(["17031"]);
    expect(fipsOf(searchCounties("  COOK  ", { state: "il" }))).toEqual(["17031"]);
    expect(fipsOf(searchCounties("Dona Ana"))).toEqual(["35013"]);
    expect(fipsOf(searchCounties("doña ana county"))).toEqual(["35013"]);
  });

  it("finds same-named counties in different states", () => {
    expect(searchCounties("Cook").map((c) => c.stateCode)).toEqual(["GA", "IL", "MN"]);
  });

  it("separates a county from an independent city with the same name", () => {
    expect(fipsOf(searchCounties("Baltimore"))).toEqual(["24005", "24510"]);
    expect(fipsOf(searchCounties("Baltimore County"))).toEqual(["24005"]);
    expect(fipsOf(searchCounties("Baltimore City"))).toEqual(["24510"]);
    expect(fipsOf(searchCounties("St. Louis", { state: "MO" }))).toEqual(["29189", "29510"]);
  });

  it("matches non-'County' full names", () => {
    expect(fipsOf(searchCounties("Orleans Parish"))).toEqual(["22071"]);
    expect(fipsOf(searchCounties("District of Columbia"))).toEqual(["11001"]);
  });

  it("accepts a state code or a full state name", () => {
    expect(fipsOf(searchCounties("Cook", { state: "Illinois" }))).toEqual(["17031"]);
    expect(fipsOf(searchCounties("Cook", { state: " minnesota " }))).toEqual(["27031"]);
  });

  it("attaches neighbors when includeNeighbors is true", () => {
    const [cook, ...rest] = searchCounties("Cook", { state: "IL", includeNeighbors: true });
    expect(rest).toEqual([]);
    expect(cook?.fips).toBe("17031");
    expect(cook?.neighbors.map(label)).toEqual(COOK_NEIGHBORS);
    expect(Object.isFrozen(cook)).toBe(true);
  });

  it("does not attach neighbors by default", () => {
    expect(searchCounties("Cook", { state: "IL" })[0]).not.toHaveProperty("neighbors");
  });

  it("returns an empty list when nothing matches", () => {
    expect(searchCounties("Atlantis")).toEqual([]);
    expect(searchCounties("Cook", { state: "TX" })).toEqual([]);
  });

  it("throws a RangeError for an unknown state", () => {
    expect(() => searchCounties("Cook", { state: "XX" })).toThrow(RangeError);
    expect(() => searchCounties("Cook", { state: "XX" })).toThrow('Unknown state: "XX"');
  });

  it("throws a TypeError for an empty or non-string name, or non-object options", () => {
    expect(() => searchCounties("")).toThrow(TypeError);
    expect(() => searchCounties("   ")).toThrow(TypeError);
    expect(() => searchCounties(42 as unknown as string)).toThrow(TypeError);
    expect(() => searchCounties("Cook", "IL" as never)).toThrow(TypeError);
  });

  it("returns a fresh array each call", () => {
    searchCounties("Washington").length = 0;
    expect(searchCounties("Washington")).toHaveLength(31);
  });
});

describe("getCountiesByState", () => {
  it("returns every county in a state, sorted by name", () => {
    const result = getCountiesByState("IL");
    expect(result).toHaveLength(102);
    expect(result[0]?.name).toBe("Adams");
    expect(result.at(-1)?.name).toBe("Woodford");
    expect(result.every((c) => c.stateCode === "IL")).toBe(true);
  });

  it("accepts codes and names in any case", () => {
    const expected = fipsOf(getCountiesByState("IL"));
    expect(fipsOf(getCountiesByState("il"))).toEqual(expected);
    expect(fipsOf(getCountiesByState("Illinois"))).toEqual(expected);
    expect(fipsOf(getCountiesByState("  ILLINOIS "))).toEqual(expected);
  });

  it("handles DC", () => {
    expect(fipsOf(getCountiesByState("District of Columbia"))).toEqual(["11001"]);
  });

  it("attaches neighbors when includeNeighbors is true", () => {
    const result = getCountiesByState("IL", { includeNeighbors: true });
    expect(result.every((c) => Array.isArray(c.neighbors))).toBe(true);
    expect(result.find((c) => c.fips === "17031")?.neighbors.map(label)).toEqual(COOK_NEIGHBORS);
  });

  it("throws a RangeError for an unknown state, a TypeError for an empty one or non-object options", () => {
    expect(() => getCountiesByState("XX")).toThrow(RangeError);
    expect(() => getCountiesByState("")).toThrow(TypeError);
    expect(() => getCountiesByState("IL", true as never)).toThrow(TypeError);
  });

  it("returns a fresh array each call", () => {
    getCountiesByState("IL").length = 0;
    expect(getCountiesByState("IL")).toHaveLength(102);
  });
});
