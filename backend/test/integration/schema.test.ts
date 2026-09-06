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
});
