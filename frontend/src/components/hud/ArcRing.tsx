import { useEffect, useState } from "react";

/**
 * Arc-reactor style radial progress. Two concentric tracks: a thin outer
 * tick ring and a thick animated progress arc with a glowing terminal cap.
 */
export function ArcRing({
  value,
  size = 148,
  stroke = 8,
  label,
  sublabel,
}: {
  /** 0–100 */
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const timer = requestAnimationFrame(() => setAnimated(value));
    return () => cancelAnimationFrame(timer);
  }, [value]);

  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, animated));
  const dash = (clamped / 100) * circumference;
  const center = size / 2;

  // Tick marks around the outer edge
  const ticks = Array.from({ length: 48 }, (_, i) => i);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-from)" />
            <stop offset="50%" stopColor="var(--accent-via)" />
            <stop offset="100%" stopColor="var(--accent-to)" />
          </linearGradient>
          <filter id="arcGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* base track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--hud-line)"
          strokeWidth={stroke}
        />

        {/* progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#arcGradient)"
          strokeWidth={stroke}
          strokeLinecap="butt"
          strokeDasharray={`${dash} ${circumference}`}
          filter="url(#arcGlow)"
          style={{ transition: "stroke-dasharray 1.1s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>

      {/* outer tick ring */}
      <svg width={size} height={size} className="pointer-events-none absolute inset-0">
        {ticks.map((i) => {
          const angle = (i / ticks.length) * 2 * Math.PI - Math.PI / 2;
          const outer = center - 1;
          const inner = center - (i % 4 === 0 ? 7 : 4);
          return (
            <line
              key={i}
              x1={center + Math.cos(angle) * inner}
              y1={center + Math.sin(angle) * inner}
              x2={center + Math.cos(angle) * outer}
              y2={center + Math.sin(angle) * outer}
              stroke="var(--hud-line)"
              strokeWidth={i % 4 === 0 ? 1.2 : 0.6}
              opacity={i / ticks.length <= clamped / 100 ? 0.95 : 0.35}
            />
          );
        })}
      </svg>

      {/* center readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="hud-readout text-3xl font-semibold leading-none">{Math.round(clamped)}</span>
        <span className="hud-label mt-1 !text-[9px]">{label ?? "%"}</span>
        {sublabel && <span className="hud-readout mt-1.5 text-[10px] text-[var(--hud-text-dim)]">{sublabel}</span>}
      </div>
    </div>
  );
}
