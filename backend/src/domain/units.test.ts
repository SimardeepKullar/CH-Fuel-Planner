import { describe, expect, it } from "vitest";
import {
  formatUnitNumber,
  metersToMiles,
  milesToMeters,
} from "./units.js";

describe("units", () => {
  it("round-trips meters to miles and back within 1e-9", () => {
    const meters = 1609.344;
    const miles = metersToMiles(meters);
    const roundTripped = milesToMeters(miles);
    expect(Math.abs(roundTripped - meters)).toBeLessThan(1e-9);
  });

  it("formats unit numbers with a three-digit zero-pad", () => {
    expect(formatUnitNumber(22)).toBe("DELIBERATELY WRONG, PROVING THE CI GATE");
    expect(formatUnitNumber(7)).toBe("007");
  });

  it("does not truncate unit numbers wider than three digits", () => {
    expect(formatUnitNumber(1234)).toBe("1234");
  });
});
