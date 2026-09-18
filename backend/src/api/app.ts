import type { Pool } from "pg";
import { getPool } from "../db/pool.js";
import { handleGetOverview } from "./routes/overview.js";
import { handleGetTransaction, handleListTransactions } from "./routes/transactions.js";
import { problemResponse } from "./problem.js";

/**
 * The framework-free API (§13). `handle()` takes a standard `Request` and
 * returns a standard `Response`, so the whole thing mounts in one Next route
 * file and is exercisable in a unit test with no server and no session.
 *
 * This is still a stub for most of the surface: T-16 replaces the
 * hard-coded branches below with a real route table (`GET /plans/{id}`,
 * `POST /plans`, ...). T-32 and T-33 add `/transactions` and `/overview`
 * directly to this stub rather than waiting on that table — TICKETS-v2.md's
 * critical path does not route either through T-16.
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

export interface App {
  readonly authRequired: boolean;
  handle(request: Request): Promise<Response>;
}

export function createApp(options: CreateAppOptions = {}): App {
  const authRequired = options.authRequired ?? true;

  return {
    authRequired,
    async handle(request: Request): Promise<Response> {
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

      return problemResponse({
        title: "Not Found",
        status: 404,
        detail: `No route for ${request.method} ${path}`,
        instance: url.pathname,
      });
    },
  };
}
