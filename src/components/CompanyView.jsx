export function CompanyView({ company, onChange }) {
  function update(field, value) {
    onChange({ ...company, [field]: value });
  }

  return (
    <main className="page-content narrow-page">
      <div className="page-heading">
        <div>
          <h2>Company</h2>
          <p>This information appears on printed proposals.</p>
        </div>
      </div>

      <section className="settings-panel">
        <div className="form-grid two-column">
          <label>
            Company name
            <input
              onChange={(event) => update("name", event.target.value)}
              value={company.name}
            />
          </label>
          <label>
            License number
            <input
              onChange={(event) => update("license", event.target.value)}
              value={company.license}
            />
          </label>
          <label>
            Street address
            <input
              onChange={(event) => update("address", event.target.value)}
              value={company.address}
            />
          </label>
          <label>
            City, state, ZIP
            <input
              onChange={(event) => update("cityStateZip", event.target.value)}
              value={company.cityStateZip}
            />
          </label>
          <label>
            Phone
            <input
              onChange={(event) => update("phone", event.target.value)}
              value={company.phone}
            />
          </label>
          <label>
            Email
            <input
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
