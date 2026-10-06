/**
 * Composite laminate calculation by classical laminate theory (CLT): public API.
 *
 * analyseLaminate takes a ply stack (top ply first), running loads and a ply
 * failure criterion, and returns the ABD stiffness, couplings, engineering
 * constants, ply strains and stresses at the top and bottom of every ply,
 * ply reserve factors and the first-ply failure load.
 *
 * Units: lengths in mm, moduli in GPa (ply data) and MPa (Q, Q̄, stresses),
 * running loads N in N/mm and moments M in N·mm/mm (= N), A in N/mm, B in N,
 * D in N·mm, curvatures in 1/mm, strains in mm/mm, areal mass in kg/m².
 * z is measured from the mid-plane, positive towards ply 1 (the top).
 * Functions never throw on user input; they return Result values:
 * `{ ok: true, value }` or `{ ok: false, error }`. The judgement calls are in rules.ts.
 */
export type { Result } from '../../../core/result'
export { invert, laminateMatrices, plyBoundariesMm } from './abd'
export { analyseLaminate, loadsWithDefaults } from './analyseLaminate'
export { maxStress, plyFailure, tsaiHill, tsaiWu, type PlyFailure } from './failure'
export { minorPoissonRatio, reducedStiffnessMPa, strainToMaterialAxes, transformedStiffnessMPa } from './lamina'
export { formatLayup, isBalanced, isSymmetric, normaliseAngleDeg, parseLayup, pliesOf, plyThicknessMm } from './layup'
export {
  COUPLING_TOLERANCE, CRITICAL_PLY_TOLERANCE, DEFAULT_TARGET_RESERVE_FACTOR, DEFAULT_TSAI_WU_F12_STAR, MAX_PLIES, reserveStatus,
} from './rules'
export { PLY_MATERIALS, plyMaterial } from './plyMaterials'
export { inputError as laminateInputError, laminaError } from './validate'
export type {
  Coupling, EngineeringConstants, FailureCriterion, FailureMode, FirstPlyFailure, LaminateAnalysis, LaminateInput, LaminateLoads,
  LayupSummary, Matrix3, Ply, PlyMaterial, PlyResult, PointResponse, ReserveStatus, Stiffness, Vector3,
} from './types'
