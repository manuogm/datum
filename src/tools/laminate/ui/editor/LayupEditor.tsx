// The laminate's layup: its stacking notation, the ply list it expands to,
// and what the stack is (symmetric, balanced, its thickness and areal mass).
import { countOf } from '../../../../app/format/count'
import { Badge, Button, PanelSection, type Status } from '../../../../app/ui'
import { formatQuantity, type UnitSystem } from '../../../../core/units'
import type { LayupSummary } from '../../calc'
import type { PlySpec } from '../state/lamInputs'
import type { LamAction } from '../state/lamReducer'
import styles from './editor.module.css'
import { NotationField } from './NotationField'
import { PlyList } from './PlyList'

interface LayupEditorProps {
  plies: readonly PlySpec[]
  /** From the analysis, when it ran. */
  layup: LayupSummary | null
  tones: readonly Status[]
  criticalPlies: readonly number[]
  selectedPly: number | null
  onSelectPly: (index: number) => void
  system: UnitSystem
  dispatch: (action: LamAction) => void
}

export function LayupEditor({ plies, layup, tones, criticalPlies, selectedPly, onSelectPly, system, dispatch }: LayupEditorProps) {
  return (
    <PanelSection label="Ply stack · top to bottom" aside={countOf(plies.length, 'ply', 'plies')}>
      <NotationField anglesDeg={plies.map((p) => p.angleDeg)} onChange={(anglesDeg) => dispatch({ type: 'layup', anglesDeg })} />
      <div className={styles.plyHead} aria-hidden="true">
        <span />
        <span>#</span>
        <span>Material</span>
        <span>θ</span>
        <span />
      </div>
      <PlyList
        plies={plies}
        tones={tones}
        criticalPlies={criticalPlies}
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
      {layup && (
        <div className={styles.summary}>
          <Badge tone={layup.symmetric ? 'ok' : 'warn'}>{layup.symmetric ? '✓ Symmetric' : 'Not symmetric'}</Badge>
          <Badge tone={layup.balanced ? 'ok' : 'warn'}>{layup.balanced ? '✓ Balanced' : 'Not balanced'}</Badge>
          <span className={styles.summaryText}>
            h = {formatQuantity('length', system, layup.thicknessMm, { withUnit: true })} · {formatQuantity('arealMass', system, layup.arealMassKgPerM2, { withUnit: true })}
          </span>
        </div>
      )}
    </PanelSection>
  )
}
