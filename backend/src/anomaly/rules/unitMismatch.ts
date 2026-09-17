import type { AnomalyFinding } from "../types.js";

/** No tunable knob yet — reserved so the runner's "load config for every
 * rule from anomaly_thresholds" path stays uniform across all six rules. */
export type UnitMismatchConfig = Record<string, never>;

export interface UnitMismatchStop {
  id: string;
  /** What the driver typed at the pump (`fuel_stops.unit_raw`). */
  unitRaw: string;
  /** The resolved truck's `unit_number`, joined through `fuel_stops.truck_id
   * -> trucks` — `null` when the truck itself didn't resolve (T-29), which
   * is a different problem this rule can't speak to. Never recomputed from
   * the card/assignment here (that's `resolveTruckForStop`'s job); this
   * rule only compares what was already stored. */
  truckUnitNumber: string | null;
}

/**
 * Flags a fuel stop whose entered unit number disagrees with the truck
 * actually resolved for that card at that time — §A10's `0` entered on card
 * 2956373 against NAVJOT's assigned truck 072. A `null` resolved unit means
 * there is nothing to compare against, so it is never a mismatch (nulls are
 * meaningful, not a lesser case of `false`).
 *
 * Pure — no database, no HTTP, no clock.
 */
export function unitMismatch(
  stops: readonly UnitMismatchStop[],
  _config: UnitMismatchConfig,
): AnomalyFinding[] {
  void _config;
  const findings: AnomalyFinding[] = [];

  for (const stop of stops) {
    if (stop.truckUnitNumber === null) {
      continue;
    }
    if (stop.unitRaw.trim() !== stop.truckUnitNumber) {
      findings.push({
        subjectType: "fuel_stop",
        subjectId: stop.id,
        severity: "amber",
        detail: { unitRaw: stop.unitRaw, truckUnitNumber: stop.truckUnitNumber },
      });
    }
  }

  return findings;
}
