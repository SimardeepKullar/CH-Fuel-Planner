/**
 * Turns the plain numbers the API returns into the display strings the mock
 * used to hard-code (UI contract §1: return numbers, not display strings —
 * the frontend composes labels).
 */

export function formatCurrency(amountUsd: number): string {
  const sign = amountUsd < 0 ? "-" : "";
  return `${sign}$${Math.abs(amountUsd).toFixed(2)}`;
}

export function formatDistanceMiles(miles: number): string {
  return `${miles.toFixed(1)} mi`;
}

/** `27600` -> `"7h 40m"`. */
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function formatGallons(gallons: number): string {
  return `${gallons.toFixed(1)} gal`;
}

export function formatPricePerGallon(usdPerGallon: number, decimals = 3): string {
  return `$${usdPerGallon.toFixed(decimals)}`;
}

const UNIT_NUMBER_PATTERN = /^\d{3,4}$/;

/**
 * D18 (supersedes D6): unit_number is text, stored exactly as the fleet
 * writes it — never computed or padded. The real roster runs 031...073 and
 * 101, 1012...1023, so a fixed-width pad would either truncate a 4-digit
 * unit or fail to distinguish '031' from a raw '31'. This validates and
 * normalises (trims whitespace) for display; it does not reformat.
 */
export function formatUnitNumber(unitNumber: string): string {
  const trimmed = unitNumber.trim();
  if (!UNIT_NUMBER_PATTERN.test(trimmed)) {
    throw new Error(`invalid unit number: ${JSON.stringify(unitNumber)}`);
  }
  return trimmed;
}
