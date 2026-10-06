// An input the engine cannot analyse, said where the engineer sees it: at the
// top of the step at fault, and on Results with a way back to that step.
import { Button, Callout } from '../../../../app/ui'
import styles from './steps.module.css'

interface ProblemNoteProps {
  title: string
  /** The engine's explanation. */
  error: string
  /** On Results: the step to fix it in, and how to get there. */
  fix?: { label: string; onClick: () => void }
}

export function ProblemNote({ title, error, fix }: ProblemNoteProps) {
  // On Results the note is the verdict, which has its own padding.
  return (
    <div className={fix ? styles.problemVerdict : styles.problem}>
      <Callout status="bad" title={title}>
        {error}
      </Callout>
      {fix && (
        <div>
          <Button variant="link" size="sm" onClick={fix.onClick}>
            <span aria-hidden="true">←</span> Back to {fix.label}
          </Button>
        </div>
      )}
    </div>
  )
}
