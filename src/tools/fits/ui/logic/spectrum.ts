// Geometry of the calculator's "Fit spectrum" strip: one horizontal clearance
// axis (interference left of zero, clearance right) with the fit's band at
// each temperature and the required window. Values come in display units;
// positions are percentages of the strip width.
import { niceAxis, scaleLinear } from './scale'
import type { BandKind } from './serviceClearance'

const MAX_TICKS = 7

export interface SpectrumBandInput {
  readonly kind: BandKind
  readonly min: number
  readonly max: number
}

export interface Span {
  readonly left: number
  readonly width: number
}

export interface SpectrumLayout {
  readonly ticks: readonly { readonly value: number; readonly percent: number }[]
  readonly zeroPercent: number
  readonly window: Span
  /** Coldest first, one row each. */
  readonly bars: readonly (Span & { readonly kind: BandKind })[]
}

export function spectrumLayout(bands: readonly SpectrumBandInput[], window: { min: number; max: number }): SpectrumLayout {
  const axis = niceAxis([0, window.min, window.max, ...bands.flatMap((band) => [band.min, band.max])], MAX_TICKS)
  const percent = scaleLinear(axis, 0, 100)
  const span = (min: number, max: number): Span => ({ left: percent(min), width: percent(max) - percent(min) })
  return {
    ticks: axis.ticks.map((value) => ({ value, percent: percent(value) })),
    zeroPercent: percent(0),
    window: span(window.min, window.max),
    bars: bands.map((band) => ({ kind: band.kind, ...span(band.min, band.max) })),
  }
}
