import { useState } from "react";
import Corners from "./Corners.jsx";
import RouteMap from "./RouteMap.jsx";
import {
  sheetDates,
  sheetStations,
  sheetStationCount,
  sheetLoadedNote,
  sheetArchivedNote,
} from "../data/trips.js";

export default function PlanTab({ trip }) {
  const [sheetDate, setSheetDate] = useState(sheetDates[0]);
  const [showAllStations, setShowAllStations] = useState(false);

  const isToday = sheetDate === sheetDates[0];
  const s = trip.summary;

  return (
    <section className="plan-grid">
      <div className="plan-left">
        <RouteMap
          stops={trip.stops}
          sheetStations={sheetStations}
          showAllStations={showAllStations}
        />

        <div className="route-form">
          <div className="field">
            <label>Source</label>
            <input className="input" value={trip.source} readOnly />
          </div>
          <div className="field">
            <label>Destination</label>
            <input className="input" value={trip.dest} readOnly />
          </div>
          <button className="btn btn-primary blueprint">
            <Corners />
            Plan route
          </button>
        </div>

        <div className="stat-grid">
          <div className="stat-cell">
            <span className="stat-label">Fuel cost</span>
            <span className="stat-value">{s.fuelCost}</span>
            <span className="stat-sub">{s.fuelGal}</span>
          </div>
          <div className="stat-cell">
            <span className="stat-label">Saved</span>
            <span className="stat-value stat-value-accent">{s.saved}</span>
            <span className="stat-sub">vs the corridor baseline</span>
          </div>
          <div className="stat-cell">
            <span className="stat-label">Distance</span>
            <span className="stat-value">
              {s.dist} <span className="stat-unit">mi</span>
            </span>
            <span className="stat-sub">{s.distSub}</span>
          </div>
          <div className="stat-cell">
            <span className="stat-label">Driving time</span>
            <span className="stat-value">{s.driveTime}</span>
            <span className="stat-sub">excludes time at the pump</span>
          </div>
          <div className="stat-cell">
            <span className="stat-label">Stops</span>
            <span className="stat-value">{s.stopCount}</span>
            <span className="stat-sub">{s.stopsSub}</span>
          </div>
          <div className="stat-cell">
            <span className="stat-label">Detour cost</span>
            <span className="stat-value stat-value-muted">{s.detourCost}</span>
            <span className="stat-sub">driver pay only, $0.60/mi</span>
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
          <span className="sheet-note">
            {isToday ? sheetLoadedNote : sheetArchivedNote}
          </span>
        </div>

        <div className="panel-card blueprint sheet-card">
          <Corners />
          <div className="panel-card-title">Cheapest along route · $/gal</div>
          <div className="price-bars">
            {trip.cheapest.map((c) => (
              <div className="price-bar-row" key={c.name}>
                <span>{c.name}</span>
                <div className="price-bar-track" style={{ width: c.width }} />
                <span>{c.price}</span>
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
            {trip.stops.map((stop, i) => (
              <div
                key={stop.rank}
                className={`stop-row${i === 0 ? " top blueprint" : ""}`}
              >
                {i === 0 && <Corners />}
                <span className="stop-rank">{stop.rank}</span>
                <div>
                  <div className="stop-title">
                    {stop.station} · {stop.milepost}
                  </div>
                  <div className="stop-sub">
                    {stop.detour} detour · {stop.action}
                  </div>
                </div>
                <span className="stop-price">{stop.price}</span>
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
            <input className="input driver-link-url" value={trip.driverLink} readOnly />
            <a
              className="btn btn-primary blueprint"
              href={trip.driverLink}
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
