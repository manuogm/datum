// Verdicts for a joint or a pattern: the tone a utilisation is shown in, the
// load case that governs a pattern, and the verdict in words for the results.
import type { CalculationStatus } from '../../../../core/library'
import type { Result } from '../../../../core/result'
import { formatDecimal } from '../../../../core/units'
import type { BoltedJointAnalysis, StepStatus } from '../../calc'
import type { BoltPatternAnalysis, PatternBoltResult } from '../../pattern'
import type { LoadCaseSpec } from '../state/boltInputs'
import type { LoadCaseResult } from './boltResults'

export type CheckStatus = Exclude<StepStatus, 'info'>

/**
 * Utilisation (1 = a VDI 2230 requirement just met) from which a passing
 * bolt is flagged for review, as in the Bolt Pattern design: Datum's
 * judgement, not a VDI 2230 value.
 */
export const REVIEW_UTILISATION = 0.85

export type UtilisationTone = 'ok' | 'warn' | 'bad'

/** '0.87', or '∞' when the engine reports no margin at all (a safety factor of 0 or less). */
export function formatUtilisation(utilisation: number): string {
  return Number.isFinite(utilisation) ? formatDecimal(utilisation, 2, true) : '∞'
}

/** Failed and marginal checks keep their own tone; a passing bolt above the review limit shows amber. */
export function utilisationTone(utilisation: number, status: CheckStatus): UtilisationTone {
  if (status === 'fail') return 'bad'
  return status === 'warn' || utilisation >= REVIEW_UTILISATION ? 'warn' : 'ok'
}

/** A check status as a calculation status. */
export const CALCULATION_STATUS: Record<CheckStatus, CalculationStatus> = { pass: 'pass', warn: 'review', fail: 'fail' }

const SEVERITY: Record<CheckStatus, number> = { pass: 0, warn: 1, fail: 2 }

export function worstStatus(statuses: readonly CheckStatus[]): CheckStatus {
  return statuses.reduce<CheckStatus>((worst, s) => (SEVERITY[s] > SEVERITY[worst] ? s : worst), 'pass')
}

export interface GoverningCase {
  readonly loadCase: LoadCaseResult['loadCase']
  readonly analysis: BoltPatternAnalysis
  readonly bolt: PatternBoltResult
}

/**
 * The load case whose governing bolt is the most utilised, or the first
 * load case's explanation when a load case cannot be analysed.
 */
export function governingCase(loadCases: readonly LoadCaseResult[]): Result<GoverningCase> {
  let governing: GoverningCase | null = null
  for (const { loadCase, analysis } of loadCases) {
    if (!analysis.ok) return { ok: false, error: `${loadCase.id} ${loadCase.name}: ${analysis.error}` }
    const bolt = analysis.value.governing
    if (!governing || bolt.utilisation > governing.bolt.utilisation) governing = { loadCase, analysis: analysis.value, bolt }
  }
  return governing ? { ok: true, value: governing } : { ok: false, error: 'Add a load case.' }
}

/** Worst bolt status over every load case. */
export function patternStatus(cases: readonly BoltPatternAnalysis[]): CheckStatus {
  return worstStatus(cases.flatMap((c) => c.bolts.map((b) => b.status)))
}

/** A load case's tone as a verdict: a passing bolt above the review limit asks for review. */
const TONE_VERDICT: Record<UtilisationTone, CalculationStatus> = { ok: 'pass', warn: 'review', bad: 'fail' }

export interface VerdictText {
  /** One sentence: what governs and why. */
  readonly sentence: string
  /** The small line under it: how much passes. */
  readonly detail: string
}

/** 'R5 and R12' */
const listed = (items: readonly string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)

/**
 * A single joint's verdict in words, e.g. 'Safety against slipping is not
 * met: R12 governs.' and '4 of 7 checks pass · R5, R10 and R12 fail'.
 */
export function jointVerdict({ summary, steps }: Pick<BoltedJointAnalysis, 'summary' | 'steps'>): VerdictText {
  const governing = steps.find((s) => s.id === summary.governing)
  const checks = `${summary.checksPassed} of ${summary.checksTotal} checks pass`
  // R5 holds two checks, so a step number is listed once.
  const failing = [...new Set(steps.filter((s) => s.check && s.status === 'fail').map((s) => s.rStep))]
  const detail = failing.length > 0 ? `${checks} · ${listed(failing)} fail` : checks
  if (!governing) return { sentence: summary.status === 'pass' ? 'Every VDI 2230 check passes.' : 'A VDI 2230 check is not met.', detail }
  const check = `${governing.title} (${governing.rStep})`
  switch (summary.status) {
    case 'pass':
      return { sentence: `Every VDI 2230 check passes; the closest is ${check.charAt(0).toLowerCase()}${check.slice(1)}.`, detail }
    case 'warn':
      return { sentence: `${check} is marginal and governs.`, detail }
    case 'fail':
      return { sentence: `${check} is not met and governs.`, detail }
  }
}

/**
 * A pattern's verdict in one load case, from its most utilised bolt, e.g.
 * 'B8 (J4) fails R12 safety against slipping in LC3 Braking.' and '6 of 8
 * bolts pass'.
 */
export function loadCaseVerdict(analysis: BoltPatternAnalysis, loadCase: Pick<LoadCaseSpec, 'id' | 'name'>): VerdictText & { status: CalculationStatus } {
  const { bolt, utilisation, status, analysis: joint } = analysis.governing
  const tone = utilisationTone(utilisation, status)
  const step = joint.steps.find((s) => s.id === joint.summary.governing)
  const check = step ? `${step.rStep} ${step.title.toLowerCase()}` : 'a check'
  const who = `${bolt.id} (${bolt.jointTypeId})`
  const where = `${loadCase.id} ${loadCase.name}`
  const passing = analysis.bolts.filter((b) => b.status === 'pass').length
  const detail = `${passing} of ${analysis.bolts.length} bolts pass`
  const sentence =
    status === 'fail' ? `${who} fails ${check} in ${where}.`
    : status === 'warn' ? `${who} is marginal on ${check} in ${where}.`
    : tone === 'warn' ? `Every bolt passes in ${where}; ${who} is above the ${formatDecimal(REVIEW_UTILISATION, 2, true)} review limit.`
    : `Every bolt passes in ${where}.`
  return { status: TONE_VERDICT[tone], sentence, detail }
}
