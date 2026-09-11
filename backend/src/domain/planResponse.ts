import type { PriceBasis, StationResolution, StopType, TruckAccessible } from "../db/types.js";

/**
 * Shared shapes for `POST /plans` / `GET /plans/{id}` (§14, UI contract §3).
 * The frontend mock (T-04) types its fixture data against these so T-21 swaps
 * a data source instead of reshaping every component a second time.
 *
 * Storage is miles and gallons; conversion happens at the API boundary only
 * (§6 decision 16) — these are the boundary shapes, already in display units.
 */

export type Units = "imperial" | "metric";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface AddressInput {
  address: string;
}

export type LocationInput = AddressInput | LatLng;

/**
 * `POST /plans` request body (§14). Several fields are genuinely nullable —
 * "no cap" — and must never be coerced to `0`, which is a different, valid
 * value (e.g. zero extra stops allowed vs. no limit on stops at all).
 */
export interface CreatePlanRequest {
  origin: LocationInput;
  destination: LocationInput;
  truckProfileId: string;

  /** null = tank capacity (100%). */
  startFuelGallons: number | null;
  /** null = the truck profile's reserve level. */
  minArrivalGallons: number | null;
  /** null = the truck profile's default. */
  maxLegMiles: number | null;
  /** null = the truck profile's default; auto-relaxed if infeasible (§5.1). */
  minLegMiles: number | null;
  /** null = no cap on a single stop's detour. */
  maxDetourMiles: number | null;
  /** null = no limit on stop count. */
  maxStops: number | null;
  priceBasis: PriceBasis;
  driverCostPerHour: number;
  fixedStopMinutes: number;
  /** Optional override of the registered optimiser (§13.1). */
  optimizerStrategy?: string;
  /** Re-price against a historical sheet (UI contract §3.6); null = latest. */
  priceEffectiveOn?: string | null;
  departAt: string | null;
}

export interface TruckProfileSummary {
  slug: string;
  displayName: string;
  maxLegMiles: number;
}

export interface RouteBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface RouteGeometrySummary {
  polyline: string | null;
  distanceMiles: number;
  durationSeconds: number;
  bounds: RouteBounds;
}

/** The baseline (direct, unoptimized) route. */
export interface RouteSummary extends RouteGeometrySummary {
  estimatedFuelCostUsd: number;
}

/** The solved route — supersedes `estimatedFuelCostUsd` with a real total. */
export interface OptimizedRouteSummary extends RouteGeometrySummary {
  totalFuelCostUsd: number;
  totalGallons: number;
  savingsVsBaselineUsd: number;
  addedDistanceMiles: number;
  addedDurationSeconds: number;
}

export interface StationLocationSummary {
  id: string;
  name: string;
  storeNumber: number | null;
  city: string;
  state: string;
  location: LatLng;
  resolution: StationResolution;
  uncertaintyMeters: number;
  truckAccessible: TruckAccessible;
}

export interface PlanStop {
  seq: number;
  stopType: StopType;
  station: StationLocationSummary;
  legDistanceMiles: number;
  detourMiles: number;
  detourSeconds: number;
  unitPriceUsd: number;
  arrivalGallons: number;
  purchaseGallons: number;
  departureGallons: number;
  stopCostUsd: number;
  cumulativeDistanceMiles: number;
  cumulativeDurationSeconds: number;
  arrivalFuelPercent: number;
}

/**
 * §14 leaves this as a comment stub; T-18 specifies it fully. This is the
 * minimum UI contract §3.3 names, enough for T-04's mock to type against —
 * the candidate dot layer, its hover card, and the cheapest-along-route chart.
 */
export interface CandidateStation {
  id: string;
  name: string;
  city: string;
  state: string;
  location: LatLng;
  unitPriceUsd: number;
  distanceAlongRouteMiles: number;
  detourMiles: number;
}

export type DisclaimerCode =
  | "GOOGLE_LINK_NOT_TRUCK_LEGAL"
  | "ACCESSIBILITY_UNVERIFIED"
  | "MIN_LEG_RELAXED"
  | "PRICE_STALENESS";

export interface Disclaimer {
  code: DisclaimerCode;
  message: string;
}

export interface Attribution {
  routing: string;
  placeData: string;
}

export type InfeasibleSuggestion =
  | { action: "increaseDetour"; maxDetourMiles: number }
  | { action: "increaseMaxLeg"; maxLegMiles: number }
  | { action: "allowOffNetworkStop"; note: string };

export interface InfeasibleReason {
  code: string;
  message: string;
  gapStartMile: number;
  gapEndMile: number;
  gapMiles: number;
  maxLegMiles: number;
  suggestions: InfeasibleSuggestion[];
}

/**
 * A geocoded endpoint, echoed back so the lane form shows what was actually
 * resolved rather than what was typed (UI contract §3.1, §3.4). §14's sample
 * payload doesn't yet carry this — UI contract §3.1 names it as a gap for
 * T-18 to close; it's added here so the Plan tab's Source/Destination fields
 * have something typed to render against in the meantime.
 */
export interface ResolvedLocation {
  label: string;
  location: LatLng;
}

interface PlanResponseBase {
  planId: string;
  /** `plans.created_at` — omitted from §14's illustrative sample, not a gap. */
  createdAt: string;
  origin: ResolvedLocation;
  destination: ResolvedLocation;
  /** Corridor stations not selected — the map's dot layer. */
  candidateStations: CandidateStation[];
}

export interface CompletedPlanResponse extends PlanResponseBase {
  status: "completed";
  units: Units;
  priceAsOf: string;
  optimizerStrategy: string;
  truckProfile: TruckProfileSummary;
  baseline: RouteSummary;
  optimized: OptimizedRouteSummary;
  stops: PlanStop[];
  googleMapsUrl: string;
  disclaimers: Disclaimer[];
  attribution: Attribution;
}

export interface InfeasiblePlanResponse extends PlanResponseBase {
  status: "infeasible";
  reason: InfeasibleReason;
}

/** `GET /plans/{id}` (§14) — exactly two shapes, discriminated on `status`. */
export type PlanResponse = CompletedPlanResponse | InfeasiblePlanResponse;
