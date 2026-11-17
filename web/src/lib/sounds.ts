export type SoundName =
  | "complete"
  | "uncomplete"
  | "add"
  | "delete"
  | "open"
  | "close"
  | "important"
  | "repeat"
  | "theme"
  | "login"
  | "error"
  | "nav"
  | "toggle"
  | "save";

const ENABLED_KEY = "tick-sound-enabled";
const VOLUME_KEY = "tick-sound-volume";

interface Tone {
  f: number;
  at: number;
  dur: number;
  type?: OscillatorType;
  to?: number;
  gain?: number;
}

const SOUNDS: Record<SoundName, Tone[]> = {
  complete: [
    { f: 659.25, at: 0, dur: 0.16, gain: 0.05 },
    { f: 987.77, at: 0.075, dur: 0.22, gain: 0.04 },
  ],
  uncomplete: [
    { f: 392, at: 0, dur: 0.11, gain: 0.035 },
    { f: 293.66, at: 0.06, dur: 0.14, gain: 0.03 },
  ],
  add: [
    { f: 523.25, at: 0, dur: 0.08, gain: 0.035 },
    { f: 783.99, at: 0.055, dur: 0.11, gain: 0.03 },
  ],
  delete: [{ f: 190, at: 0, dur: 0.18, type: "triangle", to: 95, gain: 0.055 }],
  open: [{ f: 480, at: 0, dur: 0.12, type: "sine", to: 760, gain: 0.025 }],
  close: [{ f: 760, at: 0, dur: 0.1, type: "sine", to: 480, gain: 0.02 }],
  important: [
    { f: 523.25, at: 0, dur: 0.24, gain: 0.028 },
    { f: 659.25, at: 0.08, dur: 0.24, gain: 0.025 },
    { f: 783.99, at: 0.16, dur: 0.3, gain: 0.02 },
  ],
  repeat: [
    { f: 880, at: 0, dur: 0.055, gain: 0.03 },
    { f: 1046.5, at: 0.085, dur: 0.055, gain: 0.025 },
  ],
  theme: [{ f: 440, at: 0, dur: 0.16, type: "triangle", to: 660, gain: 0.03 }],
  login: [
    { f: 523.25, at: 0, dur: 0.12, gain: 0.035 },
    { f: 659.25, at: 0.08, dur: 0.12, gain: 0.03 },
    { f: 783.99, at: 0.16, dur: 0.22, gain: 0.025 },
  ],
  error: [{ f: 210, at: 0, dur: 0.16, type: "square", to: 130, gain: 0.025 }],
  nav: [{ f: 640, at: 0, dur: 0.04, type: "sine", gain: 0.012 }],
  toggle: [{ f: 740, at: 0, dur: 0.06, type: "triangle", gain: 0.02 }],
  save: [{ f: 600, at: 0, dur: 0.05, type: "sine", gain: 0.015 }],
};

export interface SoundSettings {
  enabled: boolean;
  volume: number;
}

let context: AudioContext | null = null;

export function getSoundSettings(): SoundSettings {
  const enabled = localStorage.getItem(ENABLED_KEY);
  const volume = Number(localStorage.getItem(VOLUME_KEY) ?? "0.55");
  return {
    enabled: enabled === null ? true : enabled === "true",
    volume: Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.55,
  };
}

export function setSoundEnabled(enabled: boolean): void {
  localStorage.setItem(ENABLED_KEY, String(enabled));
}

export function setSoundVolume(volume: number): void {
  localStorage.setItem(VOLUME_KEY, String(Math.min(1, Math.max(0, volume))));
}

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context ??= new Ctor();
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return null;
  }
}

export function playSound(name: SoundName): void {
  const settings = getSoundSettings();
  if (!settings.enabled || settings.volume <= 0) return;
  const ctx = audioContext();
  if (!ctx) return;
  const now = ctx.currentTime + 0.005;
  const master = settings.volume * 0.55;

  for (const tone of SOUNDS[name]) {
    const start = now + tone.at;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = tone.type ?? "sine";
    oscillator.frequency.setValueAtTime(tone.f, start);
    if (tone.to) oscillator.frequency.exponentialRampToValueAtTime(tone.to, start + tone.dur);
    const peak = Math.max(0.0001, (tone.gain ?? 0.03) * master);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.dur);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + tone.dur + 0.03);
  }
}

export function previewSound(): void {
  playSound("complete");
}
