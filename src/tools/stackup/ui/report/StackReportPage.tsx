// Printable A4 report of a stack-up calculation (see app/report for the page
// frame and printing). It shows the inputs on screen, unsaved edits
// included, and an assembly's linked parts as the library holds them now.
import { useMemo } from 'react'
import { latestInputs, useDrafts } from '../../../../app/library/drafts'
import { useLibrary } from '../../../../app/library/useLibrary'
import { ReportPage } from '../../../../app/report'
import { useSettings } from '../../../../app/settings/settings'
import type { Calculation } from '../../../../core/library'
import { stackResults, stackStatus } from '../logic/stackResults'
import { stackInputsFrom } from '../state/readInputs'
import { StackReport } from './StackReport'

export function StackReportPage({ calculation }: { calculation: Calculation }) {
  const { unitSystem } = useSettings()
  const { library } = useLibrary()
  const drafts = useDrafts()
  const inputs = useMemo(() => stackInputsFrom(latestInputs(calculation)), [calculation])
  const results = useMemo(() => stackResults(inputs, library, (id) => drafts.has(id)), [inputs, library, drafts])
  const { analysis } = results
  return (
    <ReportPage calculation={calculation}>
      {analysis.ok ? (
        <StackReport
          name={calculation.name}
          inputs={inputs}
          results={results}
          analysis={analysis.value}
          status={stackStatus(analysis.value, results.brokenLinks.length)}
          system={unitSystem}
        />
      ) : (
        <p>There is no stack to report: {analysis.error}</p>
      )}
    </ReportPage>
  )
}
