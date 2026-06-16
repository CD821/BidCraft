import { Icon } from "./Icon";

export function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-label={title}
        aria-modal="true"
        className={`modal ${wide ? "modal-wide" : ""}`}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} type="button">
            <Icon name="x" />
            <span className="sr-only">Close</span>
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
