// What "Save revision" hands to a project: the laminate on screen, its
// first-ply failure verdict against the target, its headline numbers in SI,
// the complete inputs so the revision reopens exactly as saved, and the ply
// materials for "Used in" on the Materials page.
import type { ToolSnapshot } from '../../../core/projects'
import { ok, type Result } from '../../../core/result'
import { formatQuantity } from '../../../core/units'
import { analyse, materialIdsOf } from './logic/lamResults'
import { formatFactor, plyRangeText } from './logic/labels'
import { PROJECT_STATUS } from './logic/verdict'
import type { LaminateInputs } from './state/lamInputs'

/** Fails, with the engine's explanation, when the inputs cannot be analysed. */
export function lamSnapshot(inputs: LaminateInputs): Result<ToolSnapshot<LaminateInputs>> {
  const analysis = analyse(inputs)
  if (!analysis.ok) return analysis
  const { layup, firstPlyFailure } = analysis.value
  return ok({
    tool: 'lam',
    title: layup.notation,
    status: PROJECT_STATUS[firstPlyFailure.status],
    figures: [
      { label: 'RF min', value: formatFactor(firstPlyFailure.reserveFactor) },
      { label: 'Critical plies', value: firstPlyFailure.criticalPlies.length > 0 ? plyRangeText(firstPlyFailure.criticalPlies) : '—' },
      { label: 'h', value: formatQuantity('length', 'si', layup.thicknessMm), unit: 'mm' },
    ],
    inputs,
    materialIds: materialIdsOf(inputs),
  })
}
