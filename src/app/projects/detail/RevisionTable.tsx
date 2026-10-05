// RevisionTable: a compact list of revisions (the current revision of each
// calculation, or the revisions saved with a PDF report), each with a link
// to reopen it in its tool.
import { TOOLS, type RevisionInContext } from '../../../core/projects'
import { formatActivityTime } from '../../format/formatActivityTime'
import { Badge } from '../../ui'
import { reopenRevisionHref } from '../reopenLink'
import { revisionBadge } from '../revisionStatus'
import styles from './RevisionTable.module.css'

interface RevisionTableProps {
  label: string
  rows: readonly RevisionInContext[]
  empty: string
}

export function RevisionTable({ label, rows, empty }: RevisionTableProps) {
  if (rows.length === 0) return <p className={styles.empty}>{empty}</p>
  return (
    <table className={styles.table} aria-label={label}>
      <thead>
        <tr>
          <th>Calculation</th>
          <th>Part</th>
          <th>Result</th>
          <th>Saved</th>
          <th>Status</th>
          <th>
            <span className={styles.hidden}>Open</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ project, calculation, part, revision }) => {
          const badge = revisionBadge(calculation, revision)
          return (
            <tr key={revision.id}>
              <td className={styles.mono}>
                {calculation.id} <Badge variant="reference">REV {revision.rev}</Badge>
                <div className={styles.tool}>{TOOLS[calculation.tool].name}</div>
              </td>
              <td>{part.name}</td>
              <td className={styles.mono}>{revision.snapshot.title}</td>
              <td className={styles.muted}>
                {formatActivityTime(new Date(revision.savedAt))} · {revision.author.initials}
              </td>
              <td>
                <Badge tone={badge.tone}>{badge.label}</Badge>
              </td>
              <td className={styles.open}>
                <a href={reopenRevisionHref(project.id, revision)}>Open →</a>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
