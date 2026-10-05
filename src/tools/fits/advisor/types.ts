import type { Material } from '../../../core/materials'
import type { FitAnalysis, FitBasis, PreferredFit } from '../calc'

/** What the fitted parts must do (the APPLICATION toggles of the Fit advisor). */
export type ApplicationFunction = 'locate' | 'transmit-torque' | 'slide' | 'rotate' | 'disassemble-often'

export type AssemblyMethod = 'by-hand' | 'press' | 'thermal'

/** Diametral clearance limits: hole − shaft, negative = interference. */
export interface ClearanceRangeUm {
  readonly minUm: number
  readonly maxUm: number
}

export interface TemperatureRangeC {
  readonly minC: number
  readonly maxC: number
}

/** The material data the advisor needs (a Material from the database, or a custom one). */
export type AdvisorMaterial = Pick<Material, 'name' | 'thermalExpansionUmPerMK' | 'maxServiceTempC'>

export interface FitAdvisorInput {
  readonly nominalMm: number
  /** The part with the hole. */
  readonly housing: AdvisorMaterial
  readonly shaft: AdvisorMaterial
  readonly functions: readonly ApplicationFunction[]
  readonly assembly: AssemblyMethod
  /** Hole-basis (H hole, default) or shaft-basis (h shaft) candidates. */
  readonly basis?: FitBasis
  readonly serviceTempC: TemperatureRangeC
  /** Clearance required at every service temperature. */
  readonly requiredClearanceUm: ClearanceRangeUm
  /** Largest acceptable interference at assembly temperature, as a positive number. */
  readonly maxAssemblyInterferenceUm: number
  /** Workshop temperature; 20 °C when omitted. */
  readonly assemblyTempC?: number
}

/** Input with the defaults filled in (hole-basis, assembly at 20 °C). */
export type AdvisorSettings = Required<FitAdvisorInput>

export type CheckStatus = 'pass' | 'warn' | 'fail'

export type CheckId =
  | 'service-window' | 'assembly-interference' | 'by-hand' | 'thermal-assembly'
  | 'locate' | 'transmit-torque' | 'slide-rotate' | 'disassemble-often'

export interface Check {
  readonly id: CheckId
  readonly status: CheckStatus
  /** Short plain-English result with the numbers, e.g. 'Up to 35.0 µm interference at 20 °C (limit 40 µm).' */
  readonly message: string
}

export interface ClearanceAtTemperature extends ClearanceRangeUm {
  readonly tempC: number
}

/** Temperatures that give ASSEMBLY_CLEARANCE_UM_PER_MM of clearance for joining; null if that material does not expand. */
export interface ThermalAssembly {
  readonly assemblyClearanceUm: number
  readonly housingHeatTempC: number | null
  readonly shaftCoolTempC: number | null
}

export interface FitCandidate {
  /** ISO 286 analysis at the 20 °C reference temperature. */
  readonly fit: FitAnalysis
  /** The preferred-fit entry, when this is one of the ISO preferred fits. */
  readonly preferred: PreferredFit | null
  readonly atServiceMin: ClearanceAtTemperature
  readonly atServiceMax: ClearanceAtTemperature
  readonly atAssembly: ClearanceAtTemperature
  /** Smallest and largest clearance anywhere in the service temperature range. */
  readonly inServiceUm: ClearanceRangeUm
  /** Share (0 … 1) of the in-service clearance range that lies inside the required window. */
  readonly windowShare: number
  /** Only for thermal assembly of a fit with interference at assembly temperature. */
  readonly thermalAssembly: ThermalAssembly | null
  readonly checks: readonly Check[]
  /** 0 … 100, see score.ts. */
  readonly score: number
}

export interface FitAdvice {
  /** Change of clearance per kelvin of uniform temperature change: D·(α_housing − α_shaft). */
  readonly clearanceShiftUmPerK: number
  /** Best first. */
  readonly candidates: readonly FitCandidate[]
  /** Plain-English reasoning behind the best match. */
  readonly why: string
  /** Warnings about the materials themselves, independent of the fit. */
  readonly materialNotes: readonly string[]
}
