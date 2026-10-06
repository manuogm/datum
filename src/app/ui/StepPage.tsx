// StepPage: one step of a guided tool. A mono eyebrow (STEP 02 / 04), the
// step's title and a one-line hint, the step's few inputs, and Back / Next
// at the foot. An optional side visual (the chart that helps this step, e.g.
// the ply stack while entering the layup) sits in a flush column on the
// right, and under the inputs on narrow screens.
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button'
import { cx } from './cx'
import { MonoLabel } from './MonoLabel'
import styles from './StepPage.module.css'

interface StepPageProps {
  title: string
  /** One line under the title: what this step asks for. */
  hint?: ReactNode
  /** The step's inputs (or, on the results step, the results). */
  children: ReactNode
  /** Small actions right of the title, e.g. a Reset link. */
  actions?: ReactNode
  /** Chart or drawing that helps this step. */
  aside?: ReactNode
  /** Mono label above the side visual, e.g. "Ply stack". */
  asideLabel?: string
  /** Note under the side visual's label, e.g. "[0/±45/90]s · to scale". */
  asideMeta?: ReactNode
  /** 1-based position, for the eyebrow. */
  stepNumber?: number
  stepCount?: number
  /** Omitted on the first step: no Back button. */
  onBack?: () => void
  /** Omitted on the last step: no Next button. */
  onNext?: () => void
  /** e.g. "See results". */
  nextLabel?: string
  backLabel?: string
  nextDisabled?: boolean
  /** Why Next is disabled, or a note beside it ("2 inputs need attention"). */
  nextNote?: ReactNode
  /** More footer actions, between Back and Next (e.g. "Report"). */
  footer?: ReactNode
  /** Move focus to the title when the step appears (after the user changed step). */
  focusTitle?: boolean
  /** Let the body take the full width (results step without a side visual). */
  wide?: boolean
  className?: string
}

const pad = (n: number) => String(n).padStart(2, '0')

export function StepPage({
  title,
  hint,
  children,
  actions,
  aside,
  asideLabel,
  asideMeta,
  stepNumber,
  stepCount,
  onBack,
  onNext,
  nextLabel = 'Next',
  backLabel = 'Back',
  nextDisabled = false,
  nextNote,
  footer,
  focusTitle = false,
  wide = false,
  className,
}: StepPageProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const titleId = useId()
  const noteId = useId()
  const asideId = useId()

  useEffect(() => {
    if (focusTitle) titleRef.current?.focus({ preventScroll: false })
    // Only when the step (its title) changes.
  }, [focusTitle, title])

  const hasFooter = onBack || onNext || footer
  return (
    <section className={cx(styles.page, aside != null && styles.withAside, wide && styles.wide, className)} aria-labelledby={titleId}>
      <header className={styles.head}>
        <div className={styles.titles}>
          {stepNumber !== undefined && stepCount !== undefined && (
            <MonoLabel tone="faint">
              Step {pad(stepNumber)} / {pad(stepCount)}
            </MonoLabel>
          )}
          <h2 className={styles.title} id={titleId} ref={titleRef} tabIndex={-1}>
            {title}
          </h2>
          {hint && <p className={styles.hint}>{hint}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>

      <div className={styles.body}>{children}</div>

      {aside != null && (
        <aside className={styles.aside} aria-labelledby={asideLabel ? asideId : undefined}>
          {(asideLabel || asideMeta) && (
            <div className={styles.asideHead}>
              {asideLabel && (
                <MonoLabel as="h3" id={asideId}>
                  {asideLabel}
                </MonoLabel>
              )}
              {asideMeta && <span className={styles.asideMeta}>{asideMeta}</span>}
            </div>
          )}
          <div className={styles.visual}>{aside}</div>
        </aside>
      )}

      {hasFooter && (
        <footer className={styles.foot}>
          {onBack ? (
            <Button variant="secondary" onClick={onBack}>
              <span aria-hidden="true">←</span> {backLabel}
            </Button>
          ) : (
            <span />
          )}
          <div className={styles.footEnd}>
            {nextNote && (
              <span className={styles.nextNote} id={noteId}>
                {nextNote}
              </span>
            )}
            {footer}
            {onNext && (
              <Button variant="primary" onClick={onNext} disabled={nextDisabled} aria-describedby={nextNote ? noteId : undefined}>
                {nextLabel} <span aria-hidden="true">→</span>
              </Button>
            )}
          </div>
        </footer>
      )}
    </section>
  )
}
