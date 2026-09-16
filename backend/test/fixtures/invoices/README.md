# Invoice fixtures

Only synthetic, invented data lives here — never a real invoice, regardless
of repo visibility (see the root `.gitignore`).

- `sample-redacted.csv` / `sample-redacted.pdf` — synthetic, invented data.
  Committed. These carry the structural test coverage that must pass on a
  fresh clone and in CI: header parsing, product-line validation, 4dp price
  precision, fuel-stop grouping, express rows, and the CSV/PDF parsers'
  shared output shape.

Real BVD invoices carry real per-driver, per-transaction financial data —
who bought how much fuel, where, when, for how much — and belong in
`data/bvd-invoices/` instead, at the repo root. That directory is
gitignored in full, with no exceptions (unlike here, where the synthetic
fixtures above are meant to be committed) — see the root `.gitignore` for
why it's treated differently from `data/bvd/`, v1's already-committed
price-sheet corpus.

Drop a real invoice (e.g. `999210.csv`, `999210.pdf`) in `data/bvd-invoices/`
locally to exercise the tests that assert exact real figures (an invoice's
specific header, printed totals, and known regression cases). Those
`describe` blocks check for the file there and skip automatically when it's
absent, the same way this repo's `DATABASE_URL`-gated integration tests do.
