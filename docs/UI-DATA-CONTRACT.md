# UI Data Contract — what the frontend needs from the backend

Derived from the **Route Fuel Wireframes** design canvas, as implemented in
`frontend/src/`. Every value in the UI today is a hard-coded placeholder in
`frontend/src/data/trips.js`. This document lists what has to replace each one.

Read it alongside **§14 API design** of `PROJECT-SCOPE.md`. Where the existing
`GET /plans/{id}` contract already covers a field, this document names the field
and moves on. Section 6 is the part that matters most: **what the UI needs that
§14 does not yet return.**

---

## 1. Conventions

**Return numbers, not display strings.** The placeholder data is full of
pre-formatted strings (`"$286.62"`, `"7h 40m"`, `"+4.7 mi of detour · direct
481.8 mi"`) purely so the wireframe renders without a formatter. The API should
return `286.62`, `27600` (seconds), `4.7` and `481.8`, and the frontend will
compose the labels. Nothing in this document should be read as a request for
server-side formatting.

**Units.** Imperial by default, per §14's `?units=`. Every distance below is
miles, every volume gallons, every price USD per gallon, every duration seconds.

**Nulls are meaningful.** Several constraint inputs are explicitly "blank means
no cap" (max detour per stop, max stops). `null` must survive the round trip and
must not be coerced to `0`.

**One array feeds both views.** §14 already establishes that `stops[]` drives the
map markers and the table. The design holds to this — the numbered map pins, the
hover card and the "Recommended order" list are three renderings of the same
array, and must never diverge.

---

## 2. Screen: header and sub-bar

`frontend/src/components/Header.jsx`

| UI element | Placeholder | Needed from backend |
|---|---|---|
| Brand mark | static asset | — |
| Tabs (Plan / Recent / Dev Tools) | client state | — |
| User name + role ("M. Hodson", "Dispatch") | hard-coded | **New.** Session identity: `displayName`, `role`. See §7 open questions — auth is not in §3's v1 scope. |
| Sign out | inert | **New**, same caveat |
| Truck selector | `trucks[]` string array | `GET /trucks` → `[{ id, unitLabel, profileId, ... }]`. Selecting one is a re-plan input, not a display filter. |
| Fuel type tag ("Diesel") | hard-coded | `station_prices.product_type` for the active plan; comes from the plan request |
| Trip tag ("T-1042") | `trip.id` | `planId`, plus a human reference number if `planId` is a UUID (see §7) |

**Note on truck labels.** The design shows fleet units as `Truck 14-B`,
`Truck 09-C`. `migrations/0001_init.sql` models `trucks.truck_number` as an
`integer`, which cannot hold `14-B`. Either the column becomes `text`, or the UI
label is composed from something else. This needs a decision.

---

## 3. Screen: Plan tab

`frontend/src/components/PlanTab.jsx`, `frontend/src/components/RouteMap.jsx`

### 3.1 Map

The wireframe draws a fake diagonal with pins positioned by index
(`pinPos()` in `RouteMap.jsx`). The real map (MapLibre, §9) needs:

| Layer | Needed from backend |
|---|---|
| Planned route line | `optimized.polyline` (precision-5), `optimized.bounds` |
| Origin / destination markers | resolved `origin` / `destination` coordinates — **not currently echoed** in the §14 response, only the address that was submitted |
| Numbered fuel-stop pins | `stops[].seq`, `stops[].station.location.{lat,lng}` |
| Candidate dots ("candidate, not chosen") | `candidateStations[].location.{lat,lng}` |
| Baseline route, if it is ever drawn | `baseline.polyline` — present in §14, unused by this design |

Geometry expiry (§14) applies: when `geometryExpired: true`, the map panel needs
a defined empty state. **The design does not have one.** Flagging it rather than
inventing it.

### 3.2 Fuel-stop hover card

Six rows, all per-stop. All already in §14's `stops[]`:

| Row | Field |
|---|---|
| title | `seq` + `station.name` |
| place | `station.city`, `station.state` |
| Price | `unitPriceUsd` |
| Buy | `purchaseGallons` |
| Arrive with | `arrivalGallons` |
| Detour | `detourMiles` |
| Cumulative | `cumulativeDistanceMiles` |
| Stop cost | `stopCostUsd` |

### 3.3 Candidate hover card

| Row | Field |
|---|---|
| title / place | `candidateStations[].name`, `.city`, `.state` |
| Price | `candidateStations[].unitPriceUsd` |
| Along route | `candidateStations[].distanceAlongRouteMiles` |

§14 declares `candidateStations` as a comment stub. **Its shape has to be
specified** — at minimum: `id`, `name`, `city`, `state`, `location`,
`unitPriceUsd`, `distanceAlongRouteMiles`, `detourMiles`. The design uses it for
two things: the green dot layer, and the count in the "show all sheet stations"
button.

### 3.4 Lane form

`Source` / `Destination` are read-only echoes of the plan request today. When
"Plan route" becomes live it is a `POST /plans` with the header's selected truck
and the Dev Tools constraint block. The response's resolved addresses should be
echoed back so the fields show what was actually geocoded, not what was typed.

### 3.5 Summary stat grid — six cells

| Cell | Value | Sub-caption | Field |
|---|---|---|---|
| Fuel cost | `$286.62` | `68 gal` | `optimized.totalFuelCostUsd`, `optimized.totalGallons` |
| Saved | `−$41.00` | "vs the corridor baseline" | `optimized.savingsVsBaselineUsd` |
| Distance | `486.5 mi` | `+4.7 mi of detour · direct 481.8 mi` | `optimized.distanceMiles`, `optimized.addedDistanceMiles`, `baseline.distanceMiles` |
| Driving time | `7h 40m` | "excludes time at the pump" | `optimized.durationSeconds` |
| Stops | `5` | "within the leg bounds" | `stops.length`; the caption should become conditional — see below |
| Detour cost | `$3.39` | "driver pay only, $0.60/mi" | **New — see §6** |

Two captions are asserted by the wireframe but are really computed claims:

- **"within the leg bounds"** is false whenever §5.1's relaxation pass ran. §14
  already emits a `MIN_LEG_RELAXED` disclaimer for exactly this; the caption
  should read from it and name the short legs.
- **"excludes time at the pump"** implies `optimized.durationSeconds` is drive
  time only. If `fixedStopMinutes` is folded into it, the caption is wrong. The
  backend should return drive time and dwell time separately.

### 3.6 Price-sheet selector

The design puts a **sheet date picker** at the top of the right column, and
turns the whole column amber when a sheet other than the newest is selected:

- Today: `Daily price CSV loaded 05:58 CT · 412 stations`
- Archived: `Archived sheet — not today's prices. Historical reference only.`

This is entirely new. It needs:

- `GET /price-sheets` → `[{ effectiveOn, importedAt, rowCount, stationCount }]`,
  newest first. The frontend decides "is newest" by comparing to index 0.
- `POST /plans` accepting `priceEffectiveOn` so a dispatcher can re-price a lane
  against a historical sheet.
- `GET /plans/{id}` already returns `priceAsOf` — that selects the picker's
  value when an existing plan is opened.

`price_imports` in `migrations/0001_init.sql` already carries `effective_date`,
`imported_at` and `row_count`. Only `stationCount` (distinct stations priced on
that sheet) is missing, and it is derivable from `station_prices`.

### 3.7 Cheapest along route — bar chart

Five rows: station name, a bar, a `$/gal` figure. The bar width is a
presentation concern — the frontend will scale it from the price range and the
backend should not send a percentage.

Source: the cheapest N of `candidateStations[]` **plus** selected stops, ranked
by `unitPriceUsd`. Two things need deciding:

- Does "along route" mean the corridor set (candidates + chosen), or only the
  unchosen candidates? The design's placeholder list overlaps with the chosen
  stops, which suggests the former.
- Is N fixed at 5, or a parameter?

### 3.8 "Show all sheet stations on map (412)"

The button label carries a count. In the placeholder it is `sheetStationCount`,
a constant. It should be the number of stations actually plotted — i.e.
`candidateStations.length` — **not** the sheet's total row count, which would be
thousands and would not match what the toggle reveals. If the intent really is
"every station on the sheet", that is a different and much larger layer and
needs its own bbox-paged endpoint (`GET /stations`, already in §14).

### 3.9 Recommended order

One row per stop: rank, `station · milepost`, `detour · action`, price. Fields:
`seq`, `station.name`, `cumulativeDistanceMiles`, `detourMiles`,
`unitPriceUsd`, and an **action label**.

The action label (`60 gal fill`, `top-off`, `40 gal`, `reserve`) is a derived
description of `purchaseGallons` relative to tank capacity. Deriving it in the
frontend is fine, but the rules need pinning down — what counts as a "top-off"
versus a named gallon amount, and what "reserve" means as distinct from a small
fill.

### 3.10 Driver route link

`googleMapsUrl` from §14. The design shows it read-only in an input, with
**Open** and **Copy**. The `GOOGLE_LINK_NOT_TRUCK_LEGAL` disclaimer that §14
always emits has **no home in this design** — the card's footnote is generic
marketing copy, not the warning. Somewhere in this card needs to carry it.

---

## 4. Screen: Recent tab

`frontend/src/components/RecentTab.jsx` — seven columns:

| Column | Field |
|---|---|
| Trip | `planId` / reference number |
| Date | `createdAt` |
| Route | origin + destination labels, rendered `A → B` |
| Distance | `optimized.distanceMiles` |
| Truck | truck unit label |
| Saved | `optimized.savingsVsBaselineUsd` |
| Status | `status` |

`GET /plans` needs to return this as a list projection — not full plan payloads.
Pagination is not in the design; it will be needed.

**Status values.** The design shows `Planned` and `Completed`. §14's are
`completed` and `infeasible`. These are different vocabularies: §14's describes
whether the *solve* succeeded, the design's appears to describe whether the
*trip* has been driven. Both may be needed — a solve status and a trip
lifecycle status — and the design has room for only one badge. Needs a decision.

An `infeasible` plan must render in this table too; the design has no styling
for it.

---

## 5. Screen: Dev Tools tab

`frontend/src/components/DevToolsTab.jsx`. Every field here is an uncontrolled
placeholder input; nothing is read or written.

### 5.1 Truck panel

`GET /trucks/{id}` + `PATCH /trucks/{id}`:

| Field | Column in `trucks` |
|---|---|
| Truck name / unit | `truck_number` (see §2's type note) + a display name |
| Tank capacity (gal) | `tank_gallons` |
| Fuel economy (mpg) | `avg_mpg` |
| Starting fuel (gal) / (%) | **not a truck property** — a per-plan input (`startFuelGallons`). The two inputs are two views of one number and must stay in sync against tank capacity. |
| "Range on hand ≈ 440 mi" | derived: `startFuelGallons × avg_mpg` |
| "Trip needs 68 gal" | derived: `optimized.totalGallons` |

### 5.2 Solver defaults panel

Read-only diagnostics, none of which exist today:

| Field | Source |
|---|---|
| Price feed | build/config — the design's `opis-live · v3` is wrong for this project; §4 says the feed is a BVD CSV import. Should show the import identity. |
| Routing engine | ORS per §8.2 — a version/profile string |
| Price cache TTL (min) | config |
| Fuel type | `product_type` |
| "Last solve 1.8 s" | **New** — solve wall time on the plan response |
| "412 stations scanned" | **New** — corridor candidate count considered by the DP |

`GET /health` (§14) already reports provider reachability and the latest sheet
date; that is the natural home for the first four. The last two are per-plan and
belong on the plan response.

### 5.3 Constraints and price basis

These are the `POST /plans` inputs. All eight map to fields §14 already defines,
with one addition:

| Field | `POST /plans` |
|---|---|
| Search corridor (mi) | `maxDetourMiles` — **naming collision, see below** |
| Max detour per stop (mi) | **New.** Post-routing round-trip cap, distinct from the corridor. Nullable. |
| Arrival fuel target (gal) | `minArrivalGallons` |
| Reserve floor (%) | `trucks.reserve_fraction` — read-only here, edited on the truck |
| Max stops | `maxStops` (nullable) |
| Max leg between fills (mi) | `maxLegMiles` |
| Min leg between fills (mi) | `minLegMiles` |
| Price basis | `priceBasis` |

**The corridor / detour distinction is the important one.** The design's own
help text spells it out: the corridor is a straight-line *screening* radius,
inflated by each station's position uncertainty, that decides what gets
considered at all. The max detour per stop is a *post-routing* cap on one
station's actual round-trip drive. §14 has a single `maxDetourMiles` doing both
jobs. Two parameters are needed, and §15.1's constraint list needs the second
one added.

**Price basis options** in the design: `Pump price (YOUR PRICE)`, `Rack price`,
`Pump price less IFTA credit`, `Contract / network price`. These map onto
`station_prices` columns (`your_price`, `cost`/`total_cost`, `retail_price`).
The design's own note says the IFTA question is unresolved; that is a real open
item, not a UI gap.

---

## 6. What the backend must add beyond §14

Ordered by how much of the UI is blocked on it.

1. **`GET /price-sheets`** — the sheet picker cannot exist without it. Needs
   `effectiveOn`, `importedAt`, `stationCount`.
2. **`priceEffectiveOn` on `POST /plans`** — pricing a lane against a chosen
   sheet.
3. **`candidateStations[]` fully specified** — three separate parts of the Plan
   tab consume it (dot layer, hover card, cheapest-along-route list).
4. **`detourCostUsd`** on `optimized`, plus the `costPerMile` used to compute
   it. The design's stat cell hard-codes `$0.60/mi`; that rate is a business
   input and belongs in config, surfaced on the response.
5. **Drive time and dwell time separated** on `optimized`, so the "excludes time
   at the pump" caption is true.
6. **A second detour parameter** — screening corridor vs per-stop routed cap
   (§5.3).
7. **Solve telemetry** — `solveMs`, `stationsScanned`, `optimizerStrategy` (the
   last already exists) on the plan response.
8. **`GET /plans` list projection** for the Recent table, with pagination.
9. **`GET /trucks`** returning fleet units for the header selector, plus the
   truck-number type fix.
10. **Resolved origin/destination coordinates** echoed on the plan response.
11. **Session identity** for the header chip, if auth lands in v1.

---

## 7. Open questions for the backend

- **Trip reference format.** The UI shows `T-1042`. Is that a human-readable
  sequence alongside a UUID `planId`, or is it the id? The Recent table, the
  header tag and any future URL all use it.
- **Truck unit numbering.** `14-B` does not fit `truck_number integer`.
- **Status vocabulary.** Solve status (`completed` / `infeasible`) and trip
  lifecycle (`Planned` / `Completed`) are different axes; the design has one
  badge.
- **"Cheapest along route" set** — corridor candidates only, or candidates plus
  chosen stops? Fixed at five?
- **"All sheet stations" scope** — corridor candidates, or every station on the
  sheet as a paged bbox layer?
- **Action-label rules** — what makes a stop a "top-off" vs "reserve" vs a named
  gallon amount.
- **IFTA registration**, which decides the default price basis. Unresolved in
  the design and unresolved here.

---

## 8. Missing states

The design has no rendering for any of these, and the frontend currently cannot
express them:

- `status: "infeasible"` — §14 returns a structured `reason` with suggestions
  and still returns `candidateStations`. That is a rich payload with nowhere to
  go.
- `geometryExpired: true` — plan older than 30 days, table renders, map cannot.
- **Disclaimers.** §14 returns a `disclaimers[]` array and guarantees at least
  one entry on every plan. The design surfaces none of them.
- Empty states: no recent trips, no candidates in corridor, no price sheet
  imported yet.
- Loading state while a solve runs. `POST /plans` is asynchronous in §14's shape
  (create, then fetch), so this is required, not optional.
- Error states for a failed geocode or a routing-provider outage.

These are design work, not backend work — but the payloads above will arrive
before there is anywhere to put them.
