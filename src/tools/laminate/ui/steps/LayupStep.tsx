// Step 1 · Layup: the stacking sequence in notation ([0/±45/90]s) and the ply
// material, with what the stack comes to (symmetric, balanced, thickness and
// areal mass). Editing plies one by one (a hybrid stack, an odd angle) is
// under More options. The exploded ply stack beside it follows every edit,
// in neutral tones: the plies are judged on the results.
import { countOf } from '../../../../app/format/count'
import { Badge, Button, MoreOptions, PanelSection, Select, StepPage } from '../../../../app/ui'
import { formatQuantity } from '../../../../core/units'
import { PLY_MATERIALS } from '../../calc'
import { NotationField } from '../editor/NotationField'
import { PlyEditor } from '../editor/PlyEditor'
import { mixedPlies, stepProblem } from '../logic/steps'
import { StackPlot } from '../plots/StackPlot'
import { DEFAULT_LAMINATE_INPUTS } from '../state/lamInputs'
import type { LamStepProps } from './stepProps'
import styles from './steps.module.css'

const MATERIALS = PLY_MATERIALS.map((m) => ({ value: m.id, label: m.name }))

export function LayupStep({ inputs, analysis, dispatch, system, flow, fault, selectedPly, onSelectPly }: LamStepProps) {
  const { plies } = inputs
  const anglesDeg = plies.map((p) => p.angleDeg)
  const layup = analysis.ok ? analysis.value.layup : null
  const mixed = mixedPlies(plies)
  return (
    <StepPage
      {...flow.page}
      problem={stepProblem(fault, 'layup')}
      title="Layup"
      hint="The plies from the top down, in stacking notation, and the material they are made of. Editing plies one by one is under More options."
      actions={
        <Button variant="link" size="sm" onClick={() => dispatch({ type: 'change', changes: DEFAULT_LAMINATE_INPUTS })}>
          Reset
        </Button>
      }
      aside={
        <div className={styles.stack}>
          <StackPlot anglesDeg={anglesDeg} tones={[]} criticalPlies={[]} selectedPly={selectedPly} onSelect={onSelectPly} />
        </div>
      }
      asideLabel="Ply stack"
      asideMeta={`${layup?.notation ?? ''} · ${countOf(plies.length, 'ply', 'plies')}`}
    >
      <PanelSection label="Stacking sequence">
        <NotationField anglesDeg={anglesDeg} onChange={(next) => dispatch({ type: 'layup', anglesDeg: next })} />
        {layup && (
          <div className={styles.layupSummary}>
            <Badge tone={layup.symmetric ? 'ok' : 'warn'}>{layup.symmetric ? '✓ Symmetric' : 'Not symmetric'}</Badge>
            <Badge tone={layup.balanced ? 'ok' : 'warn'}>{layup.balanced ? '✓ Balanced' : 'Not balanced'}</Badge>
            <span className={styles.summaryText}>
              h = {formatQuantity('length', system, layup.thicknessMm, { withUnit: true })} ·{' '}
              {formatQuantity('arealMass', system, layup.arealMassKgPerM2, { withUnit: true })}
            </span>
          </div>
        )}
      </PanelSection>

      <PanelSection label="Ply material">
        <Select
          size="md"
          aria-label="Ply material, every ply"
          options={MATERIALS}
          value={plies[0].materialId}
          onChange={(materialId) => dispatch({ type: 'layup', anglesDeg, materialId })}
        />
        {mixed > 0 && <span className={styles.note}>The plies are of mixed materials: choosing one here sets every ply to it.</span>}
      </PanelSection>

      <MoreOptions count={plies.length} changed={mixed} memoryKey="lam:plies">
        <PanelSection label="Plies · top to bottom">
          <PlyEditor plies={plies} selectedPly={selectedPly} onSelectPly={onSelectPly} dispatch={dispatch} />
        </PanelSection>
      </MoreOptions>
    </StepPage>
  )
}
