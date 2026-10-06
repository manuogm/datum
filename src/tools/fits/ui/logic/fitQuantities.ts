// Every result of a fit as a labelled quantity with its formula, the formula
// with the numbers filled in, and the standard it comes from. The results
// column and the PDF report both list these, so they always agree.
// Formulas mark subscripts with an underscore: 'D_max' reads Dₘₐₓ.
import { formatDecimal, formatQuantity, formatQuantityRange, toDisplay, unitOf, type Quantity, type UnitSystem } from '../../../../core/units'
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

/** Decimals of an inch for a limit of size: 0.00001 in, a quarter of a µm. */
const INCH_LIMIT_DECIMALS = 5

/**
 * A limit of size in the display unit. In millimetres it keeps the usual 3
 * decimals (to the µm). In inches it is rounded inward to 5 decimals: an upper limit down and a
 * lower limit up, so the inch value never admits a part the millimetre limit
 * rejects (24.993 mm = 0.983976 in is shown 0.98397, not 0.9840).
 */
export function limitOfSize(mm: number, system: UnitSystem, side: 'upper' | 'lower'): string {
  if (system === 'si') return formatQuantity('length', system, mm)
  const factor = 10 ** INCH_LIMIT_DECIMALS
  // The small allowance keeps an exact value (e.g. 1 in) from rounding a step inward on floating-point noise.
  const scaled = toDisplay('length', system, mm) * factor
  const inward = side === 'upper' ? Math.floor(scaled + 1e-6) : Math.ceil(scaled - 1e-6)
  return formatDecimal(inward / factor, INCH_LIMIT_DECIMALS, true)
}

/** Limits, tolerances and clearances of a fit at 20 °C. */
export function fitQuantities(fit: FitAnalysis, system: UnitSystem): readonly FitQuantity[] {
  const deviation = (um: number) => formatQuantity('deviation', system, um)
  const make = (
    key: FitQuantityKey, label: string, symbol: string, quantity: Quantity, valueSi: number,
    formula: string, substitution: string, source: string, emphasis = false,
  ): FitQuantity => ({
    key, label, symbol, value: formatQuantity(quantity, system, valueSi), unit: unitOf(quantity, system),
    formula, substitution, source, emphasis,
  })
  // A limit of size, its value written as limitOfSize gives it.
  const makeLimit = (
    key: FitQuantityKey, label: string, symbol: string, side: 'upper' | 'lower', valueMm: number,
    formula: string, substitution: string, source: string,
  ): FitQuantity => ({ ...make(key, label, symbol, 'length', valueMm, formula, substitution, source), value: limitOfSize(valueMm, system, side) })
  const { hole, shaft } = fit
  // Lengths in the formulas carry as many decimals as the limits (5 of an inch).
  const length = (mm: number) => system === 'si'
    ? formatQuantity('length', system, mm)
    : formatDecimal(toDisplay('length', system, mm), INCH_LIMIT_DECIMALS, true)
  const D = length(fit.nominalMm)
  // A deviation written as a length, so it can be added to the nominal size.
  const asLength = (um: number) => length(um / 1000)
  return [
    makeLimit('holeMax', 'Hole upper limit', 'D_max', 'upper', hole.maxSizeMm, 'D + ES',
      plus(D, asLength(hole.upperDeviationUm)), SOURCES.holes),
    makeLimit('holeMin', 'Hole lower limit', 'D_min', 'lower', hole.minSizeMm, 'D + EI',
      plus(D, asLength(hole.lowerDeviationUm)), SOURCES.holes),
    make('holeTolerance', `Hole tolerance IT${hole.grade}`, 'T_H', 'deviation', hole.itUm, 'ES − EI',
      minus(deviation(hole.upperDeviationUm), deviation(hole.lowerDeviationUm)), SOURCES.tolerance),
    makeLimit('shaftMax', 'Shaft upper limit', 'd_max', 'upper', shaft.maxSizeMm, 'd + es',
      plus(D, asLength(shaft.upperDeviationUm)), SOURCES.shafts),
    makeLimit('shaftMin', 'Shaft lower limit', 'd_min', 'lower', shaft.minSizeMm, 'd + ei',
      plus(D, asLength(shaft.lowerDeviationUm)), SOURCES.shafts),
    make('shaftTolerance', `Shaft tolerance IT${shaft.grade}`, 'T_S', 'deviation', shaft.itUm, 'es − ei',
      minus(deviation(shaft.upperDeviationUm), deviation(shaft.lowerDeviationUm)), SOURCES.tolerance),
    make('maxClearance', 'Max clearance', 'C_max', 'deviation', fit.maxClearanceUm, 'D_max − d_min',
      minus(limitOfSize(hole.maxSizeMm, system, 'upper'), limitOfSize(shaft.minSizeMm, system, 'lower')), SOURCES.fits, true),
    make('minClearance', 'Min clearance', 'C_min', 'deviation', fit.minClearanceUm, 'D_min − d_max',
      minus(limitOfSize(hole.minSizeMm, system, 'lower'), limitOfSize(shaft.maxSizeMm, system, 'upper')), SOURCES.fits, true),
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

/** The tolerance zone's limits as 'lower → upper' in the display unit (see limitOfSize). */
export function limitsText(zone: ToleranceZone, system: UnitSystem): string {
  return `${limitOfSize(zone.minSizeMm, system, 'lower')} → ${limitOfSize(zone.maxSizeMm, system, 'upper')}`
}
