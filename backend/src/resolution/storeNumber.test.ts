import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseBvdCsv } from "../ingest/parseBvdCsv.js";
import { parseStoreName } from "./storeNumber.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(dirname, "../../../data/bvd");

const augustFile = () =>
  readFileSync(path.join(dataDir, "pcn-usd-9206810-981.csv"));

describe("parseStoreName", () => {
  it('parses "LOVES #368" to brand LOVES, number 368', () => {
    expect(parseStoreName("LOVES #368")).toEqual({
      brand: "LOVES",
      storeNumber: 368,
    });
  });

  it("does not throw on an unrecognised brand, and does not guess a number", () => {
    const result = parseStoreName("PILOT TRAVEL CENTER");
    expect(result.storeNumber).toBeNull();
    expect(result.brand).toBe("PILOT TRAVEL CENTER");
  });

  it("parses all 605 real names to a distinct store number in range 22-1055", () => {
    const parsed = parseBvdCsv(augustFile());
    const numbers = parsed.rows.map((row) => parseStoreName(row.name).storeNumber);

    expect(numbers).toHaveLength(605);
    for (const n of numbers) {
      expect(n).not.toBeNull();
      expect(n).toBeGreaterThanOrEqual(22);
      expect(n).toBeLessThanOrEqual(1055);
    }
    expect(new Set(numbers).size).toBe(605);
  });

  it("SITE matches the store number in 0 of 605 cases — the trap this exists to avoid", () => {
    const parsed = parseBvdCsv(augustFile());
    const matches = parsed.rows.filter((row) => {
      const { storeNumber } = parseStoreName(row.name);
      return storeNumber !== null && Number(row.site) === storeNumber;
    });

    expect(matches).toHaveLength(0);
  });
});
