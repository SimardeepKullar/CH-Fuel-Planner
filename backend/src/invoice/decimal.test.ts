import { describe, expect, it } from "vitest";
import { DecimalFormatError, toDecimalString } from "./decimal.js";

describe("toDecimalString", () => {
  it("pads a shorter decimal out to the requested precision", () => {
    expect(toDecimalString("4.889", 4)).toBe("4.8890");
    expect(toDecimalString("5.989", 4)).toBe("5.9890");
  });

  it("round-trips a value already at the requested precision, exactly", () => {
    expect(toDecimalString("5.2395", 4)).toBe("5.2395");
    expect(toDecimalString(toDecimalString("5.2395", 4), 4)).toBe("5.2395");
  });

  it("pads an integer with no decimal point", () => {
    expect(toDecimalString("455", 2)).toBe("455.00");
    expect(toDecimalString("0", 2)).toBe("0.00");
  });

  it("pads a sub-unit value", () => {
    expect(toDecimalString("0.04", 2)).toBe("0.04");
    expect(toDecimalString("0.2", 2)).toBe("0.20");
  });

  it("rejects a value with more fractional digits than requested", () => {
    expect(() => toDecimalString("5.23951", 4)).toThrow(DecimalFormatError);
  });

  it("rejects non-numeric text", () => {
    expect(() => toDecimalString("N/A", 2)).toThrow(DecimalFormatError);
    expect(() => toDecimalString("", 2)).toThrow(DecimalFormatError);
  });

  it("never routes through parseFloat: a long-tail binary fraction stays exact", () => {
    // 5.2395 cannot be represented exactly in IEEE-754 double; parseFloat
    // then toFixed(4) on some inputs reintroduces trailing-9 artifacts.
    // A pure string-based implementation never has this failure mode.
    expect(toDecimalString("5.2395", 4)).not.toContain("9999");
    expect(toDecimalString("5.2395", 4)).not.toContain("0001");
  });
});
