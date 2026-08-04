import type { ThemePreset } from "../api/profile";

export const THEME_PRESETS: Record<ThemePreset, { label: string; from: string; via: string; to: string }> = {
  indigo: { label: "Indigo / Violet", from: "#3b82f6", via: "#6366f1", to: "#a855f7" },
  emerald: { label: "Emerald / Teal", from: "#10b981", via: "#14b8a6", to: "#06b6d4" },
  rose: { label: "Rose / Fuchsia", from: "#f43f5e", via: "#ec4899", to: "#d946ef" },
  cyan: { label: "Cyan / Sky", from: "#06b6d4", via: "#0ea5e9", to: "#3b82f6" },
  amber: { label: "Amber / Ember", from: "#f59e0b", via: "#f97316", to: "#ef4444" },
  slate: { label: "Slate (mono)", from: "#94a3b8", via: "#64748b", to: "#334155" },
};

export function applyThemePreset(preset: ThemePreset): void {
  const p = THEME_PRESETS[preset] ?? THEME_PRESETS.indigo;
  const root = document.documentElement;
  root.style.setProperty("--accent-from", p.from);
  root.style.setProperty("--accent-via", p.via);
  root.style.setProperty("--accent-to", p.to);
}
