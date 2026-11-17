import type { ThemeMode } from "../types";

const THEME_KEY = "tick-theme";

export function getThemeMode(): ThemeMode {
  const value = localStorage.getItem(THEME_KEY);
  return value === "light" || value === "dark" || value === "auto" ? value : "auto";
}

export function setThemeMode(mode: ThemeMode): void {
  localStorage.setItem(THEME_KEY, mode);
}

export function autoTheme(date = new Date()): "light" | "dark" {
  const hour = date.getHours();
  return hour >= 19 || hour < 7 ? "dark" : "light";
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  return mode === "auto" ? autoTheme() : mode;
}

export function applyTheme(mode: ThemeMode): void {
  document.documentElement.dataset.theme = resolveTheme(mode);
  document.documentElement.style.colorScheme = resolveTheme(mode);
}
