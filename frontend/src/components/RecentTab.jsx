export default function RecentTab({ trips, currentTripId, onOpenTrip }) {
  return (
    <section className="panel">
      <div className="panel-card">
        <div className="panel-card-header">
          <div className="panel-card-title">Recent trips</div>
          <span className="panel-card-sub">click a trip to open its plan</span>
        </div>

        <div className="trip-table">
          <div className="trip-row trip-head">
            <span>Trip</span>
            <span>Date</span>
            <span>Route</span>
            <span>Distance</span>
            <span>Truck</span>
            <span>Saved</span>
            <span>Status</span>
          </div>

          <div className="trip-body">
            {trips.map((t) => {
              const isCurrent = t.id === currentTripId;
              return (
                <div
                  key={t.id}
                  className={`trip-item${isCurrent ? " current" : ""}`}
                  onClick={() => onOpenTrip(t.id)}
                >
                  <div className="trip-row">
                    <span className="trip-id">{t.id}</span>
                    <span className="trip-date">{t.date}</span>
                    <span className="trip-route">{t.source} → {t.dest}</span>
                    <span>{t.miles}</span>
                    <span className="trip-truck">{t.truck}</span>
                    <span className="trip-save">{t.save}</span>
                    <span className={`tag ${isCurrent ? "tag-outline" : "tag-neutral"}`}>{t.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
