import { useState } from "react";
import { FolderPlus, Shuffle, X } from "lucide-react";
import type { Category } from "../types";
import { categoryPath } from "../lib/dates";
import { PALETTE, randomColor } from "../lib/colors";

interface NewListModalProps {
  parentId: string | null;
  categories: Category[];
  onClose: () => void;
  onCreate: (input: { name: string; parentId: string | null; color: string }) => Promise<void>;
}

export function NewListModal({ parentId, categories, onClose, onCreate }: NewListModalProps): React.JSX.Element {
  const [name, setName] = useState("");
  const [parent, setParent] = useState(parentId ?? "");
  const [color, setColor] = useState(() => randomColor());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await onCreate({ name: name.trim(), parentId: parent || null, color });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create list.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="new-list-modal" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <header className="modal-header">
          <div>
            <span className="eyebrow">{parent ? "Sublist" : "List"}</span>
            <h2>New list</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="new-list-body">
          <label className="field">
            <span className="field-label"><FolderPlus size={13} /> Name</span>
            <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Research" />
          </label>
          <label className="field">
            <span className="field-label">Parent list</span>
            <select value={parent} onChange={(event) => setParent(event.target.value)}>
              <option value="">None — top level</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {categoryPath(category.id, categories)}
                </option>
              ))}
            </select>
          </label>
          <div className="field">
            <span className="field-label">Color</span>
            <div className="color-picker-row">
              <div className="color-picker">
                {PALETTE.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    className={`color-swatch ${color === swatch ? "selected" : ""}`}
                    style={{ background: swatch }}
                    onClick={() => setColor(swatch)}
                    aria-label={`Use color ${swatch}`}
                  />
                ))}
              </div>
              <button type="button" className="random-color" onClick={() => setColor(randomColor())} title="Pick a random color">
                <Shuffle size={13} /> Random
              </button>
            </div>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
        </div>
        <footer className="modal-footer">
          <button className="ghost-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" type="submit" disabled={busy || !name.trim()}>
            {busy ? "Creating…" : "Create list"}
          </button>
        </footer>
      </form>
    </div>
  );
}
