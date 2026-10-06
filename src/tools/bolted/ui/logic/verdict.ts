// Verdicts for a joint or a pattern: the tone a utilisation is shown in, the
// load case that governs a pattern, and the verdict in words for the results:
// always naming the check(s) behind the status, not only the most utilised.
import type { CalculationStatus } from '../../../../core/library'
import type { Result } from '../../../../core/result'
import { formatDecimal } from '../../../../core/units'
import type { BoltedJointAnalysis, CalculationStep, StepStatus } from '../../calc'
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

/** Is a worse than b: a worse status, or the same status at a higher utilisation. */
const worse = (a: Pick<PatternBoltResult, 'status' | 'utilisation'>, b: Pick<PatternBoltResult, 'status' | 'utilisation'>) =>
  SEVERITY[a.status] > SEVERITY[b.status] || (a.status === b.status && a.utilisation > b.utilisation)

/** The bolt that decides a load case: the worst status first, then the most utilised. */
export function decidingBolt(analysis: BoltPatternAnalysis): PatternBoltResult {
  return analysis.bolts.reduce((most, b) => (worse(b, most) ? b : most))
}

export interface GoverningCase {
  readonly loadCase: LoadCaseResult['loadCase']
  readonly analysis: BoltPatternAnalysis
  /** The bolt that decides the pattern's verdict (see `decidingBolt`). */
  readonly bolt: PatternBoltResult
  /** The highest utilisation of any bolt in any load case. */
  readonly maxUtilisation: number
}

/**
 * The load case that decides the pattern's verdict: the one whose deciding
 * bolt is worst, so a case that fails governs a case that is only more
 * utilised. Fails with the first load case's explanation when a load case
 * cannot be analysed.
 */
export function governingCase(loadCases: readonly LoadCaseResult[]): Result<GoverningCase> {
  let governing: Omit<GoverningCase, 'maxUtilisation'> | null = null
  let maxUtilisation = 0
  for (const { loadCase, analysis } of loadCases) {
    if (!analysis.ok) return { ok: false, error: `${loadCase.id} ${loadCase.name}: ${analysis.error}` }
    const bolt = decidingBolt(analysis.value)
    if (!governing || worse(bolt, governing.bolt)) governing = { loadCase, analysis: analysis.value, bolt }
    maxUtilisation = Math.max(maxUtilisation, ...analysis.value.bolts.map((b) => b.utilisation))
  }
  return governing ? { ok: true, value: { ...governing, maxUtilisation } } : { ok: false, error: 'Add a load case.' }
}

/** Worst bolt status over every load case. */
export function patternStatus(cases: readonly BoltPatternAnalysis[]): CheckStatus {
  return worstStatus(cases.flatMap((c) => c.bolts.map((b) => b.status)))
}

export interface VerdictText {
  /** One sentence: what governs and why. */
  readonly sentence: string
  /** The small line under it: how much passes. */
  readonly detail: string
}

/** 'R5 and R12' */
const listed = (items: readonly string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)

/** 'No limiting …' → 'no limiting …', but 'VDI 2230 …' and 'pG …' stay as they are. */
const asClause = (text: string) => (/^[A-Z][a-z]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text)

/**
 * The steps behind a status, most utilised first (R5's two checks listed
 * once). The most utilised check does not always explain a REVIEW: a step can
 * be marginal without a number (R10 when pG is not known) or because its
 * number rests on an estimate (R9 for a stainless bolt, R10 with pG estimated).
 */
export function openSteps(steps: readonly CalculationStep[], status: CheckStatus): CalculationStep[] {
  if (status === 'pass') return []
  const open = steps.filter((s) => s.status === status).sort((a, b) => (b.check?.utilisation ?? 0) - (a.check?.utilisation ?? 0))
  return open.filter((s, i) => open.findIndex((o) => o.rStep === s.rStep) === i)
}

/**
 * Why a step needs review when its numbers do not say so: the last sentence
 * of the engine's message, e.g. 'pG of PEEK estimated as Rm: enter the value
 * to confirm.' Null when the step is marginal on its numbers (1 ≤ SF <
 * required) or is not marginal at all.
 */
export function reviewReason(step: CalculationStep): string | null {
  if (step.status !== 'warn') return null
  const { check } = step
  if (check && check.safetyFactor >= 1 && check.safetyFactor < check.requiredSafetyFactor) return null
  return step.message.split(/(?<=[.!?])\s+(?=[A-Za-z])/).at(-1) ?? step.message
}

/**
 * Where to act on a surface pressure problem: washers when there are none,
 * pG of a part when it is not known. `designStep` names the step that holds
 * the design ('Joint step').
 */
function surfacePressureHint(step: CalculationStep, washers: boolean, designStep: string): string {
  if (step.id !== 'surface-pressure') return ''
  if (!step.check) return ` pG is asked for beside the part on the ${designStep}.`
  if (step.check.safetyFactor < step.check.requiredSafetyFactor && !washers) return ` ISO 7089 washers (${designStep}) spread the load.`
  return ''
}

/**
 * The check to name for a joint's verdict: the first behind its status when
 * it does not pass (R10 with pG not known), else its most utilised check.
 */
export function verdictCheck({ steps, summary }: Pick<BoltedJointAnalysis, 'steps' | 'summary'>): CalculationStep | undefined {
  return openSteps(steps, summary.status)[0] ?? steps.find((s) => s.id === summary.governing)
}

/** 'Safety against slipping (R12)' */
const titled = (step: CalculationStep) => `${step.title} (${step.rStep})`
/** 'R12 safety against slipping' */
const named = (step: CalculationStep) => `${step.rStep} ${step.title.toLowerCase()}`

/**
 * A single joint's verdict in words, naming the check(s) behind its status,
 * e.g. 'Safety against slipping (R12) is not met and governs.' and '4 of 7
 * checks pass · R5, R10 and R12 fail'.
 */
export function jointVerdict({ summary, steps, geometry }: Pick<BoltedJointAnalysis, 'summary' | 'steps' | 'geometry'>): VerdictText {
  const checks = `${summary.checksPassed} of ${summary.checksTotal} checks pass`
  // R5 holds two checks, so a step number is listed once.
  const rSteps = (status: CheckStatus) => [...new Set(steps.filter((s) => s.status === status).map((s) => s.rStep))]
  const failing = rSteps('fail')
  const reviewing = rSteps('warn')
  const detail = [
    checks,
    ...(failing.length > 0 ? [`${listed(failing)} fail`] : []),
    ...(reviewing.length > 0 ? [`${listed(reviewing)} need${reviewing.length === 1 ? 's' : ''} review`] : []),
  ].join(' · ')

  const [lead, ...others] = openSteps(steps, summary.status)
  if (summary.status === 'pass' || !lead) {
    const closest = steps.find((s) => s.id === summary.governing)
    if (!closest) return { sentence: summary.status === 'pass' ? 'Every VDI 2230 check passes.' : 'A VDI 2230 check is not met.', detail }
    return { sentence: `Every VDI 2230 check passes; the closest is ${titled(closest).charAt(0).toLowerCase()}${titled(closest).slice(1)}.`, detail }
  }
  const governs = lead.id === summary.governing ? ' and governs' : ''
  const hint = surfacePressureHint(lead, geometry.washer !== null, 'Joint step')
  if (summary.status === 'fail') return { sentence: `${titled(lead)} is not met${governs}.${hint}`, detail }
  const reason = reviewReason(lead)
  const also = others.length > 0 ? ` ${listed(others.map((s) => s.rStep))} also need${others.length === 1 ? 's' : ''} review.` : ''
  const sentence = reason ? `${titled(lead)} needs review: ${asClause(reason)}` : `${titled(lead)} is marginal${governs}.`
  return { sentence: sentence + hint + also, detail }
}

/** A bolt that does not pass, in words: 'B8 (J4) fails R12 safety against slipping in LC3 Braking.' */
function boltSentence(bolt: PatternBoltResult, where: string): string {
  const who = `${bolt.bolt.id} (${bolt.bolt.jointTypeId})`
  const open = openSteps(bolt.analysis.steps, bolt.status)
  const checks = open.length > 0 ? listed(open.map(named)) : 'a check'
  if (bolt.status === 'fail') return `${who} fails ${checks} in ${where}.`
  const reason = open.map(reviewReason).find((r) => r !== null)
  return reason ? `${who} needs review on ${checks} in ${where}: ${asClause(reason)}` : `${who} is marginal on ${checks} in ${where}.`
}

/** The verdict when every bolt passes; a bolt above the review limit is named. */
function passingSentence(bolt: PatternBoltResult, everyBolt: string, where: string): string {
  const who = `${bolt.bolt.id} (${bolt.bolt.jointTypeId})`
  return bolt.utilisation >= REVIEW_UTILISATION
    ? `${everyBolt}; ${who} in ${where} is above the ${formatDecimal(REVIEW_UTILISATION, 2, true)} review limit.`
    : `${everyBolt}; the most utilised is ${who} in ${where}.`
}

/**
 * A pattern's verdict in one load case, from its deciding bolt, e.g. 'B8
 * (J4) fails R12 safety against slipping in LC3 Braking.' and '6 of 8 bolts
 * pass'.
 */
export function loadCaseVerdict(analysis: BoltPatternAnalysis, loadCase: Pick<LoadCaseSpec, 'id' | 'name'>): VerdictText & { status: CalculationStatus } {
  const bolt = decidingBolt(analysis)
  const where = `${loadCase.id} ${loadCase.name}`
  const passing = analysis.bolts.filter((b) => b.status === 'pass').length
  const sentence = bolt.status === 'pass' ? passingSentence(bolt, `Every bolt passes in ${loadCase.id}`, where) : boltSentence(bolt, where)
  return { status: CALCULATION_STATUS[bolt.status], sentence, detail: `${passing} of ${analysis.bolts.length} bolts pass` }
}

/**
 * The whole pattern's verdict, over every load case, from the governing
 * case's deciding bolt: the status the report and the library show.
 */
export function patternVerdict(loadCases: readonly LoadCaseResult[]): Result<VerdictText & { status: CalculationStatus; governing: GoverningCase }> {
  const governing = governingCase(loadCases)
  if (!governing.ok) return governing
  const { loadCase, analysis, bolt } = governing.value
  const where = `${loadCase.id} ${loadCase.name}`
  const sentence = bolt.status === 'pass' ? passingSentence(bolt, 'Every bolt passes in every load case', where) : boltSentence(bolt, where)
  // Every case can be analysed here, or governingCase would have failed.
  const cases = loadCases.flatMap((c) => (c.analysis.ok ? [c.analysis.value] : []))
  const casesPassing = cases.filter((c) => c.bolts.every((b) => b.status === 'pass')).length
  const boltsPassing = analysis.bolts.filter((b) => b.status === 'pass').length
  const detail = `${casesPassing} of ${cases.length} load cases pass · ${boltsPassing} of ${analysis.bolts.length} bolts pass in ${loadCase.id}`
  return { ok: true, value: { status: CALCULATION_STATUS[bolt.status], sentence, detail, governing: governing.value } }
}
