// Line icons used across Datum. Each icon draws with currentColor so it takes
// the colour of the surrounding text.
import type { ReactElement } from 'react'

export type IconName =
  | 'chevron-down'
  | 'chevron-right'
  | 'search'
  | 'save'
  | 'download'
  | 'close'
  | 'arrow-right'
  | 'plus'
  | 'more'
  | 'folder'
  | 'tool-fit'
  | 'tool-bolt'
  | 'tool-lam'
  | 'tool-mat'
  | 'tool-stack'
  | 'link'
  | 'open'
  | 'gdt-flatness'
  | 'gdt-straightness'
  | 'gdt-parallelism'
  | 'gdt-perpendicularity'
  | 'gdt-angularity'
  | 'gdt-position'
  | 'gdt-coaxiality'
  | 'gdt-symmetry'
  | 'gdt-profile-surface'
  | 'gdt-profile-line'
  | 'gdt-circular-runout'
  | 'gdt-total-runout'
  | 'datum-shift'

interface IconProps {
  name: IconName
  /** Rendered size in px; defaults to the icon's drawn size. */
  size?: number
  className?: string
}

const ICONS: Record<IconName, { box: number; body: ReactElement }> = {
  'chevron-down': { box: 10, body: <polyline points="2,3.5 5,6.5 8,3.5" strokeWidth="1.4" /> },
  'chevron-right': { box: 10, body: <polyline points="3.5,2 6.5,5 3.5,8" strokeWidth="1.4" /> },
  search: {
    box: 13,
    body: (
      <g strokeWidth="1.4">
        <circle cx="5.5" cy="5.5" r="4.25" />
        <line x1="8.7" y1="8.7" x2="12" y2="12" />
      </g>
    ),
  },
  save: { box: 12, body: <path d="M2 1.5h6.5L10.5 3.5V10.5H2Z M4 1.5v3h4v-3" strokeWidth="1.3" /> },
  download: { box: 12, body: <path d="M6 1v7M3 5l3 3 3-3M1.5 11h9" strokeWidth="1.6" /> },
  close: { box: 12, body: <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" strokeWidth="1.4" /> },
  'arrow-right': { box: 12, body: <path d="M1.5 6h8.5M6.5 2.5L10 6l-3.5 3.5" strokeWidth="1.4" /> },
  plus: { box: 12, body: <path d="M6 1.5v9M1.5 6h9" strokeWidth="1.5" /> },
  // Three dots of a row menu, drawn as zero-length round-capped strokes.
  more: { box: 14, body: <path d="M3 7h0M7 7h0M11 7h0" strokeWidth="2.2" strokeLinecap="round" /> },
  folder: { box: 20, body: <path d="M2 4.5h6l2 2.5h8v9.5H2Z" strokeWidth="1.8" strokeLinejoin="round" /> },
  // Tool glyphs (drawn on a 20px grid, shown at 12–14px in tabs and folder lists).
  'tool-fit': {
    box: 20,
    body: (
      <g strokeWidth="2">
        <circle cx="10" cy="10" r="8" />
        <circle cx="10" cy="10" r="4" />
      </g>
    ),
  },
  'tool-bolt': { box: 20, body: <polygon points="10,2 17,6 17,14 10,18 3,14 3,6" strokeWidth="2" /> },
  'tool-lam': { box: 20, body: <path d="M6 4h12l-4 5H2Z M6 12h12l-4 5H2Z" strokeWidth="2" /> },
  'tool-mat': { box: 20, body: <path d="M4 3h12v14H4Z M7 7.5h6M7 11h6M7 14.5h3" strokeWidth="2" /> },
  // A datum line with one arrow going right and one coming back: a loop of a tolerance stack.
  'tool-stack': { box: 20, body: <path d="M3 3V17M3 7H15M12 4.5L15 7L12 9.5M15 13H7M10 10.5L7 13L10 15.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /> },
  link: {
    box: 16,
    body: <path d="M6.5 9.5L9.5 6.5M7.5 4.5L9 3A2.5 2.5 0 0 1 13 7L11.5 8.5M8.5 11.5L7 13A2.5 2.5 0 0 1 3 9L4.5 7.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
  },
  open: { box: 16, body: <path d="M6 3H3V13H13V10M9 3H13V7M13 3L7.5 8.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> },
  // GD&T characteristics (ISO 1101 / ASME Y14.5), drawn on a 16px grid: the
  // symbols are not in the app's fonts, and fallback fonts draw them unevenly.
  'gdt-flatness': gdt('M5 5H14.5L11 11H1.5Z'),
  'gdt-straightness': gdt('M1.5 8H14.5'),
  'gdt-parallelism': gdt('M6.5 2.5L3.5 13.5M12.5 2.5L9.5 13.5'),
  'gdt-perpendicularity': gdt('M8 2.5V13.5M2 13.5H14'),
  'gdt-angularity': gdt('M2 13.5H14M2 13.5L12.5 3.5'),
  'gdt-position': gdt('M8 1.5V14.5M1.5 8H14.5M12 8A4 4 0 1 1 4 8A4 4 0 1 1 12 8'),
  'gdt-coaxiality': gdt('M14 8A6 6 0 1 1 2 8A6 6 0 1 1 14 8M10.5 8A2.5 2.5 0 1 1 5.5 8A2.5 2.5 0 1 1 10.5 8'),
  'gdt-symmetry': gdt('M4.5 4.5H11.5M1.5 8H14.5M4.5 11.5H11.5'),
  'gdt-profile-surface': gdt('M2 11.5A6 6 0 0 1 14 11.5Z'),
  'gdt-profile-line': gdt('M2 11.5A6 6 0 0 1 14 11.5'),
  'gdt-circular-runout': gdt('M3 13L12.5 3.5M7.5 3.5H12.5V8.5'),
  'gdt-total-runout': gdt('M2 14H7M2 14L9 7M7 14L14 7M6 7H9V10M11 7H14V10'),
  // A datum feature triangle on its surface, with the shift as a double arrow above it.
  'datum-shift': gdt('M2 14H14M5 14L8 10L11 14M2.5 5H13.5M4.5 3L2.5 5L4.5 7M11.5 3L13.5 5L11.5 7'),
}

/** A GD&T characteristic symbol: 16px box, 1.5px stroke, round ends. */
function gdt(d: string): { box: number; body: ReactElement } {
  return { box: 16, body: <path d={d} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /> }
}

export function Icon({ name, size, className }: IconProps) {
  const { box, body } = ICONS[name]
  return (
    <svg
      className={className}
      width={size ?? box}
      height={size ?? box}
      viewBox={`0 0 ${box} ${box}`}
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {body}
    </svg>
  )
}
