// The warnings of the printed report: every check of a joint that fails or
// needs review, in the engine's words; for a pattern, per load case, the
// bolts grouped by each check that fails or needs review on them, which is
// not always the check that governs them (R9 of a stainless bolt, R10 with
// pG not known or estimated).
import type { CalculationStep } from '../../calc'
import type { LoadCaseResult } from './boltResults'
import { formatUtilisation, reviewReason } from './verdict'

export function jointWarnings(steps: readonly CalculationStep[]): string[] {
  return steps.filter((s) => s.status === 'fail' || s.status === 'warn').map((s) => `${s.rStep} ${s.title}: ${s.message}`)
}

interface WarningGroup {
  readonly step: CalculationStep
  readonly ids: string[]
  /** Highest utilisation of this check over the group's bolts; 0 when the check has no number. */
  utilisation: number
}

export function patternWarnings(loadCases: readonly LoadCaseResult[]): string[] {
  return loadCases.flatMap(({ loadCase, analysis }) => {
    const name = `${loadCase.id} ${loadCase.name}`
    if (!analysis.ok) return [`${name}: ${analysis.error}`]
    // Keyed by status, step id and the reason for review (which can name a
    // material), failures first in step order; R5's two checks stay apart.
    const groups = new Map<string, WarningGroup>()
    for (const status of ['fail', 'warn'] as const) {
      for (const bolt of analysis.value.bolts) {
        for (const step of bolt.analysis.steps.filter((s) => s.status === status)) {
          const key = `${status} ${step.id} ${reviewReason(step) ?? ''}`
          const group = groups.get(key) ?? { step, ids: [], utilisation: 0 }
          group.ids.push(bolt.bolt.id)
          group.utilisation = Math.max(group.utilisation, step.check?.utilisation ?? 0)
          groups.set(key, group)
        }
      }
    }
    return [...groups.values()].map((group) => `${name}: ${groupWarning(group)}`)
  })
}

/** 'B8 fails R12 Safety against slipping (u up to 1.34).' */
function groupWarning({ step, ids, utilisation }: WarningGroup): string {
  const one = ids.length === 1
  const check = `${step.rStep} ${step.title}`
  const upTo = step.check ? ` (u up to ${formatUtilisation(utilisation)})` : ''
  if (step.status === 'fail') return `${ids.join(', ')} ${one ? 'fails' : 'fail'} ${check}${upTo}.`
  // Its numbers pass (or there are none): the reason is the estimate or the missing value, not u.
  const reason = reviewReason(step)
  return reason
    ? `${ids.join(', ')} ${one ? 'needs' : 'need'} review on ${check}: ${reason}`
    : `${ids.join(', ')} ${one ? 'is' : 'are'} marginal on ${check}${upTo}.`
}
