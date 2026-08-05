import { useProfile } from "../../hooks/useProfile";
import { StatusRail } from "../hud/StatusRail";

export function Header({ title, code }: { title: string; code?: string }) {
  const { profile } = useProfile();

  return (
    <header className="glass-panel sticky top-0 z-10 border-x-0 border-t-0 px-6 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {code && (
            <span
              className="hud-mono shrink-0 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.2em]"
              style={{
                color: "var(--accent-via)",
                border: "1px solid var(--hud-line-strong)",
              }}
            >
              {code}
            </span>
          )}
          <h1 className="truncate text-base font-semibold tracking-wide">{title}</h1>
        </div>
        <StatusRail timezone={profile?.timezone ?? "UTC"} />
      </div>
    </header>
  );
}
