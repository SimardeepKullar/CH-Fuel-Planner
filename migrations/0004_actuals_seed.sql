-- Seed the reference layer (T-25 step 25.4): the 27 cards, 27 units and 27
-- drivers from PROJECT-SCOPE-v2.md §A19, plus one current card_assignments
-- row per card. Idempotent — re-running this file must not duplicate rows.
--
-- The driver/card/unit pairing below is not arbitrary: card 2956373 must
-- resolve to truck 072, because §A10's "entered unit ≠ assigned truck"
-- anomaly example and T-29's own test both assert exactly that pair. The
-- other three sample stops in §A19 (ADITYA/2957082, AMRIT DHILLION/2956787,
-- LOVEPREET SINGH/2956381) are honoured the same way; §A19 does not name a
-- truck for those three, so any unused unit is a correct pairing. The
-- remaining 23 rows pair the three lists in the order §A19 lists them —
-- plausible, not verified, same caveat as v1's placeholder truck_number
-- values (§21 Q4).

-- ─── Drivers ──────────────────────────────────────────────────────────────
-- No unique constraint on display_name (two real drivers could share a
-- name), so idempotency is a NOT EXISTS guard rather than ON CONFLICT.

INSERT INTO drivers (display_name)
SELECT v.display_name FROM (VALUES
  ('NAVJOT'), ('ADITYA'), ('DHNESH KUMAR'), ('JATINDER'), ('RAVINDER'),
  ('AMRIT DHILLION'), ('RAJVEER RANA'), ('HARINDER GREWAL'), ('RAJVEER GILL'),
  ('AMRINDER BATH'), ('NARINDER NINDA'), ('LOVEPREET SINGH'), ('NARESH KUMAR'),
  ('TARSEM SINGH'), ('HARPAL SUMRA'), ('DHARMINDER'), ('KULWANT SINGH BAL'),
  ('JASWINDER'), ('GURDEEP SINGH'), ('AMRITPAL SIDHU'), ('CHARJIT SINGH'),
  ('GURJIT SINGH'), ('JUGRAJ SINGH SAMRA'), ('GURWINDER D'), ('SIMRAN'),
  ('MOHINDER'), ('PARVINDER')
) AS v(display_name)
WHERE NOT EXISTS (SELECT 1 FROM drivers d WHERE d.display_name = v.display_name);

-- ─── Fuel cards ───────────────────────────────────────────────────────────

INSERT INTO fuel_cards (card_number)
VALUES
  ('2955805'), ('2955961'), ('2956043'), ('2956290'), ('2956373'),
  ('2956381'), ('2956407'), ('2956639'), ('2956670'), ('2956696'),
  ('2956704'), ('2956787'), ('2956811'), ('2956894'), ('2956936'),
  ('2956951'), ('2956985'), ('2957033'), ('2957082'), ('2957124'),
  ('2957140'), ('2957165'), ('2957181'), ('2957199'), ('2957215'),
  ('2957322'), ('2957447')
ON CONFLICT (card_number) DO NOTHING;

-- ─── Trucks (fleet units) ───────────────────────────────────────────────

INSERT INTO trucks (unit_number)
VALUES
  ('031'), ('039'), ('041'), ('044'), ('047'), ('050'), ('051'), ('052'),
  ('057'), ('061'), ('063'), ('064'), ('065'), ('066'), ('069'), ('070'),
  ('071'), ('072'), ('073'), ('101'), ('1012'), ('1013'), ('1016'), ('1017'),
  ('1019'), ('1022'), ('1023')
ON CONFLICT (unit_number) DO NOTHING;

-- ─── Card assignments ─────────────────────────────────────────────────────
-- One current assignment per card, effective from well before the earliest
-- invoice date on disk so the §A19 sample stops resolve against it.

INSERT INTO card_assignments (card_id, truck_id, driver_id, effective_from, effective_to)
SELECT fc.id, t.id, d.id, '2026-01-01'::date, NULL
FROM (VALUES
  ('2956373', '072',  'NAVJOT'),
  ('2957082', '031',  'ADITYA'),
  ('2956787', '039',  'AMRIT DHILLION'),
  ('2956381', '041',  'LOVEPREET SINGH'),
  ('2955805', '044',  'DHNESH KUMAR'),
  ('2955961', '047',  'JATINDER'),
  ('2956043', '050',  'RAVINDER'),
  ('2956290', '051',  'RAJVEER RANA'),
  ('2956407', '052',  'HARINDER GREWAL'),
  ('2956639', '057',  'RAJVEER GILL'),
  ('2956670', '061',  'AMRINDER BATH'),
  ('2956696', '063',  'NARINDER NINDA'),
  ('2956704', '064',  'NARESH KUMAR'),
  ('2956811', '065',  'TARSEM SINGH'),
  ('2956894', '066',  'HARPAL SUMRA'),
  ('2956936', '069',  'DHARMINDER'),
  ('2956951', '070',  'KULWANT SINGH BAL'),
  ('2956985', '071',  'JASWINDER'),
  ('2957033', '073',  'GURDEEP SINGH'),
  ('2957124', '101',  'AMRITPAL SIDHU'),
  ('2957140', '1012', 'CHARJIT SINGH'),
  ('2957165', '1013', 'GURJIT SINGH'),
  ('2957181', '1016', 'JUGRAJ SINGH SAMRA'),
  ('2957199', '1017', 'GURWINDER D'),
  ('2957215', '1019', 'SIMRAN'),
  ('2957322', '1022', 'MOHINDER'),
  ('2957447', '1023', 'PARVINDER')
) AS pairing(card_number, unit_number, display_name)
JOIN fuel_cards fc ON fc.card_number = pairing.card_number
JOIN trucks t ON t.unit_number = pairing.unit_number
JOIN drivers d ON d.display_name = pairing.display_name
ON CONFLICT DO NOTHING;
