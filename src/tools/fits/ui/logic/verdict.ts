// What the verdict card of each mode leads with: the edge of the in-service
// clearance that governs (calculator), and the best match's status and the
// advisor's verdict in words (advisor).
import type { CalculationStatus } from '../../../../core/library'
import type { ClearanceRangeUm, FitCandidate } from '../../advisor'

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
