-- Actuals schema (T-25): the backward-looking half of the merged app. Additive
-- to 0001_init.sql / 0002_seed.sql, which have applied and are never edited
-- (A16). See PROJECT-SCOPE-v2.md §A11 for the target design this mirrors.

-- Needed for card_assignments' EXCLUDE constraint below: it compares card_id
-- with '=' inside a GiST index, which plain btree-only equality can't do.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ─── Reference layer (shared by both halves) ────────────────────────────

CREATE TABLE drivers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  status       text NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','inactive')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Invoice driver names are free text (A6.6); this is the join back to a
-- driver record. alias_normalized is the primary key rather than a surrogate
-- id — it is the natural key a lookup is keyed on, same reasoning as
-- product_codes (§12).
CREATE TABLE driver_aliases (
  alias_normalized text PRIMARY KEY,
  driver_id        uuid NOT NULL REFERENCES drivers(id),
  source           text NOT NULL,
  confirmed_at     timestamptz
);

-- Reconciles v1's truck_profiles.truck_number placeholder with the real
-- fleet roster (A16). unit_number is text, never integer: '072' and '1012'
-- coexist and the leading zero is meaningful (D6).
CREATE TABLE trucks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_number       text NOT NULL UNIQUE,
  truck_profile_id  uuid REFERENCES truck_profiles(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE fuel_cards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_number text NOT NULL UNIQUE,
  supplier    text NOT NULL DEFAULT 'BVD',
  status      text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','inactive')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Effective-dated: a reassignment must not retroactively change how past
-- transactions resolve. effective_to = NULL means "current". The EXCLUDE
-- constraint is the overlap guard — one card cannot have two assignments
-- whose date ranges intersect, enforced by the database, not application code.
CREATE TABLE card_assignments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id        uuid NOT NULL REFERENCES fuel_cards(id),
  truck_id       uuid NOT NULL REFERENCES trucks(id),
  driver_id      uuid NOT NULL REFERENCES drivers(id),
  effective_from date NOT NULL,
  effective_to   date,
  created_at     timestamptz NOT NULL DEFAULT now(),

  CHECK (effective_to IS NULL OR effective_to >= effective_from),
  EXCLUDE USING gist (
    card_id WITH =,
    daterange(effective_from, effective_to, '[]') WITH &&
  )
);

CREATE INDEX card_assignments_card ON card_assignments (card_id, effective_from);

-- ─── Invoice layer ───────────────────────────────────────────────────────

-- invoice_number and file_sha256 catch different mistakes: the hash catches
-- the same file twice, the number catches a *different* file claiming an
-- invoice already imported — a corrected re-send, which needs a human
-- decision rather than a silent second row (A11).
CREATE TABLE invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  text NOT NULL UNIQUE,
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  invoice_date    date NOT NULL,
  due_date        date NOT NULL,
  grand_total_usd numeric(12,2) NOT NULL,
  status          text NOT NULL
                    CHECK (status IN ('quarantined','imported')),
  file_sha256     char(64) NOT NULL UNIQUE,
  imported_at     timestamptz NOT NULL DEFAULT now()
);

-- The reconciliation target: parsed rows sum to the printed grand total per
-- product code (A8.2).
CREATE TABLE invoice_totals (
  invoice_id   uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_code text NOT NULL,
  gallons      numeric(10,2) NOT NULL,
  amount_usd   numeric(12,2) NOT NULL,
  PRIMARY KEY (invoice_id, product_code)
);

-- One row per base auth code (a "fuel stop"); the product lines that make up
-- its total live in fuel_stop_lines. unit_raw / driver_name_raw are what the
-- driver actually entered; truck_id / driver_id are resolved from the card
-- assignment and may be null when resolution fails (T-29).
CREATE TABLE fuel_stops (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  base_auth_code  text NOT NULL,
  occurred_at     timestamptz NOT NULL,
  card_id         uuid NOT NULL REFERENCES fuel_cards(id),
  truck_id        uuid REFERENCES trucks(id),
  driver_id       uuid REFERENCES drivers(id),
  unit_raw        text NOT NULL,
  driver_name_raw text NOT NULL,
  station_id      uuid REFERENCES stations(id),
  total_usd       numeric(12,2) NOT NULL,
  receipt_status  text NOT NULL DEFAULT 'pending'
                    CHECK (receipt_status IN ('pending','confirmed','missing')),

  UNIQUE (invoice_id, base_auth_code)
);

-- billed_usd_per_gal is numeric(9,4): 4dp must survive a round trip
-- (5.2395 in, 5.2395 out, never rounded to 5.24). Never derive the stop total
-- by summing only diesel — total_usd on fuel_stops is the printed figure.
CREATE TABLE fuel_stop_lines (
  id                   bigserial PRIMARY KEY,
  fuel_stop_id         uuid NOT NULL REFERENCES fuel_stops(id) ON DELETE CASCADE,
  product_code         text NOT NULL,
  gallons              numeric(8,2) NOT NULL,
  retail_usd_per_gal   numeric(9,4) NOT NULL,
  billed_usd_per_gal   numeric(9,4) NOT NULL,
  amount_usd           numeric(12,2) NOT NULL,

  UNIQUE (fuel_stop_id, product_code)
);

-- Separate section on the invoice, different shape from fuel stops. driver_id
-- is nullable — the blank-name row in A19 is real data, not a defect.
CREATE TABLE express_charges (
  id              bigserial PRIMARY KEY,
  invoice_id      uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  express_code    text NOT NULL,
  occurred_at     timestamptz NOT NULL,
  truck_id        uuid NOT NULL REFERENCES trucks(id),
  unit_raw        text NOT NULL,
  driver_id       uuid REFERENCES drivers(id),
  driver_name_raw text,
  amount_usd      numeric(12,2) NOT NULL,
  fee_usd         numeric(12,2) NOT NULL DEFAULT 3.00,
  total_usd       numeric(12,2) NOT NULL,
  payee           text,
  note            text,
  category        text,
  match_status    text NOT NULL DEFAULT 'unmatched'
                    CHECK (match_status IN ('matched','unmatched'))
);

-- Mirrors v1's import_rejections. Written on quarantine (D12); an invoice row
-- with rejections has zero child rows in fuel_stops/express_charges.
CREATE TABLE invoice_rejections (
  id          bigserial PRIMARY KEY,
  invoice_id  uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  auth_code   text,
  code        text NOT NULL,
  message     text NOT NULL
);

-- ─── Write-side and analysis ─────────────────────────────────────────────

-- Append-only: a stop's receipt status derives from the latest row here,
-- which is what makes the queue auditable — who checked it and when (A8.4).
-- Never updated or deleted, only inserted.
CREATE TABLE receipt_checks (
  id           bigserial PRIMARY KEY,
  fuel_stop_id uuid NOT NULL REFERENCES fuel_stops(id) ON DELETE CASCADE,
  checked_by   uuid NOT NULL REFERENCES users(id),
  checked_at   timestamptz NOT NULL DEFAULT now(),
  outcome      text NOT NULL CHECK (outcome IN ('confirmed','missing'))
);

-- Keyed on (rule, subject_type, subject_id) so a re-run updates rather than
-- duplicates (application code upserts against this key). Two severity
-- levels at most (A10) — do not add a third.
CREATE TABLE anomalies (
  id           bigserial PRIMARY KEY,
  subject_type text NOT NULL,
  subject_id   uuid NOT NULL,
  rule         text NOT NULL,
  severity     text NOT NULL CHECK (severity IN ('amber','red')),
  detail       jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at  timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz,

  UNIQUE (rule, subject_type, subject_id)
);

-- Editable in Settings (A8.11); thresholds are data, never code constants
-- (D16). One row per rule; config shape is rule-specific.
CREATE TABLE anomaly_thresholds (
  rule       text PRIMARY KEY,
  config     jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Either side may be null — that is how a skipped recommendation and an
-- unplanned stop are represented (A14) — but not both, which would be a
-- match to nothing.
CREATE TABLE plan_actual_matches (
  id           bigserial PRIMARY KEY,
  plan_id      uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  plan_stop_id bigint REFERENCES plan_stops(id),
  fuel_stop_id uuid REFERENCES fuel_stops(id),
  kind         text NOT NULL
                 CHECK (kind IN ('matched','skipped_recommendation','unplanned_stop')),
  delta_usd    numeric(12,2),

  CHECK (plan_stop_id IS NOT NULL OR fuel_stop_id IS NOT NULL)
);
