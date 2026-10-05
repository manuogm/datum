// Printable A4 report of the fit described by the URL's inputs (see
// app/report for the page frame and printing).
import { useMemo } from 'react'
import { ReportPage } from '../../../../app/report'
import { useSettings } from '../../../../app/settings/settings'
import { hashQuery } from '../../../../app/tools/toolInputs'
import { fitResults, presentedFit } from '../logic/fitResults'
import { decodeFitInputs, fitHref, PRINT_PARAM } from '../state/urlState'
import { FitReport } from './FitReport'

export function FitReportPage() {
  const { unitSystem } = useSettings()
  const query = hashQuery()
  const inputs = useMemo(() => decodeFitInputs(query), [query])
  const results = useMemo(() => fitResults(inputs, unitSystem), [inputs, unitSystem])
  const fit = presentedFit(inputs, results)
  return (
    <ReportPage
      title={fit.ok ? `Fit report Ø${inputs.nominalMm} ${fit.value.designation}` : 'Fit report'}
      backHref={fitHref(inputs)}
      backLabel="Fit Tolerance"
      print={{ requested: new URLSearchParams(query).has(PRINT_PARAM), href: fitHref(inputs, 'report') }}
    >
      {fit.ok ? (
        <FitReport fit={fit.value} inputs={inputs} results={results} system={unitSystem} />
      ) : (
        <p>There is no fit to report: {fit.error}</p>
      )}
    </ReportPage>
  )
}
