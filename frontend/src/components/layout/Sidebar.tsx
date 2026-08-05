import { NavLink } from "react-router-dom";
import { useState } from "react";
import { useDarkMode } from "../../hooks/useDarkMode";
import { useProfile } from "../../hooks/useProfile";
import { PunchClock } from "../time/PunchClock";
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconDashboard,
  IconInbox,
  IconKnowledge,
  IconMoon,
  IconNotes,
  IconSettings,
  IconSun,
  IconTemplates,
  IconTime,
  IconTracker,
} from "../hud/Icons";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", Icon: IconDashboard, end: true },
  { to: "/sprints", label: "Tracker", Icon: IconTracker },
  { to: "/notes", label: "Notes", Icon: IconNotes },
  { to: "/kb", label: "Knowledge Base", Icon: IconKnowledge },
  { to: "/calendar", label: "Calendar", Icon: IconCalendar },
  { to: "/time", label: "Time", Icon: IconTime },
  { to: "/inbox", label: "Inbox", Icon: IconInbox },
  { to: "/templates", label: "Templates", Icon: IconTemplates },
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
          className="p-1 text-[var(--hud-text-dim)] transition-colors hover:text-[var(--accent-via)]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <IconChevronRight className="h-4 w-4" /> : <IconChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 text-sm transition-all ${collapsed ? "justify-center" : ""} ${
                isActive
                  ? "nav-item-active font-medium"
                  : "text-slate-600 hover:bg-[color-mix(in_srgb,var(--accent-via)_10%,transparent)] hover:text-[var(--accent-via)] dark:text-slate-300"
              }`
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="h-[18px] w-[18px]" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1.5 border-t border-[var(--hud-line)] p-2">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 text-sm transition-all ${collapsed ? "justify-center" : ""} ${
              isActive
                ? "nav-item-active font-medium"
                : "text-slate-600 hover:bg-[color-mix(in_srgb,var(--accent-via)_10%,transparent)] hover:text-[var(--accent-via)] dark:text-slate-300"
            }`
          }
          title={collapsed ? "Settings" : undefined}
        >
          <IconSettings className="h-[18px] w-[18px]" />
          {!collapsed && <span className="truncate">{profile?.name ?? "Settings"}</span>}
        </NavLink>

        <button
          onClick={toggleDark}
          className={`flex w-full items-center gap-3 px-3 py-2 text-sm text-[var(--hud-text-dim)] transition-colors hover:text-[var(--accent-via)] ${
            collapsed ? "justify-center" : ""
          }`}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <IconSun className="h-[18px] w-[18px]" /> : <IconMoon className="h-[18px] w-[18px]" />}
          {!collapsed && <span>{dark ? "Light mode" : "Dark mode"}</span>}
        </button>

        <PunchClock collapsed={collapsed} />
      </div>
    </aside>
  );
}
