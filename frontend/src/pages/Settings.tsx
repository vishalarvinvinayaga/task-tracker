import { useEffect, useState } from "react";
import { Header } from "../components/layout/Header";
import { useProfile } from "../hooks/useProfile";
import { useToast } from "../hooks/useToast";
import { applyThemePreset, THEME_PRESETS } from "../lib/theme";
import { COMMON_TIMEZONES, formatTimezoneLabel } from "../lib/timezones";
import type { ThemePreset } from "../api/profile";

export function Settings() {
  const { profile, updateProfile } = useProfile();
  const toast = useToast();
  const [name, setName] = useState(profile?.name ?? "");
  const [timezone, setTimezone] = useState(profile?.timezone ?? "UTC");
  const [preset, setPreset] = useState<ThemePreset>((profile?.theme_preset as ThemePreset) ?? "indigo");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setTimezone(profile.timezone);
    setPreset(profile.theme_preset);
  }, [profile]);

  const timezoneOptions = profile && !COMMON_TIMEZONES.includes(profile.timezone) ? [profile.timezone, ...COMMON_TIMEZONES] : COMMON_TIMEZONES;

  async function save() {
    setBusy(true);
    try {
      await updateProfile({ name: name.trim(), timezone, theme_preset: preset });
      toast.show("Settings saved");
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Failed to save settings", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return null;

  return (
    <>
      <Header title="Settings" />
      <div className="mx-auto max-w-lg space-y-6 p-6">
        <div className="glass-card rounded-xl p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
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
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Accent color</h2>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(THEME_PRESETS) as [ThemePreset, (typeof THEME_PRESETS)[ThemePreset]][]).map(([key, p]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setPreset(key);
                  applyThemePreset(key);
                }}
                className="rounded-lg border p-2 text-left transition-all"
                style={{
                  borderColor: preset === key ? p.via : undefined,
                  boxShadow: preset === key ? `0 0 0 2px ${p.via}` : undefined,
                }}
              >
                <div className="mb-1.5 h-6 w-full rounded-md" style={{ backgroundImage: `linear-gradient(90deg, ${p.from}, ${p.via}, ${p.to})` }} />
                <span className="text-[11px] font-medium">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={busy} className="btn-primary w-full rounded-lg px-4 py-2.5 text-sm font-semibold">
          {busy ? "Saving…" : "Save settings"}
        </button>
      </div>
    </>
  );
}
