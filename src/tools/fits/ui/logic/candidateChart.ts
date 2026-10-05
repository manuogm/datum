// Geometry of the advisor's "Fit candidates" chart: one column per candidate
// fit, with a vertical bar for its clearance band at each temperature (cold,
// 20 °C, hot), drawn against the required window and the assembly
// interference limit. Values come in display units (µm or thou); positions
// are in the SVG's own coordinates.
import type { BandKind } from './serviceClearance'
import { niceAxis, scaleLinear, type Rect, type Segment } from '../../../../app/charts'

export const CANDIDATE_CHART_FRAME = {
  width: 720,
  height: 470,
  left: 70,
  right: 710,
  /** Column highlight from top to bottom; values use a slightly smaller span. */
  top: 22,
  bottom: 430,
  valueTop: 40,
  valueBottom: 416,
  nameY: 448,
  taglineY: 465,
} as const

const MAX_TICKS = 8
const SLOT_WIDTH = 76
const MIN_BAR_HEIGHT = 2

export interface ChartBandInput {
  readonly kind: BandKind
  readonly min: number
  readonly max: number
}

export interface ChartCandidateInput {
  readonly designation: string
  /** Coldest first. */
  readonly bands: readonly ChartBandInput[]
}

export interface CandidateChartInput {
  /** In display order, left to right. */
  readonly candidates: readonly ChartCandidateInput[]
  readonly window: { readonly min: number; readonly max: number }
  /** Largest assembly interference, as a positive number. */
  readonly interferenceLimit: number
}

export interface ChartColumn {
  readonly designation: string
  /** Centre of the column. */
  readonly x: number
  /** Area behind the column, used to highlight the best match. */
  readonly slot: Rect
  readonly bars: readonly (Rect & { readonly kind: BandKind })[]
  /** Thin lines joining the middles of neighbouring bars: how the fit moves with temperature. */
  readonly links: readonly Segment[]
}

export interface CandidateChartLayout {
  readonly ticks: readonly { readonly value: number; readonly y: number }[]
  readonly zeroY: number
  readonly windowTop: number
  readonly windowBottom: number
  readonly interferenceY: number
  readonly columns: readonly ChartColumn[]
}

export function candidateChartLayout({ candidates, window, interferenceLimit }: CandidateChartInput): CandidateChartLayout {
  const f = CANDIDATE_CHART_FRAME
  const values = [0, window.min, window.max, -interferenceLimit, ...candidates.flatMap((c) => c.bands.flatMap((b) => [b.min, b.max]))]
  const axis = niceAxis(values, MAX_TICKS)
  const y = scaleLinear(axis, f.valueBottom, f.valueTop)
  const slotSpacing = (f.right - f.left) / Math.max(candidates.length, 1)
  const slotWidth = Math.min(SLOT_WIDTH, slotSpacing - 4)

  const columns = candidates.map((candidate, index) => {
    const x = f.left + slotSpacing * (index + 0.5)
    const bars = barsFor(candidate.bands, x, y)
    const links = bars.slice(1).map((bar, i) => {
      const previous = bars[i]
      return { x1: previous.x + previous.width, y1: middle(previous), x2: bar.x, y2: middle(bar) }
    })
    return {
      designation: candidate.designation,
      x,
      slot: { x: x - slotWidth / 2, y: f.top, width: slotWidth, height: f.bottom - f.top },
      bars,
      links,
    }
  })

  return {
    ticks: axis.ticks.map((value) => ({ value, y: y(value) })),
    zeroY: y(0),
    windowTop: y(window.max),
    windowBottom: y(window.min),
    interferenceY: y(-interferenceLimit),
    columns,
  }
}

/** Bars side by side, centred on x: wider when there are fewer of them. */
function barsFor(bands: readonly ChartBandInput[], x: number, y: (value: number) => number) {
  const width = bands.length > 2 ? 16 : 20
  const gap = bands.length > 2 ? 6 : 8
  const groupWidth = bands.length * width + (bands.length - 1) * gap
  return bands.map((band, i) => {
    const top = y(band.max)
    const height = Math.max(y(band.min) - top, MIN_BAR_HEIGHT)
    return { kind: band.kind, x: x - groupWidth / 2 + i * (width + gap), y: top, width, height }
  })
}

function middle(rect: Rect): number {
  return rect.y + rect.height / 2
}
