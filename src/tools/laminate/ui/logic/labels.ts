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

/** The sources of the analysis: laminate theory and the failure criteria. */
export const LAMINATE_STANDARDS = 'CLT (Jones 1999; Daniel & Ishai 2006), Tsai & Hahn (1980)'

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

/** A target reserve factor or a failure index to two decimals; ∞ when nothing loads the laminate. */
export function formatFactor(value: number): string {
  return Number.isFinite(value) ? formatDecimal(value, 2, true) : '∞'
}

/**
 * A reserve factor as it is shown: cut down (floored) to two decimals, so it
 * never reads better than it is (1.497 shows 1.49, not 1.50). Every verdict,
 * colour and count is judged on this shown value, so a ply reading "1.50"
 * always meets a 1.50 target. (The 1e-9 keeps an RF of exactly 1.29, stored
 * as 1.2899999…, from showing 1.28.)
 */
export function shownReserveFactor(reserveFactor: number): number {
  return Number.isFinite(reserveFactor) ? Math.floor(reserveFactor * 100 + 1e-9) / 100 : reserveFactor
}

/** A reserve factor as shown (see shownReserveFactor): '1.49'; ∞ when nothing loads the laminate. */
export const formatReserveFactor = (reserveFactor: number): string => formatFactor(shownReserveFactor(reserveFactor))

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
