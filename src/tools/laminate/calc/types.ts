import type { LaminaProperties, Material } from '../../../core/materials'

// ── Geometry and algebra ─────────────────────────────────────────────────

/** A 3-vector in Voigt order (x, y, xy) or (1, 2, 12); shear strains are engineering strains γ. */
export type Vector3 = readonly [number, number, number]

/** A 3×3 matrix, row by row. */
export type Matrix3 = readonly [Vector3, Vector3, Vector3]

// ── Input ────────────────────────────────────────────────────────────────

/** The ply data the laminate engine needs: a Material from the database that has lamina data, or a custom one. */
export type PlyMaterial = Pick<Material, 'id' | 'name' | 'densityGPerCm3'> & { readonly lamina: LaminaProperties }

/**
 * One ply. Plies are listed from the top surface (ply 1) to the bottom.
 * angleDeg: fibre angle from the laminate x axis, positive anticlockwise
 * seen from the top. thicknessMm: omitted, the material's cured ply thickness.
 */
export interface Ply {
  readonly material: PlyMaterial
  readonly angleDeg: number
  readonly thicknessMm?: number
}

/**
 * Running loads per unit width, CLT sign convention: N in N/mm, M in N·mm/mm
 * (= N). A positive Mx stretches the top surface (z > 0). Omitted values are 0.
 */
export interface LaminateLoads {
  readonly nxNPerMm?: number
  readonly nyNPerMm?: number
  readonly nxyNPerMm?: number
  readonly mxN?: number
  readonly myN?: number
  readonly mxyN?: number
}

/** Ply failure criteria, see failure.ts. */
export type FailureCriterion = 'max-stress' | 'tsai-hill' | 'tsai-wu'

export interface LaminateInput {
  readonly plies: readonly Ply[]
  readonly loads: LaminateLoads
  readonly criterion: FailureCriterion
  /** Reserve factor the laminate must reach; omitted: DEFAULT_TARGET_RESERVE_FACTOR (the project's composite minimum). */
  readonly targetReserveFactor?: number
  /** Tsai-Wu normalised interaction coefficient F12*; omitted: DEFAULT_TSAI_WU_F12_STAR. */
  readonly tsaiWuF12Star?: number
}

// ── Output ───────────────────────────────────────────────────────────────

/**
 * Laminate stiffness (CLT): A in N/mm, B in N, D in N·mm, and the inverse of
 * the full 6×6 ABD matrix split into a (mm/N), b (1/N) and d (1/(N·mm)).
 */
export interface Stiffness {
  readonly aNPerMm: Matrix3
  readonly bN: Matrix3
  readonly dNmm: Matrix3
  readonly compliance: { readonly a: Matrix3; readonly b: Matrix3; readonly d: Matrix3 }
}

/** Which couplings the laminate has; each is true when the terms are not zero (within a relative tolerance). */
export interface Coupling {
  /** B ≠ 0: in-plane loads bend and twist the laminate (it warps on cure or under load). */
  readonly bendingExtension: boolean
  /** A16 or A26 ≠ 0: in-plane normal loads cause shear strain. Zero for a balanced laminate. */
  readonly shearExtension: boolean
  /** D16 or D26 ≠ 0: bending moments cause twist. */
  readonly bendTwist: boolean
}

/**
 * Effective engineering constants of the laminate as a plate of thickness h.
 * apparent: B ≠ 0, so the values come from the full ABD inverse (the
 * laminate is free to bend) and describe the laminate only under that condition.
 */
export interface EngineeringConstants {
  readonly exGPa: number
  readonly eyGPa: number
  readonly gxyGPa: number
  readonly nuXy: number
  readonly nuYx: number
  /** Flexural moduli: E = 12 / (h³ · d). */
  readonly flexuralExGPa: number
  readonly flexuralEyGPa: number
  readonly apparent: boolean
}

/** Layup summary for the ply stack panel. */
export interface LayupSummary {
  readonly notation: string
  readonly plyCount: number
  readonly thicknessMm: number
  readonly arealMassKgPerM2: number
  /** Ply k and ply n + 1 − k have the same material, angle and thickness. */
  readonly symmetric: boolean
  /** For each material and thickness, as many +θ plies as −θ plies (θ ≠ 0°, 90°). */
  readonly balanced: boolean
}

/** Stresses (MPa) and strains (engineering, mm/mm) at one height in one ply, in laminate (x, y) and ply (1, 2) axes. */
export interface PointResponse {
  readonly zMm: number
  readonly strainGlobal: Vector3
  readonly stressGlobalMPa: Vector3
  readonly strainMaterial: Vector3
  readonly stressMaterialMPa: Vector3
  readonly reserveFactor: number
  /** 1 / reserve factor: grows in proportion to the load, 1.0 is first-ply failure. */
  readonly failureIndex: number
  readonly mode: FailureMode
}

/** The stress component that dominates at a point: the largest of σ1/X, σ2/Y, |τ12|/S (for max stress, the one that fails). */
export type FailureMode = 'fibre-tension' | 'fibre-compression' | 'matrix-tension' | 'matrix-compression' | 'shear' | 'none'

export interface PlyResult {
  /** 1 = top ply. */
  readonly index: number
  readonly angleDeg: number
  readonly materialName: string
  readonly thicknessMm: number
  readonly top: PointResponse
  readonly bottom: PointResponse
  /** The lower of top and bottom. */
  readonly reserveFactor: number
  readonly failureIndex: number
  readonly mode: FailureMode
}

/** Reserve factor RF against the target: pass RF ≥ target, warn 1 ≤ RF < target, fail RF < 1. */
export type ReserveStatus = 'pass' | 'warn' | 'fail'

export interface FirstPlyFailure {
  /** Lowest reserve factor in the laminate: the factor on all loads at first-ply failure. Infinity with no load. */
  readonly reserveFactor: number
  /** All plies with the lowest reserve factor (within 0.1 %), 1-based; symmetric pairs show up together. Empty with no load. */
  readonly criticalPlies: readonly number[]
  readonly mode: FailureMode
  /** The applied loads times the reserve factor. */
  readonly loads: Required<LaminateLoads>
  readonly targetReserveFactor: number
  readonly status: ReserveStatus
}

export interface LaminateAnalysis {
  readonly layup: LayupSummary
  readonly stiffness: Stiffness
  readonly coupling: Coupling
  readonly constants: EngineeringConstants
  /** Mid-plane strains ε0 (mm/mm, γ0 engineering) and curvatures κ (1/mm). */
  readonly midplaneStrain: Vector3
  readonly curvaturePerMm: Vector3
  readonly plies: readonly PlyResult[]
  readonly firstPlyFailure: FirstPlyFailure
  readonly criterion: FailureCriterion
}
