// DecisionsPanel: the project's design decisions, newest first, with the
// "+ Record decision" action. Shown as the right column of the timeline and,
// as a grid, on the Decisions tab.
import { useState } from 'react'
import type { Project } from '../../../core/projects'
import { cx, MonoLabel } from '../../ui'
import { useProjects } from '../useProjects'
import { DecisionCard } from './DecisionCard'
import styles from './DecisionsPanel.module.css'
import { RecordDecisionDialog } from './RecordDecisionDialog'

interface DecisionsPanelProps {
  project: Project
  layout: 'column' | 'grid'
}

export function DecisionsPanel({ project, layout }: DecisionsPanelProps) {
  const { actions } = useProjects()
  const [recording, setRecording] = useState(false)
  const decisions = [...project.decisions].reverse()
  return (
    <section className={cx(styles.panel, styles[layout])} aria-labelledby="decisions-heading">
      <div className={styles.head}>
        <MonoLabel as="h2" id="decisions-heading">
          Design decisions
        </MonoLabel>
        <button type="button" className={styles.record} onClick={() => setRecording(true)}>
          + Record decision
        </button>
      </div>
      <div className={styles.cards}>
        {decisions.map((decision) => (
          <DecisionCard
            key={decision.id}
            decision={decision}
            onApprove={() => actions.approveDecision(project, decision.id)}
          />
        ))}
        {decisions.length === 0 && <p className={styles.empty}>No decisions recorded yet.</p>}
      </div>
      {recording && <RecordDecisionDialog project={project} onClose={() => setRecording(false)} />}
    </section>
  )
}
