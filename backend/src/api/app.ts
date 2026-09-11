import { problemResponse } from "./problem.js";

/**
 * The framework-free API (§13). `handle()` takes a standard `Request` and
 * returns a standard `Response`, so the whole thing mounts in one Next route
 * file and is exercisable in a unit test with no server and no session.
 *
 * This is a stub: T-16 replaces the two hard-coded branches with a real
 * route table (`GET /plans/{id}`, `POST /plans`, ...), and T-05 adds the
 * `authRequired` option this factory is named for.
 */
export interface App {
  handle(request: Request): Promise<Response>;
}

export function createApp(): App {
  return {
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
