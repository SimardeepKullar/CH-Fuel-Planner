import type { Pool } from "pg";
import { getPool } from "../db/pool.js";
import { handleGetDriver, handleListDrivers } from "./routes/drivers.js";
import { handleListExpressCharges } from "./routes/expressCharges.js";
import { handleGetInvoice, handleImportInvoice, handleListInvoices } from "./routes/invoices.js";
import { handleGetOverview } from "./routes/overview.js";
import { handleGetReceiptQueue, handlePostReceiptChecks } from "./routes/receipts.js";
import { handleGetTransaction, handleListTransactions } from "./routes/transactions.js";
import { handleGetTruck, handleListTrucks } from "./routes/trucks.js";
import { problemResponse } from "./problem.js";

/**
 * The framework-free API (§13). `handle()` takes a standard `Request` and
 * returns a standard `Response`, so the whole thing mounts in one Next route
 * file and is exercisable in a unit test with no server and no session.
 *
 * This is still a stub for most of the surface: T-16 replaces the
 * hard-coded branches below with a real route table (`GET /plans/{id}`,
 * `POST /plans`, ...). T-32, T-33, and T-34 add `/transactions`, `/overview`,
 * and `/invoices` directly to this stub rather than waiting on that table —
 * TICKETS-v2.md's critical path does not route any of them through T-16.
 */
export interface CreateAppOptions {
  /**
   * Whether the caller is expected to sit behind an authentication
   * boundary. The app is *told* this — it does not check a session itself,
   * since a framework-free module has no cookie/JWT parsing of its own.
   * Real enforcement is frontend/src/middleware.ts (T-05 §13). This option
   * exists so a caller that deliberately runs with no boundary — a unit
   * test, or T-16's `cli/serve.ts` local dev server — can say so, rather
   * than every test needing a session to exist.
   */
  authRequired?: boolean;
  /**
   * Injected for tests (a schema-scoped pool over a fixture). Production
   * (`frontend/src/app/api/v1/[[...path]]/route.ts`) omits this and each
   * DB-backed route resolves `getPool()` lazily instead — so a request for
   * `/health` alone never requires `DATABASE_URL` to be set.
   */
  pool?: Pool;
}

/**
 * Per-request identity. A bare `Request` carries no session of its own
 * (§13's framework-free boundary), so a route that needs to attribute a
 * write to a person — `receipt_checks.checked_by` is the first one — has
 * nowhere else to read it from. `frontend/src/app/api/v1/[[...path]]/
 * route.ts` calls `auth()` server-side and passes the result through here;
 * a bare `handle(request)` (every existing unit/integration test) simply
 * carries no identity.
 */
export interface HandleContext {
  userId?: string;
}

export interface App {
  readonly authRequired: boolean;
  handle(request: Request, context?: HandleContext): Promise<Response>;
}

/**
 * `/receipt-queue` and `/receipt-checks` need `context.userId` unconditionally,
 * not gated by `authRequired`: unlike every other route so far, the id isn't
 * just a boundary check, it's data the write persists
 * (`receipt_checks.checked_by`) — there is no meaningful way to serve either
 * route without it, whether or not the caller opted out of the auth
 * boundary for everything else.
 */
function requireUser(context: HandleContext | undefined, url: URL): Response | null {
  if (context?.userId) {
    return null;
  }
  return problemResponse({
    title: "Unauthorized",
    status: 401,
    detail: `Authentication required for ${url.pathname}`,
    instance: url.pathname,
  });
}

export function createApp(options: CreateAppOptions = {}): App {
  const authRequired = options.authRequired ?? true;

  return {
    authRequired,
    async handle(request: Request, context?: HandleContext): Promise<Response> {
      const url = new URL(request.url);
      const path = url.pathname.replace(/^\/api\/v1/, "") || "/";

      if (path === "/health" && request.method === "GET") {
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (path === "/transactions" && request.method === "GET") {
        return handleListTransactions(options.pool ?? getPool(), url);
      }

      const transactionDetailMatch = /^\/transactions\/([^/]+)$/.exec(path);
      if (transactionDetailMatch && request.method === "GET") {
        return handleGetTransaction(options.pool ?? getPool(), transactionDetailMatch[1]!, url);
      }

      if (path === "/overview" && request.method === "GET") {
        return handleGetOverview(options.pool ?? getPool(), url);
      }

      if (path === "/express-charges" && request.method === "GET") {
        return handleListExpressCharges(options.pool ?? getPool(), url);
      }

      if (path === "/drivers" && request.method === "GET") {
        return handleListDrivers(options.pool ?? getPool(), url);
      }

      const driverDetailMatch = /^\/drivers\/([^/]+)$/.exec(path);
      if (driverDetailMatch && request.method === "GET") {
        return handleGetDriver(options.pool ?? getPool(), driverDetailMatch[1]!, url);
      }

      if (path === "/trucks" && request.method === "GET") {
        return handleListTrucks(options.pool ?? getPool(), url);
      }

      const truckDetailMatch = /^\/trucks\/([^/]+)$/.exec(path);
      if (truckDetailMatch && request.method === "GET") {
        return handleGetTruck(options.pool ?? getPool(), truckDetailMatch[1]!, url);
      }

      if (path === "/invoices/import" && request.method === "POST") {
        return handleImportInvoice(options.pool ?? getPool(), request, url);
      }

      if (path === "/invoices" && request.method === "GET") {
        return handleListInvoices(options.pool ?? getPool(), url);
      }

      const invoiceDetailMatch = /^\/invoices\/([^/]+)$/.exec(path);
      if (invoiceDetailMatch && request.method === "GET") {
        return handleGetInvoice(options.pool ?? getPool(), invoiceDetailMatch[1]!, url);
      }

      if (path === "/receipt-queue" && request.method === "GET") {
        const unauthorized = requireUser(context, url);
        if (unauthorized) {
          return unauthorized;
        }
        return handleGetReceiptQueue(options.pool ?? getPool(), url);
      }

      if (path === "/receipt-checks" && request.method === "POST") {
        const unauthorized = requireUser(context, url);
        if (unauthorized) {
          return unauthorized;
        }
        return handlePostReceiptChecks(options.pool ?? getPool(), request, url, context!.userId!);
      }

      return problemResponse({
        title: "Not Found",
        status: 404,
        detail: `No route for ${request.method} ${path}`,
        instance: url.pathname,
      });
    },
  };
}
