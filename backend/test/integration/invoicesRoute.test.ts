import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp, type App } from "../../src/api/app.js";
import { runMigrations } from "../../src/db/migrate.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(dirname, "../../../migrations");
const fixturesDir = path.join(dirname, "../fixtures/invoices");
const realCsvPath = path.join(dirname, "../../../data/bvd-invoices/999210.csv");
const realPdfPath = path.join(dirname, "../../../data/bvd-invoices/999210.pdf");
const hasDatabase = Boolean(process.env.DATABASE_URL);
const hasRealFixtures = existsSync(realCsvPath) && existsSync(realPdfPath);

const BALANCED_CSV = readFileSync(path.join(fixturesDir, "sample-redacted.csv"));
const IMBALANCED_CSV = readFileSync(path.join(fixturesDir, "sample-redacted-imbalanced.csv"));

function uploadRequest(buffer: Buffer, filename: string): Request {
  const formData = new FormData();
  formData.append("file", new Blob([buffer]), filename);
  return new Request("http://localhost/api/v1/invoices/import", { method: "POST", body: formData });
}

/**
 * T-34: `POST /invoices/import`, `GET /invoices`, `GET /invoices/{id}` — the
 * HTTP wrapper over T-28's `importInvoice()`, exercised the same way
 * `importInvoice.test.ts` exercises the service directly, but through
 * `createApp().handle()` so the route's own status-code mapping is what's
 * under test.
 */
describe.skipIf(!hasDatabase)("invoices routes (integration)", () => {
  let adminPool: Pool;
  let scopedPool: Pool;
  let schema: string;
  let app: App;

  beforeEach(async () => {
    schema = `test_invoices_route_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    adminPool = new Pool({ connectionString: process.env.DATABASE_URL });
    await adminPool.query(`CREATE SCHEMA "${schema}"`);
    scopedPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      options: `-c search_path=${schema},public`,
    });
    await runMigrations(scopedPool, migrationsDir);

    // Same synthetic catalog as importInvoice.test.ts, so the balanced
    // fixture's cards/units resolve and the invoice actually promotes.
    await scopedPool.query(
      "INSERT INTO fuel_cards (card_number) VALUES ('1000001'), ('1000002'), ('1000003') ON CONFLICT DO NOTHING",
    );
    await scopedPool.query(
      "INSERT INTO trucks (unit_number) VALUES ('101'), ('102') ON CONFLICT DO NOTHING",
    );

    app = createApp({ pool: scopedPool, authRequired: false });
  });

  afterEach(async () => {
    await scopedPool.end();
    await adminPool.query(`DROP SCHEMA "${schema}" CASCADE`);
    await adminPool.end();
  });

  it("a balanced upload returns 200 imported with a report, and the invoice is written", async () => {
    const response = await app.handle(uploadRequest(BALANCED_CSV, "sample-redacted.csv"));
    expect(response.status).toBe(200);

    const body = (await response.json()) as { status: string; invoiceId: string; report: { reconcile: { balanced: boolean } } };
    expect(body.status).toBe("imported");
    expect(body.report.reconcile.balanced).toBe(true);

    const { rows } = await scopedPool.query("SELECT status FROM invoices WHERE id = $1", [body.invoiceId]);
    expect(rows).toEqual([{ status: "imported" }]);
  });

  it("an imbalanced upload returns 200 quarantined with the full report — never a 4xx (D12)", async () => {
    const response = await app.handle(uploadRequest(IMBALANCED_CSV, "sample-redacted-imbalanced.csv"));
    expect(response.status).toBe(200);

    const body = (await response.json()) as { status: string; invoiceId: string; report: { rejections: unknown[] } };
    expect(body.status).toBe("quarantined");
    expect(body.report.rejections.length).toBeGreaterThanOrEqual(1);

    expect((await scopedPool.query("SELECT count(*) FROM fuel_stops")).rows[0].count).toBe("0");
    expect((await scopedPool.query("SELECT count(*) FROM invoice_rejections WHERE invoice_id = $1", [body.invoiceId])).rows[0].count)
      .not.toBe("0");
  });

  it("a re-upload of the same bytes is a 200 duplicate no-op, not an error", async () => {
    const first = await app.handle(uploadRequest(BALANCED_CSV, "sample-redacted.csv"));
    const firstBody = (await first.json()) as { invoiceId: string };

    const second = await app.handle(uploadRequest(BALANCED_CSV, "sample-redacted.csv"));
    expect(second.status).toBe(200);
    const secondBody = (await second.json()) as { status: string; invoiceId: string };
    expect(secondBody.status).toBe("duplicate");
    expect(secondBody.invoiceId).toBe(firstBody.invoiceId);
  });

  it("a different file under an already-used invoice number is a 409 problem+json, distinct from quarantine", async () => {
    await app.handle(uploadRequest(BALANCED_CSV, "sample-redacted.csv"));

    // Same invoice number (100001) as BALANCED_CSV, one field's bytes changed.
    const conflictingFile = Buffer.from(
      BALANCED_CSV.toString("utf8").replace(
        "DF,5.00,22.50,0,0,0,0,0,0,22.50,US,",
        "DF,5.00,22.51,0,0,0,0,0,0,22.51,US,",
      ),
      "utf8",
    );
    const response = await app.handle(uploadRequest(conflictingFile, "sample-redacted-2.csv"));

    expect(response.status).toBe(409);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
  });

  it("415s a file that is neither CSV nor PDF", async () => {
    const response = await app.handle(uploadRequest(Buffer.from("hello"), "notes.txt"));
    expect(response.status).toBe(415);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
  });

  it("GET /invoices paginates newest-first with number, period, total, status, imported-at", async () => {
    const balanced = await app.handle(uploadRequest(BALANCED_CSV, "sample-redacted.csv"));
    const balancedBody = (await balanced.json()) as { invoiceId: string };
    await new Promise((resolve) => setTimeout(resolve, 10)); // force a distinct imported_at ordering
    const imbalanced = await app.handle(uploadRequest(IMBALANCED_CSV, "sample-redacted-imbalanced.csv"));
    const imbalancedBody = (await imbalanced.json()) as { invoiceId: string };

    const response = await app.handle(new Request("http://localhost/api/v1/invoices?page=1&pageSize=10"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      rows: Array<{
        id: string;
        invoiceNumber: string;
        periodStart: string;
        periodEnd: string;
        grandTotalUsd: number;
        status: string;
        importedAt: string;
      }>;
      page: number;
      pageSize: number;
      total: number;
    };

    expect(body.total).toBe(2);
    expect(body.rows.map((r) => r.id)).toEqual([imbalancedBody.invoiceId, balancedBody.invoiceId]);
    const imbalancedRow = body.rows[0]!;
    expect(imbalancedRow.invoiceNumber).toBe("100002");
    expect(imbalancedRow.periodStart).toBe("2026-01-05");
    expect(imbalancedRow.periodEnd).toBe("2026-01-11");
    expect(imbalancedRow.status).toBe("quarantined");
    expect(typeof imbalancedRow.grandTotalUsd).toBe("number");
    expect(typeof imbalancedRow.importedAt).toBe("string");
  });

  it("a quarantined invoice's report is retrievable by id without re-uploading the file", async () => {
    const uploaded = await app.handle(uploadRequest(IMBALANCED_CSV, "sample-redacted-imbalanced.csv"));
    const { invoiceId } = (await uploaded.json()) as { invoiceId: string };

    const response = await app.handle(new Request(`http://localhost/api/v1/invoices/${invoiceId}`));
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      rejections: Array<{ lineNumber: number; authCode: string | null; code: string; message: string }>;
    };
    expect(body.status).toBe("quarantined");
    expect(body.rejections.length).toBeGreaterThanOrEqual(1);
    expect(body.rejections.some((r) => r.code === "AMOUNT_IMBALANCE")).toBe(true);
  });

  it("GET /invoices/{id} 404s an unknown id", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/v1/invoices/00000000-0000-0000-0000-000000000000"),
    );
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
  });
});

/**
 * The route is the first caller that ever picks `parseInvoicePdf` over the
 * CSV default (D13) — everywhere else it's exercised directly
 * (parseInvoicePdf.test.ts, header/line/express-row shape only) or never
 * reached (cli/importInvoice.ts always defaults to CSV). Proven here against
 * the real 999210 PDF: `pdf-parse`'s text extraction only recovers a handful
 * of this multi-page invoice's lines, so the honest, correct outcome is
 * `quarantined` with a real amount imbalance on TA and DF — exactly the
 * failure mode D13's own reasoning names ("PDF text extraction is inherently
 * less reliable... which is why T-28's reconciliation exists before
 * anything reaches the database"). This is that guard catching a real
 * fallback-path shortfall, not a bug in the dispatch being tested.
 */
describe.skipIf(!hasDatabase || !hasRealFixtures)("POST /invoices/import — PDF fallback (integration, local fixture only)", () => {
  let adminPool: Pool;
  let scopedPool: Pool;
  let schema: string;
  let app: App;

  beforeEach(async () => {
    schema = `test_invoices_route_pdf_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    adminPool = new Pool({ connectionString: process.env.DATABASE_URL });
    await adminPool.query(`CREATE SCHEMA "${schema}"`);
    scopedPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      options: `-c search_path=${schema},public`,
    });
    await runMigrations(scopedPool, migrationsDir);
    app = createApp({ pool: scopedPool, authRequired: false });
  });

  afterEach(async () => {
    await scopedPool.end();
    await adminPool.query(`DROP SCHEMA "${schema}" CASCADE`);
    await adminPool.end();
  });

  it("detects the PDF by magic bytes, parses it, and quarantines on the real amount imbalance", async () => {
    const pdfResponse = await app.handle(uploadRequest(readFileSync(realPdfPath), "999210.pdf"));
    expect(pdfResponse.status).toBe(200);
    const pdfBody = (await pdfResponse.json()) as {
      status: string;
      report: { invoiceNumber: string; reconcile: { balanced: boolean; amountImbalances: Array<{ productCode: string }> } };
    };
    // A parser rejection or a resolution miss would also quarantine — the
    // amount imbalance is what actually happens for this file, so it's what
    // proves the PDF (not the CSV) was the one parsed.
    expect(pdfBody.status).toBe("quarantined");
    expect(pdfBody.report.invoiceNumber).toBe("999210");
    expect(pdfBody.report.reconcile.balanced).toBe(false);
    expect(pdfBody.report.reconcile.amountImbalances.map((a) => a.productCode).sort()).toEqual(["DF", "TA"]);

    // The quarantined row still claims invoice_number 999210, so the CSV
    // upload right after it is the 409 CONFLICT case, not a fresh import.
    const csvResponse = await app.handle(uploadRequest(readFileSync(realCsvPath), "999210.csv"));
    expect(csvResponse.status).toBe(409);
    expect(csvResponse.headers.get("content-type")).toBe("application/problem+json");
  });
});
