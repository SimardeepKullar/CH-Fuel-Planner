import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatDistanceMiles,
  formatDuration,
  formatGallons,
  formatPricePerGallon,
  formatUnitNumber,
} from "./format";

describe("format", () => {
  it("formats currency with two decimal places and a dollar sign", () => {
    expect(formatCurrency(286.62)).toBe("$286.62");
    expect(formatCurrency(3.4)).toBe("$3.40");
  });

  it("formats a negative amount with a leading minus before the dollar sign", () => {
    expect(formatCurrency(-41)).toBe("-$41.00");
  });

  it("formats seconds as hours and minutes", () => {
    expect(formatDuration(27600)).toBe("7h 40m");
    expect(formatDuration(32700)).toBe("9h 05m");
  });

  it("formats a three-digit zero-padded unit number", () => {
    expect(formatUnitNumber(22)).toBe("022");
    expect(formatUnitNumber(7)).toBe("007");
    expect(formatUnitNumber(1234)).toBe("1234");
  });

  it("formats distance and gallons with one decimal place", () => {
    expect(formatDistanceMiles(486.5)).toBe("486.5 mi");
    expect(formatGallons(68)).toBe("68.0 gal");
  });

  it("formats a per-gallon price to three decimals by default", () => {
    expect(formatPricePerGallon(4.505)).toBe("$4.505");
    expect(formatPricePerGallon(4.09, 2)).toBe("$4.09");
  });
});
