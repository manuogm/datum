/**
 * Preferred fits.
 *
 * ISO 286-1:2010 recommends choosing fits from a small set of preferred
 * tolerance classes, either hole-basis (hole H, shaft varies) or shaft-basis
 * (shaft h, hole varies). The list below is the widely used set of preferred
 * fits derived from ISO 286 (ISO 1829 preferred classes; the same ten pairs
 * are given in ANSI B4.2). Each shaft-basis fit gives practically the same
 * clearance or interference as its hole-basis partner.
 *
 * The descriptions are general guidance only; the fit type actually obtained
 * depends on the size (e.g. H7/p6 is a transition fit up to 3 mm) and is
 * always computed by analyseFit.
 */
export type FitBasis = 'hole-basis' | 'shaft-basis'

export interface PreferredFit {
  readonly designation: string
  readonly basis: FitBasis
  /** Short name of the kind of fit. */
  readonly name: string
  /** Typical use, in plain English. */
  readonly use: string
}

interface PreferredFitPair {
  readonly holeBasis: string
  readonly shaftBasis: string
  readonly name: string
  readonly use: string
}

/** Each row: hole-basis fit, its shaft-basis equivalent, and what it is used for. */
const PREFERRED_FIT_PAIRS: readonly PreferredFitPair[] = [
  { holeBasis: 'H11/c11', shaftBasis: 'C11/h11', name: 'Loose running',
    use: 'Wide commercial tolerances or allowances on external members; parts that must assemble easily even when dirty or hot.' },
  { holeBasis: 'H9/d9', shaftBasis: 'D9/h9', name: 'Free running',
    use: 'Not for accuracy: large temperature variations, high running speeds or heavy journal pressures.' },
  { holeBasis: 'H8/f7', shaftBasis: 'F8/h7', name: 'Close running',
    use: 'Running on accurate machines and accurate location at moderate speeds and journal pressures.' },
  { holeBasis: 'H7/g6', shaftBasis: 'G7/h6', name: 'Sliding',
    use: 'Not intended to run freely, but to move and turn freely and locate accurately (e.g. spigots, sliding gears).' },
  { holeBasis: 'H7/h6', shaftBasis: 'H7/h6', name: 'Locational clearance',
    use: 'Snug fit for locating stationary parts that can still be freely assembled and disassembled.' },
  { holeBasis: 'H7/k6', shaftBasis: 'K7/h6', name: 'Locational transition',
    use: 'Accurate location, a compromise between clearance and interference (e.g. hubs, couplings with keys).' },
  { holeBasis: 'H7/n6', shaftBasis: 'N7/h6', name: 'Locational transition (tighter)',
    use: 'More accurate location where greater interference is permissible.' },
  { holeBasis: 'H7/p6', shaftBasis: 'P7/h6', name: 'Locational interference',
    use: 'Rigid, accurate location without special bore pressure; parts can be dismantled with a press.' },
  { holeBasis: 'H7/s6', shaftBasis: 'S7/h6', name: 'Medium drive',
    use: 'Ordinary steel parts or shrink fits on light sections; the tightest fit usable with cast iron.' },
  { holeBasis: 'H7/u6', shaftBasis: 'U7/h6', name: 'Force',
    use: 'Parts that can be highly stressed, or shrink fits where the heavy pressing forces are impractical.' },
]

/** All preferred fits, hole-basis first, then shaft-basis (H7/h6 appears once, as hole-basis). */
export const PREFERRED_FITS: readonly PreferredFit[] = [
  ...PREFERRED_FIT_PAIRS.map(({ holeBasis, name, use }) => ({ designation: holeBasis, basis: 'hole-basis' as const, name, use })),
  ...PREFERRED_FIT_PAIRS
    .filter(({ holeBasis, shaftBasis }) => holeBasis !== shaftBasis)
    .map(({ shaftBasis, name, use }) => ({ designation: shaftBasis, basis: 'shaft-basis' as const, name, use })),
]
