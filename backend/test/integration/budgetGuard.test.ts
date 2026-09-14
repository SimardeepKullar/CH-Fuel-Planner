import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runMigrations } from "../../src/db/migrate.js";
import { BudgetExceededError, withBudgetGuard } from "../../src/routing/budgetGuard.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(dirname, "../../../migrations");
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("budgetGuard (integration)", () => {
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

  const SEPTEMBER = new Date(Date.UTC(2026, 8, 15));
  const OCTOBER = new Date(Date.UTC(2026, 9, 1));

  it("lets calls up to the ceiling succeed; N+1 throws and the HTTP call is not made", async () => {
    const fetchSpy = vi.fn(async () => "ok");

    await withBudgetGuard(scopedPool, "ors", "directions", 3, fetchSpy, SEPTEMBER);
    await withBudgetGuard(scopedPool, "ors", "directions", 3, fetchSpy, SEPTEMBER);
    await withBudgetGuard(scopedPool, "ors", "directions", 3, fetchSpy, SEPTEMBER);
    expect(fetchSpy).toHaveBeenCalledTimes(3);

    await expect(
      withBudgetGuard(scopedPool, "ors", "directions", 3, fetchSpy, SEPTEMBER),
    ).rejects.toBeInstanceOf(BudgetExceededError);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("pools the ceiling across endpoints while storing a counter per (provider, period, endpoint)", async () => {
    const fetchSpy = vi.fn(async () => "ok");

    await withBudgetGuard(scopedPool, "ors", "directions", 4, fetchSpy, SEPTEMBER);
    await withBudgetGuard(scopedPool, "ors", "directions", 4, fetchSpy, SEPTEMBER);
    await withBudgetGuard(scopedPool, "ors", "matrix", 4, fetchSpy, SEPTEMBER);
    await withBudgetGuard(scopedPool, "ors", "matrix", 4, fetchSpy, SEPTEMBER);
    expect(fetchSpy).toHaveBeenCalledTimes(4);

    // Neither endpoint alone has hit 4, but the pooled total (4) has.
    await expect(
      withBudgetGuard(scopedPool, "ors", "directions", 4, fetchSpy, SEPTEMBER),
    ).rejects.toBeInstanceOf(BudgetExceededError);

    const { rows } = await scopedPool.query<{ endpoint: string; call_count: number }>(
      `SELECT endpoint, call_count FROM provider_usage WHERE provider = 'ors' ORDER BY endpoint`,
    );
    expect(rows).toEqual([
      { endpoint: "directions", call_count: 2 },
      { endpoint: "matrix", call_count: 2 },
    ]);
  });

  it("resets at a new calendar month", async () => {
    const fetchSpy = vi.fn(async () => "ok");

    await withBudgetGuard(scopedPool, "ors", "directions", 2, fetchSpy, SEPTEMBER);
    await withBudgetGuard(scopedPool, "ors", "directions", 2, fetchSpy, SEPTEMBER);
    await expect(
      withBudgetGuard(scopedPool, "ors", "directions", 2, fetchSpy, SEPTEMBER),
    ).rejects.toBeInstanceOf(BudgetExceededError);

    // October's counter starts fresh even though September is exhausted.
    await expect(
      withBudgetGuard(scopedPool, "ors", "directions", 2, fetchSpy, OCTOBER),
    ).resolves.toBe("ok");
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("still counts a reserved call whose HTTP request subsequently fails", async () => {
    const failingCall = vi.fn(async () => {
      throw new Error("network blip");
    });

    await expect(
      withBudgetGuard(scopedPool, "ors", "directions", 5, failingCall, SEPTEMBER),
    ).rejects.toThrow("network blip");

    const { rows } = await scopedPool.query<{ call_count: number }>(
      `SELECT call_count FROM provider_usage WHERE provider = 'ors' AND endpoint = 'directions'`,
    );
    expect(rows).toEqual([{ call_count: 1 }]);
  });
});
