import { useState } from "react";
import Header from "./components/Header.jsx";
import PlanTab from "./components/PlanTab.jsx";
import RecentTab from "./components/RecentTab.jsx";
import DevToolsTab from "./components/DevToolsTab.jsx";
import { trips, trucks } from "./data/trips.js";
import "./App.css";

export default function App() {
  const [activeTab, setActiveTab] = useState("plan");
  const [currentTripId, setCurrentTripId] = useState(trips[0].id);
  const [truck, setTruck] = useState(trips[0].truck);

  const currentTrip = trips.find((t) => t.id === currentTripId);

  function openTrip(id) {
    const trip = trips.find((t) => t.id === id);
    setCurrentTripId(id);
    setTruck(trip.truck);
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
        tripId={currentTrip.id}
      />

      {activeTab === "plan" && <PlanTab trip={currentTrip} />}
      {activeTab === "recent" && (
        <RecentTab trips={trips} currentTripId={currentTripId} onOpenTrip={openTrip} />
      )}
      {activeTab === "dev" && <DevToolsTab truck={truck} />}
    </div>
  );
}
