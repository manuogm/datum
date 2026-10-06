import type { UnitSystem } from '../../../core/units'
import type { BoltedJointAnalysis, JointDesign, LoadVariation, StepStatus } from '../calc'

/**
 * Axes: x and y in the plane of the joint interface (the plan view of the
 * pattern), z along the bolt axes, pointing away from the base, so a positive
 * Fz pulls the plate off and puts the bolts in tension. Moments are
 * right-handed about these axes.
 */
export interface Vector3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

/** A kind of joint used in the pattern, e.g. 'J1 · M12 10.9 through-bolt into Ti-6Al-4V'. */
export interface PatternJointType {
  readonly id: string
  readonly name: string
  readonly design: JointDesign
}

export interface PatternBolt {
  readonly id: string
  /** Position in the plan view, in any origin; the pattern centroid is found from them. */
  readonly xMm: number
  readonly yMm: number
  readonly jointTypeId: string
}

export interface PatternLoadCase {
  /** Force at the load point. */
  readonly forceN: Vector3
  /** Moment at the load point. */
  readonly momentNm: Vector3
  /**
   * Where the load acts, in the same axes as the bolts; z is its height above
   * the joint interface. Omitted: at the pattern centroid, in the interface.
   */
  readonly loadPointMm?: Vector3
  /** For the slip check (R12); 'alternating' when omitted. */
  readonly transverseVariation?: LoadVariation
}

export interface BoltPatternInput {
  readonly jointTypes: readonly PatternJointType[]
  readonly bolts: readonly PatternBolt[]
  readonly loadCase: PatternLoadCase
  /** Units of the messages; SI when omitted. */
  readonly unitSystem?: UnitSystem
}

/** Second moments of the bolt positions about the centroid (each bolt counts as a unit area). */
export interface PatternProperties {
  readonly centroidMm: { readonly x: number; readonly y: number }
  /** Σ y² */
  readonly ixxMm2: number
  /** Σ x² */
  readonly iyyMm2: number
  /** Σ x·y */
  readonly ixyMm2: number
  /** Polar moment Σ (x² + y²). */
  readonly polarMm2: number
}

/** The load case moved to the pattern centroid. */
export interface CentroidLoad {
  readonly forceN: Vector3
  readonly momentNm: Vector3
}

/** The share of the load one bolt carries. */
export interface BoltLoad {
  /** Position relative to the centroid. */
  readonly xMm: number
  readonly yMm: number
  /** Axial force, tension positive; negative means that bolt's region is pressed onto the base. */
  readonly axialN: number
  readonly shearXN: number
  readonly shearYN: number
  /** Resultant transverse force on the bolt. */
  readonly shearN: number
}

export interface PatternBoltResult {
  readonly bolt: PatternBolt
  readonly load: BoltLoad
  /** VDI 2230 analysis with FA,max = max(0, axialN), FA,min = 0 and FQ = shearN (shared by slip capacity). */
  readonly analysis: BoltedJointAnalysis
  /** Highest check utilisation of the bolt (1 = VDI requirement just met); 1/utilisation is its lowest margin. */
  readonly utilisation: number
  readonly status: Exclude<StepStatus, 'info'>
  /** FKR,min·qF·µT: the transverse force this bolt's clamp load can hold by friction; the in-plane load is shared by it. */
  readonly slipCapacityN: number
}

export interface JointTypeSummary {
  readonly jointTypeId: string
  readonly name: string
  readonly boltCount: number
  /** The most utilised bolt of this joint type. */
  readonly governingBoltId: string
  readonly utilisation: number
  readonly status: Exclude<StepStatus, 'info'>
}

export interface BoltPatternAnalysis {
  readonly properties: PatternProperties
  readonly centroidLoad: CentroidLoad
  /** In input order. */
  readonly bolts: readonly PatternBoltResult[]
  /** Joint types that have bolts, in input order. */
  readonly byJointType: readonly JointTypeSummary[]
  /** The most utilised bolt of the pattern. */
  readonly governing: PatternBoltResult
}
