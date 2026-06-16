import { useMemo, useState } from "react";
import { units } from "../data/seed";
import { money, number } from "../lib/calc";
import { Icon } from "./Icon";

const numericFields = new Set([
  "quantity",
  "unitCost",
  "taxPct",
  "deliveryFee",
]);

const materialUnits = [
  ...units,
  "BOX",
  "BAG",
  "SHEET",
  "ROLL",
  "GAL",
  "PAIL",
  "CASE",
  "PALLET",
  "BUNDLE",
];

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function materialCosts(item) {
  const subtotal =
    (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
  const tax = subtotal * ((Number(item.taxPct) || 0) / 100);
  const delivery = Number(item.deliveryFee) || 0;

  return {
    subtotal,
    tax,
    delivery,
    total: subtotal + tax + delivery,
  };
}

function SortableHeader({ align = "", label, onSort, sort, sortKey }) {
  const active = sort.key === sortKey;
  return (
    <button
      className={`material-sort ${align} ${active ? "sort-active" : ""}`}
      onClick={() => onSort(sortKey)}
      type="button"
    >
      <span>{label}</span>
      <span aria-hidden="true" className="sort-indicator">
        {active ? (sort.direction === "asc" ? "^" : "v") : "-"}
      </span>
      <span className="sr-only">
        {active
          ? `Sorted ${sort.direction === "asc" ? "ascending" : "descending"}`
          : "Sort column"}
      </span>
    </button>
  );
}

export function MaterialsView({ project, toast, updateProject }) {
  const [sort, setSort] = useState({ key: "item", direction: "asc" });
  const materials = project.materialList || [];

  const rows = useMemo(
    () =>
      materials.map((item) => ({
        ...item,
        costs: materialCosts(item),
      })),
    [materials],
  );

  const sortedRows = useMemo(() => {
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const aValue = sort.key === "total" ? a.costs.total : a[sort.key];
      const bValue = sort.key === "total" ? b.costs.total : b[sort.key];

      if (typeof aValue === "number" || typeof bValue === "number") {
        return ((Number(aValue) || 0) - (Number(bValue) || 0)) * direction;
      }

      return String(aValue || "").localeCompare(String(bValue || "")) * direction;
    });
  }, [rows, sort]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (summary, item) => ({
          subtotal: summary.subtotal + item.costs.subtotal,
          tax: summary.tax + item.costs.tax,
          delivery: summary.delivery + item.costs.delivery,
          total: summary.total + item.costs.total,
        }),
        { subtotal: 0, tax: 0, delivery: 0, total: 0 },
      ),
    [rows],
  );

  function patchMaterials(nextMaterials) {
    updateProject({ ...project, materialList: nextMaterials });
  }

  function addMaterial() {
    const item = {
      id: crypto.randomUUID(),
      item: "New material",
      quantity: 1,
      unit: "EA",
      unitCost: 0,
      taxPct: 0,
      deliveryFee: 0,
      notes: "",
    };
    patchMaterials([...materials, item]);
    toast("Material added.");
  }

  function updateMaterial(id, field, value) {
    patchMaterials(
      materials.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: numericFields.has(field) ? Number(value) : value,
            }
          : item,
      ),
    );
  }

  function deleteMaterial(id) {
    patchMaterials(materials.filter((item) => item.id !== id));
    toast("Material removed.");
  }

  function changeSort(key) {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  function exportCsv() {
    const csvRows = [
      [
        "Material",
        "Quantity",
        "Unit",
        "Unit Cost",
        "Subtotal",
        "Tax Rate",
        "Tax Amount",
        "Delivery Fee",
        "Total",
        "Notes",
      ],
      ...sortedRows.map((item) => [
        item.item,
        item.quantity,
        item.unit,
        item.unitCost,
        item.costs.subtotal.toFixed(2),
        item.taxPct,
        item.costs.tax.toFixed(2),
        item.deliveryFee,
        item.costs.total.toFixed(2),
        item.notes,
      ]),
    ];
    const csv = csvRows
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.name
      .replaceAll(/[^a-z0-9]+/gi, "-")
      .toLowerCase()}-material-list.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast("Material list downloaded.");
  }

  return (
    <main className="tab-page">
      <div className="page-heading material-page-heading">
        <div>
          <h2>Material List</h2>
          <p>
            Build a project purchasing list for studs, screws, plywood, and
            other materials. This list is independent from estimate line items.
          </p>
        </div>
        <div className="material-heading-actions">
          <button className="button secondary" onClick={exportCsv} type="button">
            <Icon name="download" size={18} />
            Export CSV
          </button>
          <button className="button primary" onClick={addMaterial} type="button">
            <Icon name="plus" size={18} />
            Add material
          </button>
        </div>
      </div>

      <div className="material-summary-grid">
        <div>
          <span>Materials</span>
          <strong>{number.format(materials.length)}</strong>
        </div>
        <div>
          <span>Base cost</span>
          <strong>{money.format(totals.subtotal)}</strong>
        </div>
        <div>
          <span>Tax</span>
          <strong>{money.format(totals.tax)}</strong>
        </div>
        <div>
          <span>Delivery</span>
          <strong>{money.format(totals.delivery)}</strong>
        </div>
        <div className="material-summary-total">
          <span>Purchasing total</span>
          <strong>{money.format(totals.total)}</strong>
        </div>
      </div>

      <div className="data-table material-list-table">
        <div className="data-head material-list-grid">
          <SortableHeader
            label="Material"
            onSort={changeSort}
            sort={sort}
            sortKey="item"
          />
          <SortableHeader
            align="align-right"
            label="Quantity"
            onSort={changeSort}
            sort={sort}
            sortKey="quantity"
          />
          <SortableHeader
            label="Unit"
            onSort={changeSort}
            sort={sort}
            sortKey="unit"
          />
          <SortableHeader
            align="align-right"
            label="Unit cost"
            onSort={changeSort}
            sort={sort}
            sortKey="unitCost"
          />
          <SortableHeader
            align="align-right"
            label="Tax %"
            onSort={changeSort}
            sort={sort}
            sortKey="taxPct"
          />
          <SortableHeader
            align="align-right"
            label="Delivery"
            onSort={changeSort}
            sort={sort}
            sortKey="deliveryFee"
          />
          <SortableHeader
            align="align-right"
            label="Total"
            onSort={changeSort}
            sort={sort}
            sortKey="total"
          />
          <SortableHeader
            label="Notes"
            onSort={changeSort}
            sort={sort}
            sortKey="notes"
          />
          <span />
        </div>
        {sortedRows.map((item) => (
          <div className="data-row material-list-grid" key={item.id}>
            <input
              aria-label="Material name"
              className="table-input text-strong"
              onChange={(event) =>
                updateMaterial(item.id, "item", event.target.value)
              }
              value={item.item || ""}
            />
            <input
              aria-label={`Quantity for ${item.item}`}
              className="table-input number-input"
              min="0"
              onChange={(event) =>
                updateMaterial(item.id, "quantity", event.target.value)
              }
              step="0.01"
              type="number"
              value={item.quantity || 0}
            />
            <select
              aria-label={`Unit for ${item.item}`}
              className="table-input"
              onChange={(event) =>
                updateMaterial(item.id, "unit", event.target.value)
              }
              value={item.unit || "EA"}
            >
              {materialUnits.map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </select>
            <label className="number-cell material-money-input">
              <span>$</span>
              <input
                aria-label={`Unit cost for ${item.item}`}
                className="table-input number-input"
                min="0"
                onChange={(event) =>
                  updateMaterial(item.id, "unitCost", event.target.value)
                }
                step="0.01"
                type="number"
                value={item.unitCost || 0}
              />
            </label>
            <label className="number-cell material-percent-input">
              <input
                aria-label={`Tax rate for ${item.item}`}
                className="table-input number-input"
                min="0"
                onChange={(event) =>
                  updateMaterial(item.id, "taxPct", event.target.value)
                }
                step="0.01"
                type="number"
                value={item.taxPct || 0}
              />
              <span>%</span>
            </label>
            <label className="number-cell material-money-input">
              <span>$</span>
              <input
                aria-label={`Delivery fee for ${item.item}`}
                className="table-input number-input"
                min="0"
                onChange={(event) =>
                  updateMaterial(item.id, "deliveryFee", event.target.value)
                }
                step="0.01"
                type="number"
                value={item.deliveryFee || 0}
              />
            </label>
            <strong className="material-row-total">
              {money.format(item.costs.total)}
            </strong>
            <input
              aria-label={`Notes for ${item.item}`}
              className="table-input"
              onChange={(event) =>
                updateMaterial(item.id, "notes", event.target.value)
              }
              placeholder="Supplier, size, color, lead time..."
              value={item.notes || ""}
            />
            <button
              aria-label={`Delete ${item.item}`}
              className="icon-button danger"
              onClick={() => deleteMaterial(item.id)}
              type="button"
            >
              <Icon name="trash" size={17} />
            </button>
          </div>
        ))}
        {!materials.length ? (
          <button
            className="empty-state material-empty"
            onClick={addMaterial}
            type="button"
          >
            <Icon name="materials" size={30} />
            <h3>No purchasing materials yet</h3>
            <p>Add studs, screws, plywood, or any other project material.</p>
          </button>
        ) : null}
      </div>
    </main>
  );
}
