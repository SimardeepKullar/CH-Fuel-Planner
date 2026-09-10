import Corners from "./Corners";

interface DevToolsTabProps {
  truck: string;
}

// Every field here is an uncontrolled placeholder. Nothing is persisted and
// "Apply & re-solve" is inert until the solver endpoint exists (T-21).
export default function DevToolsTab({ truck }: DevToolsTabProps) {
  return (
    <section className="dev-grid">
      <div className="panel-card blueprint dev-card">
        <Corners />
        <div className="panel-card-header">
          <div className="panel-card-title">Truck</div>
          <span className="tag tag-outline">{truck}</span>
        </div>
        <div className="dev-fields">
          <div className="field dev-field-full">
            <label>Truck name / unit</label>
            <input className="input" defaultValue="Truck 14-B — Volvo VNL 760" />
          </div>
          <div className="field">
            <label>Tank capacity (gal)</label>
            <input className="input" defaultValue="200" />
          </div>
          <div className="field">
            <label>Fuel economy (mpg)</label>
            <input className="input" defaultValue="7.5" />
          </div>
        </div>
        <div className="dev-fields">
          <div className="field">
            <label>Starting fuel (gal)</label>
            <input className="input" defaultValue="104" />
          </div>
          <div className="field">
            <label>Starting fuel (%)</label>
            <input className="input" defaultValue="52" />
          </div>
        </div>
        <div className="dev-foot">
          <span>Range on hand ≈ 780 mi</span>
          <span>Trip needs 68 gal</span>
        </div>
      </div>

      <div className="panel-card blueprint dev-card">
        <Corners />
        <div className="panel-card-title">Solver defaults</div>
        <div className="dev-fields">
          <div className="field">
            <label>Price feed</label>
            <input className="input" defaultValue="BVD · ULSD CSV import" />
          </div>
          <div className="field">
            <label>Routing engine</label>
            <input className="input" defaultValue="openrouteservice · driving-hgv" />
          </div>
          <div className="field">
            <label>Price cache TTL (min)</label>
            <input className="input" defaultValue="15" />
          </div>
          <div className="field">
            <label>Fuel type</label>
            <input className="input" defaultValue="Diesel" />
          </div>
        </div>
        <div className="dev-foot">
          <span>Last solve 1.8 s</span>
          <span>412 stations scanned</span>
        </div>
      </div>

      <div className="panel-card blueprint dev-wide">
        <Corners />
        <div className="panel-card-title">Constraints and price basis</div>
        <div className="dev-fields-wide">
          <div className="field">
            <label>Search corridor (mi)</label>
            <input className="input" defaultValue="5" />
            <div className="dev-hint">
              How far off the route a station may sit to be <em>considered</em> at all — a
              straight-line distance, inflated by each station's own position uncertainty.
            </div>
          </div>
          <div className="field">
            <label>Max detour per stop (mi)</label>
            <input className="input" placeholder="no cap" />
            <div className="dev-hint">
              Refuses any ONE station whose actual round-trip drive exceeds this, measured
              after routing — a different number from the corridor above, which only decides
              what gets considered. Blank means no cap.
            </div>
          </div>
          <div className="field">
            <label>Arrival fuel target (gal)</label>
            <input className="input" defaultValue="23" />
            <div className="dev-hint">
              How much fuel should be aboard at the destination. Blank uses the reserve floor
              below.
            </div>
          </div>
          <div className="field">
            <label>Reserve floor (%)</label>
            <input className="input" defaultValue="15" />
            <div className="dev-hint">
              The truck's own setting, editable at <a href="#settings">Settings</a>.
            </div>
          </div>
          <div className="field">
            <label>Max stops</label>
            <input className="input" placeholder="no limit" />
            <div className="dev-hint">Blank for no limit.</div>
          </div>
          <div className="field">
            <label>Max leg between fills (mi)</label>
            <input className="input" defaultValue="500" />
            <div className="dev-hint">Hard operational cap. Blank uses the profile.</div>
          </div>
          <div className="field">
            <label>Min leg between fills (mi)</label>
            <input className="input" defaultValue="300" />
            <div className="dev-hint">Soft — relaxed automatically if the lane needs it.</div>
          </div>
          <div className="field">
            <label>Price basis</label>
            <select className="input">
              <option>Pump price (YOUR PRICE)</option>
              <option>Rack price</option>
              <option>Pump price less IFTA credit</option>
              <option>Contract / network price</option>
            </select>
            <div className="dev-hint">
              These rank stations differently. Which is correct depends on whether CH
              Logistics is IFTA-registered — still an open question.
            </div>
          </div>
        </div>
        <div className="dev-actions">
          <button className="btn btn-primary blueprint">
            <Corners />
            Apply &amp; re-solve
          </button>
          <button className="btn btn-ghost">Reset defaults</button>
        </div>
      </div>
    </section>
  );
}
