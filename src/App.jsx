import { useEffect, useMemo, useState } from "react";
import { AuthView } from "./components/AuthView";
import { CloudBar } from "./components/CloudBar";
import { CompanyView } from "./components/CompanyView";
import { CompanyWorkspaceView } from "./components/CompanyWorkspaceView";
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
import {
  createCloudCompany,
  deleteProjectFromCloud,
  importDataToCloud,
  listCompanies,
  listJoinRequests,
  loadCompanyData,
  requestJoinCompany,
  reviewJoinRequest,
  saveProjectToCloud,
  searchCompanies,
  syncPriceBookToCloud,
  updateCompanySettings,
} from "./lib/cloudData";
import {
  getStoredSession,
  isSupabaseConfigured,
  refreshSessionIfNeeded,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from "./lib/supabaseApi";

const ACTIVE_COMPANY_KEY = "bidcraft:active-company";
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

function userIdFromSession(session) {
  return session?.user?.id || null;
}

export default function App() {
  const cloudEnabled = isSupabaseConfigured();
  const [data, setData] = usePersistentState(
    "bidcraft:data:v1",
    clone(initialData),
  );
  const [activeProjectId, setActiveProjectId] = useState(
    () => data.projects[0]?.id || null,
  );
  const [view, setView] = useState("estimate");
  const [projectTab, setProjectTab] = useState("estimate");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [toastState, setToastState] = useState(null);
  const [cloudSession, setCloudSession] = useState(() =>
    cloudEnabled ? getStoredSession() : null,
  );
  const [cloudLoading, setCloudLoading] = useState(cloudEnabled);
  const [cloudMessage, setCloudMessage] = useState("");
  const [companies, setCompanies] = useState([]);
  const [activeCompanyId, setActiveCompanyId] = useState(() =>
    cloudEnabled ? localStorage.getItem(ACTIVE_COMPANY_KEY) || "" : "",
  );
  const [activeCloudCompany, setActiveCloudCompany] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [companySearchResults, setCompanySearchResults] = useState([]);

  const cloudActive = cloudEnabled && Boolean(cloudSession && activeCompanyId);
  const cloudUserId = userIdFromSession(cloudSession);
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

  useEffect(() => {
    if (!cloudEnabled) return undefined;
    let cancelled = false;

    async function bootCloud() {
      setCloudLoading(true);
      try {
        const session = await refreshSessionIfNeeded();
        if (cancelled) return;
        setCloudSession(session);
        if (session) {
          await loadCloudCompanies(
            session,
            localStorage.getItem(ACTIVE_COMPANY_KEY) || "",
          );
        }
      } catch (error) {
        if (!cancelled) {
          setCloudMessage(error.message || "Could not connect to Supabase.");
        }
      } finally {
        if (!cancelled) setCloudLoading(false);
      }
    }

    bootCloud();
    return () => {
      cancelled = true;
    };
  }, [cloudEnabled]);

  function toast(message, type = "success") {
    setToastState({ message, type });
  }

  function handleCloudSaveError(error) {
    setCloudMessage(error.message || "Cloud save failed.");
  }

  async function activateCloudCompany(companyId) {
    if (!companyId) return;
    setCloudLoading(true);
    try {
      const { appData, company, auditLogs: logs } =
        await loadCompanyData(companyId);
      setData(appData);
      setActiveProjectId(appData.projects[0]?.id || null);
      setActiveCompanyId(companyId);
      setActiveCloudCompany(company);
      setAuditLogs(logs || []);
      localStorage.setItem(ACTIVE_COMPANY_KEY, companyId);
      const requests = await listJoinRequests(companyId).catch(() => []);
      setJoinRequests(requests || []);
      setCloudMessage("");
      setView((current) => {
        if (!appData.projects.length) return "projects";
        return current === "cloud" ? "projects" : current;
      });
    } catch (error) {
      setCloudMessage(error.message || "Could not load company data.");
      toast(error.message || "Could not load company data.", "error");
    } finally {
      setCloudLoading(false);
    }
  }

  async function loadCloudCompanies(
    session = cloudSession,
    requestedCompanyId = activeCompanyId,
  ) {
    if (!session) return [];
    setCloudLoading(true);
    try {
      const rows = await listCompanies();
      const safeRows = rows || [];
      setCompanies(safeRows);
      const preferred =
        requestedCompanyId ||
        localStorage.getItem(ACTIVE_COMPANY_KEY) ||
        safeRows[0]?.company_id ||
        "";
      const nextCompanyId = safeRows.some(
        (company) => company.company_id === preferred,
      )
        ? preferred
        : safeRows[0]?.company_id || "";

      if (nextCompanyId) {
        await activateCloudCompany(nextCompanyId);
      } else {
        setActiveCompanyId("");
        setActiveCloudCompany(null);
        setAuditLogs([]);
        setJoinRequests([]);
        setCloudMessage("Create a company or request to join one.");
        setView("cloud");
      }
      return safeRows;
    } catch (error) {
      setCloudMessage(error.message || "Could not load your companies.");
      toast(error.message || "Could not load your companies.", "error");
      return [];
    } finally {
      setCloudLoading(false);
    }
  }

  async function handleSignIn(email, password) {
    setCloudLoading(true);
    setCloudMessage("");
    try {
      const session = await signInWithPassword(email, password);
      setCloudSession(session);
      const rows = await loadCloudCompanies(session);
      if (!rows.length) setView("cloud");
      toast("Signed in.");
    } catch (error) {
      setCloudMessage(error.message || "Sign in failed.");
    } finally {
      setCloudLoading(false);
    }
  }

  async function handleSignUp(email, password, fullName) {
    setCloudLoading(true);
    setCloudMessage("");
    try {
      const session = await signUpWithPassword(email, password, fullName);
      if (session) {
        setCloudSession(session);
        await loadCloudCompanies(session);
        setView("cloud");
        toast("Account created.");
      } else {
        setCloudMessage(
          "Account created. Check your email if Supabase asks for confirmation, then sign in.",
        );
      }
    } catch (error) {
      setCloudMessage(error.message || "Account creation failed.");
    } finally {
      setCloudLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    localStorage.removeItem(ACTIVE_COMPANY_KEY);
    setCloudSession(null);
    setCompanies([]);
    setActiveCompanyId("");
    setActiveCloudCompany(null);
    setAuditLogs([]);
    setJoinRequests([]);
    setCompanySearchResults([]);
    setCloudMessage("");
    toast("Signed out.", "info");
  }

  async function handleCreateCompany(companyName) {
    if (!cloudUserId) return;
    setCloudLoading(true);
    try {
      const companyId = await createCloudCompany(companyName, cloudUserId);
      await loadCloudCompanies(cloudSession, companyId);
      setView("projects");
      toast("Company created.");
    } catch (error) {
      setCloudMessage(error.message || "Could not create company.");
      toast(error.message || "Could not create company.", "error");
    } finally {
      setCloudLoading(false);
    }
  }

  async function handleSearchCompanies(searchTerm) {
    if (searchTerm.trim().length < 2) {
      setCloudMessage("Type at least 2 letters to search companies.");
      return;
    }
    setCloudLoading(true);
    try {
      const results = await searchCompanies(searchTerm);
      setCompanySearchResults(results || []);
      setCloudMessage(results?.length ? "" : "No companies found.");
    } catch (error) {
      setCloudMessage(error.message || "Company search failed.");
    } finally {
      setCloudLoading(false);
    }
  }

  async function handleRequestJoin(companyId) {
    setCloudLoading(true);
    try {
      await requestJoinCompany(companyId);
      setCloudMessage("Request sent. An owner or admin can approve it.");
      toast("Join request sent.", "info");
    } catch (error) {
      setCloudMessage(error.message || "Could not request access.");
      toast(error.message || "Could not request access.", "error");
    } finally {
      setCloudLoading(false);
    }
  }

  async function handleReviewJoinRequest(requestId, approve) {
    setCloudLoading(true);
    try {
      await reviewJoinRequest(requestId, approve);
      const requests = await listJoinRequests(activeCompanyId).catch(() => []);
      setJoinRequests(requests || []);
      await activateCloudCompany(activeCompanyId);
      toast(approve ? "Member approved." : "Request rejected.");
    } catch (error) {
      setCloudMessage(error.message || "Could not update join request.");
      toast(error.message || "Could not update join request.", "error");
    } finally {
      setCloudLoading(false);
    }
  }

  async function refreshCloudData() {
    if (!cloudSession) return;
    await loadCloudCompanies(cloudSession, activeCompanyId);
    toast("Cloud data refreshed.", "info");
  }

  function updateProject(nextProject) {
    setData((current) => ({
      ...current,
      projects: current.projects.map((entry) =>
        entry.id === nextProject.id ? nextProject : entry,
      ),
    }));
    if (cloudActive) {
      saveProjectToCloud(nextProject, activeCompanyId, cloudUserId).catch(
        handleCloudSaveError,
      );
    }
  }

  function setPriceBook(updater) {
    setData((current) => {
      const nextPriceBook =
        typeof updater === "function" ? updater(current.priceBook) : updater;
      if (cloudActive) {
        syncPriceBookToCloud(
          nextPriceBook,
          activeCompanyId,
          cloudUserId,
        ).catch(handleCloudSaveError);
      }
      return {
        ...current,
        priceBook: nextPriceBook,
      };
    });
  }

  function setTrades(nextTrades) {
    setData((current) => {
      const nextData = {
        ...current,
        trades: nextTrades,
      };
      if (cloudActive) {
        updateCompanySettings(activeCompanyId, {
          company: nextData.company,
          trades: nextTrades,
        }).catch(handleCloudSaveError);
      }
      return nextData;
    });
  }

  function updateCompanyInfo(company) {
    setData((current) => {
      const nextData = { ...current, company };
      if (cloudActive) {
        updateCompanySettings(activeCompanyId, {
          company,
          trades: nextData.trades,
        }).catch(handleCloudSaveError);
      }
      return nextData;
    });
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
    if (cloudActive) {
      saveProjectToCloud(next, activeCompanyId, cloudUserId).catch(
        handleCloudSaveError,
      );
    }
    toast("New estimate created.");
  }

  function deleteProject(id) {
    const target = data.projects.find((entry) => entry.id === id);
    if (!target) return;
    if (!window.confirm(`Delete "${target.name}"? This cannot be undone.`)) {
      return;
    }
    const remaining = data.projects.filter((entry) => entry.id !== id);
    setData((current) => ({ ...current, projects: remaining }));
    if (activeProjectId === id) setActiveProjectId(remaining[0]?.id || null);
    if (cloudActive) {
      deleteProjectFromCloud(id).catch(handleCloudSaveError);
    }
    toast("Project deleted.");
  }

  function openProject(id) {
    setActiveProjectId(id);
    setProjectTab("estimate");
    setView("estimate");
  }

  async function saveProject() {
    if (cloudActive && project) {
      try {
        await saveProjectToCloud(project, activeCompanyId, cloudUserId);
        toast("Estimate saved to cloud.");
      } catch (error) {
        toast(error.message || "Could not save estimate.", "error");
      }
      return;
    }
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

  async function importBackup(imported) {
    setData(imported);
    setActiveProjectId(imported.projects[0]?.id || null);
    setView("projects");
    if (cloudActive) {
      await importDataToCloud(imported, activeCompanyId, cloudUserId);
      await activateCloudCompany(activeCompanyId);
    }
  }

  function resetDemoData() {
    const message = cloudActive
      ? "Load the original demo data on this screen? Existing cloud data will not be deleted."
      : "Reset BidCraft to the original demo data? Current local data will be replaced.";
    if (!window.confirm(message)) return;
    const reset = clone(initialData);
    setData(reset);
    setActiveProjectId(reset.projects[0]?.id || null);
    setView("estimate");
    toast(cloudActive ? "Demo data loaded locally." : "Demo data restored.");
  }

  const sidebarView =
    view === "estimate" || view === "projects" ? "projects" : view;
  const showingWorkspace =
    cloudEnabled && cloudSession && (view === "cloud" || !activeCompanyId);
  const cloudSaveStatus = cloudActive ? "Saved to cloud" : "Saved locally";

  if (cloudEnabled && cloudLoading && !cloudSession && !companies.length) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand">
            <span className="brand-white">Bid</span>
            <span className="brand-orange">Craft</span>
            <small>BUILD SMART. BID CONFIDENT.</small>
          </div>
          <p className="auth-message">Connecting to Supabase...</p>
        </section>
      </main>
    );
  }

  if (cloudEnabled && !cloudSession) {
    return (
      <AuthView
        loading={cloudLoading}
        message={cloudMessage}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeView={showingWorkspace ? "cloud" : sidebarView}
        cloudEnabled={cloudEnabled}
        company={data.company}
        installAvailable={Boolean(installPrompt)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onInstall={installApp}
        onNavigate={navigate}
        workspaceLabel={data.company?.name}
        workspaceMode={cloudActive ? "Cloud workspace" : "Local workspace"}
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
        {cloudEnabled && cloudSession && companies.length ? (
          <CloudBar
            activeCompanyId={activeCompanyId}
            companies={companies}
            email={cloudSession.user?.email}
            loading={cloudLoading}
            onManage={() => setView("cloud")}
            onSelectCompany={activateCloudCompany}
            onSignOut={handleSignOut}
          />
        ) : null}

        {showingWorkspace ? (
          <CompanyWorkspaceView
            activeCompanyId={activeCompanyId}
            companies={companies}
            companySearchResults={companySearchResults}
            joinRequests={joinRequests}
            loading={cloudLoading}
            message={cloudMessage}
            onCreateCompany={handleCreateCompany}
            onRefresh={refreshCloudData}
            onRequestJoin={handleRequestJoin}
            onReviewJoinRequest={handleReviewJoinRequest}
            onSearchCompanies={handleSearchCompanies}
            onSelectCompany={activateCloudCompany}
            onSignOut={handleSignOut}
            session={cloudSession}
          />
        ) : null}

        {!showingWorkspace && view === "estimate" && project ? (
          <>
            <Topbar
              onMenu={() => setMobileOpen(true)}
              onNew={createProject}
              onPrint={printProposal}
              onSave={saveProject}
              project={project}
              saveStatus={cloudSaveStatus}
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

        {!showingWorkspace && view === "projects" ? (
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

        {!showingWorkspace && view === "pricebook" ? (
          <>
            <Topbar onMenu={() => setMobileOpen(true)} title="Price Book" />
            <PriceBookView
              items={data.priceBook}
              onChange={setPriceBook}
              toast={toast}
              tradeOptions={tradeOptions}
            />
          </>
        ) : null}

        {!showingWorkspace && view === "company" ? (
          <>
            <Topbar onMenu={() => setMobileOpen(true)} title="Company" />
            <CompanyView company={data.company} onChange={updateCompanyInfo} />
          </>
        ) : null}

        {!showingWorkspace && view === "settings" ? (
          <>
            <Topbar onMenu={() => setMobileOpen(true)} title="Settings" />
            <SettingsView
              auditLogs={auditLogs}
              cloudCompany={activeCloudCompany}
              cloudEnabled={cloudActive}
              data={data}
              onImport={importBackup}
              onRefreshCloud={refreshCloudData}
              onReset={resetDemoData}
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
