// Calculator, step 2: the conditions the fit works in. The housing and shaft
// materials and the service temperatures move the clearance. The clearance
// the fit needs in service is optional: without it the results show the fit
// in service without judging it. The fit spectrum beside it shows the
// clearance at each temperature (against that window, when one is set).
// A range the wrong way round marks the step and blocks Next.
import { PanelSection, RangeInputRow, StepPage } from '../../../../app/ui'
import { serviceClearance, startingWindow } from '../logic/serviceClearance'
import { ClearanceWindowRow } from '../shared/ClearanceWindowRow'
import { MaterialPair } from '../shared/MaterialPair'
import sharedStyles from '../shared/shared.module.css'
import { faultProps, type FitStepProps } from '../shared/stepProps'
import type { FitInputs } from '../state/fitInputs'
import { FitSpectrum } from './FitSpectrum'

export function ServiceStep({ inputs, results, system, dispatch, flow, fault }: FitStepProps) {
  const change = (changes: Partial<FitInputs>) => dispatch({ type: 'change', changes })
  const calculation = results.calculation
  const window = inputs.requiredClearanceUm
  return (
    <StepPage
      {...flow.page}
      {...faultProps(fault, 'service', 'The fit cannot be checked in service')}
      title="Service"
      hint="What the housing and the shaft are made of, the temperatures the fit works at and, if it must meet one, the clearance it needs in service."
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
      asideMeta={window === null ? 'clearance at each temperature' : 'clearance at each temperature · green: required'}
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
            window={window}
            system={system}
            start={startingWindow(calculation)}
            optional
            onChange={(requiredClearanceUm) => change({ requiredClearanceUm })}
          />
          <span className={sharedStyles.footnote}>
            Required clearance is optional; negative is interference. Without it the fit is shown in service, not judged.
          </span>
        </div>
      </PanelSection>
    </StepPage>
  )
}
