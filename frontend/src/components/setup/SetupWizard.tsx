import { useState } from "react";
import { useProfile } from "../../hooks/useProfile";
import { applyThemePreset, THEME_PRESETS } from "../../lib/theme";
import { COMMON_TIMEZONES, detectTimezone, formatTimezoneLabel } from "../../lib/timezones";
import type { ThemePreset } from "../../api/profile";

export function SetupWizard() {
  const { createProfile } = useProfile();
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState(detectTimezone());
  const [preset, setPreset] = useState<ThemePreset>("indigo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detected = detectTimezone();
  const timezoneOptions = COMMON_TIMEZONES.includes(detected) ? COMMON_TIMEZONES : [detected, ...COMMON_TIMEZONES];

  async function submit() {
    if (!name.trim()) {
      setError("Enter your name to continue.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createProfile({ name: name.trim(), timezone, theme_preset: preset });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hud-grid-bg flex min-h-screen items-center justify-center p-6">
      <div className="hud-frame hud-bracket hud-scanline hud-boot w-full max-w-lg p-8 shadow-2xl">
        <div className="mb-2 flex items-center gap-2">
          <span
            className="hud-live-dot inline-block h-2 w-2 rotate-45"
            style={{ color: "var(--accent-via)", background: "var(--accent-via)" }}
          />
          <span className="hud-label !text-[10px]">System Initialisation</span>
        </div>
        <h1 className="mb-1.5 text-2xl font-semibold tracking-wide">
          Bringing your <span className="gradient-text">Command Center</span> online
        </h1>
        <p className="mb-7 text-sm text-[var(--hud-text-dim)]">
          Three parameters, then you're operational — sprints, notes, and time tracking in one console.
        </p>

        <div className="space-y-5">
          <div>
            <label className="hud-label mb-1.5 block">01 · Operator</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Your name"
              className="w-full border border-[var(--hud-line)] bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--hud-line-strong)]"
            />
          </div>

          <div>
            <label className="hud-label mb-1.5 block">02 · Local Time Zone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full border border-[var(--hud-line)] bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--hud-line-strong)] dark:bg-[#050b16]"
            >
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {formatTimezoneLabel(tz)}
                </option>
              ))}
            </select>
            <p className="hud-readout mt-1.5 text-[10px] text-[var(--hud-text-dim)]">
              AUTO-DETECTED: {detected.replace(/_/g, " ")}
            </p>
          </div>

          <div>
            <label className="hud-label mb-2 block">03 · Interface Signature</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(THEME_PRESETS) as [ThemePreset, (typeof THEME_PRESETS)[ThemePreset]][]).map(([key, p]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setPreset(key);
                    applyThemePreset(key);
                  }}
                  className="border p-2 text-left transition-all"
                  style={{
                    borderColor: preset === key ? p.via : "var(--hud-line)",
                    boxShadow: preset === key ? `0 0 18px -6px ${p.via}` : undefined,
                  }}
                >
                  <div
                    className="mb-1.5 h-5 w-full"
                    style={{ backgroundImage: `linear-gradient(90deg, ${p.from}, ${p.via}, ${p.to})` }}
                  />
                  <span className="hud-mono text-[9px] font-semibold uppercase tracking-wider">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="hud-readout text-xs text-rose-400">⚠ {error}</p>}

          <button
            onClick={submit}
            disabled={busy}
            className="btn-primary w-full px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.14em]"
          >
            {busy ? "Initialising…" : "Bring systems online"}
          </button>
        </div>
      </div>
    </div>
  );
}
