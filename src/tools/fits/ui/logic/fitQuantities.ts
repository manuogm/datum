// Every result of a fit as a labelled quantity with its formula, the formula
// with the numbers filled in, and the standard it comes from. The results
// column and the PDF report both list these, so they always agree.
// Formulas mark subscripts with an underscore: 'D_max' reads Dₘₐₓ.
import { formatQuantity, formatQuantityRange, unitOf, type Quantity, type UnitSystem } from '../../../../core/units'
import { REFERENCE_TEMP_C } from '../../advisor'
import type { FitAnalysis, ToleranceZone } from '../../calc'
import type { ServiceClearance } from './serviceClearance'

export type FitQuantityKey =
  | 'holeMax' | 'holeMin' | 'holeTolerance' | 'shaftMax' | 'shaftMin' | 'shaftTolerance'
  | 'maxClearance' | 'minClearance' | 'meanClearance' | 'fitTolerance'

export interface FitQuantity<Key extends string = FitQuantityKey> {
  readonly key: Key
  readonly label: string
  readonly symbol: string
  /** Formatted in the viewer's unit system. */
  readonly value: string
  readonly unit: string
  readonly formula: string
  readonly substitution: string
  readonly source: string
  /** The headline results (max and min clearance). */
  readonly emphasis: boolean
}

const SOURCES = {
  tolerance: 'ISO 286-1 Table 1',
  holes: 'ISO 286-2, holes',
  shafts: 'ISO 286-2, shafts',
  fits: 'ISO 286-1, fits',
  thermal: 'ISO 1, 20 °C reference',
} as const

/** Limits, tolerances and clearances of a fit at 20 °C. */
export function fitQuantities(fit: FitAnalysis, system: UnitSystem): readonly FitQuantity[] {
  const length = (mm: number) => formatQuantity('length', system, mm)
  const deviation = (um: number) => formatQuantity('deviation', system, um)
  const make = (
    key: FitQuantityKey, label: string, symbol: string, quantity: Quantity, valueSi: number,
    formula: string, substitution: string, source: string, emphasis = false,
  ): FitQuantity => ({
    key, label, symbol, value: formatQuantity(quantity, system, valueSi), unit: unitOf(quantity, system),
    formula, substitution, source, emphasis,
  })
  const { hole, shaft } = fit
  const D = length(fit.nominalMm)
  // A deviation written as a length, so it can be added to the nominal size.
  const asLength = (um: number) => length(um / 1000)
  return [
    make('holeMax', 'Hole upper limit', 'D_max', 'length', hole.maxSizeMm, 'D + ES',
      plus(D, asLength(hole.upperDeviationUm)), SOURCES.holes),
    make('holeMin', 'Hole lower limit', 'D_min', 'length', hole.minSizeMm, 'D + EI',
      plus(D, asLength(hole.lowerDeviationUm)), SOURCES.holes),
    make('holeTolerance', `Hole tolerance IT${hole.grade}`, 'T_H', 'deviation', hole.itUm, 'ES − EI',
      minus(deviation(hole.upperDeviationUm), deviation(hole.lowerDeviationUm)), SOURCES.tolerance),
    make('shaftMax', 'Shaft upper limit', 'd_max', 'length', shaft.maxSizeMm, 'd + es',
      plus(D, asLength(shaft.upperDeviationUm)), SOURCES.shafts),
    make('shaftMin', 'Shaft lower limit', 'd_min', 'length', shaft.minSizeMm, 'd + ei',
      plus(D, asLength(shaft.lowerDeviationUm)), SOURCES.shafts),
    make('shaftTolerance', `Shaft tolerance IT${shaft.grade}`, 'T_S', 'deviation', shaft.itUm, 'es − ei',
      minus(deviation(shaft.upperDeviationUm), deviation(shaft.lowerDeviationUm)), SOURCES.tolerance),
    make('maxClearance', 'Max clearance', 'C_max', 'deviation', fit.maxClearanceUm, 'D_max − d_min',
      minus(length(hole.maxSizeMm), length(shaft.minSizeMm)), SOURCES.fits, true),
    make('minClearance', 'Min clearance', 'C_min', 'deviation', fit.minClearanceUm, 'D_min − d_max',
      minus(length(hole.minSizeMm), length(shaft.maxSizeMm)), SOURCES.fits, true),
    make('meanClearance', 'Mean clearance', 'C_mean', 'deviation', fit.meanClearanceUm, '(C_max + C_min) / 2',
      `(${plus(deviation(fit.maxClearanceUm), deviation(fit.minClearanceUm))}) / 2`, SOURCES.fits),
    make('fitTolerance', 'Fit tolerance', 'T_f', 'deviation', fit.fitToleranceUm, 'T_H + T_S',
      plus(deviation(hole.itUm), deviation(shaft.itUm)), SOURCES.fits),
  ]
}

/**
 * Clearance at each service temperature other than 20 °C:
 * C(T) = C(20 °C) + D·(α_H − α_S)·(T − 20 °C).
 */
export function thermalQuantities(service: ServiceClearance, system: UnitSystem): readonly FitQuantity<string>[] {
  const reference = service.bands.find((band) => band.kind === 'reference')
  return service.bands
    .filter((band) => band.kind !== 'reference')
    .map((band) => {
      const temperature = formatQuantity('temperature', system, band.tempC, { withUnit: true })
      // The same shift applies to both limits.
      const shiftUm = reference ? band.minUm - reference.minUm : 0
      return {
        key: `clearanceAt${band.tempC}`,
        label: `Clearance at ${temperature}`,
        symbol: 'C_T',
        value: formatQuantityRange('deviation', system, band.minUm, band.maxUm, false),
        unit: unitOf('deviation', system),
        formula: `C + D·(α_H − α_S)·(T − ${REFERENCE_TEMP_C} °C)`,
        substitution: plus('C', formatQuantity('deviation', system, shiftUm)),
        source: SOURCES.thermal,
        emphasis: false,
      }
    })
}

/** 'a + b', written 'a − |b|' when b is negative. */
function plus(a: string, b: string): string {
  return b.startsWith('−') ? `${a} − ${b.slice(1)}` : `${a} + ${b}`
}

/** 'a − b', with a negative b in brackets. */
function minus(a: string, b: string): string {
  return b.startsWith('−') ? `${a} − (${b})` : `${a} − ${b}`
}

/** The tolerance zone's limits as 'lower → upper' in the display unit. */
export function limitsText(zone: ToleranceZone, system: UnitSystem): string {
  return `${formatQuantity('length', system, zone.minSizeMm)} → ${formatQuantity('length', system, zone.maxSizeMm)}`
}
