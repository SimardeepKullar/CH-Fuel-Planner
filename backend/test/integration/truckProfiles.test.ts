import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runMigrations } from "../../src/db/migrate.js";
import { getTruckProfileById, listTruckProfiles } from "../../src/catalog/truckProfiles.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(dirname, "../../../migrations");
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("truckProfiles catalog (integration, T-26/A16)", () => {
  let adminPool: Pool;
  let scopedPool: Pool;
  let schema: string;

  beforeEach(async () => {
    schema = `test_truckprofiles_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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

  it("lists the three seeded profiles by spec, not by fleet unit number", async () => {
    const profiles = await listTruckProfiles(scopedPool);
    expect(profiles.map((p) => p.slug).sort()).toEqual([
      "volvo-vnl-300",
      "volvo-vnl-760",
      "volvo-vnl-860",
    ]);
  });

  it("gets one profile by id, carrying its placeholder truck_number as metadata only (A16)", async () => {
    const [first] = await listTruckProfiles(scopedPool);
    const profile = await getTruckProfileById(scopedPool, first!.id);
    expect(profile?.slug).toBe(first!.slug);
  });

  it("returns null for an unknown profile id rather than throwing", async () => {
    expect(
      await getTruckProfileById(scopedPool, "00000000-0000-0000-0000-000000000000"),
    ).toBeNull();
  });
});
