import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";
import { getPool } from "./pool.js";

const DEFAULT_MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../migrations",
);

export interface MigrationResult {
  filename: string;
  applied: boolean;
}

async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

/**
 * Applies every *.sql file in migrationsDir, in filename order, that is not
 * already recorded in schema_migrations. Each file runs inside its own
 * transaction: a failing statement rolls back that file's changes and the
 * file is left unrecorded, so a subsequent run retries it.
 */
export async function runMigrations(
  pool: Pool,
  migrationsDir: string = DEFAULT_MIGRATIONS_DIR,
): Promise<MigrationResult[]> {
  await ensureMigrationsTable(pool);

  const entries = await readdir(migrationsDir);
  const filenames = entries.filter((entry) => entry.endsWith(".sql")).sort();

  const { rows: appliedRows } = await pool.query<{ filename: string }>(
    "SELECT filename FROM schema_migrations",
  );
  const applied = new Set(appliedRows.map((row) => row.filename));

  const results: MigrationResult[] = [];

  for (const filename of filenames) {
    if (applied.has(filename)) {
      results.push({ filename, applied: false });
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, filename), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1)",
        [filename],
      );
      await client.query("COMMIT");
      results.push({ filename, applied: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  return results;
}

const isMainModule =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  const pool = getPool();
  runMigrations(pool)
    .then(async (results) => {
      for (const result of results) {
        console.log(`${result.applied ? "applied" : "skipped"}  ${result.filename}`);
      }
      await pool.end();
    })
    .catch(async (err: unknown) => {
      console.error(err instanceof Error ? err.message : err);
      await pool.end();
      process.exitCode = 1;
    });
}
