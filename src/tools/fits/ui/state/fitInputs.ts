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
  /** Clearance window required at every service temperature, µm (negative = interference). */
  readonly requiredClearanceUm: ClearanceRangeUm
  /** Largest interference accepted at assembly, µm, as a positive number. */
  readonly maxAssemblyInterferenceUm: number
}

/** The design's worked example: an aluminium upright carrying a steel pin, Ø25. */
export const DEFAULT_FIT_INPUTS: FitInputs = {
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
