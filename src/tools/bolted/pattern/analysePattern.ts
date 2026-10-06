import { fail, ok, type Result } from '../../../core/result'
import { analyseBoltedJoint } from '../calc'
import { boltLoads, loadAtCentroid, patternProperties } from './distribution'
import type {
  BoltLoad, BoltPatternAnalysis, BoltPatternInput, JointTypeSummary, PatternBolt, PatternBoltResult, PatternJointType,
} from './types'

/**
 * Bolt pattern: shares one load case over the bolts of a rigid plate
 * (distribution.ts) and checks every bolt with the single-joint VDI 2230
 * engine using its own joint type. Each bolt sees FA,max = its axial share
 * (0 where the plate is pressed down: compression goes through the contact
 * faces), FA,min = 0 (the load case is applied and removed) and FQ = its
 * transverse share. Returns an explanation instead of a result when the
 * input is not usable; never throws.
 *
 * Two passes: the first finds each bolt's slip capacity FKR,min·qF·µT under
 * its axial share; the second shares the in-plane load in proportion to
 * those capacities (see distribution.ts) and runs the checks.
 */
export function analyseBoltPattern(input: BoltPatternInput): Result<BoltPatternAnalysis> {
  const invalid = inputError(input)
  if (invalid) return fail(invalid)
  const properties = patternProperties(input.bolts)
  const centroidLoad = loadAtCentroid(input.loadCase, properties.centroidMm)
  const byPosition = boltLoads(input.bolts, properties, centroidLoad)
  if (!byPosition.ok) return byPosition

  // Pass 1: any in-plane load selects the transverse embedding values (VDI 2230 Table 5), as in pass 2.
  const inPlane = byPosition.value.some((load) => load.shearN > 0)
  const capacities: number[] = []
  for (const [index, bolt] of input.bolts.entries()) {
    const first = boltResult(input, bolt, { ...byPosition.value[index], shearN: inPlane ? 1 : 0 })
    if (!first.ok) return first
    capacities.push(first.value.slipCapacityN)
  }
  const loads = boltLoads(input.bolts, properties, centroidLoad, capacities)
  if (!loads.ok) return loads

  const results: PatternBoltResult[] = []
  for (const [index, bolt] of input.bolts.entries()) {
    const result = boltResult(input, bolt, loads.value[index])
    if (!result.ok) return result
    results.push(result.value)
  }
  return ok({
    properties,
    centroidLoad,
    bolts: results,
    byJointType: input.jointTypes.flatMap((jointType) => jointTypeSummary(jointType, results)),
    governing: mostUtilised(results),
  })
}

function boltResult(input: BoltPatternInput, bolt: PatternBolt, load: BoltLoad): Result<PatternBoltResult> {
  const jointType = input.jointTypes.find((j) => j.id === bolt.jointTypeId)
  if (!jointType) return fail(`Bolt ${bolt.id} uses joint type ${bolt.jointTypeId}, which is not defined.`)
  const { design } = jointType
  const analysis = analyseBoltedJoint({
    ...design,
    loads: {
      axialMaxN: Math.max(0, load.axialN),
      transverseN: load.shearN,
      transverseVariation: input.loadCase.transverseVariation ?? 'alternating',
    },
    unitSystem: input.unitSystem,
  })
  if (!analysis.ok) return fail(`Joint type ${jointType.id} (${jointType.name}): ${analysis.error}`)
  const { summary, preload } = analysis.value
  return ok({
    bolt, load, analysis: analysis.value, utilisation: summary.utilisation, status: summary.status,
    slipCapacityN: Math.max(0, preload.residualClampMinN) * (design.frictionInterfaces ?? 1) * design.interfaceFriction,
  })
}

/** The first bolt with the highest utilisation. */
function mostUtilised<T extends { readonly utilisation: number }>(items: readonly T[]): T {
  return items.reduce((most, item) => (item.utilisation > most.utilisation ? item : most))
}

const SEVERITY = { pass: 0, warn: 1, fail: 2 } as const

function jointTypeSummary(jointType: PatternJointType, results: readonly PatternBoltResult[]): JointTypeSummary[] {
  const own = results.filter((r) => r.bolt.jointTypeId === jointType.id)
  if (own.length === 0) return []
  const governing = mostUtilised(own)
  return [{
    jointTypeId: jointType.id,
    name: jointType.name,
    boltCount: own.length,
    governingBoltId: governing.bolt.id,
    utilisation: governing.utilisation,
    status: own.reduce((worst, r) => (SEVERITY[r.status] > SEVERITY[worst] ? r.status : worst), own[0].status),
  }]
}

function inputError({ jointTypes, bolts, loadCase }: BoltPatternInput): string | null {
  if (bolts.length === 0) return 'Add at least one bolt to the pattern.'
  const duplicate = (ids: readonly string[]) => ids.find((id, index) => ids.indexOf(id) !== index)
  const jointTypeDuplicate = duplicate(jointTypes.map((j) => j.id))
  if (jointTypeDuplicate !== undefined) return `Joint type id ${jointTypeDuplicate} is used twice.`
  const boltDuplicate = duplicate(bolts.map((b) => b.id))
  if (boltDuplicate !== undefined) return `Bolt id ${boltDuplicate} is used twice.`
  const misplaced = bolts.find((b) => !Number.isFinite(b.xMm) || !Number.isFinite(b.yMm))
  if (misplaced) return `Bolt ${misplaced.id} needs a position (x and y in mm).`
  const { forceN: f, momentNm: m, loadPointMm: p } = loadCase
  const numbers = [f.x, f.y, f.z, m.x, m.y, m.z, ...(p ? [p.x, p.y, p.z] : [])]
  if (!numbers.every(Number.isFinite)) return 'Every force, moment and load-point coordinate must be a number.'
  return null
}
