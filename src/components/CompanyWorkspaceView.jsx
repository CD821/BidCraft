import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";

const roleOptions = ["owner", "admin", "estimator", "viewer"];

function companyRole(company) {
  return company?.company_role || company?.role || "member";
}

export function CompanyWorkspaceView({
  activeCompanyId,
  activeCompany,
  companies,
  companySearchResults,
  companyMembers,
  joinRequests,
  loading,
  message,
  onCreateCompany,
  onRefresh,
  onRemoveMember,
  onRenameCompany,
  onRequestJoin,
  onReviewJoinRequest,
  onSearchCompanies,
  onSelectCompany,
  onSignOut,
  onUpdateMemberRole,
  session,
}) {
  const [companyName, setCompanyName] = useState("");
  const [renameDraft, setRenameDraft] = useState(activeCompany?.name || "");
  const [searchTerm, setSearchTerm] = useState("");
  const activeCompanyRow = useMemo(
    () => companies.find((company) => company.company_id === activeCompanyId),
    [activeCompanyId, companies],
  );
  const activeRole = companyRole(activeCompanyRow);
  const canManageCompany =
    activeRole === "owner" ||
    activeRole === "admin" ||
    activeRole === "platform_admin";

  useEffect(() => {
    setRenameDraft(activeCompany?.name || activeCompanyRow?.company_name || "");
  }, [activeCompany?.name, activeCompanyRow?.company_name]);

  async function createCompany(event) {
    event.preventDefault();
    const clean = companyName.trim();
    if (!clean) return;
    const created = await onCreateCompany(clean);
    if (created !== false) setCompanyName("");
  }

  async function searchCompanies(event) {
    event.preventDefault();
    await onSearchCompanies(searchTerm);
  }

  async function renameCompany(event) {
    event.preventDefault();
    const clean = renameDraft.trim();
    if (!clean) return;
    await onRenameCompany(clean);
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

      <section className="settings-panel company-management-panel">
        <div className="settings-panel-heading">
          <div>
            <h3>Manage active company</h3>
            <p>
              Edit the company name, review people with access, and control
              each member's role.
            </p>
          </div>
          <span className="role-badge">{activeRole}</span>
        </div>

        <form className="company-rename-form" onSubmit={renameCompany}>
          <label>
            Company name
            <input
              disabled={!canManageCompany || loading}
              onChange={(event) => setRenameDraft(event.target.value)}
              value={renameDraft}
            />
          </label>
          <button
            className="button primary"
            disabled={!canManageCompany || loading || !renameDraft.trim()}
            type="submit"
          >
            <Icon name="save" size={17} />
            Save company name
          </button>
        </form>

        {!canManageCompany ? (
          <p className="table-footnote">
            Only owners and admins can rename companies, change roles, or remove
            member access.
          </p>
        ) : null}

        <div className="member-list" aria-label="Company members">
          <div className="member-row member-head">
            <span>Person</span>
            <span>Role</span>
            <span>Access</span>
          </div>
          {companyMembers.length ? (
            companyMembers.map((member) => {
              const label = member.full_name || member.email || member.user_id;
              const isCurrentUser = member.user_id === session?.user?.id;
              return (
                <div className="member-row" key={member.user_id}>
                  <div>
                    <strong>{label}</strong>
                    <span>{member.email || "No email"}</span>
                  </div>
                  <select
                    disabled={!canManageCompany || loading}
                    onChange={(event) =>
                      onUpdateMemberRole(member.user_id, event.target.value)
                    }
                    value={member.role}
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <div className="member-access-actions">
                    <span>
                      Added{" "}
                      {member.created_at
                        ? new Date(member.created_at).toLocaleDateString()
                        : "unknown"}
                    </span>
                    <button
                      className="button secondary small"
                      disabled={
                        !canManageCompany ||
                        loading ||
                        (isCurrentUser && member.role === "owner")
                      }
                      onClick={() => onRemoveMember(member.user_id, label)}
                      type="button"
                    >
                      Remove access
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="workspace-empty">
              <Icon name="company" size={24} />
              <span>No members loaded. Click Refresh.</span>
            </div>
          )}
        </div>
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
