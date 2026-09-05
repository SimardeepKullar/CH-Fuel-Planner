const TABS = [
  { key: "plan", label: "Plan" },
  { key: "recent", label: "Recent" },
  { key: "dev", label: "Dev Tools" },
];

export default function Header({
  activeTab,
  onTabChange,
  trucks,
  truck,
  onTruckChange,
  tripId,
}) {
  return (
    <>
      <header className="topbar">
        <img
          className="brand-logo"
          src="https://www.chlogistics.ca/images/ch-logo-white.png"
          alt="CH Logistics"
        />
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn${activeTab === tab.key ? " active" : ""}`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}

        {/* Placeholder identity — no auth wired up yet. */}
        <div className="user-chip">
          <div className="user-chip-id">
            <span className="user-chip-name">M. Hodson</span>
            <span className="user-chip-role">Dispatch</span>
          </div>
          <button className="signout-btn">Sign out</button>
        </div>
      </header>

      <div className="subbar">
        <div className="subbar-title">Fleet · route fuel</div>
        <div className="subbar-tags">
          <select
            className="input truck-select"
            value={truck}
            onChange={(e) => onTruckChange(e.target.value)}
          >
            {trucks.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <span className="tag tag-neutral">Diesel</span>
          <span className="tag tag-accent trip-tag">{tripId}</span>
        </div>
      </div>
    </>
  );
}
