// FigureChangesTable: in the save dialog, the headline figures that change
// with this revision ("CHANGES SINCE REV B"), or all of them for a first
// revision.
import { figureChanges, figureText, type Revision, type ToolSnapshot } from '../../core/projects'
import { EmptyState, MonoLabel } from '../ui'
import styles from './FigureChangesTable.module.css'

interface FigureChangesTableProps {
  /** The current revision of the calculation, if there is one. */
  before?: Revision
  after: ToolSnapshot
}

export function FigureChangesTable({ before, after }: FigureChangesTableProps) {
  const rows = before
    ? figureChanges(before.snapshot.figures, after.figures)
    : after.figures.map((figure) => ({ label: figure.label, before: undefined, after: figureText(figure) }))
  const heading = before ? `Changes since Rev ${before.rev}` : 'Results'
  return (
    <div className={styles.changes}>
      <MonoLabel>{heading}</MonoLabel>
      {rows.length === 0 ? (
        <EmptyState inset="none">No headline figure changed.</EmptyState>
      ) : (
        <table className={styles.table} aria-label={heading}>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {before && <td className={styles.before}>{row.before && <del>{row.before}</del>}</td>}
                <td>{row.after ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
