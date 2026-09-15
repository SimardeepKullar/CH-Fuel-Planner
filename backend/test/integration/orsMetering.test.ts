import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runMigrations } from "../../src/db/migrate.js";
import { OrsRoutingProvider } from "../../src/routing/ors.js";
import { BudgetExceededError } from "../../src/routing/budgetGuard.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(dirname, "../../../migrations");
const fixturesDir = path.join(dirname, "../fixtures/ors");
const hasDatabase = Boolean(process.env.DATABASE_URL);

interface OrsFixture {
  responseStatus: number;
  responseHeaders: Record<string, string>;
  responseBody: unknown;
}

function loadFixture(name: string): OrsFixture {
  return JSON.parse(readFileSync(path.join(fixturesDir, `${name}.json`), "utf8")) as OrsFixture;
}

function fetchFromFixture(fixture: OrsFixture): typeof fetch {
  return vi.fn(async () =>
    new Response(JSON.stringify(fixture.responseBody), {
      status: fixture.responseStatus,
      headers: fixture.responseHeaders,
    }),
  ) as unknown as typeof fetch;
}

const truckSpec = {
  grossWeightKg: 36287,
  heightCm: 411,
  widthCm: 259,
  lengthCm: 2250,
  axleCount: 5,
  hazmatClass: null,
};
const origin = { lat: 41.8781, lng: -87.6298 };
const destination = { lat: 32.7767, lng: -96.797 };

describe.skipIf(!hasDatabase)("OrsRoutingProvider metering (integration)", () => {
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

  it("records provider_usage and provider_quota on a real call, and throws before the HTTP call once the ceiling is hit", async () => {
    const fixture = loadFixture("route-single-leg");
    const fetchSpy = fetchFromFixture(fixture);
    const provider = new OrsRoutingProvider({
      apiKey: "test-key",
      fetchImpl: fetchSpy,
      pool: scopedPool,
      budgetCeilings: { directions: 2 },
    });

    await provider.route({ origin, destination, truckSpec });
    await provider.route({ origin, destination, truckSpec });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    await expect(provider.route({ origin, destination, truckSpec })).rejects.toBeInstanceOf(
      BudgetExceededError,
    );
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    const usage = await scopedPool.query<{ call_count: number }>(
      `SELECT call_count FROM provider_usage WHERE provider = 'ors' AND endpoint = 'directions'`,
    );
    expect(usage.rows).toEqual([{ call_count: 2 }]);

    const quota = await scopedPool.query<{ limit_value: number; remaining: number }>(
      `SELECT limit_value, remaining FROM provider_quota WHERE provider = 'ors' AND endpoint = 'directions'`,
    );
    expect(quota.rows).toEqual([
      { limit_value: Number(fixture.responseHeaders["x-ratelimit-limit"]), remaining: Number(fixture.responseHeaders["x-ratelimit-remaining"]) },
    ]);
  });

  it("still records quota headers for a 4xx response", async () => {
    const fixture = loadFixture("route-error-400");
    const provider = new OrsRoutingProvider({
      apiKey: "test-key",
      fetchImpl: fetchFromFixture(fixture),
      pool: scopedPool,
    });

    await expect(provider.route({ origin, destination, truckSpec })).rejects.toThrow();

    const quota = await scopedPool.query<{ remaining: number }>(
      `SELECT remaining FROM provider_quota WHERE provider = 'ors' AND endpoint = 'directions'`,
    );
    expect(quota.rows).toEqual([{ remaining: Number(fixture.responseHeaders["x-ratelimit-remaining"]) }]);
  });

  it("skips metering entirely when no pool is given", async () => {
    const fixture = loadFixture("route-single-leg");
    const provider = new OrsRoutingProvider({
      apiKey: "test-key",
      fetchImpl: fetchFromFixture(fixture),
    });

    await provider.route({ origin, destination, truckSpec });

    const usage = await scopedPool.query(`SELECT * FROM provider_usage`);
    expect(usage.rows).toEqual([]);
  });
});
