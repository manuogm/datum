// Depth 1 of the results (design §7.1): the status by the verdict method,
// one sentence on what governs, the result range against the requirement,
// the other method's range, the capability and the largest contributor.
// In an assembly whose largest share is a linked part, "Open <part>" opens
// that part stack: the first place to tighten.
import { calcHref } from '../../../../app/router/routes'
import { Button, VerdictCard } from '../../../../app/ui'
import type { UnitSystem } from '../../../../core/units'
import type { StackAnalysis } from '../../calc'
import type { StackResults } from '../logic/stackResults'
import { stackVerdict } from '../logic/verdict'
import type { StackInputs } from '../state/stackInputs'
import styles from './results.module.css'

interface StackVerdictProps {
  inputs: StackInputs
  results: StackResults
  analysis: StackAnalysis
  system: UnitSystem
}

/** "20.825 … 21.095": on a phone it breaks after the ellipsis (a range does not fit one line at 48 px). */
function RangeValue({ text }: { text: string }) {
  const [low, high] = text.split(' … ')
  if (high === undefined) return <>{text}</>
  return (
    <>
      {low} …<br className={styles.rangeBreak} /> {high}
    </>
  )
}

export function StackVerdict({ inputs, results, analysis, system }: StackVerdictProps) {
  const verdict = stackVerdict(inputs, results, analysis, system)
  const { dominant } = verdict
  return (
    <VerdictCard
      className={styles.verdict}
      status={verdict.status}
      sentence={verdict.sentence}
      detail={verdict.detail}
      headline={{ ...verdict.headline, value: <RangeValue text={verdict.headline.value} /> }}
      figures={verdict.figures}
      reference={verdict.reference}
      actions={
        dominant && dominant.state !== 'missing' ? (
          <Button variant="secondary" size="md" icon="open" href={calcHref(dominant.row.calcId)}>
            Open {dominant.partName}
          </Button>
        ) : undefined
      }
    />
  )
}
