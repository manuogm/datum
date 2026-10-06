// Words and short texts the laminate screens and report share: criteria,
// failure modes, ply angles and ply ranges.
import { formatDecimal } from '../../../../core/units'
import type { FailureCriterion, FailureMode } from '../../calc'
import { plyMaterialOf } from './lamResults'

export const CRITERION_LABELS: Record<FailureCriterion, string> = {
  'max-stress': 'Max stress',
  'tsai-hill': 'Tsai-Hill',
  'tsai-wu': 'Tsai-Wu',
}

export const MODE_LABELS: Record<FailureMode, string> = {
  'fibre-tension': 'fibre tension',
  'fibre-compression': 'fibre compression',
  'matrix-tension': 'matrix tension',
  'matrix-compression': 'matrix compression',
  shear: 'in-plane shear',
  none: 'no load',
}

/** '0', '90', '+45', '−45': the sign shown wherever it tells two plies apart. */
export function angleText(angleDeg: number): string {
  const text = formatDecimal(Math.abs(angleDeg), 1)
  if (angleDeg === 0 || angleDeg === 90) return text
  return `${angleDeg < 0 ? '−' : '+'}${text}`
}

/** '4–5', '1, 8', '2–3, 6–7': ply numbers with runs joined. */
export function plyRangeText(plies: readonly number[]): string {
  const runs: [number, number][] = []
  for (const ply of [...plies].sort((a, b) => a - b)) {
    const last = runs[runs.length - 1]
    if (last && ply === last[1] + 1) last[1] = ply
    else runs.push([ply, ply])
  }
  return runs.map(([first, end]) => (first === end ? String(first) : `${first}–${end}`)).join(', ')
}

/** A reserve factor or failure index to two decimals; ∞ when nothing loads the laminate. */
export function formatFactor(value: number): string {
  return Number.isFinite(value) ? formatDecimal(value, 2, true) : '∞'
}

/** The material's name, or its id when it is not a ply material. */
export function plyMaterialName(materialId: string): string {
  return plyMaterialOf(materialId)?.name ?? materialId
}

/**
 * The failure mode as a criterion can state it. Max stress names the stress
 * that fails; Tsai-Hill and Tsai-Wu are interaction criteria that predict no
 * mode, and for them the engine reports the stress that dominates (and Tsai-Wu
 * is the one the design notes word that way): 'dominant stress: matrix tension'.
 */
export function modeText(criterion: FailureCriterion, mode: FailureMode): string {
  return criterion === 'tsai-wu' && mode !== 'none' ? `dominant stress: ${MODE_LABELS[mode]}` : MODE_LABELS[mode]
}

/** 'critical in matrix tension', or for Tsai-Wu 'critical · dominant stress: matrix tension'. */
export function criticalPhrase(criterion: FailureCriterion, mode: FailureMode): string {
  return criterion === 'tsai-wu' ? `critical · ${modeText(criterion, mode)}` : `critical in ${MODE_LABELS[mode]}`
}
