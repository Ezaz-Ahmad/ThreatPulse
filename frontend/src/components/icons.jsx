const common = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function NewsIcon() {
  return (
    <svg {...common} aria-hidden="true">
      <rect x="3" y="5" width="14" height="14" rx="1.5" />
      <path d="M7 9h6M7 12.5h6M7 16h3" />
      <path d="M17 8h2.5A1.5 1.5 0 0 1 21 9.5V17a2 2 0 0 1-2 2H7" />
    </svg>
  );
}

export function ShieldIcon() {
  return (
    <svg {...common} aria-hidden="true">
      <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function BugIcon() {
  return (
    <svg {...common} aria-hidden="true">
      <rect x="8" y="8" width="8" height="10" rx="4" />
      <path d="M12 8V5M9 6 7.5 4.5M15 6l1.5-1.5M4 12h4M16 12h4M5.5 18 8 16M18.5 18 16 16" />
    </svg>
  );
}

export function AlertTriangleIcon() {
  return (
    <svg {...common} aria-hidden="true">
      <path d="M12 3.5 21 19H3L12 3.5z" />
      <path d="M12 9.5v4.5M12 17h.01" />
    </svg>
  );
}

export function ZapIcon() {
  return (
    <svg {...common} aria-hidden="true">
      <path d="M12.5 3 5 13.5h5.5L11 21l7.5-10.5H13L12.5 3z" />
    </svg>
  );
}

export function TargetIcon() {
  return (
    <svg {...common} aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}
