import { useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";

export function SettingsView({
  auditLogs = [],
  cloudCompany,
  cloudEnabled = false,
  data,
  onImport,
  onRefreshCloud,
  onReset,
  onTradesChange,
  toast,
  tradeOptions,
}) {
  const inputRef = useRef(null);
  const [tradeDraft, setTradeDraft] = useState("");

  const usedTrades = useMemo(() => {
    const used = new Set();
    data.priceBook?.forEach((item) => {
      if (item.trade) used.add(item.trade.toLowerCase());
    });
    data.projects?.forEach((project) =>
      project.lines?.forEach((line) => {
        if (line.trade) used.add(line.trade.toLowerCase());
      }),
    );
    return used;
  }, [data.priceBook, data.projects]);

  function exportBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bidcraft-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast("Backup downloaded.");
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed.projects) || !Array.isArray(parsed.priceBook)) {
        throw new Error("Invalid backup");
      }
      await onImport(parsed);
      toast("Backup imported.");
    } catch {
      toast("That file is not a valid BidCraft backup.", "error");
    } finally {
      event.target.value = "";
    }
  }

  function addTrade(event) {
    event.preventDefault();
    const clean = tradeDraft.trim();
    if (!clean) return;
    if (
      tradeOptions.some(
        (trade) => trade.toLowerCase() === clean.toLowerCase(),
      )
    ) {
      toast("That trade already exists.", "error");
      return;
    }
    onTradesChange([...tradeOptions, clean]);
    setTradeDraft("");
    toast("Trade added.");
  }

  function removeTrade(targetTrade) {
    if (usedTrades.has(targetTrade.toLowerCase())) {
      toast("Move existing items before removing that trade.", "error");
      return;
    }
    onTradesChange(
      tradeOptions.filter(
        (trade) => trade.toLowerCase() !== targetTrade.toLowerCase(),
      ),
    );
    toast("Trade removed.");
  }

  return (
    <main className="page-content narrow-page">
      <div className="page-heading">
        <div>
          <h2>Settings & Data</h2>
          <p>
            {cloudEnabled
              ? `BidCraft is connected to ${cloudCompany?.name || "your company"} in Supabase. Backups are still useful before major changes.`
              : "BidCraft stores data on this device. Download backups regularly."}
          </p>
        </div>
      </div>

      <section className="settings-panel settings-actions">
        <div>
          <h3>Backup everything</h3>
          <p>Projects, price-book items, trades, and company information.</p>
        </div>
        <button className="button primary" onClick={exportBackup} type="button">
          <Icon name="download" size={18} />
          Download backup
        </button>
      </section>

      <section className="settings-panel">
        <div className="settings-panel-heading">
          <div>
            <h3>Trades</h3>
            <p>
              Add trades here, then use them in estimate lines and price-book
              items.
            </p>
          </div>
        </div>
        <form className="trade-add-form" onSubmit={addTrade}>
          <input
            onChange={(event) => setTradeDraft(event.target.value)}
            placeholder="New trade name, e.g. Low Voltage"
            value={tradeDraft}
          />
          <button className="button primary" type="submit">
            <Icon name="plus" size={17} />
            Add trade
          </button>
        </form>
        <div className="trade-list" aria-label="Available trades">
          {tradeOptions.map((trade) => {
            const inUse = usedTrades.has(trade.toLowerCase());
            return (
              <span className="trade-chip" key={trade}>
                <span>{trade}</span>
                <button
                  aria-label={
                    inUse
                      ? `${trade} is in use`
                      : `Remove ${trade}`
                  }
                  disabled={inUse}
                  onClick={() => removeTrade(trade)}
                  title={
                    inUse
                      ? "This trade is used by estimates or price-book items."
                      : "Remove trade"
                  }
                  type="button"
                >
                  <Icon name="x" size={13} />
                </button>
              </span>
            );
          })}
        </div>
        <p className="table-footnote">
          Trades in use are locked to protect existing estimates and price-book
          items.
        </p>
      </section>

      <section className="settings-panel settings-actions">
        <div>
          <h3>Restore a backup</h3>
          <p>
            Import a BidCraft JSON file from this or another device.
            {cloudEnabled ? " In cloud mode this also uploads it to the active company." : ""}
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <Icon name="upload" size={18} />
          Import backup
        </button>
        <input
          accept=".json,application/json"
          className="hidden-input"
          onChange={importBackup}
          ref={inputRef}
          type="file"
        />
      </section>

      <section className="settings-panel settings-actions danger-zone">
        <div>
          <h3>Reset demo data</h3>
          <p>
            {cloudEnabled
              ? "Replace the current screen with demo data. Cloud data is not deleted."
              : "Replace local data with the original example project."}
          </p>
        </div>
        <button className="button danger-button" onClick={onReset} type="button">
          Reset app
        </button>
      </section>

      {cloudEnabled ? (
        <section className="settings-panel">
          <div className="settings-panel-heading">
            <div>
              <h3>Change log</h3>
              <p>
                Latest company changes recorded by Supabase. This is useful for
                checking who changed estimates, price-book items, or company
                settings.
              </p>
            </div>
            <button
              className="button secondary small"
              onClick={onRefreshCloud}
              type="button"
            >
              <Icon name="cloud" size={17} />
              Refresh
            </button>
          </div>
          <div className="audit-list">
            {auditLogs.length ? (
              auditLogs.map((log) => (
                <div className="audit-row" key={log.id}>
                  <div>
                    <strong>{log.action}</strong>
                    <span>{log.entity_type}</span>
                  </div>
                  <span>{new Date(log.created_at).toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p>No logged changes yet.</p>
            )}
          </div>
        </section>
      ) : null}

      <section className="settings-panel">
        <h3>{cloudEnabled ? "About cloud storage" : "About local storage"}</h3>
        <p>
          {cloudEnabled
            ? "Your active company data is stored in Supabase. This browser still keeps a local copy so the screen feels fast, but Supabase is the source of truth after sign in."
            : "No account or internet connection is required after installation. Clearing browser site data will remove local projects unless a backup has been downloaded."}
        </p>
      </section>
    </main>
  );
}
