import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runResolveCli } from "../../src/cli/resolve.js";
import { ingestFile } from "../../src/ingest/ingestFile.js";
import { runMigrations } from "../../src/db/migrate.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(dirname, "../../../migrations");
const dataDir = path.join(dirname, "../../../data/bvd");
const hasDatabase = Boolean(process.env.DATABASE_URL);

// The real store #306: LOVES #306, Dandridge, TN, site_ref 42284 — the one
// station T-08's operator-export join could not place (BUILD-PLAN 9.2).
const STORE_306_SITE_REF = "42284";
// OpenStreetMap node 6616599586 — brand=Love's, ref=306, hgv=yes, 1058 Deep
// Springs Road, Dandridge TN 37725. An approved source per CLAUDE.md
// ("operator export, OSM, or the Census gazetteer" — never a provider geocode).
const STORE_306_OSM_LAT = 36.0119881;
const STORE_306_OSM_LON = -83.5323062;

function meta(effectiveDate: string): string {
  return `"Company Id: ",981," ","Company Name: ","2043733 ONTARIO INC."," ",DBA,"CH LOGISTIX"," ","Effective Date: ",${effectiveDate}`;
}
const header =
  'SITE,NAME,CITY,STATE,PROD,COST,"FEDERAL TAX","STATE TAX","SALES TAX",FREIGHT,OTHER,"TOTAL COST","RETAIL PRICE","YOUR PRICE",SAVINGS';

function validRow(
  site: string,
  name: string,
  opts: { city?: string; state?: string } = {},
): string {
  return [
    site,
    `"${name}"`,
    opts.city ?? "Clanton",
    opts.state ?? "AL",
    "ULSD",
    "4.5215",
    "0.2483",
    "0.3175",
    "0",
    "0.1187",
    "0.02",
    "5.226",
    "5.689",
    "5.226",
    "0.463",
  ].join(",");
}

function makeCsv(effectiveDate: string, rows: string[]): Buffer {
  return Buffer.from([meta(effectiveDate), header, ...rows].join("\n"), "utf8");
}

describe.skipIf(!hasDatabase)("runResolveCli (integration)", () => {
  let adminPool: Pool;
  let scopedPool: Pool;
  let schema: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    schema = `test_resolve_cli_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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

  describe("gazetteer subcommand", () => {
    it("resolves an unresolved station whose city matches a seeded centroid", async () => {
      await ingestFile(
        scopedPool,
        makeCsv("2026-08-22", [validRow("9001", "LOVES #900", { city: "ELOY", state: "AZ" })]),
        { sourceFilename: "a.csv" },
      );
      await scopedPool.query(
        `INSERT INTO place_centroids (state_usps, name_normalized, name_raw, geom, uncertainty_m, source)
         VALUES ('AZ', 'Eloy', 'Eloy city',
                 ST_SetSRID(ST_MakePoint(-111.5527, 32.7548), 4326)::geography, 6031.4,
                 'census_gazetteer_2024_place')`,
      );

      const exitCode = await runResolveCli(["gazetteer"], scopedPool);
      expect(exitCode).toBe(0);
      expect(errorSpy).not.toHaveBeenCalled();

      const printed = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
      expect(printed).toContain("scanned:           1");
      expect(printed).toContain("resolved:          1");

      const { rows } = await scopedPool.query(
        `SELECT resolution, resolution_source, uncertainty_m, city_normalized, geom IS NOT NULL AS has_geom
         FROM stations WHERE site_ref = '9001'`,
      );
      expect(rows[0].resolution).toBe("city");
      expect(rows[0].resolution_source).toBe("gazetteer");
      expect(Number(rows[0].uncertainty_m)).toBe(6031.4);
      expect(rows[0].city_normalized).toBe("Eloy");
      expect(rows[0].has_geom).toBe(true);
    });

    it("leaves a station unresolved and names it when no centroid matches", async () => {
      await ingestFile(
        scopedPool,
        makeCsv("2026-08-22", [
          validRow("9002", "LOVES #901", { city: "NOWHERESVILLE", state: "AZ" }),
        ]),
        { sourceFilename: "b.csv" },
      );

      const exitCode = await runResolveCli(["gazetteer"], scopedPool);
      expect(exitCode).toBe(0);

      const printed = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
      expect(printed).toContain("still unresolved:  9002");

      const { rows } = await scopedPool.query(
        `SELECT resolution FROM stations WHERE site_ref = '9002'`,
      );
      expect(rows[0].resolution).toBe("unresolved");
    });
  });

  describe("manual subcommand", () => {
    it("resolves a named station exactly, recording its source and resolved_at", async () => {
      await ingestFile(
        scopedPool,
        makeCsv("2026-08-22", [
          validRow(STORE_306_SITE_REF, "LOVES #306", { city: "Dandridge", state: "TN" }),
        ]),
        { sourceFilename: "c.csv" },
      );

      const before = new Date();
      const exitCode = await runResolveCli(
        [
          "manual",
          STORE_306_SITE_REF,
          String(STORE_306_OSM_LAT),
          String(STORE_306_OSM_LON),
          "osm",
          "osm_verified",
        ],
        scopedPool,
      );
      expect(exitCode).toBe(0);
      expect(errorSpy).not.toHaveBeenCalled();

      const { rows } = await scopedPool.query(
        `SELECT resolution, uncertainty_m, resolution_source, resolved_at, truck_accessible,
                ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lon
         FROM stations WHERE site_ref = $1`,
        [STORE_306_SITE_REF],
      );
      expect(rows[0].resolution).toBe("exact");
      expect(Number(rows[0].uncertainty_m)).toBe(0);
      expect(rows[0].resolution_source).toBe("osm");
      expect(rows[0].truck_accessible).toBe("osm_verified");
      expect(new Date(rows[0].resolved_at).getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(Number(rows[0].lat)).toBeCloseTo(STORE_306_OSM_LAT, 5);
      expect(Number(rows[0].lon)).toBeCloseTo(STORE_306_OSM_LON, 5);
    });

    it("exits non-zero with the reason on stderr for an unknown site_ref", async () => {
      const exitCode = await runResolveCli(
        ["manual", "does-not-exist", "36", "-83", "osm"],
        scopedPool,
      );
      expect(exitCode).not.toBe(0);
      expect(errorSpy).toHaveBeenCalled();
    });

    it("rejects non-numeric coordinates before touching the database", async () => {
      const exitCode = await runResolveCli(
        ["manual", STORE_306_SITE_REF, "not-a-number", "-83", "osm"],
        scopedPool,
      );
      expect(exitCode).not.toBe(0);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  it(
    "the real August sheet ends up 605/605 resolved: 604 via tier 1, store #306 via manual entry",
    async () => {
      const augustFile = readFileSync(path.join(dataDir, "pcn-usd-9206810-981.csv"));
      await ingestFile(scopedPool, augustFile, { sourceFilename: "pcn-usd-9206810-981.csv" });

      // Simulates T-08's operator-export tier (a separate, already-merged
      // ticket run via scripts/resolve_from_operator.py) resolving the 604
      // matched stations, leaving only #306 for this ticket to close.
      await scopedPool.query(
        `UPDATE stations SET resolution = 'exact', uncertainty_m = 0,
                              resolution_source = 'operator_export', resolved_at = now(),
                              truck_accessible = 'operator_verified',
                              geom = ST_SetSRID(ST_MakePoint(-97.5, 35.4), 4326)::geography
         WHERE site_ref <> $1`,
        [STORE_306_SITE_REF],
      );

      const before = await scopedPool.query(
        `SELECT count(*) FROM stations WHERE geom IS NULL`,
      );
      expect(before.rows[0].count).toBe("1");

      const exitCode = await runResolveCli(
        [
          "manual",
          STORE_306_SITE_REF,
          String(STORE_306_OSM_LAT),
          String(STORE_306_OSM_LON),
          "osm",
          "osm_verified",
        ],
        scopedPool,
      );
      expect(exitCode).toBe(0);

      const after = await scopedPool.query(`SELECT count(*) FROM stations WHERE geom IS NOT NULL`);
      expect(after.rows[0].count).toBe("605");
      const stillUnresolved = await scopedPool.query(
        `SELECT count(*) FROM stations WHERE resolution = 'unresolved'`,
      );
      expect(stillUnresolved.rows[0].count).toBe("0");
    },
    20000,
  );
});
