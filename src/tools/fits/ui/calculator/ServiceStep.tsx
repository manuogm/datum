// Calculator, step 2: the conditions the fit works in. The housing and shaft
// materials and the service temperatures move the clearance; the clearance
// the fit needs in service is prefilled and kept under More options. The fit
// spectrum beside it shows the clearance at each temperature against that window.
import { MoreOptions, PanelSection, RangeInputRow, StepPage } from '../../../../app/ui'
import { serviceClearance } from '../logic/serviceClearance'
import { MaterialPair } from '../shared/MaterialPair'
import sharedStyles from '../shared/shared.module.css'
import type { FitStepProps } from '../shared/stepProps'
import { DEFAULT_FIT_INPUTS, type FitInputs } from '../state/fitInputs'
import { FitSpectrum } from './FitSpectrum'

export function ServiceStep({ inputs, results, system, dispatch, flow }: FitStepProps) {
  const change = (changes: Partial<FitInputs>) => dispatch({ type: 'change', changes })
  const calculation = results.calculation
  const window = inputs.requiredClearanceUm
  const windowChanged = window.minUm !== DEFAULT_FIT_INPUTS.requiredClearanceUm.minUm || window.maxUm !== DEFAULT_FIT_INPUTS.requiredClearanceUm.maxUm
  return (
    <StepPage
      {...flow.page}
      className={sharedStyles.step}
      title="Service conditions"
      hint="What the fit is made of and the temperatures it works at. The fit is checked against the clearance it needs in service."
      nextLabel="See results"
      aside={
        calculation.ok && (
          <FitSpectrum
            service={serviceClearance(calculation.value, inputs, results.housing, results.shaft)}
            window={window}
            system={system}
            bare
          />
        )
      }
      asideLabel="Fit spectrum"
      asideMeta="clearance at each temperature · green: required"
    >
      <PanelSection label="Materials">
        <MaterialPair
          housing={results.housing}
          shaft={results.shaft}
          system={system}
          onHousingChange={(housingMaterialId) => change({ housingMaterialId })}
          onShaftChange={(shaftMaterialId) => change({ shaftMaterialId })}
        />
      </PanelSection>

      <PanelSection label="Temperature">
        <RangeInputRow
          label="Service temp."
          quantity="temperature"
          system={system}
          min={inputs.serviceTempC.minC}
          max={inputs.serviceTempC.maxC}
          onChange={(minC, maxC) => change({ serviceTempC: { minC, maxC } })}
        />
      </PanelSection>

      <MoreOptions count={1} changed={windowChanged ? 1 : 0} memoryKey="fit-service">
        <PanelSection label="Required in service">
          <RangeInputRow
            label="Clearance in service"
            quantity="deviation"
            system={system}
            min={window.minUm}
            max={window.maxUm}
            onChange={(minUm, maxUm) => change({ requiredClearanceUm: { minUm, maxUm } })}
          />
        </PanelSection>
      </MoreOptions>
    </StepPage>
  )
}
