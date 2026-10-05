// Printable A4 report of the fit described by the URL's inputs, always in
// the light print colours. Opened from "PDF report": it then asks the browser
// to print, where "Save as PDF" makes the file. No PDF library is involved.
import { useEffect, useMemo } from 'react'
import { useSettings } from '../../../../app/settings/settings'
import { Button } from '../../../../app/ui'
import { fitResults, presentedFit } from '../logic/fitResults'
import { decodeFitInputs, fitHref, PRINT_PARAM } from '../state/urlState'
import { hashQuery } from '../state/useFitTool'
import { FitReport } from './FitReport'
import styles from './FitReportPage.module.css'

export function FitReportPage() {
  const { unitSystem } = useSettings()
  const query = hashQuery()
  const inputs = useMemo(() => decodeFitInputs(query), [query])
  const results = useMemo(() => fitResults(inputs, unitSystem), [inputs, unitSystem])
  const fit = presentedFit(inputs, results)
  const printRequested = new URLSearchParams(query).has(PRINT_PARAM)

  useDocumentTitle(fit.ok ? `Fit report Ø${inputs.nominalMm} ${fit.value.designation}` : 'Fit report')

  useEffect(() => {
    if (!printRequested) return
    let cancelled = false
    // Print once the fonts are in, and drop the request so a reload does not print again.
    void document.fonts.ready.then(() => {
      if (cancelled) return
      window.history.replaceState(null, '', fitHref(inputs, 'report'))
      window.print()
    })
    return () => {
      cancelled = true
    }
  }, [printRequested, inputs])

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <a className={styles.back} href={fitHref(inputs)}>
          ← Fit Tolerance
        </a>
        <span className={styles.hint}>A4 · choose “Save as PDF” in the print dialog</span>
        <Button variant="primary" size="md" icon="download" onClick={() => window.print()}>
          Print / Save PDF
        </Button>
      </div>
      <div className={styles.sheet} data-theme="light">
        {fit.ok ? (
          <FitReport fit={fit.value} inputs={inputs} results={results} system={unitSystem} />
        ) : (
          <p>There is no fit to report: {fit.error}</p>
        )}
      </div>
    </div>
  )
}

/** Sets the tab title (also the suggested PDF file name) while the report is open. */
function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}
