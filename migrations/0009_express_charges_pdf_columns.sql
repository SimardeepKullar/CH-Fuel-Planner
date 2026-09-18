-- The emailed PDF invoice's Express Codes section carries five text columns
-- the portal CSV export does not have at all:
--
--   DATE, EXP. CODE, AUTH CODE, TRACTOR, TRAILER, DRIVER NAME/ID, CDL,
--   TRIP #, AMOUNT CASHED, FEE, TOTAL, CUR, Payee, NOTES
--
-- Tractor and driver already have columns here (unit_raw, driver_name_raw).
-- Trailer, CDL and trip number did not, so a PDF import was dropping three
-- fields the supplier actually sends. They are blank on every row of the
-- invoices measured so far, which is a reason to keep them nullable — not a
-- reason to discard them.
ALTER TABLE express_charges ADD COLUMN trailer_raw     text;
ALTER TABLE express_charges ADD COLUMN cdl_raw         text;
ALTER TABLE express_charges ADD COLUMN trip_number_raw text;

-- Correction to 0006's reasoning, which is now known to be wrong.
--
-- 0006 dropped NOT NULL from truck_id/unit_raw because invoice 999210
-- appeared to have two express rows with no tractor text. It does not: the
-- fixture those rows came from was assembled by hand and left tractor and
-- driver blank on the two rows §A19's sample table did not happen to list.
-- The real invoice prints a tractor on all six (066/Gurshiv and
-- 044/Mohinder are the two in question).
--
-- The nullability itself stays, for a better reason than the one 0006 gave:
-- the CSV export has no tractor column whatsoever, so every express row
-- imported from a CSV legitimately has a null truck_id and unit_raw. What is
-- genuinely blank on a real PDF invoice is the *driver* — one row of six —
-- and driver_id/driver_name_raw were already nullable for that.
