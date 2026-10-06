// Bolt pattern mode as guided steps: Joint types (with the mode choice; the
// type chosen in the list is edited beside it), Bolts (beside the plan of their
// positions), Load cases (beside the plan with the load point), then Results.
import { useState, type Dispatch, type ReactNode } from 'react'
import { StepPage, type StepFlow } from '../../../../app/ui'
import { countOf } from '../../../../app/format/count'
import { unitOf, type UnitSystem } from '../../../../core/units'
import type { BoltResults } from '../logic/boltResults'
import { jointTitle } from '../logic/labels'
import type { StepFault } from '../logic/steps'
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
  const problem = fault?.step === flow.step.id && { title: 'The pattern cannot be analysed yet', detail: fault.error }
  const selectLoadCase = (id: string) => dispatch({ type: 'selectLoadCase', id })

  switch (flow.step.id) {
    case 'types': {
      // One joint type is always open: the one chosen in the list, else the first.
      const editedType = pattern.jointTypes.find((j) => j.id === editing) ?? pattern.jointTypes[0]
      return (
        <StepPage
          {...flow.page}
          problem={problem}
          title="Joint types"
          hint="The kinds of joint in the pattern. Choose one to edit its bolt, joint and clamped parts."
          asideLabel={`Joint type ${editedType.id}`}
          asideMeta={jointTitle(editedType.design)}
          asideInputs
          aside={
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
          }
        >
          {modeField}
          <JointTypeList
            pattern={pattern}
            editing={editedType.id}
            onEdit={setEditing}
            onAdd={() => dispatch({ type: 'addJointType', copyOf: editedType.id })}
          />
        </StepPage>
      )
    }
    case 'bolts':
      return (
        <StepPage
          {...flow.page}
          problem={problem}
          title="Bolts"
          hint="Where each bolt sits in the plan, and its joint type."
          asideLabel="Plan"
          asideMeta={`${pattern.bolts.length} bolts · ${unitOf('length', system)}`}
          aside={<PatternPlan pattern={pattern} loadCase={loadCase} showLoad={false} system={system} />}
        >
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
          problem={problem}
          title="Load cases"
          hint="The forces and moments on the plate, one load case at a time. The load point is under More options."
          nextLabel="See results"
          asideLabel={`Plan · ${loadCase.id}`}
          asideMeta="shear shared by bolt position"
          aside={<PatternPlan pattern={pattern} loadCase={loadCase} system={system} />}
        >
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
        <StepPage {...flow.page} title="Results" hint={`${countOf(pattern.bolts.length, 'bolt')} under ${countOf(pattern.loadCases.length, 'load case')}, each bolt checked to VDI 2230-1.`} wide>
          <PatternResults pattern={pattern} results={results} fault={fault} system={system} onSelectLoadCase={selectLoadCase} onFix={flow.goTo} memoryKey={flow.memoryKey} />
        </StepPage>
      )
  }
}
