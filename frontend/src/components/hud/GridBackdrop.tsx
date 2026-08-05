/**
 * Ambient layer behind the whole app: a slowly drifting technical grid,
 * a horizon glow, and vignette corners. Purely decorative.
 */
export function GridBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="hud-grid-bg absolute inset-0 opacity-70" />

      {/* horizon sweep */}
      <div
        className="absolute inset-x-0 top-1/3 h-px opacity-40"
        style={{
          background: "linear-gradient(90deg, transparent, var(--accent-via), transparent)",
        }}
      />

      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.35) 100%)",
        }}
      />
    </div>
  );
}
