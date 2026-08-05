import { NavLink } from "react-router-dom";
import { useState } from "react";
import { useDarkMode } from "../../hooks/useDarkMode";
import { useProfile } from "../../hooks/useProfile";
import { PunchClock } from "../time/PunchClock";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", code: "DSH", end: true },
  { to: "/sprints", label: "Sprints", code: "SPR" },
  { to: "/notes", label: "Notes", code: "NTE" },
  { to: "/kb", label: "Knowledge Base", code: "KDB" },
  { to: "/calendar", label: "Calendar", code: "CAL" },
  { to: "/time", label: "Time", code: "TME" },
  { to: "/inbox", label: "Inbox", code: "INB" },
  { to: "/templates", label: "Templates", code: "TPL" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, toggleDark] = useDarkMode();
  const { profile } = useProfile();

  return (
    <aside
      className={`glass-panel relative z-20 flex h-full flex-col border-y-0 border-l-0 transition-all duration-300 ${
        collapsed ? "w-[68px]" : "w-60"
      }`}
    >
      {/* edge glow */}
      <span
        aria-hidden
        className="absolute inset-y-0 right-0 w-px"
        style={{ background: "linear-gradient(to bottom, transparent, var(--accent-via), transparent)", opacity: 0.5 }}
      />

      <div className="flex items-center justify-between px-3 py-4">
        {!collapsed && (
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="hud-live-dot inline-block h-2 w-2 shrink-0 rotate-45"
              style={{ color: "var(--accent-via)", background: "var(--accent-via)" }}
            />
            <span className="gradient-text hud-mono truncate text-xs font-bold uppercase tracking-[0.16em]">
              Command
            </span>
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hud-label rounded p-1 transition-colors hover:text-[var(--accent-via)]"
          aria-label="Toggle sidebar"
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `group flex items-center gap-2.5 px-3 py-2 text-sm transition-all ${
                isActive
                  ? "nav-item-active font-medium"
                  : "text-slate-600 hover:bg-[color-mix(in_srgb,var(--accent-via)_10%,transparent)] hover:text-[var(--accent-via)] dark:text-slate-300"
              }`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="hud-mono shrink-0 text-[9px] font-bold tracking-wider opacity-60">{item.code}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1.5 border-t border-[var(--hud-line)] p-2">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center justify-between px-3 py-2 text-sm transition-all ${
              isActive
                ? "nav-item-active font-medium"
                : "text-slate-600 hover:bg-[color-mix(in_srgb,var(--accent-via)_10%,transparent)] hover:text-[var(--accent-via)] dark:text-slate-300"
            }`
          }
          title={collapsed ? "Settings" : undefined}
        >
          {collapsed ? (
            <span className="hud-mono text-[9px] font-bold tracking-wider opacity-60">CFG</span>
          ) : (
            <>
              <span className="truncate">{profile?.name ?? "Settings"}</span>
              <span className="hud-mono text-[9px] opacity-60">CFG</span>
            </>
          )}
        </NavLink>

        <button
          onClick={toggleDark}
          className="hud-label w-full px-3 py-2 text-left transition-colors hover:text-[var(--accent-via)]"
        >
          {collapsed ? (dark ? "☀" : "☾") : dark ? "Light mode" : "Dark mode"}
        </button>

        <PunchClock collapsed={collapsed} />
      </div>
    </aside>
  );
}
