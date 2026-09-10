/**
 * Row shapes as `pg` actually returns them, table by table.
 *
 * Two driver behaviours drive the type choices and are easy to get wrong:
 *
 * - `numeric` arrives as a **string**, not a number. node-postgres does not
 *   parse it, because a JS number cannot hold every numeric value exactly.
 *   Prices and gallons are therefore strings on the way out; parse at the point
 *   of use, and never assume arithmetic works on them directly.
 * - `bigint` (`int8`) also arrives as a **string**, for the same reason. Every
 *   bigserial id is a string here.
 *
 * `timestamptz` and `date` arrive as `Date`. `geography` arrives as a WKB hex
 * string unless the query wraps it in `ST_AsText`/`ST_AsGeoJSON`.
 */

/** `numeric` — a decimal string such as `"3.1000"`. Never a number. */
export type Numeric = string;

/** `int8`/`bigserial` — a decimal string such as `"42"`. Never a number. */
export type BigIntString = string;

/** `geography` — WKB hex unless the query converts it. */
export type Geography = string;

export type UserRole = "dispatcher" | "driver" | "admin";
export type StationResolution = "exact" | "city" | "unresolved";
export type TruckAccessible =
  | "operator_verified"
  | "osm_verified"
  | "unverified"
  | "excluded";
export type ProductType =
  | "highway_diesel"
  | "off_road_diesel"
  | "gasoline"
  | "def"
  | "other";
export type ImportStatus =
  | "pending"
  | "parsing"
  | "validating"
  | "completed"
  | "failed";
/** §12.2: exactly two. No in-progress state, and no `failed`. */
export type PlanStatus = "completed" | "infeasible";
export type PriceBasis = "pump" | "ifta_net" | "total_cost";
export type StopType = "fuel" | "rest" | "delivery";

export interface PlaceCentroidRow {
  state_usps: string;
  name_normalized: string;
  name_raw: string;
  geoid: string | null;
  geom: Geography;
  land_area_sqmi: Numeric | null;
  uncertainty_m: Numeric;
  source: string;
}

export interface ProductCodeRow {
  supplier: string;
  raw_code: string;
  product_type: ProductType;
  mapped_by: string;
  mapped_at: Date;
  notes: string | null;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: UserRole;
  created_at: Date;
}

export interface SavedLocationRow {
  id: string;
  label: string | null;
  address_raw: string;
  address_norm: string;
  geom: Geography;
  geocode_source: string;
  geocoded_at: Date;
  expires_at: Date;
  use_count: number;
}

export interface TruckProfileRow {
  id: string;
  slug: string;
  display_name: string;
  truck_number: number | null;
  owner_user_id: string | null;
  is_system: boolean;
  is_active: boolean;
  tank_gallons: Numeric;
  avg_mpg: Numeric;
  reserve_fraction: Numeric;
  max_leg_miles: Numeric;
  min_leg_miles: Numeric;
  max_gallons_per_fill: Numeric | null;
  gross_weight_kg: number | null;
  height_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
  axle_count: number | null;
  trailer_count: number | null;
  hazmat_class: string | null;
  cost_per_mile_usd: Numeric;
  fixed_stop_minutes: number;
  created_at: Date;
  updated_at: Date;
}

export interface StationRow {
  id: string;
  supplier: string;
  site_ref: string;
  name_raw: string;
  brand_normalized: string | null;
  store_number: number | null;
  city_raw: string;
  city_normalized: string;
  state_usps: string;
  country: string;
  geom: Geography | null;
  resolution: StationResolution;
  uncertainty_m: Numeric | null;
  resolution_source: string | null;
  resolved_at: Date | null;
  truck_accessible: TruckAccessible;
  osm_id: string | null;
  osm_tags: unknown | null;
  operator_attrs: unknown | null;
  max_gallons_per_txn: Numeric | null;
  first_seen_at: Date;
  last_seen_at: Date;
}

export interface StationGeocodeCandidateRow {
  id: BigIntString;
  station_id: string;
  rank: number;
  geom: Geography;
  source: string;
  score: Numeric | null;
  uncertainty_m: Numeric | null;
  raw: unknown | null;
  created_at: Date;
}

export interface ImportBatchRow {
  id: string;
  label: string | null;
  file_count: number;
  created_at: Date;
  completed_at: Date | null;
}

export interface PriceImportRow {
  id: string;
  batch_id: string | null;
  supplier: string;
  company_id: string | null;
  country: string;
  source_filename: string;
  file_sha256: string;
  effective_date: Date;
  received_at: Date | null;
  status: ImportStatus;
  rows_read: number | null;
  rows_accepted: number | null;
  rows_rejected: number | null;
  report: unknown | null;
  started_at: Date;
  completed_at: Date | null;
}

export interface ImportRejectionRow {
  id: BigIntString;
  import_id: string;
  line_number: number;
  site_ref: string | null;
  code: string;
  message: string;
}

export interface StationPriceRow {
  id: BigIntString;
  station_id: string;
  import_id: string;
  raw_product: string;
  product_type: ProductType;
  cost: Numeric | null;
  federal_tax: Numeric | null;
  state_tax: Numeric | null;
  sales_tax: Numeric | null;
  freight: Numeric | null;
  other: Numeric | null;
  total_cost: Numeric | null;
  retail_price: Numeric | null;
  /** Read from the sheet, never recomputed — the min() cap is BVD's rule. */
  your_price: Numeric | null;
  savings: Numeric | null;
  price_pump: Numeric | null;
  price_ifta_net: Numeric | null;
  valid_on: Date;
}

export interface RouteRow {
  id: string;
  provider: string;
  request_hash: string;
  origin_geom: Geography;
  destination_geom: Geography;
  truck_profile_id: string;
  via_hash: string | null;
  line: Geography | null;
  polyline: string | null;
  legs: unknown | null;
  distance_m: Numeric;
  duration_s: number;
  computed_at: Date;
}

export interface PlanRow {
  id: string;
  created_by: string | null;
  base_route_id: string;
  optimized_route_id: string | null;
  truck_profile_id: string;
  optimizer_strategy: string;
  price_basis: PriceBasis;
  start_fuel_gallons: Numeric;
  min_arrival_gallons: Numeric;
  max_leg_miles: Numeric;
  min_leg_miles: Numeric;
  min_leg_relaxed: boolean;
  max_detour_miles: Numeric;
  driver_cost_per_hour: Numeric;
  fixed_stop_minutes: number;
  /** Null means no cap. Must never be coerced to 0. */
  max_stops: number | null;
  status: PlanStatus;
  infeasible_reason: string | null;
  total_fuel_cost_usd: Numeric | null;
  total_gallons: Numeric | null;
  total_distance_m: Numeric | null;
  total_duration_s: number | null;
  baseline_cost_usd: Numeric | null;
  price_as_of: Date | null;
  google_maps_url: string | null;
  disclaimers: unknown;
  created_at: Date;
  completed_at: Date | null;
  /** Null means computed only; a timestamp means a human sent it to a driver. */
  dispatched_at: Date | null;
}

export interface PlanStopRow {
  id: BigIntString;
  plan_id: string;
  seq: number;
  stop_type: StopType;
  station_id: string | null;
  station_price_id: BigIntString | null;
  offset_along_route_m: Numeric;
  leg_distance_m: Numeric;
  detour_distance_m: Numeric;
  detour_duration_s: number;
  arrival_gallons: Numeric;
  purchase_gallons: Numeric;
  departure_gallons: Numeric;
  /** A literal, not a join — the audit trail must survive (§17). */
  unit_price_usd: Numeric;
  stop_cost_usd: Numeric;
  cum_distance_m: Numeric;
  cum_duration_s: number;
}

export interface ProviderUsageRow {
  provider: string;
  period: Date;
  endpoint: string;
  call_count: number;
}

export interface ProviderQuotaRow {
  provider: string;
  endpoint: string;
  limit_value: number | null;
  remaining: number | null;
  observed_at: Date;
  prev_remaining: number | null;
  prev_observed_at: Date | null;
}

export interface SchemaMigrationRow {
  filename: string;
  applied_at: Date;
}
