import { useState } from "react";
import { Pencil, X } from "lucide-react";
import type { Category } from "../types";

interface RenameListModalProps {
  category: Category;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export function RenameListModal({ category, onClose, onSave }: RenameListModalProps): React.JSX.Element {
  const [name, setName] = useState(category.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    const next = name.trim();
    if (!next || busy) return;
    setBusy(true);
    setError("");
    try {
      await onSave(next);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not rename list.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="settings-modal rename-list-modal" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <header className="modal-header">
          <div>
            <span className="eyebrow">List</span>
            <h2>Rename list</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="new-list-body">
          <label className="field">
            <span className="field-label"><Pencil size={13} /> Name</span>
            <input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
        </div>
        <footer className="modal-footer">
          <button className="ghost-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" type="submit" disabled={busy || !name.trim() || name.trim() === category.name}>
            {busy ? "Saving…" : "Rename"}
          </button>
        </footer>
      </form>
    </div>
  );
}
