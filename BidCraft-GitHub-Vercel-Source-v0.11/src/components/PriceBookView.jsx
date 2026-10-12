import { useMemo, useState } from "react";
import { laborMode, materialMode } from "../lib/calc";
import { units } from "../data/seed";
import { Icon } from "./Icon";

const numericFields = new Set([
  "materialUnit",
  "materialFlat",
  "laborHoursUnit",
  "laborRate",
  "laborUnit",
  "laborFlat",
  "otherUnit",
  "defaultWastePct",
]);

const emptyItem = {
  item: "",
  description: "",
  trade: "General Conditions",
  unit: "EA",
  materialCostMode: "unit",
  materialUnit: 0,
  materialFlat: 0,
  laborCostMode: "hourly",
  laborHoursUnit: 0,
  laborRate: 50,
  laborUnit: 0,
  laborFlat: 0,
  otherUnit: 0,
  defaultWastePct: 0,
};

export function PriceBookView({
  items,
  onChange,
  readOnly = false,
  toast,
  tradeOptions,
}) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(emptyItem);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (item) =>
        item.item.toLowerCase().includes(term) ||
        item.trade.toLowerCase().includes(term),
    );
  }, [items, query]);

  function addItem(event) {
    event.preventDefault();
    if (readOnly) return;
    if (!draft.item.trim()) return;
    onChange((current) => [
      ...current,
      { ...draft, id: crypto.randomUUID() },
    ]);
    setDraft(emptyItem);
    toast("Price-book item added.");
  }

  function updateItem(id, field, value) {
    if (readOnly) return;
    onChange((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: numericFields.has(field) ? Number(value) : value,
            }
          : item,
      ),
    );
  }

  return (
    <main className="page-content">
      <div className="page-heading">
        <div>
          <h2>Price Book</h2>
          <p>
            {readOnly
              ? "You can view the shared price book. Only owners and admins can edit it."
              : "Optional starting prices for new estimate lines. Every project receives its own editable copy."}
          </p>
        </div>
        <label className="search-field">
          <Icon name="search" size={18} />
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search items or trades"
            value={query}
          />
        </label>
      </div>

      <form className="pricebook-add" onSubmit={addItem}>
        <input
          disabled={readOnly}
          onChange={(event) =>
            setDraft((current) => ({ ...current, item: event.target.value }))
          }
          placeholder="New item name"
          value={draft.item}
        />
        <select
          disabled={readOnly}
          onChange={(event) =>
            setDraft((current) => ({ ...current, trade: event.target.value }))
          }
          value={draft.trade}
        >
          {tradeOptions.map((trade) => (
            <option key={trade}>{trade}</option>
          ))}
        </select>
        <select
          disabled={readOnly}
          onChange={(event) =>
            setDraft((current) => ({ ...current, unit: event.target.value }))
          }
          value={draft.unit}
        >
          {units.map((unit) => (
            <option key={unit}>{unit}</option>
          ))}
        </select>
        <button className="button primary" disabled={readOnly} type="submit">
          <Icon name="plus" size={17} />
          Add item
        </button>
      </form>

      <div className="data-table pricebook-table">
        <div className="data-head pricebook-grid">
          <span>Item</span>
          <span>Trade</span>
          <span>Unit</span>
          <span>Default material method</span>
          <span>Default material cost</span>
          <span>Default labor method</span>
          <span>Default labor cost</span>
          <span>Other / unit</span>
          <span />
        </div>
        {filtered.map((item) => (
          <div className="data-row pricebook-grid" key={item.id}>
            <input
              className="table-input text-strong"
              disabled={readOnly}
              onChange={(event) =>
                updateItem(item.id, "item", event.target.value)
              }
              value={item.item}
            />
            <select
              className="table-input"
              disabled={readOnly}
              onChange={(event) =>
                updateItem(item.id, "trade", event.target.value)
              }
              value={item.trade}
            >
              {tradeOptions.map((trade) => (
                <option key={trade}>{trade}</option>
              ))}
            </select>
            <select
              className="table-input"
              disabled={readOnly}
              onChange={(event) =>
                updateItem(item.id, "unit", event.target.value)
              }
              value={item.unit}
            >
              {units.map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </select>
            <select
              className="table-input"
              disabled={readOnly}
              onChange={(event) =>
                updateItem(item.id, "materialCostMode", event.target.value)
              }
              value={materialMode(item)}
            >
              <option value="unit">Per {item.unit}</option>
              <option value="flat">Flat total</option>
            </select>
            <label className="number-cell">
              <span>$</span>
              <input
                className="table-input"
                disabled={readOnly}
                min="0"
                onChange={(event) =>
                  updateItem(
                    item.id,
                    materialMode(item) === "flat"
                      ? "materialFlat"
                      : "materialUnit",
                    event.target.value,
                  )
                }
                step="0.01"
                type="number"
                value={
                  materialMode(item) === "flat"
                    ? item.materialFlat || 0
                    : item.materialUnit || 0
                }
              />
            </label>
            <select
              className="table-input"
              disabled={readOnly}
              onChange={(event) =>
                updateItem(item.id, "laborCostMode", event.target.value)
              }
              value={laborMode(item)}
            >
              <option value="hourly">Hourly</option>
              <option value="unit">Per {item.unit}</option>
              <option value="flat">Flat total</option>
            </select>
            <div className="pricebook-labor-cell">
              {laborMode(item) === "hourly" ? (
                <>
                  <label className="number-cell">
                    <input
                      className="table-input"
                      disabled={readOnly}
                      min="0"
                      onChange={(event) =>
                        updateItem(
                          item.id,
                          "laborHoursUnit",
                          event.target.value,
                        )
                      }
                      step="0.001"
                      type="number"
                      value={item.laborHoursUnit || 0}
                    />
                    <span>hr/{item.unit}</span>
                  </label>
                  <label className="number-cell">
                    <span>$</span>
                    <input
                      className="table-input"
                      disabled={readOnly}
                      min="0"
                      onChange={(event) =>
                        updateItem(item.id, "laborRate", event.target.value)
                      }
                      step="0.01"
                      type="number"
                      value={item.laborRate || 0}
                    />
                    <span>/hr</span>
                  </label>
                </>
              ) : (
                <label className="number-cell">
                  <span>$</span>
                  <input
                    className="table-input"
                    disabled={readOnly}
                    min="0"
                    onChange={(event) =>
                      updateItem(
                        item.id,
                        laborMode(item) === "flat"
                          ? "laborFlat"
                          : "laborUnit",
                        event.target.value,
                      )
                    }
                    step="0.01"
                    type="number"
                    value={
                      laborMode(item) === "flat"
                        ? item.laborFlat || 0
                        : item.laborUnit || 0
                    }
                  />
                </label>
              )}
            </div>
            <label className="number-cell">
              <span>$</span>
              <input
                className="table-input"
                disabled={readOnly}
                min="0"
                onChange={(event) =>
                  updateItem(item.id, "otherUnit", event.target.value)
                }
                step="0.01"
                type="number"
                value={item.otherUnit || 0}
              />
            </label>
            <button
              className="icon-button danger"
              disabled={readOnly}
              onClick={() =>
                onChange((current) =>
                  current.filter((entry) => entry.id !== item.id),
                )
              }
              type="button"
            >
              <Icon name="trash" size={17} />
              <span className="sr-only">Delete {item.item}</span>
            </button>
          </div>
        ))}
      </div>

      <p className="table-footnote">
        These are starting defaults only. Changing a Price Book value does not
        change existing estimates; edit each project's rates from its Estimate
        tab.
      </p>
    </main>
  );
}
