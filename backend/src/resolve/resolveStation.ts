import type { Pool } from "pg";
import { parseStoreName } from "../resolution/storeNumber.js";

export interface StationForNameMatch {
  id: string;
  /** `stations.name_raw`, e.g. "LOVES #294". */
  nameRaw: string;
}

/**
 * Matches an invoice line's station text to a station by store number,
 * parsed from both sides with T-08's `parseStoreName` — never from BVD's
 * internal site field, which T-08 measured matches in 0 of 605 rows
 * (CLAUDE.md). `stations.store_number` is not populated at ingest (T-06/T-08
 * never write it), so this parses `name_raw` fresh on each candidate — the
 * same approach T-08's `matchStationsToOperatorExport` already takes,
 * reused rather than duplicated as a second column-populating path.
 *
 * A name with no recognisable store number, or no station carrying that
 * number, resolves to `null` rather than a guess — a station miss is a named
 * exclusion, not a reason to quarantine the stop.
 *
 * Pure — no database, no HTTP, no clock.
 */
export function matchStationByName(
  stationNameRaw: string,
  stations: readonly StationForNameMatch[],
): string | null {
  const { storeNumber } = parseStoreName(stationNameRaw);
  if (storeNumber === null) {
    return null;
  }
  const match = stations.find((s) => parseStoreName(s.nameRaw).storeNumber === storeNumber);
  return match?.id ?? null;
}

interface StationNameRow {
  id: string;
  name_raw: string;
}

/**
 * DB-backed form of `matchStationByName`. The station roster is small
 * enough (hundreds, not thousands) to scan in memory per call — the same
 * reasoning `resolveDriverByName` applies to the ~27-row driver roster —
 * rather than maintaining a populated, indexed `store_number` column purely
 * for this join.
 */
export async function resolveStationByName(
  pool: Pool,
  stationNameRaw: string,
  opts: { supplier?: string } = {},
): Promise<string | null> {
  const supplier = opts.supplier ?? "BVD";
  const { rows } = await pool.query<StationNameRow>(
    "SELECT id, name_raw FROM stations WHERE supplier = $1",
    [supplier],
  );
  return matchStationByName(
    stationNameRaw,
    rows.map((r) => ({ id: r.id, nameRaw: r.name_raw })),
  );
}
