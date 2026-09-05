import { useState } from "react";
import Corners from "./Corners.jsx";

// Placeholder geometry. The real map will position pins from lat/lon; until
// then every pin is laid out along the same drawn diagonal so the panel reads
// correctly with any number of stops.
function pinPos(index) {
  const t = 0.2 + index * 0.16;
  return {
    x: (12 + 74 * t).toFixed(1) + "%",
    y: (70 - 18.5 * t).toFixed(1) + "%",
    tooltipY: (70 - 18.5 * t - 26).toFixed(1) + "%",
    flip: 12 + 74 * t > 52,
  };
}

export default function RouteMap({ stops, sheetStations, showAllStations }) {
  const [hover, setHover] = useState(null);

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
            key={s.rank}
            className="pin-stop"
            style={{ left: p.x, top: p.y }}
            onMouseEnter={() =>
              setHover({ kind: "stop", left: p.x, top: p.tooltipY, flip: p.flip, stop: s })
            }
            onMouseLeave={clear}
          >
            {s.rank}
          </div>
        );
      })}

      {showAllStations &&
        sheetStations.map((c) => (
          <div
            key={c.name}
            className="pin-candidate"
            style={{ left: c.x, top: c.y }}
            onMouseEnter={() =>
              setHover({
                kind: "candidate",
                left: c.x,
                top: `calc(${c.y} - 96px)`,
                flip: parseFloat(c.x) > 52,
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
            {hover.stop.rank}. {hover.stop.station.toUpperCase()}
          </div>
          <div className="map-tip-place">{hover.stop.place}</div>
          <dl className="map-tip-rows">
            <dt>Price</dt>
            <dd>{hover.stop.price}/gal</dd>
            <dt>Buy</dt>
            <dd>{hover.stop.buy}</dd>
            <dt>Arrive with</dt>
            <dd>{hover.stop.arrive}</dd>
            <dt>Detour</dt>
            <dd>{hover.stop.detour}</dd>
            <dt>Cumulative</dt>
            <dd>{hover.stop.cumulative}</dd>
            <dt>Stop cost</dt>
            <dd>{hover.stop.stopCost}</dd>
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
            <dd>${hover.station.price}/gal</dd>
            <dt>Along route</dt>
            <dd>{hover.station.alongMi} mi</dd>
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
