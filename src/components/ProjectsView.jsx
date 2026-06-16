import { useMemo, useState } from "react";
import { projectTotals, money } from "../lib/calc";
import { Icon } from "./Icon";

export function ProjectsView({
  activeProjectId,
  onCreate,
  onDelete,
  onOpen,
  projects,
}) {
  const [query, setQuery] = useState("");
  const filteredProjects = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter((project) =>
      [
        project.name,
        project.client,
        project.proposalNumber,
        project.status,
        project.address,
      ].some((value) => String(value || "").toLowerCase().includes(term)),
    );
  }, [projects, query]);

  return (
    <main className="page-content">
      <div className="page-heading">
        <div>
          <h2>Projects</h2>
          <p>Create estimates, track bid value, and reopen work in progress.</p>
        </div>
        <div className="projects-heading-actions">
          <label className="search-field project-search">
            <Icon name="search" size={18} />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects"
              value={query}
            />
          </label>
          <button className="button primary" onClick={onCreate} type="button">
            <Icon name="plus" size={18} />
            New estimate
          </button>
        </div>
      </div>

      <div className="project-list">
        <div className="list-header project-grid">
          <span className="project-cell-project">Project</span>
          <span className="project-cell-client">Client</span>
          <span className="project-cell-status">Status</span>
          <span className="project-cell-total">Bid total</span>
          <span className="project-cell-actions">Actions</span>
        </div>
        {filteredProjects.map((project) => {
          const totals = projectTotals(project);
          return (
            <article
              className={`project-row project-grid ${
                project.id === activeProjectId ? "row-current" : ""
              }`}
              key={project.id}
            >
              <button
                className="project-name"
                onClick={() => onOpen(project.id)}
                type="button"
              >
                <strong>{project.name}</strong>
                <span>{project.proposalNumber}</span>
              </button>
              <span className="project-cell-client">
                {project.client || "No client yet"}
              </span>
              <span className="project-cell-status status-text">
                {project.status}
              </span>
              <strong className="project-cell-total">
                {money.format(totals.total)}
              </strong>
              <div className="project-cell-actions row-actions">
                <button
                  className="button small secondary"
                  onClick={() => onOpen(project.id)}
                  type="button"
                >
                  Open
                </button>
                <button
                  className="icon-button danger"
                  onClick={() => onDelete(project.id)}
                  type="button"
                >
                  <Icon name="trash" size={17} />
                  <span className="sr-only">Delete project</span>
                </button>
              </div>
            </article>
          );
        })}
        {!filteredProjects.length ? (
          <div className="project-empty">
            <Icon name="search" size={24} />
            <strong>No matching projects</strong>
            <span>Try a project name, client, proposal number, or status.</span>
          </div>
        ) : null}
      </div>
    </main>
  );
}
