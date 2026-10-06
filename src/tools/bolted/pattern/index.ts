/**
 * Bolt pattern under a rigid plate: public API.
 *
 * analyseBoltPattern shares one load case (forces and moments at a load
 * point) over the bolts of a pattern and checks each bolt with the VDI 2230
 * single-joint engine (../calc), each with its own joint type, and reports
 * the governing bolt. The load-sharing assumptions are listed in distribution.ts.
 *
 * Units: positions in mm, forces in N, moments in N·m.
 */
export { analyseBoltPattern } from './analysePattern'
export { boltLoads, loadAtCentroid, patternProperties } from './distribution'
export type {
  BoltLoad, BoltPatternAnalysis, BoltPatternInput, CentroidLoad, JointTypeSummary, PatternBolt, PatternBoltResult,
  PatternJointType, PatternLoadCase, PatternProperties, Vector3,
} from './types'
