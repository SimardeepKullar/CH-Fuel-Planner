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

## Building a real fixture from a portal download

BVD's raw CSV export needs two adjustments before `parseInvoiceCsv.ts` can
read it — neither is inventing data, both are documented here rather than
in a per-invoice provenance file (which would only ever live locally
anyway, being real data):

1. **No header block.** The raw export opens straight into
   `Fuel Card Transactions` — no invoice number, period, dates, or
   addresses. Prepend one labelled-value row ahead of it (the same
   `Company Id:`/`Effective Date:` technique v1's `parseBvdCsv.ts` uses),
   sourced from the invoice's own already-verified figures in
   `PROJECT-SCOPE-v2.md` §A5 — never invented.
2. **No `TRACTOR`/`DRIVER` columns on Express Codes.** The raw section is
   `DATE, EXPRESS CODE NUMBER, AUTH CODES, AMOUNT CASHED, FEE, TOTAL, CUR,
   PAYEE, NOTES`. Insert two columns after `AUTH CODES`, matched by express
   code number against `PROJECT-SCOPE-v2.md` §A19's sample table where a row
   is documented there; leave both columns genuinely blank for any real row
   that isn't — never guessed. All real rows are still needed even when
   undocumented, since dropping one breaks the printed express/grand totals.

A PDF fixture may be a smaller, curated subset of the invoice rather than a
full rebuild (D13: the PDF path is a best-effort fallback) — reconciliation
tests that need the invoice to balance on its own should use the CSV.
