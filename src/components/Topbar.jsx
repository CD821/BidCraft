import { Icon } from "./Icon";

export function Topbar({
  project,
  onMenu,
  onNew,
  onPrint,
  onSave,
  title,
}) {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <button className="mobile-menu icon-button" onClick={onMenu} type="button">
          <Icon name="menu" />
        </button>
        <div>
          <h1>{project?.name || title}</h1>
          {project ? (
            <span className="autosave">
              <Icon name="check" size={15} />
              Saved locally
            </span>
          ) : null}
        </div>
      </div>

      <div className="topbar-actions">
        {onNew ? (
          <button className="button secondary" onClick={onNew} type="button">
            <Icon name="plus" size={18} />
            <span>New Estimate</span>
          </button>
        ) : null}
        {onSave ? (
          <button className="button secondary" onClick={onSave} type="button">
            <Icon name="save" size={18} />
            <span>Save</span>
          </button>
        ) : null}
        {onPrint ? (
          <button className="button primary" onClick={onPrint} type="button">
            <Icon name="print" size={18} />
            <span>Print / PDF</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
