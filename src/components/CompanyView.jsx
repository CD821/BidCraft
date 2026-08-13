export function CompanyView({ company, onChange, readOnly = false }) {
  function update(field, value) {
    if (readOnly) return;
    onChange({ ...company, [field]: value });
  }

  return (
    <main className="page-content narrow-page">
      <div className="page-heading">
        <div>
          <h2>Company</h2>
          <p>
            {readOnly
              ? "This information appears on printed proposals. Only owners and admins can edit it."
              : "This information appears on printed proposals."}
          </p>
        </div>
      </div>

      <section className="settings-panel">
        <div className="form-grid two-column">
          <label>
            Company name
            <input
              disabled={readOnly}
              onChange={(event) => update("name", event.target.value)}
              value={company.name}
            />
          </label>
          <label>
            License number
            <input
              disabled={readOnly}
              onChange={(event) => update("license", event.target.value)}
              value={company.license}
            />
          </label>
          <label>
            Street address
            <input
              disabled={readOnly}
              onChange={(event) => update("address", event.target.value)}
              value={company.address}
            />
          </label>
          <label>
            City, state, ZIP
            <input
              disabled={readOnly}
              onChange={(event) => update("cityStateZip", event.target.value)}
              value={company.cityStateZip}
            />
          </label>
          <label>
            Phone
            <input
              disabled={readOnly}
              onChange={(event) => update("phone", event.target.value)}
              value={company.phone}
            />
          </label>
          <label>
            Email
            <input
              disabled={readOnly}
              onChange={(event) => update("email", event.target.value)}
              type="email"
              value={company.email}
            />
          </label>
        </div>
      </section>
    </main>
  );
}
