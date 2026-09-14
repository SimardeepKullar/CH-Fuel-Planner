import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runBackfillCli } from "../../src/cli/backfill.js";
import { ingestFile } from "../../src/ingest/ingestFile.js";
import { runMigrations } from "../../src/db/migrate.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(dirname, "../../../migrations");
const dataDir = path.join(dirname, "../../../data/bvd");
const januaryDir = path.join(dataDir, "2026-01");
const augustFilename = "pcn-usd-9206810-981.csv";
const duplicatePairFilenames = ["pcn-usd-8097639-981 (1).csv", "pcn-usd-8097639-981.csv"];
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("runBackfillCli against the real January corpus (integration)", () => {
  let adminPool: Pool;
  let scopedPool: Pool;
  let schema: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    schema = `test_backfill_cli_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    adminPool = new Pool({ connectionString: process.env.DATABASE_URL });
    await adminPool.query(`CREATE SCHEMA "${schema}"`);
    scopedPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      options: `-c search_path=${schema},public`,
    });
    await runMigrations(scopedPool, migrationsDir);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    await scopedPool.end();
    await adminPool.query(`DROP SCHEMA "${schema}" CASCADE`);
    await adminPool.end();
  });

  it(
    "imports 30 distinct dates from 31 files, skips the byte-identical duplicate, names the January 11 gap, stays within the August station set, and is idempotent on re-run",
    async () => {
      const augustBuffer = readFileSync(path.join(dataDir, augustFilename));
      await ingestFile(scopedPool, augustBuffer, { sourceFilename: augustFilename });

      const exitCode = await runBackfillCli([januaryDir], scopedPool);
      expect(exitCode).toBe(0);
      expect(errorSpy).not.toHaveBeenCalled();

      const printed = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
      expect(printed).toContain("files:             31");
      expect(printed).toContain("gaps:              2026-01-11");

      // 30 distinct dates from 31 files: the duplicate never gets its own
      // price_imports row, since ingestFile dedupes on file_sha256.
      const januaryImports = await scopedPool.query<{ effective_date: string }>(
        "SELECT effective_date::text AS effective_date FROM price_imports WHERE source_filename <> $1",
        [augustFilename],
      );
      expect(januaryImports.rows).toHaveLength(30);
      expect(new Set(januaryImports.rows.map((r) => r.effective_date)).size).toBe(30);

      // Byte-identical pair (verified sha256 84fc7c50...): whichever file is
      // processed second dedupes against the first and never gets its own
      // price_imports row — assert on the pair, not on a specific filename,
      // since directory sort order decides which one goes first.
      const duplicatePairImports = await scopedPool.query(
        "SELECT source_filename FROM price_imports WHERE source_filename = ANY($1)",
        [duplicatePairFilenames],
      );
      expect(duplicatePairImports.rows).toHaveLength(1);

      // 594 price rows per date, 594 x 30 = 17,820 total.
      const perDate = await scopedPool.query<{ c: string }>(
        `SELECT count(*) AS c FROM station_prices
           WHERE valid_on BETWEEN '2026-01-01' AND '2026-01-31'
           GROUP BY valid_on`,
      );
      expect(perDate.rows).toHaveLength(30);
      for (const row of perDate.rows) {
        expect(row.c).toBe("594");
      }
      const total = await scopedPool.query<{ c: string }>(
        `SELECT count(*) AS c FROM station_prices
           WHERE valid_on BETWEEN '2026-01-01' AND '2026-01-31'`,
      );
      expect(total.rows[0]?.c).toBe("17820");

      // 594 distinct stations, all already present from the August set —
      // the station count does not grow past August's 605.
      const distinctStations = await scopedPool.query<{ c: string }>(
        `SELECT count(DISTINCT station_id) AS c FROM station_prices
           WHERE valid_on BETWEEN '2026-01-01' AND '2026-01-31'`,
      );
      expect(distinctStations.rows[0]?.c).toBe("594");
      const stationCount = await scopedPool.query<{ c: string }>(
        "SELECT count(*) AS c FROM stations",
      );
      expect(stationCount.rows[0]?.c).toBe("605");

      // Re-running the whole directory changes nothing.
      logSpy.mockClear();
      const secondExitCode = await runBackfillCli([januaryDir], scopedPool);
      expect(secondExitCode).toBe(0);

      const importsAfterRerun = await scopedPool.query<{ c: string }>(
        "SELECT count(*) AS c FROM price_imports",
      );
      expect(importsAfterRerun.rows[0]?.c).toBe("31");

      const totalAfterRerun = await scopedPool.query<{ c: string }>(
        `SELECT count(*) AS c FROM station_prices
           WHERE valid_on BETWEEN '2026-01-01' AND '2026-01-31'`,
      );
      expect(totalAfterRerun.rows[0]?.c).toBe("17820");
    },
    180000,
  );
});
