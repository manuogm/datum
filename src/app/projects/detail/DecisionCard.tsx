// DecisionCard: one design decision with its status, reasoning, the
// revision it rests on and who approved it (or an Approve button).
import type { Decision } from '../../../core/projects'
import { formatActivityTime } from '../../format/formatActivityTime'
import { Badge, Button } from '../../ui'
import styles from './DecisionCard.module.css'

interface DecisionCardProps {
  decision: Decision
  onApprove: () => void
}

export function DecisionCard({ decision, onApprove }: DecisionCardProps) {
  const approved = decision.status === 'approved'
  return (
    <article className={styles.card} aria-labelledby={`${decision.id}-title`}>
      <div className={styles.head}>
        <span className={styles.id}>{decision.id}</span>
        <Badge tone={approved ? 'ok' : 'warn'}>{decision.status}</Badge>
      </div>
      <h3 id={`${decision.id}-title`} className={styles.title}>
        {decision.title}
      </h3>
      {decision.rationale && <p className={styles.rationale}>{decision.rationale}</p>}
      <div className={styles.foot}>
        <span className={styles.basis}>
          {decision.basis ? `${decision.basis.calculationId} ${decision.basis.rev}` : 'No calculation linked'}
        </span>
        {approved && decision.approvedBy && decision.approvedAt ? (
          <span>
            {decision.approvedBy.name} · {formatActivityTime(new Date(decision.approvedAt))}
          </span>
        ) : (
          <>
            <span>{decision.proposedBy.name}</span>
            <Button variant="link" size="sm" onClick={onApprove}>
              Approve
            </Button>
          </>
        )}
      </div>
    </article>
  )
}
