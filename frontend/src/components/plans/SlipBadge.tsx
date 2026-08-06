/**
 * Slipping once is ordinary — days get away from you. Slipping repeatedly is
 * information, so the badge escalates rather than nagging identically forever.
 */
export function SlipBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  const chronic = count >= 3;
  const label = count === 1 ? "Slipped once" : `Slipped ${count}×`;
  const tone = chronic
    ? { color: "#fb7185", border: "rgba(251,113,133,0.55)", bg: "rgba(251,113,133,0.12)" }
    : { color: "#fbbf24", border: "rgba(251,191,36,0.5)", bg: "rgba(251,191,36,0.10)" };

  return (
    <span
      className="hud-mono inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
      style={{ color: tone.color, border: `1px solid ${tone.border}`, background: tone.bg }}
      title={
        chronic
          ? `Planned ${count} days without finishing — worth asking whether it's blocked, too big, or not actually wanted.`
          : `Planned ${count} previous day${count === 1 ? "" : "s"} without finishing.`
      }
    >
      {chronic && <span aria-hidden>⚠</span>}
      {label}
    </span>
  );
}
