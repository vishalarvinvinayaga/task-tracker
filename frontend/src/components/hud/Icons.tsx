/**
 * Inline SVG icon set — thin geometric strokes to match the HUD chrome.
 * Kept local rather than pulling an icon library for ~12 glyphs.
 */
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Svg({ className = "h-4 w-4", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg {...base} className={`shrink-0 ${className}`} aria-hidden focusable="false">
      {children}
    </svg>
  );
}

/** Radial gauge — the dashboard readout. */
export const IconDashboard = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 12 15.5 8.5" />
    <path d="M12 3.5v2M20.5 12h-2M12 20.5v-2M3.5 12h2" />
  </Svg>
);

/** Kanban columns — the tracker. */
export const IconTracker = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="5.5" height="16" rx="1" />
    <rect x="10.5" y="4" width="5.5" height="10" rx="1" />
    <rect x="18" y="4" width="3" height="13" rx="1" />
  </Svg>
);

export const IconNotes = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 3.5h9L19 8v12.5H5z" />
    <path d="M14 3.5V8h5" />
    <path d="M8.5 12.5h7M8.5 16h5" />
  </Svg>
);

/** Stacked layers — the knowledge base. */
export const IconKnowledge = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 21 8l-9 4.5L3 8z" />
    <path d="M3 12.5 12 17l9-4.5" />
    <path d="M3 17 12 21.5 21 17" />
  </Svg>
);

export const IconCalendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="1.5" />
    <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
  </Svg>
);

export const IconTime = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v5.2l3.4 2" />
  </Svg>
);

export const IconInbox = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 13.5 6 5h12l2.5 8.5v5.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z" />
    <path d="M3.5 13.5h5l1 2.5h5l1-2.5h5" />
  </Svg>
);

export const IconTemplates = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="4" width="17" height="16" rx="1.5" />
    <path d="M3.5 9h17M9 9v11" />
  </Svg>
);

/** Sliders, not a cog — a spoked cog reads as a sun next to the theme toggle. */
export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h10M18 7h2M4 12h3M11 12h9M4 17h7M15 17h5" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="9" cy="12" r="2" />
    <circle cx="13" cy="17" r="2" />
  </Svg>
);

export const IconSun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.4M12 19.1v2.4M21.5 12h-2.4M4.9 12H2.5M18.7 5.3l-1.7 1.7M7 17l-1.7 1.7M18.7 18.7 17 17M7 7 5.3 5.3" />
  </Svg>
);

export const IconMoon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 14.2A8.5 8.5 0 0 1 9.8 4a8.5 8.5 0 1 0 10.2 10.2z" />
  </Svg>
);

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6.5h16M9.5 6.5V4.5h5v2M6 6.5l1 13.5h10l1-13.5" />
    <path d="M10 10.5v6M14 10.5v6" />
  </Svg>
);

export const IconChevronLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.5 5.5 16 12l-6.5 6.5" />
  </Svg>
);
