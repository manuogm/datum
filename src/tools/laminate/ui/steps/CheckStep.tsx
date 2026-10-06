// Step 3 · Check: the reserve factor the laminate must reach at first-ply
// failure. The failure criterion (Tsai-Wu unless changed) is under More
// options; the closed row notes when another one is chosen.
import { MoreOptions, PanelSection, StepPage } from '../../../../app/ui'
import { CriterionField, TargetField } from '../editor/CriterionFields'
import { criterionChanged } from '../logic/steps'
import type { LamStepProps } from './stepProps'
import styles from './steps.module.css'

export function CheckStep({ inputs, dispatch, flow }: LamStepProps) {
  return (
    <StepPage
      {...flow.page}
      className={styles.step}
      title="Check"
      hint="Every ply is checked for first-ply failure. The laminate passes when its lowest reserve factor reaches the target."
      nextLabel="See results"
    >
      <PanelSection label="Target">
        <TargetField value={inputs.targetReserveFactor} onChange={(targetReserveFactor) => dispatch({ type: 'change', changes: { targetReserveFactor } })} />
      </PanelSection>
      <MoreOptions count={1} changed={criterionChanged(inputs)} memoryKey="lam:criterion">
        <PanelSection label="Failure criterion">
          <CriterionField value={inputs.criterion} onChange={(criterion) => dispatch({ type: 'change', changes: { criterion } })} />
        </PanelSection>
      </MoreOptions>
    </StepPage>
  )
}
