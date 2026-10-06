// The plies one by one, top ply first: the column heads, the ply rows
// (material, angle, reorder, remove) and "+ Add ply" under them. The layup
// step keeps it under More options; the notation covers most layups.
import { Button } from '../../../../app/ui'
import type { PlySpec } from '../state/lamInputs'
import type { LamAction } from '../state/lamReducer'
import styles from './editor.module.css'
import { PlyList } from './PlyList'

interface PlyEditorProps {
  plies: readonly PlySpec[]
  selectedPly: number | null
  onSelectPly: (index: number) => void
  dispatch: (action: LamAction) => void
}

export function PlyEditor({ plies, selectedPly, onSelectPly, dispatch }: PlyEditorProps) {
  return (
    <div className={styles.plyEditor}>
      <div className={styles.plyHead} aria-hidden="true">
        <span />
        <span>#</span>
        <span>Material</span>
        <span>θ</span>
        <span />
      </div>
      <PlyList
        plies={plies}
        selectedPly={selectedPly}
        onSelect={onSelectPly}
        onChange={(index, changes) => dispatch({ type: 'ply', index, changes })}
        onMove={(from, to) => dispatch({ type: 'movePly', from, to })}
        onRemove={(index) => dispatch({ type: 'removePly', index })}
      />
      <div>
        <Button variant="link" size="sm" onClick={() => dispatch({ type: 'addPly' })}>
          + Add ply
        </Button>
      </div>
    </div>
  )
}
