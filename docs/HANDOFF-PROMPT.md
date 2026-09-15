# Handoff prompt — paste as the first message of a fresh Claude chat

> Copy everything between the rules. Attach `PROJECT-SCOPE.md`, `PROJECT-SCOPE-v2.md`, `TICKETS-v2.md`, `BUILD-PLAN-v2.md`, and the design file `CH Fuel App.dc.html` if the work touches UI.

---

You are working on **CH Fuel App**, the single internal web application for CH Logistics (2043733 Ontario Inc., Burlington ON — Canadian carrier running freight into the United States). It is the merge of two previously separate projects:

1. **CH Fuel Planner** — the forward-looking half. A dispatcher enters origin, destination and truck; a DP optimiser picks the cheapest compliant Love's stops from the BVD daily price file; output is a Google Maps link handed to the driver. Repository: **`CH-Fuel-Planner`** (GitHub). Specified in `PROJECT-SCOPE.md` (v1.0), ticketed in `TICKETS.md`, decomposed in `BUILD-PLAN.md`.
2. **Fuel invoice actuals** — the backward-looking half, new. Weekly BVD invoices are imported; every transaction, driver, truck, station and express charge is recorded, reconciled and reported on. Specified in `PROJECT-SCOPE-v2.md`.

The two halves share **one reference layer** — trucks, drivers, fuel cards, Love's stations — which is the entire reason for merging: a plan and an invoice must talk about the same truck and the same site. The payoff screen is **Plan vs Actual**: did the driver fuel where the plan said, and what did the difference cost?

**Where the build actually stands.** Tickets **T-01 through T-10 are complete and merged to `main`** in `CH-Fuel-Planner`: workspace toolchain, CI and git hooks, the rewritten schema with its drift test, seeded reference data, the Next.js + TypeScript migration, the `@ch/core` package boundary, Auth.js credentials login, the BVD price-sheet ingest service and backfill CLI, station resolution to 605/605, and the ORS adapter with budget guard and both call meters. **T-11 through T-24 are specified but not built.** **T-25 (actuals schema migration) is also complete and merged** — the reference/invoice/reconciliation tables exist and are seeded, but no service, API, or UI code touches them yet. Everything in `TICKETS-v2.md` from **T-26** onward is new work for the merged app. Do not assume any code exists that a ticket does not list as a dependency — read the repository before writing.

**Document authority, in order.** `migrations/*.sql` over any prose. `PROJECT-SCOPE.md` + `PROJECT-SCOPE-v2.md` are the specification; where v2 contradicts v1, v2 wins and v1 gets edited. `TICKETS-v2.md` is the ticket register; `BUILD-PLAN-v2.md` breaks each ticket into steps that can be implemented and tested one at a time. The design file `CH Fuel App.dc.html` is the visual authority for the shell, Transactions, Plan vs Actual, New Plan and Plans screens — it establishes two conventions that every later screen must reuse (see v2 §A9).

**House rules, carried over from v1 and non-negotiable.**
- One ticket per branch, one ticket per session. CI (`npm run verify`) is the gate.
- Storage is **miles and gallons**; unit conversion happens at the API boundary only. Money is **USD everywhere** — never render a bare dollar sign; the company is Canadian and the distinction matters.
- No strategy or pure function performs I/O — no database, no HTTP, no clock. Retries and orchestration live in services.
- The API returns **numbers, not display strings** (`5.2395`, not `"$5.2395"`), and nullable means nullable — `null` must never be coerced to `0`.
- Nothing is written to the database on a failed reconciliation. Quarantine is a **screen**, not a toast.
- Raw supplier text is never overwritten. Every raw field keeps its `_raw` twin beside the resolved value.
- Numbers format as: gallons 2dp, per-gallon prices **4dp**, money 2dp, right-aligned, tabular figures.

**How to work.** Read the ticket, then the step in the build plan, then the code the step touches. Implement one step; make its tests pass; stop. A step is finished when its assertions pass, not when the code is written. If the spec and the repository disagree, say so and propose the edit rather than silently following either.

Start by telling me which ticket you are picking up and what you found in the repository that the ticket's dependencies do not describe.

---
