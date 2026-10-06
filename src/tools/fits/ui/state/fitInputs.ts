// Everything the engineer enters in the Fit Tolerance tool, in SI units.
// Both modes share these inputs: the advisor's materials and requirements
// also give the calculator its in-service check. This record is what a
// calculation in the library stores.
import type { ApplicationFunction, AssemblyMethod, ClearanceRangeUm, TemperatureRangeC } from '../../advisor'
import type { ZoneSpec } from '../../calc'

export type FitMode = 'advisor' | 'calculator'

export interface FitInputs {
  readonly mode: FitMode
  /** Nominal diameter D, mm. */
  readonly nominalMm: number
  /** Calculator: hole tolerance class, e.g. H7. */
  readonly hole: ZoneSpec
  /** Calculator: shaft tolerance class, e.g. g6. */
  readonly shaft: ZoneSpec
  /** Advisor: what the fit must do. */
  readonly functions: readonly ApplicationFunction[]
  /** Materials Database ids of the part with the hole and of the shaft. */
  readonly housingMaterialId: string
  readonly shaftMaterialId: string
  readonly assembly: AssemblyMethod
  readonly serviceTempC: TemperatureRangeC
  /**
   * Clearance window required at every service temperature, µm (negative =
   * interference). Optional in the calculator: without one, the fit is shown
   * in service but not judged. The advisor needs one to rank the fits.
   */
  readonly requiredClearanceUm: ClearanceRangeUm | null
  /** Largest interference accepted at assembly, µm, as a positive number. */
  readonly maxAssemblyInterferenceUm: number
}

/**
 * The seeded example ("Steel pin in aluminium upright", Ø25): an aluminium
 * upright carrying a steel pin from −20 to 140 °C. The example is stored
 * without inputs, so it opens on these; they also fill any field missing
 * from a stored calculation.
 */
export const EXAMPLE_FIT_INPUTS: FitInputs = {
  mode: 'advisor',
  nominalMm: 25,
  hole: { kind: 'hole', letter: 'h', grade: '7' },
  shaft: { kind: 'shaft', letter: 'g', grade: '6' },
  functions: ['locate', 'transmit-torque'],
  housingMaterialId: 'al-7075-t6',
  shaftMaterialId: 'steel-42crmo4-qt',
  assembly: 'thermal',
  serviceTempC: { minC: -20, maxC: 140 },
  requiredClearanceUm: { minUm: 0, maxUm: 40 },
  maxAssemblyInterferenceUm: 40,
}

/**
 * Where a new calculation starts: no service conditions of its own. Housing
 * and shaft of the same steel at 20 °C, so temperature does not move the fit,
 * and no required clearance window, so nothing is judged against a target
 * the engineer has not entered. It opens in the calculator ("I know the fit").
 */
export const NEW_FIT_INPUTS: FitInputs = {
  ...EXAMPLE_FIT_INPUTS,
  mode: 'calculator',
  housingMaterialId: 'steel-c45-n',
  shaftMaterialId: 'steel-c45-n',
  serviceTempC: { minC: 20, maxC: 20 },
  requiredClearanceUm: null,
}
