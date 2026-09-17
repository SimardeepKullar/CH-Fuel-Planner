-- The real 999210 invoice has Express Codes rows with no tractor/unit text
-- at all — the same real, expected state as A19's blank-driver row, one
-- column over (parseExpressRows.ts already returns `unitRaw: null` for it,
-- never "", and PROJECT-SCOPE-v2.md D20 records the decision). A blank unit
-- has no truck to resolve, so truck_id and unit_raw must follow driver_id's
-- existing nullability on this table rather than forcing every such row —
-- and the whole invoice with it — to quarantine.
ALTER TABLE express_charges ALTER COLUMN truck_id DROP NOT NULL;
ALTER TABLE express_charges ALTER COLUMN unit_raw DROP NOT NULL;
