import { NavLink } from "react-router-dom";
import { useState } from "react";
import { useDarkMode } from "../../hooks/useDarkMode";
import { useProfile } from "../../hooks/useProfile";
import { PunchClock } from "../time/PunchClock";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/sprints", label: "Sprints" },
  { to: "/notes", label: "Notes" },
  { to: "/kb", label: "Knowledge Base" },
  { to: "/calendar", label: "Calendar" },
  { to: "/time", label: "Time" },
  { to: "/inbox", label: "Inbox" },
  { to: "/templates", label: "Templates" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, toggleDark] = useDarkMode();
  const { profile } = useProfile();

  return (
    <aside
      className={`glass-panel relative z-10 flex h-full flex-col transition-all ${collapsed ? "w-16" : "w-56"}`}
    >
      <div className="flex items-center justify-between px-3 py-4">
        {!collapsed && (
          <span className="flex items-center gap-2 truncate text-sm font-semibold">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundImage: "linear-gradient(90deg, var(--accent-from), var(--accent-to))" }}
            />
            <span className="gradient-text">Command Center</span>
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
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
              `block rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                isActive
                  ? "nav-item-active"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]"
              }`
            }
            title={collapsed ? item.label : undefined}
          >
            {collapsed ? item.label.slice(0, 2) : item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-200/70 p-2 dark:border-white/10">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `mb-1 flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              isActive ? "nav-item-active" : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]"
            }`
          }
          title={collapsed ? "Settings" : undefined}
        >
          {collapsed ? "⚙" : (
            <>
              <span className="truncate">{profile?.name ?? "Settings"}</span>
              <span className="shrink-0 text-xs opacity-70">⚙</span>
            </>
          )}
        </NavLink>
        <button
          onClick={toggleDark}
          className="mb-2 w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]"
        >
          {collapsed ? (dark ? "☀" : "☾") : dark ? "Light mode" : "Dark mode"}
        </button>
        <PunchClock collapsed={collapsed} />
      </div>
    </aside>
  );
}
