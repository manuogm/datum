// Bolt pattern mode as guided steps: Joint types (with the mode choice; a
// type opens for editing when chosen), Bolts (beside the plan of their
// positions), Load cases (beside the plan with the load point), then Results.
import { useState, type Dispatch, type ReactNode } from 'react'
import { StepPage, type StepFlow } from '../../../../app/ui'
import { unitOf, type UnitSystem } from '../../../../core/units'
import type { BoltResults } from '../logic/boltResults'
import type { StepFault } from '../logic/steps'
import { ProblemNote } from '../shared/ProblemNote'
import type { BoltInputs } from '../state/boltInputs'
import type { BoltAction } from '../state/boltReducer'
import { BoltList } from './BoltList'
import { JointTypeEditor } from './JointTypeEditor'
import { JointTypeList } from './JointTypeList'
import { LoadCaseFields } from './LoadCaseFields'
import { LoadCaseTabs } from './LoadCaseTabs'
import styles from './pattern.module.css'
import { PatternPlan } from './PatternPlan'
import { PatternResults } from './PatternResults'

interface PatternStepsProps {
  flow: StepFlow
  inputs: BoltInputs
  results: BoltResults
  /** The first input problem, if a load case cannot be analysed. */
  fault: StepFault | null
  system: UnitSystem
  dispatch: Dispatch<BoltAction>
  /** The single joint / bolt pattern choice, on the first step. */
  modeField: ReactNode
}

export function PatternSteps({ flow, inputs, results, fault, system, dispatch, modeField }: PatternStepsProps) {
  const { pattern } = inputs
  const [editing, setEditing] = useState<string | null>(null)
  const loadCase = pattern.loadCases.find((c) => c.id === pattern.loadCaseId) ?? pattern.loadCases[0]
  const problem = fault?.step === flow.step.id && <ProblemNote title="The pattern cannot be analysed yet" error={fault.error} />
  const selectLoadCase = (id: string) => dispatch({ type: 'selectLoadCase', id })

  switch (flow.step.id) {
    case 'types': {
      const editedType = pattern.jointTypes.find((j) => j.id === editing) ?? null
      return (
        <StepPage {...flow.page} title="Joint types" hint="The kinds of joint in the pattern. Choose one to see and edit its bolt, joint and clamped parts.">
          {problem}
          {modeField}
          <JointTypeList
            pattern={pattern}
            editing={editing}
            onEdit={setEditing}
            onAdd={() => dispatch({ type: 'addJointType', copyOf: editing ?? pattern.jointTypes[pattern.jointTypes.length - 1].id })}
          />
          {editedType && (
            <JointTypeEditor
              jointType={editedType}
              inUse={pattern.bolts.some((b) => b.jointTypeId === editedType.id)}
              system={system}
              onChange={(changes) => dispatch({ type: 'design', target: { scope: 'jointType', id: editedType.id }, changes })}
              onCopy={() => dispatch({ type: 'addJointType', copyOf: editedType.id })}
              onRemove={() => {
                dispatch({ type: 'removeJointType', id: editedType.id })
                setEditing(null)
              }}
            />
          )}
        </StepPage>
      )
    }
    case 'bolts':
      return (
        <StepPage
          {...flow.page}
          title="Bolts"
          hint="Where each bolt sits in the plan, and its joint type."
          asideLabel="Plan"
          asideMeta={`${pattern.bolts.length} bolts · ${unitOf('length', system)}`}
          aside={<PatternPlan pattern={pattern} loadCase={loadCase} showLoad={false} system={system} />}
        >
          {problem}
          <BoltList
            pattern={pattern}
            system={system}
            onChange={(id, changes) => dispatch({ type: 'bolt', id, changes })}
            onAdd={() => dispatch({ type: 'addBolt' })}
            onRemove={(id) => dispatch({ type: 'removeBolt', id })}
          />
        </StepPage>
      )
    case 'load-cases':
      return (
        <StepPage
          {...flow.page}
          title="Load cases"
          hint="The forces and moments on the plate, one load case at a time."
          nextLabel="See results"
          asideLabel={`Plan · ${loadCase.id}`}
          asideMeta="shear shared by bolt position"
          aside={<PatternPlan pattern={pattern} loadCase={loadCase} system={system} />}
        >
          {problem}
          <div className={styles.caseTabs}>
            <LoadCaseTabs loadCases={results.loadCases} selected={loadCase.id} onSelect={selectLoadCase} withUtilisation={false} />
          </div>
          <LoadCaseFields
            loadCase={loadCase}
            canRemove={pattern.loadCases.length > 1}
            serviceTempC={inputs.serviceTempC}
            system={system}
            onChange={(changes) => dispatch({ type: 'loadCase', id: loadCase.id, changes })}
            onAdd={() => dispatch({ type: 'addLoadCase' })}
            onRemove={() => dispatch({ type: 'removeLoadCase', id: loadCase.id })}
            onTemperatureChange={(serviceTempC) => dispatch({ type: 'change', changes: { serviceTempC } })}
          />
        </StepPage>
      )
    default:
      return (
        <StepPage {...flow.page} title="Results" hint={`${pattern.bolts.length} bolts, ${pattern.loadCases.length} load cases, each bolt checked to VDI 2230-1.`} wide>
          <PatternResults pattern={pattern} results={results} fault={fault} system={system} onSelectLoadCase={selectLoadCase} onFix={flow.goTo} />
        </StepPage>
      )
  }
}
