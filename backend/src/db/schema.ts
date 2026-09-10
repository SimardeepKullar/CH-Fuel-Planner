/**
 * Hand-maintained mirror of migrations/*.sql.
 *
 * §12.2 assumes a query builder whose schema definition doubles as this mirror.
 * Under D1 there is no query builder, so this file is the mirror and it is
 * maintained by hand. drift.test.ts compares it against information_schema on
 * every run, so code and database cannot diverge silently.
 *
 * Direction of authority: the migration wins. When this file and the database
 * disagree, the migration is right and this file gets edited — never the
 * reverse. PROJECT-SCOPE §12 is documentation and is edited to follow.
 */

export interface ColumnDescriptor {
  name: string;
  /** pg_catalog udt_name — `int8`, `numeric`, `timestamptz`, `geography`. */
  type: string;
  nullable: boolean;
  /** Normalised `column_default`; omitted when the column has none. */
  default?: string;
}

export interface TableDescriptor {
  name: string;
  columns: ColumnDescriptor[];
  /** `pg_get_constraintdef` bodies for CHECK constraints, order-insensitive. */
  checks?: string[];
}

const t = (name: string, nullable = false, dflt?: string): ColumnDescriptor => ({
  name,
  type: "text",
  nullable,
  ...(dflt === undefined ? {} : { default: dflt }),
});

const col = (
  name: string,
  type: string,
  nullable = false,
  dflt?: string,
): ColumnDescriptor => ({
  name,
  type,
  nullable,
  ...(dflt === undefined ? {} : { default: dflt }),
});

const uuidPk = (): ColumnDescriptor =>
  col("id", "uuid", false, "gen_random_uuid()");

const bigserialPk = (table: string): ColumnDescriptor =>
  col("id", "int8", false, `nextval('${table}_id_seq'::regclass)`);

const createdAt = (name = "created_at"): ColumnDescriptor =>
  col(name, "timestamptz", false, "now()");

export const SCHEMA: readonly TableDescriptor[] = [
  {
    name: "import_batches",
    columns: [
      uuidPk(),
      t("label", true),
      col("file_count", "int4", false, "0"),
      createdAt(),
      col("completed_at", "timestamptz", true),
    ],
  },
  {
    name: "import_rejections",
    columns: [
      bigserialPk("import_rejections"),
      col("import_id", "uuid"),
      col("line_number", "int4"),
      t("site_ref", true),
      t("code"),
      t("message"),
    ],
  },
  {
    name: "place_centroids",
    columns: [
      col("state_usps", "bpchar"),
      t("name_normalized"),
      t("name_raw"),
      t("geoid", true),
      col("geom", "geography"),
      col("land_area_sqmi", "numeric", true),
      col("uncertainty_m", "numeric"),
      t("source"),
    ],
  },
  {
    name: "plan_stops",
    columns: [
      bigserialPk("plan_stops"),
      col("plan_id", "uuid"),
      col("seq", "int2"),
      t("stop_type", false, "'fuel'::text"),
      col("station_id", "uuid", true),
      col("station_price_id", "int8", true),
      col("offset_along_route_m", "numeric"),
      col("leg_distance_m", "numeric"),
      col("detour_distance_m", "numeric", false, "0"),
      col("detour_duration_s", "int4", false, "0"),
      col("arrival_gallons", "numeric"),
      col("purchase_gallons", "numeric"),
      col("departure_gallons", "numeric"),
      col("unit_price_usd", "numeric"),
      col("stop_cost_usd", "numeric"),
      col("cum_distance_m", "numeric"),
      col("cum_duration_s", "int4"),
    ],
    checks: [
      "CHECK ((stop_type = ANY (ARRAY['fuel'::text, 'rest'::text, 'delivery'::text])))",
    ],
  },
  {
    name: "plans",
    columns: [
      uuidPk(),
      col("created_by", "uuid", true),
      col("base_route_id", "uuid"),
      col("optimized_route_id", "uuid", true),
      col("truck_profile_id", "uuid"),
      t("optimizer_strategy", false, "'dp_v1'::text"),
      t("price_basis", false, "'pump'::text"),
      col("start_fuel_gallons", "numeric"),
      col("min_arrival_gallons", "numeric"),
      col("max_leg_miles", "numeric"),
      col("min_leg_miles", "numeric"),
      col("min_leg_relaxed", "bool", false, "false"),
      col("max_detour_miles", "numeric"),
      col("driver_cost_per_hour", "numeric", false, "0"),
      col("fixed_stop_minutes", "int4", false, "20"),
      col("max_stops", "int2", true),
      t("status"),
      t("infeasible_reason", true),
      col("total_fuel_cost_usd", "numeric", true),
      col("total_gallons", "numeric", true),
      col("total_distance_m", "numeric", true),
      col("total_duration_s", "int4", true),
      col("baseline_cost_usd", "numeric", true),
      col("price_as_of", "date", true),
      t("google_maps_url", true),
      col("disclaimers", "jsonb", false, "'[]'::jsonb"),
      createdAt(),
      col("completed_at", "timestamptz", true),
      col("dispatched_at", "timestamptz", true),
    ],
    checks: [
      "CHECK ((price_basis = ANY (ARRAY['pump'::text, 'ifta_net'::text, 'total_cost'::text])))",
      // §12.2: exactly two values. There is no async job model to hold an
      // in-between state, and no 'failed' — a technical failure returns an
      // RFC 9457 error and persists nothing.
      "CHECK ((status = ANY (ARRAY['completed'::text, 'infeasible'::text])))",
    ],
  },
  {
    name: "price_imports",
    columns: [
      uuidPk(),
      col("batch_id", "uuid", true),
      t("supplier"),
      t("company_id", true),
      col("country", "bpchar", false, "'US'::bpchar"),
      t("source_filename"),
      col("file_sha256", "bpchar"),
      col("effective_date", "date"),
      col("received_at", "timestamptz", true),
      t("status", false, "'pending'::text"),
      col("rows_read", "int4", true),
      col("rows_accepted", "int4", true),
      col("rows_rejected", "int4", true),
      col("report", "jsonb", true),
      createdAt("started_at"),
      col("completed_at", "timestamptz", true),
    ],
    checks: [
      "CHECK ((status = ANY (ARRAY['pending'::text, 'parsing'::text, 'validating'::text, 'completed'::text, 'failed'::text])))",
    ],
  },
  {
    name: "product_codes",
    columns: [
      t("supplier"),
      t("raw_code"),
      t("product_type"),
      t("mapped_by"),
      createdAt("mapped_at"),
      t("notes", true),
    ],
    checks: [
      "CHECK ((product_type = ANY (ARRAY['highway_diesel'::text, 'off_road_diesel'::text, 'gasoline'::text, 'def'::text, 'other'::text])))",
    ],
  },
  {
    name: "provider_quota",
    columns: [
      t("provider"),
      t("endpoint"),
      col("limit_value", "int4", true),
      col("remaining", "int4", true),
      col("observed_at", "timestamptz"),
      col("prev_remaining", "int4", true),
      col("prev_observed_at", "timestamptz", true),
    ],
  },
  {
    name: "provider_usage",
    columns: [
      t("provider"),
      col("period", "date"),
      t("endpoint"),
      col("call_count", "int4", false, "0"),
    ],
  },
  {
    // No expires_at: §17, decided 10 September 2026. ORS geometry is ODbL and
    // carries no storage cap, so v1 keeps it indefinitely. Geometry stays
    // nullable so a contractually capped provider needs a job, not a migration.
    name: "routes",
    columns: [
      uuidPk(),
      t("provider"),
      col("request_hash", "bpchar"),
      col("origin_geom", "geography"),
      col("destination_geom", "geography"),
      col("truck_profile_id", "uuid"),
      col("via_hash", "bpchar", true),
      col("line", "geography", true),
      t("polyline", true),
      col("legs", "jsonb", true),
      col("distance_m", "numeric"),
      col("duration_s", "int4"),
      createdAt("computed_at"),
    ],
  },
  {
    name: "saved_locations",
    columns: [
      uuidPk(),
      t("label", true),
      t("address_raw"),
      t("address_norm"),
      col("geom", "geography"),
      t("geocode_source"),
      createdAt("geocoded_at"),
      // Provider geocodes are capped at 30 days (§17). Unrelated to route
      // geometry, and unaffected by its expiry being dropped.
      col("expires_at", "timestamptz"),
      col("use_count", "int4", false, "0"),
    ],
  },
  {
    // Created by the migration runner (T-01), not by a migration file.
    name: "schema_migrations",
    columns: [t("filename"), createdAt("applied_at")],
  },
  {
    name: "station_geocode_candidates",
    columns: [
      bigserialPk("station_geocode_candidates"),
      col("station_id", "uuid"),
      col("rank", "int2"),
      col("geom", "geography"),
      t("source"),
      col("score", "numeric", true),
      col("uncertainty_m", "numeric", true),
      col("raw", "jsonb", true),
      createdAt(),
    ],
  },
  {
    name: "station_prices",
    columns: [
      bigserialPk("station_prices"),
      col("station_id", "uuid"),
      col("import_id", "uuid"),
      t("raw_product"),
      t("product_type"),
      col("cost", "numeric", true),
      col("federal_tax", "numeric", true),
      col("state_tax", "numeric", true),
      col("sales_tax", "numeric", true),
      col("freight", "numeric", true),
      col("other", "numeric", true),
      col("total_cost", "numeric", true),
      col("retail_price", "numeric", true),
      col("your_price", "numeric", true),
      col("savings", "numeric", true),
      // Generated columns. your_price is READ from the sheet, never computed.
      col("price_pump", "numeric", true),
      col("price_ifta_net", "numeric", true),
      col("valid_on", "date"),
    ],
  },
  {
    name: "stations",
    columns: [
      uuidPk(),
      t("supplier"),
      t("site_ref"),
      t("name_raw"),
      t("brand_normalized", true),
      col("store_number", "int4", true),
      // city_raw is never overwritten; city_normalized is the matching key.
      t("city_raw"),
      t("city_normalized"),
      col("state_usps", "bpchar"),
      col("country", "bpchar", false, "'US'::bpchar"),
      col("geom", "geography", true),
      t("resolution", false, "'unresolved'::text"),
      col("uncertainty_m", "numeric", true),
      t("resolution_source", true),
      col("resolved_at", "timestamptz", true),
      t("truck_accessible", false, "'unverified'::text"),
      t("osm_id", true),
      col("osm_tags", "jsonb", true),
      // Location and amenity fields only. NEVER prices — §17.1.
      col("operator_attrs", "jsonb", true),
      col("max_gallons_per_txn", "numeric", true),
      createdAt("first_seen_at"),
      createdAt("last_seen_at"),
    ],
    checks: [
      "CHECK ((resolution = ANY (ARRAY['exact'::text, 'city'::text, 'unresolved'::text])))",
      "CHECK ((truck_accessible = ANY (ARRAY['operator_verified'::text, 'osm_verified'::text, 'unverified'::text, 'excluded'::text])))",
    ],
  },
  {
    name: "truck_profiles",
    columns: [
      uuidPk(),
      t("slug"),
      t("display_name"),
      col("truck_number", "int4", true),
      col("owner_user_id", "uuid", true),
      col("is_system", "bool", false, "false"),
      col("is_active", "bool", false, "true"),
      col("tank_gallons", "numeric"),
      col("avg_mpg", "numeric"),
      // D2: 0.150, not the pre-rewrite 0.100.
      col("reserve_fraction", "numeric", false, "0.150"),
      col("max_leg_miles", "numeric", false, "500"),
      col("min_leg_miles", "numeric", false, "300"),
      col("max_gallons_per_fill", "numeric", true),
      col("gross_weight_kg", "int4", true),
      col("height_cm", "int4", true),
      col("width_cm", "int4", true),
      col("length_cm", "int4", true),
      col("axle_count", "int2", true),
      col("trailer_count", "int2", true),
      t("hazmat_class", true),
      col("cost_per_mile_usd", "numeric", false, "0.000"),
      col("fixed_stop_minutes", "int4", false, "20"),
      createdAt(),
      createdAt("updated_at"),
    ],
    checks: [
      "CHECK ((avg_mpg > (0)::numeric))",
      "CHECK ((min_leg_miles <= max_leg_miles))",
      "CHECK ((tank_gallons > (0)::numeric))",
      "CHECK (((reserve_fraction >= (0)::numeric) AND (reserve_fraction < 0.5)))",
    ],
  },
  {
    name: "users",
    columns: [
      uuidPk(),
      t("email"),
      // D7: both absent from §12 as written; a login page cannot be built
      // without them.
      t("password_hash"),
      t("display_name"),
      t("role", false, "'dispatcher'::text"),
      createdAt(),
    ],
    checks: [
      "CHECK ((role = ANY (ARRAY['dispatcher'::text, 'driver'::text, 'admin'::text])))",
    ],
  },
];

function describeColumn(c: ColumnDescriptor): string {
  const parts = [c.type, c.nullable ? "NULL" : "NOT NULL"];
  if (c.default !== undefined) parts.push(`DEFAULT ${c.default}`);
  return parts.join(" ");
}

/**
 * Compares the hand-maintained descriptor against what the database actually
 * has, returning one human-readable line per difference. An empty array means
 * no drift.
 *
 * Pure: callers do the I/O and pass the observed shape in, so fault injection
 * in the tests needs no database.
 */
export function diffSchema(
  expected: readonly TableDescriptor[],
  actual: readonly TableDescriptor[],
): string[] {
  const problems: string[] = [];
  const expectedByName = new Map(expected.map((tbl) => [tbl.name, tbl]));
  const actualByName = new Map(actual.map((tbl) => [tbl.name, tbl]));

  for (const name of expectedByName.keys()) {
    if (!actualByName.has(name)) {
      problems.push(`table ${name}: in descriptor, missing from database`);
    }
  }
  for (const name of actualByName.keys()) {
    if (!expectedByName.has(name)) {
      problems.push(`table ${name}: in database, missing from descriptor`);
    }
  }

  for (const [name, expectedTable] of expectedByName) {
    const actualTable = actualByName.get(name);
    if (!actualTable) continue;

    const expectedCols = new Map(expectedTable.columns.map((c) => [c.name, c]));
    const actualCols = new Map(actualTable.columns.map((c) => [c.name, c]));

    for (const columnName of expectedCols.keys()) {
      if (!actualCols.has(columnName)) {
        problems.push(
          `${name}.${columnName}: in descriptor, missing from database`,
        );
      }
    }
    for (const columnName of actualCols.keys()) {
      if (!expectedCols.has(columnName)) {
        problems.push(
          `${name}.${columnName}: in database, missing from descriptor`,
        );
      }
    }
    for (const [columnName, expectedCol] of expectedCols) {
      const actualCol = actualCols.get(columnName);
      if (!actualCol) continue;
      const want = describeColumn(expectedCol);
      const got = describeColumn(actualCol);
      if (want !== got) {
        problems.push(`${name}.${columnName}: descriptor ${want}, database ${got}`);
      }
    }

    const expectedChecks = [...(expectedTable.checks ?? [])].sort();
    const actualChecks = [...(actualTable.checks ?? [])].sort();
    for (const check of expectedChecks) {
      if (!actualChecks.includes(check)) {
        problems.push(`${name}: check in descriptor, missing from database — ${check}`);
      }
    }
    for (const check of actualChecks) {
      if (!expectedChecks.includes(check)) {
        problems.push(`${name}: check in database, missing from descriptor — ${check}`);
      }
    }
  }

  return problems.sort();
}
