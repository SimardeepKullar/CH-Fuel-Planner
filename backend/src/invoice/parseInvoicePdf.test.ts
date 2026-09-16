import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { parseInvoiceCsv } from "./parseInvoiceCsv.js";
import { parseInvoicePdf } from "./parseInvoicePdf.js";
import { DEFAULT_INVOICE_PRODUCT_CODES } from "./productCode.js";

// Synthetic, invented data — committed, runs on a fresh clone and in CI.
const REDACTED_PATH = fileURLToPath(
  new URL("../../test/fixtures/invoices/sample-redacted.pdf", import.meta.url),
);
const redacted = () => readFileSync(REDACTED_PATH);

// A real invoice, if the operator has dropped one in locally (gitignored).
const REAL_PATH = fileURLToPath(
  new URL("../../test/fixtures/invoices/999210.pdf", import.meta.url),
);
const hasRealFixture = existsSync(REAL_PATH);

describe("parseInvoicePdf", () => {
  it("produces the exact same output shape as parseInvoiceCsv (type-level)", () => {
    // Compile-time only: if the two parsers' return shapes ever diverge,
    // `npm run typecheck` fails here — this is what "the two parsers are
    // interchangeable" means in practice (D13).
    expectTypeOf<Awaited<ReturnType<typeof parseInvoicePdf>>>().toEqualTypeOf<
      ReturnType<typeof parseInvoiceCsv>
    >();
  });
});

describe("parseInvoicePdf — structural (synthetic fixture)", () => {
  it("parses the header from a PDF", async () => {
    const result = await parseInvoicePdf(redacted(), DEFAULT_INVOICE_PRODUCT_CODES);
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

  it("parses product lines and the printed grand total from a PDF", async () => {
    const result = await parseInvoicePdf(redacted(), DEFAULT_INVOICE_PRODUCT_CODES);
    expect(result.rejections).toEqual([]);
    expect(result.lines).toHaveLength(4);
    expect(result.printedTotals.grandTotalUsd).toBe("840.67");
  });

  it("parses express rows, with the flat $3.00 fee intact", async () => {
    const result = await parseInvoicePdf(redacted(), DEFAULT_INVOICE_PRODUCT_CODES);
    expect(result.expressRows).toHaveLength(2);
    expect(result.expressRows.every((r) => r.feeUsd === "3.00")).toBe(true);
  });

  it("performs no I/O beyond reading the given buffer, and prints nothing", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await parseInvoicePdf(redacted(), DEFAULT_INVOICE_PRODUCT_CODES);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe.skipIf(!hasRealFixture)("parseInvoicePdf — real invoice 999210 (local fixture only)", () => {
  it("parses the same real header fields as the CSV path, from a PDF fixture", async () => {
    const result = await parseInvoicePdf(readFileSync(REAL_PATH), DEFAULT_INVOICE_PRODUCT_CODES);
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

  it("parses the real A252014353 worked example (TA + DF = $255.13) from the PDF", async () => {
    const result = await parseInvoicePdf(readFileSync(REAL_PATH), DEFAULT_INVOICE_PRODUCT_CODES);
    const worked = result.lines.filter((l) => l.baseAuthCode === "A252014353");
    expect(worked).toHaveLength(2);
    const ta = worked.find((l) => l.rawProductCode === "TA")!;
    expect(ta.billedUsdPerGal).toBe("5.2395");
  });

  it("parses the real printed grand total from the PDF's Grand Totals section", async () => {
    const result = await parseInvoicePdf(readFileSync(REAL_PATH), DEFAULT_INVOICE_PRODUCT_CODES);
    expect(result.printedTotals.grandTotalUsd).toBe("50929.71");
  });

  it("parses all 6 real express rows, with the flat $3.00 fee intact", async () => {
    const result = await parseInvoicePdf(readFileSync(REAL_PATH), DEFAULT_INVOICE_PRODUCT_CODES);
    expect(result.expressRows).toHaveLength(6);
    expect(result.expressRows.every((r) => r.feeUsd === "3.00")).toBe(true);
  });
});
