# CH Fuel Planner

A dispatcher enters a load — origin, destination, truck — and gets back a truck-legal route, the cheapest diesel stops along it under a hard 500-mile leg cap, and a Google Maps link to send the driver. One supplier (BVD), one product (ULSD), US only, single user.

**Org:** 2043733 ONTARIO INC., DBA CH LOGISTICS.

---

## Documents, in authority order

When two disagree, the higher one wins and the lower one gets edited.

1. **`migrations/*.sql`** — authoritative for schema. If it disagrees with the scope's §12, the migration is right and §12 gets edited.
2. **`docs/PROJECT-SCOPE.md`** — the specification. Section refs below (§4, §15.3) point here.
3. **`docs/TICKETS.md`** — ticket register: goals, files, dependencies, definitions of done.
4. **`docs/BUILD-PLAN.md`** — per-ticket steps with test plans. Work from this.
5. **`docs/UI-DATA-CONTRACT.md`** — what the frontend needs that §14 does not yet return.
6. **This file** — workflow and conventions only. Never duplicate spec content here.

The scope marks claims as **Verified** (measured against `data/`), **Decided** (a choice with a reason), or **Open** (§21). Do not treat an Open item as settled, and do not re-litigate a Decided one without saying why.

---

## Stack

Node 22 · TypeScript · Next.js (frontend + API mount) · Postgres 16 + PostGIS · raw `pg`, **no ORM or query builder** · Zod · vitest · MapLibre GL JS · OpenRouteService.

Two workspaces: `backend/` (`@ch/core`, framework-free) and `frontend/` (Next.js, the Vercel root directory).

---

## Commands

```bash
npm run db:up          # docker compose up -d      (Postgres+PostGIS on :5433)
npm run db:migrate     # apply migrations/*.sql via the runner, idempotent
npm run db:reset       # down -v && up -d && migrate  — destroys local data
npm run seed           # truck profiles, product code, dispatcher account

npm run typecheck
npm run lint
npm run test:unit      # no database required
npm test               # full suite, needs a live database
npm run verify         # typecheck && lint && test — the gate

npm run dev            # Next dev server
npm run ingest -- ./data/bvd/pcn-usd-9206810-981.csv
npm run backfill -- ./data/bvd/2026-01/
```

Migrations apply **only** through the runner. `docker-compose.yml` deliberately does not mount `migrations/` as init scripts — that path fires only on an empty volume and has no Neon equivalent.

---

## Workflow: one branch per ticket

One ticket = one branch = one squashed commit on `main`. `main` history then reads as the ticket register, and every commit on it is a state CI verified.

```bash
git checkout main && git pull
git checkout -b ticket/T-01-toolchain

# implement BUILD-PLAN steps one at a time, committing per step
npm run verify

git push -u origin ticket/T-01-toolchain
gh pr create --fill
# CI green, then:
gh pr merge --squash --delete-branch
git checkout main && git pull
```

**Branch names:** `ticket/T-<NN>-<short-slug>` — `ticket/T-06-ingest-service`.

**Commits on the branch:** conventional, scoped to the ticket. Small and per-step is fine; they get squashed.

```
feat(T-06): parse BVD metadata row and header
test(T-06): assert 605 rows and 2026-08-22 effective date
fix(T-06): reject unmapped PROD instead of defaulting
```

**The squash commit** is what lands on `main`. Title it with the ticket: `T-06 · Ingest service and npm run ingest (#12)`.

**Do not start the next ticket until the current one is merged.** The dependency graph in `TICKETS.md` assumes each ticket builds on merged work, not on a sibling branch.

### A ticket is done when

- Every step's tests in `BUILD-PLAN.md` pass.
- The ticket's definition of done in `TICKETS.md` is fully met — not partly.
- `npm run verify` is green from a clean checkout.
- CI is green on the PR.

If a step cannot be finished, say so and leave it out explicitly. Do not narrow a ticket silently.

---

## Testing rules

- Tests are co-located as `*.test.ts` beside the unit. Anything needing a database goes in `backend/test/integration/` and skips when `DATABASE_URL` is unset.
- **Optimiser strategies are pure** — no database, no HTTP, no clock. Their whole suite must run with no container and no network.
- Provider tests run offline from recorded fixtures in `backend/test/fixtures/ors/`, committed with ODbL attribution.
- "Pass" means an assertion, not an eyeball — except the one visual check in T-04 step 4.2.
- Write the test before the fix for any bug found mid-ticket.

---

## Rules that are easy to get wrong

Each of these is a silent-corruption bug, not a crash. They are scattered across 1,700 lines of scope; they are collected here because they will not announce themselves.

**Prices and ingest**
- `YOUR PRICE` is **read, never recomputed.** `min(TOTAL COST, RETAIL PRICE)` is a BVD business rule only they can apply. Validate the invariant; store their number.
- **Trust the CSV header's effective date directly. No `+1` offset logic.** The file arrives on day *N* stating day *N+1* and the header is already correct.
- An **unmapped `PROD` fails the row.** Never default-mapped, never guessed. That guard is the entire reason `product_codes` exists.
- Rejected rows are quarantined with a reason code — never dropped.
- `city_raw` is never overwritten; `city_normalized` is a separate column for matching.
- Do not "correct" `CH LOGISTIX` to `CH LOGISTICS`. It is what the supplier sends; the ingest records what arrived.
- The store number comes from `NAME` (`LOVES #368` → 368), **never from `SITE`** — `SITE` matches the store number in 0 of 605 rows.

**Licensing and retention**
- **Never store a provider geocode permanently.** 30-day cap. Station coordinates come only from the operator export, OSM, or the Census gazetteer.
- **Never store price data from the Love's export.** Location and amenity fields only (`StoreType`, `ParkingSpaces`, `DEFLanes`). Those are street prices, not contract prices.
- **Route geometry does not expire in v1.** ORS is ODbL and carries no storage cap, so there is no `routes.expires_at`, no expiry trigger, no retention job and no `geometryExpired` field. Adopting HERE or Google brings all four back — §17 keeps the design. Do not add them before then.
- `routes` is still a **cache** and `plans`/`plan_stops` are still the **record**. Refreshing a route writes to `routes` **only** — never to `plans` or `plan_stops`. Stored totals stay authoritative, because a refreshed line reflects today's road network, not the one that was planned.
- `routes.line`/`polyline`/`legs` stay **nullable** despite never expiring — a provider may return no geometry, and a capped provider later needs a job rather than a migration.
- Attribution ships **in the API response**, so the frontend cannot omit it. Indefinite retention of ODbL data is permitted *because* it is attributed.

**Algorithm**
- The two-pass relaxation lives in the planning service, **never inside `solve()`**.
- **No minimum-leg floor on the final leg.** You do not buy fuel at the destination. Frequent off-by-one source; it has its own test.
- Round **down** on arrival fuel so bucketing never manufactures range that does not exist.
- Top-K candidates are stratified **by position, not price** — a price sort leaves 500-mile holes where stations existed.
- `LEFT JOIN LATERAL` for prices, never an inner join: a station with no price that day must be *named in `exclusions`*, not silently vanish.
- Detour uses the **bracket model**, not route-to-station-and-double. A truck cannot turn around on a controlled-access highway.
- Keep `estimatedDetourMiles` beside the measured value; never overwrite it.

**Engineering**
- **Parameterised SQL only.** No string interpolation of values, anywhere. There is no query builder to hide behind.
- Storage is **miles and gallons**; convert at the API boundary only.
- `backend/src/api/` stays **framework-free** — it mounts in one Next route file and is testable without a server.
- Services take no argv and print nothing. CLIs do argv and stdout, and nothing else.
- **Nulls are meaningful.** "No cap" on `maxStops` and `maxDetourMiles` must survive the round trip and must never become `0`.
- Return numbers, not display strings. The frontend composes labels.

---

## Data on disk

| Path | What | Verified |
|---|---|---|
| `data/bvd/pcn-usd-9206810-981.csv` | August sheet | 605 data rows, effective 2026-08-22 |
| `data/bvd/2026-01/` | January corpus | 31 files, **30 distinct dates — 2026-01-11 missing**, 594 rows each |
| `data/bvd/2026-01/…-8097639-981 (1).csv` | Duplicate of its sibling | **Byte-identical**, SHA-256 `84fc7c50…` — the real idempotency test case |
| `data/loves/LovesSearchResults.xlsx` | Operator export | 732 stores, header on row 3, footer row to drop, matches 604/605 |

The missing January day and the duplicate file are **correct behaviour to report**, not bugs to suppress.

---

## Environment

`.env` is gitignored and starts empty. Copy from `backend/.env.example`: `DATABASE_URL`, `ORS_API_KEY`, `ROUTING_PROVIDER=ors`, `AUTH_SECRET`, `SEED_USER_EMAIL`, `SEED_USER_PASSWORD`.

Local Postgres runs on **port 5433**, not 5432.

Windows is the dev machine; Vercel runs Linux. Watch path separators, filename case, and CRLF in CSV parsing — CI on Linux is what catches these.
