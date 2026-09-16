# Invoice fixtures

Real BVD invoices carry real per-driver, per-transaction financial data —
who bought how much fuel, where, when, for how much. That never gets
committed here, regardless of repo visibility (see the root `.gitignore`).

- `sample-redacted.csv` / `sample-redacted.pdf` — synthetic, invented data.
  Committed. These carry the structural test coverage that must pass on a
  fresh clone and in CI: header parsing, product-line validation, 4dp price
  precision, fuel-stop grouping, express rows, and the CSV/PDF parsers'
  shared output shape.
- A real invoice (e.g. `999210.csv`, `999210.pdf`) — gitignored. Drop one
  here locally to exercise the tests that assert exact real figures (an
  invoice's specific header, printed totals, and known regression cases).
  Those `describe` blocks check for the file and skip automatically when
  it's absent, the same way this repo's `DATABASE_URL`-gated integration
  tests do.
