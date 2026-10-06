// Printable A4 report of a fit calculation (see app/report for the page frame
// and printing). It shows the inputs on screen, unsaved edits included.
import { useMemo } from 'react'
import { latestInputs } from '../../../../app/library/drafts'
import { ReportPage } from '../../../../app/report'
import { useSettings } from '../../../../app/settings/settings'
import type { Calculation } from '../../../../core/library'
import { fitResults, presentedFit } from '../logic/fitResults'
import { fitInputsFrom } from '../state/readInputs'
import { FitReport } from './FitReport'

export function FitReportPage({ calculation }: { calculation: Calculation }) {
  const { unitSystem } = useSettings()
  const inputs = useMemo(() => fitInputsFrom(latestInputs(calculation)), [calculation])
  const results = useMemo(() => fitResults(inputs, unitSystem), [inputs, unitSystem])
  const fit = presentedFit(inputs, results)
  return (
    <ReportPage calculation={calculation}>
      {fit.ok ? (
        <FitReport name={calculation.name} fit={fit.value} inputs={inputs} results={results} system={unitSystem} />
      ) : (
        <p>There is no fit to report: {fit.error}</p>
      )}
    </ReportPage>
  )
}
