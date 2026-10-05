// Printable A4 report of the joint or pattern described by the URL's inputs
// (see app/report for the page frame and printing).
import { useMemo } from 'react'
import { ReportPage } from '../../../../app/report'
import { useSettings } from '../../../../app/settings/settings'
import { hashQuery } from '../../../../app/tools/toolInputs'
import { boltResults } from '../logic/boltResults'
import { jointTitle } from '../logic/labels'
import { boltHref, decodeBoltInputs, PRINT_PARAM } from '../state/urlState'
import { JointReport } from './JointReport'
import { PatternReport } from './PatternReport'

export function BoltReportPage() {
  const { unitSystem } = useSettings()
  const query = hashQuery()
  const inputs = useMemo(() => decodeBoltInputs(query), [query])
  const results = useMemo(() => boltResults(inputs, unitSystem), [inputs, unitSystem])
  const title = inputs.mode === 'joint' ? `Bolted joint report ${jointTitle(inputs.joint.design)}` : `Bolt pattern report, ${inputs.pattern.bolts.length} bolts`
  return (
    <ReportPage
      title={title}
      backHref={boltHref(inputs)}
      backLabel="Bolted Joint"
      print={{ requested: new URLSearchParams(query).has(PRINT_PARAM), href: boltHref(inputs, 'report') }}
    >
      {inputs.mode === 'joint' ? (
        results.joint.ok ? (
          <JointReport analysis={results.joint.value} inputs={inputs} system={unitSystem} />
        ) : (
          <p>There is no joint to report: {results.joint.error}</p>
        )
      ) : (
        <PatternReport inputs={inputs} results={results} system={unitSystem} />
      )}
    </ReportPage>
  )
}
