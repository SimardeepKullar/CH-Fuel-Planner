import type { Pool } from "pg";
import type { TruckProfileRow } from "../db/types.js";

/**
 * `truck_profiles` (v1, §16) is a set of vehicle-spec templates a plan
 * optimises against — tank size, MPG, physical dimensions. It is not the
 * fleet roster: that is `trucks`/`truck_assignments` (A11). `truck_number`
 * on a profile is a v1 placeholder (022/056/091) superseded by `trucks
 * .unit_number` and must not be read as if it identified a real unit (A16,
 * T-03 amendment) — these accessors expose the profile fields only, with no
 * join or fallback onto the roster.
 */
export async function getTruckProfileById(pool: Pool, id: string): Promise<TruckProfileRow | null> {
  const { rows } = await pool.query<TruckProfileRow>("SELECT * FROM truck_profiles WHERE id = $1", [
    id,
  ]);
  return rows[0] ?? null;
}

export async function listTruckProfiles(pool: Pool): Promise<TruckProfileRow[]> {
  const { rows } = await pool.query<TruckProfileRow>(
    "SELECT * FROM truck_profiles WHERE is_active ORDER BY display_name",
  );
  return rows;
}
