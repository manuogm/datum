// Composite Laminate tool (classical laminate theory): the layup, loads and
// failure criterion on the left, the exploded ply stack and the ply values
// through the thickness in the centre, first-ply failure and the laminate
// stiffness on the right.
//
// "Save revision" saves a snapshot of the laminate to a project through the
// Save-to-Project dialog. "PDF report" opens the printable report of the
// same inputs.
import { useMemo, useState } from 'react'
import { AppLayout } from '../../../app/AppLayout'
import { SaveRevisionDialog } from '../../../app/projects/SaveRevisionDialog'
import { useProjects } from '../../../app/projects/useProjects'
import { useSettings } from '../../../app/settings/settings'
import { Badge, Button, Callout, Column, ColumnHeader, ColumnRow, SegmentedControl } from '../../../app/ui'
import { CriterionFields } from './editor/CriterionFields'
import { LayupEditor } from './editor/LayupEditor'
import { LoadsFields } from './editor/LoadsFields'
import { lamSnapshot } from './lamSnapshot'
import { CRITERION_LABELS } from './logic/labels'
import { PLOT_COMPONENTS, type PlotComponent } from './logic/thicknessPlot'
import { OptimiserPanel } from './optimiser/OptimiserPanel'
import { LaminateDrawings } from './plots/LaminateDrawings'
import { LaminateResults } from './results/LaminateResults'
import styles from './LaminatePage.module.css'
import { LAM_INPUTS_CODEC } from './state/lamCodec'
import { lamHref } from './state/urlState'
import { useLaminateTool } from './state/useLaminateTool'

export function LaminatePage() {
  const { inputs, dispatch, analysis } = useLaminateTool()
  const { unitSystem: system } = useSettings()
  const { activeProject } = useProjects()
  const [saving, setSaving] = useState(false)
  const [chosenPly, setChosenPly] = useState<number | null>(null)
  const [component, setComponent] = useState<PlotComponent>('sx')
  const snapshot = useMemo(() => lamSnapshot(inputs), [inputs])
  const result = analysis.ok ? analysis.value : null
  const selectedPly = chosenPly !== null && chosenPly <= inputs.plies.length ? chosenPly : null
  const criticalPlies = result?.firstPlyFailure.criticalPlies ?? []
  const toolActions = {
    onSaveRevision: () => setSaving(true),
    onDownloadReport: () => window.location.assign(lamHref(inputs, 'report', true)),
    saveBlockedReason: snapshot.ok ? undefined : `Nothing to save: ${snapshot.error}`,
  }
  return (
    <AppLayout section="lam" toolActions={toolActions}>
      <ColumnRow>
        <Column
          width="inputs"
          label="Inputs"
          header={
            <ColumnHeader
              title="Inputs"
              actions={
                <Button variant="link" size="sm" onClick={() => dispatch({ type: 'change', changes: LAM_INPUTS_CODEC.fresh(activeProject?.targets) })}>
                  Reset
                </Button>
              }
            />
          }
        >
          <LayupEditor
            plies={inputs.plies}
            layup={result?.layup ?? null}
            criticalPlies={criticalPlies}
            selectedPly={selectedPly}
            onSelectPly={setChosenPly}
            system={system}
            dispatch={dispatch}
          />
          <LoadsFields loads={inputs.loads} system={system} onChange={(changes) => dispatch({ type: 'loads', changes })} />
          <CriterionFields criterion={inputs.criterion} targetReserveFactor={inputs.targetReserveFactor} onChange={(changes) => dispatch({ type: 'change', changes })} />
          <OptimiserPanel inputs={inputs} system={system} onUse={(anglesDeg) => dispatch({ type: 'layup', anglesDeg })} />
        </Column>

        <Column
          label="Ply stack"
          header={
            <ColumnHeader
              title="Ply stack"
              meta={result?.layup.notation}
              actions={<SegmentedControl label="Value through the thickness" size="sm" options={PLOT_COMPONENTS} value={component} onChange={setComponent} />}
            />
          }
        >
          {result ? (
            <LaminateDrawings analysis={result} component={component} system={system} selectedPly={selectedPly} onSelectPly={setChosenPly} />
          ) : (
            <div className={styles.problem}>
              <Callout status="bad" title="This laminate cannot be analysed">
                {analysis.ok ? null : analysis.error}
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
                  CLT · {CRITERION_LABELS[inputs.criterion]}
                </Badge>
              }
            />
          }
        >
          {result && <LaminateResults analysis={result} system={system} selectedPly={selectedPly} onSelectPly={setChosenPly} />}
        </Column>
      </ColumnRow>
      {saving && snapshot.ok && <SaveRevisionDialog snapshot={snapshot.value} onClose={() => setSaving(false)} />}
    </AppLayout>
  )
}
