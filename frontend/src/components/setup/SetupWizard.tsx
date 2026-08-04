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
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-panel w-full max-w-lg rounded-2xl p-8 shadow-2xl">
        <div className="mb-1 flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundImage: "linear-gradient(90deg, var(--accent-from), var(--accent-to))" }}
          />
          <span className="gradient-text text-sm font-semibold uppercase tracking-wide">Welcome</span>
        </div>
        <h1 className="mb-1 text-2xl font-semibold">Let's set up your Command Center</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Just a few things, then it's yours — sprints, notes, time tracking, all in one place.
        </p>

        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">What should we call you?</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Your name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
            >
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {formatTimezoneLabel(tz)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">Detected: {detected.replace(/_/g, " ")}. Used for greetings and display — change anytime.</p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-gray-500">Pick your accent color</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(THEME_PRESETS) as [ThemePreset, (typeof THEME_PRESETS)[ThemePreset]][]).map(([key, p]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setPreset(key);
                    applyThemePreset(key);
                  }}
                  className={`rounded-lg border p-2 text-left transition-all ${
                    preset === key ? "border-transparent ring-2 ring-offset-2 ring-offset-transparent" : "border-gray-200 dark:border-white/10"
                  }`}
                  style={preset === key ? { boxShadow: `0 0 0 2px ${p.via}` } : undefined}
                >
                  <div
                    className="mb-1.5 h-6 w-full rounded-md"
                    style={{ backgroundImage: `linear-gradient(90deg, ${p.from}, ${p.via}, ${p.to})` }}
                  />
                  <span className="text-[11px] font-medium">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button onClick={submit} disabled={busy} className="btn-primary w-full rounded-lg px-4 py-2.5 text-sm font-semibold">
            {busy ? "Setting up…" : "Enter Command Center"}
          </button>
        </div>
      </div>
    </div>
  );
}
