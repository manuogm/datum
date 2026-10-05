// Advisor mode, right column, top: the best match (or the compared fit) with
// its fit type and the advisor's checks, and the actions on it.
import type { ReactNode } from 'react'
import { Badge, Button, CheckRow, PanelSection, Readout } from '../../../../app/ui'
import type { FitCandidate } from '../../advisor'
import { CHECK_ICON, FIT_TYPE_LABEL } from '../shared/labels'
import styles from './advisor.module.css'

interface CandidateSummaryProps {
  candidate: FitCandidate
  title: string
  size: 'sm' | 'lg'
  /** Actions under the checks. */
  children?: ReactNode
}

/** Designation, fit type at 20 °C and the advisor's checks for one candidate. */
export function CandidateSummary({ candidate, title, size, children }: CandidateSummaryProps) {
  return (
    <PanelSection label={`${title} · score ${candidate.score}`}>
      <div className={styles.designation}>
        <Readout value={candidate.fit.designation} font="sans" size={size} />
        <Badge variant="outlined" tone="hole">
          {FIT_TYPE_LABEL[candidate.fit.fitType]}
        </Badge>
      </div>
      <div className={styles.checks}>
        {candidate.checks.map((check) => (
          <CheckRow key={check.id} status={CHECK_ICON[check.status]} label={check.message} />
        ))}
      </div>
      {children}
    </PanelSection>
  )
}

interface RecommendationActionsProps {
  comparing: boolean
  onApply: () => void
  onToggleCompare: () => void
}

export function RecommendationActions({ comparing, onApply, onToggleCompare }: RecommendationActionsProps) {
  return (
    <div className={styles.actions}>
      <Button variant="primary" block onClick={onApply}>
        Apply to calculator
      </Button>
      <Button aria-pressed={comparing} onClick={onToggleCompare}>
        {comparing ? 'Stop comparing' : 'Compare'}
      </Button>
    </div>
  )
}
