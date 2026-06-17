import { useState } from "react";
import { Icon } from "./Icon";

function companyRole(company) {
  return company?.company_role || company?.role || "member";
}

export function CompanyWorkspaceView({
  activeCompanyId,
  companies,
  companySearchResults,
  joinRequests,
  loading,
  message,
  onCreateCompany,
  onRefresh,
  onRequestJoin,
  onReviewJoinRequest,
  onSearchCompanies,
  onSelectCompany,
  onSignOut,
  session,
}) {
  const [companyName, setCompanyName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  async function createCompany(event) {
    event.preventDefault();
    const clean = companyName.trim();
    if (!clean) return;
    await onCreateCompany(clean);
    setCompanyName("");
  }

  async function searchCompanies(event) {
    event.preventDefault();
    await onSearchCompanies(searchTerm);
  }

  return (
    <main className="page-content workspace-page">
      <div className="page-heading">
        <div>
          <h2>Company Workspace</h2>
          <p>
            Create your own company, join an existing one, or switch between
            companies you already belong to.
          </p>
        </div>
        <div className="workspace-actions">
          <button className="button secondary" onClick={onRefresh} type="button">
            <Icon name="cloud" size={18} />
            Refresh
          </button>
          <button className="button secondary" onClick={onSignOut} type="button">
            Sign out
          </button>
        </div>
      </div>

      <section className="settings-panel workspace-account">
        <div>
          <h3>{session?.user?.email || "Signed in"}</h3>
          <p>
            Your work is saved under the selected company. Each company has its
            own estimates, price book, trades, and company proposal settings.
          </p>
        </div>
        {message ? <span className="workspace-message">{message}</span> : null}
      </section>

      <section className="workspace-grid">
        <div className="settings-panel">
          <h3>Your companies</h3>
          <p>Select a company to load its estimates and price book.</p>
          <div className="company-list">
            {companies.length ? (
              companies.map((company) => (
                <button
                  className={
                    activeCompanyId === company.company_id
                      ? "company-card company-card-active"
                      : "company-card"
                  }
                  disabled={loading}
                  key={company.company_id}
                  onClick={() => onSelectCompany(company.company_id)}
                  type="button"
                >
                  <strong>{company.company_name}</strong>
                  <span>{companyRole(company)}</span>
                </button>
              ))
            ) : (
              <div className="workspace-empty">
                <Icon name="company" size={24} />
                <span>No companies yet.</span>
              </div>
            )}
          </div>
        </div>

        <form className="settings-panel workspace-form" onSubmit={createCompany}>
          <h3>Create a company</h3>
          <p>You will become the owner and can approve friends later.</p>
          <input
            onChange={(event) => setCompanyName(event.target.value)}
            placeholder="Company name"
            value={companyName}
          />
          <button className="button primary" disabled={loading} type="submit">
            <Icon name="plus" size={17} />
            Create company
          </button>
        </form>
      </section>

      <section className="workspace-grid">
        <form className="settings-panel workspace-form" onSubmit={searchCompanies}>
          <h3>Join a company</h3>
          <p>Search by company name and request access.</p>
          <input
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search companies"
            value={searchTerm}
          />
          <button className="button secondary" disabled={loading} type="submit">
            <Icon name="search" size={17} />
            Search
          </button>
          <div className="company-list">
            {companySearchResults.map((company) => (
              <div className="company-card company-result" key={company.company_id}>
                <div>
                  <strong>{company.company_name}</strong>
                  <span>Existing company</span>
                </div>
                <button
                  className="button secondary small"
                  disabled={loading}
                  onClick={() => onRequestJoin(company.company_id)}
                  type="button"
                >
                  Request
                </button>
              </div>
            ))}
          </div>
        </form>

        <div className="settings-panel">
          <h3>Pending join requests</h3>
          <p>Owners and admins can approve people into the active company.</p>
          <div className="request-list">
            {joinRequests.length ? (
              joinRequests.map((request) => (
                <div className="request-row" key={request.request_id}>
                  <div>
                    <strong>{request.full_name || request.email}</strong>
                    <span>{request.email}</span>
                  </div>
                  <div className="request-actions">
                    <button
                      className="button secondary small"
                      disabled={loading}
                      onClick={() =>
                        onReviewJoinRequest(request.request_id, false)
                      }
                      type="button"
                    >
                      Reject
                    </button>
                    <button
                      className="button primary small"
                      disabled={loading}
                      onClick={() =>
                        onReviewJoinRequest(request.request_id, true)
                      }
                      type="button"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="workspace-empty">
                <Icon name="check" size={24} />
                <span>No pending requests.</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
