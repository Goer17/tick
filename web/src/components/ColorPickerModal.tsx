import { useState } from "react";
import { Palette, Shuffle, X } from "lucide-react";
import type { Category } from "../types";
import { PALETTE, randomColor } from "../lib/colors";

interface ColorPickerModalProps {
  category: Category;
  onClose: () => void;
  onSave: (color: string) => Promise<void>;
}

export function ColorPickerModal({ category, onClose, onSave }: ColorPickerModalProps): React.JSX.Element {
  const [color, setColor] = useState(category.color || randomColor());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onSave(color);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update color.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="settings-modal color-modal" onClick={(event) => event.stopPropagation()} aria-label="Change list color">
        <header className="modal-header">
          <div>
            <span className="eyebrow">List color</span>
            <h2>{category.name}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="settings-body">
          <div className="color-modal-preview">
            <span className="color-preview-dot" style={{ background: color }} />
            <span>Pick a color for this list.</span>
            <button type="button" className="random-color" onClick={() => setColor(randomColor())}>
              <Shuffle size={13} /> Random
            </button>
          </div>
          <div className="color-picker color-picker-large">
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
          {error ? <p className="form-error">{error}</p> : null}
          <div className="color-modal-actions">
            <button className="ghost-button" type="button" onClick={onClose}>Cancel</button>
            <button className="primary-button" type="button" onClick={() => void save()} disabled={busy}>
              <Palette size={14} /> {busy ? "Saving…" : "Use color"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
