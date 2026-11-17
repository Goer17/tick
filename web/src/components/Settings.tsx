import { Clock3, LogOut, Moon, Play, Sun, Volume2, VolumeX, X } from "lucide-react";
import { previewSound } from "../lib/sounds";
import type { ThemeMode } from "../types";
import { autoTheme } from "../lib/theme";

interface SettingsProps {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
  onClose: () => void;
  onLogout: () => void;
  soundEnabled: boolean;
  soundVolume: number;
  onSoundEnabled: (enabled: boolean) => void;
  onSoundVolume: (volume: number) => void;
}

const OPTIONS: { value: ThemeMode; label: string; hint: string; icon: React.ReactNode }[] = [
  { value: "light", label: "Light", hint: "Always bright", icon: <Sun size={16} /> },
  { value: "dark", label: "Dark", hint: "Always dim", icon: <Moon size={16} /> },
  { value: "auto", label: "Auto", hint: "Light 07:00–19:00", icon: <Clock3 size={16} /> },
];

export function Settings({
  mode,
  onChange,
  onClose,
  onLogout,
  soundEnabled,
  soundVolume,
  onSoundEnabled,
  onSoundVolume,
}: SettingsProps): React.JSX.Element {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="settings-modal" onClick={(event) => event.stopPropagation()} aria-label="Settings">
        <header className="modal-header">
          <div>
            <span className="eyebrow">Preferences</span>
            <h2>Settings</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close settings">
            <X size={18} />
          </button>
        </header>
        <div className="settings-body">
          <div className="settings-label">Appearance</div>
          <div className="theme-options">
            {OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`theme-option ${mode === option.value ? "selected" : ""}`}
                onClick={() => onChange(option.value)}
              >
                {option.icon}
                <span className="theme-option-copy">
                  <strong>{option.label}</strong>
                  <small>{option.hint}</small>
                </span>
                <span className={`radio-dot ${mode === option.value ? "on" : ""}`} />
              </button>
            ))}
          </div>
          <p className="settings-note">
            Auto is time-based: light from 07:00 to 19:00, dark otherwise. It is{" "}
            {autoTheme() === "dark" ? "dark" : "light"} right now.
          </p>

          <div className="settings-divider" />
          <div className="settings-label">Sound</div>
          <button className="sound-toggle-row" type="button" onClick={() => onSoundEnabled(!soundEnabled)}>
            <span className="sound-icon">{soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}</span>
            <span className="sound-copy">
              <strong>Interface sounds</strong>
              <small>Subtle cues for completing and organizing tasks</small>
            </span>
            <span className={`switch ${soundEnabled ? "on" : ""}`}><span /></span>
          </button>
          <div className={`volume-row ${soundEnabled ? "" : "disabled"}`}>
            <Volume2 size={14} />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(soundVolume * 100)}
              disabled={!soundEnabled}
              onChange={(event) => onSoundVolume(Number(event.target.value) / 100)}
              aria-label="Sound volume"
            />
            <span>{Math.round(soundVolume * 100)}%</span>
            <button className="sound-test" type="button" disabled={!soundEnabled} onClick={previewSound}>
              <Play size={12} /> Test
            </button>
          </div>

          <div className="settings-divider" />
          <button className="signout-button" onClick={onLogout}>
            <LogOut size={15} /> Sign out of this workspace
          </button>
        </div>
      </section>
    </div>
  );
}
