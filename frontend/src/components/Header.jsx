const TABS = [
  { key: "plan", label: "Plan" },
  { key: "recent", label: "Recent" },
  { key: "dev", label: "Dev Tools" },
];

export default function Header({ activeTab, onTabChange, truck, tripId }) {
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
      </header>

      <div className="subbar">
        <div className="subbar-title">Fleet · route fuel</div>
        <div className="subbar-tags">
          <span className="tag tag-outline">{truck}</span>
          <span className="tag tag-neutral">Diesel</span>
          <span className="tag tag-accent">{tripId}</span>
        </div>
      </div>
    </>
  );
}
