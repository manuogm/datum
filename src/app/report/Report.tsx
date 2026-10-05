// Building blocks of an A4 calculation report, shared by the tools: title
// block, verdict strip, numbered sections, a list of inputs, warnings, and
// the sign-off with the standards used. Tables and diagrams inside a section
// use the classes exported as reportStyles (see index.ts).
import type { ReactNode } from 'react'
import { countOf } from '../format/count'
import { localTimestamp } from '../format/timestamp'
import { cx, Logo } from '../ui'
import { CURRENT_USER } from '../user.fixtures'
import styles from './Report.module.css'

export type ReportStatus = 'pass' | 'review' | 'fail'

/** Today as YYYY-MM-DD, the date printed on the report. */
const today = () => localTimestamp().slice(0, 10)

export function Report({ children }: { children: ReactNode }) {
  return <article className={styles.report}>{children}</article>
}

interface ReportTitleBlockProps {
  title: string
  subtitle: ReactNode
  /** Rows after Date and Engineer, e.g. ['Units', 'SI (mm, kN, MPa)']. */
  meta: readonly (readonly [label: string, value: ReactNode])[]
}

export function ReportTitleBlock({ title, subtitle, meta }: ReportTitleBlockProps) {
  return (
    <header className={styles.titleBlock}>
      <div className={styles.titleText}>
        <Logo size="sm" />
        <h1 className={styles.title}>{title}</h1>
        <span className={styles.subtitle}>{subtitle}</span>
      </div>
      <dl className={styles.meta}>
        <dt>Date</dt>
        <dd className={styles.mono}>{today()}</dd>
        <dt>Engineer</dt>
        <dd>{CURRENT_USER.name}</dd>
        {meta.map(([label, value]) => [<dt key={`${label}-t`}>{label}</dt>, <dd key={`${label}-d`}>{value}</dd>])}
      </dl>
    </header>
  )
}

interface ReportSummaryProps {
  status: ReportStatus
  headline: string
  /** How many warnings §`warningsSection` lists. */
  warnings: number
  warningsSection: number
  /** Further cells: ReportSummaryCell or ReportFigure. */
  children: ReactNode
}

/** The verdict strip under the title: status first, then the headline numbers. */
export function ReportSummary({ status, headline, warnings, warningsSection, children }: ReportSummaryProps) {
  return (
    <section className={styles.summary} aria-label="Summary">
      <div className={styles[status]}>
        <span className={styles.summaryLabel}>STATUS</span>
        <span className={styles.status}>{headline}</span>
        <span className={styles.summaryNote}>
          {warnings === 0 ? 'No warnings' : `${countOf(warnings, 'warning')}, see §${warningsSection}`}
        </span>
      </div>
      {children}
    </section>
  )
}

/** A summary cell with a word or designation, e.g. FIT TYPE · Clearance. */
export function ReportSummaryCell({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.kind}>{value}</span>
      {note && <span className={styles.summaryNote}>{note}</span>}
    </div>
  )
}

/** A summary cell with a number, e.g. MIN CLEARANCE · 7 µm. */
export function ReportFigure({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.figure}>
        {value} <span className={styles.figureUnit}>{unit}</span>
      </span>
    </div>
  )
}

export function ReportSection({ heading, note, children }: { heading: string; note?: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>
        {heading} {note && <span className={styles.headingNote}>{note}</span>}
      </h2>
      {children}
    </section>
  )
}

export interface ReportFact {
  label: string
  value: ReactNode
  /** Numbers and designations in mono. */
  mono?: boolean
  /** Highlight a value a warning refers to. */
  warn?: boolean
}

/** Label / value list of the inputs. */
export function ReportFacts({ facts }: { facts: readonly ReportFact[] }) {
  return (
    <dl className={styles.inputs}>
      {facts.map((fact) => [
        <dt key={`${fact.label}-t`}>{fact.label}</dt>,
        <dd key={`${fact.label}-d`} className={fact.warn ? styles.warnValue : fact.mono ? styles.mono : undefined}>
          {fact.value}
        </dd>,
      ])}
    </dl>
  )
}

export function ReportWarnings({ heading, warnings }: { heading: string; warnings: readonly string[] }) {
  if (warnings.length === 0) return null
  return (
    <ReportSection heading={heading}>
      <ol className={styles.warnings}>
        {warnings.map((warning, i) => (
          <li key={warning}>
            <span className={styles.warningId}>W{i + 1}</span>
            <span>{warning}</span>
          </li>
        ))}
      </ol>
    </ReportSection>
  )
}

/** Signature lines and the footer with the standards, at the foot of the page. */
export function ReportSignOff({ standards }: { standards: string }) {
  const date = today()
  return (
    <>
      <div className={styles.signatures}>
        <div>
          <span className={styles.signatureLabel}>Prepared by</span>
          <span className={styles.signatureLine}>
            {CURRENT_USER.name} · {date}
          </span>
        </div>
        <div>
          <span className={styles.signatureLabel}>Checked by</span>
          <span className={cx(styles.signatureLine, styles.blank)}>Name · date</span>
        </div>
      </div>
      <footer className={styles.footer}>
        <span>Generated by Datum · {standards}</span>
        <span>{date}</span>
      </footer>
    </>
  )
}
