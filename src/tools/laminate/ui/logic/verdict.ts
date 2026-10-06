// What the first-ply failure means for the laminate: the verdict words of the
// results column and the report, its tone, and the project status of a saved
// revision.
import type { Status } from '../../../../app/ui'
import type { ToolSnapshot } from '../../../../core/projects'
import { reserveStatus, type LaminateAnalysis, type ReserveStatus } from '../../calc'
import { angleText, criticalPhrase, formatFactor, plyRangeText } from './labels'

const PROJECT_STATUS: Record<ReserveStatus, ToolSnapshot['status']> = { pass: 'pass', warn: 'review', fail: 'fail' }

/** The project status of a laminate: review when nothing loads it (RF ∞ checks nothing), else the engine's verdict. */
export function laminateStatus({ reserveFactor, status }: Pick<LaminateAnalysis['firstPlyFailure'], 'reserveFactor' | 'status'>): ToolSnapshot['status'] {
  return Number.isFinite(reserveFactor) ? PROJECT_STATUS[status] : 'review'
}

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

export function laminateHeadline(analysis: Pick<LaminateAnalysis, 'firstPlyFailure' | 'plies' | 'criterion'>): Headline {
  const { reserveFactor, targetReserveFactor, status, mode } = analysis.firstPlyFailure
  if (!Number.isFinite(reserveFactor)) return { tone: 'warn', title: 'No load applied', detail: 'Enter running loads to check first-ply failure.' }
  const rf = formatFactor(reserveFactor)
  const target = formatFactor(targetReserveFactor)
  const critical = `${criticalText(analysis)} ${criticalPhrase(analysis.criterion, mode)}`
  const tone = STATUS_TONE[status]
  if (status === 'pass') return { tone, title: `Reserve factor ${rf}`, detail: `Meets the ${target} target · ${critical}` }
  if (status === 'warn') return { tone, title: `Reserve factor ${rf}`, detail: `Below the ${target} target · ${critical}` }
  return { tone, title: `First ply fails: RF ${rf}`, detail: `${critical} under the applied loads` }
}

/** The status colour of every ply, top ply first: one rule for every drawing and list (bad RF < 1, warn below the target, ok meets it). */
export function plyTones({ plies, firstPlyFailure }: Pick<LaminateAnalysis, 'plies' | 'firstPlyFailure'>): Status[] {
  return plies.map((ply) => STATUS_TONE[reserveStatus(ply.reserveFactor, firstPlyFailure.targetReserveFactor)])
}

/** '2 fail', '4 below target', 'all meet target': what the ply list's tones add up to; 'no load' when nothing was checked. */
export function plyTally(tones: readonly Status[], loaded = true): { readonly tone: Status; readonly text: string } {
  if (!loaded) return { tone: 'warn', text: 'no load' }
  const failing = tones.filter((t) => t === 'bad').length
  if (failing > 0) return { tone: 'bad', text: `${failing} fail` }
  const below = tones.filter((t) => t === 'warn').length
  if (below > 0) return { tone: 'warn', text: `${below} below target` }
  return { tone: 'ok', text: 'all meet target' }
}
