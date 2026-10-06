/**
 * Bolted joint calculation to VDI 2230 Part 1:2015: public API.
 *
 * analyseBoltedJoint runs steps R0 … R13 for one bolt (through-bolt with nut,
 * tapped thread, or thread insert) with concentric clamping and loading,
 * and returns the numbers plus a step-by-step calculation trail.
 *
 * Units: forces in N, lengths in mm, stresses in MPa (N/mm²), torques in N·m,
 * resilience in mm/N, temperatures in °C. Functions never throw on user input;
 * they return Result values: `{ ok: true, value }` or `{ ok: false, error }`.
 * The judgement calls and recalled table values are all in rules.ts.
 */
export type { Result } from '../../../core/result'
export { analyseBoltedJoint } from './analyseJoint'
export { boltDimensions, type BoltDimensions, type WasherDimensions } from './boltDimensions'
export { stiThread, type ThreadEngagement } from './engagement'
export { boltMaterial, PROPERTY_CLASSES, type BoltMaterial, type PropertyClass } from './propertyClasses'
export { coneTanPhi, loadFactor } from './resilience'
export {
  EMBEDDING_UM, LIMITING_SURFACE_PRESSURE_MPA, LOAD_INTRODUCTION_FACTOR, REQUIRED_SAFETY, STANDARD_UTILISATION,
  TIGHTENING_METHODS, TORSION_REDUCTION, type LimitingSurfacePressure,
} from './rules'
export type { WorkingStress } from './strength'
export { NOMINAL_DIAMETERS_MM, pitchesForMm, threadGeometry, type ThreadGeometry } from './threads'
export { permissibleAssemblyPreloadN, tighteningTorqueNm } from './tightening'
export type {
  BearingPressure, BoltedJointAnalysis, BoltedJointInput, BoltGeometry, BoltStresses, CalculationStep, ClampedPlate,
  HeadType, InsertType, JointDesign, JointLoads, JointMaterial, JointSummary, JointType, LoadIntroduction, LoadIntroductionPosition,
  LoadVariation, Preload, Resilience, ResilienceSegment, StepCheck, StepId, StepStatus, SurfaceRoughness,
  TemperatureRangeC, ThreadRolling, ThreadSize, Tightening, TighteningMethod, TrailUnit, TrailValue,
} from './types'
