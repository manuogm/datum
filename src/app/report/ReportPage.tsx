// The frame of a printable A4 calculation report: a toolbar (back to the
// tool, print) above a sheet in the light print colours. Opened with a print
// request, it asks the browser to print once the fonts are in, where "Save as
// PDF" makes the file. No PDF library is involved.
import { useEffect, type ReactNode } from 'react'
import { Button } from '../ui'
import styles from './ReportPage.module.css'

interface ReportPageProps {
  /** Tab title, also the file name the browser suggests for the PDF. */
  title: string
  backHref: string
  /** e.g. "Fit Tolerance" */
  backLabel: string
  /**
   * The URL asked for printing; after printing the page moves to `href`, the
   * same report without the request, so a reload does not print again.
   */
  print: { requested: boolean; href: string }
  children: ReactNode
}

export function ReportPage({ title, backHref, backLabel, print, children }: ReportPageProps) {
  useDocumentTitle(title)
  const { requested, href } = print

  useEffect(() => {
    if (!requested) return
    let cancelled = false
    void document.fonts.ready.then(() => {
      if (cancelled) return
      window.history.replaceState(null, '', href)
      window.print()
    })
    return () => {
      cancelled = true
    }
  }, [requested, href])

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <a className={styles.back} href={backHref}>
          ← {backLabel}
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
