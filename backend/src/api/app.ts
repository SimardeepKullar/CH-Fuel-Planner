import { problemResponse } from "./problem.js";

/**
 * The framework-free API (§13). `handle()` takes a standard `Request` and
 * returns a standard `Response`, so the whole thing mounts in one Next route
 * file and is exercisable in a unit test with no server and no session.
 *
 * This is a stub: T-16 replaces the two hard-coded branches with a real
 * route table (`GET /plans/{id}`, `POST /plans`, ...).
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

      return problemResponse({
        title: "Not Found",
        status: 404,
        detail: `No route for ${request.method} ${path}`,
        instance: url.pathname,
      });
    },
  };
}
