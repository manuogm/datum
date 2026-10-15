/**
 * Tolerance stack-up (one-dimensional loop diagram): public API.
 *
 * analyseStack takes a chain of contributors (dimensions with a plain or
 * geometric tolerance, or linked Part-mode stack results) with sensitivity
 * coefficients (±1 in 1D) and returns the nominal, mean, worst-case and RSS
 * ranges, σ, each contributor's share, the verdict against the requirement,
 * the estimated fraction out of spec, Cp/Cpk, and a StackResult that an
 * Assembly stack links as one row.
 *
 * Units: lengths in mm (any one length unit works: nothing is unit-specific
 * except LIMIT_TOLERANCE_MM). Functions never throw on user input; they
 * return Result values: `{ ok: true, value }` or `{ ok: false, error }`.
 * The judgement calls are in rules.ts and geometric.ts (marked UNSURE).
 */
export type { Result } from '../../../core/result'
export { analyseStack, capability, fractionOutOfSpec, linkedContributor, methodRange } from './analyseStack'
export { centredContributor, datumShiftRowsFor, linkedStatisticalPart, type CentredContributor } from './contributor'
export {
  GEOMETRIC_CHARACTERISTICS, GEOMETRIC_RULES, acceptsCombinedZone, acceptsDiameterZone, acceptsMaterialCondition, acceptsSurfaceBoundary,
  acceptsTangentPlane, bonusTolerance, characteristicsOf, datumFrameKey, datumFrameText, datumShift, datumShiftDeviations, frameDatumShift,
  geometricAvailability, geometricDeviations, geometricRule, hasDatumBoundary, inStandard, isProfile, isoOffsetFromUnequalValue, modifierNotes,
  plusShare, surfaceBoundary, unequalValueFromIsoOffset, type GeometricAvailability, type GeometricRule,
} from './geometric'
export { HOUSING_PART_STACK, endPlayAssembly } from './examples'
export { erfc, normalUpperTail } from './normal'
export {
  CPK_PASS, CPK_REVIEW, DEFAULT_METHOD, LIMIT_TOLERANCE_MM, MAX_CONTRIBUTORS, REVIEW_SIGMA_MULTIPLE, SIGMAS_PER_HALF_BAND, rssCpk, verdictOf,
} from './rules'
export { SOURCE } from './sources'
export { inputError as stackInputError, inputWarnings as stackInputWarnings, rowName } from './validate'
export type {
  Capability, Contributor, ContributorResult, ContributorTolerance, Conversion, DatumReference, DatumShiftContributor, DimensionContributor,
  DrawingStandard, FeatureType, FractionOutOfSpec, GeometricBreakdown, GeometricCharacteristic, GeometricTolerance, HighPointSeating,
  InformationalModifiers, LinkedStackContributor, MaterialBoundary, MaterialCondition, MethodRange, PlainTolerance, Requirement, Sensitivity,
  SizeLimits, StackAnalysis, StackInput, StackMethod, StackResult, StackTo, SurfaceBoundary, UnequalDisposition, Verdict, VerdictBasis,
  VerdictStatus,
} from './types'
