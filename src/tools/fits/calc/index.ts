/**
 * ISO 286 limits and fits: public API of the calculation engine.
 *
 * Units: sizes in millimetres (…Mm), deviations and tolerances in micrometres (…Um).
 * Functions never throw on user input; they return Result values:
 * `{ ok: true, value }` or `{ ok: false, error: '<plain-English reason>' }`.
 */
export type { Result } from './result'
export { DEVIATION_LETTERS, type DeviationLetter, type ZoneKind } from './letters'
export { TOLERANCE_GRADES, standardToleranceUm, type ToleranceGrade } from './toleranceGrades'
export { MAX_NOMINAL_SIZE_MM } from './sizeTable'
export {
  formatFit, formatZone, parseFitDesignation, parseZone, zoneSpec,
  type FitSpec, type ZoneSpec,
} from './designation'
export { toleranceZone, toleranceZoneFor, type ToleranceZone } from './toleranceZone'
export { analyseFit, analyseFitDesignation, classifyFit, type FitAnalysis, type FitType } from './fitAnalysis'
export { PREFERRED_FITS, type FitBasis, type PreferredFit } from './preferredFits'
