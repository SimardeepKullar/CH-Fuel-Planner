import { getPool } from "../db/pool.js";
import { OrsRoutingProvider } from "./ors.js";
import type { RoutingProvider } from "./provider.js";

/**
 * §8.4: `ROUTING_PROVIDER` selects the adapter. Adopting HERE later is one
 * new adapter file plus one case here, with no caller changed. The real
 * pool wires up both meters (§8.3) — the budget guard and quota observer —
 * so production calls are metered; tests construct the adapter directly
 * without a pool to stay off the database.
 */
export function createRoutingProvider(
  providerName: string | undefined = process.env.ROUTING_PROVIDER,
): RoutingProvider {
  switch (providerName) {
    case "ors":
      return new OrsRoutingProvider({ pool: getPool() });
    default:
      throw new Error(`Unknown routing provider: ${String(providerName)}`);
  }
}
