import type { CompletedPlanResponse } from "@ch/core/domain/planResponse";
import Corners from "./Corners";

interface RecentTabProps {
  trips: CompletedPlanResponse[];
  currentPlanId: string;
  onOpenPlan: (planId: string) => void;
}

const STATUS_LABEL: Record<CompletedPlanResponse["status"], string> = {
  completed: "Completed",
};

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(iso),
  );
}

/** "Volvo VNL 760 — sleeper, standard haul" -> "Volvo VNL 760". */
function shortTruckLabel(displayName: string): string {
  return displayName.split(" — ")[0] ?? displayName;
}

export default function RecentTab({ trips, currentPlanId, onOpenPlan }: RecentTabProps) {
  return (
    <section className="panel">
      <div className="panel-card blueprint">
        <Corners />
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
              const isCurrent = t.planId === currentPlanId;
              return (
                <div
                  key={t.planId}
                  className={`trip-row trip-item${isCurrent ? " current blueprint" : ""}`}
                  onClick={() => onOpenPlan(t.planId)}
                >
                  {isCurrent && <Corners />}
                  <span className="trip-id">{t.planId}</span>
                  <span className="trip-date">{shortDate(t.createdAt)}</span>
                  <span className="trip-route">
                    {t.origin.label} → {t.destination.label}
                  </span>
                  <span>{Math.round(t.baseline.distanceMiles)} mi</span>
                  <span className="trip-truck">{shortTruckLabel(t.truckProfile.displayName)}</span>
                  <span className="trip-save">${Math.round(t.optimized.savingsVsBaselineUsd)}</span>
                  <span className="trip-status">
                    <span className={`tag ${isCurrent ? "tag-outline" : "tag-neutral"}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
