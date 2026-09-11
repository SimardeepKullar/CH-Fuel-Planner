import { useState } from "react";
import type { CompletedPlanResponse, PlanStop } from "@ch/core/domain/planResponse";
import Corners from "./Corners";
import RouteMap from "./RouteMap";
import {
  formatCurrency,
  formatDistanceMiles,
  formatDuration,
  formatGallons,
  formatPricePerGallon,
} from "../lib/format";
import {
  sheetDates,
  sheetStations,
  sheetStationCount,
  sheetLoadedNote,
  sheetArchivedNote,
} from "../data/trips";

interface PlanTabProps {
  trip: CompletedPlanResponse;
}

/**
 * Driver pay per mile of detour. A business input that belongs in config,
 * surfaced on the response once T-18 adds `detourCostUsd`/`costPerMile`
 * (UI-DATA-CONTRACT §6.4) — computed here client-side in the meantime,
 * exactly as the pre-migration mock hard-coded it.
 */
const DETOUR_COST_PER_MILE_USD = 0.6;

/** Cheapest-along-route bar width, scaled within this trip's own stops. */
function barWidthPercent(price: number, min: number, max: number): number {
  if (max === min) return 70;
  return 45 + ((price - min) / (max - min)) * 50;
}

function cheapestAlongRoute(stops: PlanStop[]) {
  const sorted = [...stops].sort((a, b) => a.unitPriceUsd - b.unitPriceUsd);
  const prices = sorted.map((s) => s.unitPriceUsd);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return sorted.map((s) => ({
    station: s.station,
    unitPriceUsd: s.unitPriceUsd,
    widthPercent: barWidthPercent(s.unitPriceUsd, min, max),
  }));
}

export default function PlanTab({ trip }: PlanTabProps) {
  const [sheetDate, setSheetDate] = useState(sheetDates[0]);
  const [showAllStations, setShowAllStations] = useState(false);

  const isToday = sheetDate === sheetDates[0];
  const { optimized, baseline, stops } = trip;
  const detourCostUsd = stops.reduce((sum, s) => sum + s.detourMiles, 0) * DETOUR_COST_PER_MILE_USD;
  const cheapest = cheapestAlongRoute(stops);

  return (
    <section className="plan-grid">
      <div className="plan-left">
        <RouteMap stops={stops} sheetStations={sheetStations} showAllStations={showAllStations} />

        <div className="route-form">
          <div className="field">
            <label>Source</label>
            <input className="input" value={trip.origin.label} readOnly />
          </div>
          <div className="field">
            <label>Destination</label>
            <input className="input" value={trip.destination.label} readOnly />
          </div>
          <button className="btn btn-primary blueprint">
            <Corners />
            Plan route
          </button>
        </div>

        <div className="stat-grid">
          <div className="stat-cell">
            <span className="stat-label">Fuel cost</span>
            <span className="stat-value">{formatCurrency(optimized.totalFuelCostUsd)}</span>
            <span className="stat-sub">{formatGallons(optimized.totalGallons)}</span>
          </div>
          <div className="stat-cell">
            <span className="stat-label">Saved</span>
            <span className="stat-value stat-value-accent">
              −{formatCurrency(optimized.savingsVsBaselineUsd)}
            </span>
            <span className="stat-sub">vs the corridor baseline</span>
          </div>
          <div className="stat-cell">
            <span className="stat-label">Distance</span>
            <span className="stat-value">
              {optimized.distanceMiles.toFixed(1)} <span className="stat-unit">mi</span>
            </span>
            <span className="stat-sub">
              +{optimized.addedDistanceMiles.toFixed(1)} mi of detour · direct{" "}
              {baseline.distanceMiles.toFixed(1)} mi
            </span>
          </div>
          <div className="stat-cell">
            <span className="stat-label">Driving time</span>
            <span className="stat-value">{formatDuration(optimized.durationSeconds)}</span>
            <span className="stat-sub">excludes time at the pump</span>
          </div>
          <div className="stat-cell">
            <span className="stat-label">Stops</span>
            <span className="stat-value">{stops.length}</span>
            <span className="stat-sub">within the leg bounds</span>
          </div>
          <div className="stat-cell">
            <span className="stat-label">Detour cost</span>
            <span className="stat-value stat-value-muted">{formatCurrency(detourCostUsd)}</span>
            <span className="stat-sub">driver pay only, ${DETOUR_COST_PER_MILE_USD.toFixed(2)}/mi</span>
          </div>
        </div>
      </div>

      <div className={`plan-right${isToday ? "" : " sheet-archived"}`}>
        <div className="sheet-bar">
          <div className="sheet-bar-select">
            <span className="stat-label">Fuel prices effective</span>
            <select
              className="input sheet-date"
              value={sheetDate}
              onChange={(e) => setSheetDate(e.target.value)}
            >
              {sheetDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <span className="sheet-note">{isToday ? sheetLoadedNote : sheetArchivedNote}</span>
        </div>

        <div className="panel-card blueprint sheet-card">
          <Corners />
          <div className="panel-card-title">Cheapest along route · $/gal</div>
          <div className="price-bars">
            {cheapest.map((c) => (
              <div className="price-bar-row" key={c.station.id}>
                <span>{c.station.name}</span>
                <div className="price-bar-track" style={{ width: `${c.widthPercent}%` }} />
                <span>{formatPricePerGallon(c.unitPriceUsd, 2)}</span>
              </div>
            ))}
          </div>
          <button
            className="btn-secondary-flat"
            onClick={() => setShowAllStations((v) => !v)}
          >
            {showAllStations
              ? "Hide all sheet stations on map"
              : `Show all sheet stations on map (${sheetStationCount})`}
          </button>
        </div>

        <div className="panel-card blueprint sheet-card">
          <Corners />
          <div className="panel-card-header">
            <div className="panel-card-title">Recommended order</div>
            <span className="panel-card-sub">price + detour + hours</span>
          </div>
          <div className="stop-list">
            {stops.map((stop, i) => (
              <div key={stop.seq} className={`stop-row${i === 0 ? " top blueprint" : ""}`}>
                {i === 0 && <Corners />}
                <span className="stop-rank">{stop.seq}</span>
                <div>
                  <div className="stop-title">
                    {stop.station.name} · mi {Math.round(stop.cumulativeDistanceMiles)}
                  </div>
                  <div className="stop-sub">
                    {formatDistanceMiles(stop.detourMiles)} detour ·{" "}
                    {formatGallons(stop.purchaseGallons)}
                  </div>
                </div>
                <span className="stop-price">{formatPricePerGallon(stop.unitPriceUsd, 2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card blueprint driver-link">
          <Corners />
          <div className="panel-card-header">
            <span className="panel-card-title">Driver route link</span>
            <span className="panel-card-sub">placeholder · stops in order</span>
          </div>
          <div className="driver-link-row">
            <input className="input driver-link-url" value={trip.googleMapsUrl} readOnly />
            <a
              className="btn btn-primary blueprint"
              href={trip.googleMapsUrl}
              target="_blank"
              rel="noopener"
            >
              <Corners />
              Open
            </a>
            <button className="btn btn-ghost">Copy</button>
          </div>
          <span className="driver-link-note">
            Send to the driver — opens turn-by-turn with every recommended stop as a
            waypoint.
          </span>
        </div>
      </div>
    </section>
  );
}
