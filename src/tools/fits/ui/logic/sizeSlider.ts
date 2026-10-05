// The nominal-size slider under the Ø field: logarithmic from 1 to 500 mm, so
// small and large diameters get the same room. Sizes picked with the slider
// are rounded to two significant figures in the viewer's unit; exact sizes
// are typed in the field.
import { fromDisplay, toDisplay, type UnitSystem } from '../../../../core/units'

const MIN_MM = 1
const MAX_MM = 500
/** Positions run from 0 to SLIDER_STEPS. */
export const SLIDER_STEPS = 1000

/** Tick labels under the slider, in display units. */
export const SLIDER_TICKS: Record<UnitSystem, readonly number[]> = {
  si: [1, 10, 100, 500],
  imperial: [0.05, 0.5, 5, 19],
}

const LOG_MIN = Math.log10(MIN_MM)
const LOG_SPAN = Math.log10(MAX_MM) - LOG_MIN

/** Slider position of a size in mm, held at the ends for sizes outside 1 … 500 mm. */
export function sliderPosition(nominalMm: number): number {
  const fraction = (Math.log10(nominalMm) - LOG_MIN) / LOG_SPAN
  return Math.round(Math.min(1, Math.max(0, fraction)) * SLIDER_STEPS)
}

/** Size in mm at a slider position, rounded to two significant figures in the display unit. */
export function sliderSizeMm(position: number, system: UnitSystem): number {
  const mm = 10 ** (LOG_MIN + (position / SLIDER_STEPS) * LOG_SPAN)
  const shown = toDisplay('length', system, mm)
  const power = 10 ** (Math.floor(Math.log10(shown)) - 1)
  return fromDisplay('length', system, Number((Math.round(shown / power) * power).toPrecision(12)))
}

/** Where a tick (in display units) sits along the slider, 0 … 100 %. */
export function tickPercent(displayValue: number, system: UnitSystem): number {
  return (sliderPosition(fromDisplay('length', system, displayValue)) / SLIDER_STEPS) * 100
}
