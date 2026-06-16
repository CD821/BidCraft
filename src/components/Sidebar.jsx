import { Icon } from "./Icon";

const navItems = [
  ["projects", "Projects"],
  ["book", "Price Book"],
  ["company", "Company"],
  ["settings", "Settings"],
];

export function Sidebar({
  activeView,
  company,
  installAvailable,
  mobileOpen,
  onCloseMobile,
  onInstall,
  onNavigate,
}) {
  return (
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="brand">
        <span className="brand-white">Bid</span>
        <span className="brand-orange">Craft</span>
        <small>BUILD SMART. BID CONFIDENT.</small>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {navItems.map(([icon, label]) => {
          const view = label.toLowerCase().replace(" ", "");
          return (
            <button
              className={activeView === view ? "nav-active" : ""}
              key={label}
              onClick={() => {
                onNavigate(view);
                onCloseMobile();
              }}
              type="button"
            >
              <Icon name={icon} size={21} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {installAvailable ? (
          <button className="install-button" onClick={onInstall} type="button">
            <Icon name="download" size={18} />
            Install app
          </button>
        ) : null}
        <div className="company-chip">
          <div className="avatar">
            {(company.name || "BC")
              .split(" ")
              .map((word) => word[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <strong>{company.name || "Your Company"}</strong>
            <span>Local workspace</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
