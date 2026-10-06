// Printable A4 report of a bolted joint calculation, a single joint or a
// pattern (see app/report for the page frame and printing).
import { useMemo } from 'react'
import { ReportPage } from '../../../../app/report'
import { useSettings } from '../../../../app/settings/settings'
import type { Calculation } from '../../../../core/library'
import { boltResults } from '../logic/boltResults'
import { boltInputsFrom } from '../state/readInputs'
import { JointReport } from './JointReport'
import { PatternReport } from './PatternReport'

export function BoltReportPage({ calculation }: { calculation: Calculation }) {
  const { unitSystem } = useSettings()
  const inputs = useMemo(() => boltInputsFrom(calculation.inputs), [calculation.inputs])
  const results = useMemo(() => boltResults(inputs, unitSystem), [inputs, unitSystem])
  const { name } = calculation
  return (
    <ReportPage calculation={calculation}>
      {inputs.mode === 'joint' ? (
        results.joint.ok ? (
          <JointReport name={name} analysis={results.joint.value} inputs={inputs} system={unitSystem} />
        ) : (
          <p>There is no joint to report: {results.joint.error}</p>
        )
      ) : (
        <PatternReport name={name} inputs={inputs} results={results} system={unitSystem} />
      )}
    </ReportPage>
  )
}
