// The warnings of the printed report: every check of a joint that fails or
// is marginal, in the engine's words; for a pattern, per load case, the bolts
// that fail or are marginal grouped by the check that governs them.
import type { CalculationStep } from '../../calc'
import type { LoadCaseResult } from './boltResults'
import { formatUtilisation } from './verdict'

export function jointWarnings(steps: readonly CalculationStep[]): string[] {
  return steps.filter((s) => s.status === 'fail' || s.status === 'warn').map((s) => `${s.rStep} ${s.title}: ${s.message}`)
}

export function patternWarnings(loadCases: readonly LoadCaseResult[]): string[] {
  return loadCases.flatMap(({ loadCase, analysis }) => {
    const name = `${loadCase.id} ${loadCase.name}`
    if (!analysis.ok) return [`${name}: ${analysis.error}`]
    const groups = new Map<string, { ids: string[]; utilisation: number }>()
    for (const bolt of analysis.value.bolts) {
      if (bolt.status === 'pass') continue
      const step = bolt.analysis.steps.find((s) => s.id === bolt.analysis.summary.governing)
      const key = `${bolt.status === 'fail' ? 'fail' : 'are marginal on'} ${step ? `${step.rStep} ${step.title}` : 'a check'}`
      const group = groups.get(key) ?? { ids: [], utilisation: 0 }
      groups.set(key, { ids: [...group.ids, bolt.bolt.id], utilisation: Math.max(group.utilisation, bolt.utilisation) })
    }
    return [...groups].map(([verdict, { ids, utilisation }]) => `${name}: ${ids.join(', ')} ${verdict} (u up to ${formatUtilisation(utilisation)}).`)
  })
}
