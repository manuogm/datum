// Printable A4 report of a laminate calculation (see app/report for the page
// frame and printing). It shows the inputs on screen, unsaved edits included.
import { useMemo } from 'react'
import { latestInputs } from '../../../../app/library/drafts'
import { ReportPage } from '../../../../app/report'
import { useSettings } from '../../../../app/settings/settings'
import type { Calculation } from '../../../../core/library'
import { analyse } from '../logic/lamResults'
import { lamInputsFrom } from '../state/readInputs'
import { LaminateReport } from './LaminateReport'

export function LaminateReportPage({ calculation }: { calculation: Calculation }) {
  const { unitSystem } = useSettings()
  const inputs = useMemo(() => lamInputsFrom(latestInputs(calculation)), [calculation])
  const analysis = useMemo(() => analyse(inputs), [inputs])
  return (
    <ReportPage calculation={calculation}>
      {analysis.ok ? (
        <LaminateReport name={calculation.name} analysis={analysis.value} inputs={inputs} system={unitSystem} />
      ) : (
        <p>There is no laminate to report: {analysis.error}</p>
      )}
    </ReportPage>
  )
}
