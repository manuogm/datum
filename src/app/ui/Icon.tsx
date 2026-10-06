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
