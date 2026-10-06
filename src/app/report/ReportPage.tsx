// The frame of a printable A4 calculation report: a toolbar (back to the
// calculation, print) above a sheet in the light print colours. "Print / Save
// PDF" opens the browser's print dialog, where "Save as PDF" makes the file.
// No PDF library is involved.
import { useEffect, type ReactNode } from 'react'
import type { Calculation } from '../../core/library'
import { calcHref } from '../router/routes'
import { Button } from '../ui'
import styles from './ReportPage.module.css'

interface ReportPageProps {
  calculation: Calculation
  children: ReactNode
}

export function ReportPage({ calculation, children }: ReportPageProps) {
  // The tab title is also the file name the browser suggests for the PDF.
  useDocumentTitle(`${calculation.name} report`)
  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <a className={styles.back} href={calcHref(calculation.id)}>
          ← {calculation.name}
        </a>
        <span className={styles.hint}>A4 · choose “Save as PDF” in the print dialog</span>
        <Button variant="primary" size="md" icon="download" onClick={() => window.print()}>
          Print / Save PDF
        </Button>
      </div>
      <div className={styles.sheet} data-theme="light">
        {children}
      </div>
    </div>
  )
}

function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}

