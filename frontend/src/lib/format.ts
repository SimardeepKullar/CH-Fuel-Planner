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

/** D6: fleet unit numbers are always shown zero-padded to three digits. */
export function formatUnitNumber(unitNumber: number): string {
  return String(unitNumber).padStart(3, "0");
}
