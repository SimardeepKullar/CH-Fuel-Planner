export const METERS_PER_MILE = 1609.344;
export const LITERS_PER_GALLON = 3.785411784;

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

export function milesToMeters(miles: number): number {
  return miles * METERS_PER_MILE;
}

export function litersToGallons(liters: number): number {
  return liters / LITERS_PER_GALLON;
}

export function gallonsToLiters(gallons: number): number {
  return gallons * LITERS_PER_GALLON;
}

export function formatUnitNumber(unitNumber: number): string {
  return String(unitNumber).padStart(3, "0");
}
