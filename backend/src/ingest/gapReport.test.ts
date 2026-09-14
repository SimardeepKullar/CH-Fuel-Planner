import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findGaps, isoDateRange } from "./gapReport.js";
import { parseBvdCsv } from "./parseBvdCsv.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const januaryDir = path.join(dirname, "../../../data/bvd/2026-01");

describe("findGaps", () => {
  it("reports no gaps for a contiguous range", () => {
    const present = isoDateRange("2026-02-01", "2026-02-10");
    expect(findGaps(present, { start: "2026-02-01", end: "2026-02-10" })).toEqual([]);
  });

  it("reports two separated gaps", () => {
    const present = isoDateRange("2026-03-01", "2026-03-10").filter(
      (date) => date !== "2026-03-03" && date !== "2026-03-07",
    );
    expect(findGaps(present, { start: "2026-03-01", end: "2026-03-10" })).toEqual([
      "2026-03-03",
      "2026-03-07",
    ]);
  });

  it("reports exactly 2026-01-11 as the gap in the real January corpus", () => {
    const filenames = readdirSync(januaryDir).filter((name) => name.endsWith(".csv"));
    const effectiveDates = filenames.map(
      (name) => parseBvdCsv(readFileSync(path.join(januaryDir, name))).effectiveDate,
    );

    const gaps = findGaps(effectiveDates, { start: "2026-01-01", end: "2026-01-31" });

    expect(gaps).toEqual(["2026-01-11"]);
  });
});

describe("isoDateRange", () => {
  it("includes both endpoints", () => {
    expect(isoDateRange("2026-01-30", "2026-02-02")).toEqual([
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ]);
  });

  it("returns a single date when start equals end", () => {
    expect(isoDateRange("2026-01-11", "2026-01-11")).toEqual(["2026-01-11"]);
  });
});
