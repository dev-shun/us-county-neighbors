import { describe, expect, it } from "vitest";
import {
  assertPlausibleSize,
  buildDataset,
  parseCounties,
  parseNeighbors,
  serializeCounties,
  serializeNeighbors,
  validateDataset,
  type RawCountyRow,
} from "../scripts/transform";

function row(overrides: Partial<RawCountyRow> = {}): RawCountyRow {
  return {
    county: "Cook",
    county_ascii: "Cook",
    county_full: "Cook County",
    county_fips: 17031,
    state_id: "IL",
    state_name: "Illinois",
    lat: 41.8401,
    lng: -87.8168,
    population: 5182090,
    ...overrides,
  };
}

const COOK = row();
const DUPAGE = row({
  county: "DuPage",
  county_ascii: "DuPage",
  county_full: "DuPage County",
  county_fips: 17043,
  lat: 41.852,
  lng: -88.0857,
  population: 929060,
});
const AUTAUGA = row({
  county: "Autauga",
  county_ascii: "Autauga",
  county_full: "Autauga County",
  county_fips: 1001,
  state_id: "AL",
  state_name: "Alabama",
  lat: 32.5349,
  lng: -86.6427,
  population: 58761,
});

const COOK_DUPAGE_LINES = [
  "Cook County, IL|17031|DuPage County, IL|17043",
  "DuPage County, IL|17043|Cook County, IL|17031",
];

describe("parseCounties", () => {
  it("maps sheet columns to County fields and zero-pads FIPS", () => {
    expect(parseCounties([AUTAUGA])).toEqual([
      {
        fips: "01001",
        name: "Autauga",
        nameAscii: "Autauga",
        fullName: "Autauga County",
        stateCode: "AL",
        stateName: "Alabama",
        lat: 32.5349,
        lng: -86.6427,
        population: 58761,
      },
    ]);
  });

  it("accepts FIPS stored as text", () => {
    expect(parseCounties([row({ county_fips: "1001" })])[0]?.fips).toBe("01001");
  });

  it("sorts counties by FIPS", () => {
    expect(parseCounties([DUPAGE, COOK, AUTAUGA]).map((c) => c.fips)).toEqual(["01001", "17031", "17043"]);
  });

  it("rejects duplicate FIPS codes", () => {
    expect(() => parseCounties([COOK, COOK])).toThrow("Sheet1 row 3: duplicate FIPS 17031");
  });

  it("rejects missing text fields", () => {
    expect(() => parseCounties([row({ county: null })])).toThrow('Sheet1 row 2: "county" must be a non-empty string');
  });

  it("rejects non-numeric coordinates and population", () => {
    expect(() => parseCounties([row({ lat: "41.8" })])).toThrow('Sheet1 row 2: "lat" must be a number');
    expect(() => parseCounties([row({ population: null })])).toThrow('Sheet1 row 2: "population" must be a number');
  });

  it("rejects malformed FIPS codes", () => {
    expect(() => parseCounties([row({ county_fips: "abc" })])).toThrow(
      'Sheet1 row 2: "county_fips" must be a 1-5 digit code',
    );
  });
});

describe("parseNeighbors", () => {
  const counties = parseCounties([COOK, DUPAGE, AUTAUGA]);

  it("builds a neighbor list per county, dropping self-pairs and unknown GEOIDs", () => {
    const lines = [
      "Autauga County, AL|01001|Autauga County, AL|01001",
      "Cook County, IL|17031|Cook County, IL|17031",
      ...COOK_DUPAGE_LINES,
      "Guam, GU|66010|Guam, GU|66010",
      "Cook County, IL|17031|Mystery Municipio, PR|72001",
    ];
    expect(parseNeighbors(lines, counties)).toEqual({
      "01001": [],
      "17031": ["17043"],
      "17043": ["17031"],
    });
  });

  it("ignores duplicate rows", () => {
    const line = "Cook County, IL|17031|DuPage County, IL|17043";
    expect(parseNeighbors([line, line], counties)["17031"]).toEqual(["17043"]);
  });

  it("rejects rows without four fields", () => {
    expect(() => parseNeighbors(["Cook County, IL|17031"], counties)).toThrow(
      'Sheet2 row 2: expected 4 "|"-separated fields',
    );
  });

  it("rejects rows with malformed GEOIDs", () => {
    expect(() => parseNeighbors(["Cook County, IL|17031|DuPage County, IL|1704"], counties)).toThrow(
      "Sheet2 row 2: invalid GEOID",
    );
  });
});

describe("validateDataset", () => {
  const counties = parseCounties([COOK, DUPAGE]);

  it("accepts symmetric neighbor lists", () => {
    expect(() => validateDataset({ counties, neighbors: { "17031": ["17043"], "17043": ["17031"] } })).not.toThrow();
  });

  it("rejects one-way neighbor relationships", () => {
    expect(() => validateDataset({ counties, neighbors: { "17031": ["17043"], "17043": [] } })).toThrow(
      "Asymmetric neighbors: 17031 -> 17043 but not 17043 -> 17031",
    );
  });

  it("rejects neighbors that are not known counties", () => {
    expect(() => validateDataset({ counties, neighbors: { "17031": ["99999"], "17043": [] } })).toThrow(
      "County 17031 has unknown neighbor 99999",
    );
  });

  it("rejects a county listed as its own neighbor", () => {
    expect(() => validateDataset({ counties, neighbors: { "17031": ["17031"], "17043": [] } })).toThrow(
      "County 17031 lists itself as a neighbor",
    );
  });

  it("rejects a county without a neighbor list", () => {
    expect(() => validateDataset({ counties, neighbors: { "17031": [] } })).toThrow(
      "County 17043 has no neighbor list",
    );
  });

  it("rejects a neighbor list for an unknown county", () => {
    expect(() => validateDataset({ counties, neighbors: { "17031": [], "17043": [], "99999": [] } })).toThrow(
      "Neighbor list for unknown county 99999",
    );
  });
});

describe("buildDataset", () => {
  it("parses and validates both sheets", () => {
    expect(buildDataset([DUPAGE, COOK], COOK_DUPAGE_LINES)).toEqual({
      counties: parseCounties([COOK, DUPAGE]),
      neighbors: { "17031": ["17043"], "17043": ["17031"] },
    });
  });
});

describe("assertPlausibleSize", () => {
  it("rejects a dataset with too few counties", () => {
    expect(() => assertPlausibleSize(buildDataset([COOK], []))).toThrow("Expected 3,100-3,200 counties, got 1");
  });

  it("rejects a dataset that does not cover 50 states plus DC", () => {
    const [cook] = parseCounties([COOK]);
    const counties = Array.from({ length: 3144 }, (_, i) => ({ ...cook!, fips: String(i + 1).padStart(5, "0") }));
    expect(() => assertPlausibleSize({ counties, neighbors: {} })).toThrow("Expected 51 states (50 + DC), got 1");
  });
});

describe("serializers", () => {
  const dataset = buildDataset([COOK, DUPAGE], COOK_DUPAGE_LINES);

  it("writes one county per line and round-trips through JSON.parse", () => {
    const text = serializeCounties(dataset.counties);
    expect(text.split("\n")).toHaveLength(5); // "[", 2 counties, "]", trailing ""
    expect(JSON.parse(text)).toEqual(dataset.counties);
  });

  it("writes one neighbor list per line, sorted by FIPS, and round-trips", () => {
    const text = serializeNeighbors(dataset.neighbors);
    expect(text).toBe('{\n  "17031": ["17043"],\n  "17043": ["17031"]\n}\n');
    expect(JSON.parse(text)).toEqual(dataset.neighbors);
  });
});
