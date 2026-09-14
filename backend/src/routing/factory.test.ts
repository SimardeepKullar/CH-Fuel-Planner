import { describe, expect, it } from "vitest";
import { createRoutingProvider } from "./factory.js";
import { OrsRoutingProvider } from "./ors.js";

describe("createRoutingProvider", () => {
  it("returns the ORS adapter for 'ors'", () => {
    const provider = createRoutingProvider("ors");
    expect(provider).toBeInstanceOf(OrsRoutingProvider);
    expect(provider.name).toBe("ors");
  });

  it("throws on an unknown provider", () => {
    expect(() => createRoutingProvider("here")).toThrow(/unknown routing provider/i);
    expect(() => createRoutingProvider(undefined)).toThrow(/unknown routing provider/i);
  });
});
