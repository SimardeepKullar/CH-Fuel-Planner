import { describe, expect, it, vi } from "vitest";
import { ExpressRowFormatError, parseExpressRows, type RawExpressRow } from "./parseExpressRows.js";

/** Synthetic rows — invented, not from any real invoice. Shapes the DoD
 * cares about: a normal row, a blank-driver row (tractor present, driver
 * not), and the flat $3.00 fee on every row. */
const SAMPLE_ROWS: RawExpressRow[] = [
  {
    lineNumber: 10,
    record: ["2026-01-05 08:00:00", "9000001", "X1000001", "101", "SAMPLE DRIVER", "50.00", "3", "53.00", "US", "lumper", ""],
  },
  {
    lineNumber: 11,
    record: ["2026-01-06 09:00:00", "9000002", "X1000002", "102", "", "75.00", "3", "78.00", "US", "lumper", ""],
  },
  {
    lineNumber: 12,
    record: ["2026-01-07 10:00:00", "9000003", "X1000003", "", "", "40.00", "3", "43.00", "US", "repair", ""],
  },
];

describe("parseExpressRows", () => {
  it("parses a normal row and the blank-driver row (tractor present, driver not)", () => {
    const rows = parseExpressRows(SAMPLE_ROWS);
    const normal = rows.find((r) => r.expressCode === "9000001")!;
    expect(normal).toMatchObject({
      unitRaw: "101",
      driverNameRaw: "SAMPLE DRIVER",
      amountUsd: "50.00",
      feeUsd: "3.00",
      totalUsd: "53.00",
    });

    const blankDriver = rows.find((r) => r.expressCode === "9000002")!;
    expect(blankDriver).toMatchObject({ unitRaw: "102", driverNameRaw: null, totalUsd: "78.00" });
  });

  it("leaves tractor and driver null when the source has neither", () => {
    const rows = parseExpressRows(SAMPLE_ROWS);
    const undocumented = rows.find((r) => r.expressCode === "9000003")!;
    expect(undocumented.unitRaw).toBeNull();
    expect(undocumented.driverNameRaw).toBeNull();
  });

  it("asserts the flat $3.00 fee on every row", () => {
    const rows = parseExpressRows(SAMPLE_ROWS);
    expect(rows.every((r) => r.feeUsd === "3.00")).toBe(true);
  });

  it("fails loudly on a fee that is not $3.00, rather than passing it through", () => {
    const badFee: RawExpressRow[] = [
      { lineNumber: 999, record: ["2026-01-05 07:43:16", "1", "X1", "", "", "100", "3.50", "103.50", "US", "lumper", ""] },
    ];
    expect(() => parseExpressRows(badFee)).toThrow(ExpressRowFormatError);
  });

  it("sums the sample's express amounts as expected", () => {
    const rows = parseExpressRows(SAMPLE_ROWS);
    const totalCents = rows.reduce((sum, r) => sum + Math.round(Number(r.totalUsd) * 100), 0);
    expect(totalCents).toBe(17400); // 53.00 + 78.00 + 43.00
  });

  it("performs no I/O and prints nothing", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    parseExpressRows(SAMPLE_ROWS);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
