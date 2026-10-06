// Verdicts for a joint or a pattern: the tone a utilisation is shown in, and
// the load case that governs a pattern.
import type { CalculationStatus } from '../../../../core/library'
import type { Result } from '../../../../core/result'
import { formatDecimal } from '../../../../core/units'
import type { BoltedJointAnalysis, StepStatus } from '../../calc'
import type { BoltPatternAnalysis, PatternBoltResult } from '../../pattern'
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

const VERDICT_WORD: Record<CheckStatus, string> = { pass: 'Passes', warn: 'Review', fail: 'Fails' }

/** 'Fails: Safety against slipping' and '4 of 7 checks pass · R12 governs at u 2.01'. */
export function jointHeadline({ summary, steps }: Pick<BoltedJointAnalysis, 'summary' | 'steps'>): { title: string; detail: string } {
  const governing = steps.find((s) => s.id === summary.governing)
  const checks = `${summary.checksPassed} of ${summary.checksTotal} checks pass`
  if (!governing) return { title: `${VERDICT_WORD[summary.status]}: VDI 2230 checks`, detail: checks }
  const title = summary.status === 'pass' ? 'Passes every VDI 2230 check' : `${VERDICT_WORD[summary.status]}: ${governing.title}`
  return { title, detail: `${checks} · ${governing.rStep} governs at u ${formatUtilisation(summary.utilisation)}` }
}

/** What the results say about a pattern's governing bolt in a load case. */
export function boltHeadline({ bolt, analysis, utilisation, status }: PatternBoltResult, loadCaseId: string): { tone: UtilisationTone; title: string; detail: string } {
  const tone = utilisationTone(utilisation, status)
  const step = analysis.steps.find((s) => s.id === analysis.summary.governing)
  const check = step ? `${step.rStep} ${step.title}` : 'A check'
  const title = `Governing: ${bolt.id} (${bolt.jointTypeId})`
  if (status === 'fail') return { tone, title, detail: `${check} fails in ${loadCaseId}, u ${formatUtilisation(utilisation)}` }
  if (status === 'warn') return { tone, title, detail: `${check} is marginal in ${loadCaseId}` }
  if (tone === 'warn') return { tone, title, detail: `Above the ${formatDecimal(REVIEW_UTILISATION, 2, true)} review limit in ${loadCaseId}` }
  return { tone, title, detail: `Every check passes in ${loadCaseId}` }
}
