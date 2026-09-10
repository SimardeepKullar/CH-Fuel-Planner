import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runMigrations } from "../../src/db/migrate.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(dirname, "../../../migrations");
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("0001_init.sql (integration)", () => {
  let adminPool: Pool;
  let scopedPool: Pool;
  let schema: string;

  beforeEach(async () => {
    schema = `test_schema_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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

  it("applies with no error against a clean schema", async () => {
    const { rows } = await scopedPool.query<{ filename: string }>(
      `SELECT filename FROM ${schema}.schema_migrations`,
    );
    expect(rows.map((r) => r.filename)).toContain("0001_init.sql");
  });

  it("defaults truck_profiles.reserve_fraction to 0.150", async () => {
    await scopedPool.query(
      `INSERT INTO truck_profiles (slug, display_name, tank_gallons, avg_mpg)
       VALUES ('t1', 'Test Truck', 200, 7.0)`,
    );
    const { rows } = await scopedPool.query<{ reserve_fraction: string }>(
      `SELECT reserve_fraction FROM truck_profiles WHERE slug = 't1'`,
    );
    expect(rows[0]?.reserve_fraction).toBe("0.150");
  });

  it("rejects min_leg_miles greater than max_leg_miles", async () => {
    await expect(
      scopedPool.query(
        `INSERT INTO truck_profiles
           (slug, display_name, tank_gallons, avg_mpg, min_leg_miles, max_leg_miles)
         VALUES ('t2', 'Test Truck 2', 200, 7.0, 600, 500)`,
      ),
    ).rejects.toThrow();
  });

  it("rejects a role outside the enum", async () => {
    await expect(
      scopedPool.query(
        `INSERT INTO users (email, password_hash, display_name, role)
         VALUES ('a@example.com', 'hash', 'A', 'superadmin')`,
      ),
    ).rejects.toThrow();
  });

  it("permits the same slug under two different owners", async () => {
    const { rows: userRows } = await scopedPool.query<{ id: string }>(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ('owner1@example.com', 'hash', 'Owner One'),
              ('owner2@example.com', 'hash', 'Owner Two')
       RETURNING id`,
    );
    const [owner1, owner2] = userRows;
    await scopedPool.query(
      `INSERT INTO truck_profiles (slug, display_name, tank_gallons, avg_mpg, owner_user_id)
       VALUES ('shared-slug', 'Truck A', 200, 7.0, $1),
              ('shared-slug', 'Truck B', 200, 7.0, $2)`,
      [owner1?.id, owner2?.id],
    );
    const { rows } = await scopedPool.query<{ count: string }>(
      `SELECT count(*) FROM truck_profiles WHERE slug = 'shared-slug'`,
    );
    expect(rows[0]?.count).toBe("2");
  });

  it("rejects the same slug twice under one owner (including no owner)", async () => {
    await scopedPool.query(
      `INSERT INTO truck_profiles (slug, display_name, tank_gallons, avg_mpg)
       VALUES ('system-slug', 'System Truck A', 200, 7.0)`,
    );
    await expect(
      scopedPool.query(
        `INSERT INTO truck_profiles (slug, display_name, tank_gallons, avg_mpg)
         VALUES ('system-slug', 'System Truck B', 200, 7.0)`,
      ),
    ).rejects.toThrow();
  });

  async function insertStation(
    supplier: string,
    siteRef: string,
  ): Promise<string> {
    const { rows } = await scopedPool.query<{ id: string }>(
      `INSERT INTO stations (supplier, site_ref, name_raw, city_raw, city_normalized, state_usps)
       VALUES ($1, $2, 'LOVES #368', 'ELOY', 'Eloy', 'AZ')
       RETURNING id`,
      [supplier, siteRef],
    );
    const id = rows[0]?.id;
    if (!id) throw new Error("insertStation failed");
    return id;
  }

  it("rejects a duplicate (supplier, site_ref) but accepts the same site_ref under a different supplier", async () => {
    await insertStation("BVD", "9206810");
    await expect(insertStation("BVD", "9206810")).rejects.toThrow();
    await expect(insertStation("OTHER_SUPPLIER", "9206810")).resolves.toBeTruthy();
  });

  it("rejects an out-of-enum resolution value", async () => {
    await expect(
      scopedPool.query(
        `INSERT INTO stations (supplier, site_ref, name_raw, city_raw, city_normalized, state_usps, resolution)
         VALUES ('BVD', 's1', 'LOVES #368', 'ELOY', 'Eloy', 'AZ', 'geocoded')`,
      ),
    ).rejects.toThrow();
  });

  async function insertPriceImport(
    fileSha256: string,
    effectiveDate: string,
  ): Promise<string> {
    const { rows } = await scopedPool.query<{ id: string }>(
      `INSERT INTO price_imports (supplier, source_filename, file_sha256, effective_date)
       VALUES ('BVD', 'pcn-usd.csv', $1, $2)
       RETURNING id`,
      [fileSha256, effectiveDate],
    );
    const id = rows[0]?.id;
    if (!id) throw new Error("insertPriceImport failed");
    return id;
  }

  it("accepts two imports with the same effective_date and different hashes, and rejects a repeated hash", async () => {
    const hashA = "a".repeat(64);
    const hashB = "b".repeat(64);
    await expect(insertPriceImport(hashA, "2026-08-22")).resolves.toBeTruthy();
    await expect(insertPriceImport(hashB, "2026-08-22")).resolves.toBeTruthy();
    await expect(insertPriceImport(hashA, "2026-08-22")).rejects.toThrow();
  });

  it("computes price_ifta_net as cost + freight + other + federal_tax, treating nulls as zero", async () => {
    const stationId = await insertStation("BVD", "9206810");
    const importId = await insertPriceImport("c".repeat(64), "2026-08-22");
    await scopedPool.query(
      `INSERT INTO station_prices
         (station_id, import_id, raw_product, product_type, cost, freight, federal_tax, your_price, valid_on)
       VALUES ($1, $2, 'ULSD', 'highway_diesel', 2.5000, 0.1000, 0.2440, 3.1000, '2026-08-22')`,
      [stationId, importId],
    );
    const { rows } = await scopedPool.query<{ price_ifta_net: string }>(
      `SELECT price_ifta_net FROM station_prices WHERE station_id = $1`,
      [stationId],
    );
    expect(rows[0]?.price_ifta_net).toBe("2.8440");
  });

  it("rejects a duplicate (station_id, raw_product, valid_on)", async () => {
    const stationId = await insertStation("BVD", "9206810");
    const importId = await insertPriceImport("d".repeat(64), "2026-08-22");
    const insertPrice = () =>
      scopedPool.query(
        `INSERT INTO station_prices
           (station_id, import_id, raw_product, product_type, your_price, valid_on)
         VALUES ($1, $2, 'ULSD', 'highway_diesel', 3.10, '2026-08-22')`,
        [stationId, importId],
      );
    await expect(insertPrice()).resolves.toBeTruthy();
    await expect(insertPrice()).rejects.toThrow();
  });
});
