// Calculator mode (Fit Tolerance design, variant b, in the pit wall style of
// the advisor): inputs on the left, the zone diagram and fit spectrum in the
// centre, the results on the right.
import type { Dispatch } from 'react'
import { Badge, Callout, Column, ColumnHeader } from '../../../../app/ui'
import { unitOf, type UnitSystem } from '../../../../core/units'
import type { FitResults } from '../logic/fitResults'
import { serviceClearance } from '../logic/serviceClearance'
import { nominalLabel } from '../shared/labels'
import { ModeSwitch } from '../shared/ModeSwitch'
import sharedStyles from '../shared/shared.module.css'
import { ZoneDiagram } from '../shared/ZoneDiagram'
import type { FitInputs } from '../state/fitInputs'
import type { FitAction } from '../state/fitReducer'
import styles from './calculator.module.css'
import { CalculatorInputs } from './CalculatorInputs'
import { FitSpectrum } from './FitSpectrum'
import { Results } from './Results'

interface CalculatorViewProps {
  inputs: FitInputs
  results: FitResults
  system: UnitSystem
  dispatch: Dispatch<FitAction>
}

export function CalculatorView({ inputs, results, system, dispatch }: CalculatorViewProps) {
  const calculation = results.calculation
  // A valid fit and how it behaves in service; null when ISO 286 does not define the fit.
  const shown = calculation.ok
    ? { fit: calculation.value, service: serviceClearance(calculation.value, inputs, results.housing, results.shaft) }
    : null
  const fitName = `${nominalLabel(inputs.nominalMm, system)} ${shown?.fit.designation ?? ''}`
  return (
    <>
      <Column width="inputs" label="Inputs" header={<ModeSwitch mode={inputs.mode} onChange={(mode) => dispatch({ type: 'change', changes: { mode } })} />}>
        <CalculatorInputs inputs={inputs} results={results} system={system} dispatch={dispatch} />
      </Column>

      <Column
        label="Tolerance zones"
        header={<ColumnHeader title="Tolerance zones" meta={`${fitName} · to scale · ${unitOf('deviation', system)}`} />}
      >
        {shown ? (
          <>
            <div className={styles.diagramArea}>
              <ZoneDiagram fit={shown.fit} system={system} variant="screen" />
            </div>
            <FitSpectrum service={shown.service} window={inputs.requiredClearanceUm} system={system} />
          </>
        ) : (
          <div className={sharedStyles.problem}>
            <Callout status="bad" title="No zones for this fit">
              Choose a fit that ISO 286 defines at this size (see the inputs).
            </Callout>
          </div>
        )}
      </Column>

      <Column
        width="results"
        divider={false}
        wrap
        label="Results"
        header={
          <ColumnHeader
            title="Results"
            actions={
              <Badge variant="reference" size="md">
                ISO 286-1:2010
              </Badge>
            }
          />
        }
      >
        {shown && <Results fit={shown.fit} service={shown.service} inputs={inputs} system={system} />}
      </Column>
    </>
  )
}
