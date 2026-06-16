import { useEffect, useMemo, useState } from "react";
import { CompanyView } from "./components/CompanyView";
import { EstimateView } from "./components/EstimateView";
import { Icon } from "./components/Icon";
import { MaterialsView } from "./components/MaterialsView";
import { PriceBookView } from "./components/PriceBookView";
import { ProjectsView } from "./components/ProjectsView";
import { ProposalView } from "./components/ProposalView";
import { SettingsView } from "./components/SettingsView";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { initialData, newProject, trades as defaultTrades } from "./data/seed";
import { usePersistentState } from "./hooks/usePersistentState";

const clone = (value) => JSON.parse(JSON.stringify(value));

function uniqueTrades(data) {
  const seen = new Set();
  const options = [];

  function addTrade(trade) {
    const clean = String(trade || "").trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) return;
    seen.add(key);
    options.push(clean);
  }

  (Array.isArray(data.trades) ? data.trades : defaultTrades).forEach(addTrade);
  data.priceBook?.forEach((item) => addTrade(item.trade));
  data.projects?.forEach((project) =>
    project.lines?.forEach((line) => addTrade(line.trade)),
  );

  return options;
}

export default function App() {
  const [data, setData] = usePersistentState("bidcraft:data:v1", clone(initialData));
  const [activeProjectId, setActiveProjectId] = useState(
    () => data.projects[0]?.id || null,
  );
  const [view, setView] = useState("estimate");
  const [projectTab, setProjectTab] = useState("estimate");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [toastState, setToastState] = useState(null);

  const project = useMemo(
    () =>
      data.projects.find((entry) => entry.id === activeProjectId) ||
      data.projects[0] ||
      null,
    [activeProjectId, data.projects],
  );
  const tradeOptions = useMemo(() => uniqueTrades(data), [data]);

  useEffect(() => {
    function captureInstall(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }
    window.addEventListener("beforeinstallprompt", captureInstall);
    return () => window.removeEventListener("beforeinstallprompt", captureInstall);
  }, []);

  useEffect(() => {
    if (!toastState) return undefined;
    const timeout = window.setTimeout(() => setToastState(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [toastState]);

  function toast(message, type = "success") {
    setToastState({ message, type });
  }

  function updateProject(nextProject) {
    setData((current) => ({
      ...current,
      projects: current.projects.map((entry) =>
        entry.id === nextProject.id ? nextProject : entry,
      ),
    }));
  }

  function setPriceBook(updater) {
    setData((current) => ({
      ...current,
      priceBook:
        typeof updater === "function" ? updater(current.priceBook) : updater,
    }));
  }

  function setTrades(nextTrades) {
    setData((current) => ({
      ...current,
      trades: nextTrades,
    }));
  }

  function createProject() {
    const next = newProject(data.projects.length + 1);
    setData((current) => ({
      ...current,
      projects: [...current.projects, next],
    }));
    setActiveProjectId(next.id);
    setProjectTab("estimate");
    setView("estimate");
    toast("New estimate created.");
  }

  function deleteProject(id) {
    const target = data.projects.find((entry) => entry.id === id);
    if (!target) return;
    if (!window.confirm(`Delete “${target.name}”? This cannot be undone.`)) return;
    const remaining = data.projects.filter((entry) => entry.id !== id);
    setData((current) => ({ ...current, projects: remaining }));
    if (activeProjectId === id) setActiveProjectId(remaining[0]?.id || null);
    toast("Project deleted.");
  }

  function openProject(id) {
    setActiveProjectId(id);
    setProjectTab("estimate");
    setView("estimate");
  }

  function saveProject() {
    toast("Estimate saved on this device.");
  }

  function printProposal() {
    if (projectTab !== "proposal") {
      setProjectTab("proposal");
      window.setTimeout(() => window.print(), 150);
    } else {
      window.print();
    }
  }

  async function installApp() {
    if (!installPrompt) {
      toast("Use your browser menu and choose Install app.", "info");
      return;
    }
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function navigate(nextView) {
    setView(nextView);
  }

  const sidebarView =
    view === "estimate" || view === "projects" ? "projects" : view;

  return (
    <div className="app-shell">
      <Sidebar
        activeView={sidebarView}
        company={data.company}
        installAvailable={Boolean(installPrompt)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onInstall={installApp}
        onNavigate={navigate}
      />
      {mobileOpen ? (
        <button
          aria-label="Close navigation"
          className="mobile-scrim"
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      ) : null}

      <div className="app-main">
        {view === "estimate" && project ? (
          <>
            <Topbar
              onMenu={() => setMobileOpen(true)}
              onNew={createProject}
              onPrint={printProposal}
              onSave={saveProject}
              project={project}
            />
            <nav className="project-tabs" aria-label="Estimate sections">
              {[
                ["estimate", "Estimate"],
                ["materials", "Materials"],
                ["proposal", "Proposal"],
              ].map(([tab, label]) => (
                <button
                  className={projectTab === tab ? "tab-active" : ""}
                  key={tab}
                  onClick={() => setProjectTab(tab)}
                  type="button"
                >
                  <Icon name={tab} size={19} />
                  {label}
                </button>
              ))}
            </nav>
            <div className="tab-content">
              {projectTab === "estimate" ? (
                <EstimateView
                  onOpenProposal={() => setProjectTab("proposal")}
                  priceBook={data.priceBook}
                  project={project}
                  tradeOptions={tradeOptions}
                  updateProject={updateProject}
                />
              ) : null}
              {projectTab === "materials" ? (
                <MaterialsView
                  project={project}
                  toast={toast}
                  updateProject={updateProject}
                />
              ) : null}
              {projectTab === "proposal" ? (
                <ProposalView
                  company={data.company}
                  onPrint={printProposal}
                  project={project}
                  updateProject={updateProject}
                />
              ) : null}
            </div>
          </>
        ) : null}

        {view === "projects" ? (
          <>
            <Topbar
              onMenu={() => setMobileOpen(true)}
              onNew={createProject}
              title="Projects"
            />
            <ProjectsView
              activeProjectId={project?.id}
              onCreate={createProject}
              onDelete={deleteProject}
              onOpen={openProject}
              projects={data.projects}
            />
          </>
        ) : null}

        {view === "pricebook" ? (
          <>
            <Topbar
              onMenu={() => setMobileOpen(true)}
              title="Price Book"
            />
            <PriceBookView
              items={data.priceBook}
              onChange={setPriceBook}
              toast={toast}
              tradeOptions={tradeOptions}
            />
          </>
        ) : null}

        {view === "company" ? (
          <>
            <Topbar onMenu={() => setMobileOpen(true)} title="Company" />
            <CompanyView
              company={data.company}
              onChange={(company) =>
                setData((current) => ({ ...current, company }))
              }
            />
          </>
        ) : null}

        {view === "settings" ? (
          <>
            <Topbar onMenu={() => setMobileOpen(true)} title="Settings" />
            <SettingsView
              data={data}
              onImport={(imported) => {
                setData(imported);
                setActiveProjectId(imported.projects[0]?.id || null);
                setView("projects");
              }}
              onReset={() => {
                if (
                  !window.confirm(
                    "Reset BidCraft to the original demo data? Current local data will be replaced.",
                  )
                ) {
                  return;
                }
                const reset = clone(initialData);
                setData(reset);
                setActiveProjectId(reset.projects[0]?.id || null);
                setView("estimate");
                toast("Demo data restored.");
              }}
              onTradesChange={setTrades}
              toast={toast}
              tradeOptions={tradeOptions}
            />
          </>
        ) : null}
      </div>

      {toastState ? (
        <div className={`toast toast-${toastState.type}`} role="status">
          <Icon
            name={toastState.type === "error" ? "x" : "check"}
            size={17}
          />
          {toastState.message}
        </div>
      ) : null}
    </div>
  );
}
