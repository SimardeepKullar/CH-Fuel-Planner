import type {
  MatrixRequest,
  MatrixResult,
  RouteRequest,
  RouteResult,
  RoutingProvider,
} from "./provider.js";

/**
 * `driving-hgv` — truck-legal routing from the profile's physical spec
 * (§16). Full request/response handling lands in T-10 step 10.2.
 */
export class OrsRoutingProvider implements RoutingProvider {
  readonly name = "ors" as const;

  route(_req: RouteRequest): Promise<RouteResult> {
    return Promise.reject(new Error("OrsRoutingProvider.route is not yet implemented"));
  }

  matrix(_req: MatrixRequest): Promise<MatrixResult> {
    return Promise.reject(new Error("OrsRoutingProvider.matrix is not yet implemented"));
  }
}
