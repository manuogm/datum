// TimelineEntry: one saved revision in the project history: when, which tool
// and calculation, verdict, the note, what changed since the previous
// revision, the decisions it supports and a link to reopen it.
import {
  decisionsBasedOn,
  figureChanges,
  figureText,
  previousRevision,
  TOOLS,
  type RevisionInContext,
} from '../../../core/projects'
import { formatDayAndTime } from '../../format/timestamp'
import { Badge, Card, cx } from '../../ui'
import { reopenRevisionHref } from '../reopenLink'
import { revisionBadge } from '../revisionStatus'
import styles from './TimelineEntry.module.css'

interface TimelineEntryProps {
  entry: RevisionInContext
  /** The newest entry is drawn with the accent node. */
  latest: boolean
}

export function TimelineEntry({ entry, latest }: TimelineEntryProps) {
  const { project, calculation, part, revision } = entry
  const { day, time } = formatDayAndTime(revision.savedAt)
  const badge = revisionBadge(calculation, revision)
  const previous = previousRevision(calculation, revision)
  const changes = previous ? figureChanges(previous.snapshot.figures, revision.snapshot.figures) : null
  const decisions = decisionsBasedOn(project, calculation, revision)
  const tool = TOOLS[calculation.tool]
  return (
    <li className={cx(styles.entry, latest && styles.latest)}>
      <div className={styles.when}>
        <span>{day}</span>
        <span className={styles.time}>{time}</span>
      </div>
      <div className={styles.rail} aria-hidden="true">
        <span className={styles.node}>{tool.code}</span>
      </div>
      <div className={styles.slot}>
        <Card as="article" variant={badge.label === 'superseded' ? 'plain' : 'raised'} padding="sm" highlight={latest}>
          <div className={styles.meta}>
            <span>{tool.name}</span>
            <span className={styles.dot}>·</span>
            <span>{calculation.id}</span>
            <Badge variant="reference">REV {revision.rev}</Badge>
            <Badge tone={badge.tone} className={styles.status}>
              {badge.label}
            </Badge>
          </div>
          <h3 className={styles.title}>
            {part.name}
            <span className={styles.result}>{revision.snapshot.title}</span>
          </h3>
          {revision.note && (
            <p className={styles.note}>
              “{revision.note}” — {revision.author.name}
            </p>
          )}
          <ul className={styles.figures} aria-label={changes ? `Changes since Rev ${previous?.rev}` : 'Results'}>
            {changes
              ? changes.map((change) => (
                  <li key={change.label} className={styles.figure}>
                    <span className={styles.label}>{change.label}</span>{' '}
                    {change.before && <del className={styles.before}>{change.before}</del>}
                    {change.before && change.after && ' → '}
                    {change.after && <ins className={styles.after}>{change.after}</ins>}
                  </li>
                ))
              : revision.snapshot.figures.map((figure) => (
                  <li key={figure.label} className={styles.figure}>
                    <span className={styles.label}>{figure.label}</span> {figureText(figure)}
                  </li>
                ))}
          </ul>
          <div className={styles.links}>
            {decisions.map((d) => (
              <span key={d.id} className={styles.decision}>
                ◆ Linked to {d.id}
              </span>
            ))}
            <a className={styles.reopen} href={reopenRevisionHref(project.id, revision)}>
              Open in {tool.name} →
            </a>
          </div>
        </Card>
      </div>
    </li>
  )
}
