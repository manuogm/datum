// Reading Composite Laminate inputs that come from outside the screen: a
// calculation stored in the library. A malformed field keeps its default,
// so a calculation saved by an older Datum always opens; a ply list with any
// unusable ply falls back to the default layup as a whole.
import { MAX_PLIES, normaliseAngleDeg, PLY_MATERIALS, type FailureCriterion } from '../../calc'
import { DEFAULT_LAMINATE_INPUTS, type LaminateInputs, type LoadSpec, type PlySpec } from './lamInputs'

type Fields = Readonly<Record<string, unknown>>

const isRecord = (value: unknown): value is Fields => typeof value === 'object' && value !== null && !Array.isArray(value)
const fields = (value: unknown): Fields => (isRecord(value) ? value : {})
const asNumber = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)

export const CRITERIA: readonly FailureCriterion[] = ['max-stress', 'tsai-hill', 'tsai-wu']

/** A material of the database that has ply data. */
export const isPlyMaterialId = (value: unknown): value is string => PLY_MATERIALS.some((m) => m.id === value)

function asPly(value: unknown): PlySpec | null {
  const ply = fields(value)
  const angleDeg = asNumber(ply.angleDeg)
  return isPlyMaterialId(ply.materialId) && angleDeg !== null ? { materialId: ply.materialId, angleDeg: normaliseAngleDeg(angleDeg) } : null
}

/** Plies top first; null unless every ply is usable and there are 1 … MAX_PLIES of them. */
export function asPlies(value: unknown): PlySpec[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_PLIES) return null
  const plies = value.map(asPly)
  return plies.every((ply) => ply !== null) ? plies : null
}

/** As in the engine, a load that is not given is 0. */
function asLoads(value: unknown): LoadSpec {
  const loads = fields(value)
  const read = (key: keyof LoadSpec) => asNumber(loads[key]) ?? 0
  return {
    nxNPerMm: read('nxNPerMm'), nyNPerMm: read('nyNPerMm'), nxyNPerMm: read('nxyNPerMm'),
    mxN: read('mxN'), myN: read('myN'), mxyN: read('mxyN'),
  }
}

export function lamInputsFrom(value: unknown): LaminateInputs {
  const saved = fields(value)
  const d = DEFAULT_LAMINATE_INPUTS
  const target = asNumber(saved.targetReserveFactor)
  return {
    plies: asPlies(saved.plies) ?? d.plies,
    loads: isRecord(saved.loads) ? asLoads(saved.loads) : d.loads,
    criterion: CRITERIA.find((c) => c === saved.criterion) ?? d.criterion,
    targetReserveFactor: target !== null && target > 0 ? target : d.targetReserveFactor,
  }
}
