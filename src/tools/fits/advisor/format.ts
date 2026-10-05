import { formatQuantity, formatQuantityRange, unitOf, type UnitSystem } from '../../../core/units'

/**
 * Number formatting for the advisor's text (check messages, why text, notes)
 * in the viewer's unit system, using the app's display units (src/core/units):
 * SI shows µm and °C ("−35 … −1 µm"), imperial shows thou and °F.
 */
export interface AdvisorFormat {
  /** '35.9 µm' */
  readonly clearance: (um: number) => string
  /** '+36.9 µm': a change of clearance. */
  readonly clearanceChange: (um: number) => string
  /** '−47.3 … 35.9 µm' */
  readonly clearanceRange: (minUm: number, maxUm: number) => string
  /** '140 °C' */
  readonly temperature: (c: number) => string
  /** '−20 … 140 °C' */
  readonly temperatureRange: (minC: number, maxC: number) => string
  /** '23.4 vs 11.1 µm/(m·K)' */
  readonly expansionPair: (housing: number, shaft: number) => string
  /** '25.000 mm' */
  readonly length: (mm: number) => string
}

export function advisorFormat(system: UnitSystem): AdvisorFormat {
  return {
    clearance: (um) => formatQuantity('deviation', system, um, { withUnit: true }),
    clearanceChange: (um) => formatQuantity('deviation', system, um, { withUnit: true, signed: true }),
    clearanceRange: (minUm, maxUm) => formatQuantityRange('deviation', system, minUm, maxUm),
    temperature: (c) => formatQuantity('temperature', system, c, { withUnit: true }),
    temperatureRange: (minC, maxC) => formatQuantityRange('temperature', system, minC, maxC),
    expansionPair: (housing, shaft) =>
      `${formatQuantity('expansion', system, housing)} vs ${formatQuantity('expansion', system, shaft)} ${unitOf('expansion', system)}`,
    length: (mm) => formatQuantity('length', system, mm, { withUnit: true }),
  }
}
