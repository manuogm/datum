// Everything the engineer enters in the Composite Laminate tool, in SI units
// (N/mm, N·mm/mm), with ply materials by their Materials Database id. This
// record is what a calculation in the library stores.
import { DEFAULT_TARGET_RESERVE_FACTOR, type FailureCriterion, type LaminateLoads } from '../../calc'

/** One ply, at its material's cured ply thickness. */
export interface PlySpec {
  readonly materialId: string
  /** Fibre angle from the laminate x axis, −90° < θ ≤ 90°. */
  readonly angleDeg: number
}

export type LoadSpec = Required<LaminateLoads>

export interface LaminateInputs {
  /** Top ply first. */
  readonly plies: readonly PlySpec[]
  readonly loads: LoadSpec
  readonly criterion: FailureCriterion
  /** The reserve factor the laminate must reach: 1.5 unless changed. */
  readonly targetReserveFactor: number
}

export const DEFAULT_PLY_MATERIAL_ID = 'cfrp-t700-m21-ud'

/** The plies of one material at the given angles, top ply first. */
export const pliesAt = (anglesDeg: readonly number[], materialId = DEFAULT_PLY_MATERIAL_ID): PlySpec[] =>
  anglesDeg.map((angleDeg) => ({ materialId, angleDeg }))

export const NO_LOADS: LoadSpec = { nxNPerMm: 0, nyNPerMm: 0, nxyNPerMm: 0, mxN: 0, myN: 0, mxyN: 0 }

/** The Composite Laminate design's example: T700/M21 [0/±45/90]s under Nx and Nxy, Tsai-Wu. */
export const DEFAULT_LAMINATE_INPUTS: LaminateInputs = {
  plies: pliesAt([0, 45, -45, 90, 90, -45, 45, 0]),
  loads: { ...NO_LOADS, nxNPerMm: 250, nxyNPerMm: 80 },
  criterion: 'tsai-wu',
  targetReserveFactor: DEFAULT_TARGET_RESERVE_FACTOR,
}
