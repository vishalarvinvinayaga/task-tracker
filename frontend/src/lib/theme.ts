import type { ThemePreset } from "../api/profile";

/** HUD accent palettes. Tuned bright/neon so glows and scanlines read on dark. */
export const THEME_PRESETS: Record<ThemePreset, { label: string; from: string; via: string; to: string }> = {
  cyan: { label: "Arc Reactor", from: "#22d3ee", via: "#38bdf8", to: "#0ea5e9" },
  indigo: { label: "Deep Field", from: "#60a5fa", via: "#6366f1", to: "#a855f7" },
  emerald: { label: "Bio Signal", from: "#34d399", via: "#14b8a6", to: "#06b6d4" },
  rose: { label: "Threat Alert", from: "#fb7185", via: "#ec4899", to: "#d946ef" },
  amber: { label: "Repulsor", from: "#fbbf24", via: "#f97316", to: "#ef4444" },
  slate: { label: "Stealth", from: "#cbd5e1", via: "#94a3b8", to: "#64748b" },
};

export function applyThemePreset(preset: ThemePreset): void {
  const p = THEME_PRESETS[preset] ?? THEME_PRESETS.cyan;
  const root = document.documentElement;
  root.style.setProperty("--accent-from", p.from);
  root.style.setProperty("--accent-via", p.via);
  root.style.setProperty("--accent-to", p.to);
}
