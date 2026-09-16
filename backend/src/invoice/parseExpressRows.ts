import { DecimalFormatError, toDecimalString } from "./decimal.js";

export class ExpressRowFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpressRowFormatError";
  }
}

/** One row on the invoice's Express Codes section (a lumper fee, a repair, etc). */
export interface ExpressRow {
  lineNumber: number;
  /** ISO-ish timestamp, "2026-09-08T18:48:50". */
  occurredAt: string;
  expressCode: string;
  /** BVD's internal reference code for this express authorisation — not a
   * fuel-stop auth code, and not a truck/driver identifier by itself. */
  authCodeRef: string;
  /** Tractor text as entered, if the source carries one. Null, not "", when
   * the source genuinely has no value here — a real state, not a defect
   * (§A6.6 / the blank-driver row is the same idea one column over). */
  unitRaw: string | null;
  driverNameRaw: string | null;
  amountUsd: string;
  feeUsd: string;
  totalUsd: string;
  payee: string | null;
  note: string | null;
  /** Not present as a distinct column on any BVD export seen so far — always
   * null from this parser. Reserved for a future categorisation step. */
  category: string | null;
}

export interface RawExpressRow {
  record: string[];
  lineNumber: number;
}

const EXPECTED_FEE_USD = "3.00";
const TIMESTAMP_PATTERN = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/;

function normaliseTimestamp(raw: string, lineNumber: number): string {
  const match = TIMESTAMP_PATTERN.exec(raw.trim());
  if (!match) {
    throw new ExpressRowFormatError(
      `line ${lineNumber}: unrecognised timestamp: "${raw}"`,
    );
  }
  return `${match[1]}T${match[2]}`;
}

function blankToNull(raw: string | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

function decimalField(raw: string | undefined, lineNumber: number, label: string): string {
  try {
    return toDecimalString(raw ?? "", 2);
  } catch (err) {
    const message = err instanceof DecimalFormatError ? err.message : String(err);
    throw new ExpressRowFormatError(`line ${lineNumber}: ${label}: ${message}`);
  }
}

/**
 * Parses an invoice's Express Codes section: date, express code, an internal
 * auth-code reference, optional tractor/driver text, amount, fee, total,
 * payee and note. Pure — no database, no HTTP, no clock, no I/O.
 *
 * Every row carries a flat $3.00 fee (§A5) — asserted explicitly here, never
 * assumed. A row whose fee differs throws rather than passing through: that
 * means the invoice's own flat-fee invariant has changed, not that this one
 * row is merely malformed.
 */
export function parseExpressRows(rows: readonly RawExpressRow[]): ExpressRow[] {
  return rows.map(({ record, lineNumber }) => {
    const occurredAt = normaliseTimestamp(record[0] ?? "", lineNumber);
    const expressCode = (record[1] ?? "").trim();
    const authCodeRef = (record[2] ?? "").trim();
    const unitRaw = blankToNull(record[3]);
    const driverNameRaw = blankToNull(record[4]);

    const amountUsd = decimalField(record[5], lineNumber, "amount");
    const feeUsd = decimalField(record[6], lineNumber, "fee");
    const totalUsd = decimalField(record[7], lineNumber, "total");

    if (feeUsd !== EXPECTED_FEE_USD) {
      throw new ExpressRowFormatError(
        `line ${lineNumber}: express fee ${feeUsd} != flat fee ${EXPECTED_FEE_USD}`,
      );
    }

    const payee = blankToNull(record[9]);
    const note = blankToNull(record[10]);

    return {
      lineNumber,
      occurredAt,
      expressCode,
      authCodeRef,
      unitRaw,
      driverNameRaw,
      amountUsd,
      feeUsd,
      totalUsd,
      payee,
      note,
      category: null,
    };
  });
}
