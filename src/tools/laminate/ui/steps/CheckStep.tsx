// Step 3 · Check: the reserve factor the laminate must reach at first-ply
// failure. The failure criterion (Tsai-Wu unless changed) is under More
// options; the closed row notes when another one is chosen.
import { MoreOptions, PanelSection, StepPage } from '../../../../app/ui'
import { CriterionField, TargetField } from '../editor/CriterionFields'
import { criterionChanged, stepProblem } from '../logic/steps'
import type { LamStepProps } from './stepProps'

export function CheckStep({ inputs, dispatch, flow, fault }: LamStepProps) {
  return (
    <StepPage
      {...flow.page}
      problem={stepProblem(fault, 'check')}
      title="Check"
      hint="The reserve factor every ply must reach at first-ply failure. The failure criterion is under More options."
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
