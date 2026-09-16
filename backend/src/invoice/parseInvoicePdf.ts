import { parse } from "csv-parse/sync";
import { PDFParse } from "pdf-parse";
import { parseInvoiceRecords, type ParsedInvoice } from "./parseInvoiceCsv.js";
import type { InvoiceProductType } from "./productCode.js";

export class InvoicePdfFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoicePdfFormatError";
  }
}

/** pdf-parse's own per-page footer, e.g. "-- 1 of 1 --" — not invoice content. */
const PAGE_MARKER_PATTERN = /^-- \d+ of \d+ --$/;
/** A header line of the form "Label: value" — the PDF has no packed metadata
 * row the way a CSV does, so each header field is its own line. */
const LABEL_LINE_PATTERN = /^([A-Za-z][A-Za-z0-9 /#]*):\s*(.*)$/;

/**
 * Extracts text from a BVD invoice PDF — the fallback path (D13), reached
 * only when the CSV export isn't available — and reconstructs the same row
 * structure `parseInvoiceCsv` works from, then hands off to the shared core
 * (`parseInvoiceRecords`). That shared core is what guarantees the two
 * parsers produce the exact same output shape (see parseInvoicePdf.test.ts's
 * type-level assertion): there is only one place that shape is defined.
 *
 * PDF text extraction is inherently less reliable than reading a CSV's
 * delimited cells directly, which is why this is a fallback (D13) and why
 * T-28's reconciliation exists before anything reaches the database.
 */
export async function parseInvoicePdf(
  input: Buffer,
  productCodes: ReadonlyMap<string, InvoiceProductType>,
): Promise<ParsedInvoice> {
  const parser = new PDFParse({ data: input });
  let text: string;
  try {
    const result = await parser.getText();
    text = result.text;
  } finally {
    await parser.destroy();
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !PAGE_MARKER_PATTERN.test(line));

  const fuelStartIndex = lines.findIndex((line) => line === "Fuel Card Transactions");
  if (fuelStartIndex === -1) {
    throw new InvoicePdfFormatError('could not find "Fuel Card Transactions" in the extracted text');
  }

  const metaRow: string[] = [];
  for (const line of lines.slice(0, fuelStartIndex)) {
    const match = LABEL_LINE_PATTERN.exec(line);
    if (match) {
      metaRow.push(`${match[1]}:`, match[2]!.trim());
    }
  }

  const bodyRecords: string[][] = lines.slice(fuelStartIndex).map((line) => {
    const [record] = parse(line, { relax_column_count: true }) as string[][];
    return record ?? [line];
  });

  return parseInvoiceRecords([metaRow, ...bodyRecords], productCodes);
}
