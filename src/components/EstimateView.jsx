import { useMemo, useState } from "react";
import { units } from "../data/seed";
import {
  laborMode,
  lineCosts,
  materialMode,
  money,
  number,
  projectTotals,
} from "../lib/calc";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

const numericFields = new Set([
  "qty",
  "wastePct",
  "materialUnit",
  "materialFlat",
  "laborHoursUnit",
  "laborRate",
  "laborUnit",
  "laborFlat",
  "otherUnit",
]);

function LineItemPicker({ items, onAdd, onClose }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (item) =>
        item.item.toLowerCase().includes(term) ||
        item.trade.toLowerCase().includes(term),
    );
  }, [items, query]);

  return (
    <Modal onClose={onClose} title="Add line item" wide>
      <label className="search-field modal-search">
        <Icon name="search" size={18} />
        <input
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your price book"
          value={query}
        />
      </label>
      <div className="picker-list">
        <button
          className="picker-row custom-row"
          onClick={() => onAdd(null)}
          type="button"
        >
          <span className="picker-plus">
            <Icon name="plus" size={18} />
          </span>
          <span>
            <strong>Blank custom item</strong>
            <small>Enter a one-time item directly in this estimate.</small>
          </span>
        </button>
        {filtered.map((item) => {
          const costs = lineCosts({
            ...item,
            qty: 1,
            wastePct: item.defaultWastePct || 0,
          });
          return (
            <button
              className="picker-row"
              key={item.id}
              onClick={() => onAdd(item)}
              type="button"
            >
              <span>
                <strong>{item.item}</strong>
                <small>
                  {item.trade} / {item.unit}
                </small>
              </span>
              <span className="picker-costs">
                <small>Material</small>
                <strong>{money.format(costs.material)}</strong>
                <small>Labor</small>
                <strong>{money.format(costs.labor)}</strong>
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

export function EstimateView({
  onOpenProposal,
  priceBook,
  project,
  tradeOptions,
  updateProject,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [query, setQuery] = useState("");
  const totals = projectTotals(project);

  const visibleLines = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return totals.lines;
    return totals.lines.filter(
      (line) =>
        line.item.toLowerCase().includes(term) ||
        line.trade.toLowerCase().includes(term),
    );
  }, [query, totals.lines]);

  function patchProject(patch) {
    updateProject({ ...project, ...patch });
  }

  function updateLine(id, field, value) {
    patchProject({
      lines: project.lines.map((line) =>
        line.id === id
          ? {
              ...line,
              [field]: numericFields.has(field) ? Number(value) : value,
            }
          : line,
      ),
    });
  }

  function addLine(item) {
    const line = item
      ? {
          id: crypto.randomUUID(),
          priceBookId: item.id,
          item: item.item,
          description: item.description,
          trade: item.trade,
          qty: 1,
          unit: item.unit,
          wastePct: item.defaultWastePct,
          materialCostMode: item.materialCostMode || "unit",
          materialUnit: item.materialUnit,
          materialFlat: item.materialFlat || 0,
          laborCostMode: item.laborCostMode || "hourly",
          laborHoursUnit: item.laborHoursUnit,
          laborRate: item.laborRate,
          laborUnit: item.laborUnit || 0,
          laborFlat: item.laborFlat || 0,
          otherUnit: item.otherUnit,
        }
      : {
          id: crypto.randomUUID(),
          item: "Custom item",
          description: "",
          trade: "General Conditions",
          qty: 1,
          unit: "EA",
          wastePct: 0,
          materialCostMode: "unit",
          materialUnit: 0,
          materialFlat: 0,
          laborCostMode: "hourly",
          laborHoursUnit: 0,
          laborRate: 50,
          laborUnit: 0,
          laborFlat: 0,
          otherUnit: 0,
        };
    patchProject({ lines: [...project.lines, line] });
    setSelectedLineId(line.id);
    setPickerOpen(false);
  }

  function duplicateSelected() {
    const source = project.lines.find((line) => line.id === selectedLineId);
    if (!source) return;
    const copy = { ...source, id: crypto.randomUUID(), item: `${source.item} copy` };
    patchProject({ lines: [...project.lines, copy] });
    setSelectedLineId(copy.id);
  }

  function deleteSelected() {
    if (!selectedLineId) return;
    patchProject({
      lines: project.lines.filter((line) => line.id !== selectedLineId),
    });
    setSelectedLineId(null);
  }

  return (
    <>
      <div className="estimate-layout">
        <section className="estimate-main">
          <div className="project-details-card">
            <label>
              <span>Project name</span>
              <input
                onChange={(event) =>
                  patchProject({ name: event.target.value })
                }
                value={project.name}
              />
            </label>
            <label>
              <span>Client</span>
              <input
                onChange={(event) =>
                  patchProject({ client: event.target.value })
                }
                placeholder="Client name"
                value={project.client}
              />
            </label>
            <label>
              <span>Proposal #</span>
              <input
                onChange={(event) =>
                  patchProject({ proposalNumber: event.target.value })
                }
                value={project.proposalNumber}
              />
            </label>
            <label>
              <span>Status</span>
              <select
                onChange={(event) =>
                  patchProject({ status: event.target.value })
                }
                value={project.status}
              >
                {["Draft", "Submitted", "Accepted", "Rejected"].map(
                  (status) => (
                    <option key={status}>{status}</option>
                  ),
                )}
              </select>
            </label>
          </div>

          <div className="estimate-toolbar">
            <div className="toolbar-group">
              <button
                className="button primary"
                onClick={() => setPickerOpen(true)}
                type="button"
              >
                <Icon name="plus" size={18} />
                Add line item
              </button>
              <button
                className="button secondary"
                disabled={!selectedLineId}
                onClick={duplicateSelected}
                type="button"
              >
                <Icon name="copy" size={17} />
                Duplicate
              </button>
              <button
                className="button secondary"
                disabled={!selectedLineId}
                onClick={deleteSelected}
                type="button"
              >
                <Icon name="trash" size={17} />
                Delete
              </button>
            </div>
            <label className="search-field">
              <Icon name="search" size={18} />
              <input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search estimate"
                value={query}
              />
            </label>
          </div>

          <div className="estimate-rate-note">
            <Icon name="check" size={16} />
            <span>
              <strong>Project-specific pricing.</strong> Rates changed below
              apply only to this estimate. Price Book values are copied as
              starting points.
            </span>
          </div>

          <div className="estimate-table-wrap">
            <div className="estimate-table">
              <div className="estimate-head estimate-grid">
                <span>Item</span>
                <span>Trade</span>
                <span>Qty</span>
                <span>Unit</span>
                <span>Waste</span>
                <span>Material cost</span>
                <span>Labor cost</span>
                <span>Other</span>
                <span>Total cost</span>
              </div>
              {visibleLines.map((line) => (
                <div
                  className={`estimate-row estimate-grid ${
                    selectedLineId === line.id ? "selected-row" : ""
                  }`}
                  key={line.id}
                  onClick={() => setSelectedLineId(line.id)}
                >
                  <div className="item-cell">
                    <input
                      className="table-input text-strong"
                      onChange={(event) =>
                        updateLine(line.id, "item", event.target.value)
                      }
                      value={line.item}
                    />
                    <input
                      className="table-input description-input"
                      onChange={(event) =>
                        updateLine(line.id, "description", event.target.value)
                      }
                      placeholder="Description"
                      value={line.description}
                    />
                  </div>
                  <select
                    className="table-input"
                    onChange={(event) =>
                      updateLine(line.id, "trade", event.target.value)
                    }
                    value={line.trade}
                  >
                    {tradeOptions.map((trade) => (
                      <option key={trade}>{trade}</option>
                    ))}
                  </select>
                  <input
                    className="table-input number-input"
                    min="0"
                    onChange={(event) =>
                      updateLine(line.id, "qty", event.target.value)
                    }
                    step="0.01"
                    type="number"
                    value={line.qty}
                  />
                  <select
                    className="table-input"
                    onChange={(event) =>
                      updateLine(line.id, "unit", event.target.value)
                    }
                    value={line.unit}
                  >
                    {units.map((unit) => (
                      <option key={unit}>{unit}</option>
                    ))}
                  </select>
                  <label className="number-cell">
                    <input
                      className="table-input number-input"
                      min="0"
                      onChange={(event) =>
                        updateLine(line.id, "wastePct", event.target.value)
                      }
                      step="0.5"
                      type="number"
                      value={line.wastePct}
                    />
                    <span>%</span>
                  </label>
                  <div className="cost-cell">
                    <span className="project-rate-label">
                      This estimate only
                    </span>
                    <select
                      aria-label={`Material cost method for ${line.item}`}
                      className="cost-mode-select"
                      onChange={(event) =>
                        updateLine(
                          line.id,
                          "materialCostMode",
                          event.target.value,
                        )
                      }
                      value={materialMode(line)}
                    >
                      <option value="unit">Rate per {line.unit}</option>
                      <option value="flat">Flat material total</option>
                    </select>
                    <label className="project-rate-input">
                      <span>$</span>
                      <input
                        className="table-input"
                        min="0"
                        onChange={(event) =>
                          updateLine(
                            line.id,
                            materialMode(line) === "flat"
                              ? "materialFlat"
                              : "materialUnit",
                            event.target.value,
                          )
                        }
                        step="0.01"
                        type="number"
                        value={
                          materialMode(line) === "flat"
                            ? line.materialFlat || 0
                            : line.materialUnit || 0
                        }
                      />
                      <span>
                        {materialMode(line) === "flat"
                          ? "total"
                          : `/${line.unit}`}
                      </span>
                    </label>
                    <span className="cost-result">
                      Material total
                      <strong>{money.format(line.costs.material)}</strong>
                    </span>
                  </div>
                  <div className="cost-cell">
                    <span className="project-rate-label">
                      This estimate only
                    </span>
                    <select
                      aria-label={`Labor cost method for ${line.item}`}
                      className="cost-mode-select"
                      onChange={(event) =>
                        updateLine(
                          line.id,
                          "laborCostMode",
                          event.target.value,
                        )
                      }
                      value={laborMode(line)}
                    >
                      <option value="hourly">Hours x hourly rate</option>
                      <option value="unit">Rate per {line.unit}</option>
                      <option value="flat">Flat labor total</option>
                    </select>
                    {laborMode(line) === "hourly" ? (
                      <div className="labor-hourly-inputs">
                        <label>
                          <input
                            className="table-input"
                            min="0"
                            onChange={(event) =>
                              updateLine(
                                line.id,
                                "laborHoursUnit",
                                event.target.value,
                              )
                            }
                            step="0.001"
                            type="number"
                            value={line.laborHoursUnit || 0}
                          />
                          <span>hr/{line.unit}</span>
                        </label>
                        <label>
                          <span>$</span>
                          <input
                            className="table-input"
                            min="0"
                            onChange={(event) =>
                              updateLine(
                                line.id,
                                "laborRate",
                                event.target.value,
                              )
                            }
                            step="0.01"
                            type="number"
                            value={line.laborRate || 0}
                          />
                          <span>/hr</span>
                        </label>
                      </div>
                    ) : (
                      <label>
                        <span>$</span>
                        <input
                          className="table-input"
                          min="0"
                          onChange={(event) =>
                            updateLine(
                              line.id,
                              laborMode(line) === "flat"
                                ? "laborFlat"
                                : "laborUnit",
                              event.target.value,
                            )
                          }
                          step="0.01"
                          type="number"
                          value={
                            laborMode(line) === "flat"
                              ? line.laborFlat || 0
                              : line.laborUnit || 0
                          }
                        />
                        <span>
                          {laborMode(line) === "flat"
                            ? "total"
                            : `/${line.unit}`}
                        </span>
                      </label>
                    )}
                    <span className="cost-result">
                      Labor total
                      <strong>{money.format(line.costs.labor)}</strong>
                    </span>
                  </div>
                  <div className="cost-cell">
                    <strong>{money.format(line.costs.other)}</strong>
                    <label>
                      <span>$</span>
                      <input
                        className="table-input"
                        min="0"
                        onChange={(event) =>
                          updateLine(line.id, "otherUnit", event.target.value)
                        }
                        step="0.01"
                        type="number"
                        value={line.otherUnit}
                      />
                    </label>
                  </div>
                  <strong className="line-total">
                    {money.format(line.costs.direct)}
                  </strong>
                </div>
              ))}
              {!visibleLines.length ? (
                <button
                  className="empty-table"
                  onClick={() => setPickerOpen(true)}
                  type="button"
                >
                  <Icon name="plus" />
                  Add your first estimate line
                </button>
              ) : null}
              <div className="estimate-footer">
                <span>{project.lines.length} line items</span>
                <span>Direct cost</span>
                <strong>{money.format(totals.direct)}</strong>
              </div>
            </div>
          </div>

          <div className="scope-grid">
            <label>
              <span>Scope of Work</span>
              <textarea
                onChange={(event) => patchProject({ scope: event.target.value })}
                rows="4"
                value={project.scope}
              />
            </label>
            <label>
              <span>Exclusions</span>
              <textarea
                onChange={(event) =>
                  patchProject({ exclusions: event.target.value })
                }
                rows="4"
                value={project.exclusions}
              />
            </label>
          </div>
        </section>

        <aside className="estimate-summary">
          <div className="summary-title">
            <h3>Estimate Summary</h3>
            <span>{project.status}</span>
          </div>
          <dl className="summary-list">
            <div>
              <dt>Material cost</dt>
              <dd>{money.format(totals.material)}</dd>
            </div>
            <div>
              <dt>Labor cost</dt>
              <dd>{money.format(totals.labor)}</dd>
            </div>
            <div>
              <dt>Other cost</dt>
              <dd>{money.format(totals.other)}</dd>
            </div>
            <div className="summary-subtotal">
              <dt>Direct cost</dt>
              <dd>{money.format(totals.direct)}</dd>
            </div>
          </dl>

          <div className="summary-controls">
            <label>
              <span>Overhead</span>
              <span className="percent-input">
                <input
                  min="0"
                  onChange={(event) =>
                    patchProject({ overheadPct: Number(event.target.value) })
                  }
                  step="0.25"
                  type="number"
                  value={project.overheadPct}
                />
                %
              </span>
              <strong>{money.format(totals.overhead)}</strong>
            </label>
            <label>
              <span>Profit markup</span>
              <span className="percent-input">
                <input
                  min="0"
                  onChange={(event) =>
                    patchProject({ profitPct: Number(event.target.value) })
                  }
                  step="0.25"
                  type="number"
                  value={project.profitPct}
                />
                %
              </span>
              <strong>{money.format(totals.profit)}</strong>
            </label>
            <label>
              <span>Tax</span>
              <span className="percent-input">
                <input
                  min="0"
                  onChange={(event) =>
                    patchProject({ taxPct: Number(event.target.value) })
                  }
                  step="0.01"
                  type="number"
                  value={project.taxPct}
                />
                %
              </span>
              <strong>{money.format(totals.tax)}</strong>
            </label>
            <label className="tax-mode">
              <span>Apply tax to</span>
              <select
                onChange={(event) =>
                  patchProject({ taxMode: event.target.value })
                }
                value={project.taxMode}
              >
                <option value="none">No tax</option>
                <option value="material">Materials only</option>
                <option value="total">Total bid</option>
              </select>
            </label>
          </div>

          <div className="bid-total">
            <span>Bid total</span>
            <strong>{money.format(totals.total)}</strong>
          </div>
          <div className="margin-row">
            <span>Gross margin</span>
            <strong>{(totals.grossMargin * 100).toFixed(1)}%</strong>
          </div>
          <div className="quick-metrics">
            <div>
              <span>Labor hours</span>
              <strong>{number.format(totals.laborHours)}</strong>
            </div>
            <div>
              <span>Avg. hourly rate</span>
              <strong>
                {money.format(
                  totals.laborHours
                    ? totals.hourlyLabor / totals.laborHours
                    : 0,
                )}
              </strong>
            </div>
          </div>

          <button
            className="button primary summary-proposal"
            onClick={onOpenProposal}
            type="button"
          >
            <Icon name="proposal" size={18} />
            Review proposal
          </button>
        </aside>
      </div>

      {pickerOpen ? (
        <LineItemPicker
          items={priceBook}
          onAdd={addLine}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </>
  );
}
