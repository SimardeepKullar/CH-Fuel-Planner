import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoutingProvider } from "./factory.js";
import { OrsRoutingProvider } from "./ors.js";

describe("createRoutingProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the ORS adapter for 'ors'", () => {
    const provider = createRoutingProvider("ors");
    expect(provider).toBeInstanceOf(OrsRoutingProvider);
    expect(provider.name).toBe("ors");
  });

  it("throws on an unknown provider", () => {
    expect(() => createRoutingProvider("here")).toThrow(/unknown routing provider/i);
    expect(() => createRoutingProvider("bogus")).toThrow(/unknown routing provider/i);
  });

  it("falls back to ROUTING_PROVIDER when no provider is given, and throws if that is unset too", () => {
    vi.stubEnv("ROUTING_PROVIDER", "ors");
    expect(createRoutingProvider().name).toBe("ors");

    vi.stubEnv("ROUTING_PROVIDER", "");
    expect(() => createRoutingProvider()).toThrow(/unknown routing provider/i);
  });
});
