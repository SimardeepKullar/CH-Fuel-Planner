CREATE EXTENSION IF NOT EXISTS postgis;

-- ─── Reference ───────────────────────────────────────────────────────────

CREATE TABLE place_centroids (
  state_usps       char(2) NOT NULL,
  name_normalized  text    NOT NULL,
  name_raw         text    NOT NULL,
  geoid            text,
  geom             geography(Point,4326) NOT NULL,
  land_area_sqmi   numeric(10,4),
  uncertainty_m    numeric(10,1) NOT NULL,
  source           text NOT NULL,
  PRIMARY KEY (state_usps, name_normalized)
);

CREATE TABLE product_codes (
  supplier      text NOT NULL,
  raw_code      text NOT NULL,
  product_type  text NOT NULL
    CHECK (product_type IN ('highway_diesel','off_road_diesel','gasoline','def','other')),
  mapped_by     text NOT NULL,
  mapped_at     timestamptz NOT NULL DEFAULT now(),
  notes         text,
  PRIMARY KEY (supplier, raw_code)
);

-- ─── Users and locations ─────────────────────────────────────────────────

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  display_name  text NOT NULL,
  role          text NOT NULL DEFAULT 'dispatcher'
                  CHECK (role IN ('dispatcher','driver','admin')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE saved_locations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label          text,
  address_raw    text NOT NULL,
  address_norm   text NOT NULL UNIQUE,
  geom           geography(Point,4326) NOT NULL,
  geocode_source text NOT NULL,
  geocoded_at    timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,     -- provider geocodes: 30-day cap
  use_count      integer NOT NULL DEFAULT 0
);

-- ─── Truck profiles ──────────────────────────────────────────────────────

CREATE TABLE truck_profiles (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 text NOT NULL,
  display_name         text NOT NULL,
  truck_number         integer UNIQUE,          -- fleet unit number, if assigned
  owner_user_id        uuid REFERENCES users(id),
  is_system            boolean NOT NULL DEFAULT false,
  is_active            boolean NOT NULL DEFAULT true,

  -- fuel model (§5)
  tank_gallons         numeric(6,1) NOT NULL CHECK (tank_gallons > 0),
  avg_mpg              numeric(4,2) NOT NULL CHECK (avg_mpg > 0),
  reserve_fraction     numeric(4,3) NOT NULL DEFAULT 0.150
                         CHECK (reserve_fraction >= 0 AND reserve_fraction < 0.5),
  max_leg_miles        numeric(6,1) NOT NULL DEFAULT 500,
  min_leg_miles        numeric(6,1) NOT NULL DEFAULT 300,
  max_gallons_per_fill numeric(6,1),

  -- physical spec → routing provider
  gross_weight_kg      integer,
  height_cm            integer,
  width_cm             integer,
  length_cm            integer,
  axle_count           smallint,
  trailer_count        smallint,
  hazmat_class         text,

  -- cost model
  cost_per_mile_usd    numeric(6,3) NOT NULL DEFAULT 0.000,
  fixed_stop_minutes   integer      NOT NULL DEFAULT 20,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  CHECK (min_leg_miles <= max_leg_miles)
);

CREATE UNIQUE INDEX truck_profiles_owner_slug ON truck_profiles
  (COALESCE(owner_user_id,'00000000-0000-0000-0000-000000000000'::uuid), slug);

-- ─── Stations ────────────────────────────────────────────────────────────

CREATE TABLE stations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier            text NOT NULL,
  site_ref            text NOT NULL,        -- BVD's SITE
  name_raw            text NOT NULL,        -- "LOVES #368"
  brand_normalized    text,                 -- "LOVES"
  store_number        integer,              -- 368 — the operator/OSM join key
  city_raw            text NOT NULL,
  city_normalized     text NOT NULL,
  state_usps          char(2) NOT NULL,
  country             char(2) NOT NULL DEFAULT 'US',

  geom                geography(Point,4326),
  resolution          text NOT NULL DEFAULT 'unresolved'
                        CHECK (resolution IN ('exact','city','unresolved')),
  uncertainty_m       numeric(10,1),
  resolution_source   text,
  resolved_at         timestamptz,

  truck_accessible    text NOT NULL DEFAULT 'unverified'
                        CHECK (truck_accessible IN ('operator_verified','osm_verified',
                                                    'unverified','excluded')),
  osm_id              text,
  osm_tags            jsonb,
  operator_attrs      jsonb,                -- StoreType, ParkingSpaces, DEFLanes.
                                            -- NEVER prices — see §17.1.
  max_gallons_per_txn numeric(6,1),

  first_seen_at       timestamptz NOT NULL DEFAULT now(),
  last_seen_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (supplier, site_ref)
);

CREATE INDEX stations_geom_gix   ON stations USING GIST (geom);
CREATE INDEX stations_resolution ON stations (resolution) WHERE resolution <> 'unresolved';
CREATE INDEX stations_store_num  ON stations (brand_normalized, store_number);

CREATE TABLE station_geocode_candidates (
  id            bigserial PRIMARY KEY,
  station_id    uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  rank          smallint NOT NULL,
  geom          geography(Point,4326) NOT NULL,
  source        text NOT NULL,
  score         numeric(5,4),
  uncertainty_m numeric(10,1),
  raw           jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ─── Imports and prices ──────────────────────────────────────────────────

CREATE TABLE import_batches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label        text,
  file_count   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE price_imports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        uuid REFERENCES import_batches(id),
  supplier        text NOT NULL,
  company_id      text,
  country         char(2) NOT NULL DEFAULT 'US',
  source_filename text NOT NULL,
  file_sha256     char(64) NOT NULL UNIQUE,   -- the idempotency key
  effective_date  date NOT NULL,              -- from the header. NOT unique — see §12.1
  received_at     timestamptz,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','parsing','validating','completed','failed')),
  rows_read       integer,
  rows_accepted   integer,
  rows_rejected   integer,
  report          jsonb,
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);

CREATE INDEX price_imports_effective ON price_imports (supplier, effective_date);

CREATE TABLE import_rejections (
  id          bigserial PRIMARY KEY,
  import_id   uuid NOT NULL REFERENCES price_imports(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  site_ref    text,
  code        text NOT NULL,
  message     text NOT NULL
);

CREATE TABLE station_prices (
  id             bigserial PRIMARY KEY,
  station_id     uuid   NOT NULL REFERENCES stations(id),
  import_id      uuid   NOT NULL REFERENCES price_imports(id) ON DELETE CASCADE,
  raw_product    text   NOT NULL,
  product_type   text   NOT NULL,   -- denormalised at import; see §15.4

  cost           numeric(8,4),
  federal_tax    numeric(8,4),
  state_tax      numeric(8,4),
  sales_tax      numeric(8,4),
  freight        numeric(8,4),
  other          numeric(8,4),
  total_cost     numeric(8,4),
  retail_price   numeric(8,4),
  your_price     numeric(8,4),   -- = min(total_cost, retail_price); READ, never compute
  savings        numeric(8,4),

  price_pump     numeric(8,4) GENERATED ALWAYS AS (your_price) STORED,
  price_ifta_net numeric(8,4) GENERATED ALWAYS AS
                   (COALESCE(cost,0) + COALESCE(freight,0)
                    + COALESCE(other,0) + COALESCE(federal_tax,0)) STORED,

  valid_on       date NOT NULL,   -- exactly one day. Not a range.

  UNIQUE (station_id, raw_product, valid_on)
);

CREATE INDEX station_prices_lookup ON station_prices (valid_on, product_type, station_id);
