import type { ReactNode } from "react";

/**
 * The signature HUD frame: angular clipped corners, thin glowing edge,
 * bracket ticks, and an optional technical label rail across the top.
 */
export function HudPanel({
  label,
  meta,
  children,
  className = "",
  interactive = false,
  scan = false,
}: {
  label?: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  scan?: boolean;
}) {
  return (
    <div
      className={`hud-frame hud-bracket ${interactive ? "hud-interactive" : ""} ${scan ? "hud-scanline" : ""} ${className}`}
    >
      {(label || meta) && (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--hud-line)] px-4 py-2">
          {label && (
            <span className="hud-label flex items-center gap-2">
              <span
                className="inline-block h-1 w-1 shrink-0"
                style={{ background: "var(--accent-via)", boxShadow: "0 0 6px 1px var(--accent-via)" }}
              />
              {label}
            </span>
          )}
          {meta && <span className="hud-readout text-[10px] text-[var(--hud-text-dim)]">{meta}</span>}
        </div>
      )}
      <div className="relative p-4">{children}</div>
    </div>
  );
}
