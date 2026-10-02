import { describe, expect, it } from "vitest";
import { normalizeFips, normalizeName } from "../src/normalize";

describe("normalizeName", () => {
  it("lowercases, trims and collapses whitespace", () => {
    expect(normalizeName("  Cook   COUNTY ")).toBe("cook county");
    expect(normalizeName(" Cook\tCounty ")).toBe("cook county");
  });

  it("strips accents so ASCII spellings match", () => {
    expect(normalizeName("Doña Ana")).toBe("dona ana");
    expect(normalizeName("DOÑA ANA")).toBe(normalizeName("Dona Ana"));
  });

  it("keeps punctuation", () => {
    expect(normalizeName("St. Louis")).toBe("st. louis");
    expect(normalizeName("Prince George\u2019s")).toBe("prince george's");
  });
});

describe("normalizeFips", () => {
  it("zero-pads numbers and digit strings to 5 characters", () => {
    expect(normalizeFips(1001)).toBe("01001");
    expect(normalizeFips("1001")).toBe("01001");
    expect(normalizeFips(" 17031 ")).toBe("17031");
    expect(normalizeFips("01001")).toBe("01001");
  });

  it("returns undefined for anything that is not a 1-5 digit code", () => {
    expect(normalizeFips("123456")).toBeUndefined();
    expect(normalizeFips("abc")).toBeUndefined();
    expect(normalizeFips("")).toBeUndefined();
    expect(normalizeFips(1.5)).toBeUndefined();
    expect(normalizeFips(-1)).toBeUndefined();
    expect(normalizeFips(null)).toBeUndefined();
  });
});
