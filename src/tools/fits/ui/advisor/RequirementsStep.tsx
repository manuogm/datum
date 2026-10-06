// Advisor, step 3: the requirements every candidate fit is checked against,
// the service temperatures and the clearance needed across them (required:
// the advisor ranks the fits against it, so Next waits for one). The largest
// interference accepted at assembly is under More options.
import { MoreOptions, PanelSection, RangeInputRow, StepPage, ValueInputRow } from '../../../../app/ui'
import { startingWindow } from '../logic/serviceClearance'
import { ClearanceWindowRow } from '../shared/ClearanceWindowRow'
import sharedStyles from '../shared/shared.module.css'
import { faultProps, type FitStepProps } from '../shared/stepProps'
import { NEW_FIT_INPUTS, type FitInputs } from '../state/fitInputs'

export function RequirementsStep({ inputs, results, system, dispatch, flow, fault }: FitStepProps) {
  const change = (changes: Partial<FitInputs>) => dispatch({ type: 'change', changes })
  const interferenceChanged = inputs.maxAssemblyInterferenceUm !== NEW_FIT_INPUTS.maxAssemblyInterferenceUm
  return (
    <StepPage
      {...flow.page}
      {...faultProps(fault, 'requirements', 'These requirements cannot be checked')}
      title="Requirements"
      hint="The temperatures the fit works at, and the clearance it needs at every one of them (negative is interference). The largest interference at assembly is under More options."
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
          <ClearanceWindowRow
            window={inputs.requiredClearanceUm}
            system={system}
            start={startingWindow(results.calculation)}
            optional={false}
            onChange={(requiredClearanceUm) => change({ requiredClearanceUm })}
          />
        </div>
      </PanelSection>

      <MoreOptions count={1} changed={interferenceChanged ? 1 : 0} memoryKey="fit:requirements">
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
