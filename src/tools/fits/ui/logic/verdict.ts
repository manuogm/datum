// What the verdict card of each mode leads with: the edge of the in-service
// clearance that governs (calculator with a required window), the fit in
// service without a verdict (calculator without one), and the best match's
// status and the advisor's verdict in words (advisor).
import type { CalculationStatus } from '../../../../core/library'
import { formatQuantity, formatQuantityRange, type UnitSystem } from '../../../../core/units'
import { REFERENCE_TEMP_C, type ClearanceRangeUm, type FitCandidate } from '../../advisor'
import type { FitAnalysis } from '../../calc'
import type { FitInputs } from '../state/fitInputs'
import { candidateFor, type FitResults } from './fitResults'
import type { ServiceClearance } from './serviceClearance'

export interface GoverningEdge {
  /** min: the smallest clearance in service governs; max: the largest. */
  readonly edge: 'min' | 'max'
  /** That clearance in service, µm. */
  readonly valueUm: number
  /** The window limit it is judged against, µm. */
  readonly limitUm: number
}

/**
 * The end of the in-service clearance range furthest outside the required
 * window, or, when both are inside, the one closest to its limit. A tie goes
 * to the minimum (losing the fit's grip, or seizing, comes first).
 */
export function governingEdge(inServiceUm: ClearanceRangeUm, windowUm: ClearanceRangeUm): GoverningEdge {
  const belowMin = windowUm.minUm - inServiceUm.minUm
  const aboveMax = inServiceUm.maxUm - windowUm.maxUm
  return belowMin >= aboveMax
    ? { edge: 'min', valueUm: inServiceUm.minUm, limitUm: windowUm.minUm }
    : { edge: 'max', valueUm: inServiceUm.maxUm, limitUm: windowUm.maxUm }
}

const EDGE_WORD: Record<GoverningEdge['edge'], string> = { min: 'minimum', max: 'maximum' }

/**
 * The calculator's verdict in one sentence, in the words of every tool's
 * verdict: how the clearance in service stands against the required window,
 * and which edge governs.
 */
export function calculatorSentence(status: CalculationStatus, edge: GoverningEdge['edge']): string {
  const governs = `the ${EDGE_WORD[edge]} clearance governs`
  switch (status) {
    case 'pass':
      return `The clearance in service stays inside the required window; the ${EDGE_WORD[edge]} clearance is closest to its limit.`
    case 'review':
      return `The clearance in service is partly outside the required window; ${governs}.`
    case 'fail':
      return `The clearance in service is outside the required window; ${governs}.`
  }
}

/**
 * The calculator's sentence when no required window is set: the fit type and
 * its clearance at 20 °C and in service, and that it is not judged.
 * "Clearance fit: clearance 7 … 41 µm at 20 °C, 7 … 41 µm in service; no required window is set."
 */
export function unjudgedSentence(fitTypeLabel: string, fit: FitAnalysis, service: ServiceClearance, system: UnitSystem): string {
  const at20 = { minUm: fit.minClearanceUm, maxUm: fit.maxClearanceUm }
  const allInterference = at20.maxUm < 0 && service.inServiceUm.maxUm < 0
  const range = ({ minUm, maxUm }: ClearanceRangeUm) => allInterference
    ? formatQuantityRange('deviation', system, -maxUm, -minUm)
    : formatQuantityRange('deviation', system, minUm, maxUm)
  const reference = formatQuantity('temperature', system, REFERENCE_TEMP_C, { withUnit: true })
  return `${fitTypeLabel} fit: ${allInterference ? 'interference' : 'clearance'} ${range(at20)} at ${reference},`
    + ` ${range(service.inServiceUm)} in service; no required window is set.`
}

/**
 * The status the library summary and the report give the fit on screen: in
 * advisor mode, the best match's checks (assembly and application included);
 * in calculator mode, the clearance in service against the required window
 * (pass when none is set).
 */
export function presentedStatus(inputs: FitInputs, results: FitResults, fit: FitAnalysis, service: ServiceClearance): CalculationStatus {
  const candidate = inputs.mode === 'advisor' ? candidateFor(results, fit.designation) : undefined
  return candidate ? candidateStatus(candidate) : service.status
}

/**
 * The advisor's verdict card text. When the best match passes every check,
 * the advisor's own verdict (see adviceVerdict). Otherwise the sentence names
 * the check that fails first (or, with none failing, the first warning), and
 * the advisor's verdict follows as the detail.
 */
export function advisorVerdict(best: FitCandidate, why: string): { sentence: string; detail: string | null } {
  const advice = adviceVerdict(why)
  const status = candidateStatus(best)
  if (status === 'pass') return advice
  const check = best.checks.find((c) => c.status === 'fail') ?? best.checks.find((c) => c.status === 'warn')
  const verb = status === 'fail' ? 'fails a check' : 'needs review'
  const sentence = `${best.fit.designation} (score ${best.score}) ${verb}: ${check?.message ?? ''}`
  return { sentence, detail: [advice.sentence, advice.detail].filter((text) => text !== null).join(' ') }
}

/** An advisor candidate as a status: every check passes, some only warn, or one fails. */
export function candidateStatus(candidate: Pick<FitCandidate, 'checks'>): CalculationStatus {
  const statuses = candidate.checks.map((check) => check.status)
  if (statuses.includes('fail')) return 'fail'
  return statuses.includes('warn') ? 'review' : 'pass'
}

/**
 * The advisor's "why" text without its opening sentence, which explains the
 * thermal shift (see explainBest): the verdict on the best match, as one
 * sentence and, when there is one, a second line.
 */
export function adviceVerdict(why: string): { sentence: string; detail: string | null } {
  // Sentences end with a full stop before a space and a capital (the next
  // sentence starts with a designation such as "H7/k6" or "No ISO fit").
  const sentences = why.split(/(?<=\.)\s+(?=[A-Z])/)
  const verdict = sentences.length > 1 ? sentences.slice(1) : sentences
  return { sentence: verdict[0], detail: verdict.length > 1 ? verdict.slice(1).join(' ') : null }
}
