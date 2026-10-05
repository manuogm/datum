// Advisor mode, left column: what the fit is for, the geometry and materials,
// how it is assembled, and the requirements it must meet.
import type { Dispatch } from 'react'
import { Chip, PanelSection, QuantityField, SegmentedControl, Select } from '../../../../app/ui'
import type { UnitSystem } from '../../../../core/units'
import {
  APPLICATION_FUNCTIONS, APPLICATIONS, ASSEMBLY_LABELS, ASSEMBLY_METHODS, CUSTOM_APPLICATION, FUNCTION_LABELS, applicationOf,
} from '../logic/applications'
import type { FitResults } from '../logic/fitResults'
import { MaterialPair } from '../shared/MaterialPair'
import { RangeRow, SingleRow } from '../shared/RequirementRows'
import type { FitInputs } from '../state/fitInputs'
import type { FitAction } from '../state/fitReducer'
import styles from './advisor.module.css'

const ASSEMBLY_OPTIONS = ASSEMBLY_METHODS.map((method) => ({ value: method, label: ASSEMBLY_LABELS[method] }))

interface AdvisorInputsProps {
  inputs: FitInputs
  results: FitResults
  system: UnitSystem
  dispatch: Dispatch<FitAction>
}

export function AdvisorInputs({ inputs, results, system, dispatch }: AdvisorInputsProps) {
  const change = (changes: Partial<FitInputs>) => dispatch({ type: 'change', changes })
  const application = applicationOf(inputs.functions)
  const applications = application === CUSTOM_APPLICATION ? [...APPLICATIONS, CUSTOM_APPLICATION] : APPLICATIONS
  return (
    <>
      <PanelSection label="Application">
        <Select
          size="md"
          aria-label="Application"
          options={applications.map(({ id, label }) => ({ value: id, label }))}
          value={application.id}
          onChange={(id) => change({ functions: applications.find((a) => a.id === id)?.functions ?? inputs.functions })}
        />
        <div className={styles.chips}>
          {APPLICATION_FUNCTIONS.map((fn) => (
            <Chip key={fn} selected={inputs.functions.includes(fn)} onClick={() => dispatch({ type: 'toggleFunction', fn })}>
              {FUNCTION_LABELS[fn]}
            </Chip>
          ))}
        </div>
      </PanelSection>

      <PanelSection label="Geometry & materials">
        <QuantityField
          size="md"
          prefix="Ø"
          aria-label="Nominal diameter"
          quantity="length"
          system={system}
          value={inputs.nominalMm}
          onChange={(nominalMm) => change({ nominalMm })}
        />
        <MaterialPair
          housing={results.housing}
          shaft={results.shaft}
          system={system}
          onHousingChange={(housingMaterialId) => change({ housingMaterialId })}
          onShaftChange={(shaftMaterialId) => change({ shaftMaterialId })}
        />
      </PanelSection>

      <PanelSection label="Assembly">
        <SegmentedControl
          label="Assembly"
          options={ASSEMBLY_OPTIONS}
          value={inputs.assembly}
          onChange={(assembly) => change({ assembly })}
          fill
        />
      </PanelSection>

      <PanelSection label="Requirements">
        <RangeRow
          label="Service temp."
          quantity="temperature"
          system={system}
          min={inputs.serviceTempC.minC}
          max={inputs.serviceTempC.maxC}
          onChange={(minC, maxC) => change({ serviceTempC: { minC, maxC } })}
        />
        <RangeRow
          label="Clearance in service"
          quantity="deviation"
          system={system}
          min={inputs.requiredClearanceUm.minUm}
          max={inputs.requiredClearanceUm.maxUm}
          onChange={(minUm, maxUm) => change({ requiredClearanceUm: { minUm, maxUm } })}
        />
        <SingleRow
          label="Max assembly interference"
          quantity="deviation"
          system={system}
          value={inputs.maxAssemblyInterferenceUm}
          onChange={(maxAssemblyInterferenceUm) => change({ maxAssemblyInterferenceUm })}
        />
      </PanelSection>
    </>
  )
}
