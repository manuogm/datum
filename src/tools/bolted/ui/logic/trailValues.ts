// The numbers of the calculation trail in the viewer's unit system. The
// engine reports each value with its SI unit; this maps that unit to a
// display quantity of core/units.
import { formatDecimal, formatQuantity, unitOf, type Quantity, type UnitSystem } from '../../../../core/units'
import type { TrailUnit, TrailValue } from '../../calc'

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
