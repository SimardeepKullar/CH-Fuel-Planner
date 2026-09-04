export default function PlanTab({ trip }) {
  return (
    <section className="panel">
      <div className="plan-grid">
        <div className="plan-left">
          <div className="map-canvas">
            <div className="route-line" />
            <div className="pt-origin" />
            <div className="pt-dest" />
            <div className="pt-stop" style={{ left: "34%", top: "60%" }} />
            <div className="pt-stop" style={{ left: "56%", top: "56%" }} />
            <span className="map-label">map canvas</span>
          </div>

          <div className="route-form">
            <div className="field">
              <label>Source</label>
              <input className="input" value={trip.source} readOnly />
            </div>
            <div className="field">
              <label>Destination</label>
              <input className="input" value={trip.dest} readOnly />
            </div>
            <button className="btn btn-primary">Plan route</button>
          </div>

          <div className="stat-row">
            <span>{trip.miles}</span>
            <span>{trip.hours}</span>
            <span>Est. fuel {trip.gal}</span>
            <span className="stat-save">Save {trip.save} vs. default</span>
          </div>
        </div>

        <div className="plan-right">
          <div className="panel-card">
            <div className="panel-card-title">Cheapest along route · $/gal</div>
            <div className="price-bars">
              {trip.cheapest.map((c) => (
                <div className="price-bar-row" key={c.n}>
                  <span>{c.n}</span>
                  <div
                    className={`price-bar-track${c.w >= 80 ? " dim" : ""}`}
                    style={{ width: `${c.w}%` }}
                  />
                  <span>{c.p}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-card-header">
              <div className="panel-card-title">Recommended order</div>
              <span className="panel-card-sub">price + detour + hours</span>
            </div>
            <div className="stop-list">
              {trip.stops.map((s) => (
                <div className={`stop-row${s.top ? " top" : ""}`} key={s.r}>
                  <span className="stop-rank">{s.r}</span>
                  <div>
                    <div className="stop-title">{s.t}</div>
                    <div className="stop-sub">{s.s}</div>
                  </div>
                  <span className="stop-price">{s.p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
