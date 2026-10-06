// What the first-ply failure means for the laminate: the verdict words of the
// results column and the report, its tone, and the status the library lists.
import type { Status } from '../../../../app/ui'
import type { CalculationStatus } from '../../../../core/library'
import { reserveStatus, type LaminateAnalysis, type ReserveStatus } from '../../calc'
import { angleText, criticalPhrase, formatFactor, formatReserveFactor, MODE_LABELS, plyRangeText, shownReserveFactor } from './labels'

const CALCULATION_STATUS: Record<ReserveStatus, CalculationStatus> = { pass: 'pass', warn: 'review', fail: 'fail' }

type Reserve = Pick<LaminateAnalysis['firstPlyFailure'], 'reserveFactor' | 'targetReserveFactor'>

/**
 * The engine's rule (fail below 1, warn below the target, else pass) applied
 * to the reserve factor as shown, floored to two decimals: what the screen
 * says always agrees with the number it shows.
 */
export const shownStatus = (reserveFactor: number, targetReserveFactor: number): ReserveStatus =>
  reserveStatus(shownReserveFactor(reserveFactor), targetReserveFactor)

/** The laminate's verdict on its lowest reserve factor, as shown (see shownStatus). */
export const laminateReserveStatus = ({ reserveFactor, targetReserveFactor }: Reserve): ReserveStatus => shownStatus(reserveFactor, targetReserveFactor)

/** The calculation status of a laminate: review when nothing loads it (RF ∞ checks nothing), else the verdict on its lowest RF. */
export function laminateStatus(firstPlyFailure: Reserve): CalculationStatus {
  return Number.isFinite(firstPlyFailure.reserveFactor) ? CALCULATION_STATUS[laminateReserveStatus(firstPlyFailure)] : 'review'
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
  const { reserveFactor, targetReserveFactor, mode } = analysis.firstPlyFailure
  if (!Number.isFinite(reserveFactor)) return { tone: 'warn', title: 'No load applied', detail: 'Enter running loads to check first-ply failure.' }
  const status = laminateReserveStatus(analysis.firstPlyFailure)
  const rf = formatReserveFactor(reserveFactor)
  const target = formatFactor(targetReserveFactor)
  const critical = `${criticalText(analysis)} ${criticalPhrase(analysis.criterion, mode)}`
  const tone = STATUS_TONE[status]
  if (status === 'pass') return { tone, title: `Reserve factor ${rf}`, detail: `Meets the ${target} target · ${critical}` }
  if (status === 'warn') return { tone, title: `Reserve factor ${rf}`, detail: `Below the ${target} target · ${critical}` }
  return { tone, title: `First ply fails: RF ${rf}`, detail: `${critical} under the applied loads` }
}

/**
 * The verdict card's one sentence, in the words of every tool's verdict:
 * what governs and how it stands against the requirement, e.g.
 * 'Plies 4–5 (90°) are below the 1.50 target and govern, in matrix tension.'
 */
export function verdictSentence(analysis: Pick<LaminateAnalysis, 'firstPlyFailure' | 'plies' | 'criterion'>): string {
  const { reserveFactor, targetReserveFactor, mode, criticalPlies } = analysis.firstPlyFailure
  if (!Number.isFinite(reserveFactor)) return 'No load is applied: enter running loads to check first-ply failure.'
  const status = laminateReserveStatus(analysis.firstPlyFailure)
  const plies = criticalText(analysis)
  const one = criticalPlies.length === 1
  const target = formatFactor(targetReserveFactor)
  const how = `in ${MODE_LABELS[mode]}`
  if (status === 'pass') return `Every ply meets the ${target} target; ${plies.charAt(0).toLowerCase()}${plies.slice(1)} ${one ? 'governs' : 'govern'}, ${how}.`
  if (status === 'warn') return `${plies} ${one ? 'is' : 'are'} below the ${target} target and ${one ? 'governs' : 'govern'}, ${how}.`
  return `${plies} ${one ? 'fails' : 'fail'} first, ${how}, under the applied loads.`
}

/**
 * The status colour of every ply, top ply first: one rule for every drawing
 * and list (bad RF < 1, warn below the target, ok meets it), on the RF as
 * shown, so the colour and the counts agree with the number on screen.
 */
export function plyTones({ plies, firstPlyFailure }: Pick<LaminateAnalysis, 'plies' | 'firstPlyFailure'>): Status[] {
  return plies.map((ply) => STATUS_TONE[shownStatus(ply.reserveFactor, firstPlyFailure.targetReserveFactor)])
}

/**
 * The small line under the verdict sentence, as in every tool ('4 of 7
 * checks pass'): '4 of 8 plies meet the target', with how many fail.
 */
export function plyCountText(tones: readonly Status[]): string {
  const meeting = tones.filter((t) => t === 'ok').length
  const failing = tones.filter((t) => t === 'bad').length
  const text = `${meeting} of ${tones.length} plies meet the target`
  return failing > 0 ? `${text} · ${failing} fail` : text
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
