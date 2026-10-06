// The calculation trail as a report table: each step R0 … R13 with its
// result, the limit it is checked against, the safety factor against the
// required one, and the clause.
import { cx } from '../../../../app/ui'
import { reportStyles as styles } from '../../../../app/report'
import { formatDecimal, type UnitSystem } from '../../../../core/units'
import type { CalculationStep } from '../../calc'
import { shownText, stepHeadline } from '../logic/trailValues'
import report from './report.module.css'

const VERDICT = { pass: 'pass', warn: 'marginal', fail: 'FAIL', info: '' } as const

export function TrailTable({ steps, system }: { steps: readonly CalculationStep[]; system: UnitSystem }) {
  const ratio = (value: number) => formatDecimal(value, 2, true)
  return (
    <table className={cx(styles.table, report.trail)}>
      <colgroup>
        <col className={report.stepCol} />
        <col className={report.resultCol} />
        <col className={report.limitCol} />
        <col className={report.factorCol} />
        <col />
      </colgroup>
      <thead>
        <tr>
          <th>STEP</th>
          <th className={styles.number}>RESULT</th>
          <th className={styles.number}>LIMIT</th>
          <th className={styles.number}>SF / REQ.</th>
          <th>SOURCE</th>
        </tr>
      </thead>
      <tbody>
        {steps.map((step) => {
          const headline = stepHeadline(step, system)
          return (
            <tr key={step.id} className={step.status === 'fail' ? styles.emphasis : undefined}>
              <td>
                {step.rStep} {step.title}
              </td>
              <td className={styles.number}>
                {step.check ? `${step.check.value.symbol} ${shownText(step.check.value, system)}` : `${headline.symbol} ${headline.value} ${headline.unit}`.trim()}
              </td>
              <td className={styles.number}>{step.check ? shownText(step.check.limit, system) : ''}</td>
              <td className={styles.number}>
                {step.check ? `${ratio(step.check.safetyFactor)} / ${ratio(step.check.requiredSafetyFactor)} ${VERDICT[step.status]}` : ''}
              </td>
              <td className={styles.source}>{step.clause.replace('VDI 2230-1:2015 ', '')}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
