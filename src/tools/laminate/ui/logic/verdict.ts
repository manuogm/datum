// What the first-ply failure means for the laminate: the verdict words of the
// results column and the report, its tone, and the project status of a saved
// revision.
import type { Status } from '../../../../app/ui'
import type { ToolSnapshot } from '../../../../core/projects'
import type { LaminateAnalysis, ReserveStatus } from '../../calc'
import { angleText, formatFactor, MODE_LABELS, plyRangeText } from './labels'

export const PROJECT_STATUS: Record<ReserveStatus, ToolSnapshot['status']> = { pass: 'pass', warn: 'review', fail: 'fail' }

export const STATUS_TONE: Record<ReserveStatus, Status> = { pass: 'ok', warn: 'warn', fail: 'bad' }

export interface Headline {
  readonly tone: Status
  readonly title: string
  readonly detail: string
}

/** 'Plies 4–5 (90°)', 'Ply 1 (0°)'. */
export function criticalText({ firstPlyFailure, plies }: Pick<LaminateAnalysis, 'firstPlyFailure' | 'plies'>): string {
  const { criticalPlies } = firstPlyFailure
  const angles = [...new Set(criticalPlies.map((n) => plies[n - 1].angleDeg))].map((a) => `${angleText(a)}°`)
  return `${criticalPlies.length === 1 ? 'Ply' : 'Plies'} ${plyRangeText(criticalPlies)} (${angles.join(', ')})`
}

export function laminateHeadline(analysis: Pick<LaminateAnalysis, 'firstPlyFailure' | 'plies'>): Headline {
  const { reserveFactor, targetReserveFactor, status, mode } = analysis.firstPlyFailure
  if (!Number.isFinite(reserveFactor)) return { tone: 'ok', title: 'No load applied', detail: 'Enter running loads to check first-ply failure.' }
  const rf = formatFactor(reserveFactor)
  const target = formatFactor(targetReserveFactor)
  const critical = `${criticalText(analysis)} critical in ${MODE_LABELS[mode]}`
  const tone = STATUS_TONE[status]
  if (status === 'pass') return { tone, title: `Reserve factor ${rf}`, detail: `Meets the ${target} target · ${critical}` }
  if (status === 'warn') return { tone, title: `Reserve factor ${rf}`, detail: `Below the ${target} target · ${critical}` }
  return { tone, title: `First ply fails: RF ${rf}`, detail: `${critical} under the applied loads` }
}
