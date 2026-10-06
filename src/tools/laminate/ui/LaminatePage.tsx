// Composite Laminate tool (classical laminate theory): the layup, loads and
// failure criterion on the left, the exploded ply stack and the ply values
// through the thickness in the centre, first-ply failure and the laminate
// stiffness on the right.
//
// The page shows one calculation of the library and saves its inputs as they
// change. "Report" opens the printable report of the calculation.
import { useState } from 'react'
import { AppLayout } from '../../../app/AppLayout'
import { useSettings } from '../../../app/settings/settings'
import { ReportButton } from '../../../app/tools/ReportButton'
import { Badge, Button, Callout, Column, ColumnHeader, ColumnRow, SegmentedControl } from '../../../app/ui'
import type { Calculation } from '../../../core/library'
import { CriterionFields } from './editor/CriterionFields'
import { LayupEditor } from './editor/LayupEditor'
import { LoadsFields } from './editor/LoadsFields'
import { CRITERION_LABELS } from './logic/labels'
import { plyTones } from './logic/verdict'
import { PLOT_COMPONENTS, type PlotComponent } from './logic/thicknessPlot'
import { OptimiserPanel } from './optimiser/OptimiserPanel'
import { LaminateDrawings } from './plots/LaminateDrawings'
import { LaminateResults } from './results/LaminateResults'
import styles from './LaminatePage.module.css'
import { DEFAULT_LAMINATE_INPUTS } from './state/lamInputs'
import { useLaminateTool } from './state/useLaminateTool'

export function LaminatePage({ calculation }: { calculation: Calculation }) {
  const { inputs, dispatch, analysis } = useLaminateTool(calculation)
  const { unitSystem: system } = useSettings()
  const [chosenPly, setChosenPly] = useState<number | null>(null)
  const [component, setComponent] = useState<PlotComponent>('sx')
  const result = analysis.ok ? analysis.value : null
  const selectedPly = chosenPly !== null && chosenPly <= inputs.plies.length ? chosenPly : null
  const criticalPlies = result?.firstPlyFailure.criticalPlies ?? []
  return (
    <AppLayout current={{ tab: 'calc', id: calculation.id }} actions={<ReportButton calculationId={calculation.id} />}>
      <ColumnRow>
        <Column
          width="inputs"
          label="Inputs"
          header={
            <ColumnHeader
              title="Inputs"
              actions={
                <Button variant="link" size="sm" onClick={() => dispatch({ type: 'change', changes: DEFAULT_LAMINATE_INPUTS })}>
                  Reset
                </Button>
              }
            />
          }
        >
          <LayupEditor
            plies={inputs.plies}
            layup={result?.layup ?? null}
            tones={result ? plyTones(result) : []}
            criticalPlies={criticalPlies}
            selectedPly={selectedPly}
            onSelectPly={setChosenPly}
            system={system}
            dispatch={dispatch}
          />
          <LoadsFields loads={inputs.loads} system={system} onChange={(changes) => dispatch({ type: 'loads', changes })} />
          <CriterionFields criterion={inputs.criterion} targetReserveFactor={inputs.targetReserveFactor} onChange={(changes) => dispatch({ type: 'change', changes })} />
          <OptimiserPanel inputs={inputs} system={system} onUse={(anglesDeg, materialId) => dispatch({ type: 'layup', anglesDeg, materialId })} />
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
    </AppLayout>
  )
}
