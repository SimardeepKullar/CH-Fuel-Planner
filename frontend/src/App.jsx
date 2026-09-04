import { useState } from "react";
import Header from "./components/Header.jsx";
import PlanTab from "./components/PlanTab.jsx";
import RecentTab from "./components/RecentTab.jsx";
import DevToolsTab from "./components/DevToolsTab.jsx";
import { trips } from "./data/trips.js";
import "./App.css";

export default function App() {
  const [activeTab, setActiveTab] = useState("plan");
  const [currentTripId, setCurrentTripId] = useState(trips[0].id);

  const currentTrip = trips.find((t) => t.id === currentTripId);

  function openTrip(id) {
    setCurrentTripId(id);
    setActiveTab("plan");
  }

  return (
    <div className="app">
      <Header activeTab={activeTab} onTabChange={setActiveTab} truck={currentTrip.truck} tripId={currentTrip.id} />

      {activeTab === "plan" && <PlanTab trip={currentTrip} />}
      {activeTab === "recent" && (
        <RecentTab trips={trips} currentTripId={currentTripId} onOpenTrip={openTrip} />
      )}
      {activeTab === "dev" && <DevToolsTab truck={currentTrip.truck} />}

      <p className="next-hint">
        Route Fuel — Plan a lane, review the cheapest stations along it, and pull up any past
        trip from the log.
      </p>
    </div>
  );
}
