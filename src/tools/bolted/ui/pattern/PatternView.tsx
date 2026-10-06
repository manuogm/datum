// Bolt pattern mode (Bolt Pattern design): joint types, the load case and
// the bolts on the left; the plan of the pattern under the chosen load case
// in the centre; the governing bolt, per-bolt utilisation and the chosen
// bolt's calculation trail on the right.
import { useState, type Dispatch } from 'react'
import { Badge, Callout, Column, ColumnHeader, LegendItem, Marker, ModeSwitch } from '../../../../app/ui'
import type { UnitSystem } from '../../../../core/units'
import type { BoltResults } from '../logic/boltResults'
import { BOLT_MODES } from '../logic/labels'
import { REVIEW_UTILISATION } from '../logic/verdict'
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

interface PatternViewProps {
  inputs: BoltInputs
  results: BoltResults
  system: UnitSystem
  dispatch: Dispatch<BoltAction>
}

export function PatternView({ inputs, results, system, dispatch }: PatternViewProps) {
  const { pattern } = inputs
  const [editing, setEditing] = useState<string | null>(null)
  const [chosenBolt, setChosenBolt] = useState<string | null>(null)
  const shown = results.loadCases.find((c) => c.loadCase.id === pattern.loadCaseId) ?? results.loadCases[0]
  const { loadCase, analysis } = shown
  const editedType = pattern.jointTypes.find((j) => j.id === editing) ?? null
  // The bolt chosen in the plan or table, else the governing bolt of the load case.
  const selectedBolt = chosenBolt && pattern.bolts.some((b) => b.id === chosenBolt) ? chosenBolt : analysis.ok ? analysis.value.governing.bolt.id : null

  return (
    <>
      <Column width="inputs" label="Inputs" header={<ModeSwitch modes={BOLT_MODES} mode={inputs.mode} onChange={(mode) => dispatch({ type: 'change', changes: { mode } })} />}>
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
        <BoltList
          pattern={pattern}
          system={system}
          onChange={(id, changes) => dispatch({ type: 'bolt', id, changes })}
          onAdd={() => dispatch({ type: 'addBolt' })}
          onRemove={(id) => dispatch({ type: 'removeBolt', id })}
        />
      </Column>

      <Column
        label="Plan view"
        header={
          <ColumnHeader title="Plan view">
            <LoadCaseTabs loadCases={results.loadCases} selected={loadCase.id} onSelect={(id) => dispatch({ type: 'selectLoadCase', id })} />
          </ColumnHeader>
        }
      >
        <div className={styles.plan}>
          <PatternPlan pattern={pattern} loadCase={loadCase} analysis={analysis} system={system} selectedBolt={selectedBolt} onSelectBolt={setChosenBolt} />
        </div>
        <div className={styles.legend}>
          <LegendItem swatch={<Marker shape="dot" color="ok" />}>passes</LegendItem>
          <LegendItem swatch={<Marker shape="dot" color="warn" />}>u ≥ {REVIEW_UTILISATION} or marginal</LegendItem>
          <LegendItem swatch={<Marker shape="dot" color="bad" />}>fails</LegendItem>
          <LegendItem swatch={<Marker shape="dot" color="hole" />}>shear on the bolt</LegendItem>
        </div>
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
                VDI 2230-1 · rigid plate
              </Badge>
            }
          />
        }
      >
        {analysis.ok && selectedBolt ? (
          <PatternResults analysis={analysis.value} loadCase={loadCase} system={system} selectedBolt={selectedBolt} onSelectBolt={setChosenBolt} />
        ) : (
          <div className={styles.problem}>
            <Callout status="bad" title={`${loadCase.id} cannot be analysed`}>
              {analysis.ok ? null : analysis.error}
            </Callout>
          </div>
        )}
      </Column>
    </>
  )
}
