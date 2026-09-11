import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

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
});
