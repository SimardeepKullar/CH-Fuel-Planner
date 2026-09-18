import type { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

/** A pool that fails the test the moment anything on it is called — proves
 * the 401 path below never reaches the database. */
const untouchedPool = new Proxy(
  {},
  {
    get(): never {
      throw new Error("route touched the database before it should have");
    },
  },
) as Pool;

describe("createApp", () => {
  it("is callable with no server and no session", async () => {
    const app = createApp();
    const response = await app.handle(new Request("http://localhost/api/v1/health"));
    expect(response.status).toBe(200);
  });

  it("returns a stub 200 for GET /health", async () => {
    const app = createApp();
    const response = await app.handle(new Request("http://localhost/api/v1/health"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json");
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("returns an unknown path as a 404 problem+json, not HTML", async () => {
    const app = createApp();
    const response = await app.handle(new Request("http://localhost/api/v1/nope"));

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    const body = (await response.json()) as { title: string; status: number };
    expect(body.title).toBe("Not Found");
    expect(body.status).toBe(404);
  });

  it("defaults to authRequired: true", () => {
    const app = createApp();
    expect(app.authRequired).toBe(true);
  });

  it("createApp({ authRequired: false }) serves API tests with no session", async () => {
    const app = createApp({ authRequired: false });
    expect(app.authRequired).toBe(false);

    const response = await app.handle(new Request("http://localhost/api/v1/health"));
    expect(response.status).toBe(200);
  });

  it("GET /receipt-queue with no identity in context is a 401 problem+json, without touching the database", async () => {
    const app = createApp({ pool: untouchedPool });
    const response = await app.handle(new Request("http://localhost/api/v1/receipt-queue"));
    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
  });

  it("POST /receipt-checks with no identity in context is a 401 problem+json, without touching the database", async () => {
    const app = createApp({ pool: untouchedPool });
    const response = await app.handle(
      new Request("http://localhost/api/v1/receipt-checks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fuelStopId: "11111111-1111-1111-1111-111111111111", outcome: "confirmed" }),
      }),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
  });

  it("authRequired: false does not exempt the receipt routes from needing an identity — they still 401 with none", async () => {
    // Unlike every other route, the receipt routes need context.userId as
    // data (receipt_checks.checked_by), not just as a boundary check, so
    // requireUser() ignores authRequired entirely (see app.ts).
    const app = createApp({ authRequired: false, pool: untouchedPool });
    const response = await app.handle(new Request("http://localhost/api/v1/receipt-queue"));
    expect(response.status).toBe(401);
  });
});
