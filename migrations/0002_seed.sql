-- Seed reference data (T-03): the three §16 truck profiles and the BVD/ULSD
-- product code. Idempotent — re-running this file must not duplicate rows.

-- ─── Truck profiles ──────────────────────────────────────────────────────
-- All system profiles (owner_user_id IS NULL) share the
-- truck_profiles_owner_slug unique index from 0001_init.sql, keyed on
-- (COALESCE(owner_user_id, '00000000-...'::uuid), slug).
--
-- truck_number is the fleet unit number dispatchers actually use to identify
-- a truck (D6; displayed zero-padded to three digits by formatUnitNumber()).
-- The values below are PLACEHOLDERS pending the real fleet roster — same
-- caveat as the sourced-average MPG figures below (§21 Q4): correct both
-- with a one-line UPDATE once the real numbers are known.

INSERT INTO truck_profiles
  (slug, display_name, truck_number, is_system, tank_gallons, avg_mpg,
   reserve_fraction, max_leg_miles, min_leg_miles,
   gross_weight_kg, height_cm, width_cm, length_cm, axle_count)
VALUES
  ('volvo-vnl-300', 'Volvo VNL 300 — day cab, regional', 22, true,
   150, 6.5, 0.150, 500, 300, NULL, NULL, NULL, NULL, NULL),
  ('volvo-vnl-760', 'Volvo VNL 760 — sleeper, standard haul', 56, true,
   200, 7.5, 0.150, 500, 300, NULL, NULL, NULL, NULL, NULL),
  ('volvo-vnl-860', 'Volvo VNL 860 — dual tank, long haul', 91, true,
   250, 7.2, 0.150, 500, 300, 36287, 411, 259, 2250, 5)
ON CONFLICT (COALESCE(owner_user_id, '00000000-0000-0000-0000-000000000000'::uuid), slug)
DO NOTHING;

-- ─── Product code ────────────────────────────────────────────────────────
-- A tripwire, not a lookup: its job is to fail an unmapped raw code at
-- ingest, never to enrich or default-map one (§22.4).

INSERT INTO product_codes (supplier, raw_code, product_type, mapped_by, notes)
VALUES ('BVD', 'ULSD', 'highway_diesel', 'seed', 'Confirmed from 2026-08-22 sheet')
ON CONFLICT (supplier, raw_code) DO NOTHING;
