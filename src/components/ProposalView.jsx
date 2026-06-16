import {
  groupProposalLines,
  money,
  projectTotals,
} from "../lib/calc";
import { Icon } from "./Icon";

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function ProposalView({
  company,
  onPrint,
  project,
  updateProject,
}) {
  const totals = projectTotals(project);
  const groups = groupProposalLines(project, totals);

  function patchProject(patch) {
    updateProject({ ...project, ...patch });
  }

  return (
    <div className="proposal-workspace">
      <aside className="proposal-settings">
        <h2>Proposal Settings</h2>
        <div className="form-grid two-column compact">
          <label>
            Client
            <input
              onChange={(event) =>
                patchProject({ client: event.target.value })
              }
              value={project.client}
            />
          </label>
          <label>
            Proposal #
            <input
              onChange={(event) =>
                patchProject({ proposalNumber: event.target.value })
              }
              value={project.proposalNumber}
            />
          </label>
          <label className="span-two">
            Project address
            <textarea
              onChange={(event) =>
                patchProject({ address: event.target.value })
              }
              rows="3"
              value={project.address}
            />
          </label>
          <label>
            Date
            <input
              onChange={(event) => patchProject({ date: event.target.value })}
              type="date"
              value={project.date}
            />
          </label>
          <label>
            Valid through
            <input
              onChange={(event) =>
                patchProject({ validThrough: event.target.value })
              }
              type="date"
              value={project.validThrough}
            />
          </label>
        </div>

        <label className="toggle-row">
          <span>
            <strong>Show quantities</strong>
            <small>Display quantities in proposal</small>
          </span>
          <input
            checked={project.showQuantities}
            onChange={(event) =>
              patchProject({ showQuantities: event.target.checked })
            }
            type="checkbox"
          />
        </label>
        <label className="toggle-row">
          <span>
            <strong>Show unit prices</strong>
            <small>Display selling price per unit</small>
          </span>
          <input
            checked={project.showUnitPrices}
            onChange={(event) =>
              patchProject({ showUnitPrices: event.target.checked })
            }
            type="checkbox"
          />
        </label>

        {[
          ["scope", "Scope of Work"],
          ["exclusions", "Exclusions"],
          ["paymentTerms", "Payment Terms"],
          ["acceptance", "Acceptance"],
        ].map(([field, label]) => (
          <label className="proposal-text-field" key={field}>
            <span>{label}</span>
            <textarea
              onChange={(event) => patchProject({ [field]: event.target.value })}
              rows="5"
              value={project[field]}
            />
          </label>
        ))}
      </aside>

      <main className="proposal-preview-area">
        <div className="proposal-toolbar">
          <span>Letter · 8.5 × 11 in.</span>
          <button className="button primary" onClick={onPrint} type="button">
            <Icon name="print" size={18} />
            Print / Save PDF
          </button>
        </div>

        <article className="proposal-page" id="proposal-document">
          <header className="proposal-header">
            <div>
              <h1>{company.name || "Your Company"}</h1>
              <address>
                {company.address}
                <br />
                {company.cityStateZip}
                <br />
                {company.phone}
                <br />
                {company.email}
                {company.license ? (
                  <>
                    <br />
                    License: {company.license}
                  </>
                ) : null}
              </address>
            </div>
            <div className="proposal-title-block">
              <h2>PROPOSAL</h2>
              <dl>
                <div>
                  <dt>Proposal #</dt>
                  <dd>{project.proposalNumber}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{formatDate(project.date)}</dd>
                </div>
                <div>
                  <dt>Valid Through</dt>
                  <dd>{formatDate(project.validThrough)}</dd>
                </div>
              </dl>
            </div>
          </header>

          <div className="proposal-parties">
            <section>
              <h3>Client</h3>
              <strong>{project.client || "Client name"}</strong>
              <p>{project.address}</p>
            </section>
            <section>
              <h3>Project</h3>
              <strong>{project.name}</strong>
              <p>{project.address}</p>
            </section>
          </div>

          <section className="proposal-section">
            <h3>Scope of Work</h3>
            <p>{project.scope}</p>
          </section>

          <table className="proposal-table">
            <thead>
              <tr>
                <th>Description</th>
                {project.showQuantities ? <th>Qty</th> : null}
                {project.showQuantities ? <th>Unit</th> : null}
                {project.showUnitPrices ? <th>Unit Price</th> : null}
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group, groupIndex) => (
                <FragmentRows
                  group={group}
                  groupIndex={groupIndex}
                  key={group.trade}
                  project={project}
                />
              ))}
            </tbody>
          </table>

          <div className="proposal-totals">
            <dl>
              <div>
                <dt>Subtotal</dt>
                <dd>{money.format(totals.preTax)}</dd>
              </div>
              {totals.tax ? (
                <div>
                  <dt>Tax ({project.taxPct}%)</dt>
                  <dd>{money.format(totals.tax)}</dd>
                </div>
              ) : null}
              <div className="proposal-grand-total">
                <dt>Total Proposal Amount</dt>
                <dd>{money.format(totals.total)}</dd>
              </div>
            </dl>
          </div>

          <div className="proposal-terms-grid">
            <section>
              <h3>Exclusions</h3>
              <p>{project.exclusions}</p>
            </section>
            <section>
              <h3>Payment Terms</h3>
              <p>{project.paymentTerms}</p>
            </section>
          </div>

          <section className="proposal-acceptance">
            <h3>Acceptance</h3>
            <p>{project.acceptance}</p>
            <div className="signature-grid">
              <div>
                <span className="signature-line" />
                <strong>{company.name}</strong>
                <span>Name / Title</span>
                <span className="signature-date">Date</span>
              </div>
              <div>
                <span className="signature-line" />
                <strong>{project.client || "Client"}</strong>
                <span>Name / Title</span>
                <span className="signature-date">Date</span>
              </div>
            </div>
          </section>

          <footer className="proposal-footer">
            Thank you for the opportunity to serve you.
          </footer>
        </article>
      </main>
    </div>
  );
}

function FragmentRows({ group, groupIndex, project }) {
  return (
    <>
      <tr className="trade-row">
        <td
          colSpan={
            2 +
            (project.showQuantities ? 2 : 0) +
            (project.showUnitPrices ? 1 : 0)
          }
        >
          {String(groupIndex + 1).padStart(2, "0")} — {group.trade}
        </td>
      </tr>
      {group.rows.map((line) => (
        <tr key={line.id}>
          <td>
            <strong>{line.item}</strong>
            {line.description ? <small>{line.description}</small> : null}
          </td>
          {project.showQuantities ? (
            <td>{line.qty.toLocaleString("en-US")}</td>
          ) : null}
          {project.showQuantities ? <td>{line.unit}</td> : null}
          {project.showUnitPrices ? (
            <td>{money.format(line.qty ? line.sellTotal / line.qty : 0)}</td>
          ) : null}
          <td>{money.format(line.sellTotal)}</td>
        </tr>
      ))}
    </>
  );
}
