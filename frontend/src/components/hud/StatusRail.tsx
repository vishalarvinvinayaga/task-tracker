import { useEffect, useState } from "react";

/** Live clock + system status strip, rendered in the header. */
export function StatusRail({ timezone }: { timezone: string }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  let clock = now.toLocaleTimeString(undefined, { hour12: false });
  let zoneAbbr = "";
  try {
    clock = now.toLocaleTimeString("en-GB", { timeZone: timezone, hour12: false });
    zoneAbbr =
      new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "short" })
        .formatToParts(now)
        .find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    // stored timezone unusable — fall back to local formatting
  }

  return (
    <div className="flex items-center gap-4">
      <span className="hidden items-center gap-1.5 sm:flex">
        <span
          className="hud-live-dot inline-block h-1.5 w-1.5 rounded-full"
          style={{ color: "var(--accent-via)", background: "var(--accent-via)" }}
        />
        <span className="hud-label !text-[9px]">Online</span>
      </span>
      <span className="hud-readout text-sm tabular-nums">{clock}</span>
      {zoneAbbr && <span className="hud-label !text-[9px]">{zoneAbbr}</span>}
    </div>
  );
}
