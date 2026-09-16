export class DecimalFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecimalFormatError";
  }
}

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

/**
 * Re-serialises a plain decimal string to exactly `decimals` fractional
 * digits using string manipulation only — never `parseFloat`/`toFixed` — so
 * "4.889" becomes "4.8890" and "5.2395" round-trips exactly, with no binary
 * floating-point rounding risk (5.2395 must never become 5.239499999...).
 *
 * Rejects a value with more fractional digits than `decimals`: that is a
 * genuine precision surprise, not something to silently truncate.
 */
export function toDecimalString(raw: string, decimals: number): string {
  const trimmed = raw.trim();
  if (!DECIMAL_PATTERN.test(trimmed)) {
    throw new DecimalFormatError(`not a decimal number: "${raw}"`);
  }

  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [whole = "0", frac = ""] = unsigned.split(".");

  if (frac.length > decimals) {
    throw new DecimalFormatError(
      `"${raw}" has more than ${decimals} fractional digits`,
    );
  }

  const paddedFrac = frac.padEnd(decimals, "0");
  const magnitude = decimals > 0 ? `${whole}.${paddedFrac}` : whole;
  const isZero = /^0+$/.test(whole) && /^0*$/.test(frac);
  return negative && !isZero ? `-${magnitude}` : magnitude;
}
