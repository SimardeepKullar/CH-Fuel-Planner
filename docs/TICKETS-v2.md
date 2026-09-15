# Ticket register — CH Fuel App v2 (merged)

**Document version:** 2.0 — 14 September 2026
**Companion:** `BUILD-PLAN-v2.md` decomposes each ticket into steps that can be implemented and tested one at a time.
**Authority:** `PROJECT-SCOPE.md` (v1) + `PROJECT-SCOPE-v2.md` (v2). `§` refers to v1, `A` to v2. Where they disagree, v2 wins and v1 gets edited.
**Repository:** `CH-Fuel-Planner` (single repo, single deployment — D11).

---

## Kickoff prompt — template for every ticket

Copy, replace `T-NN`, `<title>` and `<slug>`, paste as the first message of a fresh session. One ticket per session, one branch per ticket (D9).

```
Ticket T-NN · <title>

Read, in order:
  HANDOFF-PROMPT.md            — what this project is and where it stands
  TICKETS-v2.md § T-NN         — goal, files, dependencies, definition of done
  BUILD-PLAN-v2.md § T-NN      — the steps, in dependency order
  the scope sections T-NN cites

Then read the code the first step touches before writing anything.

Branch: ticket/T-NN-<slug>
Work one step at a time. A step is done when its assertions pass.
Gate: npm run verify must be green before the PR.
If the spec and the repository disagree, say so and propose the edit.
```

---

## Ticket index

| ID | Title | Depends on | Phase | State |
|---|---|---|---|---|
| T-01 | Toolchain and workspace skeleton | — | 0 | ✅ merged |
| T-02 | Rewrite the database schema | T-01 | 0 | ✅ merged |
| T-03 | Seed reference data | T-02 | 0 | ✅ merged |
| T-04 | Next.js + TypeScript migration | T-01 | 1 | ✅ merged |
| T-04B | Backend build step and package boundary | T-04 | 1 | ✅ merged |
| T-05 | Auth and login page | T-03, T-04B | 1 | ✅ merged |
| T-06 | Price-sheet ingest service and `npm run ingest` | T-02 | 2 | ✅ merged |
| T-07 | Backfill CLI and the January import | T-06 | 2 | ✅ merged |
| T-08 | Station resolution from the operator export | T-06 | 2 | ✅ merged |
| T-09 | Gazetteer fallback and manual entry | T-03, T-08 | 2 | ✅ merged |
| T-10 | ORS adapter, budget guard, both meters | T-01 | 3 | ✅ merged |
| T-11 | Corridor query | T-09, T-10 | 3 | specified |
| T-12 | Optimiser registry, `dp_v1`, `greedy_v1` | T-01 | 3 | specified |
| T-13 | Validation loop and two-pass relaxation | T-11, T-12 | 3 | specified |
| T-14 | Detour costing | T-10, T-11 | 3 | specified |
| T-15 | Address geocoding and `saved_locations` | T-02, T-10 | 4 | specified |
| T-16 | Plan orchestration, `POST /plans`, `GET /plans/{id}` | T-13, T-14, T-15 | 4 | specified |
| T-17 | Google Maps URL and disclaimers | T-16 | 4 | specified |
| T-18 | Supporting read endpoints | T-16 | 4 | specified · amend per A16 |
| T-19 | `sentToDriver` write path | T-16 | 4 | specified · load-bearing for T-37 |
| T-20 | Route geometry retention job | — | 4 | ⛔ deferred (§17) |
| T-21 | Frontend API client, retire the mock | T-16, T-18 | 5 | specified · amend per D15 |
| T-22 | MapLibre map | T-21 | 5 | specified |
| T-23 | Missing UI states | T-21 | 5 | specified · amend per D15 |
| T-24 | Deployment — Vercel + Neon | T-21 | 6 | specified · amend per A16 |
| **T-25** | **Actuals schema migration** | T-02 | **7** | **new** |
| **T-26** | **Shared reference layer and effective-dated assignments** | T-25 | **7** | **new** |
| **T-27** | **BVD invoice parser — Excel, with PDF fallback** | T-25 | **7** | **new** |
| **T-28** | **Reconciliation and quarantine** | T-27 | **7** | **new** |
| **T-29** | **Raw→resolved resolution at import** | T-26, T-28 | **7** | **new** |
| **T-30** | **Anomaly engine** | T-29 | **7** | **new** |
| **T-31** | **`npm run import-invoice` + the 999210 import** | T-28, T-29, T-30 | **7** | **new** |
| **T-32** | **Transactions and transaction-detail endpoints** | T-31 | **8** | **new** |
| **T-33** | **Overview endpoint** | T-31 | **8** | **new** |
| **T-34** | **Invoice import endpoints and history** | T-31 | **8** | **new** |
| **T-35** | **Receipt queue endpoints** | T-31 | **8** | **new** |
| **T-36** | **Other-charges endpoints** | T-31 | **8** | **new** |
| **T-37** | **Analysis endpoints — drivers, trucks, stations** | T-31 | **8** | **new** |
| **T-38** | **Plan vs Actual matching and endpoints** | T-19, T-31 | **8** | **new** |
| **T-39** | **App shell — sidebar IA and invoice-period selector** | T-21 | **9** | **new** |
| **T-40** | **Transactions screen** | T-32, T-39 | **9** | **new** |
| **T-41** | **Overview screen** | T-33, T-39 | **9** | **new** |
| **T-42** | **Import screens, including quarantine** | T-34, T-39 | **9** | **new** |
| **T-43** | **Receipt Queue screen — desktop and phone** | T-35, T-39 | **9** | **new** |
| **T-44** | **Other Charges screen** | T-36, T-39 | **9** | **new** |
| **T-45** | **Drivers, Trucks, Stations screens** | T-37, T-22, T-39 | **9** | **new** |
| **T-46** | **Plan vs Actual screen — live and backtest** | T-38, T-39 | **9** | **new** |
| **T-47** | **Settings — assignments, aliases, thresholds** | T-26, T-30, T-39 | **9** | **new** |
| **T-48** | **Historical invoice backfill** | T-31 | **10** | **new** |
| **T-49** | **Deploy v2** | T-24, T-40…T-47 | **10** | **new** |

**Critical path:** T-25 → T-27 → T-28 → T-29 → T-31 → T-32 → T-40. Everything else in Phase 8/9 hangs off T-31 and can run in parallel once it lands. T-38/T-46 additionally need the v1 plan path (T-11…T-19) finished.

---

## How to read this

Each ticket states a **goal**, the **files** it touches (new vs existing, and for existing files what specifically changes), its **dependencies**, and a **definition of done**. Tickets are sized to one branch and one session. A ticket is done when its DoD holds, not when the code looks finished.

---

# Phase 7 · Actuals data in

## T-25 · Actuals schema migration

**Priority 25. Blocks all of Phase 7–9.**

**Goal.** Every table in A11 exists, keyed and constrained, with the descriptor and drift test extended to cover them.

**Files.** New: `migrations/0003_actuals.sql`, `migrations/0004_actuals_seed.sql`. Modified: `backend/src/db/schema.ts` (descriptor), `backend/src/db/types.ts`. **Left alone:** `0001_init.sql` — it has applied; additions are new migrations, never edits (A16).

**Dependencies.** T-02.

**Definition of done.**
- [ ] `db:reset` applies all four migrations; a second `db:migrate` is a no-op.
- [ ] `fuel_stop_lines.billed_usd_per_gal` is `numeric(9,4)` — 4dp survives a round trip (`5.2395` in, `5.2395` out, not `5.24`).
- [ ] `invoices.file_sha256` and `invoices.invoice_number` are both unique; the same bytes twice are refused.
- [ ] `truck_assignments` rejects overlapping effective ranges for one driver.
- [ ] `fuel_cards` rejects a second active card for one driver (D19), but allows a replaced (inactive) card alongside a new active one.
- [ ] Deleting an invoice cascades to `fuel_stops`, `fuel_stop_lines` and `express_charges`; deleting a `station` referenced by a stop is **refused**.
- [ ] `anomalies.severity` rejects anything outside two values.
- [ ] The drift test covers every new table and **fails** on an injected wrong nullability.
- [ ] `0004_actuals_seed.sql` seeds the 27 cards, 27 units and 27 drivers from A19, each card carrying its driver and each driver one initial truck assignment.

---

## T-26 · Shared reference layer and effective-dated assignments

**Priority 26.**

**Goal.** One truck, one driver, one card, one station — usable by both halves — with assignment history that does not rewrite the past.

**Files.** New: `backend/src/catalog/trucks.ts`, `drivers.ts`, `cards.ts`, `assignments.ts` + tests. Modified: `backend/src/catalog/truckProfiles.ts` (T-03/T-18) — profiles stop pretending to be the roster (A16).

**Dependencies.** T-25.

**Definition of done.**
- [ ] `resolveAssignment(cardId, at)` returns the driver (`fuel_cards.driver_id`, permanent — D19) and the truck in force **at that instant** (`truck_assignments`), not the current one.
- [ ] Reassigning a driver's truck tomorrow does not change what yesterday's stop resolves to — asserted with a stop either side of the boundary.
- [ ] `formatUnitNumber` (T-01) is the only place unit numbers are validated for display (D18); `1012` is not truncated.
- [ ] Alias lookup is case- and whitespace-insensitive and shares its normaliser with `cityNormalize.ts`'s conventions (`Mc`/`Mt`/`St`, title casing).
- [ ] An unmatched driver name returns **unmatched**, never a best guess.
- [ ] A truck with no profile still resolves (profiles are optional metadata, not the key).

---

## T-27 · BVD invoice parser — Excel, with PDF fallback

**Priority 27.**

**Goal.** Bytes → header metadata + product lines + express rows, grouped into stops by base auth code. Pure, no I/O.

**Files.** New: `backend/src/invoice/parseInvoiceXlsx.ts`, `parseInvoicePdf.ts`, `groupByAuthCode.ts` + tests, `backend/test/fixtures/invoices/999210.xlsx`.

**Dependencies.** T-25.

**Definition of done.**
- [ ] Invoice 999210 parses to its header (number, period 2026-09-03→09, invoice date 09-10, due 09-11) and its printed per-code totals.
- [ ] **~60 stops** from the full line set, grouped by base auth code; auth `A252014353` groups the TA and DF lines and no others.
- [ ] Per-gallon prices parse at **4dp** with no rounding (`5.2395`, `5.9890`, `4.8890`).
- [ ] An unmapped product code **fails its row** with a reason code; it is never default-mapped to diesel (v1 §11.1's tripwire, reused).
- [ ] Express rows parse separately, including the row with **no driver name** and the flat `$3.00` fee on every one.
- [ ] `parseInvoicePdf` produces the same shape for the same invoice, and is only reached when the Excel path is absent (D13).
- [ ] The parser prints nothing and performs no I/O — asserted by a console spy.

---

## T-28 · Reconciliation and quarantine

**Priority 28. The ticket that protects the database.**

**Goal.** Parsed rows either balance against the printed totals and get written, or the invoice is quarantined with a report and **nothing is written**.

**Files.** New: `backend/src/invoice/reconcile.ts`, `backend/src/invoice/importInvoice.ts`, `backend/src/invoice/report.ts` + tests.

**Dependencies.** T-27.

**Definition of done.**
- [ ] 999210 balances: TA $48,450.68 + DF $845.40 + S $90.50 + Express $1,543.13 = **$50,929.71**, and gallons reconcile per code (8,733.11 TA / 174.43 DF).
- [ ] A fixture with one cent of drift in DF **quarantines**: `invoices.status='quarantined'`, zero `fuel_stops`, zero `fuel_stop_lines`, zero `express_charges`, and an `invoice_rejections` row naming the code, the expected figure, the parsed figure and the offending lines.
- [ ] The imbalance report is **per product code**, not a single total — a compensating pair of errors must not pass.
- [ ] Re-uploading the same bytes returns the existing invoice unchanged and writes nothing (`file_sha256`).
- [ ] Re-uploading a **different** file for an invoice number already imported is refused with a distinct reason from the duplicate case.
- [ ] Promotion is one transaction: a failure mid-write leaves no partial invoice.
- [ ] `importInvoice` performs no HTTP, reads no argv, prints nothing.

---

## T-29 · Raw→resolved resolution at import

**Priority 29.**

**Goal.** Every stop carries a resolved truck and driver **and** the raw text that produced them, with disagreement recorded rather than smoothed over (D14, A9).

**Files.** New: `backend/src/resolve/resolveDriver.ts`, `resolveTruck.ts`, `resolveStation.ts` + tests. Modified: `backend/src/invoice/importInvoice.ts`.

**Dependencies.** T-26, T-28.

**Definition of done.**
- [ ] Truck resolves from `card_id` → `driver_id` (`fuel_cards`) + `occurred_at` via `truck_assignments` — **never** from the entered unit text.
- [ ] `unit_raw` and `driver_name_raw` are stored verbatim and never overwritten.
- [ ] The real cases resolve as specified: `0` entered on card 2956373 → truck **072**, flagged disagreement; `072` entered on two different cards the same day → two different trucks, no flag; `1012` entered by two drivers → resolved per card.
- [ ] Station text (`LOVES #294`) resolves through **T-08's existing store-number parser** — asserted by import, not reimplementation.
- [ ] A station that does not resolve leaves the stop with a null station and a named exclusion; it is never planned or reported against a guessed site.
- [ ] Express-charge driver names resolve through the alias table and land `matchStatus='unmatched'` when they miss, including the blank-name row.
- [ ] Re-resolving is an explicit job, not a side effect of reading.

---

## T-30 · Anomaly engine

**Priority 30.**

**Goal.** A10's six rules as pure functions over stored stops, two severities, thresholds from data.

**Files.** New: `backend/src/anomaly/rules/subGallon.ts`, `unitMismatch.ts`, `tooClose.ts`, `priceAbovePublished.ts`, `defRatio.ts`, `chargesNoFuel.ts`, `backend/src/anomaly/runAnomalies.ts` + tests.

**Dependencies.** T-29.

**Definition of done.**
- [ ] Each rule is pure, takes its threshold as an argument, and has its own test with a real 999210 case: 0.04 gal at LOVES #277; the `0`/072 mismatch; the 78-minute pair at LOVES #275; the 8.8% DEF ratio; the card carrying only a $15.25 scale charge.
- [ ] **Exactly two severities.** A third value is rejected by the schema and by type.
- [ ] 999210 yields the expected flag count and no false positives on the other stops — asserted as a count, not a spot check.
- [ ] `priceAbovePublished` degrades cleanly when no published price file exists for the date (A18 Q5): it reports *not computable*, not *no anomaly*.
- [ ] Dismissing an anomaly is recorded (`dismissed_at`), not deleted.
- [ ] Re-running the engine is idempotent — no duplicate rows for the same `(rule, subject)`.

---

## T-31 · `npm run import-invoice` + the 999210 import

**Priority 31. The end of Phase 7.**

**Goal.** One command imports a real invoice end to end, and the database holds a week of real actuals.

**Files.** New: `backend/src/cli/importInvoice.ts`. Modified: root `package.json`.

**Dependencies.** T-28, T-29, T-30.

**Definition of done.**
- [ ] `npm run import-invoice -- ./data/bvd-invoices/999210.xlsx` prints the report and exits 0.
- [ ] Database holds: 1 invoice, ~60 `fuel_stops`, every product line, the express rows, resolved trucks/drivers, and the anomaly rows from T-30.
- [ ] `Σ fuel_stop_lines.amount_usd + Σ express_charges.total_usd = 50929.71` — asserted in SQL, not in application code.
- [ ] A quarantined file exits **non-zero** with the imbalance on stderr and writes no child rows.
- [ ] A duplicate exits 0 and says so.
- [ ] The CLI contains argv and stdout only.

---

# Phase 8 · Actuals API

Every ticket here: numbers not strings, nulls preserved, `currency: "USD"` on money, resolved fields shipped beside their raw twin (A13), RFC 9457 errors, auth enforced.

## T-32 · Transactions and transaction-detail endpoints

**Priority 32.**

**Goal.** `GET /transactions` and `GET /transactions/{id}` — the highest-traffic surface in the app.

**Files.** New: `backend/src/actuals/transactions.ts`, `backend/src/api/routes/transactions.ts` + tests.

**Dependencies.** T-31.

**Definition of done.**
- [ ] Every A8.3 filter works, including `anomalyOnly` and a real date range; filters compose.
- [ ] One row per stop; `lines[]` returned on request and the **stop total is the sum of all lines**, never diesel alone — asserted against auth `A252014353` at $255.13.
- [ ] Sort is stable and index-backed; `EXPLAIN` shows no sequential scan on `fuel_stops` for the default sort.
- [ ] Pagination is stable across pages with a fixed period.
- [ ] Detail carries raw values, resolution source, receipt status with checker and timestamp, anomaly flags, invoice link, and a plan link when a dispatched plan covered that truck and date.
- [ ] Unknown id → 404 problem+json.

---

## T-33 · Overview endpoint

**Priority 33.**

**Goal.** `GET /overview?period=` returns A8.1 in one call.

**Files.** New: `backend/src/actuals/overview.ts`, `backend/src/api/routes/overview.ts` + tests.

**Dependencies.** T-31.

**Definition of done.**
- [ ] Against 999210 every KPI matches A5 exactly, including `$50,929.71`, `8,733.11 gal`, `$5.55/gal` average billed, `48 of 60` receipts, `3` anomalies.
- [ ] **Average billed price is computed gallons-weighted**, not as a mean of prices — asserted against a fixture where the two differ.
- [ ] Discount is returned but is **not** the primary metric in the payload's own ordering (A6.3, A9).
- [ ] The trend series covers the last N periods and omits nothing silently — a missing period is absent, not zero-filled.
- [ ] Other charges split scale ($90.50) from express ($1,543.13) and surface the fee total separately.

---

## T-34 · Invoice import endpoints and history

**Priority 34.**

**Goal.** `POST /invoices/import`, `GET /invoices`, `GET /invoices/{id}` — the HTTP wrapper over T-28.

**Files.** New: `backend/src/api/routes/invoices.ts` + tests.

**Dependencies.** T-31.

**Definition of done.**
- [ ] A balanced file returns **200 with a write preview** and, on confirm, the imported invoice.
- [ ] An imbalanced file returns **200 with `status: "quarantined"`** and the full imbalance report — *not* a 4xx (D12).
- [ ] A duplicate returns **409 problem+json** distinguishable from the quarantine case by the caller.
- [ ] `GET /invoices` paginates newest-first with number, period, total, status, imported-at.
- [ ] The route contains no parsing or reconciliation logic — it calls T-28.

---

## T-35 · Receipt queue endpoints

**Priority 35.**

**Goal.** A queue that can be worked one item at a time, in batch, and later automated.

**Files.** New: `backend/src/actuals/receipts.ts`, `backend/src/api/routes/receipts.ts` + tests.

**Dependencies.** T-31.

**Definition of done.**
- [ ] `GET /receipt-queue` returns unconfirmed stops with the context A8.5 needs, plus `progress: {done, total}`.
- [ ] `POST /receipt-checks` writes one append-only `receipt_checks` row with `checked_by` and `checked_at`; the stop's status derives from the latest check.
- [ ] Batch confirm for one driver writes one row per stop, in one transaction, and is idempotent.
- [ ] Skip does **not** write a check and does not remove the item from the queue.
- [ ] Queue order is deterministic (D17: an exceptions-first ordering must be expressible without a schema change).
- [ ] A confirmed stop never reappears.

---

## T-36 · Other-charges endpoints

**Priority 36.**

**Goal.** `GET /express-charges` with the quirks intact.

**Files.** New: `backend/src/actuals/otherCharges.ts`, `backend/src/api/routes/expressCharges.ts` + tests.

**Dependencies.** T-31.

**Definition of done.**
- [ ] The blank-driver row (tractor 073, $200.00 + $3.00 = $203.00, "lumper") returns with a null driver and `matchStatus: "unmatched"` — **never** a guessed driver.
- [ ] `rajinder` / `Gurjit` style free text resolves through aliases where it can and is flagged where it cannot.
- [ ] The fee total is a separate field, not folded into the amount.
- [ ] Category and note are returned verbatim.
- [ ] Sum of `total_usd` over the period equals the invoice's printed express total.

---

## T-37 · Analysis endpoints — drivers, trucks, stations

**Priority 37.**

**Goal.** Period rollups and detail series for the three reference entities.

**Files.** New: `backend/src/actuals/drivers.ts`, `trucks.ts`, `stations.ts`, routes + tests.

**Dependencies.** T-31.

**Definition of done.**
- [ ] Driver list returns spend, gallons, gallons-weighted average billed $/gal, receipt compliance %, anomaly count.
- [ ] Driver detail returns their average billed price **against the fleet average** for the same period, favoured stations, and the DEF:diesel gallon ratio.
- [ ] Truck detail returns the assigned card **and the assignment history**, and past stops resolve against the assignment in force then (T-26).
- [ ] `GET /stations/{id}/billed-prices` shows price per site per day and demonstrates the A6.5 finding: five cards at site 25334 on 9/7 and 9/9 all at **5.5208**.
- [ ] A discrepancy field is present and is `null` (not `0`) when no published price file exists (A18 Q5).

---

## T-38 · Plan vs Actual matching and endpoints

**Priority 38. The payoff.**

**Goal.** A14 as a pure matcher plus two endpoints — live and backtest.

**Files.** New: `backend/src/planActual/match.ts`, `backtest.ts`, `backend/src/api/routes/planActual.ts` + tests.

**Dependencies.** T-19 (dispatched flag), T-31.

**Definition of done.**
- [ ] `match()` is pure and matches on truck + date window + station.
- [ ] Only **dispatched** plans are matched — a non-dispatched plan covering the same truck and date produces no matches, asserted.
- [ ] `skipped_recommendation` and `unplanned_stop` are returned as rows, not omissions.
- [ ] `delta_usd` on a matched pair uses actual gallons × (actual billed − planned expected), and the fleet rollup is the sum.
- [ ] The three exclusion classes (split fill, unresolved station text, no archived price file) are **named and counted**, never silently dropped.
- [ ] Backtest re-solves a historical invoice against the archived price file for that date using **`dp_v1` unchanged** — asserted by the optimiser's own tests still requiring no I/O.
- [ ] With zero overlap the endpoint returns a **well-formed empty result with its coverage counts**, not an error and not an empty array with no context.

---

# Phase 9 · Actuals UI

The design file **`CH Fuel App.dc.html`** is the visual authority. It already realises the shell, Transactions and Plan vs Actual, plus the ported Plan and Plans screens. Every screen below reuses A9's two conventions. Desktop-first except where stated.

## T-39 · App shell — sidebar IA and invoice-period selector

**Priority 39. Supersedes the tab bar (D15).**

**Goal.** The shell every Phase 9 screen mounts into.

**Files.** New: `frontend/src/app/(app)/layout.tsx`, `frontend/src/components/Sidebar.tsx`, `TopBar.tsx`, `InvoicePeriodSelector.tsx`. Modified: `page.tsx`, `Header.tsx` (absorbed).

**Dependencies.** T-21.

**Definition of done.**
- [ ] A7's eleven destinations in three groups plus Settings; active state marked; Receipt Queue carries a live pending badge.
- [ ] The period selector defaults to the most recent invoice and governs Actuals and Analysis; **Plan screens ignore it** and show their own price-sheet date.
- [ ] Standing receipt and flag counts appear in the top bar and come from the API, not constants.
- [ ] The v1 Plan and Plans screens mount inside the shell with their v1 behaviour intact.
- [ ] Navigation does not refetch the period on every route change.
- [ ] Sidebar tolerates a fourth group without redesign (A18 Q4).

---

## T-40 · Transactions screen

**Priority 40. Sets the tone for every other table.**

**Goal.** A8.3 at real density, wired to T-32.

**Files.** New: `frontend/src/app/(app)/transactions/page.tsx`, `TransactionsTable.tsx`, `StopExpansion.tsx`, `RawResolved.tsx`, `AnomalyFlag.tsx`, `frontend/src/lib/formatMoney.ts`.

**Dependencies.** T-32, T-39.

**Definition of done.**
- [ ] Columns, filters and grouping per A8.3; every filter round-trips to the query string so a filtered view is linkable.
- [ ] **Billed $/gal is the dominant numeral**; retail muted; discount a subline (A9.1) — asserted by a component test on computed font size, not by eye.
- [ ] `RawResolved` implements all three A9.2 states and is the **only** component that renders raw invoice text anywhere in the app.
- [ ] Gallons 2dp, prices 4dp, money 2dp, right-aligned, tabular figures; a USD marker is present on the money column.
- [ ] Expanding a row shows every product line and an unmissable stop total ($255.13 for `A252014353`).
- [ ] The table scrolls horizontally as one unit — header, rows and totals footer stay aligned; the expansion never overlaps the panel beside it.
- [ ] Keyboard: arrow-key row movement, `enter` to expand, `/` to focus search.
- [ ] Anomaly flags render at two severities only.

---

## T-41 · Overview screen

**Priority 41.**

**Goal.** A8.1 — how last week went, in five seconds.

**Files.** New: `frontend/src/app/(app)/overview/page.tsx`, `KpiCard.tsx`, `BilledPriceTrend.tsx`, `TopSpendByDriver.tsx`, `AnomalyDigest.tsx`.

**Dependencies.** T-33, T-39.

**Definition of done.**
- [ ] KPI cards show the A5 figures with a USD marker; **average billed price is the visually dominant card** and discount is subordinate (A6.3).
- [ ] Trend and bars use Recharts; a period with no data is a gap, not a zero.
- [ ] The anomaly digest links into Transactions with the `anomalyOnly` filter pre-applied.
- [ ] The screen makes exactly **one** API call.
- [ ] Empty state for "no invoice imported yet" is designed, not a spinner forever.

---

## T-42 · Import screens, including quarantine

**Priority 42.**

**Goal.** A8.2's three states, with quarantine as a **full screen**.

**Files.** New: `frontend/src/app/(app)/import/page.tsx`, `Dropzone.tsx`, `ParsingState.tsx`, `ReconciliationPreview.tsx`, `QuarantineScreen.tsx`, `ImportHistory.tsx`.

**Dependencies.** T-34, T-39.

**Definition of done.**
- [ ] Parsing shows file name, progress and row count.
- [ ] The preview shows the **balance check explicitly**, per product code, summing to $50,929.71, with a confirm that writes.
- [ ] Quarantine is a full screen naming the failing code, expected vs parsed, and the offending rows, and states plainly that nothing was written.
- [ ] Duplicate upload renders the designed rejection message, distinct from quarantine.
- [ ] History lists invoice number, period, total, status and imported-at, and a quarantined row can be reopened.
- [ ] A quarantined invoice is reachable from the sidebar without re-uploading the file.

---

## T-43 · Receipt Queue screen — desktop and phone

**Priority 43. The only write-heavy screen.**

**Goal.** A8.5, optimised for speed and built to survive automation.

**Files.** New: `frontend/src/app/(app)/receipt-queue/page.tsx`, `QueueCard.tsx`, `BatchConfirm.tsx`.

**Dependencies.** T-35, T-39.

**Definition of done.**
- [ ] One transaction at a time with enough context to search Samsara (driver, date/time, truck, station, gallons, total).
- [ ] `Y` / `N` / `S` keyboard shortcuts, visible on screen, working without focus gymnastics.
- [ ] Progress reads `12 of 60`.
- [ ] Batch confirm for a driver who uploaded everything, with an explicit count before it writes.
- [ ] **Works on a phone**: hit targets ≥ 44px, one-thumb reach for Y/N, no horizontal scroll at 390px.
- [ ] The layout does not assume every item needs a decision — an exceptions-only queue renders correctly with no code change (D17).
- [ ] An optimistic decision that fails on the server rolls back visibly.

---

## T-44 · Other Charges screen

**Priority 44.**

**Goal.** A8.6, with the quirks visible rather than tidied away.

**Files.** New: `frontend/src/app/(app)/other-charges/page.tsx`, `ExpressTable.tsx`.

**Dependencies.** T-36, T-39.

**Definition of done.**
- [ ] All A8.6 columns; the fee total surfaced separately from the amount total.
- [ ] A row with no driver renders as **unmatched**, using A9.2's raw treatment for the free-text name.
- [ ] Free-text names that did not match a driver are visibly unmatched and offer "add as alias" into Settings.
- [ ] Category filter and date range; totals reconcile to the invoice's express total.

---

## T-45 · Drivers, Trucks, Stations screens

**Priority 45.**

**Goal.** A8.7–A8.9, reusing the v1 map treatment.

**Files.** New: `frontend/src/app/(app)/drivers/[...]`, `trucks/[...]`, `stations/[...]` pages and their list/detail components.

**Dependencies.** T-37, T-22, T-39.

**Definition of done.**
- [ ] Driver and truck lists share one table component with the Transactions formatting rules.
- [ ] Driver detail plots their average billed price against the fleet average and shows the DEF:diesel ratio.
- [ ] Truck detail shows the card assignment **history**, with a note that reassignment changes how past stops resolve.
- [ ] Stations list + map reuse MapLibre and the T-22 layer styling; city-tier stations still draw their uncertainty circle.
- [ ] Station detail shows billed price history per day and a place for a published-price discrepancy that renders "not computable" when there is no file.

---

## T-46 · Plan vs Actual screen — live and backtest

**Priority 46.**

**Goal.** A8.10, both views, and an empty state that will be seen for months.

**Files.** New: `frontend/src/app/(app)/plan-actual/page.tsx`, `LivePerformance.tsx`, `HistoricalBacktest.tsx`, `PvaEmptyState.tsx`.

**Dependencies.** T-38, T-39.

**Definition of done.**
- [ ] One segmented control switches the two views; the design file's layout is followed (KPIs → chart → by-lane/by-truck table + needs-review → flagged deviations).
- [ ] Skipped recommendations and unplanned stops are visible as rows.
- [ ] Coverage is stated on screen ("14 of 60 stops covered by a plan"), never implied.
- [ ] The empty state explains **why** it is empty and what will fill it — asserted with a zero-overlap fixture.
- [ ] Exclusions are listed with their counts.
- [ ] Money left on the table is the headline of the live view; savings is the headline of the backtest.

---

## T-47 · Settings — assignments, aliases, thresholds

**Priority 47.**

**Goal.** A8.11. The data that every resolution and every anomaly depends on.

**Files.** New: `frontend/src/app/(app)/settings/page.tsx`, `AssignmentsTable.tsx`, `AliasList.tsx`, `ThresholdForm.tsx`, `backend/src/api/routes/settings.ts`.

**Dependencies.** T-26, T-30, T-39.

**Definition of done.**
- [ ] Card→truck→driver assignments are editable **with effective dates**, and the UI states that editing does not retroactively re-resolve until the job runs (D14).
- [ ] Alias add/remove, with the unmatched names from T-36 as one-click candidates.
- [ ] Every A10 threshold is editable and takes effect on the next anomaly run.
- [ ] No roles matrix (A2). User management appears only when a second user exists.
- [ ] A re-resolve job can be triggered and reports what changed.

---

# Phase 10 · Ship v2

## T-48 · Historical invoice backfill

**Priority 48.**

**Goal.** Ten years of Gmail invoices in, gaps reported rather than papered over.

**Files.** New: `backend/src/invoice/backfillInvoices.ts`, `backend/src/cli/backfillInvoices.ts`, `backend/src/invoice/invoiceGapReport.ts` + tests.

**Dependencies.** T-31.

**Definition of done.**
- [ ] A directory of invoices imports per-file, one quarantine not sinking the run (mirrors T-07's batch behaviour).
- [ ] Missing weeks are **reported** as gaps, never interpolated.
- [ ] Order-independent: shuffled input produces identical database state.
- [ ] Quarantined historical invoices are queued for review with their reports intact.
- [ ] A shape change in older years is reported as a parse rejection naming the year, answering A18 Q6 with data.

---

## T-49 · Deploy v2

**Priority 49.**

**Goal.** The merged app live.

**Files.** Modified: `vercel.json`, `docs/RUNBOOK.md`, `PROJECT-SCOPE.md` §2 and §19, `PROJECT-SCOPE-v2.md` §A3.

**Dependencies.** T-24, T-40…T-47.

**Definition of done.**
- [ ] A real lane plans and a real invoice imports, both in production.
- [ ] Anonymous API → 401, anonymous page → 307, including `/health`.
- [ ] Migrations `0003`/`0004` apply to Neon; the drift test passes against it.
- [ ] Runbook covers weekly invoice import, quarantine triage, receipt-queue cadence, backfill, and both call meters.
- [ ] **§2 and §A3 describe the repository as it actually is on the day v2 ships** — the failure the v1 rewrite existed to correct must not recur.

---

## Deferred, deliberately

| Item | Why not now | Ref |
|---|---|---|
| Samsara receipt automation | Needs A18 Q3 answered. The queue is already shaped for it (D17). | A8.5 |
| Cost per mile as a headline | Needs odometer data (A18 Q1). Changes the Trucks screen's shape. | A8.8 |
| Currency toggle | Needs A18 Q2. Until then everything is USD and says so. | A6.1 |
| Published-price audit | Needs the BVD price file as a file (A18 Q5). The field exists and returns null. | A10 |
| Gmail poller for invoices | Same seam as v1's price-sheet poller; `importInvoice` does not change. | §20 |
| HERE routing, Canada, multi-stop | Unchanged from v1's deferred list. | §20 |
