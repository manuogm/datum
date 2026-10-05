// Shared colour vocabularies for kit components. Each name maps to a theme
// token, so callers never pass raw colours.
import type { MaterialFamily } from '../../core/materials'

/** Semantic tones for status badges, icons and bars. */
export type Tone = 'ok' | 'warn' | 'bad' | 'hole' | 'accent' | 'neutral'

/** Any colour a marker or swatch can take; material families use --cat-*. */
export type MarkerColor = Tone | 'text' | 'muted' | 'faint' | `cat-${MaterialFamily}`

const MARKER_TOKENS: Record<Tone | 'text' | 'muted' | 'faint', string> = {
  ok: '--ok',
  warn: '--warn',
  bad: '--bad',
  hole: '--hole',
  accent: '--accent',
  neutral: '--text-muted',
  text: '--text',
  muted: '--text-muted',
  faint: '--text-faint',
}

/** CSS colour value (a token reference) for a marker colour. */
export function markerColor(color: MarkerColor): string {
  const token = color.startsWith('cat-') ? `--${color}` : MARKER_TOKENS[color as keyof typeof MARKER_TOKENS]
  return `var(${token})`
}
