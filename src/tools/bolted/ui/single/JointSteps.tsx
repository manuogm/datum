// Single joint mode as guided steps: Bolt (with the mode choice), Joint (what
// the bolt screws into and the clamped parts, beside section A–A), Loads,
// then Results. Advanced inputs wait under More options on their step.
import type { Dispatch, ReactNode } from 'react'
import { MoreOptions, ResultsLayout, StepPage, type StepFlow } from '../../../../app/ui'
import { formatDecimal, type UnitSystem } from '../../../../core/units'
import type { BoltResults } from '../logic/boltResults'
import { contactOptions, tighteningOptions } from '../logic/designOptions'
import { jointTitle } from '../logic/labels'
import { stepLabel, type StepFault } from '../logic/steps'
import { BoltFields } from '../shared/BoltFields'
import { ContactFields } from '../shared/ContactFields'
import { JointKindFields } from '../shared/JointKindFields'
import { PlatesFields } from '../shared/PlatesFields'
import { ProblemNote } from '../shared/ProblemNote'
import styles from '../shared/steps.module.css'
import { TighteningFields } from '../shared/TighteningFields'
import type { BoltInputs, JointDesignSpec } from '../state/boltInputs'
import type { BoltAction } from '../state/boltReducer'
import { JointResults } from './JointResults'
import { JointSection } from './JointSection'
import { LoadsFields } from './LoadsFields'
import { PressureInputs } from './PressureInputs'

interface JointStepsProps {
  flow: StepFlow
  inputs: BoltInputs
  results: BoltResults
  /** The input problem, if the joint cannot be analysed. */
  fault: StepFault | null
  system: UnitSystem
  dispatch: Dispatch<BoltAction>
  /** The single joint / bolt pattern choice, on the first step. */
  modeField: ReactNode
}

export function JointSteps({ flow, inputs, results, fault, system, dispatch, modeField }: JointStepsProps) {
  const { design, loads } = inputs.joint
  const analysis = results.joint.ok ? results.joint.value : null
  const changeDesign = (changes: Partial<JointDesignSpec>) => dispatch({ type: 'design', target: { scope: 'joint' }, changes })
  // The engine's explanation, on the step where it can be fixed.
  const problem = fault?.step === flow.step.id && <ProblemNote title="This joint cannot be analysed yet" error={fault.error} />

  switch (flow.step.id) {
    case 'bolt': {
      const tightening = tighteningOptions(design)
      return (
        <StepPage {...flow.page} title="Bolt" hint="The bolt: ISO thread, property class and head. Tightening and friction are under More options.">
          {problem}
          {modeField}
          <BoltFields design={design} onChange={changeDesign} />
          <MoreOptions count={tightening.count} changed={tightening.changed}>
            <TighteningFields design={design} onChange={changeDesign} />
          </MoreOptions>
        </StepPage>
      )
    }
    case 'joint': {
      const contact = contactOptions(design)
      return (
        <StepPage
          {...flow.page}
          title="Joint"
          hint="What the bolt screws into, and the parts it clamps from the head down."
          asideLabel="Section A–A"
          asideMeta={`${jointTitle(design)} · to scale`}
          aside={
            analysis ? (
              <JointSection analysis={analysis} design={design} system={system} />
            ) : (
              <p className={styles.note}>The section is drawn once the joint can be analysed.</p>
            )
          }
        >
          {problem}
          <JointKindFields design={design} system={system} onChange={changeDesign} />
          <PlatesFields design={design} system={system} clampLengthMm={analysis?.geometry.clampLengthMm ?? null} onChange={changeDesign} />
          <MoreOptions count={contact.count} changed={contact.changed}>
            <ContactFields design={design} system={system} onChange={changeDesign} />
          </MoreOptions>
        </StepPage>
      )
    }
    case 'loads':
      return (
        <StepPage {...flow.page} title="Loads" hint="The working loads on the bolt, and the temperature range it sees in service." nextLabel="See results">
          {problem}
          <LoadsFields
            loads={loads}
            serviceTempC={inputs.serviceTempC}
            system={system}
            onLoadsChange={(changes) => dispatch({ type: 'loads', changes })}
            onTemperatureChange={(serviceTempC) => dispatch({ type: 'change', changes: { serviceTempC } })}
          />
        </StepPage>
      )
    default:
      return (
        <StepPage
          {...flow.page}
          title="Results"
          hint={analysis ? `${jointTitle(design)} · Φn ${formatDecimal(analysis.loadFactor, 3, true)}, checked to VDI 2230-1.` : undefined}
          wide
        >
          {analysis ? (
            <JointResults
              analysis={analysis}
              axialN={loads.axialMaxN}
              system={system}
              stepInputs={{ 'surface-pressure': <PressureInputs design={design} system={system} onChange={changeDesign} /> }}
            />
          ) : (
            <ResultsLayout
              verdict={
                <ProblemNote
                  title="This joint cannot be analysed"
                  error={fault?.error ?? (results.joint.ok ? '' : results.joint.error)}
                  fix={fault ? { label: stepLabel('joint', fault.step), onClick: () => flow.goTo(fault.step) } : undefined}
                />
              }
            />
          )}
        </StepPage>
      )
  }
}
