import { describe, expect, it } from "vitest";
import { getAllCounties, getCounty, getNeighbors, getStates } from "../src/search";
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
    expect(getCounty("17031")).toEqual({
      fips: "17031",
      name: "Cook",
      nameAscii: "Cook",
      fullName: "Cook County",
      stateCode: "IL",
      stateName: "Illinois",
      lat: 41.8401,
      lng: -87.8168,
      population: 5182090,
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
