// VerdictCard: depth 1 of a tool's results. The status (PASS / REVIEW /
// FAIL) with one sentence saying why, one big number (the governing value)
// set against its target, and the 2–4 key figures the engineer puts on the
// drawing. Optional actions under it (a mode action such as "Optimise
// layup", or "Apply to calculator").
import { useId, type ReactNode } from 'react'
import { Badge } from './Badge'
import { cx } from './cx'
import { MonoLabel } from './MonoLabel'
import { StatusIcon, type Status } from './StatusIcon'
import styles from './VerdictCard.module.css'

/** A calculation's verdict, as the library summary stores it. */
export type Verdict = 'pass' | 'review' | 'fail'

const STATUS: Record<Verdict, Status> = { pass: 'ok', review: 'warn', fail: 'bad' }
const WORD: Record<Verdict, string> = { pass: 'Pass', review: 'Review', fail: 'Fail' }

export interface VerdictFigure {
  /** Mono uppercase label, e.g. "Preload". */
  label: string
  /** Case-sensitive symbol after the label, kept as typed, e.g. "FM,min", "Ex". */
  symbol?: string
  value: ReactNode
  unit?: string
}

interface VerdictCardProps {
  status: Verdict
  /** One sentence: what governs and why, e.g. "Slips under the transverse load: R12 governs." */
  sentence: ReactNode
  /** The governing value, e.g. { label: 'RF min', value: '1.27', target: '≥ 1.50' }. */
  headline: VerdictFigure & {
    /** The target or limit it is judged against, e.g. "≥ 1.50", "0 … 40 µm". */
    target?: ReactNode
  }
  /** 2–4 key figures under the big number. */
  figures?: readonly VerdictFigure[]
  /** Standard the verdict follows, e.g. "VDI 2230-1:2015". */
  reference?: string
  /** Under the figures: mode actions, "Apply", "Report". */
  actions?: ReactNode
  /** Small text under the sentence, e.g. "4 of 7 checks pass". */
  detail?: ReactNode
  className?: string
}

export function VerdictCard({ status, sentence, headline, figures = [], reference, actions, detail, className }: VerdictCardProps) {
  const sentenceId = useId()
  return (
    <section className={cx(styles.card, styles[status], className)} aria-labelledby={sentenceId}>
      <div className={styles.band}>
        <StatusIcon status={STATUS[status]} size="lg" />
        <div className={styles.verdictText}>
          <span className={styles.word}>{WORD[status]}</span>
          <p className={styles.sentence} id={sentenceId}>
            {sentence}
          </p>
          {detail && <span className={styles.detail}>{detail}</span>}
        </div>
        {reference && (
          <Badge variant="reference" size="md" className={styles.reference}>
            {reference}
          </Badge>
        )}
      </div>

      <div className={styles.headline}>
        <FigureLabel figure={headline} />
        <div className={styles.bigLine}>
          <span className={styles.big}>
            {headline.value}
            {headline.unit && <span className={styles.bigUnit}>{headline.unit}</span>}
          </span>
          {headline.target != null && (
            <span className={styles.target}>
              <span className={styles.targetLabel}>target</span> {headline.target}
            </span>
          )}
        </div>
      </div>

      {figures.length > 0 && (
        <dl className={cx(styles.figures, styles[`n${Math.min(figures.length, 4)}`])}>
          {figures.map((figure) => (
            <div key={`${figure.label} ${figure.symbol ?? ''}`} className={styles.figure}>
              <dt>
                <FigureLabel figure={figure} />
              </dt>
              <dd className={styles.figureValue}>
                {figure.value}
                {figure.unit && <span className={styles.figureUnit}>{figure.unit}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {actions && <div className={styles.actions}>{actions}</div>}
    </section>
  )
}

function FigureLabel({ figure }: { figure: VerdictFigure }) {
  return (
    <span className={styles.figureLabel}>
      <MonoLabel>{figure.label}</MonoLabel>
      {figure.symbol && <span className={styles.symbol}>{figure.symbol}</span>}
    </span>
  )
}
