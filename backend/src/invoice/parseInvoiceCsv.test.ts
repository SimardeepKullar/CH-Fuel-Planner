import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  InvoiceFormatError,
  parseInvoiceCsv,
  validateProductLine,
} from "./parseInvoiceCsv.js";
import { DEFAULT_INVOICE_PRODUCT_CODES } from "./productCode.js";

// Synthetic, invented data — committed, runs on a fresh clone and in CI.
// See docs/BUILD-PLAN-v2.md step 27.1.
const REDACTED_PATH = fileURLToPath(
  new URL("../../test/fixtures/invoices/sample-redacted.csv", import.meta.url),
);
const redacted = () => readFileSync(REDACTED_PATH);

// A real invoice, if the operator has dropped one in locally
// (data/bvd-invoices/, gitignored — never committed). Skips automatically
// when absent, same as this repo's DATABASE_URL-gated integration tests.
const REAL_PATH = fileURLToPath(
  new URL("../../../data/bvd-invoices/999210.csv", import.meta.url),
);
const hasRealFixture = existsSync(REAL_PATH);

describe("parseInvoiceCsv — structural (synthetic fixture)", () => {
  it("parses the header", () => {
    const result = parseInvoiceCsv(redacted(), DEFAULT_INVOICE_PRODUCT_CODES);
    expect(result.header).toEqual({
      invoiceNumber: "100001",
      periodStart: "2026-01-05",
      periodEnd: "2026-01-11",
      invoiceDate: "2026-01-12",
      dueDate: "2026-01-13",
      supplierName: "SAMPLE FUEL CO",
      supplierAddress: "1 Sample Way, Sampleton ON",
      billToName: "SAMPLE CARRIER INC",
      billToAddress: "Sampleville ON",
    });
  });

  it("parses the printed per-code totals, trusted as given", () => {
    const result = parseInvoiceCsv(redacted(), DEFAULT_INVOICE_PRODUCT_CODES);
    const byCode = Object.fromEntries(
      result.printedTotals.products.map((p) => [p.productCode, p]),
    );
    expect(byCode.TA).toEqual({ productCode: "TA", gallons: "130.00", amountUsd: "672.17", discountUsd: "50.83" });
    expect(byCode.DF).toEqual({ productCode: "DF", gallons: "5.00", amountUsd: "22.50", discountUsd: "0.00" });
    expect(byCode.S).toEqual({ productCode: "S", gallons: null, amountUsd: "15.00", discountUsd: null });
    expect(byCode["Express Codes"]).toEqual({
      productCode: "Express Codes",
      gallons: null,
      amountUsd: "131.00",
      discountUsd: null,
    });
    expect(result.printedTotals.grandTotalUsd).toBe("840.67");
  });

  it("parses every product line with no rejections", () => {
    const result = parseInvoiceCsv(redacted(), DEFAULT_INVOICE_PRODUCT_CODES);
    expect(result.rejections).toEqual([]);
    expect(result.lines).toHaveLength(4);
  });

  it("parses 4dp prices exactly, as decimal-safe strings", () => {
    const result = parseInvoiceCsv(redacted(), DEFAULT_INVOICE_PRODUCT_CODES);
    const ta = result.lines.find((l) => l.baseAuthCode === "B100001" && l.rawProductCode === "TA")!;
    expect(ta.billedUsdPerGal).toBe("5.1234");
    expect(ta.retailUsdPerGal).toBe("5.5000");
  });

  it("performs no I/O and prints nothing", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    parseInvoiceCsv(redacted(), DEFAULT_INVOICE_PRODUCT_CODES);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("rejects a header whose shape differs, rather than coercing it", () => {
    const mutated = redacted()
      .toString("utf8")
      .replace("Auth Code, Driver Name, Unit #,", "Auth Code, Driver,");
    expect(() => parseInvoiceCsv(mutated, DEFAULT_INVOICE_PRODUCT_CODES)).toThrow(
      InvoiceFormatError,
    );
  });
});

describe.skipIf(!hasRealFixture)("parseInvoiceCsv — real invoice 999210 (local fixture only)", () => {
  it("parses the header", () => {
    const result = parseInvoiceCsv(readFileSync(REAL_PATH), DEFAULT_INVOICE_PRODUCT_CODES);
    expect(result.header).toEqual({
      invoiceNumber: "999210",
      periodStart: "2026-09-03",
      periodEnd: "2026-09-09",
      invoiceDate: "2026-09-10",
      dueDate: "2026-09-11",
      supplierName: "BVD Petroleum",
      supplierAddress: "130 Delta Park Blvd, Brampton ON",
      billToName: "2043733 Ontario Inc., DBA CH Logistics",
      billToAddress: "Burlington ON",
    });
  });

  it("records company text verbatim, not corrected", () => {
    const result = parseInvoiceCsv(readFileSync(REAL_PATH), DEFAULT_INVOICE_PRODUCT_CODES);
    expect(result.header.billToName).toBe("2043733 Ontario Inc., DBA CH Logistics");
  });

  it("parses the printed per-code totals, trusted as given", () => {
    const result = parseInvoiceCsv(readFileSync(REAL_PATH), DEFAULT_INVOICE_PRODUCT_CODES);
    const byCode = Object.fromEntries(
      result.printedTotals.products.map((p) => [p.productCode, p]),
    );
    expect(byCode.TA).toEqual({
      productCode: "TA",
      gallons: "8733.11",
      amountUsd: "48450.68",
      discountUsd: "5088.61",
    });
    expect(byCode.DF).toEqual({ productCode: "DF", gallons: "174.43", amountUsd: "845.40", discountUsd: "0.00" });
    expect(byCode.S).toEqual({ productCode: "S", gallons: null, amountUsd: "90.50", discountUsd: null });
    expect(byCode["Express Codes"]).toEqual({
      productCode: "Express Codes",
      gallons: null,
      amountUsd: "1543.13",
      discountUsd: null,
    });
    expect(result.printedTotals.grandTotalUsd).toBe("50929.71");
  });

  it("parses ~60 real stops (66 distinct base auth codes, 86 product lines), with no rejections", () => {
    const result = parseInvoiceCsv(readFileSync(REAL_PATH), DEFAULT_INVOICE_PRODUCT_CODES);
    expect(result.rejections).toEqual([]);
    expect(result.lines).toHaveLength(86);
    expect(new Set(result.lines.map((l) => l.baseAuthCode)).size).toBe(66);
  });

  it("parses 4dp prices with no rounding, exactly as printed", () => {
    const result = parseInvoiceCsv(readFileSync(REAL_PATH), DEFAULT_INVOICE_PRODUCT_CODES);
    const worked = result.lines.filter((l) => l.baseAuthCode === "A252014353");
    const ta = worked.find((l) => l.rawProductCode === "TA")!;
    const df = worked.find((l) => l.rawProductCode === "DF")!;
    expect(ta.billedUsdPerGal).toBe("5.2395");
    expect(ta.retailUsdPerGal).toBe("5.9890"); // printed as "5.989"
    expect(df.billedUsdPerGal).toBe("4.8890"); // printed as "4.889"
  });

  it("parses the sub-gallon swipe (0.04) and a large fill (243.95)", () => {
    const result = parseInvoiceCsv(readFileSync(REAL_PATH), DEFAULT_INVOICE_PRODUCT_CODES);
    expect(result.lines.some((l) => l.gallons === "0.04")).toBe(true);
    expect(result.lines.some((l) => l.gallons === "243.95")).toBe(true);
  });
});

describe("validateProductLine", () => {
  const baseRow = [
    "A999999999-TA", "SOME DRIVER", "099", "2026-09-05 10:00:00", "12345",
    "LOVES #1", "SOMEWHERE", "TX", "TA", "100.00", "5.999", "5.5000",
    "550.00", "0", "0", "0", "0", "0.5", "50.00", "550.00", "US",
  ];

  it("fails an unmapped product code, never default-mapping it to diesel", () => {
    const row = [...baseRow];
    row[0] = "A999999999-ZZ";
    row[8] = "ZZ";
    const result = validateProductLine(row, 42, "1000001", DEFAULT_INVOICE_PRODUCT_CODES);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejection.code).toBe("UNMAPPED_PRODUCT");
      expect(result.rejection.lineNumber).toBe(42);
      expect(result.rejection.authCode).toBe("A999999999-ZZ");
      expect(result.rejection.rawProduct).toBe("ZZ");
    }
  });

  it("accepts every documented code (TF, AD, O, L, C) before it ever appears on a real invoice", () => {
    for (const code of ["TF", "AD", "O", "L", "C"]) {
      const row = [...baseRow];
      row[0] = `A999999999-${code}`;
      row[8] = code;
      const result = validateProductLine(row, 1, "1000001", DEFAULT_INVOICE_PRODUCT_CODES);
      expect(result.ok).toBe(true);
    }
  });

  it("rejects a malformed auth code with SCHEMA_ERROR", () => {
    const row = [...baseRow];
    row[0] = "NOAUTHCODE";
    const result = validateProductLine(row, 7, "1000001", DEFAULT_INVOICE_PRODUCT_CODES);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejection.code).toBe("SCHEMA_ERROR");
      expect(result.rejection.lineNumber).toBe(7);
    }
  });
});
