import { describe, expect, it } from "vitest";
import { matchDriverName, type DriverAliasForMatch, type DriverForMatch } from "./drivers.js";
import { normalizeName } from "../resolve/normalizeName.js";

const DRIVERS: DriverForMatch[] = [
  { id: "d-narinder", displayName: "NARINDER NINDA" },
  { id: "d-harinder", displayName: "HARINDER GREWAL" },
  { id: "d-kulwant", displayName: "KULWANT SINGH BAL" },
];

const ALIASES: DriverAliasForMatch[] = [
  { aliasNormalized: normalizeName("KULWANT S BAL"), driverId: "d-kulwant" },
  { aliasNormalized: normalizeName("K BAL"), driverId: "d-kulwant" },
];

describe("matchDriverName", () => {
  it("matches a double-spaced name against the display name", () => {
    expect(matchDriverName("HARINDER  GREWAL", ALIASES, DRIVERS)).toEqual({
      matched: true,
      driverId: "d-harinder",
    });
  });

  it("matches a lowercase name against the display name, case-insensitively", () => {
    expect(matchDriverName("narinder ninda", ALIASES, DRIVERS)).toEqual({
      matched: true,
      driverId: "d-narinder",
    });
  });

  it("matches an abbreviated name through driver_aliases", () => {
    expect(matchDriverName("KULWANT S BAL", ALIASES, DRIVERS)).toEqual({
      matched: true,
      driverId: "d-kulwant",
    });
  });

  it("returns unmatched for a name with no alias and no display-name hit — never a best guess", () => {
    expect(matchDriverName("rajinder", ALIASES, DRIVERS)).toEqual({ matched: false });
  });

  it("resolves both of two aliases pointing at the same driver", () => {
    expect(matchDriverName("KULWANT S BAL", ALIASES, DRIVERS)).toEqual({
      matched: true,
      driverId: "d-kulwant",
    });
    expect(matchDriverName("K BAL", ALIASES, DRIVERS)).toEqual({
      matched: true,
      driverId: "d-kulwant",
    });
  });

  it("returns unmatched against an empty roster rather than throwing", () => {
    expect(matchDriverName("ANYONE", [], [])).toEqual({ matched: false });
  });
});
