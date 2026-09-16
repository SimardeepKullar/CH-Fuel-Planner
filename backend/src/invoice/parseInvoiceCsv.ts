import { parse } from "csv-parse/sync";
import { normaliseHeaderCell } from "../ingest/parseBvdCsv.js";
import { DecimalFormatError, toDecimalString } from "./decimal.js";
import type { InvoiceProductType } from "./productCode.js";
import { parseExpressRows, type ExpressRow, type RawExpressRow } from "./parseExpressRows.js";

export class InvoiceFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceFormatError";
  }
}

/** Invoice-level metadata. The real BVD export carries none of this — it
 * opens straight into `Fuel Card Transactions` — so every field here comes
 * from a labelled row prepended ahead of it, the same technique v1's
 * `parseBvdCsv` uses for `Company Id`/`Effective Date`. */
export interface InvoiceHeader {
  invoiceNumber: string;
  /** ISO date, "2026-09-03". */
  periodStart: string;
  periodEnd: string;
  invoiceDate: string;
  dueDate: string;
  supplierName: string;
  supplierAddress: string;
  billToName: string;
  billToAddress: string;
}

/** One row of the invoice's printed Grand Totals section, trusted as given —
 * this is the reconciliation target (T-28), never recomputed here. */
export interface PrintedProductTotal {
  /** The label as printed: a product code ("TA"), or a section label
   * ("Manual Transactions", "Express Codes"). */
  productCode: string;
  /** Null when the printed row has no gallons figure (e.g. "S", "Express Codes"). */
  gallons: string | null;
  amountUsd: string;
}

export interface PrintedTotals {
  products: PrintedProductTotal[];
  /** The invoice's own printed "Grand Total" row — the sum BVD printed, not
   * one this parser computed. */
  grandTotalUsd: string;
}

export type InvoiceLineRejectionCode =
  | "SCHEMA_ERROR"
  | "NUMERIC_PARSE_ERROR"
  | "UNMAPPED_PRODUCT";

export interface InvoiceLineRejection {
  lineNumber: number;
  authCode: string | null;
  code: InvoiceLineRejectionCode;
  message: string;
  /** The row's raw Prod value regardless of rejection code, mirroring v1's
   * ValidationRejection.rawProduct — lets a report list unmapped codes
   * without re-parsing the message string. */
  rawProduct: string;
}

/** One product line, straight off the sheet and past validation. Numeric
 * fields are decimal-safe strings (never `number`) at their column's exact
 * precision — 2dp for gallons and dollars, 4dp for per-gallon prices. */
export interface ValidatedInvoiceLine {
  lineNumber: number;
  /** The full auth code as printed, e.g. "A252014353-TA". */
  authCode: string;
  /** The auth code with its trailing "-<PROD>" suffix stripped — what a fuel
   * stop groups on (§A5, groupByAuthCode.ts). */
  baseAuthCode: string;
  cardNumber: string;
  driverNameRaw: string;
  unitRaw: string;
  /** ISO-ish timestamp, "2026-09-09T00:41:38". */
  occurredAt: string;
  siteNumber: string;
  stationNameRaw: string;
  stationCity: string;
  stationState: string;
  rawProductCode: string;
  productType: InvoiceProductType;
  gallons: string;
  retailUsdPerGal: string;
  billedUsdPerGal: string;
  amountUsd: string;
}

export type InvoiceLineResult =
  | { ok: true; line: ValidatedInvoiceLine }
  | { ok: false; rejection: InvoiceLineRejection };

/** The unified shape both the CSV path and the PDF fallback produce (D13) —
 * everything downstream is oblivious to which one produced it. */
export interface ParsedInvoice {
  header: InvoiceHeader;
  printedTotals: PrintedTotals;
  lines: ValidatedInvoiceLine[];
  rejections: InvoiceLineRejection[];
  expressRows: ExpressRow[];
}

const FUEL_HEADER = [
  "AUTH CODE", "DRIVER NAME", "UNIT #", "DATE", "SITE #", "SITE NAME",
  "SITE CITY", "PROV/ST", "PROD", "QTY", "RETAIL", "BILLED", "PRE TAX AMT",
  "HST", "GST", "PST", "QST", "DISC RATE", "DISC AMT", "FINAL AMT", "CUR",
] as const;

const EXPRESS_HEADER = [
  "DATE", "EXPRESS CODE NUMBER", "AUTH CODES", "TRACTOR", "DRIVER",
  "AMOUNT CASHED", "FEE", "TOTAL", "CUR", "PAYEE", "NOTES",
] as const;

const TOTALS_HEADER = [
  "PRODUCT", "QTY", "PRE TAX AMT", "HST", "GST", "PST", "QST", "DISC RATE",
  "DISC AMT", "FINAL AMOUNT", "CUR",
] as const;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP_PATTERN = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/;

function findLabelledValue(metaFields: string[], label: string): string {
  const labelNormalised = label.trim().toUpperCase();
  for (let i = 0; i < metaFields.length; i++) {
    const field = metaFields[i]?.trim().toUpperCase().replace(/:\s*$/, "");
    if (field === labelNormalised) {
      const value = metaFields[i + 1]?.trim();
      if (value) {
        return value;
      }
      throw new InvoiceFormatError(`metadata row: "${label}" has no value`);
    }
  }
  throw new InvoiceFormatError(`metadata row: "${label}" not found`);
}

function assertIsoDate(value: string, label: string): string {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new InvoiceFormatError(`${label}: not an ISO date: "${value}"`);
  }
  return value;
}

function parseHeader(metaRow: string[]): InvoiceHeader {
  return {
    invoiceNumber: findLabelledValue(metaRow, "Invoice Number"),
    periodStart: assertIsoDate(findLabelledValue(metaRow, "Period Start"), "Period Start"),
    periodEnd: assertIsoDate(findLabelledValue(metaRow, "Period End"), "Period End"),
    invoiceDate: assertIsoDate(findLabelledValue(metaRow, "Invoice Date"), "Invoice Date"),
    dueDate: assertIsoDate(findLabelledValue(metaRow, "Due Date"), "Due Date"),
    supplierName: findLabelledValue(metaRow, "Supplier"),
    supplierAddress: findLabelledValue(metaRow, "Supplier Address"),
    billToName: findLabelledValue(metaRow, "Bill To"),
    billToAddress: findLabelledValue(metaRow, "Bill To Address"),
  };
}

function matchesHeader(record: string[], expected: readonly string[]): boolean {
  const normalised = record.map((cell) => normaliseHeaderCell(cell ?? ""));
  if (normalised.length < expected.length) {
    return false;
  }
  return expected.every((col, i) => normalised[i] === col);
}

function normaliseTimestamp(raw: string): string {
  const match = TIMESTAMP_PATTERN.exec(raw.trim());
  if (!match) {
    throw new InvoiceFormatError(`unrecognised timestamp: "${raw}"`);
  }
  return `${match[1]}T${match[2]}`;
}

/**
 * Validates one fuel-card product line: auth code well-formed, PROD mapped
 * in `productCodes` (v1 §11.1's tripwire, reused — an unmapped code fails
 * the row, never default-maps), and every numeric field decimal-safe at its
 * column's precision. Returns a typed rejection rather than throwing — a row
 * is accepted or rejected, never guessed at.
 */
export function validateProductLine(
  record: string[],
  lineNumber: number,
  cardNumber: string,
  productCodes: ReadonlyMap<string, InvoiceProductType>,
): InvoiceLineResult {
  const authCode = (record[0] ?? "").trim();
  const rawProductCode = (record[8] ?? "").trim().toUpperCase();
  const dashIndex = authCode.lastIndexOf("-");

  if (dashIndex <= 0) {
    return {
      ok: false,
      rejection: {
        lineNumber,
        authCode: authCode || null,
        code: "SCHEMA_ERROR",
        message: `malformed auth code: "${authCode}"`,
        rawProduct: rawProductCode,
      },
    };
  }

  if (!productCodes.has(rawProductCode)) {
    return {
      ok: false,
      rejection: {
        lineNumber,
        authCode,
        code: "UNMAPPED_PRODUCT",
        message: `unmapped product code: "${rawProductCode}"`,
        rawProduct: rawProductCode,
      },
    };
  }

  let occurredAt: string;
  try {
    occurredAt = normaliseTimestamp(record[3] ?? "");
  } catch {
    return {
      ok: false,
      rejection: {
        lineNumber,
        authCode,
        code: "SCHEMA_ERROR",
        message: `unrecognised timestamp: "${record[3] ?? ""}"`,
        rawProduct: rawProductCode,
      },
    };
  }

  let gallons: string;
  let retailUsdPerGal: string;
  let billedUsdPerGal: string;
  let amountUsd: string;
  try {
    gallons = toDecimalString(record[9] ?? "", 2);
    retailUsdPerGal = toDecimalString(record[10] ?? "", 4);
    billedUsdPerGal = toDecimalString(record[11] ?? "", 4);
    amountUsd = toDecimalString(record[19] ?? "", 2);
  } catch (err) {
    const message = err instanceof DecimalFormatError ? err.message : String(err);
    return {
      ok: false,
      rejection: { lineNumber, authCode, code: "NUMERIC_PARSE_ERROR", message, rawProduct: rawProductCode },
    };
  }

  return {
    ok: true,
    line: {
      lineNumber,
      authCode,
      baseAuthCode: authCode.slice(0, dashIndex),
      cardNumber,
      driverNameRaw: (record[1] ?? "").trim(),
      unitRaw: (record[2] ?? "").trim(),
      occurredAt,
      siteNumber: (record[4] ?? "").trim(),
      stationNameRaw: (record[5] ?? "").trim(),
      stationCity: (record[6] ?? "").trim(),
      stationState: (record[7] ?? "").trim(),
      rawProductCode,
      productType: productCodes.get(rawProductCode)!,
      gallons,
      retailUsdPerGal,
      billedUsdPerGal,
      amountUsd,
    },
  };
}

function buildPrintedTotals(rows: string[][], lineNumbers: number[]): PrintedTotals {
  const products: PrintedProductTotal[] = [];
  let grandTotalUsd: string | null = null;

  rows.forEach((record, idx) => {
    const lineNumber = lineNumbers[idx]!;
    const label = (record[0] ?? "").trim();
    const qtyRaw = (record[1] ?? "").trim();
    const finalAmountRaw = (record[9] ?? "").trim();

    if (finalAmountRaw === "") {
      throw new InvoiceFormatError(`line ${lineNumber}: totals row "${label}" has no final amount`);
    }

    let amountUsd: string;
    let gallons: string | null;
    try {
      amountUsd = toDecimalString(finalAmountRaw, 2);
      gallons = qtyRaw === "" ? null : toDecimalString(qtyRaw, 2);
    } catch (err) {
      const message = err instanceof DecimalFormatError ? err.message : String(err);
      throw new InvoiceFormatError(`line ${lineNumber}: totals row "${label}": ${message}`);
    }

    if (label === "Grand Total") {
      grandTotalUsd = amountUsd;
      return;
    }
    products.push({ productCode: label, gallons, amountUsd });
  });

  if (grandTotalUsd === null) {
    throw new InvoiceFormatError('missing "Grand Total" row in the Grand Totals section');
  }

  return { products, grandTotalUsd };
}

/**
 * Parses already-split CSV records into a full invoice: header, printed
 * totals, product lines (accepted and rejected), and express rows. Pure — no
 * database, no HTTP, no clock, no I/O.
 *
 * This is the shared core between the CSV path and the PDF fallback (D13):
 * `parseInvoicePdf` reconstructs the same record shape from PDF text and
 * calls this function too, which is what guarantees identical output.
 *
 * Rejects (throws) on a header, section-header, or totals shape that does
 * not match — it never coerces a differently-shaped invoice into this one.
 */
export function parseInvoiceRecords(
  records: string[][],
  productCodes: ReadonlyMap<string, InvoiceProductType>,
): ParsedInvoice {
  const metaRow = records[0];
  if (!metaRow) {
    throw new InvoiceFormatError("file is empty");
  }
  const header = parseHeader(metaRow);

  // Explicit "awaiting header" states, so a header-shape mismatch is caught
  // exactly where a header is expected and throws (rejected, not coerced) —
  // rather than falling through to per-row data parsing, which would only
  // ever produce a per-row rejection for what is actually a structural
  // problem with the whole section.
  type Mode =
    | "before"
    | "fuel-awaiting-header"
    | "fuel-data"
    | "express-awaiting-header"
    | "express-data"
    | "totals-awaiting-header"
    | "totals-data";
  let mode: Mode = "before";
  let currentCard = "";

  const lines: ValidatedInvoiceLine[] = [];
  const rejections: InvoiceLineRejection[] = [];
  const rawExpressRows: RawExpressRow[] = [];
  const totalsRows: string[][] = [];
  const totalsLineNumbers: number[] = [];

  for (let i = 1; i < records.length; i++) {
    const record = records[i] ?? [];
    const lineNumber = i + 1;
    const first = (record[0] ?? "").trim();

    if (mode === "before") {
      if (first !== "Fuel Card Transactions") {
        throw new InvoiceFormatError(
          `line ${lineNumber}: expected "Fuel Card Transactions", got: ${JSON.stringify(record)}`,
        );
      }
      mode = "fuel-awaiting-header"; // next non-marker row must be the card marker, then the header
      continue;
    }

    // A new card section can start from either awaiting-header or fuel-data.
    if ((mode === "fuel-awaiting-header" || mode === "fuel-data") && first.startsWith("Transactions for Card #")) {
      const match = /Transactions for Card #\s*(\S+)/.exec(first);
      if (!match) {
        throw new InvoiceFormatError(`line ${lineNumber}: malformed card section marker: "${first}"`);
      }
      currentCard = match[1]!;
      mode = "fuel-awaiting-header";
      continue;
    }
    if (mode === "fuel-data" && first === "Express Codes") {
      mode = "express-awaiting-header";
      continue;
    }
    if (mode === "express-data" && first === "Grand Totals") {
      mode = "totals-awaiting-header";
      continue;
    }

    if (mode === "fuel-awaiting-header") {
      if (!matchesHeader(record, FUEL_HEADER)) {
        throw new InvoiceFormatError(
          `line ${lineNumber}: unexpected fuel section header shape: ${JSON.stringify(record)}`,
        );
      }
      mode = "fuel-data";
      continue;
    }
    if (mode === "fuel-data") {
      if (first === "") {
        continue; // Transaction/Card Subtotal, Fuel Totals, Sub Total rows
      }
      const result = validateProductLine(record, lineNumber, currentCard, productCodes);
      if (result.ok) {
        lines.push(result.line);
      } else {
        rejections.push(result.rejection);
      }
      continue;
    }

    if (mode === "express-awaiting-header") {
      if (!matchesHeader(record, EXPRESS_HEADER)) {
        throw new InvoiceFormatError(
          `line ${lineNumber}: unexpected express section header shape: ${JSON.stringify(record)}`,
        );
      }
      mode = "express-data";
      continue;
    }
    if (mode === "express-data") {
      rawExpressRows.push({ record, lineNumber });
      continue;
    }

    if (mode === "totals-awaiting-header") {
      if (!matchesHeader(record, TOTALS_HEADER)) {
        throw new InvoiceFormatError(
          `line ${lineNumber}: unexpected totals section header shape: ${JSON.stringify(record)}`,
        );
      }
      mode = "totals-data";
      continue;
    }
    if (mode === "totals-data") {
      totalsRows.push(record);
      totalsLineNumbers.push(lineNumber);
      continue;
    }

    throw new InvoiceFormatError(`line ${lineNumber}: unexpected content: ${JSON.stringify(record)}`);
  }

  const expressRows = parseExpressRows(rawExpressRows);
  const printedTotals = buildPrintedTotals(totalsRows, totalsLineNumbers);

  return { header, printedTotals, lines, rejections, expressRows };
}

/**
 * Parses a BVD invoice CSV export (D13: the primary path; see
 * `parseInvoicePdf` for the fallback). Tests run against a committed
 * synthetic fixture plus a real invoice, if one is present locally at
 * `data/bvd-invoices/` (gitignored — see that directory's own notes on a
 * real fixture, and `backend/test/fixtures/invoices/README.md` for why real
 * invoice data never lives in this repo).
 */
export function parseInvoiceCsv(
  input: Buffer | string,
  productCodes: ReadonlyMap<string, InvoiceProductType>,
): ParsedInvoice {
  const records: string[][] = parse(input, {
    relax_column_count: true,
    skip_empty_lines: true,
  });
  return parseInvoiceRecords(records, productCodes);
}
