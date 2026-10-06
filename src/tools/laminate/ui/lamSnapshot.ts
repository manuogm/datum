// What the library lists about a laminate calculation: the layup on screen
// (in the title), its first-ply failure verdict against the target, its
// headline numbers in SI and the complete inputs.
import type { ToolSnapshot } from '../../../core/library'
import { fail, ok, type Result } from '../../../core/result'
import { formatQuantity } from '../../../core/units'
import { analyse } from './logic/lamResults'
import { formatReserveFactor, plyRangeText } from './logic/labels'
import { laminateStatus } from './logic/verdict'
import type { LaminateInputs } from './state/lamInputs'

/** Fails, with the engine's explanation, when the inputs cannot be analysed, and when nothing loads the laminate (RF ∞ is no verdict to save). */
export function lamSnapshot(inputs: LaminateInputs): Result<ToolSnapshot<LaminateInputs>> {
  const analysis = analyse(inputs)
  if (!analysis.ok) return analysis
  const { layup, firstPlyFailure } = analysis.value
  if (!Number.isFinite(firstPlyFailure.reserveFactor)) return fail('No load applied: enter running loads to check first-ply failure.')
  return ok({
    tool: 'lam',
    title: layup.notation,
    status: laminateStatus(firstPlyFailure),
    figures: [
      { label: 'RF min', value: formatReserveFactor(firstPlyFailure.reserveFactor) },
      { label: 'Critical plies', value: firstPlyFailure.criticalPlies.length > 0 ? plyRangeText(firstPlyFailure.criticalPlies) : '—' },
      { label: 'h', value: formatQuantity('length', 'si', layup.thicknessMm), unit: 'mm' },
    ],
    inputs,
  })
}
