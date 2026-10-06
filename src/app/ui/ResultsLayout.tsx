// ResultsLayout: the results step of a guided tool, in three depths the
// engineer opens on purpose:
//   1. the verdict (a VerdictCard), always shown;
//   2. "Show details": the per-check list and the main chart;
//   3. "Show calculation": formulas, intermediate values, matrices, sources.
// Depths 2 and 3 start collapsed; with a memoryKey (the tool, e.g. 'bolt')
// each stays open or closed while the page is open.
import { useId, type ReactNode } from 'react'
import { cx } from './cx'
import { Icon } from './Icon'
import styles from './ResultsLayout.module.css'
import { useSessionState } from './sessionMemory'

interface ResultsLayoutProps {
  /** Depth 1: a VerdictCard (or a Callout when the inputs cannot be analysed). */
  verdict: ReactNode
  /** Depth 2. Omit to hide the section. */
  details?: ReactNode
  /** What depth 2 holds, shown beside its toggle, e.g. "7 checks · joint diagram". */
  detailsSummary?: ReactNode
  /** Depth 3. Omit to hide the section. */
  calculation?: ReactNode
  /** e.g. "R0 … R13 · VDI 2230-1". */
  calculationSummary?: ReactNode
  /** Remembers which depths are open, per tool: 'fit', 'bolt', 'lam'. */
  memoryKey?: string
  className?: string
}

export function ResultsLayout({ verdict, details, detailsSummary, calculation, calculationSummary, memoryKey, className }: ResultsLayoutProps) {
  const key = (depth: string) => (memoryKey === undefined ? undefined : `results:${memoryKey}:${depth}`)
  return (
    <div className={cx(styles.layout, className)}>
      <div className={styles.verdict}>{verdict}</div>
      {details != null && (
        <ResultsDepth label="details" summary={detailsSummary} memoryKey={key('details')}>
          {details}
        </ResultsDepth>
      )}
      {calculation != null && (
        <ResultsDepth label="calculation" summary={calculationSummary} memoryKey={key('calculation')}>
          {calculation}
        </ResultsDepth>
      )}
    </div>
  )
}

interface ResultsDepthProps {
  /** What it shows: the toggle reads "Show <label>" / "Hide <label>". */
  label: string
  summary?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  memoryKey?: string
}

/** One collapsible depth of the results: a full-width toggle over its content. */
export function ResultsDepth({ label, summary, children, defaultOpen = false, memoryKey }: ResultsDepthProps) {
  const [open, setOpen] = useSessionState(memoryKey, defaultOpen)
  const panelId = useId()
  const toggleId = useId()
  return (
    <section className={cx(styles.depth, open && styles.open)} aria-labelledby={toggleId}>
      <h3 className={styles.heading}>
        <button
          type="button"
          id={toggleId}
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
        >
          <span className={styles.label}>
            {open ? 'Hide' : 'Show'} {label}
          </span>
          {summary && <span className={styles.summary}>{summary}</span>}
          <Icon name="chevron-down" className={styles.chevron} />
        </button>
      </h3>
      <div className={styles.panel} id={panelId} hidden={!open}>
        {children}
      </div>
    </section>
  )
}
