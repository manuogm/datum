import { formatDecimal, formatQuantity, formatQuantityRange, type UnitSystem } from '../../../core/units'

/**
 * Number formatting for the bolted-joint messages in the viewer's unit
 * system (src/core/units): SI shows kN, N·m, MPa and mm; imperial shows lbf,
 * lbf·ft, ksi and in.
 */
export interface BoltedFormat {
  /** '43.48 kN' */
  readonly force: (n: number) => string
  /** '71.2 N·m' */
  readonly torque: (nm: number) => string
  /** '846 MPa' */
  readonly stress: (mpa: number) => string
  /** '20.000 mm' */
  readonly length: (mm: number) => string
  /** '11 µm': plastic embedding. */
  readonly embedding: (um: number) => string
  /** '−40 … 120 °C' */
  readonly temperatureRange: (minC: number, maxC: number) => string
  /** '1.45': safety factors, load factors, ratios. */
  readonly ratio: (value: number) => string
}

export function boltedFormat(system: UnitSystem): BoltedFormat {
  return {
    force: (n) => formatQuantity('force', system, n, { withUnit: true }),
    torque: (nm) => formatQuantity('torque', system, nm, { withUnit: true }),
    stress: (mpa) => formatQuantity('strength', system, mpa, { withUnit: true }),
    length: (mm) => formatQuantity('length', system, mm, { withUnit: true }),
    embedding: (um) => formatQuantity('deviation', system, um, { withUnit: true }),
    temperatureRange: (minC, maxC) => formatQuantityRange('temperature', system, minC, maxC),
    ratio: (value) => formatDecimal(value, 2, true),
  }
}
