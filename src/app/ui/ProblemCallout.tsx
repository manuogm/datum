// ProblemCallout: the Results step of a guided tool when the engine cannot
// analyse the inputs. It stands in for the verdict: what cannot be analysed,
// the engine's explanation, and a link back to the step to fix it in
// ("← Back to Joint"). On an input step the same message goes in StepPage's
// `problem`, above the inputs.
import type { ReactNode } from 'react'
import { Button } from './Button'
import { Callout } from './Callout'
import styles from './ProblemCallout.module.css'

interface ProblemCalloutProps {
  /** What cannot be analysed, e.g. "This joint cannot be analysed". */
  title: string
  /** The engine's explanation. */
  children: ReactNode
  /** The step to fix it in: its label and how to go there (flow.goTo). */
  back?: { label: string; onClick: () => void }
}

export function ProblemCallout({ title, children, back }: ProblemCalloutProps) {
  return (
    <div className={styles.problem}>
      <Callout status="bad" title={title}>
        {children}
      </Callout>
      {back && (
        <div>
          <Button variant="link" size="sm" onClick={back.onClick}>
            <span aria-hidden="true">←</span> Back to {back.label}
          </Button>
        </div>
      )}
    </div>
  )
}
