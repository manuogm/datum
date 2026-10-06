// The pattern's joint types as cards (symbol, name, what it screws into, how
// many bolts use it); the one chosen is edited beside the list.
import { Button, cx, PanelSection } from '../../../../app/ui'
import { needsOuterThread } from '../logic/designEdits'
import { jointDetail, jointSymbolKind, jointTitle } from '../logic/labels'
import { JointSymbolIcon } from '../shared/JointSymbol'
import type { PatternSpec } from '../state/boltInputs'
import styles from './pattern.module.css'

interface JointTypeListProps {
  pattern: PatternSpec
  /** The joint type being edited. */
  editing: string
  onEdit: (id: string) => void
  onAdd: () => void
}

export function JointTypeList({ pattern, editing, onEdit, onAdd }: JointTypeListProps) {
  const count = (id: string) => pattern.bolts.filter((b) => b.jointTypeId === id).length
  return (
    <PanelSection label="Joint types" aside={`${pattern.bolts.length} bolts`}>
      <div className={styles.types}>
        {pattern.jointTypes.map(({ id, design }) => (
          <button
            key={id}
            type="button"
            className={cx(styles.type, editing === id && styles.typeSelected)}
            aria-pressed={editing === id}
            onClick={() => onEdit(id)}
          >
            <JointSymbolIcon kind={jointSymbolKind(design)} />
            <span>
              <span className={styles.typeTitle}>
                <span className={styles.typeId}>{id}</span>
                {jointTitle(design)}
              </span>
              <br />
              {needsOuterThread(design) ? (
                <span className={styles.typeWarn}>Enter the insert&apos;s outer thread</span>
              ) : (
                <span className={styles.typeDetail}>{jointDetail(design)}</span>
              )}
            </span>
            <span className={styles.count}>×{count(id)}</span>
          </button>
        ))}
      </div>
      <div>
        <Button variant="link" size="sm" onClick={onAdd}>
          + Add joint type
        </Button>
      </div>
    </PanelSection>
  )
}
