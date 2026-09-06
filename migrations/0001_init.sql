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
