// Chart axes: round tick values ("nice" steps of 1, 2, 2.5 or 5 × 10ⁿ) that
// cover the data, and the straight-line mapping from a value to a position.

export interface Axis {
  readonly min: number
  readonly max: number
  readonly step: number
  /** min, min + step, … max */
  readonly ticks: readonly number[]
}

const NICE_FACTORS = [1, 2, 2.5, 5, 10]

/** The smallest nice step that shows `span` in at most `maxTicks` intervals. */
export function niceStep(span: number, maxTicks: number): number {
  const rough = span / maxTicks
  const power = 10 ** Math.floor(Math.log10(rough))
  const factor = NICE_FACTORS.find((f) => f * power >= rough) ?? 10
  return factor * power
}

/** An axis whose nice ticks enclose every value. An all-equal set gets ±1 around it. */
export function niceAxis(values: readonly number[], maxTicks: number): Axis {
  let low = Math.min(...values)
  let high = Math.max(...values)
  if (low === high) {
    low -= 1
    high += 1
  }
  const step = niceStep(high - low, maxTicks)
  const min = Math.floor(low / step) * step
  const max = Math.ceil(high / step) * step
  const count = Math.round((max - min) / step)
  // toPrecision trims floating-point noise such as 0.30000000000000004.
  const ticks = Array.from({ length: count + 1 }, (_, i) => Number((min + i * step).toPrecision(12)) || 0)
  return { min: ticks[0], max: ticks[count], step, ticks }
}

/** Maps the axis range [min, max] onto positions [from, to] (to may be smaller, as for an SVG y axis). */
export function scaleLinear(axis: Pick<Axis, 'min' | 'max'>, from: number, to: number): (value: number) => number {
  return (value) => from + ((value - axis.min) / (axis.max - axis.min)) * (to - from)
}
