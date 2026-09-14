import { OrsRoutingProvider } from "./ors.js";
import type { RoutingProvider } from "./provider.js";

/**
 * §8.4: `ROUTING_PROVIDER` selects the adapter. Adopting HERE later is one
 * new adapter file plus one case here, with no caller changed.
 */
export function createRoutingProvider(
  providerName: string | undefined = process.env.ROUTING_PROVIDER,
): RoutingProvider {
  switch (providerName) {
    case "ors":
      return new OrsRoutingProvider();
    default:
      throw new Error(`Unknown routing provider: ${String(providerName)}`);
  }
}
