"use client";

import { useState } from "react";
import Header, { type TabKey } from "../components/Header";
import PlanTab from "../components/PlanTab";
import RecentTab from "../components/RecentTab";
import DevToolsTab from "../components/DevToolsTab";
import { trips, trucks } from "../data/trips";
import "../App.css";

export default function Page() {
  const [activeTab, setActiveTab] = useState<TabKey>("plan");
  const [currentPlanId, setCurrentPlanId] = useState(trips[0].planId);
  const [truck, setTruck] = useState(trucks[0]);

  const currentTrip = trips.find((t) => t.planId === currentPlanId) ?? trips[0];

  function openPlan(planId: string) {
    setCurrentPlanId(planId);
    setActiveTab("plan");
  }

  return (
    <div className="app">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        trucks={trucks}
        truck={truck}
        onTruckChange={setTruck}
        planId={currentTrip.planId}
      />

      {activeTab === "plan" && <PlanTab trip={currentTrip} />}
      {activeTab === "recent" && (
        <RecentTab trips={trips} currentPlanId={currentPlanId} onOpenPlan={openPlan} />
      )}
      {activeTab === "dev" && <DevToolsTab truck={truck} />}
    </div>
  );
}
