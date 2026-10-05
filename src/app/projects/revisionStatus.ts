// How a revision's verdict is shown: PASS / REVIEW / FAIL, or SUPERSEDED
// once a later revision of the same calculation exists.
import { isSuperseded, type Calculation, type Revision } from '../../core/projects'
import type { Tone } from '../ui'

const VERDICT_TONE: Record<Revision['snapshot']['status'], Tone> = { pass: 'ok', review: 'warn', fail: 'bad' }

export function revisionBadge(calculation: Calculation, revision: Revision): { tone: Tone; label: string } {
  if (isSuperseded(calculation, revision)) return { tone: 'neutral', label: 'superseded' }
  return { tone: VERDICT_TONE[revision.snapshot.status], label: revision.snapshot.status }
}
