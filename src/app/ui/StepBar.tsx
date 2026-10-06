// StepBar: the numbered steps of a guided tool (01 GEOMETRY · 02 MATERIALS ·
// 03 LOADS · 04 RESULTS). The step on screen carries the accent underline,
// steps already reached turn green and can be clicked to go back (or
// forward again), steps not reached yet are quiet and inert. A step with an
// input problem turns red with a "!" flag on its number.
// Below 640px only the current step keeps its label; the others show their
// number, so four or five steps fit a 390px phone.
// A step's accessible name stays short ("Joint, step 2 of 4, done"); the
// engine's explanation of an input problem is its description.
import { useId } from 'react'
import type { StepDef } from './stepFlow'
import styles from './StepBar.module.css'
import { cx } from './cx'

interface StepBarProps {
  steps: readonly StepDef[]
  /** Index of the step on screen. */
  current: number
  /** Index of the furthest step reached: steps up to it are clickable. */
  reached: number
  onSelect: (index: number) => void
  /** Accessible name of the bar. */
  label?: string
  className?: string
}

const pad = (n: number) => String(n).padStart(2, '0')

export function StepBar({ steps, current, reached, onSelect, label = 'Steps', className }: StepBarProps) {
  const problemId = useId()
  return (
    <nav className={cx(styles.bar, className)} aria-label={label}>
      <ol className={styles.list}>
        {steps.map((step, i) => {
          const isCurrent = i === current
          const isDone = !isCurrent && i <= reached
          const state = isCurrent ? 'current' : isDone ? 'done' : 'upcoming'
          const invalid = Boolean(step.invalid)
          const problem = typeof step.invalid === 'string' ? step.invalid : undefined
          return (
            <li key={step.id} className={cx(styles.item, styles[state], invalid && styles.invalid)}>
              <button
                type="button"
                className={styles.step}
                aria-current={isCurrent ? 'step' : undefined}
                disabled={state === 'upcoming'}
                title={invalid ? `${step.label}: ${problem ?? 'needs attention'}` : undefined}
                aria-describedby={problem ? `${problemId}-${i}` : undefined}
                onClick={() => !isCurrent && onSelect(i)}
              >
                <span className={styles.number} aria-hidden="true">
                  {pad(i + 1)}
                </span>
                <span className={styles.label}>{step.label}</span>
                <span className={styles.hidden}>
                  {`, step ${i + 1} of ${steps.length}`}
                  {isDone && ', done'}
                  {state === 'upcoming' && ', not reached yet'}
                  {invalid && ', needs attention'}
                </span>
              </button>
              {problem && (
                <span id={`${problemId}-${i}`} className={styles.hidden}>
                  {problem}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
