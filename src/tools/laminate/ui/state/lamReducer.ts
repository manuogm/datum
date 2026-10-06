// How the Composite Laminate inputs change. Every edit on the screen is one
// of these actions; the reducer is pure so it can be tested on its own.
import { MAX_PLIES, normaliseAngleDeg } from '../../calc'
import type { LaminateInputs, LoadSpec, PlySpec } from './lamInputs'

export type LamAction =
  /** Plain edits of top-level fields (criterion, target), or all inputs at once (a reopened revision). */
  | { type: 'change'; changes: Partial<LaminateInputs> }
  | { type: 'loads'; changes: Partial<LoadSpec> }
  /** New ply angles from the stacking notation, top ply first; with a material (an optimiser result), every ply is of it. */
  | { type: 'layup'; anglesDeg: readonly number[]; materialId?: string }
  | { type: 'ply'; index: number; changes: Partial<PlySpec> }
  /** A copy of the bottom ply, added under it. */
  | { type: 'addPly' }
  | { type: 'removePly'; index: number }
  /** Drag a ply to another place in the stack. */
  | { type: 'movePly'; from: number; to: number }

export function lamReducer(inputs: LaminateInputs, action: LamAction): LaminateInputs {
  const withPlies = (plies: readonly PlySpec[]): LaminateInputs => ({ ...inputs, plies })
  const { plies } = inputs
  switch (action.type) {
    case 'change':
      return { ...inputs, ...action.changes }
    case 'loads':
      return { ...inputs, loads: { ...inputs.loads, ...action.changes } }
    case 'layup':
      return action.anglesDeg.length === 0 ? inputs : withPlies(withAngles(plies, action.anglesDeg, action.materialId))
    case 'ply':
      return withPlies(plies.map((ply, i) => (i === action.index ? plyWith(ply, action.changes) : ply)))
    case 'addPly':
      return plies.length >= MAX_PLIES ? inputs : withPlies([...plies, plies[plies.length - 1]])
    case 'removePly':
      return plies.length === 1 ? inputs : withPlies(plies.filter((_, i) => i !== action.index))
    case 'movePly':
      return withPlies(moved(plies, action.from, action.to))
  }
}

const plyWith = (ply: PlySpec, changes: Partial<PlySpec>): PlySpec => {
  const next = { ...ply, ...changes }
  return { ...next, angleDeg: normaliseAngleDeg(next.angleDeg) }
}

/**
 * The stack at new angles. With as many plies as before each ply keeps its
 * material (a re-ordered or re-angled stack); otherwise every ply takes the
 * material of the top ply. With a material given, every ply takes it.
 */
function withAngles(plies: readonly PlySpec[], anglesDeg: readonly number[], materialId?: string): PlySpec[] {
  const sameCount = anglesDeg.length === plies.length
  const materialOf = (i: number) => materialId ?? (sameCount ? plies[i] : plies[0]).materialId
  return anglesDeg.map((angleDeg, i) => ({ materialId: materialOf(i), angleDeg: normaliseAngleDeg(angleDeg) }))
}

function moved<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length || to < 0 || to >= items.length) return [...items]
  const next = items.filter((_, i) => i !== from)
  next.splice(to, 0, items[from])
  return next
}
