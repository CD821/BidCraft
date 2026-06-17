import { Icon } from "./Icon";

const baseNavItems = [
  ["projects", "projects", "Projects"],
  ["pricebook", "book", "Price Book"],
  ["company", "company", "Company"],
  ["settings", "settings", "Settings"],
];

export function Sidebar({
  activeView,
  cloudEnabled = false,
  company,
  installAvailable,
  mobileOpen,
  onCloseMobile,
  onInstall,
  onNavigate,
  workspaceLabel = "Local workspace",
  workspaceMode = "Local workspace",
}) {
  const navItems = cloudEnabled
    ? [
        ["projects", "projects", "Projects"],
        ["pricebook", "book", "Price Book"],
        ["company", "company", "Company"],
        ["cloud", "cloud", "Workspace"],
        ["settings", "settings", "Settings"],
      ]
    : baseNavItems;
  const companyName = company?.name || workspaceLabel || "Your Company";

  return (
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="brand">
        <span className="brand-white">Bid</span>
        <span className="brand-orange">Craft</span>
        <small>BUILD SMART. BID CONFIDENT.</small>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {navItems.map(([view, icon, label]) => {
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
            {companyName
              .split(" ")
              .map((word) => word[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <strong>{companyName}</strong>
            <span>{workspaceMode}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
