// Step 3 · Method: how the tolerances add up. Both methods are always worked
// out; this picks the one the verdict uses. Beside it, the result strip shows
// both ranges against the requirement, the chosen one in its status colour.
import { PanelSection, SegmentedControl, StepPage } from '../../../../app/ui'
import type { StackMethod } from '../../calc'
import { ResultStrip } from '../charts/ResultStrip'
import { stackChartModel } from '../charts/stackChart'
import { methodAssumptions } from '../logic/calculation'
import { methodVerdict } from '../logic/verdict'
import type { StackStepProps } from './stepProps'
import styles from './steps.module.css'

const METHODS = [
  { value: 'worst-case', label: 'Worst case' },
  { value: 'rss', label: 'RSS' },
] as const

const METHOD_NOTE: Record<StackMethod, string> = {
  'worst-case': 'Every part at its worst limit at once. A pass is a guarantee.',
  rss: 'Root sum of squares: each tolerance is ±3σ of a centred normal spread. A pass means about 0.27 % or fewer outside.',
}

const WORD = { pass: 'pass', review: 'review', fail: 'fail' } as const

export function MethodStep({ inputs, dispatch, results, system, flow, status }: StackStepProps) {
  const analysis = results.analysis.ok ? results.analysis.value : null
  const hasStatistical = inputs.rows.some((row) => row.kind === 'dimension' && row.statistical)
  const model = analysis ? stackChartModel({ inputs, analysis, links: results.links }, system, status ?? 'none') : null
  const meta = analysis
    ? (['worst-case', 'rss'] as const)
        .map((method) => {
          const verdict = methodVerdict(analysis, method)
          return `${method === 'worst-case' ? 'worst case' : 'RSS'}: ${verdict ? WORD[verdict.status] : 'not judged'}`
        })
        .join(' · ')
    : undefined
  return (
    <StepPage
      {...flow.page}
      title="Method"
      hint="How the tolerances add up. Both methods are always worked out; this picks the one the verdict uses."
      nextLabel="See results"
      asideAlign="start"
      aside={model ? <ResultStrip result={model.result} /> : undefined}
      asideLabel="Result"
      asideMeta={meta}
    >
      <PanelSection label="Method">
        <SegmentedControl label="Method" size="md" options={METHODS} value={inputs.method} onChange={(method) => dispatch({ type: 'change', changes: { method } })} />
        <span className={styles.note}>{METHOD_NOTE[inputs.method]}</span>
      </PanelSection>
      <PanelSection label="Assumptions">
        <ul className={styles.assumptions}>
          {methodAssumptions(hasStatistical).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </PanelSection>
    </StepPage>
  )
}
