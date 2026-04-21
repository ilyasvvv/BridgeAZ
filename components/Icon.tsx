import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 16, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

export const Icon = {
  Search: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  ),
  Bell: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M6 8a6 6 0 0 1 12 0c0 5 2 7 2 7H4s2-2 2-7" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  ),
  User: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  ),
  SignOut: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M15 3h5a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-5" />
      <path d="M10 17l-5-5 5-5" />
      <path d="M5 12h11" />
    </svg>
  ),
  Image: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m4 18 5-5 4 4 3-3 4 4" />
    </svg>
  ),
  Calendar: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  Briefcase: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </svg>
  ),
  Note: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M6 3h9l5 5v13H6z" />
      <path d="M14 3v6h6" />
      <path d="M9 14h7M9 17h5" />
    </svg>
  ),
  Heart: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 20s-7-4.5-9-9A5 5 0 0 1 12 6a5 5 0 0 1 9 5c-2 4.5-9 9-9 9z" />
    </svg>
  ),
  Chat: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M21 12a8 8 0 0 1-11.8 7L3 20l1-6A8 8 0 1 1 21 12z" />
    </svg>
  ),
  Share: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
      <path d="M12 3v13M7 8l5-5 5 5" />
    </svg>
  ),
  More: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="5" cy="12" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="19" cy="12" r="1.4" />
    </svg>
  ),
  Plus: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Close: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  Globe: (p: IconProps) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  ),
  Pin: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M12 22s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
  Trend: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  ),
  Send: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="m4 12 17-9-6 18-3-7-8-2z" />
    </svg>
  ),
  Link: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </svg>
  ),
  Filter: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M4 5h16M7 12h10M10 19h4" />
    </svg>
  ),
  Check: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="m5 13 4 4L19 7" />
    </svg>
  ),
  Mic: (p: IconProps) => (
    <svg {...base(p)}>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  ),
  Poll: (p: IconProps) => (
    <svg {...base(p)}>
      <path d="M5 20V10M12 20V4M19 20v-7" />
    </svg>
  ),
};
