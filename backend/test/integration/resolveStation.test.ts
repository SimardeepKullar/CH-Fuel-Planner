import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runMigrations } from "../../src/db/migrate.js";
import { resolveStationByName } from "../../src/resolve/resolveStation.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(dirname, "../../../migrations");
const hasDatabase = Boolean(process.env.DATABASE_URL);

async function insertStation(
  pool: Pool,
  opts: { siteRef: string; nameRaw: string; city?: string; state?: string },
): Promise<void> {
  await pool.query(
    `INSERT INTO stations (supplier, site_ref, name_raw, city_raw, city_normalized, state_usps)
     VALUES ('BVD', $1, $2, $3, $3, $4)`,
    [opts.siteRef, opts.nameRaw, opts.city ?? "Dallas", opts.state ?? "TX"],
  );
}

describe.skipIf(!hasDatabase)("resolveStationByName (integration, T-29)", () => {
  let adminPool: Pool;
  let scopedPool: Pool;
  let schema: string;

  beforeEach(async () => {
    schema = `test_resolvestation_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    adminPool = new Pool({ connectionString: process.env.DATABASE_URL });
    await adminPool.query(`CREATE SCHEMA "${schema}"`);
    scopedPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      options: `-c search_path=${schema},public`,
    });
    await runMigrations(scopedPool, migrationsDir);
  });

  afterEach(async () => {
    await scopedPool.end();
    await adminPool.query(`DROP SCHEMA "${schema}" CASCADE`);
    await adminPool.end();
  });

  it("resolves 'LOVES #294' to the station whose site_ref is 43673, via store number, never SITE text", async () => {
    // Real pairing from data/bvd/pcn-usd-9206810-981.csv: SITE 43673, NAME "LOVES #294".
    await insertStation(scopedPool, { siteRef: "43673", nameRaw: "LOVES #294" });
    // A decoy at a different site_ref proves the join is on the parsed store
    // number, not on any relationship to BVD's own site text.
    await insertStation(scopedPool, { siteRef: "99999", nameRaw: "LOVES #999" });

    const stationId = await resolveStationByName(scopedPool, "LOVES #294");
    expect(stationId).not.toBeNull();

    const { rows } = await scopedPool.query<{ site_ref: string }>(
      "SELECT site_ref FROM stations WHERE id = $1",
      [stationId],
    );
    expect(rows[0]?.site_ref).toBe("43673");
  });

  it("leaves station_id null for a store number no station carries — no guess", async () => {
    await insertStation(scopedPool, { siteRef: "43673", nameRaw: "LOVES #294" });

    const stationId = await resolveStationByName(scopedPool, "LOVES #999999");
    expect(stationId).toBeNull();
  });

  it("imports T-08's parseStoreName rather than reimplementing store-number parsing", () => {
    const source = readFileSync(
      path.join(dirname, "../../src/resolve/resolveStation.ts"),
      "utf8",
    );
    expect(source).toContain('from "../resolution/storeNumber.js"');
    expect(source).toContain("parseStoreName");
  });
});
