import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseBvdCsv } from "../ingest/parseBvdCsv.js";
import { matchStationsToOperatorExport, type OperatorExportRow } from "./operatorExport.js";
import {
  isCityTierEligible,
  matchStationsToGazetteer,
  matchToGazetteer,
  type PlaceCentroid,
  type StationForGazetteerMatch,
} from "./gazetteer.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(dirname, "../../../data/bvd");
const fixturesDir = path.join(dirname, "../../test/fixtures/loves");

const eloyAz: PlaceCentroid = {
  stateUsps: "AZ",
  nameNormalized: "Eloy",
  latitude: 32.7548,
  longitude: -111.5527,
  uncertaintyM: 6031.4,
};

const centroids: readonly PlaceCentroid[] = [eloyAz];

describe("matchToGazetteer", () => {
  it("matches on (state, normalized city) and carries the centroid's uncertainty", () => {
    const match = matchToGazetteer("ELOY", "AZ", centroids);
    expect(match).not.toBeNull();
    expect(match?.resolution).toBe("city");
    expect(match?.resolutionSource).toBe("gazetteer");
    expect(match?.cityNormalized).toBe("Eloy");
    expect(match?.uncertaintyM).toBe(6031.4);
    expect(match?.latitude).toBe(32.7548);
    expect(match?.longitude).toBe(-111.5527);
  });

  it("normalises before matching — an already-clean raw string still matches", () => {
    expect(matchToGazetteer("Eloy", "AZ", centroids)).not.toBeNull();
  });

  it("returns null, never throws, when no centroid matches — the state disagrees", () => {
    expect(matchToGazetteer("ELOY", "TX", centroids)).toBeNull();
  });

  it("returns null, never throws, when no centroid matches — the city is unknown", () => {
    expect(matchToGazetteer("NOWHERESVILLE", "AZ", centroids)).toBeNull();
  });
});

describe("matchStationsToGazetteer", () => {
  it("preserves input order and reports the normalized city even on a miss", () => {
    const stations: StationForGazetteerMatch[] = [
      { id: "s1", cityRaw: "ELOY", stateUsps: "AZ" },
      { id: "s2", cityRaw: "NOWHERESVILLE", stateUsps: "AZ" },
    ];
    const results = matchStationsToGazetteer(stations, centroids);
    expect(results.map((r) => r.stationId)).toEqual(["s1", "s2"]);
    expect(results[0]?.match).not.toBeNull();
    expect(results[0]?.cityNormalized).toBe("Eloy");
    expect(results[1]?.match).toBeNull();
    expect(results[1]?.cityNormalized).toBe("Nowheresville");
  });
});

describe("isCityTierEligible", () => {
  it("excludes a city-tier station with uncertainty_m = 12 km, regardless of slack", () => {
    expect(isCityTierEligible(12_000, 1_000_000)).toBe(false);
  });

  it("includes a city-tier station with uncertainty_m = 3 km on a leg with enough slack", () => {
    expect(isCityTierEligible(3_000, 6_000)).toBe(true);
  });

  it("excludes uncertainty_m = 3 km when the leg does not have 2u of slack", () => {
    expect(isCityTierEligible(3_000, 5_999)).toBe(false);
  });

  it("excludes exactly at the 8 km boundary — the rule is strictly under 8 km", () => {
    expect(isCityTierEligible(8_000, 1_000_000)).toBe(false);
  });

  it("includes just under the 8 km boundary with enough slack", () => {
    expect(isCityTierEligible(7_999, 15_998)).toBe(true);
  });
});

describe("the 9 ambiguous (city, state) pairs never reach the gazetteer", () => {
  // §4.5's own count: 593 distinct (raw city, state) pairs across 605 rows,
  // exactly 9 held by more than one station, covering 21 rows.
  const AMBIGUOUS_PAIRS: ReadonlyArray<readonly [state: string, cityRaw: string]> = [
    ["AR", "Prescott"],
    ["FL", "Fort Pierce"],
    ["FL", "Jacksonville"],
    ["NM", "Albuquerque"],
    ["OK", "Oklahoma City"],
    ["TX", "Amarillo"],
    ["TX", "Houston"],
    ["TX", "Lufkin"],
    ["TX", "Van"],
  ];

  const augustFile = () =>
    readFileSync(path.join(dataDir, "pcn-usd-9206810-981.csv"));
  const operatorRows: OperatorExportRow[] = JSON.parse(
    readFileSync(path.join(fixturesDir, "operator_export.json"), "utf8"),
  );
  const bvdRows = parseBvdCsv(augustFile()).rows;

  it("covers exactly 21 rows, matching §4.5's measured count", () => {
    const ambiguousRows = bvdRows.filter((row) =>
      AMBIGUOUS_PAIRS.some(([state, city]) => row.state === state && row.city === city),
    );
    expect(ambiguousRows).toHaveLength(21);
  });

  it("resolves all 21 by store number at tier 1 — resolution_source is always operator_export", () => {
    const ambiguousRows = bvdRows.filter((row) =>
      AMBIGUOUS_PAIRS.some(([state, city]) => row.state === state && row.city === city),
    );

    const stations = bvdRows.map((row) => ({
      id: row.site,
      nameRaw: row.name,
      stateUsps: row.state,
    }));
    const result = matchStationsToOperatorExport(stations, operatorRows);
    const matchedById = new Map(result.matched.map((m) => [m.stationId, m]));

    for (const row of ambiguousRows) {
      const match = matchedById.get(row.site);
      expect(match).toBeDefined();
      expect(match?.update.resolutionSource).toBe("operator_export");
      expect(match?.update.resolution).toBe("exact");
    }
  });
});
