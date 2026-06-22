import { useRef, useState } from "react";
import { Icon } from "./Icon";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

function fileSize(bytes = 0) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

export function AttachmentsView({ project, toast, updateProject }) {
  const inputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const attachments = project.attachments || [];

  function patchAttachments(nextAttachments) {
    updateProject({ ...project, attachments: nextAttachments });
  }

  async function addFiles(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setIsUploading(true);

    try {
      const accepted = [];
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          toast(`${file.name} is larger than 8 MB.`, "error");
          continue;
        }
        accepted.push({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          notes: "",
          uploadedAt: new Date().toISOString(),
          dataUrl: await readFileAsDataUrl(file),
        });
      }

      if (accepted.length) {
        patchAttachments([...attachments, ...accepted]);
        toast(
          accepted.length === 1
            ? "File attached to estimate."
            : `${accepted.length} files attached to estimate.`,
        );
      }
    } catch {
      toast("Could not attach that file.", "error");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function updateAttachment(id, field, value) {
    patchAttachments(
      attachments.map((attachment) =>
        attachment.id === id ? { ...attachment, [field]: value } : attachment,
      ),
    );
  }

  function deleteAttachment(id) {
    patchAttachments(attachments.filter((attachment) => attachment.id !== id));
    toast("Attachment removed.");
  }

  return (
    <main className="tab-page">
      <div className="page-heading material-page-heading">
        <div>
          <h2>Attachments</h2>
          <p>
            Attach drawings, takeoff PDFs, photos, quote sheets, or notes to
            this estimate. Files are saved with the project.
          </p>
        </div>
        <div className="material-heading-actions">
          <button
            className="button primary"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <Icon name="attachments" size={18} />
            {isUploading ? "Attaching..." : "Attach files"}
          </button>
          <input
            className="hidden-input"
            multiple
            onChange={addFiles}
            ref={inputRef}
            type="file"
          />
        </div>
      </div>

      <section className="attachment-summary">
        <div>
          <span>Files</span>
          <strong>{attachments.length}</strong>
        </div>
        <div>
          <span>Total size</span>
          <strong>
            {fileSize(
              attachments.reduce(
                (total, attachment) => total + (Number(attachment.size) || 0),
                0,
              ),
            )}
          </strong>
        </div>
        <p>
          Keep files under 8 MB each. Large attachments can make cloud saves and
          browser storage slower.
        </p>
      </section>

      <div className="attachment-list">
        {attachments.map((attachment) => (
          <article className="attachment-card" key={attachment.id}>
            <div className="attachment-file-icon">
              <Icon name="attachments" size={22} />
            </div>
            <div className="attachment-main">
              <input
                aria-label="Attachment file name"
                className="table-input text-strong"
                onChange={(event) =>
                  updateAttachment(attachment.id, "name", event.target.value)
                }
                value={attachment.name || "Attachment"}
              />
              <div className="attachment-meta">
                <span>{attachment.type || "File"}</span>
                <span>{fileSize(attachment.size)}</span>
                <span>
                  {attachment.uploadedAt
                    ? new Date(attachment.uploadedAt).toLocaleDateString()
                    : "No date"}
                </span>
              </div>
              <input
                aria-label={`Notes for ${attachment.name}`}
                className="table-input"
                onChange={(event) =>
                  updateAttachment(attachment.id, "notes", event.target.value)
                }
                placeholder="Notes, supplier, revision, where this file came from..."
                value={attachment.notes || ""}
              />
            </div>
            <div className="attachment-actions">
              <a
                className="button secondary small"
                download={attachment.name || "attachment"}
                href={attachment.dataUrl}
              >
                <Icon name="download" size={16} />
                Download
              </a>
              <button
                aria-label={`Delete ${attachment.name}`}
                className="icon-button danger"
                onClick={() => deleteAttachment(attachment.id)}
                type="button"
              >
                <Icon name="trash" size={17} />
              </button>
            </div>
          </article>
        ))}
        {!attachments.length ? (
          <button
            className="empty-state attachment-empty"
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <Icon name="attachments" size={30} />
            <h3>No files attached yet</h3>
            <p>Add drawings, PDFs, photos, quote sheets, or project notes.</p>
          </button>
        ) : null}
      </div>
    </main>
  );
}
