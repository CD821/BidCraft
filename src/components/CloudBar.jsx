import { Icon } from "./Icon";

function companyRole(company) {
  return company?.company_role || company?.role || "member";
}

export function CloudBar({
  activeCompanyId,
  companies,
  email,
  loading,
  onManage,
  onSelectCompany,
  onSignOut,
}) {
  return (
    <div className="cloud-bar">
      <div className="cloud-bar-status">
        <Icon name="cloud" size={18} />
        <span>Cloud workspace</span>
      </div>
      <label>
        Company
        <select
          disabled={loading}
          onChange={(event) => onSelectCompany(event.target.value)}
          value={activeCompanyId || ""}
        >
          {companies.map((company) => (
            <option key={company.company_id} value={company.company_id}>
              {company.company_name} - {companyRole(company)}
            </option>
          ))}
        </select>
      </label>
      <span className="cloud-user">{email}</span>
      <button className="button secondary small" onClick={onManage} type="button">
        Manage workspace
      </button>
      <button className="button secondary small" onClick={onSignOut} type="button">
        Sign out
      </button>
    </div>
  );
}
