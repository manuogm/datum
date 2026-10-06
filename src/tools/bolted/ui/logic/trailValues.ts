// The numbers of the calculation trail in the viewer's unit system. The
// engine reports each value with its SI unit; this maps that unit to a
// display quantity of core/units. Each step also has a headline: the
// number its row shows before it is opened.
import { formatDecimal, formatQuantity, unitOf, type Quantity, type UnitSystem } from '../../../../core/units'
import type { CalculationStep, StepCheck, TrailUnit, TrailValue } from '../../calc'

const QUANTITY_OF_UNIT: Record<Exclude<TrailUnit, '' | '°'>, Quantity> = {
  N: 'force',
  mm: 'length',
  'mm²': 'area',
  MPa: 'strength',
  'mm/N': 'resilience',
  'N/mm': 'stiffness',
  'N·m': 'torque',
  'µm': 'deviation',
}

export interface ShownValue {
  readonly value: string
  readonly unit: string
}

/** A trail value as shown: '43.48' 'kN', '1.45' '' (ratios), '33.0' '°'. */
export function shownValue({ value, unit }: Pick<TrailValue, 'value' | 'unit'>, system: UnitSystem): ShownValue {
  if (unit === '') return { value: formatDecimal(value, 2, true), unit: '' }
  if (unit === '°') return { value: formatDecimal(value, 1, true), unit: '°' }
  const quantity = QUANTITY_OF_UNIT[unit]
  return { value: formatQuantity(quantity, system, value), unit: unitOf(quantity, system) }
}

/** '43.48 kN', or '1.45' for a ratio. */
export function shownText(value: Pick<TrailValue, 'value' | 'unit'>, system: UnitSystem): string {
  const shown = shownValue(value, system)
  return shown.unit === '' ? shown.value : `${shown.value} ${shown.unit}`
}

export interface StepHeadline extends ShownValue {
  readonly symbol: string
}

/**
 * What a step's row shows: a check its safety factor; R6 the preload range
 * FMmin – FMmax; another step that only calculates its result, the last
 * trail value; a step without values a dash.
 */
export function stepHeadline(step: CalculationStep, system: UnitSystem): StepHeadline {
  if (step.check) return { symbol: 'SF', value: formatDecimal(step.check.safetyFactor, 2, true), unit: '' }
  if (step.id === 'preload-range' && step.values.length === 2) {
    const [min, max] = step.values.map((v) => shownValue(v, system))
    return { symbol: 'FM', value: `${min.value} – ${max.value}`, unit: max.unit }
  }
  const last = step.values.at(-1)
  return last ? { symbol: last.symbol, ...shownValue(last, system) } : { symbol: '', value: '—', unit: '' }
}

/**
 * A check's safety factor beside its requirement, 'SF 0.89 / ≥ 1.80', since
 * the requirements differ (1.0 for R8, 1.2 for R9, 1.8 for R12 under
 * alternating load).
 */
export function safetyFactorText({ safetyFactor, requiredSafetyFactor }: Pick<StepCheck, 'safetyFactor' | 'requiredSafetyFactor'>): string {
  return `SF ${formatDecimal(safetyFactor, 2, true)} / ≥ ${formatDecimal(requiredSafetyFactor, 2, true)}`
}
