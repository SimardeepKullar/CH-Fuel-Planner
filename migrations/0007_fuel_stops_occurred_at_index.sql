-- T-32: GET /transactions' default sort is newest-first (occurred_at DESC),
-- tie-broken on id so pagination stays stable across pages with no data
-- change in between. The index's column order matches that ORDER BY exactly
-- so the planner can walk it directly instead of sorting the result.
--
-- A bare CREATE INDEX registers no pg_constraint row, so it is invisible to
-- backend/src/db/schema.ts's drift check (see that file's comment on
-- fuel_cards_one_active_per_driver) — no descriptor change needed here.
CREATE INDEX fuel_stops_occurred_at_id ON fuel_stops (occurred_at DESC, id);
