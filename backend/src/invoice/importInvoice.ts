import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { getCardByNumber } from "../catalog/cards.js";
import { getTruckByUnitNumber } from "../catalog/trucks.js";
import { groupByAuthCode, type FuelStopGroup } from "./groupByAuthCode.js";
import { parseInvoiceCsv, type ParsedInvoice } from "./parseInvoiceCsv.js";
import type { ExpressRow } from "./parseExpressRows.js";
import { DEFAULT_INVOICE_PRODUCT_CODES, type InvoiceProductType } from "./productCode.js";
import { reconcile } from "./reconcile.js";
import { buildImportReport, type ImportReport } from "./report.js";

/** Raw BVD product codes that reconcile against a printed row of the same
 * name. "C" (cash) is the one exception — see reconcile.ts's
 * `PRINTED_ROW_LABEL`; a cash line still belongs in `invoice_totals` under
 * its own code, not the printed label it reconciled against. */
const KNOWN_PRODUCT_CODES = new Set(DEFAULT_INVOICE_PRODUCT_CODES.keys());

export interface ImportInvoiceMeta {
  sourceFilename: string;
}

export interface ImportInvoiceOptions {
  productCodes?: ReadonlyMap<string, InvoiceProductType>;
  /** Defaults to `parseInvoiceCsv`; T-31's CLI injects `parseInvoicePdf` when
   * the CSV export isn't available (D13). */
  parse?: (
    buffer: Buffer,
    productCodes: ReadonlyMap<string, InvoiceProductType>,
  ) => ParsedInvoice | Promise<ParsedInvoice>;
}

export type ImportInvoiceResult =
  | { status: "imported"; invoiceId: string; report: ImportReport }
  | { status: "quarantined"; invoiceId: string; report: ImportReport }
  | { status: "duplicate"; invoiceId: string; report: ImportReport }
  | { status: "conflict"; existingInvoiceId: string; message: string };

interface ExistingInvoiceRow {
  id: string;
  file_sha256: string;
}

/** Invoice timestamps carry no timezone offset (parseInvoiceCsv's
 * "2026-09-09T00:41:38"); treated as UTC for storage into a `timestamptz`
 * column, matching this schema's other UTC-anchored comparisons
 * (resolveAssignment's `AT TIME ZONE 'UTC'` cast). */
function asUtcTimestamp(occurredAt: string): string {
  return `${occurredAt}Z`;
}

async function findExistingBySha256(pool: Pool, fileSha256: string): Promise<string | null> {
  const { rows } = await pool.query<{ id: string }>(
    "SELECT id FROM invoices WHERE file_sha256 = $1",
    [fileSha256],
  );
  return rows[0]?.id ?? null;
}

async function findExistingByInvoiceNumber(
  pool: Pool,
  invoiceNumber: string,
): Promise<ExistingInvoiceRow | null> {
  const { rows } = await pool.query<ExistingInvoiceRow>(
    "SELECT id, file_sha256 FROM invoices WHERE invoice_number = $1",
    [invoiceNumber],
  );
  return rows[0] ?? null;
}

async function resolveCardMisses(
  pool: Pool,
  groups: readonly FuelStopGroup[],
): Promise<{ cardIds: Map<string, string>; misses: FuelStopGroup[] }> {
  const cardIds = new Map<string, string>();
  const misses: FuelStopGroup[] = [];
  for (const group of groups) {
    if (cardIds.has(group.cardNumber)) {
      continue;
    }
    const card = await getCardByNumber(pool, group.cardNumber);
    if (card) {
      cardIds.set(group.cardNumber, card.id);
    } else {
      misses.push(group);
    }
  }
  return { cardIds, misses };
}

async function resolveTruckUnitMisses(
  pool: Pool,
  expressRows: readonly ExpressRow[],
): Promise<{ truckIds: Map<string, string>; misses: ExpressRow[] }> {
  const truckIds = new Map<string, string>();
  const misses: ExpressRow[] = [];
  for (const row of expressRows) {
    if (row.unitRaw === null) {
      misses.push(row);
      continue;
    }
    if (truckIds.has(row.unitRaw)) {
      continue;
    }
    const truck = await getTruckByUnitNumber(pool, row.unitRaw);
    if (truck) {
      truckIds.set(row.unitRaw, truck.id);
    } else {
      misses.push(row);
    }
  }
  return { truckIds, misses };
}

async function insertInvoiceRow(
  client: PoolClient,
  parsed: ParsedInvoice,
  fileSha256: string,
  status: "imported" | "quarantined",
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO invoices
       (invoice_number, period_start, period_end, invoice_date, due_date,
        grand_total_usd, status, file_sha256)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      parsed.header.invoiceNumber,
      parsed.header.periodStart,
      parsed.header.periodEnd,
      parsed.header.invoiceDate,
      parsed.header.dueDate,
      parsed.printedTotals.grandTotalUsd,
      status,
      fileSha256,
    ],
  );
  const id = rows[0]?.id;
  if (!id) {
    throw new Error("invoices insert returned no id");
  }
  return id;
}

async function insertInvoiceTotals(
  client: PoolClient,
  invoiceId: string,
  parsed: ParsedInvoice,
): Promise<void> {
  const codesPresent = new Set(parsed.lines.map((l) => l.rawProductCode));
  for (const rawCode of codesPresent) {
    if (!KNOWN_PRODUCT_CODES.has(rawCode)) {
      continue; // unmapped codes never reach here — they're parser rejections
    }
    const printedLabel = rawCode === "C" ? "Manual Transactions" : rawCode;
    const printedRow = parsed.printedTotals.products.find((p) => p.productCode === printedLabel);
    if (!printedRow) {
      continue; // no printed figure for this code — nothing to record
    }
    await client.query(
      `INSERT INTO invoice_totals (invoice_id, product_code, gallons, amount_usd)
       VALUES ($1, $2, $3, $4)`,
      [invoiceId, rawCode, printedRow.gallons ?? "0.00", printedRow.amountUsd],
    );
  }
}

async function insertFuelStop(
  client: PoolClient,
  invoiceId: string,
  group: FuelStopGroup,
  cardId: string,
): Promise<void> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO fuel_stops
       (invoice_id, base_auth_code, occurred_at, card_id, unit_raw,
        driver_name_raw, total_usd)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      invoiceId,
      group.baseAuthCode,
      asUtcTimestamp(group.occurredAt),
      cardId,
      group.unitRaw,
      group.driverNameRaw,
      group.totalUsd,
    ],
  );
  const fuelStopId = rows[0]?.id;
  if (!fuelStopId) {
    throw new Error(`fuel_stops insert for ${group.baseAuthCode} returned no id`);
  }
  for (const line of group.lines) {
    await client.query(
      `INSERT INTO fuel_stop_lines
         (fuel_stop_id, product_code, gallons, retail_usd_per_gal, billed_usd_per_gal, amount_usd)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [fuelStopId, line.rawProductCode, line.gallons, line.retailUsdPerGal, line.billedUsdPerGal, line.amountUsd],
    );
  }
}

async function insertExpressCharge(
  client: PoolClient,
  invoiceId: string,
  row: ExpressRow,
  truckId: string,
): Promise<void> {
  await client.query(
    `INSERT INTO express_charges
       (invoice_id, express_code, occurred_at, truck_id, unit_raw,
        driver_name_raw, amount_usd, fee_usd, total_usd, payee, note, category)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      invoiceId,
      row.expressCode,
      asUtcTimestamp(row.occurredAt),
      truckId,
      row.unitRaw,
      row.driverNameRaw,
      row.amountUsd,
      row.feeUsd,
      row.totalUsd,
      row.payee,
      row.note,
      row.category,
    ],
  );
}

async function insertInvoiceRejections(
  client: PoolClient,
  invoiceId: string,
  report: ImportReport,
): Promise<void> {
  for (const rejection of report.rejections) {
    await client.query(
      `INSERT INTO invoice_rejections (invoice_id, line_number, auth_code, code, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [invoiceId, rejection.lineNumber, rejection.authCode, rejection.code, rejection.message],
    );
  }
}

/**
 * Hash → dedupe on `file_sha256` → check `invoice_number` → parse → group →
 * reconcile → promote in one transaction, or write the invoice row with
 * `status='quarantined'` plus `invoice_rejections` and stop (T-28).
 *
 * Any rejection at all — a parser rejection, a reconcile imbalance, or an
 * unknown card/truck — forces quarantine: an invoice row with rejections
 * has zero child rows in fuel_stops/express_charges, never a partial
 * promote (the schema's own invariant, migrations/0003_actuals.sql).
 *
 * `fuel_stops.truck_id`/`driver_id` are left null here — T-29 resolves them
 * from the card's driver and that driver's truck assignment, and modifies
 * this function to do so. `express_charges.truck_id` is NOT NULL and has no
 * card to resolve from, so it's a plain, unambiguous unit-number lookup
 * done here, not deferred.
 *
 * No HTTP, no argv, no printing — the CLI in cli/importInvoice.ts (T-31) is
 * the only caller that touches stdout.
 */
export async function importInvoice(
  pool: Pool,
  buffer: Buffer,
  meta: ImportInvoiceMeta,
  options?: ImportInvoiceOptions,
): Promise<ImportInvoiceResult> {
  void meta; // reserved for a future source-filename audit trail; not yet persisted
  const productCodes = options?.productCodes ?? DEFAULT_INVOICE_PRODUCT_CODES;
  const parseFn = options?.parse ?? parseInvoiceCsv;

  const fileSha256 = createHash("sha256").update(buffer).digest("hex");
  const existingId = await findExistingBySha256(pool, fileSha256);

  const parsed = await parseFn(buffer, productCodes);

  const existingByNumber = await findExistingByInvoiceNumber(pool, parsed.header.invoiceNumber);
  if (existingByNumber && existingByNumber.file_sha256 !== fileSha256) {
    return {
      status: "conflict",
      existingInvoiceId: existingByNumber.id,
      message:
        `invoice ${parsed.header.invoiceNumber} was already imported from a different file ` +
        `(existing file_sha256 ${existingByNumber.file_sha256}, this one ${fileSha256})`,
    };
  }

  const groups = groupByAuthCode(parsed.lines);
  const reconcileResult = reconcile(groups, parsed.expressRows, parsed.printedTotals);
  const { cardIds, misses: cardMisses } = await resolveCardMisses(pool, groups);
  const { truckIds, misses: truckUnitMisses } = await resolveTruckUnitMisses(pool, parsed.expressRows);

  const report = buildImportReport({
    invoiceNumber: parsed.header.invoiceNumber,
    fileSha256,
    grandTotalUsd: parsed.printedTotals.grandTotalUsd,
    parserRejections: parsed.rejections,
    reconcileResult,
    cardMisses,
    truckUnitMisses,
  });

  if (existingId) {
    return { status: "duplicate", invoiceId: existingId, report };
  }

  const promote = report.rejections.length === 0;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const invoiceId = await insertInvoiceRow(
      client,
      parsed,
      fileSha256,
      promote ? "imported" : "quarantined",
    );

    if (promote) {
      await insertInvoiceTotals(client, invoiceId, parsed);
      for (const group of groups) {
        const cardId = cardIds.get(group.cardNumber);
        if (!cardId) {
          throw new Error(`invariant violated: no resolved card for ${group.cardNumber}`);
        }
        await insertFuelStop(client, invoiceId, group, cardId);
      }
      for (const row of parsed.expressRows) {
        const truckId = row.unitRaw !== null ? truckIds.get(row.unitRaw) : undefined;
        if (!truckId) {
          throw new Error(`invariant violated: no resolved truck for express row ${row.expressCode}`);
        }
        await insertExpressCharge(client, invoiceId, row, truckId);
      }
    } else {
      await insertInvoiceRejections(client, invoiceId, report);
    }

    await client.query("COMMIT");
    return { status: promote ? "imported" : "quarantined", invoiceId, report };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
