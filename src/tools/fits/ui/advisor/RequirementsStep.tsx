// Advisor, step 3: the requirements every candidate fit is checked against,
// the service temperatures and the clearance needed across them. The largest
// interference accepted at assembly is under More options.
import { MoreOptions, PanelSection, RangeInputRow, StepPage, ValueInputRow } from '../../../../app/ui'
import { FaultCallout } from '../shared/FaultCallout'
import sharedStyles from '../shared/shared.module.css'
import { nextBlock, type FitStepProps } from '../shared/stepProps'
import { DEFAULT_FIT_INPUTS, type FitInputs } from '../state/fitInputs'

export function RequirementsStep({ inputs, system, dispatch, flow, fault }: FitStepProps) {
  const change = (changes: Partial<FitInputs>) => dispatch({ type: 'change', changes })
  const interferenceChanged = inputs.maxAssemblyInterferenceUm !== DEFAULT_FIT_INPUTS.maxAssemblyInterferenceUm
  return (
    <StepPage
      {...flow.page}
      {...nextBlock(fault, 'requirements')}
      className={sharedStyles.step}
      title="Requirements"
      hint="The temperatures the fit works at, and the clearance it needs at every one of them (negative is interference)."
      nextLabel="See results"
    >
      <PanelSection label="In service">
        <div className={sharedStyles.rows}>
          <RangeInputRow
            label="Service temp."
            quantity="temperature"
            system={system}
            min={inputs.serviceTempC.minC}
            max={inputs.serviceTempC.maxC}
            onChange={(minC, maxC) => change({ serviceTempC: { minC, maxC } })}
          />
          <RangeInputRow
            label="Clearance in service"
            quantity="deviation"
            system={system}
            min={inputs.requiredClearanceUm.minUm}
            max={inputs.requiredClearanceUm.maxUm}
            onChange={(minUm, maxUm) => change({ requiredClearanceUm: { minUm, maxUm } })}
          />
        </div>
      </PanelSection>

      <FaultCallout fault={fault} step="requirements" title="These requirements cannot be checked" />

      <MoreOptions count={1} changed={interferenceChanged ? 1 : 0} memoryKey="fit-requirements">
        <PanelSection label="Assembly">
          <ValueInputRow
            label="Max assembly interference"
            quantity="deviation"
            system={system}
            value={inputs.maxAssemblyInterferenceUm}
            onChange={(maxAssemblyInterferenceUm) => change({ maxAssemblyInterferenceUm })}
          />
        </PanelSection>
      </MoreOptions>
    </StepPage>
  )
}
