/**
 * The framework-free API (§13). `handle()` takes a standard `Request` and
 * returns a standard `Response`, so the whole thing mounts in one Next route
 * file and is exercisable in a unit test with no server and no session.
 *
 * This is a stub: T-16 replaces the two hard-coded branches with a real
 * route table (`GET /plans/{id}`, `POST /plans`, ...), and T-05 adds the
 * `authRequired` option this factory is named for.
 *
 * STOPGAP, flagged for T-16: this file deliberately does not import
 * `problemResponse` from `./problem.ts`, even though that is the canonical
 * RFC 9457 helper and everything else should use it. Next's Turbopack
 * bundles this file directly when it's mounted at
 * `frontend/src/app/api/v1/[[...path]]/route.ts` — it resolves the
 * `@ch/core/api/app` package specifier fine, but not a further relative
 * import inside it, because backend's NodeNext convention requires the
 * literal `./problem.js` specifier for `problem.ts`, and Turbopack has no
 * equivalent of webpack's `resolve.extensionAlias` (the standard fix for
 * this exact interop case) to remap it. T-16's real route table will have
 * much deeper import chains into `backend/src` and will need a durable
 * answer — a webpack fallback with `extensionAlias`, or giving backend a
 * build step — rather than more inlining like this.
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

      return new Response(
        JSON.stringify({
          type: "about:blank",
          title: "Not Found",
          status: 404,
          detail: `No route for ${request.method} ${path}`,
          instance: url.pathname,
        }),
        { status: 404, headers: { "content-type": "application/problem+json" } },
      );
    },
  };
}
