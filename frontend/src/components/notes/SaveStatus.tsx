import type { SaveState } from "../../hooks/useAutosave";

const COPY: Record<SaveState, { text: string; tone: string }> = {
  idle: { text: "Up to date", tone: "var(--hud-text-dim)" },
  dirty: { text: "Unsaved…", tone: "var(--hud-text-dim)" },
  saving: { text: "Saving…", tone: "var(--accent-via)" },
  saved: { text: "Saved", tone: "#34d399" },
  error: { text: "Save failed — retrying on next edit", tone: "#fb7185" },
};

/** Quiet confirmation that autosave is doing its job. */
export function SaveStatus({ state }: { state: SaveState }) {
  const { text, tone } = COPY[state];
  return (
    <span className="hud-mono flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: tone }}>
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${state === "saving" ? "hud-live-dot" : ""}`}
        style={{ background: tone, color: tone }}
      />
      {text}
    </span>
  );
}
