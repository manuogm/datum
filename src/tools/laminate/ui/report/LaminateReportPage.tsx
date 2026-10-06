// Printable A4 report of the laminate described by the URL's inputs (see
// app/report for the page frame and printing).
import { useMemo } from 'react'
import { ReportPage } from '../../../../app/report'
import { useSettings } from '../../../../app/settings/settings'
import { hashQuery } from '../../../../app/tools/toolInputs'
import { formatLayup } from '../../calc'
import { analyse } from '../logic/lamResults'
import { decodeLamInputs, lamHref, PRINT_PARAM } from '../state/urlState'
import { LaminateReport } from './LaminateReport'

export function LaminateReportPage() {
  const { unitSystem } = useSettings()
  const query = hashQuery()
  const inputs = useMemo(() => decodeLamInputs(query), [query])
  const analysis = useMemo(() => analyse(inputs), [inputs])
  return (
    <ReportPage
      title={`Laminate report ${formatLayup(inputs.plies.map((p) => p.angleDeg))}`}
      backHref={lamHref(inputs)}
      backLabel="Composite Laminate"
      print={{ requested: new URLSearchParams(query).has(PRINT_PARAM), href: lamHref(inputs, 'report') }}
    >
      {analysis.ok ? <LaminateReport analysis={analysis.value} inputs={inputs} system={unitSystem} /> : <p>There is no laminate to report: {analysis.error}</p>}
    </ReportPage>
  )
}
