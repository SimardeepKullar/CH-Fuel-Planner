import { useState } from "react";
import type { PlanStop } from "@ch/core/domain/planResponse";
import type { PlaceholderStation } from "../data/trips";
import {
  formatCurrency,
  formatDistanceMiles,
  formatGallons,
  formatPricePerGallon,
} from "../lib/format";
import Corners from "./Corners";

interface RouteMapProps {
  stops: PlanStop[];
  sheetStations: PlaceholderStation[];
  showAllStations: boolean;
}

type Hover =
  | { kind: "stop"; left: string; top: string; flip: boolean; stop: PlanStop }
  | { kind: "candidate"; left: string; top: string; flip: boolean; station: PlaceholderStation };

// Placeholder geometry. The real map (T-22, MapLibre) positions pins from
// lat/lng; until then every numbered stop is laid out along the same drawn
// diagonal so the panel reads correctly with any number of stops.
function pinPos(index: number) {
  const t = 0.2 + index * 0.16;
  return {
    x: (12 + 74 * t).toFixed(1) + "%",
    y: (70 - 18.5 * t).toFixed(1) + "%",
    tooltipY: (70 - 18.5 * t - 26).toFixed(1) + "%",
    flip: 12 + 74 * t > 52,
  };
}

export default function RouteMap({ stops, sheetStations, showAllStations }: RouteMapProps) {
  const [hover, setHover] = useState<Hover | null>(null);

  const clear = () => setHover(null);

  return (
    <div className="map-canvas blueprint">
      <Corners />

      <div className="route-line" />
      <div className="pt-origin" />
      <div className="pt-dest" />

      {stops.map((s, i) => {
        const p = pinPos(i);
        return (
          <div
            key={s.seq}
            className="pin-stop"
            style={{ left: p.x, top: p.y }}
            onMouseEnter={() =>
              setHover({ kind: "stop", left: p.x, top: p.tooltipY, flip: p.flip, stop: s })
            }
            onMouseLeave={clear}
          >
            {s.seq}
          </div>
        );
      })}

      {showAllStations &&
        sheetStations.map((c) => (
          <div
            key={c.name}
            className="pin-candidate"
            style={{ left: `${c.x}%`, top: `${c.y}%` }}
            onMouseEnter={() =>
              setHover({
                kind: "candidate",
                left: `${c.x}%`,
                top: `calc(${c.y}% - 96px)`,
                flip: c.x > 52,
                station: c,
              })
            }
            onMouseLeave={clear}
          />
        ))}

      {hover?.kind === "stop" && (
        <div
          className="map-tip map-tip-stop"
          style={{
            left: hover.left,
            top: hover.top,
            transform: hover.flip ? "translate(-100%, 0)" : "none",
          }}
        >
          <div className="map-tip-title">
            {hover.stop.seq}. {hover.stop.station.name.toUpperCase()}
          </div>
          <div className="map-tip-place">
            {hover.stop.station.city}, {hover.stop.station.state}
          </div>
          <dl className="map-tip-rows">
            <dt>Price</dt>
            <dd>{formatPricePerGallon(hover.stop.unitPriceUsd, 2)}/gal</dd>
            <dt>Buy</dt>
            <dd>{formatGallons(hover.stop.purchaseGallons)}</dd>
            <dt>Arrive with</dt>
            <dd>{formatGallons(hover.stop.arrivalGallons)}</dd>
            <dt>Detour</dt>
            <dd>{formatDistanceMiles(hover.stop.detourMiles)}</dd>
            <dt>Cumulative</dt>
            <dd>{formatDistanceMiles(hover.stop.cumulativeDistanceMiles)}</dd>
            <dt>Stop cost</dt>
            <dd>{formatCurrency(hover.stop.stopCostUsd)}</dd>
          </dl>
        </div>
      )}

      {hover?.kind === "candidate" && (
        <div
          className="map-tip map-tip-candidate"
          style={{
            left: hover.left,
            top: hover.top,
            transform: hover.flip ? "translate(-100%, 0)" : "none",
          }}
        >
          <div className="map-tip-title">{hover.station.name}</div>
          <div className="map-tip-place">{hover.station.place}</div>
          <dl className="map-tip-rows">
            <dt>Price</dt>
            <dd>{formatPricePerGallon(hover.station.price)}/gal</dd>
            <dt>Along route</dt>
            <dd>{formatDistanceMiles(hover.station.alongMi)}</dd>
          </dl>
          <div className="map-tip-note">Not selected by the optimiser.</div>
        </div>
      )}

      <div className="map-legend">
        <span>
          <i className="key-line" />
          planned route
        </span>
        <span>
          <i className="key-stop" />
          fuel stop
        </span>
        <span>
          <i className="key-candidate" />
          candidate, not chosen
        </span>
      </div>
    </div>
  );
}
